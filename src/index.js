import Croppr from 'dnm-croppr'
import smartcrop from 'smartcrop'


class SmartCroppr extends Croppr {

  constructor(element, options, _deferred = false) {
      super(element, options, _deferred = false)
      if(options.smartcrop) {
        this.setBestCrop(this.options, true, options.onSmartCropDone)
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

    cropData = this.parseSmartOptions(cropData);

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
      smartcrop.crop(this.imageEl, size).then( result => {
        setSmartCrop(result.topCrop)
        if(onSmartCropDone) onSmartCropDone(result.topCrop)
      });
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