import Croppr from 'dnm-croppr'
import smartcrop from 'smartcrop'

class SmartCroppr extends Croppr {

  constructor(element, options) {

      super(element, options, true)

      if(options.debug) this.debug = true
      
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
        element.onload = () => { 
          this.initialize(element); 
        }
      } else {
        this.initialize(element);
      }
            
  }

  parseSmartOptions(options) {

    let defaultSmartOptions = {
      minScale: null,
      minWidth: null,
      minHeight: null,
      aspectRatio: null,
      maxAspectRatio: null,
      onSmartCropDone: null,
      minScaleTreshold: 0.5
    }

    this.smartOptions = {}

    for(var key in defaultSmartOptions) {
      let defaultValue = defaultSmartOptions[key]
      if(options.smartOptions && typeof options.smartOptions[key] !== "undefined") {
        defaultValue = options.smartOptions[key]
      } 
      this.smartOptions[key] = defaultValue 
    }

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
    let { minRatio, maxRatio, minWidth, minHeight, minScale, minScaleTreshold } = this.smartOptions
    if(this.debug) console.log("debug - Source Size : ", this.sourceSize)
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

    let perfectRatio = false
    if(imageRatio === cropRatio) perfectRatio = true

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

    minScale = minScale !== null ? minScale > minScaleTreshold ? minScale : minScaleTreshold : 1.0

    return {
      width: cropWidth*minScale,
      height: cropHeight*minScale,
      minScale: minScale,
      perfectRatio: perfectRatio
    }

  }

  setBestCrop(smartOptions, crop = true) {

    const size = this.getSizeFromRatios();

    smartOptions.minScale = size.minScale
    smartOptions.width = size.width
    smartOptions.height = size.height
    smartOptions.perfectRatio = size.perfectRatio

    if(!smartOptions.width || !smartOptions.height) {
      smartOptions.skipSmartCrop = true;
      this.launchSmartCrop(this.imageEl, smartOptions)
    } else {
      
      const scaleImageCallback = (new_img, scale) => {
        if(this.debug) console.log("debug - IMAGE IS SCALED : ", scale)
        this.launchSmartCrop(new_img, smartOptions, scale, crop)
      }
  
      var img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = function() {
        scaleImageCallback(img, 1);
      }
      img.src = this.imageEl.src 
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
        this.setValue(data, true, "real")
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
      if(this.debug) console.log("debug - OPTIONS : ", options)

      const cropCallback = data => {
        const cloned_data = JSON.parse(JSON.stringify(data));
        setSmartCrop(data)
        if(options.onSmartCropDone) options.onSmartCropDone(cloned_data)
      }

      if(options.skipSmartCrop || (options.minScale === 1 && options.perfectRatio) ) {
        cropCallback(null)
      } else {
        smartcrop.crop(img, options).then( result => {
          if(this.debug) console.log("debug - RAW DATA : ", result.topCrop)
          let smartCropData = convertValuesWithScale(result.topCrop, scale)
          if(this.debug) console.log("debug - CONVERTED DATA : ", smartCropData)
          cropCallback(smartCropData)
        });
      }
    }

    smartCropFunc(img, smartOptions);

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