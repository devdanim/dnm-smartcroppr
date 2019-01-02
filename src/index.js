import Croppr from 'dnm-croppr'
import smartcrop from 'smartcrop'


class SmartCroppr extends Croppr {

  constructor(element, options) {

      super(element, options, true)
      
      let originalInit = null
      if(this.options.onInitialize) {
        originalInit = this.options.onInitialize
      }
      const init = (instance) => {
        if(originalInit) originalInit(instance)
        if(options.smartcrop) this.setBestCrop(options, true, options.onSmartCropDone)
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
    
    let tempMinRatio = options.aspectRatio ? options.aspectRatio : null
    let tempMaxRatio = options.maxAspectRatio ? options.maxAspectRatio : null
    let minRatio = tempMinRatio
    let maxRatio = tempMaxRatio

    if(tempMaxRatio && tempMaxRatio < tempMinRatio) {
      minRatio = tempMaxRatio
      maxRatio = tempMinRatio
    } 

    //console.log(minRatio, maxRatio)

    return {
      minRatio: minRatio,
      maxRatio: maxRatio
    }

  }

  
  getSizeFromRatios(minRatio, maxRatio = null) {

    let { width, height } = this.sourceSize
    //console.log("Source Size : ", this.sourceSize)
    let imageRatio = width/height
    
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
    let cropHeight = width/cropRatio
    if(cropHeight > height) {
      cropWidth = height * cropRatio
      cropHeight = height
    }  

    //console.log(cropRatio)

    return {
      width: cropWidth,
      height: cropHeight,
      minScale: 1
    }

  }

  setBestCrop(cropData, crop = true, onSmartCropDone = null) {

    cropData = this.parseSmartOptions(cropData)

    let { minRatio, maxRatio } = cropData
    
    let size = null
    if(minRatio) size = this.getSizeFromRatios(minRatio, maxRatio);

    const setSmartCrop = data => {
      if(!data) data = null
      this.smartCropData = null
      if(data && crop === true) {
        this.setValue(data, false, "real")
      }
    }

    if(size) {
      var img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = this.imageEl.src 
      img.onload = function() {
        smartcrop.crop(img, size).then( result => {
          setSmartCrop(result.topCrop)
          if(onSmartCropDone) onSmartCropDone(result.topCrop)
        });
      }
      
    } else setSmartCrop(null)

  }

  setImage(src, callback = null, smartcrop = true) {

    let smartCallback = callback
    if(smartcrop === true) {
      smartCallback = () => {
        this.setBestCrop(this.options, true)
        if(callback) callback()
      }
    }

    super.setImage(src, smartCallback)
    return this
  }

}

export default SmartCroppr