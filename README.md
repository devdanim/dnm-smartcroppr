### Easy to use JS cropper based on dnm-croppr (fork of Croppr.js) with smartcrop features of smartcrop.js.

dnm-smartcroppr is compatible with all options and methods of dnm-croppr.

**[dnm-croppr docs →](https://github.com/devdanim/dnm-croppr)**


## Installation

**Via NPM:**

```bash
npm install dnm-smartcroppr -—save
```

```javascript
// ES6 import - JS + CSS
import SmartCroppr from 'dnm-smartcroppr';
```


**Via script tag:**

```html
<link href="path/to/dnm-smartcroppr.min.css" rel="stylesheet"/>
<script src="path/to/dnm-smartcroppr.min.js"></script>
```


## Basic Usage

**In your HTML document:**

```html
<img src="path/to/image.jpg" id="croppr"/>
```

**In your JavaScript file:**

```javascript
var cropInstance = new SmartCroppr('#croppr', {
  // ...options
});
```



## Options

All options in **[dnm-croppr docs #Options →](https://github.com/devdanim/dnm-croppr#Options)** are compatible with dnm-smartcroppr. 

dnm-smartcroppr is optimized to work with ratios. Set **aspectRatio**, and optionally **maxAspectRatio** to find the best crop region for smartcrop.js.


There is only two additional options for now :

#### **smartcrop**

If `false`, smartcrop is deactivated. Default value is `true`.

#### **onSmartCropDone**

A callback function that is called when smartcrop is done. Default value is `null`.

```javascript
onSmartCropDone: function(data) {
  console.log(data.x, data.y, data.width, data.height);
}
```



## Methods

All methods in **[dnm-croppr docs #Methods →](https://github.com/devdanim/dnm-croppr#Methods)** are compatible with dnm-smartcroppr. 

#### setBestCrop(cropData: Array, _crop?: boolean_, _onSmartCropDone?: function_)

Modify smartcrop. `cropData` has the same structure as smartcrop.js. If `crop` is false, setBestCrop will only calculate the best crop without cropping the image.

`onSmartCropDone` is equivalent to the callback function in options

```javascript
var cropData = {
  aspectRatio: 1,
  maxAspectRatio: 2
};
var onSmartCropDone = function(data) {
  console.log(data.x, data.y, data.width, data.height);
};
cropInstance.setBestCrop(cropData, true, onSmartCropDone);
```

_Note: You can access the smart cropping informations with **cropperInstance.smartCropData**._


#### setImage(src: string, _callback?: function_, _smartcrop?: boolean_)

Changes the image src. Returns the Croppr instance. If `onSmartCropDone` is set to **false**, crop region will not be recalculated. Default value is **true**.



- - -

Thanks to original author of Croppr.js (James Ooi) and author of smartcrop.js (Jonas Wagner).
Released under the MIT License.
