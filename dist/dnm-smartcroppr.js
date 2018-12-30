/**
 * Fork from Croppr.js : https://github.com/jamesssooi/Croppr.js
 * Original author : James Ooi. 
 *
 * A JavaScript image cropper that's lightweight, awesome, and has
 * zero dependencies.
 * 
 * dnm-croppr : https://github.com/devdanim/dnm-croppr
 * Fork author : Adrien du Repaire
 *
 * Released under the MIT License.
 *
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.SmartCroppr = factory());
}(this, function () { 'use strict';

  (function () {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
      window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }
    if (!window.requestAnimationFrame) window.requestAnimationFrame = function (callback, element) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = window.setTimeout(function () {
        callback(currTime + timeToCall);
      }, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
    if (!window.cancelAnimationFrame) window.cancelAnimationFrame = function (id) {
      clearTimeout(id);
    };
  })();
  (function () {
    if (typeof window.CustomEvent === "function") return false;
    function CustomEvent(event, params) {
      params = params || {
        bubbles: false,
        cancelable: false,
        detail: undefined
      };
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
      return evt;
    }
    CustomEvent.prototype = window.Event.prototype;
    window.CustomEvent = CustomEvent;
  })();
  (function (window) {
    try {
      new CustomEvent('test');
      return false;
    } catch (e) {}
    function MouseEvent(eventType, params) {
      params = params || {
        bubbles: false,
        cancelable: false
      };
      var mouseEvent = document.createEvent('MouseEvent');
      mouseEvent.initMouseEvent(eventType, params.bubbles, params.cancelable, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
      return mouseEvent;
    }
    MouseEvent.prototype = Event.prototype;
    window.MouseEvent = MouseEvent;
  })(window);

  class Handle {
    /**
     * Creates a new Handle instance.
     * @constructor
     * @param {Array} position The x and y ratio position of the handle
     *      within the crop region. Accepts a value between 0 to 1 in the order
     *      of [X, Y].
     * @param {Array} constraints Define the side of the crop region that
     *      is to be affected by this handle. Accepts a value of 0 or 1 in the
     *      order of [TOP, RIGHT, BOTTOM, LEFT].
     * @param {String} cursor The CSS cursor of this handle.
     * @param {Element} eventBus The element to dispatch events to.
     */
    constructor(position, constraints, cursor, eventBus) {
      var self = this;
      this.position = position;
      this.constraints = constraints;
      this.cursor = cursor;
      this.eventBus = eventBus;
      this.el = document.createElement('div');
      this.el.className = 'croppr-handle';
      this.el.style.cursor = cursor;
      this.el.addEventListener('mousedown', onMouseDown);
      function onMouseDown(e) {
        e.stopPropagation();
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('mousemove', onMouseMove);
        self.eventBus.dispatchEvent(new CustomEvent('handlestart', {
          detail: {
            handle: self
          }
        }));
      }
      function onMouseUp(e) {
        e.stopPropagation();
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('mousemove', onMouseMove);
        self.eventBus.dispatchEvent(new CustomEvent('handleend', {
          detail: {
            handle: self
          }
        }));
      }
      function onMouseMove(e) {
        e.stopPropagation();
        self.eventBus.dispatchEvent(new CustomEvent('handlemove', {
          detail: {
            mouseX: e.clientX,
            mouseY: e.clientY
          }
        }));
      }
    }
  }

  class Box {
    /**
     * Creates a new Box instance.
     * @constructor
     * @param {Number} x1
     * @param {Number} y1
     * @param {Number} x2
     * @param {Number} y2
     */
    constructor(x1, y1, x2, y2) {
      this.x1 = x1;
      this.y1 = y1;
      this.x2 = x2;
      this.y2 = y2;
    }
    /**
     * Sets the new dimensions of the box.
     * @param {Number} x1
     * @param {Number} y1
     * @param {Number} x2
     * @param {Number} y2
     */
    set(x1 = null, y1 = null, x2 = null, y2 = null) {
      this.x1 = x1 == null ? this.x1 : x1;
      this.y1 = y1 == null ? this.y1 : y1;
      this.x2 = x2 == null ? this.x2 : x2;
      this.y2 = y2 == null ? this.y2 : y2;
      return this;
    }
    /**
     * Calculates the width of the box.
     * @returns {Number}
     */
    width() {
      return Math.abs(this.x2 - this.x1);
    }
    /**
     * Calculates the height of the box.
     * @returns {Number}
     */
    height() {
      return Math.abs(this.y2 - this.y1);
    }
    /**
     * Resizes the box to a new size.
     * @param {Number} newWidth
     * @param {Number} newHeight
     * @param {Array} [origin] The origin point to resize from.
     *      Defaults to [0, 0] (top left).
     */
    resize(newWidth, newHeight, origin = [0, 0]) {
      const fromX = this.x1 + this.width() * origin[0];
      const fromY = this.y1 + this.height() * origin[1];
      this.x1 = fromX - newWidth * origin[0];
      this.y1 = fromY - newHeight * origin[1];
      this.x2 = this.x1 + newWidth;
      this.y2 = this.y1 + newHeight;
      return this;
    }
    /**
     * Scale the box by a factor.
     * @param {Number} factor
     * @param {Array} [origin] The origin point to resize from.
     *      Defaults to [0, 0] (top left).
     */
    scale(factor, origin = [0, 0], containerWidth = null, containerHeight = null) {
      const newWidth = this.width() * factor;
      const newHeight = this.height() * factor;
      this.resize(newWidth, newHeight, origin);
      return this;
    }
    move(x = null, y = null) {
      let width = this.width();
      let height = this.height();
      x = x === null ? this.x1 : x;
      y = y === null ? this.y1 : y;
      this.x1 = x;
      this.y1 = y;
      this.x2 = x + width;
      this.y2 = y + height;
      return this;
    }
    /**
     * Get relative x and y coordinates of a given point within the box.
     * @param {Array} point The x and y ratio position within the box.
     * @returns {Array} The x and y coordinates [x, y].
     */
    getRelativePoint(point = [0, 0]) {
      const x = this.width() * point[0];
      const y = this.height() * point[1];
      return [x, y];
    }
    /**
     * Get absolute x and y coordinates of a given point within the box.
     * @param {Array} point The x and y ratio position within the box.
     * @returns {Array} The x and y coordinates [x, y].
     */
    getAbsolutePoint(point = [0, 0]) {
      const x = this.x1 + this.width() * point[0];
      const y = this.y1 + this.height() * point[1];
      return [x, y];
    }
    getRatio(minRatio = null, maxRatio = null) {
      if (minRatio === null) return null;
      if (maxRatio === null) return minRatio;
      const imageRatio = this.width() / this.height();
      if (minRatio > maxRatio) {
        let tempRatio = minRatio;
        minRatio = maxRatio;
        maxRatio = tempRatio;
      }
      if (imageRatio > maxRatio) return maxRatio;else if (imageRatio < minRatio) return minRatio;else return imageRatio;
    }
    /**
     * Constrain the box to a fixed ratio.
     * @param {Number} ratio
     * @param {Array} [origin] The origin point to resize from.
     *     Defaults to [0, 0] (top left).
     * @param {String} [grow] The axis to grow to maintain the ratio.
     *     Defaults to 'height'.
     */
    constrainToRatio(ratio = null, origin = [0, 0], grow = 'height', maxRatio = null) {
      if (ratio === null) {
        return;
      }
      const width = this.width();
      const height = this.height();
      if (maxRatio !== null) {
        let minRatio = ratio;
        if (minRatio > maxRatio) {
          minRatio = maxRatio;
          maxRatio = ratio;
        }
        let cropRatio = width / height;
        if (cropRatio < minRatio || cropRatio > maxRatio) {
          let constrainWidth = width;
          let constrainHeight = height;
          if (cropRatio > maxRatio) constrainHeight = width / maxRatio;else constrainWidth = height * minRatio;
          this.resize(constrainWidth, constrainHeight, origin);
        }
      } else {
        switch (grow) {
          case 'height':
            this.resize(width, width / ratio, origin);
            break;
          case 'width':
            this.resize(height * ratio, height, origin);
            break;
          default:
            this.resize(width, width / ratio, origin);
        }
      }
      return this;
    }
    /**
     * Constrain the box within a boundary.
     * @param {Number} boundaryWidth
     * @param {Number} boundaryHeight
     * @param {Array} [origin] The origin point to resize from.
     *     Defaults to [0, 0] (top left).
     */
    constrainToBoundary(boundaryWidth, boundaryHeight, origin = [0, 0]) {
      const [originX, originY] = this.getAbsolutePoint(origin);
      const maxIfLeft = originX;
      const maxIfTop = originY;
      const maxIfRight = boundaryWidth - originX;
      const maxIfBottom = boundaryHeight - originY;
      const directionX = -2 * origin[0] + 1;
      const directionY = -2 * origin[1] + 1;
      let [maxWidth, maxHeight] = [null, null];
      switch (directionX) {
        case -1:
          maxWidth = maxIfLeft;
          break;
        case 0:
          maxWidth = Math.min(maxIfLeft, maxIfRight) * 2;
          break;
        case +1:
          maxWidth = maxIfRight;
          break;
      }
      switch (directionY) {
        case -1:
          maxHeight = maxIfTop;
          break;
        case 0:
          maxHeight = Math.min(maxIfTop, maxIfBottom) * 2;
          break;
        case +1:
          maxHeight = maxIfBottom;
          break;
      }
      if (this.width() > maxWidth) {
        const factor = maxWidth / this.width();
        this.scale(factor, origin);
      }
      if (this.height() > maxHeight) {
        const factor = maxHeight / this.height();
        this.scale(factor, origin);
      }
      return this;
    }
    /**
     * Constrain the box to a maximum/minimum size.
     * @param {Number} [maxWidth]
     * @param {Number} [maxHeight]
     * @param {Number} [minWidth]
     * @param {Number} [minHeight]
     * @param {Array} [origin] The origin point to resize from.
     *     Defaults to [0, 0] (top left).
     * @param {Number} [ratio] Ratio to maintain.
     */
    constrainToSize(maxWidth = null, maxHeight = null, minWidth = null, minHeight = null, origin = [0, 0], minRatio = null, maxRatio = null) {
      let ratio = this.getRatio(minRatio, maxRatio);
      if (maxWidth && this.width() > maxWidth) {
        const newWidth = maxWidth,
              newHeight = ratio === null ? this.height() : maxWidth / ratio;
        this.resize(newWidth, newHeight, origin);
      }
      if (maxHeight && this.height() > maxHeight) {
        const newWidth = ratio === null ? this.width() : maxHeight * ratio,
              newHeight = maxHeight;
        this.resize(newWidth, newHeight, origin);
      }
      if (minWidth && this.width() < minWidth) {
        const newWidth = minWidth,
              newHeight = ratio === null ? this.height() : minWidth / ratio;
        this.resize(newWidth, newHeight, origin);
      }
      if (minHeight && this.height() < minHeight) {
        const newWidth = ratio === null ? this.width() : minHeight * ratio,
              newHeight = minHeight;
        this.resize(newWidth, newHeight, origin);
      }
      return this;
    }
  }

  /**
   * Binds an element's touch events to be simulated as mouse events.
   * @param {Element} element
   */
  function enableTouch(element) {
    element.addEventListener('touchstart', simulateMouseEvent);
    element.addEventListener('touchend', simulateMouseEvent);
    element.addEventListener('touchmove', simulateMouseEvent);
  }
  /**
   * Translates a touch event to a mouse event.
   * @param {Event} e
   */
  function simulateMouseEvent(e) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const eventMap = {
      'touchstart': 'mousedown',
      'touchmove': 'mousemove',
      'touchend': 'mouseup'
    };
    touch.target.dispatchEvent(new MouseEvent(eventMap[e.type], {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: touch.clientX,
      clientY: touch.clientY,
      screenX: touch.screenX,
      screenY: touch.screenY
    }));
  }

  /**
   * Define a list of handles to create.
   *
   * @property {Array} position - The x and y ratio position of the handle within
   *      the crop region. Accepts a value between 0 to 1 in the order of [X, Y].
   * @property {Array} constraints - Define the side of the crop region that is to
   *      be affected by this handle. Accepts a value of 0 or 1 in the order of
   *      [TOP, RIGHT, BOTTOM, LEFT].
   * @property {String} cursor - The CSS cursor of this handle.
   */
  const HANDLES = [{
    position: [0.0, 0.0],
    constraints: [1, 0, 0, 1],
    cursor: 'nw-resize'
  }, {
    position: [0.5, 0.0],
    constraints: [1, 0, 0, 0],
    cursor: 'n-resize'
  }, {
    position: [1.0, 0.0],
    constraints: [1, 1, 0, 0],
    cursor: 'ne-resize'
  }, {
    position: [1.0, 0.5],
    constraints: [0, 1, 0, 0],
    cursor: 'e-resize'
  }, {
    position: [1.0, 1.0],
    constraints: [0, 1, 1, 0],
    cursor: 'se-resize'
  }, {
    position: [0.5, 1.0],
    constraints: [0, 0, 1, 0],
    cursor: 's-resize'
  }, {
    position: [0.0, 1.0],
    constraints: [0, 0, 1, 1],
    cursor: 'sw-resize'
  }, {
    position: [0.0, 0.5],
    constraints: [0, 0, 0, 1],
    cursor: 'w-resize'
  }];
  class CropprCore {
    constructor(element, options, deferred = false) {
      this.initOptions = options;
      this.options = this.parseOptions(options);
      element = this.getElement(element);
      if (!element.getAttribute('src')) {
        throw 'Image src not provided.';
      }
      this._initialized = false;
      this._restore = {
        parent: element.parentNode,
        element: element
      };
      if (this.options.preview) {
        this._restore.preview = this.options.preview;
        this._restore.parentPreview = this.options.preview.parentNode;
      }
      if (!deferred) {
        if (element.width === 0 || element.height === 0) {
          element.onload = () => {
            this.initialize(element);
          };
        } else {
          this.initialize(element);
        }
      }
    }
    initialize(element) {
      this.createDOM(element);
      this.getSourceSize();
      this.convertOptionsToPixels();
      this.attachHandlerEvents();
      this.attachRegionEvents();
      this.attachOverlayEvents();
      this.initializeBox(null, false);
      this.strictlyConstrain();
      this.redraw();
      this._initialized = true;
      if (this.options.onInitialize !== null) {
        this.options.onInitialize(this);
      }
      this.cropperEl.onwheel = event => {
        event.preventDefault();
        let {
          deltaY
        } = event;
        const maxDelta = 0.05;
        let coeff = deltaY > 0 ? 1 : -1;
        deltaY = Math.abs(deltaY) / 100;
        deltaY = deltaY > maxDelta ? maxDelta : deltaY;
        deltaY = 1 + coeff * deltaY;
        this.scaleBy(deltaY);
      };
      if (this.options.responsive) {
        let onResize;
        const resizeFunc = () => {
          let newOptions = this.options;
          let cropData = this.responsiveData;
          const controlKeys = ["x", "y", "width", "height"];
          for (var i = 0; i < controlKeys.length; i++) {
            cropData[controlKeys[i]] *= 100;
            cropData[controlKeys[i]] = cropData[controlKeys[i]] > 100 ? 100 : cropData[controlKeys[i]] < 0 ? 0 : cropData[controlKeys[i]];
          }
          newOptions.startPosition = [cropData.x, cropData.y, "%"];
          newOptions.startSize = [cropData.width, cropData.height, "%"];
          newOptions = this.parseOptions(newOptions);
          newOptions = this.convertOptionsToPixels(newOptions);
          this.initializeBox(newOptions);
        };
        window.onresize = function () {
          clearTimeout(onResize);
          onResize = setTimeout(() => {
            resizeFunc();
          }, 100);
        };
      }
    }
    getElement(element, type) {
      if (element) {
        if (!element.nodeName) {
          element = document.querySelector(element);
          if (element == null) {
            throw 'Unable to find element.';
          }
        }
      }
      return element;
    }
    createDOM(targetEl) {
      this.containerEl = document.createElement('div');
      this.containerEl.className = 'croppr-container';
      this.eventBus = this.containerEl;
      enableTouch(this.containerEl);
      this.cropperEl = document.createElement('div');
      this.cropperEl.className = 'croppr';
      this.imageEl = document.createElement('img');
      this.imageEl.setAttribute('src', targetEl.getAttribute('src'));
      this.imageEl.setAttribute('alt', targetEl.getAttribute('alt'));
      this.imageEl.className = 'croppr-image';
      this.imageClippedEl = this.imageEl.cloneNode();
      this.imageClippedEl.className = 'croppr-imageClipped';
      this.regionEl = document.createElement('div');
      this.regionEl.className = 'croppr-region';
      this.overlayEl = document.createElement('div');
      this.overlayEl.className = 'croppr-overlay';
      let handleContainerEl = document.createElement('div');
      handleContainerEl.className = 'croppr-handleContainer';
      this.handles = [];
      for (let i = 0; i < HANDLES.length; i++) {
        const handle = new Handle(HANDLES[i].position, HANDLES[i].constraints, HANDLES[i].cursor, this.eventBus);
        this.handles.push(handle);
        handleContainerEl.appendChild(handle.el);
      }
      this.cropperEl.appendChild(this.imageEl);
      this.cropperEl.appendChild(this.imageClippedEl);
      this.cropperEl.appendChild(this.regionEl);
      this.cropperEl.appendChild(this.overlayEl);
      this.cropperEl.appendChild(handleContainerEl);
      this.containerEl.appendChild(this.cropperEl);
      targetEl.parentElement.replaceChild(this.containerEl, targetEl);
      this.setLivePreview();
    }
    setLivePreview() {
      if (this.options.preview) {
        this.preview = {};
        this.preview.parent = this.options.preview;
        this.preview.parent.style.position = "relative";
        let new_container = document.createElement("div");
        this.preview.container = this.preview.parent.appendChild(new_container);
        this.preview.container.style.overflow = "hidden";
        this.preview.container.style.position = "absolute";
        this.preview.container.style.top = "50%";
        this.preview.container.style.left = "50%";
        this.preview.container.style.transform = "translate(-50%, -50%)";
      }
    }
    resizePreview(cropData = null) {
      if (cropData === null) cropData = this.getValue("ratio");
      if (this.preview && cropData.width && cropData.height) {
        const targetWidth = this.preview.parent.offsetWidth;
        const targetHeight = this.preview.parent.offsetHeight;
        const targetRatio = targetWidth / targetHeight;
        const cropWidth = this.sourceSize.width * cropData.width;
        const cropHeight = this.sourceSize.height * cropData.height;
        const cropRatio = cropWidth / cropHeight;
        let containerWidth = targetWidth;
        let containerHeight = targetHeight;
        if (targetRatio > cropRatio) {
          containerWidth = containerHeight * cropRatio;
        } else {
          containerHeight = containerWidth / cropRatio;
        }
        this.preview.container.style.width = containerWidth + "px";
        this.preview.container.style.height = containerHeight + "px";
        let resizeWidth = this.sourceSize.width * containerWidth / cropWidth;
        let resizeHeight = this.sourceSize.height * containerHeight / cropHeight;
        let deltaX = -cropData.x * resizeWidth;
        let deltaY = -cropData.y * resizeHeight;
        this.preview.image.style.width = resizeWidth + "px";
        this.preview.image.style.height = resizeHeight + "px";
        this.preview.image.style.left = deltaX + "px";
        this.preview.image.style.top = deltaY + "px";
      }
    }
    strictlyConstrain(opts = null, origin = null) {
      let origins;
      if (origin === null) {
        origins = [[0, 0], [1, 1]];
        origin = [.5, .5];
      } else {
        origins = [origin];
      }
      if (opts === null) opts = this.options;
      const {
        width: parentWidth,
        height: parentHeight
      } = this.imageEl.getBoundingClientRect();
      this.box.constrainToRatio(opts.aspectRatio, origin, "height", opts.maxAspectRatio);
      this.box.constrainToSize(opts.maxSize.width, opts.maxSize.height, opts.minSize.width, opts.minSize.height, origin, opts.aspectRatio, opts.maxAspectRatio);
      origins.map(newOrigin => {
        this.box.constrainToBoundary(parentWidth, parentHeight, newOrigin);
      });
    }
    /**
     * Changes the image src.
     * @param {String} src
     */
    setImage(src, callback) {
      this.imageEl.onload = () => {
        this.getSourceSize();
        this.options = this.parseOptions(this.initOptions);
        this.convertOptionsToPixels();
        this.initializeBox(null, false);
        this.strictlyConstrain();
        this.redraw();
        if (callback) callback();
      };
      this.imageEl.src = src;
      this.imageClippedEl.src = src;
      return this;
    }
    destroy() {
      this._restore.parent.replaceChild(this._restore.element, this.containerEl);
      if (this.options.preview) {
        this.preview.image.parentNode.removeChild(this.preview.image);
        this.preview.container.parentNode.removeChild(this.preview.container);
      }
    }
    /**
     * Create a new box region with a set of options.
     * @param {Object} opts The options.
     * @returns {Box}
     */
    initializeBox(opts = null, constrain = true) {
      if (opts === null) opts = this.options;
      let boxWidth = opts.startSize.width;
      let boxHeight = opts.startSize.height;
      if (opts.minSize) {
        if (boxWidth < opts.minSize.width) boxWidth = opts.minSize.width;else if (boxWidth < opts.maxSize.width) boxWidth = opts.maxSize.width;
      }
      if (opts.maxSize) {
        if (boxHeight < opts.minSize.height) boxHeight = opts.minSize.height;else if (boxHeight < opts.maxSize.height) boxHeight = opts.maxSize.height;
      }
      let box = new Box(0, 0, boxWidth, boxHeight);
      let x = 0;
      let y = 0;
      if (opts.startPosition === null) {
        const {
          width: parentWidth,
          height: parentHeight
        } = this.imageEl.getBoundingClientRect();
        x = parentWidth / 2 - boxWidth / 2;
        y = parentHeight / 2 - boxHeight / 2;
      } else {
        x = opts.startPosition.x;
        y = opts.startPosition.y;
      }
      box.move(x, y);
      if (this.preview) {
        if (this.preview.image) {
          this.preview.image.parentNode.removeChild(this.preview.image);
          this.preview.image = null;
        }
        let new_img = document.createElement("img");
        new_img.src = this.imageEl.src;
        this.preview.image = this.preview.container.appendChild(new_img);
        this.preview.image.style.position = "relative";
      }
      if (constrain === true) this.strictlyConstrain();
      this.box = box;
      this.redraw();
      return box;
    }
    getSourceSize() {
      this.sourceSize = {};
      this.sourceSize.width = this.imageEl.naturalWidth;
      this.sourceSize.height = this.imageEl.naturalHeight;
      return this.sourceSize;
    }
    convertor(data, inputMode, outputMode) {
      const convertRealDataToPixel = data => {
        const {
          width,
          height
        } = this.imageEl.getBoundingClientRect();
        const factorX = this.sourceSize.width / width;
        const factorY = this.sourceSize.height / height;
        if (data.width) {
          data.width /= factorX;
        }
        if (data.x) {
          data.x /= factorX;
        }
        if (data.height) {
          data.height /= factorY;
        }
        if (data.y) {
          data.y /= factorY;
        }
        return data;
      };
      const convertPercentToPixel = data => {
        const {
          width,
          height
        } = this.imageEl.getBoundingClientRect();
        if (data.width) {
          data.width = data.width / 100 * width;
        }
        if (data.x) {
          data.x = data.x / 100 * width;
        }
        if (data.height) {
          data.height = data.height / 100 * height;
        }
        if (data.y) {
          data.y = data.y / 100 * height;
        }
        return data;
      };
      if (inputMode === "real" && outputMode === "px") {
        return convertRealDataToPixel(data);
      } else if (inputMode === "%" && outputMode === "px") {
        return convertPercentToPixel(data);
      }
      return null;
    }
    convertOptionsToPixels(opts = null) {
      let setOptions = false;
      if (opts === null) {
        opts = this.options;
        setOptions = true;
      }
      const {
        width,
        height
      } = this.imageEl.getBoundingClientRect();
      const sizeKeys = ['maxSize', 'minSize', 'startSize', 'startPosition'];
      for (let i = 0; i < sizeKeys.length; i++) {
        const key = sizeKeys[i];
        if (opts[key] !== null) {
          if (opts[key].unit == '%') {
            opts[key] = this.convertor(opts[key], "%", "px");
          } else if (opts[key].real === true) {
            opts[key] = this.convertor(opts[key], "real", "px");
          }
          delete opts[key].unit;
        }
      }
      if (opts.minSize) {
        if (opts.minSize.width > width) opts.minSize.width = width;
        if (opts.minSize.height > height) opts.minSize.height = height;
      }
      if (opts.startSize && opts.startPosition) {
        let xEnd = opts.startPosition.x + opts.startSize.width;
        if (xEnd > width) opts.startPosition.x -= xEnd - width;
        let yEnd = opts.startPosition.y + opts.startSize.height;
        if (yEnd > height) opts.startPosition.y -= yEnd - height;
      }
      if (setOptions) this.options = opts;
      return opts;
    }
    redraw() {
      this.resizePreview();
      const width = Math.round(this.box.width()),
            height = Math.round(this.box.height()),
            x1 = Math.round(this.box.x1),
            y1 = Math.round(this.box.y1),
            x2 = Math.round(this.box.x2),
            y2 = Math.round(this.box.y2);
      window.requestAnimationFrame(() => {
        this.regionEl.style.transform = `translate(${x1}px, ${y1}px)`;
        this.regionEl.style.width = width + 'px';
        this.regionEl.style.height = height + 'px';
        this.imageClippedEl.style.clip = `rect(${y1}px, ${x2}px, ${y2}px, ${x1}px)`;
        const center = this.box.getAbsolutePoint([.5, .5]);
        const {
          width: parentWidth,
          height: parentHeight
        } = this.imageEl.getBoundingClientRect();
        const xSign = center[0] - parentWidth / 2 >> 31;
        const ySign = center[1] - parentHeight / 2 >> 31;
        const quadrant = (xSign ^ ySign) + ySign + ySign + 4;
        const foregroundHandleIndex = -2 * quadrant + 8;
        for (let i = 0; i < this.handles.length; i++) {
          let handle = this.handles[i];
          const handleWidth = handle.el.offsetWidth;
          const handleHeight = handle.el.offsetHeight;
          const left = x1 + width * handle.position[0] - handleWidth / 2;
          const top = y1 + height * handle.position[1] - handleHeight / 2;
          handle.el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
          handle.el.style.zIndex = foregroundHandleIndex == i ? 5 : 4;
        }
      });
    }
    attachHandlerEvents() {
      const eventBus = this.eventBus;
      eventBus.addEventListener('handlestart', this.onHandleMoveStart.bind(this));
      eventBus.addEventListener('handlemove', this.onHandleMoveMoving.bind(this));
      eventBus.addEventListener('handleend', this.onHandleMoveEnd.bind(this));
    }
    attachRegionEvents() {
      const eventBus = this.eventBus;
      this.regionEl.addEventListener('mousedown', onMouseDown);
      eventBus.addEventListener('regionstart', this.onRegionMoveStart.bind(this));
      eventBus.addEventListener('regionmove', this.onRegionMoveMoving.bind(this));
      eventBus.addEventListener('regionend', this.onRegionMoveEnd.bind(this));
      function onMouseDown(e) {
        e.stopPropagation();
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('mousemove', onMouseMove);
        eventBus.dispatchEvent(new CustomEvent('regionstart', {
          detail: {
            mouseX: e.clientX,
            mouseY: e.clientY
          }
        }));
      }
      function onMouseMove(e) {
        e.stopPropagation();
        eventBus.dispatchEvent(new CustomEvent('regionmove', {
          detail: {
            mouseX: e.clientX,
            mouseY: e.clientY
          }
        }));
      }
      function onMouseUp(e) {
        e.stopPropagation();
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('mousemove', onMouseMove);
        eventBus.dispatchEvent(new CustomEvent('regionend', {
          detail: {
            mouseX: e.clientX,
            mouseY: e.clientY
          }
        }));
      }
    }
    attachOverlayEvents() {
      const SOUTHEAST_HANDLE_IDX = 4;
      const self = this;
      let tmpBox = null;
      this.overlayEl.addEventListener('mousedown', onMouseDown);
      function onMouseDown(e) {
        e.stopPropagation();
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('mousemove', onMouseMove);
        const container = self.cropperEl.getBoundingClientRect();
        const mouseX = e.clientX - container.left;
        const mouseY = e.clientY - container.top;
        tmpBox = self.box;
        self.box = new Box(mouseX, mouseY, mouseX + 1, mouseY + 1);
        self.eventBus.dispatchEvent(new CustomEvent('handlestart', {
          detail: {
            handle: self.handles[SOUTHEAST_HANDLE_IDX]
          }
        }));
      }
      function onMouseMove(e) {
        e.stopPropagation();
        self.eventBus.dispatchEvent(new CustomEvent('handlemove', {
          detail: {
            mouseX: e.clientX,
            mouseY: e.clientY
          }
        }));
      }
      function onMouseUp(e) {
        e.stopPropagation();
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('mousemove', onMouseMove);
        if (self.box.width() === 1 && self.box.height() === 1) {
          self.box = tmpBox;
          return;
        }
        self.eventBus.dispatchEvent(new CustomEvent('handleend', {
          detail: {
            mouseX: e.clientX,
            mouseY: e.clientY
          }
        }));
      }
    }
    onHandleMoveStart(e) {
      let handle = e.detail.handle;
      const originPoint = [1 - handle.position[0], 1 - handle.position[1]];
      let [originX, originY] = this.box.getAbsolutePoint(originPoint);
      this.activeHandle = {
        handle,
        originPoint,
        originX,
        originY
      };
      if (this.options.onCropStart !== null) {
        this.options.onCropStart(this.getValue());
      }
    }
    onHandleMoveMoving(e) {
      let {
        mouseX,
        mouseY
      } = e.detail;
      let container = this.cropperEl.getBoundingClientRect();
      mouseX = mouseX - container.left;
      mouseY = mouseY - container.top;
      if (mouseX < 0) {
        mouseX = 0;
      } else if (mouseX > container.width) {
        mouseX = container.width;
      }
      if (mouseY < 0) {
        mouseY = 0;
      } else if (mouseY > container.height) {
        mouseY = container.height;
      }
      let origin = this.activeHandle.originPoint.slice();
      const originX = this.activeHandle.originX;
      const originY = this.activeHandle.originY;
      const handle = this.activeHandle.handle;
      const TOP_MOVABLE = handle.constraints[0] === 1;
      const RIGHT_MOVABLE = handle.constraints[1] === 1;
      const BOTTOM_MOVABLE = handle.constraints[2] === 1;
      const LEFT_MOVABLE = handle.constraints[3] === 1;
      const MULTI_AXIS = (LEFT_MOVABLE || RIGHT_MOVABLE) && (TOP_MOVABLE || BOTTOM_MOVABLE);
      let x1 = LEFT_MOVABLE || RIGHT_MOVABLE ? originX : this.box.x1;
      let x2 = LEFT_MOVABLE || RIGHT_MOVABLE ? originX : this.box.x2;
      let y1 = TOP_MOVABLE || BOTTOM_MOVABLE ? originY : this.box.y1;
      let y2 = TOP_MOVABLE || BOTTOM_MOVABLE ? originY : this.box.y2;
      x1 = LEFT_MOVABLE ? mouseX : x1;
      x2 = RIGHT_MOVABLE ? mouseX : x2;
      y1 = TOP_MOVABLE ? mouseY : y1;
      y2 = BOTTOM_MOVABLE ? mouseY : y2;
      let [isFlippedX, isFlippedY] = [false, false];
      if (LEFT_MOVABLE || RIGHT_MOVABLE) {
        isFlippedX = LEFT_MOVABLE ? mouseX > originX : mouseX < originX;
      }
      if (TOP_MOVABLE || BOTTOM_MOVABLE) {
        isFlippedY = TOP_MOVABLE ? mouseY > originY : mouseY < originY;
      }
      if (isFlippedX) {
        const tmp = x1;
        x1 = x2;
        x2 = tmp;
        origin[0] = 1 - origin[0];
      }
      if (isFlippedY) {
        const tmp = y1;
        y1 = y2;
        y2 = tmp;
        origin[1] = 1 - origin[1];
      }
      let box = new Box(x1, y1, x2, y2);
      if (this.options.aspectRatio) {
        let ratio = this.options.aspectRatio;
        let isVerticalMovement = false;
        if (MULTI_AXIS) {
          isVerticalMovement = mouseY > box.y1 + ratio * box.width() || mouseY < box.y2 - ratio * box.width();
        } else if (TOP_MOVABLE || BOTTOM_MOVABLE) {
          isVerticalMovement = true;
        }
        const ratioMode = isVerticalMovement ? 'width' : 'height';
        box.constrainToRatio(ratio, origin, ratioMode, this.options.maxAspectRatio);
      }
      box.constrainToSize(this.options.maxSize.width, this.options.maxSize.height, this.options.minSize.width, this.options.minSize.height, origin, this.options.aspectRatio, this.options.maxAspectRatio);
      const {
        width: parentWidth,
        height: parentHeight
      } = this.imageEl.getBoundingClientRect();
      let boundaryOrigins = [origin];
      if (this.options.maxAspectRatio) boundaryOrigins = [[0, 0], [1, 1]];
      boundaryOrigins.map(boundaryOrigin => {
        box.constrainToBoundary(parentWidth, parentHeight, boundaryOrigin);
      });
      this.box = box;
      this.redraw();
      if (this.options.onCropMove !== null) {
        this.options.onCropMove(this.getValue());
      }
    }
    onHandleMoveEnd(e) {
      if (this.options.onCropEnd !== null) {
        this.options.onCropEnd(this.getValue());
      }
    }
    onRegionMoveStart(e) {
      let {
        mouseX,
        mouseY
      } = e.detail;
      let container = this.cropperEl.getBoundingClientRect();
      mouseX = mouseX - container.left;
      mouseY = mouseY - container.top;
      this.currentMove = {
        offsetX: mouseX - this.box.x1,
        offsetY: mouseY - this.box.y1
      };
      if (this.options.onCropStart !== null) {
        this.options.onCropStart(this.getValue());
      }
    }
    onRegionMoveMoving(e) {
      let {
        mouseX,
        mouseY
      } = e.detail;
      let {
        offsetX,
        offsetY
      } = this.currentMove;
      let container = this.cropperEl.getBoundingClientRect();
      mouseX = mouseX - container.left;
      mouseY = mouseY - container.top;
      this.box.move(mouseX - offsetX, mouseY - offsetY);
      if (this.box.x1 < 0) {
        this.box.move(0, null);
      }
      if (this.box.x2 > container.width) {
        this.box.move(container.width - this.box.width(), null);
      }
      if (this.box.y1 < 0) {
        this.box.move(null, 0);
      }
      if (this.box.y2 > container.height) {
        this.box.move(null, container.height - this.box.height());
      }
      this.redraw();
      if (this.options.onCropMove !== null) {
        this.options.onCropMove(this.getValue());
      }
    }
    onRegionMoveEnd(e) {
      if (this.options.onCropEnd !== null) {
        this.options.onCropEnd(this.getValue());
      }
    }
    getValue(mode = null) {
      if (mode === null) {
        mode = this.options.returnMode;
      }
      let cropData = {};
      if (mode == 'real') {
        cropData = this.getValueAsRealData();
      } else if (mode == 'ratio') {
        cropData = this.getValueAsRatio();
      } else if (mode == 'raw') {
        cropData = {
          x: Math.round(this.box.x1),
          y: Math.round(this.box.y1),
          width: Math.round(this.box.width()),
          height: Math.round(this.box.height())
        };
      }
      if (this.options.responsive) {
        if (mode == "ratio") this.responsiveData = cropData;else this.responsiveData = this.getValueAsRatio();
      }
      return cropData;
    }
    getValueAsRealData() {
      const actualWidth = this.imageEl.naturalWidth;
      const actualHeight = this.imageEl.naturalHeight;
      const {
        width: elementWidth,
        height: elementHeight
      } = this.imageEl.getBoundingClientRect();
      const factorX = actualWidth / elementWidth;
      const factorY = actualHeight / elementHeight;
      return {
        x: Math.round(this.box.x1 * factorX),
        y: Math.round(this.box.y1 * factorY),
        width: Math.round(this.box.width() * factorX),
        height: Math.round(this.box.height() * factorY)
      };
    }
    getValueAsRatio() {
      const {
        width: elementWidth,
        height: elementHeight
      } = this.imageEl.getBoundingClientRect();
      return {
        x: this.box.x1 / elementWidth,
        y: this.box.y1 / elementHeight,
        width: this.box.width() / elementWidth,
        height: this.box.height() / elementHeight
      };
    }
    parseOptions(opts = null) {
      if (opts === null) opts = this.options;
      const defaults = {
        aspectRatio: null,
        maxAspectRatio: null,
        maxSize: {
          width: null,
          height: null,
          unit: 'px',
          real: false
        },
        minSize: {
          width: null,
          height: null,
          unit: 'px',
          real: false
        },
        startSize: {
          width: 100,
          height: 100,
          unit: '%',
          real: false
        },
        startPosition: null,
        returnMode: 'real',
        onInitialize: null,
        onCropStart: null,
        onCropMove: null,
        onCropEnd: null,
        preview: null,
        responsive: true
      };
      let preview = null;
      if (opts.preview !== null) preview = this.getElement(opts.preview);
      let responsive = null;
      if (opts.responsive !== null) responsive = opts.responsive;
      let aspectRatio = null;
      let maxAspectRatio = null;
      const ratioKeys = ["aspectRatio", "maxAspectRatio"];
      for (var i = 0; i < ratioKeys.length; i++) {
        if (opts[ratioKeys[i]] !== undefined) {
          if (typeof opts[ratioKeys[i]] === 'number') {
            let ratio = opts[ratioKeys[i]];
            if (ratioKeys[i] === "aspectRatio") aspectRatio = ratio;else maxAspectRatio = ratio;
          } else if (opts[ratioKeys[i]] instanceof Array) {
            let ratio = opts[ratioKeys[i]][1] / opts[ratioKeys[i]][0];
            if (ratioKeys[i] === "aspectRatio") aspectRatio = ratio;else maxAspectRatio = ratio;
          }
        }
      }
      let maxSize = null;
      if (opts.maxSize !== undefined && opts.maxSize !== null) {
        maxSize = {
          width: opts.maxSize[0] || null,
          height: opts.maxSize[1] || null,
          unit: opts.maxSize[2] || 'px',
          real: opts.minSize[3] || false
        };
      }
      let minSize = null;
      if (opts.minSize !== undefined && opts.minSize !== null) {
        minSize = {
          width: opts.minSize[0] || null,
          height: opts.minSize[1] || null,
          unit: opts.minSize[2] || 'px',
          real: opts.minSize[3] || false
        };
      }
      let startSize = null;
      if (opts.startSize !== undefined && opts.startSize !== null) {
        startSize = {
          width: opts.startSize[0] || null,
          height: opts.startSize[1] || null,
          unit: opts.startSize[2] || '%',
          real: opts.startSize[3] || false
        };
      }
      let startPosition = null;
      if (opts.startPosition !== undefined && opts.startPosition !== null) {
        startPosition = {
          x: opts.startPosition[0] || null,
          y: opts.startPosition[1] || null,
          unit: opts.startPosition[2] || '%',
          real: opts.startPosition[3] || false
        };
      }
      let onInitialize = null;
      if (typeof opts.onInitialize === 'function') {
        onInitialize = opts.onInitialize;
      }
      let onCropStart = null;
      if (typeof opts.onCropStart === 'function') {
        onCropStart = opts.onCropStart;
      }
      let onCropEnd = null;
      if (typeof opts.onCropEnd === 'function') {
        onCropEnd = opts.onCropEnd;
      }
      let onCropMove = null;
      if (typeof opts.onUpdate === 'function') {
        console.warn('Croppr.js: `onUpdate` is deprecated and will be removed in the next major release. Please use `onCropMove` or `onCropEnd` instead.');
        onCropMove = opts.onUpdate;
      }
      if (typeof opts.onCropMove === 'function') {
        onCropMove = opts.onCropMove;
      }
      let returnMode = null;
      if (opts.returnMode !== undefined) {
        const s = opts.returnMode.toLowerCase();
        if (['real', 'ratio', 'raw'].indexOf(s) === -1) {
          throw "Invalid return mode.";
        }
        returnMode = s;
      }
      const defaultValue = (v, d) => v !== null ? v : d;
      return {
        aspectRatio: defaultValue(aspectRatio, defaults.aspectRatio),
        maxAspectRatio: defaultValue(maxAspectRatio, defaults.maxAspectRatio),
        maxSize: defaultValue(maxSize, defaults.maxSize),
        minSize: defaultValue(minSize, defaults.minSize),
        startSize: defaultValue(startSize, defaults.startSize),
        startPosition: defaultValue(startPosition, defaults.startPosition),
        returnMode: defaultValue(returnMode, defaults.returnMode),
        onInitialize: defaultValue(onInitialize, defaults.onInitialize),
        onCropStart: defaultValue(onCropStart, defaults.onCropStart),
        onCropMove: defaultValue(onCropMove, defaults.onCropMove),
        onCropEnd: defaultValue(onCropEnd, defaults.onCropEnd),
        preview: defaultValue(preview, defaults.preview),
        responsive: defaultValue(responsive, defaults.responsive)
      };
    }
  }

  class Croppr extends CropprCore {
    /**
     * @constructor
     * Calls the CropprCore's constructor.
     */
    constructor(element, options, _deferred = false) {
      super(element, options, _deferred);
    }
    /**
     * Gets the value of the crop region.
     * @param {String} [mode] Which mode of calculation to use: 'real', 'ratio' or
     *      'raw'.
     */
    getValue(mode) {
      return super.getValue(mode);
    }
    /**
     * Changes the image src.
     * @param {String} src
     */
    setImage(src, callback = null) {
      return super.setImage(src, callback);
    }
    destroy() {
      return super.destroy();
    }
    /**
     * Moves the crop region to a specified coordinate.
     * @param {Number} x
     * @param {Number} y
     */
    moveTo(x, y, constrain = true, mode = "px") {
      if (mode === "%" || mode === "real") {
        let data = this.convertor({
          x,
          y
        }, mode, "px");
        x = data.x;
        y = data.y;
      }
      this.box.move(x, y);
      if (constrain === true) this.strictlyConstrain(null, [0, 0]);
      this.redraw();
      if (this.options.onCropEnd !== null) {
        this.options.onCropEnd(this.getValue());
      }
      return this;
    }
    /**
     * Resizes the crop region to a specified width and height.
     * @param {Number} width
     * @param {Number} height
     * @param {Array} origin The origin point to resize from.
     *      Defaults to [0.5, 0.5] (center).
     */
    resizeTo(width, height, origin = null, constrain = true, mode = "px") {
      if (mode === "%" || mode === "real") {
        let data = {
          width: width,
          height: height
        };
        data = this.convertor(data, mode, "px");
        width = data.width;
        height = data.height;
      }
      if (origin === null) origin = [.5, .5];
      this.box.resize(width, height, origin);
      if (constrain === true) this.strictlyConstrain();
      this.redraw();
      if (this.options.onCropEnd !== null) {
        this.options.onCropEnd(this.getValue());
      }
      return this;
    }
    setValue(data, constrain = true, mode = "%") {
      if (mode === "%" || mode === "real") data = this.convertor(data, mode, "px");
      this.moveTo(data.x, data.y, false);
      this.resizeTo(data.width, data.height, [0, 0], constrain);
      return this;
    }
    /**
     * Scale the crop region by a factor.
     * @param {Number} factor
     * @param {Array} origin The origin point to resize from.
     *      Defaults to [0.5, 0.5] (center).
     */
    scaleBy(factor, origin = null, constrain = true) {
      if (origin === null) origin = [.5, .5];
      this.box.scale(factor, origin);
      if (constrain === true) this.strictlyConstrain();
      this.redraw();
      if (this.options.onCropEnd !== null) {
        this.options.onCropEnd(this.getValue());
      }
      return this;
    }
    reset() {
      this.box = this.initializeBox(this.options);
      this.redraw();
      if (this.options.onCropEnd !== null) {
        this.options.onCropEnd(this.getValue());
      }
      return this;
    }
  }

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  var smartcrop = createCommonjsModule(function (module, exports) {
    (function () {
      var smartcrop = {};
      smartcrop.Promise = typeof Promise !== 'undefined' ? Promise : function () {
        throw new Error('No native promises and smartcrop.Promise not set.');
      };
      smartcrop.DEFAULTS = {
        width: 0,
        height: 0,
        aspect: 0,
        cropWidth: 0,
        cropHeight: 0,
        detailWeight: 0.2,
        skinColor: [0.78, 0.57, 0.44],
        skinBias: 0.01,
        skinBrightnessMin: 0.2,
        skinBrightnessMax: 1.0,
        skinThreshold: 0.8,
        skinWeight: 1.8,
        saturationBrightnessMin: 0.05,
        saturationBrightnessMax: 0.9,
        saturationThreshold: 0.4,
        saturationBias: 0.2,
        saturationWeight: 0.1,
        scoreDownSample: 8,
        step: 8,
        scaleStep: 0.1,
        minScale: 1.0,
        maxScale: 1.0,
        edgeRadius: 0.4,
        edgeWeight: -20.0,
        outsideImportance: -0.5,
        boostWeight: 100.0,
        ruleOfThirds: true,
        prescale: true,
        imageOperations: null,
        canvasFactory: defaultCanvasFactory,
        debug: false
      };
      smartcrop.crop = function (inputImage, options_, callback) {
        var options = extend({}, smartcrop.DEFAULTS, options_);
        if (options.aspect) {
          options.width = options.aspect;
          options.height = 1;
        }
        if (options.imageOperations === null) {
          options.imageOperations = canvasImageOperations(options.canvasFactory);
        }
        var iop = options.imageOperations;
        var scale = 1;
        var prescale = 1;
        return iop.open(inputImage, options.input).then(function (image) {
          if (options.width && options.height) {
            scale = min(image.width / options.width, image.height / options.height);
            options.cropWidth = ~~(options.width * scale);
            options.cropHeight = ~~(options.height * scale);
            options.minScale = min(options.maxScale, max(1 / scale, options.minScale));
            if (options.prescale !== false) {
              prescale = min(max(256 / image.width, 256 / image.height), 1);
              if (prescale < 1) {
                image = iop.resample(image, image.width * prescale, image.height * prescale);
                options.cropWidth = ~~(options.cropWidth * prescale);
                options.cropHeight = ~~(options.cropHeight * prescale);
                if (options.boost) {
                  options.boost = options.boost.map(function (boost) {
                    return {
                      x: ~~(boost.x * prescale),
                      y: ~~(boost.y * prescale),
                      width: ~~(boost.width * prescale),
                      height: ~~(boost.height * prescale),
                      weight: boost.weight
                    };
                  });
                }
              } else {
                prescale = 1;
              }
            }
          }
          return image;
        }).then(function (image) {
          return iop.getData(image).then(function (data) {
            var result = analyse(options, data);
            var crops = result.crops || [result.topCrop];
            for (var i = 0, iLen = crops.length; i < iLen; i++) {
              var crop = crops[i];
              crop.x = ~~(crop.x / prescale);
              crop.y = ~~(crop.y / prescale);
              crop.width = ~~(crop.width / prescale);
              crop.height = ~~(crop.height / prescale);
            }
            if (callback) callback(result);
            return result;
          });
        });
      };
      smartcrop.isAvailable = function (options) {
        if (!smartcrop.Promise) return false;
        var canvasFactory = options ? options.canvasFactory : defaultCanvasFactory;
        if (canvasFactory === defaultCanvasFactory) {
          var c = document.createElement('canvas');
          if (!c.getContext('2d')) {
            return false;
          }
        }
        return true;
      };
      function edgeDetect(i, o) {
        var id = i.data;
        var od = o.data;
        var w = i.width;
        var h = i.height;
        for (var y = 0; y < h; y++) {
          for (var x = 0; x < w; x++) {
            var p = (y * w + x) * 4;
            var lightness;
            if (x === 0 || x >= w - 1 || y === 0 || y >= h - 1) {
              lightness = sample(id, p);
            } else {
              lightness = sample(id, p) * 4 - sample(id, p - w * 4) - sample(id, p - 4) - sample(id, p + 4) - sample(id, p + w * 4);
            }
            od[p + 1] = lightness;
          }
        }
      }
      function skinDetect(options, i, o) {
        var id = i.data;
        var od = o.data;
        var w = i.width;
        var h = i.height;
        for (var y = 0; y < h; y++) {
          for (var x = 0; x < w; x++) {
            var p = (y * w + x) * 4;
            var lightness = cie(id[p], id[p + 1], id[p + 2]) / 255;
            var skin = skinColor(options, id[p], id[p + 1], id[p + 2]);
            var isSkinColor = skin > options.skinThreshold;
            var isSkinBrightness = lightness >= options.skinBrightnessMin && lightness <= options.skinBrightnessMax;
            if (isSkinColor && isSkinBrightness) {
              od[p] = (skin - options.skinThreshold) * (255 / (1 - options.skinThreshold));
            } else {
              od[p] = 0;
            }
          }
        }
      }
      function saturationDetect(options, i, o) {
        var id = i.data;
        var od = o.data;
        var w = i.width;
        var h = i.height;
        for (var y = 0; y < h; y++) {
          for (var x = 0; x < w; x++) {
            var p = (y * w + x) * 4;
            var lightness = cie(id[p], id[p + 1], id[p + 2]) / 255;
            var sat = saturation(id[p], id[p + 1], id[p + 2]);
            var acceptableSaturation = sat > options.saturationThreshold;
            var acceptableLightness = lightness >= options.saturationBrightnessMin && lightness <= options.saturationBrightnessMax;
            if (acceptableLightness && acceptableSaturation) {
              od[p + 2] = (sat - options.saturationThreshold) * (255 / (1 - options.saturationThreshold));
            } else {
              od[p + 2] = 0;
            }
          }
        }
      }
      function applyBoosts(options, output) {
        if (!options.boost) return;
        var od = output.data;
        for (var i = 0; i < output.width; i += 4) {
          od[i + 3] = 0;
        }
        for (i = 0; i < options.boost.length; i++) {
          applyBoost(options.boost[i], options, output);
        }
      }
      function applyBoost(boost, options, output) {
        var od = output.data;
        var w = output.width;
        var x0 = ~~boost.x;
        var x1 = ~~(boost.x + boost.width);
        var y0 = ~~boost.y;
        var y1 = ~~(boost.y + boost.height);
        var weight = boost.weight * 255;
        for (var y = y0; y < y1; y++) {
          for (var x = x0; x < x1; x++) {
            var i = (y * w + x) * 4;
            od[i + 3] += weight;
          }
        }
      }
      function generateCrops(options, width, height) {
        var results = [];
        var minDimension = min(width, height);
        var cropWidth = options.cropWidth || minDimension;
        var cropHeight = options.cropHeight || minDimension;
        for (var scale = options.maxScale; scale >= options.minScale; scale -= options.scaleStep) {
          for (var y = 0; y + cropHeight * scale <= height; y += options.step) {
            for (var x = 0; x + cropWidth * scale <= width; x += options.step) {
              results.push({
                x: x,
                y: y,
                width: cropWidth * scale,
                height: cropHeight * scale
              });
            }
          }
        }
        return results;
      }
      function score(options, output, crop) {
        var result = {
          detail: 0,
          saturation: 0,
          skin: 0,
          boost: 0,
          total: 0
        };
        var od = output.data;
        var downSample = options.scoreDownSample;
        var invDownSample = 1 / downSample;
        var outputHeightDownSample = output.height * downSample;
        var outputWidthDownSample = output.width * downSample;
        var outputWidth = output.width;
        for (var y = 0; y < outputHeightDownSample; y += downSample) {
          for (var x = 0; x < outputWidthDownSample; x += downSample) {
            var p = (~~(y * invDownSample) * outputWidth + ~~(x * invDownSample)) * 4;
            var i = importance(options, crop, x, y);
            var detail = od[p + 1] / 255;
            result.skin += od[p] / 255 * (detail + options.skinBias) * i;
            result.detail += detail * i;
            result.saturation += od[p + 2] / 255 * (detail + options.saturationBias) * i;
            result.boost += od[p + 3] / 255 * i;
          }
        }
        result.total = (result.detail * options.detailWeight + result.skin * options.skinWeight + result.saturation * options.saturationWeight + result.boost * options.boostWeight) / (crop.width * crop.height);
        return result;
      }
      function importance(options, crop, x, y) {
        if (crop.x > x || x >= crop.x + crop.width || crop.y > y || y >= crop.y + crop.height) {
          return options.outsideImportance;
        }
        x = (x - crop.x) / crop.width;
        y = (y - crop.y) / crop.height;
        var px = abs(0.5 - x) * 2;
        var py = abs(0.5 - y) * 2;
        var dx = Math.max(px - 1.0 + options.edgeRadius, 0);
        var dy = Math.max(py - 1.0 + options.edgeRadius, 0);
        var d = (dx * dx + dy * dy) * options.edgeWeight;
        var s = 1.41 - sqrt(px * px + py * py);
        if (options.ruleOfThirds) {
          s += Math.max(0, s + d + 0.5) * 1.2 * (thirds(px) + thirds(py));
        }
        return s + d;
      }
      smartcrop.importance = importance;
      function skinColor(options, r, g, b) {
        var mag = sqrt(r * r + g * g + b * b);
        var rd = r / mag - options.skinColor[0];
        var gd = g / mag - options.skinColor[1];
        var bd = b / mag - options.skinColor[2];
        var d = sqrt(rd * rd + gd * gd + bd * bd);
        return 1 - d;
      }
      function analyse(options, input) {
        var result = {};
        var output = new ImgData(input.width, input.height);
        edgeDetect(input, output);
        skinDetect(options, input, output);
        saturationDetect(options, input, output);
        applyBoosts(options, output);
        var scoreOutput = downSample(output, options.scoreDownSample);
        var topScore = -Infinity;
        var topCrop = null;
        var crops = generateCrops(options, input.width, input.height);
        for (var i = 0, iLen = crops.length; i < iLen; i++) {
          var crop = crops[i];
          crop.score = score(options, scoreOutput, crop);
          if (crop.score.total > topScore) {
            topCrop = crop;
            topScore = crop.score.total;
          }
        }
        result.topCrop = topCrop;
        if (options.debug && topCrop) {
          result.crops = crops;
          result.debugOutput = output;
          result.debugOptions = options;
          result.debugTopCrop = extend({}, result.topCrop);
        }
        return result;
      }
      function ImgData(width, height, data) {
        this.width = width;
        this.height = height;
        if (data) {
          this.data = new Uint8ClampedArray(data);
        } else {
          this.data = new Uint8ClampedArray(width * height * 4);
        }
      }
      smartcrop.ImgData = ImgData;
      function downSample(input, factor) {
        var idata = input.data;
        var iwidth = input.width;
        var width = Math.floor(input.width / factor);
        var height = Math.floor(input.height / factor);
        var output = new ImgData(width, height);
        var data = output.data;
        var ifactor2 = 1 / (factor * factor);
        for (var y = 0; y < height; y++) {
          for (var x = 0; x < width; x++) {
            var i = (y * width + x) * 4;
            var r = 0;
            var g = 0;
            var b = 0;
            var a = 0;
            var mr = 0;
            var mg = 0;
            for (var v = 0; v < factor; v++) {
              for (var u = 0; u < factor; u++) {
                var j = ((y * factor + v) * iwidth + (x * factor + u)) * 4;
                r += idata[j];
                g += idata[j + 1];
                b += idata[j + 2];
                a += idata[j + 3];
                mr = Math.max(mr, idata[j]);
                mg = Math.max(mg, idata[j + 1]);
              }
            }
            data[i] = r * ifactor2 * 0.5 + mr * 0.5;
            data[i + 1] = g * ifactor2 * 0.7 + mg * 0.3;
            data[i + 2] = b * ifactor2;
            data[i + 3] = a * ifactor2;
          }
        }
        return output;
      }
      smartcrop._downSample = downSample;
      function defaultCanvasFactory(w, h) {
        var c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
      }
      function canvasImageOperations(canvasFactory) {
        return {
          open: function (image) {
            var w = image.naturalWidth || image.width;
            var h = image.naturalHeight || image.height;
            var c = canvasFactory(w, h);
            var ctx = c.getContext('2d');
            if (image.naturalWidth && (image.naturalWidth != image.width || image.naturalHeight != image.height)) {
              c.width = image.naturalWidth;
              c.height = image.naturalHeight;
            } else {
              c.width = image.width;
              c.height = image.height;
            }
            ctx.drawImage(image, 0, 0);
            return smartcrop.Promise.resolve(c);
          },
          resample: function (image, width, height) {
            return Promise.resolve(image).then(function (image) {
              var c = canvasFactory(~~width, ~~height);
              var ctx = c.getContext('2d');
              ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, c.width, c.height);
              return smartcrop.Promise.resolve(c);
            });
          },
          getData: function (image) {
            return Promise.resolve(image).then(function (c) {
              var ctx = c.getContext('2d');
              var id = ctx.getImageData(0, 0, c.width, c.height);
              return new ImgData(c.width, c.height, id.data);
            });
          }
        };
      }
      smartcrop._canvasImageOperations = canvasImageOperations;
      var min = Math.min;
      var max = Math.max;
      var abs = Math.abs;
      var sqrt = Math.sqrt;
      function extend(o) {
        for (var i = 1, iLen = arguments.length; i < iLen; i++) {
          var arg = arguments[i];
          if (arg) {
            for (var name in arg) {
              o[name] = arg[name];
            }
          }
        }
        return o;
      }
      function thirds(x) {
        x = ((x - 1 / 3 + 1.0) % 2.0 * 0.5 - 0.5) * 16;
        return Math.max(1.0 - x * x, 0.0);
      }
      function cie(r, g, b) {
        return 0.5126 * b + 0.7152 * g + 0.0722 * r;
      }
      function sample(id, p) {
        return cie(id[p], id[p + 1], id[p + 2]);
      }
      function saturation(r, g, b) {
        var maximum = max(r / 255, g / 255, b / 255);
        var minumum = min(r / 255, g / 255, b / 255);
        if (maximum === minumum) {
          return 0;
        }
        var l = (maximum + minumum) / 2;
        var d = maximum - minumum;
        return l > 0.5 ? d / (2 - maximum - minumum) : d / (maximum + minumum);
      }
      exports.smartcrop = smartcrop;
      {
        module.exports = smartcrop;
      }
    })();
  });
  var smartcrop_1 = smartcrop.smartcrop;

  class SmartCroppr extends Croppr {
    constructor(element, options) {
      super(element, options, true);
      let originalInit = null;
      if (this.options.onInitialize) {
        originalInit = this.options.onInitialize;
      }
      const init = () => {
        if (originalInit) originalInit();
        if (options.smartcrop) this.setBestCrop(options, true, options.onSmartCropDone);
      };
      this.options.onInitialize = init;
      element = this.getElement(element);
      if (element.width === 0 || element.height === 0) {
        element.onload = () => {
          this.initialize(element);
        };
      } else {
        this.initialize(element);
      }
    }
    parseSmartOptions(options) {
      let tempMinRatio = options.aspectRatio ? options.aspectRatio : null;
      let tempMaxRatio = options.maxAspectRatio ? options.maxAspectRatio : null;
      let minRatio = tempMinRatio;
      let maxRatio = tempMaxRatio;
      if (tempMaxRatio && tempMaxRatio < tempMinRatio) {
        minRatio = tempMaxRatio;
        maxRatio = tempMinRatio;
      }
      return {
        minRatio: minRatio,
        maxRatio: maxRatio
      };
    }
    getSizeFromRatios(minRatio, maxRatio = null) {
      let {
        width,
        height
      } = this.sourceSize;
      let imageRatio = width / height;
      let cropRatio = imageRatio;
      if (maxRatio) {
        if (imageRatio > maxRatio) cropRatio = maxRatio;else if (imageRatio < minRatio) cropRatio = minRatio;
      } else {
        cropRatio = minRatio;
      }
      let cropWidth = width;
      let cropHeight = width / cropRatio;
      if (cropHeight > height) {
        cropWidth = height * cropRatio;
        cropHeight = height;
      }
      return {
        width: cropWidth,
        height: cropHeight,
        minScale: 1
      };
    }
    setBestCrop(cropData, crop = true, onSmartCropDone = null) {
      cropData = this.parseSmartOptions(cropData);
      let {
        minRatio,
        maxRatio
      } = cropData;
      let size = null;
      if (minRatio) size = this.getSizeFromRatios(minRatio, maxRatio);
      const setSmartCrop = data => {
        if (!data) data = null;
        this.smartCropData = null;
        if (data && crop === true) {
          this.setValue(data, false, "real");
        }
      };
      if (size) {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = this.imageEl.src;
        img.onload = function () {
          smartcrop.crop(img, size).then(result => {
            setSmartCrop(result.topCrop);
            if (onSmartCropDone) onSmartCropDone(result.topCrop);
          });
        };
      } else setSmartCrop(null);
    }
    setImage(src, callback = null, smartcrop$$1 = true) {
      let smartCallback = callback;
      if (smartcrop$$1 === true) {
        smartCallback = () => {
          this.setBestCrop(this.options, true);
          if (callback) callback();
        };
      }
      super.setImage(src, smartCallback);
      return this;
    }
  }

  return SmartCroppr;

}));