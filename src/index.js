import Croppr from 'dnm-croppr'
import smartcrop from 'smartcrop'

import tracking from './tracking/tracking';
import './tracking/data/face-min.js';
import './tracking/data/eye-min.js';


class SmartCroppr extends Croppr {

  constructor(element, options) {

      super(element, options, true)
      
      let originalInit = null
      if(this.options.onInitialize) {
        originalInit = this.options.onInitialize
      }
      const init = (instance) => {
        if(originalInit) originalInit(instance)
        if(options.smartcrop) {
          this.parseSmartOptions(options)
          this.setBestCrop(this.smartOptions, true)
        }
      }
      this.options.onInitialize = init

      element = this.getElement(element)
      if (element.width === 0 || element.height === 0) {
        element.onload = () => { this.initialize(element); }
      } else {
        this.initialize(element);
      }
            
  }

  parseSmartOptions(options) {

    let defaultSmartOptions = {
      face: false,
      facePreResize: 768,
      minScale: null,
      minWidth: null,
      minHeight: null,
      aspectRatio: null,
      maxAspectRatio: null,
      onSmartCropDone: null
    }

    this.smartOptions = {}

    for(var key in defaultSmartOptions) {
      let defaultValue = defaultSmartOptions[key]
      if(options.smartOptions && options.smartOptions[key]) {
        defaultValue = options.smartOptions[key]
      } 
      this.smartOptions[key] = defaultValue 
    }

    if(!this.smartOptions.face) this.smartOptions.facePreResize = null

    let tempMinRatio = options.aspectRatio ? options.aspectRatio : this.smartOptions.aspectRatio ? this.smartOptions.aspectRatio : null
    let tempMaxRatio = options.maxAspectRatio ? options.maxAspectRatio : this.smartOptions.maxAspectRatio ? this.smartOptions.maxAspectRatio : null

    let minRatio = tempMinRatio
    let maxRatio = tempMaxRatio

    if(tempMaxRatio && tempMaxRatio < tempMinRatio) {
      minRatio = tempMaxRatio
      maxRatio = tempMinRatio
    } 

    this.smartOptions.minRatio = minRatio
    this.smartOptions.maxRatio = maxRatio

    return this.smartOptions

  }

  
  getSizeFromRatios() {

    let { width, height } = this.sourceSize
    let { minRatio, maxRatio, minWidth, minHeight, minScale } = this.smartOptions
    //console.log("Source Size : ", this.sourceSize)
    let imageRatio = width/height

    if(!minRatio && minWidth && minHeight) {
        minRatio = minWidth / minHeight
    }
    
    //Find best ratio
    let cropRatio = imageRatio
    if(maxRatio) {
      if(imageRatio > maxRatio) cropRatio = maxRatio
      else if(imageRatio < minRatio) cropRatio = minRatio
    } else {
      cropRatio = minRatio
    }

    //Define crop size
    let cropWidth = width
    let cropHeight = cropWidth/cropRatio
    if(cropHeight > height) {
      cropWidth = height * cropRatio
      cropHeight = height
    }  

    if(!minScale && (minWidth || minHeight) ) {
      if(!minWidth) minWidth = minHeight * cropRatio
      if(!minHeight) minHeight = minWidth / cropRatio
      minScale = Math.min(minWidth / width, minHeight / height)
      minScale = minScale > 1 ? 1 : minScale
    }

    minScale = minScale !== null ? minScale > 0.5 ? minScale : 0.5 : 1.0

    return {
      width: cropWidth*minScale,
      height: cropHeight*minScale,
      minScale: minScale
    }

  }

  setBestCrop(smartOptions, crop = true) {

    const maxDimension = smartOptions.facePreResize

    let size = this.getSizeFromRatios();

    if(size) {

      smartOptions.minScale = size.minScale
      smartOptions.width = size.width
      smartOptions.height = size.height
      

      //Function used in testbed of smartcrop.js repo, because tracking.js is very slow with big images
      const scaleImage = (img, maxDimension, callback) => {
          var width = img.naturalWidth || img.width;
          var height = img.naturalHeight || img.height;
          if (!maxDimension || (width < maxDimension && height < maxDimension) ) return callback(img, 1);
          var scale = Math.min(maxDimension / width, maxDimension / height);
          var canvas = document.createElement('canvas');
          canvas.width = ~~(width * scale);
          canvas.height = ~~(height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          var result = document.createElement('img');
          result.onload = function() {
            //console.log("IMAGE IS SCALED : ", scale)
            callback(result, scale);
          };
          result.src = canvas.toDataURL();
      }
      
      const scaleImageCallback = (new_img, scale) => {
        this.launchSmartCrop(new_img, smartOptions, scale, crop)
      }

      var img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = this.imageEl.src 
      img.onload = function() {

        scaleImage(img, maxDimension, scaleImageCallback)

      }

    } else {

      setSmartCrop()

    }

  }

  launchSmartCrop(img, smartOptions, scale = 1.0, crop = true) {

    //Scale smartOptions
    smartOptions.width *= scale
    smartOptions.height *= scale


    //Set crop callback when smartcrop return data
    const setSmartCrop = data => {
      if(!data) data = null
      this.smartCropData = null
      if(data && crop === true) {
        this.setValue(data, false, "real")
      }
    }

    const convertValuesWithScale = data => {
      return {
        x: data.x / scale,
        y: data.y / scale,
        width: data.width / scale,
        height: data.height / scale
      }
    }

    const smartCropFunc = (img, options) => {
      //console.log("OPTIONS : ", options)
      smartcrop.crop(img, options).then( result => {
        //console.log("RAW DATA : ", result.topCrop)
        let smartCropData = convertValuesWithScale(result.topCrop, scale)
        //console.log("CONVERT DATA : ", smartCropData)
        setSmartCrop(smartCropData)
        if(options.onSmartCropDone) options.onSmartCropDone(smartCropData)
      });
    }

    if(smartOptions.face) {

      var tracker = new tracking.ObjectTracker('face');
      tracking.track(img, tracker);

      tracker.on('track', function(event) {

        let maxTotal = 0
        event.data.map(function(face) {
          if(face.total > maxTotal) maxTotal = face.total
        });

        if(maxTotal > 0) {
          smartOptions.boost = []
          event.data.map(function(face) {
            //let weight = face.total / maxTotal
            let weight = 1.0
            if(weight >= 0.05) {
              smartOptions.boost.push({
                x: face.x,
                y: face.y,
                width: face.width,
                height: face.height,
                weight: weight
              });
            }
          });
        }

        smartCropFunc(img, smartOptions);

      });
      
    } else smartCropFunc(img, smartOptions)

  }

  setImage(src, callback = null, smartcrop = true, smartOptions = null) {

    let smartCallback = callback
    if(smartcrop === true) {
      let options = this.options
      options.smartOptions = smartOptions
      this.parseSmartOptions(options)
      smartCallback = () => {
        this.setBestCrop(this.smartOptions, true)
        if(callback) callback()
      }
    }

    super.setImage(src, smartCallback)
    return this
  }

}

export default SmartCroppr