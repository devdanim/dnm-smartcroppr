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
      this.attachHandlerEvents();
      this.attachRegionEvents();
      this.attachOverlayEvents();
      this.showModal("init");
      this.initializeBox(null, false);
      this.strictlyConstrain();
      this.redraw();
      this.resetModal("init");
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
        if (this.options.onCropMove !== null) {
          this.options.onCropMove(this.getValue());
        }
        if (this.options.onCropStart !== null) {
          this.options.onCropStart(this.getValue());
        }
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
          this.showModal("onResize");
          this.initializeBox(newOptions);
          this.resetModal("onResize");
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
        this.showModal("setImage");
        this.initializeBox(null, false);
        this.strictlyConstrain();
        this.redraw();
        this.resetModal("setImage");
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
      this.convertOptionsToPixels(opts);
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
      for (var i = 0; i < this.handles.length; i++) {
        if (this.options.maxAspectRatio && (this.handles[i].position[0] == 0.5 || this.handles[i].position[1] == 0.5)) {
          this.handles[i].el.style.display = "none";
        } else {
          this.handles[i].el.style.display = "block";
        }
      }
      return box;
    }
    showModal(operationName = "default") {
      let modalStyle = this.modalStyle;
      if (modalStyle && modalStyle.modalIsDisplayed === true) {
        return modalStyle;
      }
      if (this.options.modal) {
        let {
          modal
        } = this.options;
        let display = modal.currentStyle ? modal.currentStyle.display : getComputedStyle(modal, null).display;
        let visibility = modal.currentStyle ? modal.currentStyle.visibility : getComputedStyle(modal, null).visibility;
        modalStyle = {
          operationName: operationName,
          modalIsDisplayed: true,
          display: display,
          visibility: visibility
        };
        this.modalStyle = modalStyle;
        if (display === "none") {
          modal.style.visibility = "hidden";
          modal.style.display = "block";
        }
      }
      return modalStyle;
    }
    resetModal(oldOperationName = "default") {
      let modalStyle = this.modalStyle;
      if (modalStyle) {
        let {
          visibility,
          display,
          operationName,
          modalIsDisplayed
        } = modalStyle;
        if (modalIsDisplayed && oldOperationName === operationName) {
          let {
            modal
          } = this.options;
          modal.style.visibility = visibility;
          modal.style.display = display;
          this.modalStyle = {
            operationName: null,
            modalIsDisplayed: false
          };
        }
      }
    }
    getSourceSize() {
      this.sourceSize = {};
      this.sourceSize.width = this.imageEl.naturalWidth;
      this.sourceSize.height = this.imageEl.naturalHeight;
      return this.sourceSize;
    }
    convertor(data, inputMode, outputMode) {
      const convertRealDataToPixel = data => {
        this.showModal();
        const {
          width,
          height
        } = this.imageEl.getBoundingClientRect();
        this.resetModal();
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
        this.showModal();
        const {
          width,
          height
        } = this.imageEl.getBoundingClientRect();
        this.resetModal();
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
      this.showModal();
      const actualWidth = this.imageEl.naturalWidth;
      const actualHeight = this.imageEl.naturalHeight;
      const {
        width: elementWidth,
        height: elementHeight
      } = this.imageEl.getBoundingClientRect();
      const factorX = actualWidth / elementWidth;
      const factorY = actualHeight / elementHeight;
      this.resetModal();
      return {
        x: Math.round(this.box.x1 * factorX),
        y: Math.round(this.box.y1 * factorY),
        width: Math.round(this.box.width() * factorX),
        height: Math.round(this.box.height() * factorY)
      };
    }
    getValueAsRatio() {
      this.showModal();
      const {
        width: elementWidth,
        height: elementHeight
      } = this.imageEl.getBoundingClientRect();
      this.resetModal();
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
        responsive: true,
        modal: null
      };
      let preview = null;
      if (opts.preview !== null) preview = this.getElement(opts.preview);
      let modal = null;
      if (opts.modal !== null) modal = this.getElement(opts.modal);
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
        responsive: defaultValue(responsive, defaults.responsive),
        modal: defaultValue(modal, defaults.modal)
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
      this.showModal("moveTo");
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
      this.resetModal("moveTo");
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
      this.showModal("resize");
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
      this.resetModal("resize");
      if (this.options.onCropEnd !== null) {
        this.options.onCropEnd(this.getValue());
      }
      return this;
    }
    setValue(data, constrain = true, mode = "%") {
      this.showModal("setValue");
      if (mode === "%" || mode === "real") {
        data = this.convertor(data, mode, "px");
      }
      this.moveTo(data.x, data.y, false);
      this.resizeTo(data.width, data.height, [0, 0], constrain);
      this.resetModal("setValue");
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
      this.showModal("scaleBy");
      this.box.scale(factor, origin);
      if (constrain === true) this.strictlyConstrain();
      this.redraw();
      this.resetModal("scaleBy");
      if (this.options.onCropEnd !== null) {
        this.options.onCropEnd(this.getValue());
      }
      return this;
    }
    reset() {
      this.showModal("reset");
      this.box = this.initializeBox(this.options);
      this.redraw();
      this.resetModal("reset");
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

  /**
   * tracking - A modern approach for Computer Vision on the web.
   * @author Eduardo Lundgren <edu@rdo.io>
   * @version v1.1.2
   * @link http://trackingjs.com
   * @license BSD
   */
  (function (window, undefined) {
    window.tracking = window.tracking || {};
    /**
     * Inherit the prototype methods from one constructor into another.
     *
     * Usage:
     * <pre>
     * function ParentClass(a, b) { }
     * ParentClass.prototype.foo = function(a) { }
     *
     * function ChildClass(a, b, c) {
     *   tracking.base(this, a, b);
     * }
     * tracking.inherits(ChildClass, ParentClass);
     *
     * var child = new ChildClass('a', 'b', 'c');
     * child.foo();
     * </pre>
     *
     * @param {Function} childCtor Child class.
     * @param {Function} parentCtor Parent class.
     */
    tracking.inherits = function (childCtor, parentCtor) {
      function TempCtor() {}
      TempCtor.prototype = parentCtor.prototype;
      childCtor.superClass_ = parentCtor.prototype;
      childCtor.prototype = new TempCtor();
      childCtor.prototype.constructor = childCtor;
      /**
       * Calls superclass constructor/method.
       *
       * This function is only available if you use tracking.inherits to express
       * inheritance relationships between classes.
       *
       * @param {!object} me Should always be "this".
       * @param {string} methodName The method name to call. Calling superclass
       *     constructor can be done with the special string 'constructor'.
       * @param {...*} var_args The arguments to pass to superclass
       *     method/constructor.
       * @return {*} The return value of the superclass method/constructor.
       */
      childCtor.base = function (me, methodName) {
        var args = Array.prototype.slice.call(arguments, 2);
        return parentCtor.prototype[methodName].apply(me, args);
      };
    };
    /**
     * Captures the user camera when tracking a video element and set its source
     * to the camera stream.
     * @param {HTMLVideoElement} element Canvas element to track.
     * @param {object} opt_options Optional configuration to the tracker.
     */
    tracking.initUserMedia_ = function (element, opt_options) {
      window.navigator.getUserMedia({
        video: true,
        audio: !!(opt_options && opt_options.audio)
      }, function (stream) {
        try {
          element.src = window.URL.createObjectURL(stream);
        } catch (err) {
          element.src = stream;
        }
      }, function () {
        throw Error('Cannot capture user camera.');
      });
    };
    /**
     * Tests whether the object is a dom node.
     * @param {object} o Object to be tested.
     * @return {boolean} True if the object is a dom node.
     */
    tracking.isNode = function (o) {
      return o.nodeType || this.isWindow(o);
    };
    /**
     * Tests whether the object is the `window` object.
     * @param {object} o Object to be tested.
     * @return {boolean} True if the object is the `window` object.
     */
    tracking.isWindow = function (o) {
      return !!(o && o.alert && o.document);
    };
    /**
     * Selects a dom node from a CSS3 selector using `document.querySelector`.
     * @param {string} selector
     * @param {object} opt_element The root element for the query. When not
     *     specified `document` is used as root element.
     * @return {HTMLElement} The first dom element that matches to the selector.
     *     If not found, returns `null`.
     */
    tracking.one = function (selector, opt_element) {
      if (this.isNode(selector)) {
        return selector;
      }
      return (opt_element || document).querySelector(selector);
    };
    /**
     * Tracks a canvas, image or video element based on the specified `tracker`
     * instance. This method extract the pixel information of the input element
     * to pass to the `tracker` instance. When tracking a video, the
     * `tracker.track(pixels, width, height)` will be in a
     * `requestAnimationFrame` loop in order to track all video frames.
     *
     * Example:
     * var tracker = new tracking.ColorTracker();
     *
     * tracking.track('#video', tracker);
     * or
     * tracking.track('#video', tracker, { camera: true });
     *
     * tracker.on('track', function(event) {
     *   // console.log(event.data[0].x, event.data[0].y)
     * });
     *
     * @param {HTMLElement} element The element to track, canvas, image or
     *     video.
     * @param {tracking.Tracker} tracker The tracker instance used to track the
     *     element.
     * @param {object} opt_options Optional configuration to the tracker.
     */
    tracking.track = function (element, tracker, opt_options) {
      element = tracking.one(element);
      if (!element) {
        throw new Error('Element not found, try a different element or selector.');
      }
      if (!tracker) {
        throw new Error('Tracker not specified, try `tracking.track(element, new tracking.FaceTracker())`.');
      }
      switch (element.nodeName.toLowerCase()) {
        case 'canvas':
          return this.trackCanvas_(element, tracker, opt_options);
        case 'img':
          return this.trackImg_(element, tracker, opt_options);
        case 'video':
          if (opt_options) {
            if (opt_options.camera) {
              this.initUserMedia_(element, opt_options);
            }
          }
          return this.trackVideo_(element, tracker, opt_options);
        default:
          throw new Error('Element not supported, try in a canvas, img, or video.');
      }
    };
    /**
     * Tracks a canvas element based on the specified `tracker` instance and
     * returns a `TrackerTask` for this track.
     * @param {HTMLCanvasElement} element Canvas element to track.
     * @param {tracking.Tracker} tracker The tracker instance used to track the
     *     element.
     * @param {object} opt_options Optional configuration to the tracker.
     * @return {tracking.TrackerTask}
     * @private
     */
    tracking.trackCanvas_ = function (element, tracker) {
      var self = this;
      var task = new tracking.TrackerTask(tracker);
      task.on('run', function () {
        self.trackCanvasInternal_(element, tracker);
      });
      return task.run();
    };
    /**
     * Tracks a canvas element based on the specified `tracker` instance. This
     * method extract the pixel information of the input element to pass to the
     * `tracker` instance.
     * @param {HTMLCanvasElement} element Canvas element to track.
     * @param {tracking.Tracker} tracker The tracker instance used to track the
     *     element.
     * @param {object} opt_options Optional configuration to the tracker.
     * @private
     */
    tracking.trackCanvasInternal_ = function (element, tracker) {
      var width = element.width;
      var height = element.height;
      var context = element.getContext('2d');
      var imageData = context.getImageData(0, 0, width, height);
      tracker.track(imageData.data, width, height);
    };
    /**
     * Tracks a image element based on the specified `tracker` instance. This
     * method extract the pixel information of the input element to pass to the
     * `tracker` instance.
     * @param {HTMLImageElement} element Canvas element to track.
     * @param {tracking.Tracker} tracker The tracker instance used to track the
     *     element.
     * @param {object} opt_options Optional configuration to the tracker.
     * @private
     */
    tracking.trackImg_ = function (element, tracker) {
      var width = element.width;
      var height = element.height;
      var canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      var task = new tracking.TrackerTask(tracker);
      task.on('run', function () {
        tracking.Canvas.loadImage(canvas, element.src, 0, 0, width, height, function () {
          tracking.trackCanvasInternal_(canvas, tracker);
        });
      });
      return task.run();
    };
    /**
     * Tracks a video element based on the specified `tracker` instance. This
     * method extract the pixel information of the input element to pass to the
     * `tracker` instance. The `tracker.track(pixels, width, height)` will be in
     * a `requestAnimationFrame` loop in order to track all video frames.
     * @param {HTMLVideoElement} element Canvas element to track.
     * @param {tracking.Tracker} tracker The tracker instance used to track the
     *     element.
     * @param {object} opt_options Optional configuration to the tracker.
     * @private
     */
    tracking.trackVideo_ = function (element, tracker) {
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');
      var width;
      var height;
      var resizeCanvas_ = function () {
        width = element.offsetWidth;
        height = element.offsetHeight;
        canvas.width = width;
        canvas.height = height;
      };
      resizeCanvas_();
      element.addEventListener('resize', resizeCanvas_);
      var requestId;
      var requestAnimationFrame_ = function () {
        requestId = window.requestAnimationFrame(function () {
          if (element.readyState === element.HAVE_ENOUGH_DATA) {
            try {
              context.drawImage(element, 0, 0, width, height);
            } catch (err) {}
            tracking.trackCanvasInternal_(canvas, tracker);
          }
          requestAnimationFrame_();
        });
      };
      var task = new tracking.TrackerTask(tracker);
      task.on('stop', function () {
        window.cancelAnimationFrame(requestId);
      });
      task.on('run', function () {
        requestAnimationFrame_();
      });
      return task.run();
    };
    if (!window.URL) {
      window.URL = window.URL || window.webkitURL || window.msURL || window.oURL;
    }
    if (!navigator.getUserMedia) {
      navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    }
  })(window);
  (function () {
    /**
     * EventEmitter utility.
     * @constructor
     */
    tracking.EventEmitter = function () {};
    /**
     * Holds event listeners scoped by event type.
     * @type {object}
     * @private
     */
    tracking.EventEmitter.prototype.events_ = null;
    /**
     * Adds a listener to the end of the listeners array for the specified event.
     * @param {string} event
     * @param {function} listener
     * @return {object} Returns emitter, so calls can be chained.
     */
    tracking.EventEmitter.prototype.addListener = function (event, listener) {
      if (typeof listener !== 'function') {
        throw new TypeError('Listener must be a function');
      }
      if (!this.events_) {
        this.events_ = {};
      }
      this.emit('newListener', event, listener);
      if (!this.events_[event]) {
        this.events_[event] = [];
      }
      this.events_[event].push(listener);
      return this;
    };
    /**
     * Returns an array of listeners for the specified event.
     * @param {string} event
     * @return {array} Array of listeners.
     */
    tracking.EventEmitter.prototype.listeners = function (event) {
      return this.events_ && this.events_[event];
    };
    /**
     * Execute each of the listeners in order with the supplied arguments.
     * @param {string} event
     * @param {*} opt_args [arg1], [arg2], [...]
     * @return {boolean} Returns true if event had listeners, false otherwise.
     */
    tracking.EventEmitter.prototype.emit = function (event) {
      var listeners = this.listeners(event);
      if (listeners) {
        var args = Array.prototype.slice.call(arguments, 1);
        for (var i = 0; i < listeners.length; i++) {
          if (listeners[i]) {
            listeners[i].apply(this, args);
          }
        }
        return true;
      }
      return false;
    };
    /**
     * Adds a listener to the end of the listeners array for the specified event.
     * @param {string} event
     * @param {function} listener
     * @return {object} Returns emitter, so calls can be chained.
     */
    tracking.EventEmitter.prototype.on = tracking.EventEmitter.prototype.addListener;
    /**
     * Adds a one time listener for the event. This listener is invoked only the
     * next time the event is fired, after which it is removed.
     * @param {string} event
     * @param {function} listener
     * @return {object} Returns emitter, so calls can be chained.
     */
    tracking.EventEmitter.prototype.once = function (event, listener) {
      var self = this;
      self.on(event, function handlerInternal() {
        self.removeListener(event, handlerInternal);
        listener.apply(this, arguments);
      });
    };
    /**
     * Removes all listeners, or those of the specified event. It's not a good
     * idea to remove listeners that were added elsewhere in the code,
     * especially when it's on an emitter that you didn't create.
     * @param {string} event
     * @return {object} Returns emitter, so calls can be chained.
     */
    tracking.EventEmitter.prototype.removeAllListeners = function (opt_event) {
      if (!this.events_) {
        return this;
      }
      if (opt_event) {
        delete this.events_[opt_event];
      } else {
        delete this.events_;
      }
      return this;
    };
    /**
     * Remove a listener from the listener array for the specified event.
     * Caution: changes array indices in the listener array behind the listener.
     * @param {string} event
     * @param {function} listener
     * @return {object} Returns emitter, so calls can be chained.
     */
    tracking.EventEmitter.prototype.removeListener = function (event, listener) {
      if (typeof listener !== 'function') {
        throw new TypeError('Listener must be a function');
      }
      if (!this.events_) {
        return this;
      }
      var listeners = this.listeners(event);
      if (Array.isArray(listeners)) {
        var i = listeners.indexOf(listener);
        if (i < 0) {
          return this;
        }
        listeners.splice(i, 1);
      }
      return this;
    };
    /**
     * By default EventEmitters will print a warning if more than 10 listeners
     * are added for a particular event. This is a useful default which helps
     * finding memory leaks. Obviously not all Emitters should be limited to 10.
     * This function allows that to be increased. Set to zero for unlimited.
     * @param {number} n The maximum number of listeners.
     */
    tracking.EventEmitter.prototype.setMaxListeners = function () {
      throw new Error('Not implemented');
    };
  })();
  (function () {
    /**
     * Canvas utility.
     * @static
     * @constructor
     */
    tracking.Canvas = {};
    /**
     * Loads an image source into the canvas.
     * @param {HTMLCanvasElement} canvas The canvas dom element.
     * @param {string} src The image source.
     * @param {number} x The canvas horizontal coordinate to load the image.
     * @param {number} y The canvas vertical coordinate to load the image.
     * @param {number} width The image width.
     * @param {number} height The image height.
     * @param {function} opt_callback Callback that fires when the image is loaded
     *     into the canvas.
     * @static
     */
    tracking.Canvas.loadImage = function (canvas, src, x, y, width, height, opt_callback) {
      var instance = this;
      var img = new window.Image();
      img.crossOrigin = '*';
      img.onload = function () {
        var context = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        context.drawImage(img, x, y, width, height);
        if (opt_callback) {
          opt_callback.call(instance);
        }
        img = null;
      };
      img.src = src;
    };
  })();
  (function () {
    /**
     * DisjointSet utility with path compression. Some applications involve
     * grouping n distinct objects into a collection of disjoint sets. Two
     * important operations are then finding which set a given object belongs to
     * and uniting the two sets. A disjoint set data structure maintains a
     * collection S={ S1 , S2 ,..., Sk } of disjoint dynamic sets. Each set is
     * identified by a representative, which usually is a member in the set.
     * @static
     * @constructor
     */
    tracking.DisjointSet = function (length) {
      if (length === undefined) {
        throw new Error('DisjointSet length not specified.');
      }
      this.length = length;
      this.parent = new Uint32Array(length);
      for (var i = 0; i < length; i++) {
        this.parent[i] = i;
      }
    };
    /**
     * Holds the length of the internal set.
     * @type {number}
     */
    tracking.DisjointSet.prototype.length = null;
    /**
     * Holds the set containing the representative values.
     * @type {Array.<number>}
     */
    tracking.DisjointSet.prototype.parent = null;
    /**
     * Finds a pointer to the representative of the set containing i.
     * @param {number} i
     * @return {number} The representative set of i.
     */
    tracking.DisjointSet.prototype.find = function (i) {
      if (this.parent[i] === i) {
        return i;
      } else {
        return this.parent[i] = this.find(this.parent[i]);
      }
    };
    /**
     * Unites two dynamic sets containing objects i and j, say Si and Sj, into
     * a new set that Si ∪ Sj, assuming that Si ∩ Sj = ∅;
     * @param {number} i
     * @param {number} j
     */
    tracking.DisjointSet.prototype.union = function (i, j) {
      var iRepresentative = this.find(i);
      var jRepresentative = this.find(j);
      this.parent[iRepresentative] = jRepresentative;
    };
  })();
  (function () {
    /**
     * Image utility.
     * @static
     * @constructor
     */
    tracking.Image = {};
    /**
     * Computes gaussian blur. Adapted from
     * https://github.com/kig/canvasfilters.
     * @param {pixels} pixels The pixels in a linear [r,g,b,a,...] array.
     * @param {number} width The image width.
     * @param {number} height The image height.
     * @param {number} diameter Gaussian blur diameter, must be greater than 1.
     * @return {array} The edge pixels in a linear [r,g,b,a,...] array.
     */
    tracking.Image.blur = function (pixels, width, height, diameter) {
      diameter = Math.abs(diameter);
      if (diameter <= 1) {
        throw new Error('Diameter should be greater than 1.');
      }
      var radius = diameter / 2;
      var len = Math.ceil(diameter) + (1 - Math.ceil(diameter) % 2);
      var weights = new Float32Array(len);
      var rho = (radius + 0.5) / 3;
      var rhoSq = rho * rho;
      var gaussianFactor = 1 / Math.sqrt(2 * Math.PI * rhoSq);
      var rhoFactor = -1 / (2 * rho * rho);
      var wsum = 0;
      var middle = Math.floor(len / 2);
      for (var i = 0; i < len; i++) {
        var x = i - middle;
        var gx = gaussianFactor * Math.exp(x * x * rhoFactor);
        weights[i] = gx;
        wsum += gx;
      }
      for (var j = 0; j < weights.length; j++) {
        weights[j] /= wsum;
      }
      return this.separableConvolve(pixels, width, height, weights, weights, false);
    };
    /**
     * Computes the integral image for summed, squared, rotated and sobel pixels.
     * @param {array} pixels The pixels in a linear [r,g,b,a,...] array to loop
     *     through.
     * @param {number} width The image width.
     * @param {number} height The image height.
     * @param {array} opt_integralImage Empty array of size `width * height` to
     *     be filled with the integral image values. If not specified compute sum
     *     values will be skipped.
     * @param {array} opt_integralImageSquare Empty array of size `width *
     *     height` to be filled with the integral image squared values. If not
     *     specified compute squared values will be skipped.
     * @param {array} opt_tiltedIntegralImage Empty array of size `width *
     *     height` to be filled with the rotated integral image values. If not
     *     specified compute sum values will be skipped.
     * @param {array} opt_integralImageSobel Empty array of size `width *
     *     height` to be filled with the integral image of sobel values. If not
     *     specified compute sobel filtering will be skipped.
     * @static
     */
    tracking.Image.computeIntegralImage = function (pixels, width, height, opt_integralImage, opt_integralImageSquare, opt_tiltedIntegralImage, opt_integralImageSobel) {
      if (arguments.length < 4) {
        throw new Error('You should specify at least one output array in the order: sum, square, tilted, sobel.');
      }
      var pixelsSobel;
      if (opt_integralImageSobel) {
        pixelsSobel = tracking.Image.sobel(pixels, width, height);
      }
      for (var i = 0; i < height; i++) {
        for (var j = 0; j < width; j++) {
          var w = i * width * 4 + j * 4;
          var pixel = ~~(pixels[w] * 0.299 + pixels[w + 1] * 0.587 + pixels[w + 2] * 0.114);
          if (opt_integralImage) {
            this.computePixelValueSAT_(opt_integralImage, width, i, j, pixel);
          }
          if (opt_integralImageSquare) {
            this.computePixelValueSAT_(opt_integralImageSquare, width, i, j, pixel * pixel);
          }
          if (opt_tiltedIntegralImage) {
            var w1 = w - width * 4;
            var pixelAbove = ~~(pixels[w1] * 0.299 + pixels[w1 + 1] * 0.587 + pixels[w1 + 2] * 0.114);
            this.computePixelValueRSAT_(opt_tiltedIntegralImage, width, i, j, pixel, pixelAbove || 0);
          }
          if (opt_integralImageSobel) {
            this.computePixelValueSAT_(opt_integralImageSobel, width, i, j, pixelsSobel[w]);
          }
        }
      }
    };
    /**
     * Helper method to compute the rotated summed area table (RSAT) by the
     * formula:
     *
     * RSAT(x, y) = RSAT(x-1, y-1) + RSAT(x+1, y-1) - RSAT(x, y-2) + I(x, y) + I(x, y-1)
     *
     * @param {number} width The image width.
     * @param {array} RSAT Empty array of size `width * height` to be filled with
     *     the integral image values. If not specified compute sum values will be
     *     skipped.
     * @param {number} i Vertical position of the pixel to be evaluated.
     * @param {number} j Horizontal position of the pixel to be evaluated.
     * @param {number} pixel Pixel value to be added to the integral image.
     * @static
     * @private
     */
    tracking.Image.computePixelValueRSAT_ = function (RSAT, width, i, j, pixel, pixelAbove) {
      var w = i * width + j;
      RSAT[w] = (RSAT[w - width - 1] || 0) + (RSAT[w - width + 1] || 0) - (RSAT[w - width - width] || 0) + pixel + pixelAbove;
    };
    /**
     * Helper method to compute the summed area table (SAT) by the formula:
     *
     * SAT(x, y) = SAT(x, y-1) + SAT(x-1, y) + I(x, y) - SAT(x-1, y-1)
     *
     * @param {number} width The image width.
     * @param {array} SAT Empty array of size `width * height` to be filled with
     *     the integral image values. If not specified compute sum values will be
     *     skipped.
     * @param {number} i Vertical position of the pixel to be evaluated.
     * @param {number} j Horizontal position of the pixel to be evaluated.
     * @param {number} pixel Pixel value to be added to the integral image.
     * @static
     * @private
     */
    tracking.Image.computePixelValueSAT_ = function (SAT, width, i, j, pixel) {
      var w = i * width + j;
      SAT[w] = (SAT[w - width] || 0) + (SAT[w - 1] || 0) + pixel - (SAT[w - width - 1] || 0);
    };
    /**
     * Converts a color from a colorspace based on an RGB color model to a
     * grayscale representation of its luminance. The coefficients represent the
     * measured intensity perception of typical trichromat humans, in
     * particular, human vision is most sensitive to green and least sensitive
     * to blue.
     * @param {pixels} pixels The pixels in a linear [r,g,b,a,...] array.
     * @param {number} width The image width.
     * @param {number} height The image height.
     * @param {boolean} fillRGBA If the result should fill all RGBA values with the gray scale
     *  values, instead of returning a single value per pixel.
     * @param {Uint8ClampedArray} The grayscale pixels in a linear array ([p,p,p,a,...] if fillRGBA
     *  is true and [p1, p2, p3, ...] if fillRGBA is false).
     * @static
     */
    tracking.Image.grayscale = function (pixels, width, height, fillRGBA) {
      var gray = new Uint8ClampedArray(fillRGBA ? pixels.length : pixels.length >> 2);
      var p = 0;
      var w = 0;
      for (var i = 0; i < height; i++) {
        for (var j = 0; j < width; j++) {
          var value = pixels[w] * 0.299 + pixels[w + 1] * 0.587 + pixels[w + 2] * 0.114;
          gray[p++] = value;
          if (fillRGBA) {
            gray[p++] = value;
            gray[p++] = value;
            gray[p++] = pixels[w + 3];
          }
          w += 4;
        }
      }
      return gray;
    };
    /**
     * Fast horizontal separable convolution. A point spread function (PSF) is
     * said to be separable if it can be broken into two one-dimensional
     * signals: a vertical and a horizontal projection. The convolution is
     * performed by sliding the kernel over the image, generally starting at the
     * top left corner, so as to move the kernel through all the positions where
     * the kernel fits entirely within the boundaries of the image. Adapted from
     * https://github.com/kig/canvasfilters.
     * @param {pixels} pixels The pixels in a linear [r,g,b,a,...] array.
     * @param {number} width The image width.
     * @param {number} height The image height.
     * @param {array} weightsVector The weighting vector, e.g [-1,0,1].
     * @param {number} opaque
     * @return {array} The convoluted pixels in a linear [r,g,b,a,...] array.
     */
    tracking.Image.horizontalConvolve = function (pixels, width, height, weightsVector, opaque) {
      var side = weightsVector.length;
      var halfSide = Math.floor(side / 2);
      var output = new Float32Array(width * height * 4);
      var alphaFac = opaque ? 1 : 0;
      for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
          var sy = y;
          var sx = x;
          var offset = (y * width + x) * 4;
          var r = 0;
          var g = 0;
          var b = 0;
          var a = 0;
          for (var cx = 0; cx < side; cx++) {
            var scy = sy;
            var scx = Math.min(width - 1, Math.max(0, sx + cx - halfSide));
            var poffset = (scy * width + scx) * 4;
            var wt = weightsVector[cx];
            r += pixels[poffset] * wt;
            g += pixels[poffset + 1] * wt;
            b += pixels[poffset + 2] * wt;
            a += pixels[poffset + 3] * wt;
          }
          output[offset] = r;
          output[offset + 1] = g;
          output[offset + 2] = b;
          output[offset + 3] = a + alphaFac * (255 - a);
        }
      }
      return output;
    };
    /**
     * Fast vertical separable convolution. A point spread function (PSF) is
     * said to be separable if it can be broken into two one-dimensional
     * signals: a vertical and a horizontal projection. The convolution is
     * performed by sliding the kernel over the image, generally starting at the
     * top left corner, so as to move the kernel through all the positions where
     * the kernel fits entirely within the boundaries of the image. Adapted from
     * https://github.com/kig/canvasfilters.
     * @param {pixels} pixels The pixels in a linear [r,g,b,a,...] array.
     * @param {number} width The image width.
     * @param {number} height The image height.
     * @param {array} weightsVector The weighting vector, e.g [-1,0,1].
     * @param {number} opaque
     * @return {array} The convoluted pixels in a linear [r,g,b,a,...] array.
     */
    tracking.Image.verticalConvolve = function (pixels, width, height, weightsVector, opaque) {
      var side = weightsVector.length;
      var halfSide = Math.floor(side / 2);
      var output = new Float32Array(width * height * 4);
      var alphaFac = opaque ? 1 : 0;
      for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
          var sy = y;
          var sx = x;
          var offset = (y * width + x) * 4;
          var r = 0;
          var g = 0;
          var b = 0;
          var a = 0;
          for (var cy = 0; cy < side; cy++) {
            var scy = Math.min(height - 1, Math.max(0, sy + cy - halfSide));
            var scx = sx;
            var poffset = (scy * width + scx) * 4;
            var wt = weightsVector[cy];
            r += pixels[poffset] * wt;
            g += pixels[poffset + 1] * wt;
            b += pixels[poffset + 2] * wt;
            a += pixels[poffset + 3] * wt;
          }
          output[offset] = r;
          output[offset + 1] = g;
          output[offset + 2] = b;
          output[offset + 3] = a + alphaFac * (255 - a);
        }
      }
      return output;
    };
    /**
     * Fast separable convolution. A point spread function (PSF) is said to be
     * separable if it can be broken into two one-dimensional signals: a
     * vertical and a horizontal projection. The convolution is performed by
     * sliding the kernel over the image, generally starting at the top left
     * corner, so as to move the kernel through all the positions where the
     * kernel fits entirely within the boundaries of the image. Adapted from
     * https://github.com/kig/canvasfilters.
     * @param {pixels} pixels The pixels in a linear [r,g,b,a,...] array.
     * @param {number} width The image width.
     * @param {number} height The image height.
     * @param {array} horizWeights The horizontal weighting vector, e.g [-1,0,1].
     * @param {array} vertWeights The vertical vector, e.g [-1,0,1].
     * @param {number} opaque
     * @return {array} The convoluted pixels in a linear [r,g,b,a,...] array.
     */
    tracking.Image.separableConvolve = function (pixels, width, height, horizWeights, vertWeights, opaque) {
      var vertical = this.verticalConvolve(pixels, width, height, vertWeights, opaque);
      return this.horizontalConvolve(vertical, width, height, horizWeights, opaque);
    };
    /**
     * Compute image edges using Sobel operator. Computes the vertical and
     * horizontal gradients of the image and combines the computed images to
     * find edges in the image. The way we implement the Sobel filter here is by
     * first grayscaling the image, then taking the horizontal and vertical
     * gradients and finally combining the gradient images to make up the final
     * image. Adapted from https://github.com/kig/canvasfilters.
     * @param {pixels} pixels The pixels in a linear [r,g,b,a,...] array.
     * @param {number} width The image width.
     * @param {number} height The image height.
     * @return {array} The edge pixels in a linear [r,g,b,a,...] array.
     */
    tracking.Image.sobel = function (pixels, width, height) {
      pixels = this.grayscale(pixels, width, height, true);
      var output = new Float32Array(width * height * 4);
      var sobelSignVector = new Float32Array([-1, 0, 1]);
      var sobelScaleVector = new Float32Array([1, 2, 1]);
      var vertical = this.separableConvolve(pixels, width, height, sobelSignVector, sobelScaleVector);
      var horizontal = this.separableConvolve(pixels, width, height, sobelScaleVector, sobelSignVector);
      for (var i = 0; i < output.length; i += 4) {
        var v = vertical[i];
        var h = horizontal[i];
        var p = Math.sqrt(h * h + v * v);
        output[i] = p;
        output[i + 1] = p;
        output[i + 2] = p;
        output[i + 3] = 255;
      }
      return output;
    };
  })();
  (function () {
    /**
     * ViolaJones utility.
     * @static
     * @constructor
     */
    tracking.ViolaJones = {};
    /**
     * Holds the minimum area of intersection that defines when a rectangle is
     * from the same group. Often when a face is matched multiple rectangles are
     * classified as possible rectangles to represent the face, when they
     * intersects they are grouped as one face.
     * @type {number}
     * @default 0.5
     * @static
     */
    tracking.ViolaJones.REGIONS_OVERLAP = 0.5;
    /**
     * Holds the HAAR cascade classifiers converted from OpenCV training.
     * @type {array}
     * @static
     */
    tracking.ViolaJones.classifiers = {};
    /**
     * Detects through the HAAR cascade data rectangles matches.
     * @param {pixels} pixels The pixels in a linear [r,g,b,a,...] array.
     * @param {number} width The image width.
     * @param {number} height The image height.
     * @param {number} initialScale The initial scale to start the block
     *     scaling.
     * @param {number} scaleFactor The scale factor to scale the feature block.
     * @param {number} stepSize The block step size.
     * @param {number} edgesDensity Percentage density edges inside the
     *     classifier block. Value from [0.0, 1.0], defaults to 0.2. If specified
     *     edge detection will be applied to the image to prune dead areas of the
     *     image, this can improve significantly performance.
     * @param {number} data The HAAR cascade data.
     * @return {array} Found rectangles.
     * @static
     */
    tracking.ViolaJones.detect = function (pixels, width, height, initialScale, scaleFactor, stepSize, edgesDensity, data) {
      var total = 0;
      var rects = [];
      var integralImage = new Int32Array(width * height);
      var integralImageSquare = new Int32Array(width * height);
      var tiltedIntegralImage = new Int32Array(width * height);
      var integralImageSobel;
      if (edgesDensity > 0) {
        integralImageSobel = new Int32Array(width * height);
      }
      tracking.Image.computeIntegralImage(pixels, width, height, integralImage, integralImageSquare, tiltedIntegralImage, integralImageSobel);
      var minWidth = data[0];
      var minHeight = data[1];
      var scale = initialScale * scaleFactor;
      var blockWidth = scale * minWidth | 0;
      var blockHeight = scale * minHeight | 0;
      while (blockWidth < width && blockHeight < height) {
        var step = scale * stepSize + 0.5 | 0;
        for (var i = 0; i < height - blockHeight; i += step) {
          for (var j = 0; j < width - blockWidth; j += step) {
            if (edgesDensity > 0) {
              if (this.isTriviallyExcluded(edgesDensity, integralImageSobel, i, j, width, blockWidth, blockHeight)) {
                continue;
              }
            }
            if (this.evalStages_(data, integralImage, integralImageSquare, tiltedIntegralImage, i, j, width, blockWidth, blockHeight, scale)) {
              rects[total++] = {
                width: blockWidth,
                height: blockHeight,
                x: j,
                y: i
              };
            }
          }
        }
        scale *= scaleFactor;
        blockWidth = scale * minWidth | 0;
        blockHeight = scale * minHeight | 0;
      }
      return this.mergeRectangles_(rects);
    };
    /**
     * Fast check to test whether the edges density inside the block is greater
     * than a threshold, if true it tests the stages. This can improve
     * significantly performance.
     * @param {number} edgesDensity Percentage density edges inside the
     *     classifier block.
     * @param {array} integralImageSobel The integral image of a sobel image.
     * @param {number} i Vertical position of the pixel to be evaluated.
     * @param {number} j Horizontal position of the pixel to be evaluated.
     * @param {number} width The image width.
     * @return {boolean} True whether the block at position i,j can be skipped,
     *     false otherwise.
     * @static
     * @protected
     */
    tracking.ViolaJones.isTriviallyExcluded = function (edgesDensity, integralImageSobel, i, j, width, blockWidth, blockHeight) {
      var wbA = i * width + j;
      var wbB = wbA + blockWidth;
      var wbD = wbA + blockHeight * width;
      var wbC = wbD + blockWidth;
      var blockEdgesDensity = (integralImageSobel[wbA] - integralImageSobel[wbB] - integralImageSobel[wbD] + integralImageSobel[wbC]) / (blockWidth * blockHeight * 255);
      if (blockEdgesDensity < edgesDensity) {
        return true;
      }
      return false;
    };
    /**
     * Evaluates if the block size on i,j position is a valid HAAR cascade
     * stage.
     * @param {number} data The HAAR cascade data.
     * @param {number} i Vertical position of the pixel to be evaluated.
     * @param {number} j Horizontal position of the pixel to be evaluated.
     * @param {number} width The image width.
     * @param {number} blockSize The block size.
     * @param {number} scale The scale factor of the block size and its original
     *     size.
     * @param {number} inverseArea The inverse area of the block size.
     * @return {boolean} Whether the region passes all the stage tests.
     * @private
     * @static
     */
    tracking.ViolaJones.evalStages_ = function (data, integralImage, integralImageSquare, tiltedIntegralImage, i, j, width, blockWidth, blockHeight, scale) {
      var inverseArea = 1.0 / (blockWidth * blockHeight);
      var wbA = i * width + j;
      var wbB = wbA + blockWidth;
      var wbD = wbA + blockHeight * width;
      var wbC = wbD + blockWidth;
      var mean = (integralImage[wbA] - integralImage[wbB] - integralImage[wbD] + integralImage[wbC]) * inverseArea;
      var variance = (integralImageSquare[wbA] - integralImageSquare[wbB] - integralImageSquare[wbD] + integralImageSquare[wbC]) * inverseArea - mean * mean;
      var standardDeviation = 1;
      if (variance > 0) {
        standardDeviation = Math.sqrt(variance);
      }
      var length = data.length;
      for (var w = 2; w < length;) {
        var stageSum = 0;
        var stageThreshold = data[w++];
        var nodeLength = data[w++];
        while (nodeLength--) {
          var rectsSum = 0;
          var tilted = data[w++];
          var rectsLength = data[w++];
          for (var r = 0; r < rectsLength; r++) {
            var rectLeft = j + data[w++] * scale + 0.5 | 0;
            var rectTop = i + data[w++] * scale + 0.5 | 0;
            var rectWidth = data[w++] * scale + 0.5 | 0;
            var rectHeight = data[w++] * scale + 0.5 | 0;
            var rectWeight = data[w++];
            var w1;
            var w2;
            var w3;
            var w4;
            if (tilted) {
              w1 = rectLeft - rectHeight + rectWidth + (rectTop + rectWidth + rectHeight - 1) * width;
              w2 = rectLeft + (rectTop - 1) * width;
              w3 = rectLeft - rectHeight + (rectTop + rectHeight - 1) * width;
              w4 = rectLeft + rectWidth + (rectTop + rectWidth - 1) * width;
              rectsSum += (tiltedIntegralImage[w1] + tiltedIntegralImage[w2] - tiltedIntegralImage[w3] - tiltedIntegralImage[w4]) * rectWeight;
            } else {
              w1 = rectTop * width + rectLeft;
              w2 = w1 + rectWidth;
              w3 = w1 + rectHeight * width;
              w4 = w3 + rectWidth;
              rectsSum += (integralImage[w1] - integralImage[w2] - integralImage[w3] + integralImage[w4]) * rectWeight;
            }
          }
          var nodeThreshold = data[w++];
          var nodeLeft = data[w++];
          var nodeRight = data[w++];
          if (rectsSum * inverseArea < nodeThreshold * standardDeviation) {
            stageSum += nodeLeft;
          } else {
            stageSum += nodeRight;
          }
        }
        if (stageSum < stageThreshold) {
          return false;
        }
      }
      return true;
    };
    /**
     * Postprocess the detected sub-windows in order to combine overlapping
     * detections into a single detection.
     * @param {array} rects
     * @return {array}
     * @private
     * @static
     */
    tracking.ViolaJones.mergeRectangles_ = function (rects) {
      var disjointSet = new tracking.DisjointSet(rects.length);
      for (var i = 0; i < rects.length; i++) {
        var r1 = rects[i];
        for (var j = 0; j < rects.length; j++) {
          var r2 = rects[j];
          if (tracking.Math.intersectRect(r1.x, r1.y, r1.x + r1.width, r1.y + r1.height, r2.x, r2.y, r2.x + r2.width, r2.y + r2.height)) {
            var x1 = Math.max(r1.x, r2.x);
            var y1 = Math.max(r1.y, r2.y);
            var x2 = Math.min(r1.x + r1.width, r2.x + r2.width);
            var y2 = Math.min(r1.y + r1.height, r2.y + r2.height);
            var overlap = (x1 - x2) * (y1 - y2);
            var area1 = r1.width * r1.height;
            var area2 = r2.width * r2.height;
            if (overlap / (area1 * (area1 / area2)) >= this.REGIONS_OVERLAP && overlap / (area2 * (area1 / area2)) >= this.REGIONS_OVERLAP) {
              disjointSet.union(i, j);
            }
          }
        }
      }
      var map = {};
      for (var k = 0; k < disjointSet.length; k++) {
        var rep = disjointSet.find(k);
        if (!map[rep]) {
          map[rep] = {
            total: 1,
            width: rects[k].width,
            height: rects[k].height,
            x: rects[k].x,
            y: rects[k].y
          };
          continue;
        }
        map[rep].total++;
        map[rep].width += rects[k].width;
        map[rep].height += rects[k].height;
        map[rep].x += rects[k].x;
        map[rep].y += rects[k].y;
      }
      var result = [];
      Object.keys(map).forEach(function (key) {
        var rect = map[key];
        result.push({
          total: rect.total,
          width: rect.width / rect.total + 0.5 | 0,
          height: rect.height / rect.total + 0.5 | 0,
          x: rect.x / rect.total + 0.5 | 0,
          y: rect.y / rect.total + 0.5 | 0
        });
      });
      return result;
    };
  })();
  (function () {
    /**
     * Brief intends for "Binary Robust Independent Elementary Features".This
     * method generates a binary string for each keypoint found by an extractor
     * method.
     * @static
     * @constructor
     */
    tracking.Brief = {};
    /**
     * The set of binary tests is defined by the nd (x,y)-location pairs
     * uniquely chosen during the initialization. Values could vary between N =
     * 128,256,512. N=128 yield good compromises between speed, storage
     * efficiency, and recognition rate.
     * @type {number}
     */
    tracking.Brief.N = 512;
    /**
     * Caches coordinates values of (x,y)-location pairs uniquely chosen during
     * the initialization.
     * @type {Object.<number, Int32Array>}
     * @private
     * @static
     */
    tracking.Brief.randomImageOffsets_ = {};
    /**
     * Caches delta values of (x,y)-location pairs uniquely chosen during
     * the initialization.
     * @type {Int32Array}
     * @private
     * @static
     */
    tracking.Brief.randomWindowOffsets_ = null;
    /**
     * Generates a binary string for each found keypoints extracted using an
     * extractor method.
     * @param {array} The grayscale pixels in a linear [p1,p2,...] array.
     * @param {number} width The image width.
     * @param {array} keypoints
     * @return {Int32Array} Returns an array where for each four sequence int
     *     values represent the descriptor binary string (128 bits) necessary
     *     to describe the corner, e.g. [0,0,0,0, 0,0,0,0, ...].
     * @static
     */
    tracking.Brief.getDescriptors = function (pixels, width, keypoints) {
      var descriptors = new Int32Array((keypoints.length >> 1) * (this.N >> 5));
      var descriptorWord = 0;
      var offsets = this.getRandomOffsets_(width);
      var position = 0;
      for (var i = 0; i < keypoints.length; i += 2) {
        var w = width * keypoints[i + 1] + keypoints[i];
        var offsetsPosition = 0;
        for (var j = 0, n = this.N; j < n; j++) {
          if (pixels[offsets[offsetsPosition++] + w] < pixels[offsets[offsetsPosition++] + w]) {
            descriptorWord |= 1 << (j & 31);
          }
          if (!(j + 1 & 31)) {
            descriptors[position++] = descriptorWord;
            descriptorWord = 0;
          }
        }
      }
      return descriptors;
    };
    /**
     * Matches sets of features {mi} and {m′j} extracted from two images taken
     * from similar, and often successive, viewpoints. A classical procedure
     * runs as follows. For each point {mi} in the first image, search in a
     * region of the second image around location {mi} for point {m′j}. The
     * search is based on the similarity of the local image windows, also known
     * as kernel windows, centered on the points, which strongly characterizes
     * the points when the images are sufficiently close. Once each keypoint is
     * described with its binary string, they need to be compared with the
     * closest matching point. Distance metric is critical to the performance of
     * in- trusion detection systems. Thus using binary strings reduces the size
     * of the descriptor and provides an interesting data structure that is fast
     * to operate whose similarity can be measured by the Hamming distance.
     * @param {array} keypoints1
     * @param {array} descriptors1
     * @param {array} keypoints2
     * @param {array} descriptors2
     * @return {Int32Array} Returns an array where the index is the corner1
     *     index coordinate, and the value is the corresponding match index of
     *     corner2, e.g. keypoints1=[x0,y0,x1,y1,...] and
     *     keypoints2=[x'0,y'0,x'1,y'1,...], if x0 matches x'1 and x1 matches x'0,
     *     the return array would be [3,0].
     * @static
     */
    tracking.Brief.match = function (keypoints1, descriptors1, keypoints2, descriptors2) {
      var len1 = keypoints1.length >> 1;
      var len2 = keypoints2.length >> 1;
      var matches = new Array(len1);
      for (var i = 0; i < len1; i++) {
        var min = Infinity;
        var minj = 0;
        for (var j = 0; j < len2; j++) {
          var dist = 0;
          for (var k = 0, n = this.N >> 5; k < n; k++) {
            dist += tracking.Math.hammingWeight(descriptors1[i * n + k] ^ descriptors2[j * n + k]);
          }
          if (dist < min) {
            min = dist;
            minj = j;
          }
        }
        matches[i] = {
          index1: i,
          index2: minj,
          keypoint1: [keypoints1[2 * i], keypoints1[2 * i + 1]],
          keypoint2: [keypoints2[2 * minj], keypoints2[2 * minj + 1]],
          confidence: 1 - min / this.N
        };
      }
      return matches;
    };
    /**
     * Removes matches outliers by testing matches on both directions.
     * @param {array} keypoints1
     * @param {array} descriptors1
     * @param {array} keypoints2
     * @param {array} descriptors2
     * @return {Int32Array} Returns an array where the index is the corner1
     *     index coordinate, and the value is the corresponding match index of
     *     corner2, e.g. keypoints1=[x0,y0,x1,y1,...] and
     *     keypoints2=[x'0,y'0,x'1,y'1,...], if x0 matches x'1 and x1 matches x'0,
     *     the return array would be [3,0].
     * @static
     */
    tracking.Brief.reciprocalMatch = function (keypoints1, descriptors1, keypoints2, descriptors2) {
      var matches = [];
      if (keypoints1.length === 0 || keypoints2.length === 0) {
        return matches;
      }
      var matches1 = tracking.Brief.match(keypoints1, descriptors1, keypoints2, descriptors2);
      var matches2 = tracking.Brief.match(keypoints2, descriptors2, keypoints1, descriptors1);
      for (var i = 0; i < matches1.length; i++) {
        if (matches2[matches1[i].index2].index2 === i) {
          matches.push(matches1[i]);
        }
      }
      return matches;
    };
    /**
     * Gets the coordinates values of (x,y)-location pairs uniquely chosen
     * during the initialization.
     * @return {array} Array with the random offset values.
     * @private
     */
    tracking.Brief.getRandomOffsets_ = function (width) {
      if (!this.randomWindowOffsets_) {
        var windowPosition = 0;
        var windowOffsets = new Int32Array(4 * this.N);
        for (var i = 0; i < this.N; i++) {
          windowOffsets[windowPosition++] = Math.round(tracking.Math.uniformRandom(-15, 16));
          windowOffsets[windowPosition++] = Math.round(tracking.Math.uniformRandom(-15, 16));
          windowOffsets[windowPosition++] = Math.round(tracking.Math.uniformRandom(-15, 16));
          windowOffsets[windowPosition++] = Math.round(tracking.Math.uniformRandom(-15, 16));
        }
        this.randomWindowOffsets_ = windowOffsets;
      }
      if (!this.randomImageOffsets_[width]) {
        var imagePosition = 0;
        var imageOffsets = new Int32Array(2 * this.N);
        for (var j = 0; j < this.N; j++) {
          imageOffsets[imagePosition++] = this.randomWindowOffsets_[4 * j] * width + this.randomWindowOffsets_[4 * j + 1];
          imageOffsets[imagePosition++] = this.randomWindowOffsets_[4 * j + 2] * width + this.randomWindowOffsets_[4 * j + 3];
        }
        this.randomImageOffsets_[width] = imageOffsets;
      }
      return this.randomImageOffsets_[width];
    };
  })();
  (function () {
    /**
     * FAST intends for "Features from Accelerated Segment Test". This method
     * performs a point segment test corner detection. The segment test
     * criterion operates by considering a circle of sixteen pixels around the
     * corner candidate p. The detector classifies p as a corner if there exists
     * a set of n contiguous pixelsin the circle which are all brighter than the
     * intensity of the candidate pixel Ip plus a threshold t, or all darker
     * than Ip − t.
     *
     *       15 00 01
     *    14          02
     * 13                03
     * 12       []       04
     * 11                05
     *    10          06
     *       09 08 07
     *
     * For more reference:
     * http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.60.3991&rep=rep1&type=pdf
     * @static
     * @constructor
     */
    tracking.Fast = {};
    /**
     * Holds the threshold to determine whether the tested pixel is brighter or
     * darker than the corner candidate p.
     * @type {number}
     * @default 40
     * @static
     */
    tracking.Fast.THRESHOLD = 40;
    /**
     * Caches coordinates values of the circle surrounding the pixel candidate p.
     * @type {Object.<number, Int32Array>}
     * @private
     * @static
     */
    tracking.Fast.circles_ = {};
    /**
     * Finds corners coordinates on the graysacaled image.
     * @param {array} The grayscale pixels in a linear [p1,p2,...] array.
     * @param {number} width The image width.
     * @param {number} height The image height.
     * @param {number} threshold to determine whether the tested pixel is brighter or
     *     darker than the corner candidate p. Default value is 40.
     * @return {array} Array containing the coordinates of all found corners,
     *     e.g. [x0,y0,x1,y1,...], where P(x0,y0) represents a corner coordinate.
     * @static
     */
    tracking.Fast.findCorners = function (pixels, width, height, opt_threshold) {
      var circleOffsets = this.getCircleOffsets_(width);
      var circlePixels = new Int32Array(16);
      var corners = [];
      if (opt_threshold === undefined) {
        opt_threshold = this.THRESHOLD;
      }
      for (var i = 3; i < height - 3; i++) {
        for (var j = 3; j < width - 3; j++) {
          var w = i * width + j;
          var p = pixels[w];
          for (var k = 0; k < 16; k++) {
            circlePixels[k] = pixels[w + circleOffsets[k]];
          }
          if (this.isCorner(p, circlePixels, opt_threshold)) {
            corners.push(j, i);
            j += 3;
          }
        }
      }
      return corners;
    };
    /**
     * Checks if the circle pixel is brighter than the candidate pixel p by
     * a threshold.
     * @param {number} circlePixel The circle pixel value.
     * @param {number} p The value of the candidate pixel p.
     * @param {number} threshold
     * @return {Boolean}
     * @static
     */
    tracking.Fast.isBrighter = function (circlePixel, p, threshold) {
      return circlePixel - p > threshold;
    };
    /**
     * Checks if the circle pixel is within the corner of the candidate pixel p
     * by a threshold.
     * @param {number} p The value of the candidate pixel p.
     * @param {number} circlePixel The circle pixel value.
     * @param {number} threshold
     * @return {Boolean}
     * @static
     */
    tracking.Fast.isCorner = function (p, circlePixels, threshold) {
      if (this.isTriviallyExcluded(circlePixels, p, threshold)) {
        return false;
      }
      for (var x = 0; x < 16; x++) {
        var darker = true;
        var brighter = true;
        for (var y = 0; y < 9; y++) {
          var circlePixel = circlePixels[x + y & 15];
          if (!this.isBrighter(p, circlePixel, threshold)) {
            brighter = false;
            if (darker === false) {
              break;
            }
          }
          if (!this.isDarker(p, circlePixel, threshold)) {
            darker = false;
            if (brighter === false) {
              break;
            }
          }
        }
        if (brighter || darker) {
          return true;
        }
      }
      return false;
    };
    /**
     * Checks if the circle pixel is darker than the candidate pixel p by
     * a threshold.
     * @param {number} circlePixel The circle pixel value.
     * @param {number} p The value of the candidate pixel p.
     * @param {number} threshold
     * @return {Boolean}
     * @static
     */
    tracking.Fast.isDarker = function (circlePixel, p, threshold) {
      return p - circlePixel > threshold;
    };
    /**
     * Fast check to test if the candidate pixel is a trivially excluded value.
     * In order to be a corner, the candidate pixel value should be darker or
     * brighter than 9-12 surrounding pixels, when at least three of the top,
     * bottom, left and right pixels are brighter or darker it can be
     * automatically excluded improving the performance.
     * @param {number} circlePixel The circle pixel value.
     * @param {number} p The value of the candidate pixel p.
     * @param {number} threshold
     * @return {Boolean}
     * @static
     * @protected
     */
    tracking.Fast.isTriviallyExcluded = function (circlePixels, p, threshold) {
      var count = 0;
      var circleBottom = circlePixels[8];
      var circleLeft = circlePixels[12];
      var circleRight = circlePixels[4];
      var circleTop = circlePixels[0];
      if (this.isBrighter(circleTop, p, threshold)) {
        count++;
      }
      if (this.isBrighter(circleRight, p, threshold)) {
        count++;
      }
      if (this.isBrighter(circleBottom, p, threshold)) {
        count++;
      }
      if (this.isBrighter(circleLeft, p, threshold)) {
        count++;
      }
      if (count < 3) {
        count = 0;
        if (this.isDarker(circleTop, p, threshold)) {
          count++;
        }
        if (this.isDarker(circleRight, p, threshold)) {
          count++;
        }
        if (this.isDarker(circleBottom, p, threshold)) {
          count++;
        }
        if (this.isDarker(circleLeft, p, threshold)) {
          count++;
        }
        if (count < 3) {
          return true;
        }
      }
      return false;
    };
    /**
     * Gets the sixteen offset values of the circle surrounding pixel.
     * @param {number} width The image width.
     * @return {array} Array with the sixteen offset values of the circle
     *     surrounding pixel.
     * @private
     */
    tracking.Fast.getCircleOffsets_ = function (width) {
      if (this.circles_[width]) {
        return this.circles_[width];
      }
      var circle = new Int32Array(16);
      circle[0] = -width - width - width;
      circle[1] = circle[0] + 1;
      circle[2] = circle[1] + width + 1;
      circle[3] = circle[2] + width + 1;
      circle[4] = circle[3] + width;
      circle[5] = circle[4] + width;
      circle[6] = circle[5] + width - 1;
      circle[7] = circle[6] + width - 1;
      circle[8] = circle[7] - 1;
      circle[9] = circle[8] - 1;
      circle[10] = circle[9] - width - 1;
      circle[11] = circle[10] - width - 1;
      circle[12] = circle[11] - width;
      circle[13] = circle[12] - width;
      circle[14] = circle[13] - width + 1;
      circle[15] = circle[14] - width + 1;
      this.circles_[width] = circle;
      return circle;
    };
  })();
  (function () {
    /**
     * Math utility.
     * @static
     * @constructor
     */
    tracking.Math = {};
    /**
     * Euclidean distance between two points P(x0, y0) and P(x1, y1).
     * @param {number} x0 Horizontal coordinate of P0.
     * @param {number} y0 Vertical coordinate of P0.
     * @param {number} x1 Horizontal coordinate of P1.
     * @param {number} y1 Vertical coordinate of P1.
     * @return {number} The euclidean distance.
     */
    tracking.Math.distance = function (x0, y0, x1, y1) {
      var dx = x1 - x0;
      var dy = y1 - y0;
      return Math.sqrt(dx * dx + dy * dy);
    };
    /**
     * Calculates the Hamming weight of a string, which is the number of symbols that are
     * different from the zero-symbol of the alphabet used. It is thus
     * equivalent to the Hamming distance from the all-zero string of the same
     * length. For the most typical case, a string of bits, this is the number
     * of 1's in the string.
     *
     * Example:
     *
     * <pre>
     *  Binary string     Hamming weight
     *   11101                 4
     *   11101010              5
     * </pre>
     *
     * @param {number} i Number that holds the binary string to extract the hamming weight.
     * @return {number} The hamming weight.
     */
    tracking.Math.hammingWeight = function (i) {
      i = i - (i >> 1 & 0x55555555);
      i = (i & 0x33333333) + (i >> 2 & 0x33333333);
      return (i + (i >> 4) & 0xF0F0F0F) * 0x1010101 >> 24;
    };
    /**
     * Generates a random number between [a, b] interval.
     * @param {number} a
     * @param {number} b
     * @return {number}
     */
    tracking.Math.uniformRandom = function (a, b) {
      return a + Math.random() * (b - a);
    };
    /**
     * Tests if a rectangle intersects with another.
     *
     *  <pre>
     *  x0y0 --------       x2y2 --------
     *      |       |           |       |
     *      -------- x1y1       -------- x3y3
     * </pre>
     *
     * @param {number} x0 Horizontal coordinate of P0.
     * @param {number} y0 Vertical coordinate of P0.
     * @param {number} x1 Horizontal coordinate of P1.
     * @param {number} y1 Vertical coordinate of P1.
     * @param {number} x2 Horizontal coordinate of P2.
     * @param {number} y2 Vertical coordinate of P2.
     * @param {number} x3 Horizontal coordinate of P3.
     * @param {number} y3 Vertical coordinate of P3.
     * @return {boolean}
     */
    tracking.Math.intersectRect = function (x0, y0, x1, y1, x2, y2, x3, y3) {
      return !(x2 > x1 || x3 < x0 || y2 > y1 || y3 < y0);
    };
  })();
  (function () {
    /**
     * Matrix utility.
     * @static
     * @constructor
     */
    tracking.Matrix = {};
    /**
     * Loops the array organized as major-row order and executes `fn` callback
     * for each iteration. The `fn` callback receives the following parameters:
     * `(r,g,b,a,index,i,j)`, where `r,g,b,a` represents the pixel color with
     * alpha channel, `index` represents the position in the major-row order
     * array and `i,j` the respective indexes positions in two dimensions.
     * @param {array} pixels The pixels in a linear [r,g,b,a,...] array to loop
     *     through.
     * @param {number} width The image width.
     * @param {number} height The image height.
     * @param {function} fn The callback function for each pixel.
     * @param {number} opt_jump Optional jump for the iteration, by default it
     *     is 1, hence loops all the pixels of the array.
     * @static
     */
    tracking.Matrix.forEach = function (pixels, width, height, fn, opt_jump) {
      opt_jump = opt_jump || 1;
      for (var i = 0; i < height; i += opt_jump) {
        for (var j = 0; j < width; j += opt_jump) {
          var w = i * width * 4 + j * 4;
          fn.call(this, pixels[w], pixels[w + 1], pixels[w + 2], pixels[w + 3], w, i, j);
        }
      }
    };
  })();
  (function () {
    /**
     * EPnp utility.
     * @static
     * @constructor
     */
    tracking.EPnP = {};
    tracking.EPnP.solve = function (objectPoints, imagePoints, cameraMatrix) {};
  })();
  (function () {
    /**
     * Tracker utility.
     * @constructor
     * @extends {tracking.EventEmitter}
     */
    tracking.Tracker = function () {
      tracking.Tracker.base(this, 'constructor');
    };
    tracking.inherits(tracking.Tracker, tracking.EventEmitter);
    /**
     * Tracks the pixels on the array. This method is called for each video
     * frame in order to emit `track` event.
     * @param {Uint8ClampedArray} pixels The pixels data to track.
     * @param {number} width The pixels canvas width.
     * @param {number} height The pixels canvas height.
     */
    tracking.Tracker.prototype.track = function () {};
  })();
  (function () {
    /**
     * TrackerTask utility.
     * @constructor
     * @extends {tracking.EventEmitter}
     */
    tracking.TrackerTask = function (tracker) {
      tracking.TrackerTask.base(this, 'constructor');
      if (!tracker) {
        throw new Error('Tracker instance not specified.');
      }
      this.setTracker(tracker);
    };
    tracking.inherits(tracking.TrackerTask, tracking.EventEmitter);
    /**
     * Holds the tracker instance managed by this task.
     * @type {tracking.Tracker}
     * @private
     */
    tracking.TrackerTask.prototype.tracker_ = null;
    /**
     * Holds if the tracker task is in running.
     * @type {boolean}
     * @private
     */
    tracking.TrackerTask.prototype.running_ = false;
    /**
     * Gets the tracker instance managed by this task.
     * @return {tracking.Tracker}
     */
    tracking.TrackerTask.prototype.getTracker = function () {
      return this.tracker_;
    };
    /**
     * Returns true if the tracker task is in running, false otherwise.
     * @return {boolean}
     * @private
     */
    tracking.TrackerTask.prototype.inRunning = function () {
      return this.running_;
    };
    /**
     * Sets if the tracker task is in running.
     * @param {boolean} running
     * @private
     */
    tracking.TrackerTask.prototype.setRunning = function (running) {
      this.running_ = running;
    };
    /**
     * Sets the tracker instance managed by this task.
     * @return {tracking.Tracker}
     */
    tracking.TrackerTask.prototype.setTracker = function (tracker) {
      this.tracker_ = tracker;
    };
    /**
     * Emits a `run` event on the tracker task for the implementers to run any
     * child action, e.g. `requestAnimationFrame`.
     * @return {object} Returns itself, so calls can be chained.
     */
    tracking.TrackerTask.prototype.run = function () {
      var self = this;
      if (this.inRunning()) {
        return;
      }
      this.setRunning(true);
      this.reemitTrackEvent_ = function (event) {
        self.emit('track', event);
      };
      this.tracker_.on('track', this.reemitTrackEvent_);
      this.emit('run');
      return this;
    };
    /**
     * Emits a `stop` event on the tracker task for the implementers to stop any
     * child action being done, e.g. `requestAnimationFrame`.
     * @return {object} Returns itself, so calls can be chained.
     */
    tracking.TrackerTask.prototype.stop = function () {
      if (!this.inRunning()) {
        return;
      }
      this.setRunning(false);
      this.emit('stop');
      this.tracker_.removeListener('track', this.reemitTrackEvent_);
      return this;
    };
  })();
  (function () {
    /**
     * ColorTracker utility to track colored blobs in a frame using color
     * difference evaluation.
     * @constructor
     * @param {string|Array.<string>} opt_colors Optional colors to track.
     * @extends {tracking.Tracker}
     */
    tracking.ColorTracker = function (opt_colors) {
      tracking.ColorTracker.base(this, 'constructor');
      if (typeof opt_colors === 'string') {
        opt_colors = [opt_colors];
      }
      if (opt_colors) {
        opt_colors.forEach(function (color) {
          if (!tracking.ColorTracker.getColor(color)) {
            throw new Error('Color not valid, try `new tracking.ColorTracker("magenta")`.');
          }
        });
        this.setColors(opt_colors);
      }
    };
    tracking.inherits(tracking.ColorTracker, tracking.Tracker);
    /**
     * Holds the known colors.
     * @type {Object.<string, function>}
     * @private
     * @static
     */
    tracking.ColorTracker.knownColors_ = {};
    /**
     * Caches coordinates values of the neighbours surrounding a pixel.
     * @type {Object.<number, Int32Array>}
     * @private
     * @static
     */
    tracking.ColorTracker.neighbours_ = {};
    /**
     * Registers a color as known color.
     * @param {string} name The color name.
     * @param {function} fn The color function to test if the passed (r,g,b) is
     *     the desired color.
     * @static
     */
    tracking.ColorTracker.registerColor = function (name, fn) {
      tracking.ColorTracker.knownColors_[name] = fn;
    };
    /**
     * Gets the known color function that is able to test whether an (r,g,b) is
     * the desired color.
     * @param {string} name The color name.
     * @return {function} The known color test function.
     * @static
     */
    tracking.ColorTracker.getColor = function (name) {
      return tracking.ColorTracker.knownColors_[name];
    };
    /**
     * Holds the colors to be tracked by the `ColorTracker` instance.
     * @default ['magenta']
     * @type {Array.<string>}
     */
    tracking.ColorTracker.prototype.colors = ['magenta'];
    /**
     * Holds the minimum dimension to classify a rectangle.
     * @default 20
     * @type {number}
     */
    tracking.ColorTracker.prototype.minDimension = 20;
    /**
     * Holds the maximum dimension to classify a rectangle.
     * @default Infinity
     * @type {number}
     */
    tracking.ColorTracker.prototype.maxDimension = Infinity;
    /**
     * Holds the minimum group size to be classified as a rectangle.
     * @default 30
     * @type {number}
     */
    tracking.ColorTracker.prototype.minGroupSize = 30;
    /**
     * Calculates the central coordinate from the cloud points. The cloud points
     * are all points that matches the desired color.
     * @param {Array.<number>} cloud Major row order array containing all the
     *     points from the desired color, e.g. [x1, y1, c2, y2, ...].
     * @param {number} total Total numbers of pixels of the desired color.
     * @return {object} Object containing the x, y and estimated z coordinate of
     *     the blog extracted from the cloud points.
     * @private
     */
    tracking.ColorTracker.prototype.calculateDimensions_ = function (cloud, total) {
      var maxx = -1;
      var maxy = -1;
      var minx = Infinity;
      var miny = Infinity;
      for (var c = 0; c < total; c += 2) {
        var x = cloud[c];
        var y = cloud[c + 1];
        if (x < minx) {
          minx = x;
        }
        if (x > maxx) {
          maxx = x;
        }
        if (y < miny) {
          miny = y;
        }
        if (y > maxy) {
          maxy = y;
        }
      }
      return {
        width: maxx - minx,
        height: maxy - miny,
        x: minx,
        y: miny
      };
    };
    /**
     * Gets the colors being tracked by the `ColorTracker` instance.
     * @return {Array.<string>}
     */
    tracking.ColorTracker.prototype.getColors = function () {
      return this.colors;
    };
    /**
     * Gets the minimum dimension to classify a rectangle.
     * @return {number}
     */
    tracking.ColorTracker.prototype.getMinDimension = function () {
      return this.minDimension;
    };
    /**
     * Gets the maximum dimension to classify a rectangle.
     * @return {number}
     */
    tracking.ColorTracker.prototype.getMaxDimension = function () {
      return this.maxDimension;
    };
    /**
     * Gets the minimum group size to be classified as a rectangle.
     * @return {number}
     */
    tracking.ColorTracker.prototype.getMinGroupSize = function () {
      return this.minGroupSize;
    };
    /**
     * Gets the eight offset values of the neighbours surrounding a pixel.
     * @param {number} width The image width.
     * @return {array} Array with the eight offset values of the neighbours
     *     surrounding a pixel.
     * @private
     */
    tracking.ColorTracker.prototype.getNeighboursForWidth_ = function (width) {
      if (tracking.ColorTracker.neighbours_[width]) {
        return tracking.ColorTracker.neighbours_[width];
      }
      var neighbours = new Int32Array(8);
      neighbours[0] = -width * 4;
      neighbours[1] = -width * 4 + 4;
      neighbours[2] = 4;
      neighbours[3] = width * 4 + 4;
      neighbours[4] = width * 4;
      neighbours[5] = width * 4 - 4;
      neighbours[6] = -4;
      neighbours[7] = -width * 4 - 4;
      tracking.ColorTracker.neighbours_[width] = neighbours;
      return neighbours;
    };
    /**
     * Unites groups whose bounding box intersect with each other.
     * @param {Array.<Object>} rects
     * @private
     */
    tracking.ColorTracker.prototype.mergeRectangles_ = function (rects) {
      var intersects;
      var results = [];
      var minDimension = this.getMinDimension();
      var maxDimension = this.getMaxDimension();
      for (var r = 0; r < rects.length; r++) {
        var r1 = rects[r];
        intersects = true;
        for (var s = r + 1; s < rects.length; s++) {
          var r2 = rects[s];
          if (tracking.Math.intersectRect(r1.x, r1.y, r1.x + r1.width, r1.y + r1.height, r2.x, r2.y, r2.x + r2.width, r2.y + r2.height)) {
            intersects = false;
            var x1 = Math.min(r1.x, r2.x);
            var y1 = Math.min(r1.y, r2.y);
            var x2 = Math.max(r1.x + r1.width, r2.x + r2.width);
            var y2 = Math.max(r1.y + r1.height, r2.y + r2.height);
            r2.height = y2 - y1;
            r2.width = x2 - x1;
            r2.x = x1;
            r2.y = y1;
            break;
          }
        }
        if (intersects) {
          if (r1.width >= minDimension && r1.height >= minDimension) {
            if (r1.width <= maxDimension && r1.height <= maxDimension) {
              results.push(r1);
            }
          }
        }
      }
      return results;
    };
    /**
     * Sets the colors to be tracked by the `ColorTracker` instance.
     * @param {Array.<string>} colors
     */
    tracking.ColorTracker.prototype.setColors = function (colors) {
      this.colors = colors;
    };
    /**
     * Sets the minimum dimension to classify a rectangle.
     * @param {number} minDimension
     */
    tracking.ColorTracker.prototype.setMinDimension = function (minDimension) {
      this.minDimension = minDimension;
    };
    /**
     * Sets the maximum dimension to classify a rectangle.
     * @param {number} maxDimension
     */
    tracking.ColorTracker.prototype.setMaxDimension = function (maxDimension) {
      this.maxDimension = maxDimension;
    };
    /**
     * Sets the minimum group size to be classified as a rectangle.
     * @param {number} minGroupSize
     */
    tracking.ColorTracker.prototype.setMinGroupSize = function (minGroupSize) {
      this.minGroupSize = minGroupSize;
    };
    /**
     * Tracks the `Video` frames. This method is called for each video frame in
     * order to emit `track` event.
     * @param {Uint8ClampedArray} pixels The pixels data to track.
     * @param {number} width The pixels canvas width.
     * @param {number} height The pixels canvas height.
     */
    tracking.ColorTracker.prototype.track = function (pixels, width, height) {
      var self = this;
      var colors = this.getColors();
      if (!colors) {
        throw new Error('Colors not specified, try `new tracking.ColorTracker("magenta")`.');
      }
      var results = [];
      colors.forEach(function (color) {
        results = results.concat(self.trackColor_(pixels, width, height, color));
      });
      this.emit('track', {
        data: results
      });
    };
    /**
     * Find the given color in the given matrix of pixels using Flood fill
     * algorithm to determines the area connected to a given node in a
     * multi-dimensional array.
     * @param {Uint8ClampedArray} pixels The pixels data to track.
     * @param {number} width The pixels canvas width.
     * @param {number} height The pixels canvas height.
     * @param {string} color The color to be found
     * @private
     */
    tracking.ColorTracker.prototype.trackColor_ = function (pixels, width, height, color) {
      var colorFn = tracking.ColorTracker.knownColors_[color];
      var currGroup = new Int32Array(pixels.length >> 2);
      var currGroupSize;
      var currI;
      var currJ;
      var currW;
      var marked = new Int8Array(pixels.length);
      var minGroupSize = this.getMinGroupSize();
      var neighboursW = this.getNeighboursForWidth_(width);
      var queue = new Int32Array(pixels.length);
      var queuePosition;
      var results = [];
      var w = -4;
      if (!colorFn) {
        return results;
      }
      for (var i = 0; i < height; i++) {
        for (var j = 0; j < width; j++) {
          w += 4;
          if (marked[w]) {
            continue;
          }
          currGroupSize = 0;
          queuePosition = -1;
          queue[++queuePosition] = w;
          queue[++queuePosition] = i;
          queue[++queuePosition] = j;
          marked[w] = 1;
          while (queuePosition >= 0) {
            currJ = queue[queuePosition--];
            currI = queue[queuePosition--];
            currW = queue[queuePosition--];
            if (colorFn(pixels[currW], pixels[currW + 1], pixels[currW + 2], pixels[currW + 3], currW, currI, currJ)) {
              currGroup[currGroupSize++] = currJ;
              currGroup[currGroupSize++] = currI;
              for (var k = 0; k < neighboursW.length; k++) {
                var otherW = currW + neighboursW[k];
                var otherI = currI + neighboursI[k];
                var otherJ = currJ + neighboursJ[k];
                if (!marked[otherW] && otherI >= 0 && otherI < height && otherJ >= 0 && otherJ < width) {
                  queue[++queuePosition] = otherW;
                  queue[++queuePosition] = otherI;
                  queue[++queuePosition] = otherJ;
                  marked[otherW] = 1;
                }
              }
            }
          }
          if (currGroupSize >= minGroupSize) {
            var data = this.calculateDimensions_(currGroup, currGroupSize);
            if (data) {
              data.color = color;
              results.push(data);
            }
          }
        }
      }
      return this.mergeRectangles_(results);
    };
    tracking.ColorTracker.registerColor('cyan', function (r, g, b) {
      var thresholdGreen = 50,
          thresholdBlue = 70,
          dx = r - 0,
          dy = g - 255,
          dz = b - 255;
      if (g - r >= thresholdGreen && b - r >= thresholdBlue) {
        return true;
      }
      return dx * dx + dy * dy + dz * dz < 6400;
    });
    tracking.ColorTracker.registerColor('magenta', function (r, g, b) {
      var threshold = 50,
          dx = r - 255,
          dy = g - 0,
          dz = b - 255;
      if (r - g >= threshold && b - g >= threshold) {
        return true;
      }
      return dx * dx + dy * dy + dz * dz < 19600;
    });
    tracking.ColorTracker.registerColor('yellow', function (r, g, b) {
      var threshold = 50,
          dx = r - 255,
          dy = g - 255,
          dz = b - 0;
      if (r - b >= threshold && g - b >= threshold) {
        return true;
      }
      return dx * dx + dy * dy + dz * dz < 10000;
    });
    var neighboursI = new Int32Array([-1, -1, 0, 1, 1, 1, 0, -1]);
    var neighboursJ = new Int32Array([0, 1, 1, 1, 0, -1, -1, -1]);
  })();
  (function () {
    /**
     * ObjectTracker utility.
     * @constructor
     * @param {string|Array.<string|Array.<number>>} opt_classifiers Optional
     *     object classifiers to track.
     * @extends {tracking.Tracker}
     */
    tracking.ObjectTracker = function (opt_classifiers) {
      tracking.ObjectTracker.base(this, 'constructor');
      if (opt_classifiers) {
        if (!Array.isArray(opt_classifiers)) {
          opt_classifiers = [opt_classifiers];
        }
        if (Array.isArray(opt_classifiers)) {
          opt_classifiers.forEach(function (classifier, i) {
            if (typeof classifier === 'string') {
              opt_classifiers[i] = tracking.ViolaJones.classifiers[classifier];
            }
            if (!opt_classifiers[i]) {
              throw new Error('Object classifier not valid, try `new tracking.ObjectTracker("face")`.');
            }
          });
        }
      }
      this.setClassifiers(opt_classifiers);
    };
    tracking.inherits(tracking.ObjectTracker, tracking.Tracker);
    /**
     * Specifies the edges density of a block in order to decide whether to skip
     * it or not.
     * @default 0.2
     * @type {number}
     */
    tracking.ObjectTracker.prototype.edgesDensity = 0.2;
    /**
     * Specifies the initial scale to start the feature block scaling.
     * @default 1.0
     * @type {number}
     */
    tracking.ObjectTracker.prototype.initialScale = 1.0;
    /**
     * Specifies the scale factor to scale the feature block.
     * @default 1.25
     * @type {number}
     */
    tracking.ObjectTracker.prototype.scaleFactor = 1.25;
    /**
     * Specifies the block step size.
     * @default 1.5
     * @type {number}
     */
    tracking.ObjectTracker.prototype.stepSize = 1.5;
    /**
     * Gets the tracker HAAR classifiers.
     * @return {TypedArray.<number>}
     */
    tracking.ObjectTracker.prototype.getClassifiers = function () {
      return this.classifiers;
    };
    /**
     * Gets the edges density value.
     * @return {number}
     */
    tracking.ObjectTracker.prototype.getEdgesDensity = function () {
      return this.edgesDensity;
    };
    /**
     * Gets the initial scale to start the feature block scaling.
     * @return {number}
     */
    tracking.ObjectTracker.prototype.getInitialScale = function () {
      return this.initialScale;
    };
    /**
     * Gets the scale factor to scale the feature block.
     * @return {number}
     */
    tracking.ObjectTracker.prototype.getScaleFactor = function () {
      return this.scaleFactor;
    };
    /**
     * Gets the block step size.
     * @return {number}
     */
    tracking.ObjectTracker.prototype.getStepSize = function () {
      return this.stepSize;
    };
    /**
     * Tracks the `Video` frames. This method is called for each video frame in
     * order to emit `track` event.
     * @param {Uint8ClampedArray} pixels The pixels data to track.
     * @param {number} width The pixels canvas width.
     * @param {number} height The pixels canvas height.
     */
    tracking.ObjectTracker.prototype.track = function (pixels, width, height) {
      var self = this;
      var classifiers = this.getClassifiers();
      if (!classifiers) {
        throw new Error('Object classifier not specified, try `new tracking.ObjectTracker("face")`.');
      }
      var results = [];
      classifiers.forEach(function (classifier) {
        results = results.concat(tracking.ViolaJones.detect(pixels, width, height, self.getInitialScale(), self.getScaleFactor(), self.getStepSize(), self.getEdgesDensity(), classifier));
      });
      this.emit('track', {
        data: results
      });
    };
    /**
     * Sets the tracker HAAR classifiers.
     * @param {TypedArray.<number>} classifiers
     */
    tracking.ObjectTracker.prototype.setClassifiers = function (classifiers) {
      this.classifiers = classifiers;
    };
    /**
     * Sets the edges density.
     * @param {number} edgesDensity
     */
    tracking.ObjectTracker.prototype.setEdgesDensity = function (edgesDensity) {
      this.edgesDensity = edgesDensity;
    };
    /**
     * Sets the initial scale to start the block scaling.
     * @param {number} initialScale
     */
    tracking.ObjectTracker.prototype.setInitialScale = function (initialScale) {
      this.initialScale = initialScale;
    };
    /**
     * Sets the scale factor to scale the feature block.
     * @param {number} scaleFactor
     */
    tracking.ObjectTracker.prototype.setScaleFactor = function (scaleFactor) {
      this.scaleFactor = scaleFactor;
    };
    /**
     * Sets the block step size.
     * @param {number} stepSize
     */
    tracking.ObjectTracker.prototype.setStepSize = function (stepSize) {
      this.stepSize = stepSize;
    };
  })();

  /**
   * tracking.js - A modern approach for Computer Vision on the web.
   * @author Eduardo Lundgren <edu@rdo.io>
   * @version v1.0.0
   * @link http://trackingjs.com
   * @license BSD
   */
  tracking.ViolaJones.classifiers.face = new Float64Array([20, 20, .822689414024353, 3, 0, 2, 3, 7, 14, 4, -1, 3, 9, 14, 2, 2, .004014195874333382, .0337941907346249, .8378106951713562, 0, 2, 1, 2, 18, 4, -1, 7, 2, 6, 4, 3, .0151513395830989, .1514132022857666, .7488812208175659, 0, 2, 1, 7, 15, 9, -1, 1, 10, 15, 3, 3, .004210993181914091, .0900492817163467, .6374819874763489, 6.956608772277832, 16, 0, 2, 5, 6, 2, 6, -1, 5, 9, 2, 3, 2, .0016227109590545297, .0693085864186287, .7110946178436279, 0, 2, 7, 5, 6, 3, -1, 9, 5, 2, 3, 3, .002290664939209819, .1795803010463715, .6668692231178284, 0, 2, 4, 0, 12, 9, -1, 4, 3, 12, 3, 3, .005002570804208517, .1693672984838486, .6554006934165955, 0, 2, 6, 9, 10, 8, -1, 6, 13, 10, 4, 2, .007965989410877228, .5866332054138184, .0914145186543465, 0, 2, 3, 6, 14, 8, -1, 3, 10, 14, 4, 2, -.003522701095789671, .1413166970014572, .6031895875930786, 0, 2, 14, 1, 6, 10, -1, 14, 1, 3, 10, 2, .0366676896810532, .3675672113895416, .7920318245887756, 0, 2, 7, 8, 5, 12, -1, 7, 12, 5, 4, 3, .009336147457361221, .6161385774612427, .2088509947061539, 0, 2, 1, 1, 18, 3, -1, 7, 1, 6, 3, 3, .008696131408214569, .2836230993270874, .6360273957252502, 0, 2, 1, 8, 17, 2, -1, 1, 9, 17, 1, 2, .0011488880263641477, .2223580926656723, .5800700783729553, 0, 2, 16, 6, 4, 2, -1, 16, 7, 4, 1, 2, -.002148468978703022, .2406464070081711, .5787054896354675, 0, 2, 5, 17, 2, 2, -1, 5, 18, 2, 1, 2, .002121906029060483, .5559654831886292, .136223703622818, 0, 2, 14, 2, 6, 12, -1, 14, 2, 3, 12, 2, -.0939491465687752, .8502737283706665, .4717740118503571, 0, 3, 4, 0, 4, 12, -1, 4, 0, 2, 6, 2, 6, 6, 2, 6, 2, .0013777789426967502, .5993673801422119, .2834529876708984, 0, 2, 2, 11, 18, 8, -1, 8, 11, 6, 8, 3, .0730631574988365, .4341886043548584, .7060034275054932, 0, 2, 5, 7, 10, 2, -1, 5, 8, 10, 1, 2, .00036767389974556863, .3027887940406799, .6051574945449829, 0, 2, 15, 11, 5, 3, -1, 15, 12, 5, 1, 3, -.0060479710809886456, .17984339594841, .5675256848335266, 9.498542785644531, 21, 0, 2, 5, 3, 10, 9, -1, 5, 6, 10, 3, 3, -.0165106896311045, .6644225120544434, .1424857974052429, 0, 2, 9, 4, 2, 14, -1, 9, 11, 2, 7, 2, .002705249935388565, .6325352191925049, .1288477033376694, 0, 2, 3, 5, 4, 12, -1, 3, 9, 4, 4, 3, .002806986914947629, .1240288019180298, .6193193197250366, 0, 2, 4, 5, 12, 5, -1, 8, 5, 4, 5, 3, -.0015402400167658925, .1432143002748489, .5670015811920166, 0, 2, 5, 6, 10, 8, -1, 5, 10, 10, 4, 2, -.0005638627917505801, .1657433062791824, .5905207991600037, 0, 2, 8, 0, 6, 9, -1, 8, 3, 6, 3, 3, .0019253729842603207, .2695507109165192, .5738824009895325, 0, 2, 9, 12, 1, 8, -1, 9, 16, 1, 4, 2, -.005021484103053808, .1893538981676102, .5782774090766907, 0, 2, 0, 7, 20, 6, -1, 0, 9, 20, 2, 3, .0026365420781075954, .2309329062700272, .5695425868034363, 0, 2, 7, 0, 6, 17, -1, 9, 0, 2, 17, 3, -.0015127769438549876, .2759602069854736, .5956642031669617, 0, 2, 9, 0, 6, 4, -1, 11, 0, 2, 4, 3, -.0101574398577213, .1732538044452667, .5522047281265259, 0, 2, 5, 1, 6, 4, -1, 7, 1, 2, 4, 3, -.011953660286963, .1339409947395325, .5559014081954956, 0, 2, 12, 1, 6, 16, -1, 14, 1, 2, 16, 3, .004885949194431305, .3628703951835632, .6188849210739136, 0, 3, 0, 5, 18, 8, -1, 0, 5, 9, 4, 2, 9, 9, 9, 4, 2, -.0801329165697098, .0912110507488251, .5475944876670837, 0, 3, 8, 15, 10, 4, -1, 13, 15, 5, 2, 2, 8, 17, 5, 2, 2, .0010643280111253262, .3715142905712128, .5711399912834167, 0, 3, 3, 1, 4, 8, -1, 3, 1, 2, 4, 2, 5, 5, 2, 4, 2, -.0013419450260698795, .5953313708305359, .331809788942337, 0, 3, 3, 6, 14, 10, -1, 10, 6, 7, 5, 2, 3, 11, 7, 5, 2, -.0546011403203011, .1844065934419632, .5602846145629883, 0, 2, 2, 1, 6, 16, -1, 4, 1, 2, 16, 3, .0029071690514683723, .3594244122505188, .6131715178489685, 0, 2, 0, 18, 20, 2, -1, 0, 19, 20, 1, 2, .0007471871795132756, .5994353294372559, .3459562957286835, 0, 2, 8, 13, 4, 3, -1, 8, 14, 4, 1, 3, .004301380831748247, .4172652065753937, .6990845203399658, 0, 2, 9, 14, 2, 3, -1, 9, 15, 2, 1, 3, .004501757211983204, .4509715139865875, .7801457047462463, 0, 2, 0, 12, 9, 6, -1, 0, 14, 9, 2, 3, .0241385009139776, .5438212752342224, .1319826990365982, 18.4129695892334, 39, 0, 2, 5, 7, 3, 4, -1, 5, 9, 3, 2, 2, .001921223010867834, .1415266990661621, .6199870705604553, 0, 2, 9, 3, 2, 16, -1, 9, 11, 2, 8, 2, -.00012748669541906565, .6191074252128601, .1884928941726685, 0, 2, 3, 6, 13, 8, -1, 3, 10, 13, 4, 2, .0005140993162058294, .1487396955490112, .5857927799224854, 0, 2, 12, 3, 8, 2, -1, 12, 3, 4, 2, 2, .004187860991805792, .2746909856796265, .6359239816665649, 0, 2, 8, 8, 4, 12, -1, 8, 12, 4, 4, 3, .005101571790874004, .5870851278305054, .2175628989934921, 0, 3, 11, 3, 8, 6, -1, 15, 3, 4, 3, 2, 11, 6, 4, 3, 2, -.002144844038411975, .5880944728851318, .2979590892791748, 0, 2, 7, 1, 6, 19, -1, 9, 1, 2, 19, 3, -.0028977119363844395, .2373327016830444, .5876647233963013, 0, 2, 9, 0, 6, 4, -1, 11, 0, 2, 4, 3, -.0216106791049242, .1220654994249344, .5194202065467834, 0, 2, 3, 1, 9, 3, -1, 6, 1, 3, 3, 3, -.004629931878298521, .263123095035553, .5817409157752991, 0, 3, 8, 15, 10, 4, -1, 13, 15, 5, 2, 2, 8, 17, 5, 2, 2, .000593937118537724, .363862007856369, .5698544979095459, 0, 2, 0, 3, 6, 10, -1, 3, 3, 3, 10, 2, .0538786612451077, .4303531050682068, .7559366226196289, 0, 2, 3, 4, 15, 15, -1, 3, 9, 15, 5, 3, .0018887349870055914, .2122603058815002, .561342716217041, 0, 2, 6, 5, 8, 6, -1, 6, 7, 8, 2, 3, -.0023635339457541704, .563184916973114, .2642767131328583, 0, 3, 4, 4, 12, 10, -1, 10, 4, 6, 5, 2, 4, 9, 6, 5, 2, .0240177996456623, .5797107815742493, .2751705944538117, 0, 2, 6, 4, 4, 4, -1, 8, 4, 2, 4, 2, .00020543030404951423, .2705242037773132, .575256884098053, 0, 2, 15, 11, 1, 2, -1, 15, 12, 1, 1, 2, .0008479019743390381, .5435624718666077, .2334876954555512, 0, 2, 3, 11, 2, 2, -1, 3, 12, 2, 1, 2, .0014091329649090767, .5319424867630005, .2063155025243759, 0, 2, 16, 11, 1, 3, -1, 16, 12, 1, 1, 3, .0014642629539594054, .5418980717658997, .3068861067295075, 0, 3, 3, 15, 6, 4, -1, 3, 15, 3, 2, 2, 6, 17, 3, 2, 2, .0016352549428120255, .3695372939109802, .6112868189811707, 0, 2, 6, 7, 8, 2, -1, 6, 8, 8, 1, 2, .0008317275205627084, .3565036952495575, .6025236248970032, 0, 2, 3, 11, 1, 3, -1, 3, 12, 1, 1, 3, -.0020998890977352858, .1913982033729553, .5362827181816101, 0, 2, 6, 0, 12, 2, -1, 6, 1, 12, 1, 2, -.0007421398186124861, .3835555016994476, .552931010723114, 0, 2, 9, 14, 2, 3, -1, 9, 15, 2, 1, 3, .0032655049581080675, .4312896132469177, .7101895809173584, 0, 2, 7, 15, 6, 2, -1, 7, 16, 6, 1, 2, .0008913499186746776, .3984830975532532, .6391963958740234, 0, 2, 0, 5, 4, 6, -1, 0, 7, 4, 2, 3, -.0152841797098517, .2366732954978943, .5433713793754578, 0, 2, 4, 12, 12, 2, -1, 8, 12, 4, 2, 3, .004838141147047281, .5817500948905945, .3239189088344574, 0, 2, 6, 3, 1, 9, -1, 6, 6, 1, 3, 3, -.0009109317907132208, .5540593862533569, .2911868989467621, 0, 2, 10, 17, 3, 2, -1, 11, 17, 1, 2, 3, -.006127506028860807, .1775255054235458, .5196629166603088, 0, 2, 9, 9, 2, 2, -1, 9, 10, 2, 1, 2, -.00044576259097084403, .3024170100688934, .5533593893051147, 0, 2, 7, 6, 6, 4, -1, 9, 6, 2, 4, 3, .0226465407758951, .4414930939674377, .6975377202033997, 0, 2, 7, 17, 3, 2, -1, 8, 17, 1, 2, 3, -.0018804960418492556, .2791394889354706, .5497952103614807, 0, 2, 10, 17, 3, 3, -1, 11, 17, 1, 3, 3, .007088910788297653, .5263199210166931, .2385547012090683, 0, 2, 8, 12, 3, 2, -1, 8, 13, 3, 1, 2, .0017318050377070904, .4319379031658173, .6983600854873657, 0, 2, 9, 3, 6, 2, -1, 11, 3, 2, 2, 3, -.006848270073533058, .3082042932510376, .5390920042991638, 0, 2, 3, 11, 14, 4, -1, 3, 13, 14, 2, 2, -15062530110299122e-21, .552192211151123, .3120366036891937, 0, 3, 1, 10, 18, 4, -1, 10, 10, 9, 2, 2, 1, 12, 9, 2, 2, .0294755697250366, .5401322841644287, .1770603060722351, 0, 2, 0, 10, 3, 3, -1, 0, 11, 3, 1, 3, .008138732984662056, .5178617835044861, .121101900935173, 0, 2, 9, 1, 6, 6, -1, 11, 1, 2, 6, 3, .0209429506212473, .5290294289588928, .3311221897602081, 0, 2, 8, 7, 3, 6, -1, 9, 7, 1, 6, 3, -.009566552937030792, .7471994161605835, .4451968967914581, 15.324139595031738, 33, 0, 2, 1, 0, 18, 9, -1, 1, 3, 18, 3, 3, -.00028206960996612906, .2064086049795151, .6076732277870178, 0, 2, 12, 10, 2, 6, -1, 12, 13, 2, 3, 2, .00167906004935503, .5851997137069702, .1255383938550949, 0, 2, 0, 5, 19, 8, -1, 0, 9, 19, 4, 2, .0006982791237533092, .094018429517746, .5728961229324341, 0, 2, 7, 0, 6, 9, -1, 9, 0, 2, 9, 3, .0007895901217125356, .1781987994909287, .5694308876991272, 0, 2, 5, 3, 6, 1, -1, 7, 3, 2, 1, 3, -.002856049919500947, .1638399064540863, .5788664817810059, 0, 2, 11, 3, 6, 1, -1, 13, 3, 2, 1, 3, -.0038122469559311867, .2085440009832382, .5508564710617065, 0, 2, 5, 10, 4, 6, -1, 5, 13, 4, 3, 2, .0015896620461717248, .5702760815620422, .1857215017080307, 0, 2, 11, 3, 6, 1, -1, 13, 3, 2, 1, 3, .0100783398374915, .5116943120956421, .2189770042896271, 0, 2, 4, 4, 12, 6, -1, 4, 6, 12, 2, 3, -.0635263025760651, .7131379842758179, .4043813049793243, 0, 2, 15, 12, 2, 6, -1, 15, 14, 2, 2, 3, -.009103149175643921, .2567181885242462, .54639732837677, 0, 2, 9, 3, 2, 2, -1, 10, 3, 1, 2, 2, -.002403500024229288, .1700665950775147, .559097409248352, 0, 2, 9, 3, 3, 1, -1, 10, 3, 1, 1, 3, .001522636041045189, .5410556793212891, .2619054019451141, 0, 2, 1, 1, 4, 14, -1, 3, 1, 2, 14, 2, .0179974399507046, .3732436895370483, .6535220742225647, 0, 3, 9, 0, 4, 4, -1, 11, 0, 2, 2, 2, 9, 2, 2, 2, 2, -.00645381910726428, .2626481950283051, .5537446141242981, 0, 2, 7, 5, 1, 14, -1, 7, 12, 1, 7, 2, -.0118807600811124, .2003753930330277, .5544745922088623, 0, 2, 19, 0, 1, 4, -1, 19, 2, 1, 2, 2, .0012713660253211856, .5591902732849121, .303197592496872, 0, 2, 5, 5, 6, 4, -1, 8, 5, 3, 4, 2, .0011376109905540943, .2730407118797302, .5646508932113647, 0, 2, 9, 18, 3, 2, -1, 10, 18, 1, 2, 3, -.00426519988104701, .1405909061431885, .5461820960044861, 0, 2, 8, 18, 3, 2, -1, 9, 18, 1, 2, 3, -.0029602861031889915, .1795035004615784, .5459290146827698, 0, 2, 4, 5, 12, 6, -1, 4, 7, 12, 2, 3, -.008844822645187378, .5736783146858215, .280921995639801, 0, 2, 3, 12, 2, 6, -1, 3, 14, 2, 2, 3, -.006643068976700306, .2370675951242447, .5503826141357422, 0, 2, 10, 8, 2, 12, -1, 10, 12, 2, 4, 3, .003999780863523483, .5608199834823608, .3304282128810883, 0, 2, 7, 18, 3, 2, -1, 8, 18, 1, 2, 3, -.004122172016650438, .1640105992555618, .5378993153572083, 0, 2, 9, 0, 6, 2, -1, 11, 0, 2, 2, 3, .0156249096617103, .5227649211883545, .2288603931665421, 0, 2, 5, 11, 9, 3, -1, 5, 12, 9, 1, 3, -.0103564197197557, .7016193866729736, .4252927899360657, 0, 2, 9, 0, 6, 2, -1, 11, 0, 2, 2, 3, -.008796080946922302, .2767347097396851, .5355830192565918, 0, 2, 1, 1, 18, 5, -1, 7, 1, 6, 5, 3, .1622693985700607, .434224009513855, .744257926940918, 0, 3, 8, 0, 4, 4, -1, 10, 0, 2, 2, 2, 8, 2, 2, 2, 2, .0045542530715465546, .5726485848426819, .2582125067710877, 0, 2, 3, 12, 1, 3, -1, 3, 13, 1, 1, 3, -.002130920998752117, .2106848061084747, .5361018776893616, 0, 2, 8, 14, 5, 3, -1, 8, 15, 5, 1, 3, -.0132084200158715, .7593790888786316, .4552468061447144, 0, 3, 5, 4, 10, 12, -1, 5, 4, 5, 6, 2, 10, 10, 5, 6, 2, -.0659966766834259, .125247597694397, .5344039797782898, 0, 2, 9, 6, 9, 12, -1, 9, 10, 9, 4, 3, .007914265617728233, .3315384089946747, .5601043105125427, 0, 3, 2, 2, 12, 14, -1, 2, 2, 6, 7, 2, 8, 9, 6, 7, 2, .0208942797034979, .5506049990653992, .2768838107585907, 21.010639190673828, 44, 0, 2, 4, 7, 12, 2, -1, 8, 7, 4, 2, 3, .0011961159761995077, .1762690991163254, .6156241297721863, 0, 2, 7, 4, 6, 4, -1, 7, 6, 6, 2, 2, -.0018679830245673656, .6118106842041016, .1832399964332581, 0, 2, 4, 5, 11, 8, -1, 4, 9, 11, 4, 2, -.00019579799845814705, .0990442633628845, .5723816156387329, 0, 2, 3, 10, 16, 4, -1, 3, 12, 16, 2, 2, -.0008025565766729414, .5579879879951477, .2377282977104187, 0, 2, 0, 0, 16, 2, -1, 0, 1, 16, 1, 2, -.0024510810617357492, .2231457978487015, .5858935117721558, 0, 2, 7, 5, 6, 2, -1, 9, 5, 2, 2, 3, .0005036185029894114, .2653993964195252, .5794103741645813, 0, 3, 3, 2, 6, 10, -1, 3, 2, 3, 5, 2, 6, 7, 3, 5, 2, .0040293349884450436, .5803827047348022, .2484865039587021, 0, 2, 10, 5, 8, 15, -1, 10, 10, 8, 5, 3, -.0144517095759511, .1830351948738098, .5484204888343811, 0, 3, 3, 14, 8, 6, -1, 3, 14, 4, 3, 2, 7, 17, 4, 3, 2, .0020380979403853416, .3363558948040009, .6051092743873596, 0, 2, 14, 2, 2, 2, -1, 14, 3, 2, 1, 2, -.0016155190533027053, .2286642044782639, .5441246032714844, 0, 2, 1, 10, 7, 6, -1, 1, 13, 7, 3, 2, .0033458340913057327, .5625913143157959, .2392338067293167, 0, 2, 15, 4, 4, 3, -1, 15, 4, 2, 3, 2, .0016379579901695251, .3906993865966797, .5964621901512146, 0, 3, 2, 9, 14, 6, -1, 2, 9, 7, 3, 2, 9, 12, 7, 3, 2, .0302512105554342, .524848222732544, .1575746983289719, 0, 2, 5, 7, 10, 4, -1, 5, 9, 10, 2, 2, .037251990288496, .4194310903549194, .6748418807983398, 0, 3, 6, 9, 8, 8, -1, 6, 9, 4, 4, 2, 10, 13, 4, 4, 2, -.0251097902655602, .1882549971342087, .5473451018333435, 0, 2, 14, 1, 3, 2, -1, 14, 2, 3, 1, 2, -.005309905856847763, .133997306227684, .5227110981941223, 0, 2, 1, 4, 4, 2, -1, 3, 4, 2, 2, 2, .0012086479691788554, .3762088119983673, .6109635829925537, 0, 2, 11, 10, 2, 8, -1, 11, 14, 2, 4, 2, -.0219076797366142, .266314297914505, .5404006838798523, 0, 2, 0, 0, 5, 3, -1, 0, 1, 5, 1, 3, .0054116579703986645, .5363578796386719, .2232273072004318, 0, 3, 2, 5, 18, 8, -1, 11, 5, 9, 4, 2, 2, 9, 9, 4, 2, .069946326315403, .5358232855796814, .2453698068857193, 0, 2, 6, 6, 1, 6, -1, 6, 9, 1, 3, 2, .00034520021290518343, .2409671992063522, .5376930236816406, 0, 2, 19, 1, 1, 3, -1, 19, 2, 1, 1, 3, .0012627709656953812, .5425856709480286, .3155693113803864, 0, 2, 7, 6, 6, 6, -1, 9, 6, 2, 6, 3, .0227195098996162, .4158405959606171, .6597865223884583, 0, 2, 19, 1, 1, 3, -1, 19, 2, 1, 1, 3, -.001811100053600967, .2811253070831299, .5505244731903076, 0, 2, 3, 13, 2, 3, -1, 3, 14, 2, 1, 3, .0033469670452177525, .526002824306488, .1891465038061142, 0, 3, 8, 4, 8, 12, -1, 12, 4, 4, 6, 2, 8, 10, 4, 6, 2, .00040791751234792173, .5673509240150452, .3344210088253021, 0, 2, 5, 2, 6, 3, -1, 7, 2, 2, 3, 3, .0127347996458411, .5343592166900635, .2395612001419067, 0, 2, 6, 1, 9, 10, -1, 6, 6, 9, 5, 2, -.007311972789466381, .6010890007019043, .4022207856178284, 0, 2, 0, 4, 6, 12, -1, 2, 4, 2, 12, 3, -.0569487512111664, .8199151158332825, .4543190896511078, 0, 2, 15, 13, 2, 3, -1, 15, 14, 2, 1, 3, -.005011659115552902, .2200281023979187, .5357710719108582, 0, 2, 7, 14, 5, 3, -1, 7, 15, 5, 1, 3, .006033436860889196, .4413081109523773, .7181751132011414, 0, 2, 15, 13, 3, 3, -1, 15, 14, 3, 1, 3, .0039437441155314445, .547886073589325, .2791733145713806, 0, 2, 6, 14, 8, 3, -1, 6, 15, 8, 1, 3, -.0036591119132936, .635786771774292, .3989723920822144, 0, 2, 15, 13, 3, 3, -1, 15, 14, 3, 1, 3, -.0038456181064248085, .3493686020374298, .5300664901733398, 0, 2, 2, 13, 3, 3, -1, 2, 14, 3, 1, 3, -.007192626129835844, .1119614988565445, .5229672789573669, 0, 3, 4, 7, 12, 12, -1, 10, 7, 6, 6, 2, 4, 13, 6, 6, 2, -.0527989417314529, .2387102991342545, .54534512758255, 0, 2, 9, 7, 2, 6, -1, 10, 7, 1, 6, 2, -.007953766733407974, .7586917877197266, .4439376890659332, 0, 2, 8, 9, 5, 2, -1, 8, 10, 5, 1, 2, -.0027344180271029472, .2565476894378662, .5489321947097778, 0, 2, 8, 6, 3, 4, -1, 9, 6, 1, 4, 3, -.0018507939530536532, .6734347939491272, .4252474904060364, 0, 2, 9, 6, 2, 8, -1, 9, 10, 2, 4, 2, .0159189198166132, .548835277557373, .2292661964893341, 0, 2, 7, 7, 3, 6, -1, 8, 7, 1, 6, 3, -.0012687679845839739, .6104331016540527, .4022389948368073, 0, 2, 11, 3, 3, 3, -1, 12, 3, 1, 3, 3, .006288391072303057, .5310853123664856, .1536193042993546, 0, 2, 5, 4, 6, 1, -1, 7, 4, 2, 1, 3, -.0062259892001748085, .1729111969470978, .524160623550415, 0, 2, 5, 6, 10, 3, -1, 5, 7, 10, 1, 3, -.0121325999498367, .659775972366333, .4325182139873505, 23.918790817260742, 50, 0, 2, 7, 3, 6, 9, -1, 7, 6, 6, 3, 3, -.0039184908382594585, .6103435158729553, .1469330936670303, 0, 2, 6, 7, 9, 1, -1, 9, 7, 3, 1, 3, .0015971299726516008, .2632363140583038, .5896466970443726, 0, 2, 2, 8, 16, 8, -1, 2, 12, 16, 4, 2, .0177801102399826, .587287425994873, .1760361939668655, 0, 2, 14, 6, 2, 6, -1, 14, 9, 2, 3, 2, .0006533476989716291, .1567801982164383, .5596066117286682, 0, 2, 1, 5, 6, 15, -1, 1, 10, 6, 5, 3, -.00028353091329336166, .1913153976202011, .5732036232948303, 0, 2, 10, 0, 6, 9, -1, 10, 3, 6, 3, 3, .0016104689566418529, .2914913892745972, .5623080730438232, 0, 2, 6, 6, 7, 14, -1, 6, 13, 7, 7, 2, -.0977506190538406, .194347694516182, .5648233294487, 0, 2, 13, 7, 3, 6, -1, 13, 9, 3, 2, 3, .0005518235848285258, .3134616911411285, .5504639744758606, 0, 2, 1, 8, 15, 4, -1, 6, 8, 5, 4, 3, -.0128582203760743, .253648191690445, .5760142803192139, 0, 2, 11, 2, 3, 10, -1, 11, 7, 3, 5, 2, .004153023939579725, .5767722129821777, .36597740650177, 0, 2, 3, 7, 4, 6, -1, 3, 9, 4, 2, 3, .0017092459602281451, .2843191027641296, .5918939113616943, 0, 2, 13, 3, 6, 10, -1, 15, 3, 2, 10, 3, .007521735969930887, .4052427113056183, .6183109283447266, 0, 3, 5, 7, 8, 10, -1, 5, 7, 4, 5, 2, 9, 12, 4, 5, 2, .0022479810286313295, .578375518321991, .3135401010513306, 0, 3, 4, 4, 12, 12, -1, 10, 4, 6, 6, 2, 4, 10, 6, 6, 2, .0520062111318111, .5541312098503113, .1916636973619461, 0, 2, 1, 4, 6, 9, -1, 3, 4, 2, 9, 3, .0120855299755931, .4032655954360962, .6644591093063354, 0, 2, 11, 3, 2, 5, -1, 11, 3, 1, 5, 2, 14687820112158079e-21, .3535977900028229, .5709382891654968, 0, 2, 7, 3, 2, 5, -1, 8, 3, 1, 5, 2, 7139518857002258e-21, .3037444949150085, .5610269904136658, 0, 2, 10, 14, 2, 3, -1, 10, 15, 2, 1, 3, -.0046001640148460865, .7181087136268616, .4580326080322266, 0, 2, 5, 12, 6, 2, -1, 8, 12, 3, 2, 2, .0020058949012309313, .5621951818466187, .2953684031963348, 0, 2, 9, 14, 2, 3, -1, 9, 15, 2, 1, 3, .004505027085542679, .4615387916564941, .7619017958641052, 0, 2, 4, 11, 12, 6, -1, 4, 14, 12, 3, 2, .0117468303069472, .5343837141990662, .1772529035806656, 0, 2, 11, 11, 5, 9, -1, 11, 14, 5, 3, 3, -.0583163388073444, .1686245948076248, .5340772271156311, 0, 2, 6, 15, 3, 2, -1, 6, 16, 3, 1, 2, .00023629379575140774, .3792056143283844, .6026803851127625, 0, 2, 11, 0, 3, 5, -1, 12, 0, 1, 5, 3, -.007815618067979813, .151286706328392, .5324323773384094, 0, 2, 5, 5, 6, 7, -1, 8, 5, 3, 7, 2, -.0108761601150036, .2081822007894516, .5319945216178894, 0, 2, 13, 0, 1, 9, -1, 13, 3, 1, 3, 3, -.0027745519764721394, .4098246991634369, .5210328102111816, 0, 3, 3, 2, 4, 8, -1, 3, 2, 2, 4, 2, 5, 6, 2, 4, 2, -.0007827638182789087, .5693274140357971, .3478842079639435, 0, 2, 13, 12, 4, 6, -1, 13, 14, 4, 2, 3, .0138704096898437, .5326750874519348, .2257698029279709, 0, 2, 3, 12, 4, 6, -1, 3, 14, 4, 2, 3, -.0236749108880758, .1551305055618286, .5200707912445068, 0, 2, 13, 11, 3, 4, -1, 13, 13, 3, 2, 2, -14879409718560055e-21, .5500566959381104, .3820176124572754, 0, 2, 4, 4, 4, 3, -1, 4, 5, 4, 1, 3, .00361906411126256, .4238683879375458, .6639748215675354, 0, 2, 7, 5, 11, 8, -1, 7, 9, 11, 4, 2, -.0198171101510525, .2150038033723831, .5382357835769653, 0, 2, 7, 8, 3, 4, -1, 8, 8, 1, 4, 3, -.0038154039066284895, .6675711274147034, .4215297102928162, 0, 2, 9, 1, 6, 1, -1, 11, 1, 2, 1, 3, -.0049775829538702965, .2267289012670517, .5386328101158142, 0, 2, 5, 5, 3, 3, -1, 5, 6, 3, 1, 3, .002244102070108056, .4308691024780273, .6855735778808594, 0, 3, 0, 9, 20, 6, -1, 10, 9, 10, 3, 2, 0, 12, 10, 3, 2, .0122824599966407, .5836614966392517, .3467479050159454, 0, 2, 8, 6, 3, 5, -1, 9, 6, 1, 5, 3, -.002854869933798909, .7016944885253906, .4311453998088837, 0, 2, 11, 0, 1, 3, -1, 11, 1, 1, 1, 3, -.0037875669077038765, .2895345091819763, .5224946141242981, 0, 2, 4, 2, 4, 2, -1, 4, 3, 4, 1, 2, -.0012201230274513364, .2975570857524872, .5481644868850708, 0, 2, 12, 6, 4, 3, -1, 12, 7, 4, 1, 3, .010160599835217, .4888817965984345, .8182697892189026, 0, 2, 5, 0, 6, 4, -1, 7, 0, 2, 4, 3, -.0161745697259903, .1481492966413498, .5239992737770081, 0, 2, 9, 7, 3, 8, -1, 10, 7, 1, 8, 3, .0192924607545137, .4786309897899628, .7378190755844116, 0, 2, 9, 7, 2, 2, -1, 10, 7, 1, 2, 2, -.003247953951358795, .7374222874641418, .4470643997192383, 0, 3, 6, 7, 14, 4, -1, 13, 7, 7, 2, 2, 6, 9, 7, 2, 2, -.009380348026752472, .3489154875278473, .5537996292114258, 0, 2, 0, 5, 3, 6, -1, 0, 7, 3, 2, 3, -.0126061299815774, .2379686981439591, .5315443277359009, 0, 2, 13, 11, 3, 4, -1, 13, 13, 3, 2, 2, -.0256219301372766, .1964688003063202, .5138769745826721, 0, 2, 4, 11, 3, 4, -1, 4, 13, 3, 2, 2, -7574149640277028e-20, .5590522885322571, .3365853130817413, 0, 3, 5, 9, 12, 8, -1, 11, 9, 6, 4, 2, 5, 13, 6, 4, 2, -.0892108827829361, .0634046569466591, .516263484954834, 0, 2, 9, 12, 1, 3, -1, 9, 13, 1, 1, 3, -.002767048077657819, .732346773147583, .4490706026554108, 0, 2, 10, 15, 2, 4, -1, 10, 17, 2, 2, 2, .0002715257869567722, .411483496427536, .5985518097877502, 24.52787971496582, 51, 0, 2, 7, 7, 6, 1, -1, 9, 7, 2, 1, 3, .001478621968999505, .266354501247406, .6643316745758057, 0, 3, 12, 3, 6, 6, -1, 15, 3, 3, 3, 2, 12, 6, 3, 3, 2, -.001874165958724916, .6143848896026611, .2518512904644013, 0, 2, 0, 4, 10, 6, -1, 0, 6, 10, 2, 3, -.001715100952424109, .5766341090202332, .2397463023662567, 0, 3, 8, 3, 8, 14, -1, 12, 3, 4, 7, 2, 8, 10, 4, 7, 2, -.0018939269939437509, .5682045817375183, .2529144883155823, 0, 2, 4, 4, 7, 15, -1, 4, 9, 7, 5, 3, -.005300605203956366, .1640675961971283, .5556079745292664, 0, 3, 12, 2, 6, 8, -1, 15, 2, 3, 4, 2, 12, 6, 3, 4, 2, -.0466625317931175, .6123154163360596, .4762830138206482, 0, 3, 2, 2, 6, 8, -1, 2, 2, 3, 4, 2, 5, 6, 3, 4, 2, -.000794313324149698, .5707858800888062, .2839404046535492, 0, 2, 2, 13, 18, 7, -1, 8, 13, 6, 7, 3, .0148916700854898, .4089672863483429, .6006367206573486, 0, 3, 4, 3, 8, 14, -1, 4, 3, 4, 7, 2, 8, 10, 4, 7, 2, -.0012046529445797205, .5712450742721558, .2705289125442505, 0, 2, 18, 1, 2, 6, -1, 18, 3, 2, 2, 3, .006061938125640154, .526250422000885, .3262225985527039, 0, 2, 9, 11, 2, 3, -1, 9, 12, 2, 1, 3, -.0025286648888140917, .6853830814361572, .4199256896972656, 0, 2, 18, 1, 2, 6, -1, 18, 3, 2, 2, 3, -.005901021882891655, .3266282081604004, .5434812903404236, 0, 2, 0, 1, 2, 6, -1, 0, 3, 2, 2, 3, .005670276004821062, .5468410849571228, .2319003939628601, 0, 2, 1, 5, 18, 6, -1, 1, 7, 18, 2, 3, -.003030410036444664, .557066798210144, .2708238065242767, 0, 2, 0, 2, 6, 7, -1, 3, 2, 3, 7, 2, .002980364952236414, .3700568974018097, .5890625715255737, 0, 2, 7, 3, 6, 14, -1, 7, 10, 6, 7, 2, -.0758405104279518, .2140070050954819, .5419948101043701, 0, 2, 3, 7, 13, 10, -1, 3, 12, 13, 5, 2, .0192625392228365, .5526772141456604, .2726590037345886, 0, 2, 11, 15, 2, 2, -1, 11, 16, 2, 1, 2, .00018888259364757687, .3958011865615845, .6017209887504578, 0, 3, 2, 11, 16, 4, -1, 2, 11, 8, 2, 2, 10, 13, 8, 2, 2, .0293695498257875, .5241373777389526, .1435758024454117, 0, 3, 13, 7, 6, 4, -1, 16, 7, 3, 2, 2, 13, 9, 3, 2, 2, .0010417619487270713, .3385409116744995, .5929983258247375, 0, 2, 6, 10, 3, 9, -1, 6, 13, 3, 3, 3, .0026125640142709017, .5485377907752991, .3021597862243652, 0, 2, 14, 6, 1, 6, -1, 14, 9, 1, 3, 2, .0009697746718302369, .3375276029109955, .553203284740448, 0, 2, 5, 10, 4, 1, -1, 7, 10, 2, 1, 2, .0005951265920884907, .563174307346344, .3359399139881134, 0, 2, 3, 8, 15, 5, -1, 8, 8, 5, 5, 3, -.1015655994415283, .0637350380420685, .5230425000190735, 0, 2, 1, 6, 5, 4, -1, 1, 8, 5, 2, 2, .0361566990613937, .5136963129043579, .1029528975486755, 0, 2, 3, 1, 17, 6, -1, 3, 3, 17, 2, 3, .003462414024397731, .3879320025444031, .5558289289474487, 0, 2, 6, 7, 8, 2, -1, 10, 7, 4, 2, 2, .0195549800992012, .5250086784362793, .1875859946012497, 0, 2, 9, 7, 3, 2, -1, 10, 7, 1, 2, 3, -.0023121440317481756, .667202889919281, .4679641127586365, 0, 2, 8, 7, 3, 2, -1, 9, 7, 1, 2, 3, -.001860528951510787, .7163379192352295, .4334670901298523, 0, 2, 8, 9, 4, 2, -1, 8, 10, 4, 1, 2, -.0009402636205777526, .302136093378067, .5650203227996826, 0, 2, 8, 8, 4, 3, -1, 8, 9, 4, 1, 3, -.005241833161562681, .1820009052753449, .5250256061553955, 0, 2, 9, 5, 6, 4, -1, 9, 5, 3, 4, 2, .00011729019752237946, .3389188051223755, .544597327709198, 0, 2, 8, 13, 4, 3, -1, 8, 14, 4, 1, 3, .0011878840159624815, .4085349142551422, .6253563165664673, 0, 3, 4, 7, 12, 6, -1, 10, 7, 6, 3, 2, 4, 10, 6, 3, 2, -.0108813596889377, .3378399014472961, .5700082778930664, 0, 2, 8, 14, 4, 3, -1, 8, 15, 4, 1, 3, .0017354859737679362, .4204635918140411, .6523038744926453, 0, 2, 9, 7, 3, 3, -1, 9, 8, 3, 1, 3, -.00651190523058176, .2595216035842896, .5428143739700317, 0, 2, 7, 4, 3, 8, -1, 8, 4, 1, 8, 3, -.0012136430013924837, .6165143847465515, .3977893888950348, 0, 2, 10, 0, 3, 6, -1, 11, 0, 1, 6, 3, -.010354240424931, .1628028005361557, .5219504833221436, 0, 2, 6, 3, 4, 8, -1, 8, 3, 2, 8, 2, .0005585883045569062, .3199650943279266, .5503574013710022, 0, 2, 14, 3, 6, 13, -1, 14, 3, 3, 13, 2, .0152996499091387, .4103994071483612, .6122388243675232, 0, 2, 8, 13, 3, 6, -1, 8, 16, 3, 3, 2, -.021588210016489, .103491298854351, .519738495349884, 0, 2, 14, 3, 6, 13, -1, 14, 3, 3, 13, 2, -.1283462941646576, .8493865132331848, .4893102943897247, 0, 3, 0, 7, 10, 4, -1, 0, 7, 5, 2, 2, 5, 9, 5, 2, 2, -.0022927189711481333, .3130157887935638, .5471575260162354, 0, 2, 14, 3, 6, 13, -1, 14, 3, 3, 13, 2, .0799151062965393, .4856320917606354, .6073989272117615, 0, 2, 0, 3, 6, 13, -1, 3, 3, 3, 13, 2, -.0794410929083824, .8394674062728882, .462453305721283, 0, 2, 9, 1, 4, 1, -1, 9, 1, 2, 1, 2, -.00528000108897686, .1881695985794067, .5306698083877563, 0, 2, 8, 0, 2, 1, -1, 9, 0, 1, 1, 2, .0010463109938427806, .5271229147911072, .2583065927028656, 0, 3, 10, 16, 4, 4, -1, 12, 16, 2, 2, 2, 10, 18, 2, 2, 2, .00026317298761568964, .4235304892063141, .5735440850257874, 0, 2, 9, 6, 2, 3, -1, 10, 6, 1, 3, 2, -.0036173160187900066, .6934396028518677, .4495444893836975, 0, 2, 4, 5, 12, 2, -1, 8, 5, 4, 2, 3, .0114218797534704, .590092122554779, .4138193130493164, 0, 2, 8, 7, 3, 5, -1, 9, 7, 1, 5, 3, -.0019963278900831938, .6466382741928101, .4327239990234375, 27.153350830078125, 56, 0, 2, 6, 4, 8, 6, -1, 6, 6, 8, 2, 3, -.00996912457048893, .6142324209213257, .2482212036848068, 0, 2, 9, 5, 2, 12, -1, 9, 11, 2, 6, 2, .0007307305932044983, .5704951882362366, .2321965992450714, 0, 2, 4, 6, 6, 8, -1, 4, 10, 6, 4, 2, .0006404530140571296, .2112251967191696, .5814933180809021, 0, 2, 12, 2, 8, 5, -1, 12, 2, 4, 5, 2, .004542401991784573, .2950482070446014, .586631178855896, 0, 2, 0, 8, 18, 3, -1, 0, 9, 18, 1, 3, 9247744310414419e-20, .2990990877151489, .5791326761245728, 0, 2, 8, 12, 4, 8, -1, 8, 16, 4, 4, 2, -.008660314604640007, .2813029885292053, .5635542273521423, 0, 2, 0, 2, 8, 5, -1, 4, 2, 4, 5, 2, .008051581680774689, .3535369038581848, .6054757237434387, 0, 2, 13, 11, 3, 4, -1, 13, 13, 3, 2, 2, .00043835240649059415, .5596532225608826, .2731510996818543, 0, 2, 5, 11, 6, 1, -1, 7, 11, 2, 1, 3, -981689736363478e-19, .5978031754493713, .3638561069965363, 0, 2, 11, 3, 3, 1, -1, 12, 3, 1, 1, 3, -.0011298790341243148, .2755252122879028, .5432729125022888, 0, 2, 7, 13, 5, 3, -1, 7, 14, 5, 1, 3, .006435615010559559, .4305641949176788, .7069833278656006, 0, 2, 11, 11, 7, 6, -1, 11, 14, 7, 3, 2, -.0568293295800686, .2495242953300476, .5294997096061707, 0, 2, 2, 11, 7, 6, -1, 2, 14, 7, 3, 2, .004066816996783018, .5478553175926208, .2497723996639252, 0, 2, 12, 14, 2, 6, -1, 12, 16, 2, 2, 3, 481647984997835e-19, .3938601016998291, .5706356167793274, 0, 2, 8, 14, 3, 3, -1, 8, 15, 3, 1, 3, .00617950176820159, .440760612487793, .7394766807556152, 0, 2, 11, 0, 3, 5, -1, 12, 0, 1, 5, 3, .006498575210571289, .5445243120193481, .2479152977466583, 0, 2, 6, 1, 4, 9, -1, 8, 1, 2, 9, 2, -.0010211090557277203, .2544766962528229, .5338971018791199, 0, 2, 10, 3, 6, 1, -1, 12, 3, 2, 1, 3, -.005424752831459045, .2718858122825623, .5324069261550903, 0, 2, 8, 8, 3, 4, -1, 8, 10, 3, 2, 2, -.0010559899965301156, .3178288042545319, .553450882434845, 0, 2, 8, 12, 4, 2, -1, 8, 13, 4, 1, 2, .0006646580877713859, .4284219145774841, .6558194160461426, 0, 2, 5, 18, 4, 2, -1, 5, 19, 4, 1, 2, -.00027524109464138746, .5902860760688782, .3810262978076935, 0, 2, 2, 1, 18, 6, -1, 2, 3, 18, 2, 3, .004229320213198662, .381648987531662, .5709385871887207, 0, 2, 6, 0, 3, 2, -1, 7, 0, 1, 2, 3, -.0032868210691958666, .1747743934392929, .5259544253349304, 0, 3, 13, 8, 6, 2, -1, 16, 8, 3, 1, 2, 13, 9, 3, 1, 2, .0001561187964398414, .3601722121238709, .5725612044334412, 0, 2, 6, 10, 3, 6, -1, 6, 13, 3, 3, 2, -7362138148891972e-21, .540185809135437, .3044497072696686, 0, 3, 0, 13, 20, 4, -1, 10, 13, 10, 2, 2, 0, 15, 10, 2, 2, -.014767250046134, .3220770061016083, .5573434829711914, 0, 2, 7, 7, 6, 5, -1, 9, 7, 2, 5, 3, .0244895908981562, .4301528036594391, .6518812775611877, 0, 2, 11, 0, 2, 2, -1, 11, 1, 2, 1, 2, -.000376520911231637, .356458306312561, .5598236918449402, 0, 3, 1, 8, 6, 2, -1, 1, 8, 3, 1, 2, 4, 9, 3, 1, 2, 736576885174145e-20, .3490782976150513, .556189775466919, 0, 3, 0, 2, 20, 2, -1, 10, 2, 10, 1, 2, 0, 3, 10, 1, 2, -.0150999398902059, .1776272058486939, .5335299968719482, 0, 2, 7, 14, 5, 3, -1, 7, 15, 5, 1, 3, -.0038316650316119194, .6149687767028809, .4221394062042236, 0, 3, 7, 13, 6, 6, -1, 10, 13, 3, 3, 2, 7, 16, 3, 3, 2, .0169254001230001, .5413014888763428, .2166585028171539, 0, 2, 9, 12, 2, 3, -1, 9, 13, 2, 1, 3, -.003047785023227334, .6449490785598755, .4354617893695831, 0, 2, 16, 11, 1, 6, -1, 16, 13, 1, 2, 3, .003214058931916952, .5400155186653137, .3523217141628265, 0, 2, 3, 11, 1, 6, -1, 3, 13, 1, 2, 3, -.004002320114523172, .2774524092674255, .5338417291641235, 0, 3, 4, 4, 14, 12, -1, 11, 4, 7, 6, 2, 4, 10, 7, 6, 2, .0074182129465043545, .567673921585083, .3702817857265472, 0, 2, 5, 4, 3, 3, -1, 5, 5, 3, 1, 3, -.008876458741724491, .7749221920967102, .4583688974380493, 0, 2, 12, 3, 3, 3, -1, 13, 3, 1, 3, 3, .002731173997744918, .5338721871376038, .3996661007404327, 0, 2, 6, 6, 8, 3, -1, 6, 7, 8, 1, 3, -.0025082379579544067, .5611963272094727, .377749890089035, 0, 2, 12, 3, 3, 3, -1, 13, 3, 1, 3, 3, -.008054107427597046, .291522890329361, .5179182887077332, 0, 3, 3, 1, 4, 10, -1, 3, 1, 2, 5, 2, 5, 6, 2, 5, 2, -.0009793881326913834, .5536432862281799, .3700192868709564, 0, 2, 5, 7, 10, 2, -1, 5, 7, 5, 2, 2, -.005874590948224068, .3754391074180603, .5679376125335693, 0, 2, 8, 7, 3, 3, -1, 9, 7, 1, 3, 3, -.00449367193505168, .7019699215888977, .4480949938297272, 0, 2, 15, 12, 2, 3, -1, 15, 13, 2, 1, 3, -.00543892290443182, .2310364991426468, .5313386917114258, 0, 2, 7, 8, 3, 4, -1, 8, 8, 1, 4, 3, -.0007509464048780501, .5864868760108948, .4129343032836914, 0, 2, 13, 4, 1, 12, -1, 13, 10, 1, 6, 2, 14528800420521293e-21, .3732407093048096, .5619621276855469, 0, 3, 4, 5, 12, 12, -1, 4, 5, 6, 6, 2, 10, 11, 6, 6, 2, .0407580696046352, .5312091112136841, .2720521986484528, 0, 2, 7, 14, 7, 3, -1, 7, 15, 7, 1, 3, .006650593131780624, .4710015952587128, .6693493723869324, 0, 2, 3, 12, 2, 3, -1, 3, 13, 2, 1, 3, .0045759351924061775, .5167819261550903, .1637275964021683, 0, 3, 3, 2, 14, 2, -1, 10, 2, 7, 1, 2, 3, 3, 7, 1, 2, .0065269311890006065, .5397608876228333, .2938531935214996, 0, 2, 0, 1, 3, 10, -1, 1, 1, 1, 10, 3, -.0136603796854615, .7086488008499146, .453220009803772, 0, 2, 9, 0, 6, 5, -1, 11, 0, 2, 5, 3, .0273588690906763, .5206481218338013, .3589231967926025, 0, 2, 5, 7, 6, 2, -1, 8, 7, 3, 2, 2, .0006219755159690976, .3507075905799866, .5441123247146606, 0, 2, 7, 1, 6, 10, -1, 7, 6, 6, 5, 2, -.0033077080734074116, .5859522819519043, .402489185333252, 0, 2, 1, 1, 18, 3, -1, 7, 1, 6, 3, 3, -.0106311095878482, .6743267178535461, .4422602951526642, 0, 2, 16, 3, 3, 6, -1, 16, 5, 3, 2, 3, .0194416493177414, .5282716155052185, .1797904968261719, 34.55411148071289, 71, 0, 2, 6, 3, 7, 6, -1, 6, 6, 7, 3, 2, -.005505216773599386, .5914731025695801, .2626559138298035, 0, 2, 4, 7, 12, 2, -1, 8, 7, 4, 2, 3, .001956227933987975, .2312581986188889, .5741627216339111, 0, 2, 0, 4, 17, 10, -1, 0, 9, 17, 5, 2, -.008892478421330452, .1656530052423477, .5626654028892517, 0, 2, 3, 4, 15, 16, -1, 3, 12, 15, 8, 2, .0836383774876595, .5423449873924255, .1957294940948486, 0, 2, 7, 15, 6, 4, -1, 7, 17, 6, 2, 2, .0012282270472496748, .3417904078960419, .5992503762245178, 0, 2, 15, 2, 4, 9, -1, 15, 2, 2, 9, 2, .0057629169896245, .3719581961631775, .6079903841018677, 0, 2, 2, 3, 3, 2, -1, 2, 4, 3, 1, 2, -.0016417410224676132, .2577486038208008, .5576915740966797, 0, 2, 13, 6, 7, 9, -1, 13, 9, 7, 3, 3, .0034113149158656597, .2950749099254608, .5514171719551086, 0, 2, 8, 11, 4, 3, -1, 8, 12, 4, 1, 3, -.0110693201422691, .7569358944892883, .4477078914642334, 0, 3, 0, 2, 20, 6, -1, 10, 2, 10, 3, 2, 0, 5, 10, 3, 2, .0348659716546535, .5583708882331848, .2669621109962463, 0, 3, 3, 2, 6, 10, -1, 3, 2, 3, 5, 2, 6, 7, 3, 5, 2, .0006570109981112182, .5627313256263733, .2988890111446381, 0, 2, 13, 10, 3, 4, -1, 13, 12, 3, 2, 2, -.0243391301482916, .2771185040473938, .5108863115310669, 0, 2, 4, 10, 3, 4, -1, 4, 12, 3, 2, 2, .0005943520227447152, .5580651760101318, .3120341897010803, 0, 2, 7, 5, 6, 3, -1, 9, 5, 2, 3, 3, .0022971509024500847, .3330250084400177, .5679075717926025, 0, 2, 7, 6, 6, 8, -1, 7, 10, 6, 4, 2, -.0037801829166710377, .2990534901618958, .5344808101654053, 0, 2, 0, 11, 20, 6, -1, 0, 14, 20, 3, 2, -.13420669734478, .1463858932256699, .5392568111419678, 0, 3, 4, 13, 4, 6, -1, 4, 13, 2, 3, 2, 6, 16, 2, 3, 2, .0007522454834543169, .3746953904628754, .5692734718322754, 0, 3, 6, 0, 8, 12, -1, 10, 0, 4, 6, 2, 6, 6, 4, 6, 2, -.040545541793108, .2754747867584229, .5484297871589661, 0, 2, 2, 0, 15, 2, -1, 2, 1, 15, 1, 2, .0012572970008477569, .3744584023952484, .5756075978279114, 0, 2, 9, 12, 2, 3, -1, 9, 13, 2, 1, 3, -.007424994837492704, .7513859272003174, .4728231132030487, 0, 2, 3, 12, 1, 2, -1, 3, 13, 1, 1, 2, .0005090812919661403, .540489673614502, .2932321131229401, 0, 2, 9, 11, 2, 3, -1, 9, 12, 2, 1, 3, -.001280845026485622, .6169779896736145, .4273349046707153, 0, 2, 7, 3, 3, 1, -1, 8, 3, 1, 1, 3, -.0018348860321566463, .2048496007919312, .5206472277641296, 0, 2, 17, 7, 3, 6, -1, 17, 9, 3, 2, 3, .0274848695844412, .5252984762191772, .1675522029399872, 0, 2, 7, 2, 3, 2, -1, 8, 2, 1, 2, 3, .0022372419480234385, .5267782807350159, .2777658104896545, 0, 2, 11, 4, 5, 3, -1, 11, 5, 5, 1, 3, -.008863529190421104, .69545578956604, .4812048971652985, 0, 2, 4, 4, 5, 3, -1, 4, 5, 5, 1, 3, .004175397101789713, .4291887879371643, .6349195837974548, 0, 2, 19, 3, 1, 2, -1, 19, 4, 1, 1, 2, -.0017098189564421773, .2930536866188049, .5361248850822449, 0, 2, 5, 5, 4, 3, -1, 5, 6, 4, 1, 3, .006532854866236448, .4495325088500977, .7409694194793701, 0, 2, 17, 7, 3, 6, -1, 17, 9, 3, 2, 3, -.009537290781736374, .3149119913578033, .5416501760482788, 0, 2, 0, 7, 3, 6, -1, 0, 9, 3, 2, 3, .0253109894692898, .5121892094612122, .1311707943677902, 0, 2, 14, 2, 6, 9, -1, 14, 5, 6, 3, 3, .0364609695971012, .5175911784172058, .2591339945793152, 0, 2, 0, 4, 5, 6, -1, 0, 6, 5, 2, 3, .0208543296903372, .5137140154838562, .1582316011190414, 0, 2, 10, 5, 6, 2, -1, 12, 5, 2, 2, 3, -.0008720774785615504, .5574309825897217, .439897894859314, 0, 2, 4, 5, 6, 2, -1, 6, 5, 2, 2, 3, -15227000403683633e-21, .5548940896987915, .3708069920539856, 0, 2, 8, 1, 4, 6, -1, 8, 3, 4, 2, 3, -.0008431650931015611, .3387419879436493, .5554211139678955, 0, 2, 0, 2, 3, 6, -1, 0, 4, 3, 2, 3, .0036037859972566366, .5358061790466309, .3411171138286591, 0, 2, 6, 6, 8, 3, -1, 6, 7, 8, 1, 3, -.006805789191275835, .6125202775001526, .4345862865447998, 0, 2, 0, 1, 5, 9, -1, 0, 4, 5, 3, 3, -.0470216609537601, .2358165979385376, .519373893737793, 0, 2, 16, 0, 4, 15, -1, 16, 0, 2, 15, 2, -.0369541086256504, .7323111295700073, .4760943949222565, 0, 2, 1, 10, 3, 2, -1, 1, 11, 3, 1, 2, .0010439479956403375, .5419455170631409, .3411330878734589, 0, 2, 14, 4, 1, 10, -1, 14, 9, 1, 5, 2, -.00021050689974799752, .2821694016456604, .5554947257041931, 0, 2, 0, 1, 4, 12, -1, 2, 1, 2, 12, 2, -.0808315873146057, .9129930138587952, .4697434902191162, 0, 2, 11, 11, 4, 2, -1, 11, 11, 2, 2, 2, -.0003657905908767134, .6022670269012451, .3978292942047119, 0, 2, 5, 11, 4, 2, -1, 7, 11, 2, 2, 2, -.00012545920617412776, .5613213181495667, .384553998708725, 0, 2, 3, 8, 15, 5, -1, 8, 8, 5, 5, 3, -.0687864869832993, .2261611968278885, .5300496816635132, 0, 2, 0, 0, 6, 10, -1, 3, 0, 3, 10, 2, .0124157899990678, .4075691998004913, .5828812122344971, 0, 2, 11, 4, 3, 2, -1, 12, 4, 1, 2, 3, -.004717481788247824, .2827253937721252, .5267757773399353, 0, 2, 8, 12, 3, 8, -1, 8, 16, 3, 4, 2, .0381368584930897, .5074741244316101, .1023615971207619, 0, 2, 8, 14, 5, 3, -1, 8, 15, 5, 1, 3, -.0028168049175292253, .6169006824493408, .4359692931175232, 0, 2, 7, 14, 4, 3, -1, 7, 15, 4, 1, 3, .008130360394716263, .4524433016777039, .76060950756073, 0, 2, 11, 4, 3, 2, -1, 12, 4, 1, 2, 3, .006005601957440376, .5240408778190613, .185971200466156, 0, 3, 3, 15, 14, 4, -1, 3, 15, 7, 2, 2, 10, 17, 7, 2, 2, .0191393196582794, .5209379196166992, .2332071959972382, 0, 3, 2, 2, 16, 4, -1, 10, 2, 8, 2, 2, 2, 4, 8, 2, 2, .0164457596838474, .5450702905654907, .3264234960079193, 0, 2, 0, 8, 6, 12, -1, 3, 8, 3, 12, 2, -.0373568907380104, .6999046802520752, .4533241987228394, 0, 2, 5, 7, 10, 2, -1, 5, 7, 5, 2, 2, -.0197279006242752, .2653664946556091, .54128098487854, 0, 2, 9, 7, 2, 5, -1, 10, 7, 1, 5, 2, .0066972579807043076, .4480566084384918, .7138652205467224, 0, 3, 13, 7, 6, 4, -1, 16, 7, 3, 2, 2, 13, 9, 3, 2, 2, .0007445752853527665, .4231350123882294, .5471320152282715, 0, 2, 0, 13, 8, 2, -1, 0, 14, 8, 1, 2, .0011790640419349074, .5341702103614807, .3130455017089844, 0, 3, 13, 7, 6, 4, -1, 16, 7, 3, 2, 2, 13, 9, 3, 2, 2, .0349806100130081, .5118659734725952, .343053013086319, 0, 3, 1, 7, 6, 4, -1, 1, 7, 3, 2, 2, 4, 9, 3, 2, 2, .0005685979267582297, .3532187044620514, .5468639731407166, 0, 2, 12, 6, 1, 12, -1, 12, 12, 1, 6, 2, -.0113406497985125, .2842353880405426, .5348700881004333, 0, 2, 9, 5, 2, 6, -1, 10, 5, 1, 6, 2, -.00662281084805727, .6883640289306641, .4492664933204651, 0, 2, 14, 12, 2, 3, -1, 14, 13, 2, 1, 3, -.008016033098101616, .1709893941879273, .5224308967590332, 0, 2, 4, 12, 2, 3, -1, 4, 13, 2, 1, 3, .0014206819469109178, .5290846228599548, .299338310956955, 0, 2, 8, 12, 4, 3, -1, 8, 13, 4, 1, 3, -.002780171111226082, .6498854160308838, .4460499882698059, 0, 3, 5, 2, 2, 4, -1, 5, 2, 1, 2, 2, 6, 4, 1, 2, 2, -.0014747589593753219, .3260438144207001, .5388113260269165, 0, 2, 5, 5, 11, 3, -1, 5, 6, 11, 1, 3, -.0238303393125534, .7528941035270691, .4801219999790192, 0, 2, 7, 6, 4, 12, -1, 7, 12, 4, 6, 2, .00693697901442647, .5335165858268738, .3261427879333496, 0, 2, 12, 13, 8, 5, -1, 12, 13, 4, 5, 2, .008280625566840172, .458039402961731, .5737829804420471, 0, 2, 7, 6, 1, 12, -1, 7, 12, 1, 6, 2, -.0104395002126694, .2592320144176483, .5233827829360962, 39.1072883605957, 80, 0, 2, 1, 2, 6, 3, -1, 4, 2, 3, 3, 2, .0072006587870419025, .325888603925705, .6849808096885681, 0, 3, 9, 5, 6, 10, -1, 12, 5, 3, 5, 2, 9, 10, 3, 5, 2, -.002859358908608556, .5838881134986877, .2537829875946045, 0, 3, 5, 5, 8, 12, -1, 5, 5, 4, 6, 2, 9, 11, 4, 6, 2, .0006858052802272141, .5708081722259521, .2812424004077911, 0, 2, 0, 7, 20, 6, -1, 0, 9, 20, 2, 3, .007958019152283669, .2501051127910614, .5544260740280151, 0, 2, 4, 2, 2, 2, -1, 4, 3, 2, 1, 2, -.0012124150525778532, .2385368049144745, .5433350205421448, 0, 2, 4, 18, 12, 2, -1, 8, 18, 4, 2, 3, .00794261321425438, .3955070972442627, .6220757961273193, 0, 2, 7, 4, 4, 16, -1, 7, 12, 4, 8, 2, .0024630590341985226, .5639708042144775, .2992357909679413, 0, 2, 7, 6, 7, 8, -1, 7, 10, 7, 4, 2, -.006039659958332777, .218651294708252, .541167676448822, 0, 2, 6, 3, 3, 1, -1, 7, 3, 1, 1, 3, -.0012988339876756072, .23507060110569, .5364584922790527, 0, 2, 11, 15, 2, 4, -1, 11, 17, 2, 2, 2, .00022299369447864592, .380411297082901, .572960615158081, 0, 2, 3, 5, 4, 8, -1, 3, 9, 4, 4, 2, .0014654280385002494, .2510167956352234, .5258268713951111, 0, 2, 7, 1, 6, 12, -1, 7, 7, 6, 6, 2, -.0008121004211716354, .5992823839187622, .3851158916950226, 0, 2, 4, 6, 6, 2, -1, 6, 6, 2, 2, 3, -.0013836020370945334, .5681396126747131, .3636586964130402, 0, 2, 16, 4, 4, 6, -1, 16, 6, 4, 2, 3, -.0279364492744207, .1491317003965378, .5377560257911682, 0, 2, 3, 3, 5, 2, -1, 3, 4, 5, 1, 2, -.0004691955109592527, .3692429959774017, .5572484731674194, 0, 2, 9, 11, 2, 3, -1, 9, 12, 2, 1, 3, -.004982965998351574, .6758509278297424, .4532504081726074, 0, 2, 2, 16, 4, 2, -1, 2, 17, 4, 1, 2, .001881530974060297, .5368022918701172, .2932539880275726, 0, 3, 7, 13, 6, 6, -1, 10, 13, 3, 3, 2, 7, 16, 3, 3, 2, -.0190675500780344, .1649377048015595, .5330067276954651, 0, 2, 7, 0, 3, 4, -1, 8, 0, 1, 4, 3, -.0046906559728085995, .1963925957679749, .5119361877441406, 0, 2, 8, 15, 4, 3, -1, 8, 16, 4, 1, 3, .005977713968604803, .467117190361023, .7008398175239563, 0, 2, 0, 4, 4, 6, -1, 0, 6, 4, 2, 3, -.0333031304180622, .1155416965484619, .5104162096977234, 0, 2, 5, 6, 12, 3, -1, 9, 6, 4, 3, 3, .0907441079616547, .5149660110473633, .1306173056364059, 0, 2, 7, 6, 6, 14, -1, 9, 6, 2, 14, 3, .0009355589863844216, .3605481088161469, .543985903263092, 0, 2, 9, 7, 3, 3, -1, 10, 7, 1, 3, 3, .0149016501381993, .4886212050914764, .7687569856643677, 0, 2, 6, 12, 2, 4, -1, 6, 14, 2, 2, 2, .0006159411859698594, .5356813073158264, .3240939080715179, 0, 2, 10, 12, 7, 6, -1, 10, 14, 7, 2, 3, -.0506709888577461, .1848621964454651, .5230404138565063, 0, 2, 1, 0, 15, 2, -1, 1, 1, 15, 1, 2, .0006866574985906482, .3840579986572266, .5517945885658264, 0, 2, 14, 0, 6, 6, -1, 14, 0, 3, 6, 2, .008371243253350258, .4288564026355743, .6131753921508789, 0, 2, 5, 3, 3, 1, -1, 6, 3, 1, 1, 3, -.0012953069526702166, .2913674116134644, .528073787689209, 0, 2, 14, 0, 6, 6, -1, 14, 0, 3, 6, 2, -.0419416800141335, .7554799914360046, .4856030941009522, 0, 2, 0, 3, 20, 10, -1, 0, 8, 20, 5, 2, -.0235293805599213, .2838279902935028, .5256081223487854, 0, 2, 14, 0, 6, 6, -1, 14, 0, 3, 6, 2, .0408574491739273, .4870935082435608, .6277297139167786, 0, 2, 0, 0, 6, 6, -1, 3, 0, 3, 6, 2, -.0254068691283464, .7099707722663879, .4575029015541077, 0, 2, 19, 15, 1, 2, -1, 19, 16, 1, 1, 2, -.00041415440500713885, .4030886888504028, .5469412207603455, 0, 2, 0, 2, 4, 8, -1, 2, 2, 2, 8, 2, .0218241196125746, .4502024054527283, .6768701076507568, 0, 3, 2, 1, 18, 4, -1, 11, 1, 9, 2, 2, 2, 3, 9, 2, 2, .0141140399500728, .5442860722541809, .3791700005531311, 0, 2, 8, 12, 1, 2, -1, 8, 13, 1, 1, 2, 6721459067193791e-20, .4200463891029358, .5873476266860962, 0, 3, 5, 2, 10, 6, -1, 10, 2, 5, 3, 2, 5, 5, 5, 3, 2, -.00794176384806633, .3792561888694763, .5585265755653381, 0, 2, 9, 7, 2, 4, -1, 10, 7, 1, 4, 2, -.00721444096416235, .7253103852272034, .4603548943996429, 0, 2, 9, 7, 3, 3, -1, 10, 7, 1, 3, 3, .002581733977422118, .4693301916122437, .5900238752365112, 0, 2, 4, 5, 12, 8, -1, 8, 5, 4, 8, 3, .1340931951999664, .5149213075637817, .1808844953775406, 0, 2, 15, 15, 4, 3, -1, 15, 16, 4, 1, 3, .0022962710354477167, .5399743914604187, .3717867136001587, 0, 2, 8, 18, 3, 1, -1, 9, 18, 1, 1, 3, -.002157584996894002, .2408495992422104, .5148863792419434, 0, 2, 9, 13, 4, 3, -1, 9, 14, 4, 1, 3, -.004919618833810091, .6573588252067566, .4738740026950836, 0, 2, 7, 13, 4, 3, -1, 7, 14, 4, 1, 3, .0016267469618469477, .4192821979522705, .6303114295005798, 0, 2, 19, 15, 1, 2, -1, 19, 16, 1, 1, 2, .00033413388882763684, .5540298223495483, .3702101111412048, 0, 2, 0, 15, 8, 4, -1, 0, 17, 8, 2, 2, -.0266980808228254, .1710917949676514, .5101410746574402, 0, 2, 9, 3, 6, 4, -1, 11, 3, 2, 4, 3, -.0305618792772293, .1904218047857285, .5168793797492981, 0, 2, 8, 14, 4, 3, -1, 8, 15, 4, 1, 3, .002851154888048768, .4447506964206696, .6313853859901428, 0, 2, 3, 14, 14, 6, -1, 3, 16, 14, 2, 3, -.0362114794552326, .2490727007389069, .5377349257469177, 0, 2, 6, 3, 6, 6, -1, 6, 6, 6, 3, 2, -.002411518944427371, .5381243228912354, .3664236962795258, 0, 2, 5, 11, 10, 6, -1, 5, 14, 10, 3, 2, -.0007725320174358785, .5530232191085815, .3541550040245056, 0, 2, 3, 10, 3, 4, -1, 4, 10, 1, 4, 3, .0002948172914329916, .4132699072360992, .5667243003845215, 0, 2, 13, 9, 2, 2, -1, 13, 9, 1, 2, 2, -.006233456078916788, .0987872332334518, .5198668837547302, 0, 2, 5, 3, 6, 4, -1, 7, 3, 2, 4, 3, -.0262747295200825, .0911274924874306, .5028107166290283, 0, 2, 9, 7, 3, 3, -1, 10, 7, 1, 3, 3, .005321226082742214, .4726648926734924, .6222720742225647, 0, 2, 2, 12, 2, 3, -1, 2, 13, 2, 1, 3, -.004112905822694302, .2157457023859024, .5137804746627808, 0, 2, 9, 8, 3, 12, -1, 9, 12, 3, 4, 3, .0032457809429615736, .5410770773887634, .3721776902675629, 0, 3, 3, 14, 4, 6, -1, 3, 14, 2, 3, 2, 5, 17, 2, 3, 2, -.0163597092032433, .7787874937057495, .4685291945934296, 0, 2, 16, 15, 2, 2, -1, 16, 16, 2, 1, 2, .00032166109303943813, .5478987097740173, .4240373969078064, 0, 2, 2, 15, 2, 2, -1, 2, 16, 2, 1, 2, .000644524407107383, .5330560803413391, .3501324951648712, 0, 2, 8, 12, 4, 3, -1, 8, 13, 4, 1, 3, -.0078909732401371, .6923521161079407, .4726569056510925, 0, 2, 0, 7, 20, 1, -1, 10, 7, 10, 1, 2, .048336211591959, .50559002161026, .0757492035627365, 0, 2, 7, 6, 8, 3, -1, 7, 6, 4, 3, 2, -.000751781277358532, .3783741891384125, .5538573861122131, 0, 2, 5, 7, 8, 2, -1, 9, 7, 4, 2, 2, -.002495391061529517, .3081651031970978, .5359612107276917, 0, 2, 9, 7, 3, 5, -1, 10, 7, 1, 5, 3, -.0022385010961443186, .663395881652832, .4649342894554138, 0, 2, 8, 7, 3, 5, -1, 9, 7, 1, 5, 3, -.0017988430336117744, .6596844792366028, .4347187876701355, 0, 2, 11, 1, 3, 5, -1, 12, 1, 1, 5, 3, .008786091580986977, .523183286190033, .2315579950809479, 0, 2, 6, 2, 3, 6, -1, 7, 2, 1, 6, 3, .003671538084745407, .520425021648407, .2977376878261566, 0, 2, 14, 14, 6, 5, -1, 14, 14, 3, 5, 2, -.0353364497423172, .7238878011703491, .4861505031585693, 0, 2, 9, 8, 2, 2, -1, 9, 9, 2, 1, 2, -.0006918924045749009, .3105022013187408, .5229824781417847, 0, 2, 10, 7, 1, 3, -1, 10, 8, 1, 1, 3, -.003394610946998, .3138968050479889, .5210173726081848, 0, 3, 6, 6, 2, 2, -1, 6, 6, 1, 1, 2, 7, 7, 1, 1, 2, .0009856928372755647, .4536580145359039, .6585097908973694, 0, 3, 2, 11, 18, 4, -1, 11, 11, 9, 2, 2, 2, 13, 9, 2, 2, -.0501631014049053, .1804454028606415, .5198916792869568, 0, 3, 6, 6, 2, 2, -1, 6, 6, 1, 1, 2, 7, 7, 1, 1, 2, -.0022367259953171015, .7255702018737793, .4651359021663666, 0, 2, 0, 15, 20, 2, -1, 0, 16, 20, 1, 2, .0007432628772221506, .4412921071052551, .5898545980453491, 0, 2, 4, 14, 2, 3, -1, 4, 15, 2, 1, 3, -.0009348518215119839, .3500052988529205, .5366017818450928, 0, 2, 8, 14, 4, 3, -1, 8, 15, 4, 1, 3, .0174979399889708, .4912194907665253, .8315284848213196, 0, 2, 8, 7, 2, 3, -1, 8, 8, 2, 1, 3, -.0015200000489130616, .3570275902748108, .537056028842926, 0, 2, 9, 10, 2, 3, -1, 9, 11, 2, 1, 3, .0007800394087098539, .4353772103786469, .5967335104942322, 50.61048126220703, 103, 0, 2, 5, 4, 10, 4, -1, 5, 6, 10, 2, 2, -.00999455526471138, .6162583231925964, .3054533004760742, 0, 3, 9, 7, 6, 4, -1, 12, 7, 3, 2, 2, 9, 9, 3, 2, 2, -.001108522992581129, .5818294882774353, .3155578076839447, 0, 2, 4, 7, 3, 6, -1, 4, 9, 3, 2, 3, .001036438043229282, .2552052140235901, .5692911744117737, 0, 3, 11, 15, 4, 4, -1, 13, 15, 2, 2, 2, 11, 17, 2, 2, 2, .000682113110087812, .3685089945793152, .5934931039810181, 0, 2, 7, 8, 4, 2, -1, 7, 9, 4, 1, 2, -.0006805734010413289, .2332392036914825, .5474792122840881, 0, 2, 13, 1, 4, 3, -1, 13, 1, 2, 3, 2, .0002606878988444805, .325745701789856, .5667545795440674, 0, 3, 5, 15, 4, 4, -1, 5, 15, 2, 2, 2, 7, 17, 2, 2, 2, .0005160737200640142, .3744716942310333, .5845472812652588, 0, 2, 9, 5, 4, 7, -1, 9, 5, 2, 7, 2, .0008500752155669034, .3420371115207672, .5522807240486145, 0, 2, 5, 6, 8, 3, -1, 9, 6, 4, 3, 2, -.0018607829697430134, .2804419994354248, .5375424027442932, 0, 2, 9, 9, 2, 2, -1, 9, 10, 2, 1, 2, -.001503397012129426, .2579050958156586, .5498952269554138, 0, 2, 7, 15, 5, 3, -1, 7, 16, 5, 1, 3, .0023478909861296415, .4175156056880951, .6313710808753967, 0, 2, 11, 10, 4, 3, -1, 11, 10, 2, 3, 2, -.00028880240279249847, .5865169763565063, .4052666127681732, 0, 2, 6, 9, 8, 10, -1, 6, 14, 8, 5, 2, .008940547704696655, .5211141109466553, .231865406036377, 0, 2, 10, 11, 6, 2, -1, 10, 11, 3, 2, 2, -.0193277392536402, .2753432989120483, .5241525769233704, 0, 2, 4, 11, 6, 2, -1, 7, 11, 3, 2, 2, -.0002020206011366099, .5722978711128235, .3677195906639099, 0, 2, 11, 3, 8, 1, -1, 11, 3, 4, 1, 2, .002117906929925084, .4466108083724976, .5542430877685547, 0, 2, 6, 3, 3, 2, -1, 7, 3, 1, 2, 3, -.0017743760254234076, .2813253104686737, .5300959944725037, 0, 2, 14, 5, 6, 5, -1, 14, 5, 3, 5, 2, .004223445896059275, .439970999956131, .5795428156852722, 0, 2, 7, 5, 2, 12, -1, 7, 11, 2, 6, 2, -.0143752200528979, .2981117963790894, .5292059183120728, 0, 2, 8, 11, 4, 3, -1, 8, 12, 4, 1, 3, -.0153491804376245, .7705215215682983, .4748171865940094, 0, 2, 4, 1, 2, 3, -1, 5, 1, 1, 3, 2, 15152279956964776e-21, .3718844056129456, .5576897263526917, 0, 2, 18, 3, 2, 6, -1, 18, 5, 2, 2, 3, -.009129391983151436, .3615196049213409, .5286766886711121, 0, 2, 0, 3, 2, 6, -1, 0, 5, 2, 2, 3, .0022512159775942564, .5364704728126526, .3486298024654388, 0, 2, 9, 12, 2, 3, -1, 9, 13, 2, 1, 3, -.0049696918576955795, .6927651762962341, .4676836133003235, 0, 2, 7, 13, 4, 3, -1, 7, 14, 4, 1, 3, -.0128290103748441, .7712153792381287, .4660735130310059, 0, 2, 18, 0, 2, 6, -1, 18, 2, 2, 2, 3, -.009366006590425968, .3374983966350555, .5351287722587585, 0, 2, 0, 0, 2, 6, -1, 0, 2, 2, 2, 3, .0032452319283038378, .5325189828872681, .3289610147476196, 0, 2, 8, 14, 6, 3, -1, 8, 15, 6, 1, 3, -.0117235602810979, .6837652921676636, .4754300117492676, 0, 2, 7, 4, 2, 4, -1, 8, 4, 1, 4, 2, 2925794069597032e-20, .357208788394928, .5360502004623413, 0, 2, 8, 5, 4, 6, -1, 8, 7, 4, 2, 3, -22244219508138485e-21, .5541427135467529, .3552064001560211, 0, 2, 6, 4, 2, 2, -1, 7, 4, 1, 2, 2, .005088150966912508, .5070844292640686, .1256462037563324, 0, 3, 3, 14, 14, 4, -1, 10, 14, 7, 2, 2, 3, 16, 7, 2, 2, .0274296794086695, .5269560217857361, .1625818014144898, 0, 3, 6, 15, 6, 2, -1, 6, 15, 3, 1, 2, 9, 16, 3, 1, 2, -.00641428679227829, .7145588994026184, .4584197103977203, 0, 2, 14, 15, 6, 2, -1, 14, 16, 6, 1, 2, .003347995923832059, .5398612022399902, .3494696915149689, 0, 2, 2, 12, 12, 8, -1, 2, 16, 12, 4, 2, -.0826354920864105, .2439192980527878, .5160226225852966, 0, 2, 7, 7, 7, 2, -1, 7, 8, 7, 1, 2, .0010261740535497665, .3886891901493073, .5767908096313477, 0, 2, 0, 2, 18, 2, -1, 0, 3, 18, 1, 2, -.0016307090409100056, .3389458060264587, .5347700715065002, 0, 2, 9, 6, 2, 5, -1, 9, 6, 1, 5, 2, .0024546680506318808, .4601413905620575, .638724684715271, 0, 2, 7, 5, 3, 8, -1, 8, 5, 1, 8, 3, -.0009947651997208595, .5769879221916199, .4120396077632904, 0, 2, 9, 6, 3, 4, -1, 10, 6, 1, 4, 3, .0154091902077198, .4878709018230438, .7089822292327881, 0, 2, 4, 13, 3, 2, -1, 4, 14, 3, 1, 2, .001178440055809915, .5263553261756897, .2895244956016541, 0, 2, 9, 4, 6, 3, -1, 11, 4, 2, 3, 3, -.0277019198983908, .149882897734642, .5219606757164001, 0, 2, 5, 4, 6, 3, -1, 7, 4, 2, 3, 3, -.0295053999871016, .024893319234252, .4999816119670868, 0, 2, 14, 11, 5, 2, -1, 14, 12, 5, 1, 2, .0004515943001024425, .5464622974395752, .4029662907123566, 0, 2, 1, 2, 6, 9, -1, 3, 2, 2, 9, 3, .007177263963967562, .4271056950092316, .5866296887397766, 0, 2, 14, 6, 6, 13, -1, 14, 6, 3, 13, 2, -.0741820484399796, .6874179244041443, .4919027984142304, 0, 3, 3, 6, 14, 8, -1, 3, 6, 7, 4, 2, 10, 10, 7, 4, 2, -.0172541607171297, .3370676040649414, .534873902797699, 0, 2, 16, 0, 4, 11, -1, 16, 0, 2, 11, 2, .0148515598848462, .4626792967319489, .6129904985427856, 0, 3, 3, 4, 12, 12, -1, 3, 4, 6, 6, 2, 9, 10, 6, 6, 2, .0100020002573729, .5346122980117798, .3423453867435455, 0, 2, 11, 4, 5, 3, -1, 11, 5, 5, 1, 3, .0020138120744377375, .4643830060958862, .5824304223060608, 0, 2, 4, 11, 4, 2, -1, 4, 12, 4, 1, 2, .0015135470312088728, .5196396112442017, .2856149971485138, 0, 2, 10, 7, 2, 2, -1, 10, 7, 1, 2, 2, .003138143103569746, .4838162958621979, .5958529710769653, 0, 2, 8, 7, 2, 2, -1, 9, 7, 1, 2, 2, -.005145044066011906, .8920302987098694, .4741412103176117, 0, 2, 9, 17, 3, 2, -1, 10, 17, 1, 2, 3, -.004473670851439238, .2033942937850952, .5337278842926025, 0, 2, 5, 6, 3, 3, -1, 5, 7, 3, 1, 3, .001962847076356411, .457163393497467, .6725863218307495, 0, 2, 10, 0, 3, 3, -1, 11, 0, 1, 3, 3, .005426045041531324, .5271108150482178, .2845670878887177, 0, 3, 5, 6, 6, 2, -1, 5, 6, 3, 1, 2, 8, 7, 3, 1, 2, .0004961146041750908, .4138312935829163, .5718597769737244, 0, 2, 12, 16, 4, 3, -1, 12, 17, 4, 1, 3, .009372878819704056, .5225151181221008, .2804847061634064, 0, 2, 3, 12, 3, 2, -1, 3, 13, 3, 1, 2, .0006050089723430574, .523676872253418, .3314523994922638, 0, 2, 9, 12, 3, 2, -1, 9, 13, 3, 1, 2, .0005679255118593574, .4531059861183167, .6276971101760864, 0, 3, 1, 11, 16, 4, -1, 1, 11, 8, 2, 2, 9, 13, 8, 2, 2, .0246443394571543, .5130851864814758, .2017143964767456, 0, 2, 12, 4, 3, 3, -1, 12, 5, 3, 1, 3, -.0102904504165053, .7786595225334167, .4876641035079956, 0, 2, 4, 4, 5, 3, -1, 4, 5, 5, 1, 3, .002062941901385784, .4288598895072937, .5881264209747314, 0, 2, 12, 16, 4, 3, -1, 12, 17, 4, 1, 3, -.005051948130130768, .3523977994918823, .5286008715629578, 0, 2, 5, 4, 3, 3, -1, 5, 5, 3, 1, 3, -.0057692620903253555, .6841086149215698, .4588094055652618, 0, 2, 9, 0, 2, 2, -1, 9, 1, 2, 1, 2, -.0004578994121402502, .356552004814148, .5485978126525879, 0, 2, 8, 9, 4, 2, -1, 8, 10, 4, 1, 2, -.0007591883768327534, .336879312992096, .5254197120666504, 0, 2, 8, 8, 4, 3, -1, 8, 9, 4, 1, 3, -.001773725962266326, .3422161042690277, .5454015135765076, 0, 2, 0, 13, 6, 3, -1, 2, 13, 2, 3, 3, -.008561046794056892, .6533612012863159, .4485856890678406, 0, 2, 16, 14, 3, 2, -1, 16, 15, 3, 1, 2, .0017277270089834929, .5307580232620239, .3925352990627289, 0, 2, 1, 18, 18, 2, -1, 7, 18, 6, 2, 3, -.0281996093690395, .685745894908905, .4588584005832672, 0, 2, 16, 14, 3, 2, -1, 16, 15, 3, 1, 2, -.001778110978193581, .4037851095199585, .5369856953620911, 0, 2, 1, 14, 3, 2, -1, 1, 15, 3, 1, 2, .00033177141449414194, .539979875087738, .3705750107765198, 0, 2, 7, 14, 6, 3, -1, 7, 15, 6, 1, 3, .0026385399978607893, .4665437042713165, .6452730894088745, 0, 2, 5, 14, 8, 3, -1, 5, 15, 8, 1, 3, -.0021183069329708815, .5914781093597412, .4064677059650421, 0, 2, 10, 6, 4, 14, -1, 10, 6, 2, 14, 2, -.0147732896730304, .3642038106918335, .5294762849807739, 0, 2, 6, 6, 4, 14, -1, 8, 6, 2, 14, 2, -.0168154407292604, .2664231956005096, .5144972801208496, 0, 2, 13, 5, 2, 3, -1, 13, 6, 2, 1, 3, -.006337014026939869, .6779531240463257, .4852097928524017, 0, 2, 7, 16, 6, 1, -1, 9, 16, 2, 1, 3, -44560048991115764e-21, .5613964796066284, .4153054058551788, 0, 2, 9, 12, 3, 3, -1, 9, 13, 3, 1, 3, -.0010240620467811823, .5964478254318237, .4566304087638855, 0, 2, 7, 0, 3, 3, -1, 8, 0, 1, 3, 3, -.00231616897508502, .2976115047931671, .5188159942626953, 0, 2, 4, 0, 16, 18, -1, 4, 9, 16, 9, 2, .5321757197380066, .5187839269638062, .220263198018074, 0, 2, 1, 1, 16, 14, -1, 1, 8, 16, 7, 2, -.1664305031299591, .1866022944450378, .5060343146324158, 0, 2, 3, 9, 15, 4, -1, 8, 9, 5, 4, 3, .112535297870636, .5212125182151794, .1185022965073586, 0, 2, 6, 12, 7, 3, -1, 6, 13, 7, 1, 3, .009304686449468136, .4589937031269074, .6826149225234985, 0, 2, 14, 15, 2, 3, -1, 14, 16, 2, 1, 3, -.004625509958714247, .3079940974712372, .5225008726119995, 0, 3, 2, 3, 16, 14, -1, 2, 3, 8, 7, 2, 10, 10, 8, 7, 2, -.1111646965146065, .2101044058799744, .5080801844596863, 0, 3, 16, 2, 4, 18, -1, 18, 2, 2, 9, 2, 16, 11, 2, 9, 2, -.0108884396031499, .5765355229377747, .4790464043617249, 0, 2, 4, 15, 2, 3, -1, 4, 16, 2, 1, 3, .005856430158019066, .5065100193023682, .1563598960638046, 0, 3, 16, 2, 4, 18, -1, 18, 2, 2, 9, 2, 16, 11, 2, 9, 2, .0548543892800808, .49669149518013, .7230510711669922, 0, 2, 1, 1, 8, 3, -1, 1, 2, 8, 1, 3, -.0111973397433758, .2194979041814804, .5098798274993896, 0, 2, 8, 11, 4, 3, -1, 8, 12, 4, 1, 3, .004406907130032778, .4778401851654053, .6770902872085571, 0, 2, 5, 11, 5, 9, -1, 5, 14, 5, 3, 3, -.0636652931571007, .1936362981796265, .5081024169921875, 0, 2, 16, 0, 4, 11, -1, 16, 0, 2, 11, 2, -.009808149188756943, .599906325340271, .4810341000556946, 0, 2, 7, 0, 6, 1, -1, 9, 0, 2, 1, 3, -.0021717099007219076, .3338333964347839, .5235472917556763, 0, 2, 16, 3, 3, 7, -1, 17, 3, 1, 7, 3, -.0133155202493072, .6617069840431213, .4919213056564331, 0, 2, 1, 3, 3, 7, -1, 2, 3, 1, 7, 3, .002544207964092493, .4488744139671326, .6082184910774231, 0, 2, 7, 8, 6, 12, -1, 7, 12, 6, 4, 3, .0120378397405148, .540939211845398, .3292432129383087, 0, 2, 0, 0, 4, 11, -1, 2, 0, 2, 11, 2, -.0207010507583618, .6819120049476624, .4594995975494385, 0, 2, 14, 0, 6, 20, -1, 14, 0, 3, 20, 2, .0276082791388035, .4630792140960693, .5767282843589783, 0, 2, 0, 3, 1, 2, -1, 0, 4, 1, 1, 2, .0012370620388537645, .5165379047393799, .2635016143321991, 0, 3, 5, 5, 10, 8, -1, 10, 5, 5, 4, 2, 5, 9, 5, 4, 2, -.037669338285923, .2536393105983734, .5278980135917664, 0, 3, 4, 7, 12, 4, -1, 4, 7, 6, 2, 2, 10, 9, 6, 2, 2, -.0018057259730994701, .3985156118869782, .5517500042915344, 54.62007141113281, 111, 0, 2, 2, 1, 6, 4, -1, 5, 1, 3, 4, 2, .004429902881383896, .2891018092632294, .633522629737854, 0, 3, 9, 7, 6, 4, -1, 12, 7, 3, 2, 2, 9, 9, 3, 2, 2, -.0023813319858163595, .621178925037384, .3477487862110138, 0, 2, 5, 6, 2, 6, -1, 5, 9, 2, 3, 2, .0022915711160749197, .2254412025213242, .5582118034362793, 0, 3, 9, 16, 6, 4, -1, 12, 16, 3, 2, 2, 9, 18, 3, 2, 2, .0009945794008672237, .3711710870265961, .5930070877075195, 0, 2, 9, 4, 2, 12, -1, 9, 10, 2, 6, 2, .0007716466789133847, .565172016620636, .334799587726593, 0, 2, 7, 1, 6, 18, -1, 9, 1, 2, 18, 3, -.001138641033321619, .3069126009941101, .5508630871772766, 0, 2, 4, 12, 12, 2, -1, 8, 12, 4, 2, 3, -.0001640303962631151, .576282799243927, .3699047863483429, 0, 2, 8, 8, 6, 2, -1, 8, 9, 6, 1, 2, 29793529392918572e-21, .2644244134426117, .5437911152839661, 0, 2, 8, 0, 3, 6, -1, 9, 0, 1, 6, 3, .008577490225434303, .5051138997077942, .1795724928379059, 0, 2, 11, 18, 3, 2, -1, 11, 19, 3, 1, 2, -.0002603268949314952, .5826969146728516, .4446826875209808, 0, 2, 1, 1, 17, 4, -1, 1, 3, 17, 2, 2, -.006140463054180145, .3113852143287659, .5346971750259399, 0, 2, 11, 8, 4, 12, -1, 11, 8, 2, 12, 2, -.0230869501829147, .32779461145401, .533119797706604, 0, 2, 8, 14, 4, 3, -1, 8, 15, 4, 1, 3, -.0142436502501369, .7381709814071655, .4588063061237335, 0, 2, 12, 3, 2, 17, -1, 12, 3, 1, 17, 2, .0194871295243502, .5256630778312683, .2274471968412399, 0, 2, 4, 7, 6, 1, -1, 6, 7, 2, 1, 3, -.0009668110869824886, .5511230826377869, .3815006911754608, 0, 2, 18, 3, 2, 3, -1, 18, 4, 2, 1, 3, .003147470997646451, .5425636768341064, .2543726861476898, 0, 2, 8, 4, 3, 4, -1, 8, 6, 3, 2, 2, -.00018026070029009134, .5380191802978516, .3406304121017456, 0, 2, 4, 5, 12, 10, -1, 4, 10, 12, 5, 2, -.006026626098901033, .3035801947116852, .54205721616745, 0, 2, 5, 18, 4, 2, -1, 7, 18, 2, 2, 2, .00044462960795499384, .3990997076034546, .5660110116004944, 0, 2, 17, 2, 3, 6, -1, 17, 4, 3, 2, 3, .002260976005345583, .5562806725502014, .3940688073635101, 0, 2, 7, 7, 6, 6, -1, 9, 7, 2, 6, 3, .0511330589652061, .4609653949737549, .7118561863899231, 0, 2, 17, 2, 3, 6, -1, 17, 4, 3, 2, 3, -.0177863091230392, .2316166013479233, .5322144031524658, 0, 2, 8, 0, 3, 4, -1, 9, 0, 1, 4, 3, -.004967962857335806, .233077198266983, .5122029185295105, 0, 2, 9, 14, 2, 3, -1, 9, 15, 2, 1, 3, .002066768938675523, .4657444059848785, .6455488204956055, 0, 2, 0, 12, 6, 3, -1, 0, 13, 6, 1, 3, .007441376801580191, .5154392123222351, .236163392663002, 0, 2, 8, 14, 4, 3, -1, 8, 15, 4, 1, 3, -.003627727972343564, .6219773292541504, .4476661086082459, 0, 2, 3, 12, 2, 3, -1, 3, 13, 2, 1, 3, -.005353075917810202, .1837355047464371, .5102208256721497, 0, 2, 5, 6, 12, 7, -1, 9, 6, 4, 7, 3, .1453091949224472, .5145987272262573, .1535930931568146, 0, 2, 0, 2, 3, 6, -1, 0, 4, 3, 2, 3, .0024394490756094456, .5343660116195679, .3624661862850189, 0, 2, 14, 6, 1, 3, -1, 14, 7, 1, 1, 3, -.003128339070826769, .6215007901191711, .4845592081546783, 0, 2, 2, 0, 3, 14, -1, 3, 0, 1, 14, 3, .0017940260004252195, .4299261868000031, .5824198126792908, 0, 2, 12, 14, 5, 6, -1, 12, 16, 5, 2, 3, .0362538211047649, .5260334014892578, .1439467966556549, 0, 2, 4, 14, 5, 6, -1, 4, 16, 5, 2, 3, -.005174672231078148, .350653886795044, .5287045240402222, 0, 3, 11, 10, 2, 2, -1, 12, 10, 1, 1, 2, 11, 11, 1, 1, 2, .0006538329762406647, .4809640944004059, .6122040152549744, 0, 2, 5, 0, 3, 14, -1, 6, 0, 1, 14, 3, -.0264802295714617, .1139362007379532, .5045586228370667, 0, 2, 10, 15, 2, 3, -1, 10, 16, 2, 1, 3, -.0030440660193562508, .6352095007896423, .4794734120368958, 0, 2, 0, 2, 2, 3, -1, 0, 3, 2, 1, 3, .0036993520334362984, .5131118297576904, .2498510926961899, 0, 2, 5, 11, 12, 6, -1, 5, 14, 12, 3, 2, -.0003676293126773089, .54213947057724, .3709532022476196, 0, 2, 6, 11, 3, 9, -1, 6, 14, 3, 3, 3, -.041382260620594, .1894959956407547, .5081691741943359, 0, 3, 11, 10, 2, 2, -1, 12, 10, 1, 1, 2, 11, 11, 1, 1, 2, -.0010532729793339968, .645436704158783, .4783608913421631, 0, 2, 5, 6, 1, 3, -1, 5, 7, 1, 1, 3, -.0021648600231856108, .6215031147003174, .449982613325119, 0, 2, 4, 9, 13, 3, -1, 4, 10, 13, 1, 3, -.0005674774874933064, .3712610900402069, .5419334769248962, 0, 2, 1, 7, 15, 6, -1, 6, 7, 5, 6, 3, .173758402466774, .5023643970489502, .1215742006897926, 0, 2, 4, 5, 12, 6, -1, 8, 5, 4, 6, 3, -.0029049699660390615, .3240267932415009, .5381883978843689, 0, 2, 8, 10, 4, 3, -1, 8, 11, 4, 1, 3, .0012299539521336555, .4165507853031158, .5703486204147339, 0, 2, 15, 14, 1, 3, -1, 15, 15, 1, 1, 3, -.0005432923790067434, .3854042887687683, .554754912853241, 0, 2, 1, 11, 5, 3, -1, 1, 12, 5, 1, 3, -.008329725824296474, .2204494029283524, .5097082853317261, 0, 2, 7, 1, 7, 12, -1, 7, 7, 7, 6, 2, -.00010417630255687982, .560706615447998, .4303036034107208, 0, 3, 0, 1, 6, 10, -1, 0, 1, 3, 5, 2, 3, 6, 3, 5, 2, .0312047004699707, .4621657133102417, .6982004046440125, 0, 2, 16, 1, 4, 3, -1, 16, 2, 4, 1, 3, .007894350215792656, .5269594192504883, .226906806230545, 0, 2, 5, 5, 2, 3, -1, 5, 6, 2, 1, 3, -.004364531021565199, .6359223127365112, .4537956118583679, 0, 2, 12, 2, 3, 5, -1, 13, 2, 1, 5, 3, .007679305970668793, .5274767875671387, .274048388004303, 0, 2, 0, 3, 4, 6, -1, 0, 5, 4, 2, 3, -.0254311393946409, .2038519978523254, .5071732997894287, 0, 2, 8, 12, 4, 2, -1, 8, 13, 4, 1, 2, .0008200060110539198, .4587455093860626, .6119868159294128, 0, 2, 8, 18, 3, 1, -1, 9, 18, 1, 1, 3, .002928460016846657, .5071274042129517, .2028204947710037, 0, 3, 11, 10, 2, 2, -1, 12, 10, 1, 1, 2, 11, 11, 1, 1, 2, 4525647091213614e-20, .4812104105949402, .5430821776390076, 0, 3, 7, 10, 2, 2, -1, 7, 10, 1, 1, 2, 8, 11, 1, 1, 2, .0013158309739083052, .4625813961029053, .6779323220252991, 0, 2, 11, 11, 4, 4, -1, 11, 13, 4, 2, 2, .0015870389761403203, .5386291742324829, .3431465029716492, 0, 2, 8, 12, 3, 8, -1, 9, 12, 1, 8, 3, -.0215396601706743, .025942500680685, .5003222823143005, 0, 2, 13, 0, 6, 3, -1, 13, 1, 6, 1, 3, .014334480278194, .5202844738960266, .1590632945299149, 0, 2, 8, 8, 3, 4, -1, 9, 8, 1, 4, 3, -.008388138376176357, .728248119354248, .4648044109344482, 0, 3, 5, 7, 10, 10, -1, 10, 7, 5, 5, 2, 5, 12, 5, 5, 2, .00919068418443203, .556235671043396, .3923191130161285, 0, 3, 3, 18, 8, 2, -1, 3, 18, 4, 1, 2, 7, 19, 4, 1, 2, -.005845305975526571, .6803392767906189, .4629127979278565, 0, 2, 10, 2, 6, 8, -1, 12, 2, 2, 8, 3, -.0547077991068363, .2561671137809753, .5206125974655151, 0, 2, 4, 2, 6, 8, -1, 6, 2, 2, 8, 3, .009114277549088001, .518962025642395, .3053877055644989, 0, 2, 11, 0, 3, 7, -1, 12, 0, 1, 7, 3, -.0155750000849366, .1295074969530106, .5169094800949097, 0, 2, 7, 11, 2, 1, -1, 8, 11, 1, 1, 2, -.0001205060034408234, .5735098123550415, .4230825006961823, 0, 2, 15, 14, 1, 3, -1, 15, 15, 1, 1, 3, .0012273970060050488, .5289878249168396, .4079791903495789, 0, 3, 7, 15, 2, 2, -1, 7, 15, 1, 1, 2, 8, 16, 1, 1, 2, -.0012186600361019373, .6575639843940735, .4574409127235413, 0, 2, 15, 14, 1, 3, -1, 15, 15, 1, 1, 3, -.0033256649039685726, .3628047108650208, .5195019841194153, 0, 2, 6, 0, 3, 7, -1, 7, 0, 1, 7, 3, -.0132883097976446, .1284265965223312, .504348874092102, 0, 2, 18, 1, 2, 7, -1, 18, 1, 1, 7, 2, -.0033839771058410406, .6292240023612976, .475750595331192, 0, 2, 2, 0, 8, 20, -1, 2, 10, 8, 10, 2, -.2195422053337097, .148773193359375, .5065013766288757, 0, 2, 3, 0, 15, 6, -1, 3, 2, 15, 2, 3, .004911170806735754, .425610214471817, .5665838718414307, 0, 2, 4, 3, 12, 2, -1, 4, 4, 12, 1, 2, -.00018744950648397207, .4004144072532654, .5586857199668884, 0, 2, 16, 0, 4, 5, -1, 16, 0, 2, 5, 2, -.00521786417812109, .6009116172790527, .4812706112861633, 0, 2, 7, 0, 3, 4, -1, 8, 0, 1, 4, 3, -.0011111519997939467, .3514933884143829, .5287089943885803, 0, 2, 16, 0, 4, 5, -1, 16, 0, 2, 5, 2, .004403640050441027, .4642275869846344, .5924085974693298, 0, 2, 1, 7, 6, 13, -1, 3, 7, 2, 13, 3, .1229949966073036, .5025529265403748, .0691524818539619, 0, 2, 16, 0, 4, 5, -1, 16, 0, 2, 5, 2, -.0123135102912784, .5884591937065125, .4934012889862061, 0, 2, 0, 0, 4, 5, -1, 2, 0, 2, 5, 2, .004147103987634182, .4372239112854004, .589347779750824, 0, 2, 14, 12, 3, 6, -1, 14, 14, 3, 2, 3, -.003550264984369278, .4327551126480103, .5396270155906677, 0, 2, 3, 12, 3, 6, -1, 3, 14, 3, 2, 3, -.0192242693156004, .1913134008646011, .5068330764770508, 0, 2, 16, 1, 4, 3, -1, 16, 2, 4, 1, 3, .0014395059552043676, .5308178067207336, .424353301525116, 0, 3, 8, 7, 2, 10, -1, 8, 7, 1, 5, 2, 9, 12, 1, 5, 2, -.00677519990131259, .6365395784378052, .4540086090564728, 0, 2, 11, 11, 4, 4, -1, 11, 13, 4, 2, 2, .007011963054537773, .5189834237098694, .302619993686676, 0, 2, 0, 1, 4, 3, -1, 0, 2, 4, 1, 3, .005401465110480785, .5105062127113342, .2557682991027832, 0, 2, 13, 4, 1, 3, -1, 13, 5, 1, 1, 3, .0009027498890645802, .4696914851665497, .5861827731132507, 0, 2, 7, 15, 3, 5, -1, 8, 15, 1, 5, 3, .0114744501188397, .5053645968437195, .152717798948288, 0, 2, 9, 7, 3, 5, -1, 10, 7, 1, 5, 3, -.006702343001961708, .6508980989456177, .4890604019165039, 0, 2, 8, 7, 3, 5, -1, 9, 7, 1, 5, 3, -.0020462959073483944, .6241816878318787, .4514600038528442, 0, 2, 10, 6, 4, 14, -1, 10, 6, 2, 14, 2, -.009995156899094582, .3432781100273132, .5400953888893127, 0, 2, 0, 5, 5, 6, -1, 0, 7, 5, 2, 3, -.0357007086277008, .1878059059381485, .5074077844619751, 0, 2, 9, 5, 6, 4, -1, 9, 5, 3, 4, 2, .0004558456130325794, .3805277049541473, .5402569770812988, 0, 2, 0, 0, 18, 10, -1, 6, 0, 6, 10, 3, -.0542606003582478, .6843714714050293, .4595097005367279, 0, 2, 10, 6, 4, 14, -1, 10, 6, 2, 14, 2, .0060600461438298225, .5502905249595642, .450052797794342, 0, 2, 6, 6, 4, 14, -1, 8, 6, 2, 14, 2, -.006479183211922646, .3368858098983765, .5310757160186768, 0, 2, 13, 4, 1, 3, -1, 13, 5, 1, 1, 3, -.0014939469983801246, .6487640142440796, .4756175875663757, 0, 2, 5, 1, 2, 3, -1, 6, 1, 1, 3, 2, 14610530342906713e-21, .403457909822464, .5451064109802246, 0, 3, 18, 1, 2, 18, -1, 19, 1, 1, 9, 2, 18, 10, 1, 9, 2, -.00723219383507967, .6386873722076416, .4824739992618561, 0, 2, 2, 1, 4, 3, -1, 2, 2, 4, 1, 3, -.004064581822603941, .2986421883106232, .5157335996627808, 0, 3, 18, 1, 2, 18, -1, 19, 1, 1, 9, 2, 18, 10, 1, 9, 2, .0304630808532238, .5022199749946594, .7159956097602844, 0, 3, 1, 14, 4, 6, -1, 1, 14, 2, 3, 2, 3, 17, 2, 3, 2, -.008054491132497787, .6492452025413513, .4619275033473969, 0, 2, 10, 11, 7, 6, -1, 10, 13, 7, 2, 3, .0395051389932632, .5150570869445801, .2450613975524902, 0, 3, 0, 10, 6, 10, -1, 0, 10, 3, 5, 2, 3, 15, 3, 5, 2, .008453020825982094, .4573669135570526, .6394037008285522, 0, 2, 11, 0, 3, 4, -1, 12, 0, 1, 4, 3, -.0011688120430335402, .3865512013435364, .548366129398346, 0, 2, 5, 10, 5, 6, -1, 5, 13, 5, 3, 2, .002807067008689046, .5128579139709473, .2701480090618134, 0, 2, 14, 6, 1, 8, -1, 14, 10, 1, 4, 2, .000473652093205601, .4051581919193268, .5387461185455322, 0, 3, 1, 7, 18, 6, -1, 1, 7, 9, 3, 2, 10, 10, 9, 3, 2, .0117410803213716, .5295950174331665, .3719413876533508, 0, 2, 9, 7, 2, 2, -1, 9, 7, 1, 2, 2, .0031833238899707794, .4789406955242157, .6895126104354858, 0, 2, 5, 9, 4, 5, -1, 7, 9, 2, 5, 2, .0007024150108918548, .5384489297866821, .3918080925941467, 50.16973114013672, 102, 0, 2, 7, 6, 6, 3, -1, 9, 6, 2, 3, 3, .0170599296689034, .3948527872562408, .7142534852027893, 0, 2, 1, 0, 18, 4, -1, 7, 0, 6, 4, 3, .0218408405780792, .3370316028594971, .6090016961097717, 0, 2, 7, 15, 2, 4, -1, 7, 17, 2, 2, 2, .00024520049919374287, .3500576019287109, .5987902283668518, 0, 2, 1, 0, 19, 9, -1, 1, 3, 19, 3, 3, .008327260613441467, .3267528116703033, .5697240829467773, 0, 2, 3, 7, 3, 6, -1, 3, 9, 3, 2, 3, .0005714829894714057, .3044599890708923, .5531656742095947, 0, 3, 13, 7, 4, 4, -1, 15, 7, 2, 2, 2, 13, 9, 2, 2, 2, .0006737398798577487, .3650012016296387, .567263126373291, 0, 3, 3, 7, 4, 4, -1, 3, 7, 2, 2, 2, 5, 9, 2, 2, 2, 3468159047770314e-20, .3313541114330292, .5388727188110352, 0, 2, 9, 6, 10, 8, -1, 9, 10, 10, 4, 2, -.005856339819729328, .2697942852973938, .5498778820037842, 0, 2, 3, 8, 14, 12, -1, 3, 14, 14, 6, 2, .00851022731512785, .5269358158111572, .2762879133224487, 0, 3, 6, 5, 10, 12, -1, 11, 5, 5, 6, 2, 6, 11, 5, 6, 2, -.0698172077536583, .2909603118896484, .5259246826171875, 0, 2, 9, 11, 2, 3, -1, 9, 12, 2, 1, 3, -.0008611367084085941, .5892577171325684, .4073697924613953, 0, 2, 9, 5, 6, 5, -1, 9, 5, 3, 5, 2, .0009714924963191152, .3523564040660858, .5415862202644348, 0, 2, 9, 4, 2, 4, -1, 9, 6, 2, 2, 2, -1472749045206001e-20, .5423017740249634, .3503156006336212, 0, 2, 9, 5, 6, 5, -1, 9, 5, 3, 5, 2, .0484202913939953, .51939457654953, .3411195874214172, 0, 2, 5, 5, 6, 5, -1, 8, 5, 3, 5, 2, .0013257140526548028, .315776914358139, .5335376262664795, 0, 2, 11, 2, 6, 1, -1, 13, 2, 2, 1, 3, 1492214960308047e-20, .4451299905776978, .5536553859710693, 0, 2, 3, 2, 6, 1, -1, 5, 2, 2, 1, 3, -.002717339899390936, .3031741976737976, .5248088836669922, 0, 2, 13, 5, 2, 3, -1, 13, 6, 2, 1, 3, .0029219500720500946, .4781453013420105, .6606041789054871, 0, 2, 0, 10, 1, 4, -1, 0, 12, 1, 2, 2, -.0019804988987743855, .3186308145523071, .5287625193595886, 0, 2, 13, 5, 2, 3, -1, 13, 6, 2, 1, 3, -.004001210909336805, .6413596868515015, .4749928116798401, 0, 2, 8, 18, 3, 2, -1, 9, 18, 1, 2, 3, -.004349199123680592, .1507498025894165, .5098996758460999, 0, 2, 6, 15, 9, 2, -1, 6, 16, 9, 1, 2, .0013490889687091112, .4316158890724182, .5881167054176331, 0, 2, 8, 14, 4, 3, -1, 8, 15, 4, 1, 3, .0185970701277256, .4735553860664368, .9089794158935547, 0, 2, 18, 4, 2, 4, -1, 18, 6, 2, 2, 2, -.001856237999163568, .3553189039230347, .5577837228775024, 0, 2, 5, 5, 2, 3, -1, 5, 6, 2, 1, 3, .002294043079018593, .4500094950199127, .6580877900123596, 0, 2, 15, 16, 3, 2, -1, 15, 17, 3, 1, 2, .00029982850537635386, .5629242062568665, .3975878953933716, 0, 2, 0, 0, 3, 9, -1, 0, 3, 3, 3, 3, .0035455459728837013, .5381547212600708, .3605485856533051, 0, 2, 9, 7, 3, 3, -1, 9, 8, 3, 1, 3, .009610472247004509, .5255997180938721, .1796745955944061, 0, 2, 8, 7, 3, 3, -1, 8, 8, 3, 1, 3, -.0062783220782876015, .227285698056221, .5114030241966248, 0, 2, 9, 5, 2, 6, -1, 9, 5, 1, 6, 2, .0034598479978740215, .4626308083534241, .6608219146728516, 0, 2, 8, 6, 3, 4, -1, 9, 6, 1, 4, 3, -.0013112019514665008, .6317539811134338, .4436857998371124, 0, 3, 7, 6, 8, 12, -1, 11, 6, 4, 6, 2, 7, 12, 4, 6, 2, .002687617903575301, .5421109795570374, .4054022133350372, 0, 3, 5, 6, 8, 12, -1, 5, 6, 4, 6, 2, 9, 12, 4, 6, 2, .003911816980689764, .5358477830886841, .3273454904556274, 0, 2, 12, 4, 3, 3, -1, 12, 5, 3, 1, 3, -.014206450432539, .7793576717376709, .4975781142711639, 0, 2, 2, 16, 3, 2, -1, 2, 17, 3, 1, 2, .0007170552853494883, .5297319889068604, .3560903966426849, 0, 2, 12, 4, 3, 3, -1, 12, 5, 3, 1, 3, .001663501956500113, .467809408903122, .5816481709480286, 0, 2, 2, 12, 6, 6, -1, 2, 14, 6, 2, 3, .0033686188980937004, .5276734232902527, .3446420133113861, 0, 2, 7, 13, 6, 3, -1, 7, 14, 6, 1, 3, .0127995302900672, .4834679961204529, .7472159266471863, 0, 2, 6, 14, 6, 3, -1, 6, 15, 6, 1, 3, .0033901201095432043, .4511859118938446, .6401721239089966, 0, 2, 14, 15, 5, 3, -1, 14, 16, 5, 1, 3, .004707077983766794, .533565878868103, .355522096157074, 0, 2, 5, 4, 3, 3, -1, 5, 5, 3, 1, 3, .0014819339849054813, .4250707030296326, .5772724151611328, 0, 2, 14, 15, 5, 3, -1, 14, 16, 5, 1, 3, -.0069995759986341, .3003320097923279, .5292900204658508, 0, 2, 5, 3, 6, 2, -1, 7, 3, 2, 2, 3, .0159390103071928, .5067319273948669, .1675581932067871, 0, 2, 8, 15, 4, 3, -1, 8, 16, 4, 1, 3, .007637734990566969, .4795069992542267, .7085601091384888, 0, 2, 1, 15, 5, 3, -1, 1, 16, 5, 1, 3, .006733404006808996, .5133113265037537, .2162470072507858, 0, 3, 8, 13, 4, 6, -1, 10, 13, 2, 3, 2, 8, 16, 2, 3, 2, -.012858809903264, .1938841938972473, .525137186050415, 0, 2, 7, 8, 3, 3, -1, 8, 8, 1, 3, 3, -.0006227080011740327, .5686538219451904, .419786810874939, 0, 2, 12, 0, 5, 4, -1, 12, 2, 5, 2, 2, -.0005265168147161603, .4224168956279755, .5429695844650269, 0, 3, 0, 2, 20, 2, -1, 0, 2, 10, 1, 2, 10, 3, 10, 1, 2, .0110750999301672, .5113775134086609, .2514517903327942, 0, 2, 1, 0, 18, 4, -1, 7, 0, 6, 4, 3, -.0367282517254353, .7194662094116211, .4849618971347809, 0, 2, 4, 3, 6, 1, -1, 6, 3, 2, 1, 3, -.00028207109426148236, .3840261995792389, .539444625377655, 0, 2, 4, 18, 13, 2, -1, 4, 19, 13, 1, 2, -.0027489690110087395, .593708872795105, .4569182097911835, 0, 2, 2, 10, 3, 6, -1, 2, 12, 3, 2, 3, .0100475195795298, .5138576030731201, .2802298069000244, 0, 3, 14, 12, 6, 8, -1, 17, 12, 3, 4, 2, 14, 16, 3, 4, 2, -.008149784058332443, .6090037226676941, .4636121094226837, 0, 3, 4, 13, 10, 6, -1, 4, 13, 5, 3, 2, 9, 16, 5, 3, 2, -.006883388850837946, .3458611071109772, .5254660248756409, 0, 2, 14, 12, 1, 2, -1, 14, 13, 1, 1, 2, -140393603942357e-19, .5693104267120361, .4082083106040955, 0, 2, 8, 13, 4, 3, -1, 8, 14, 4, 1, 3, .001549841952510178, .4350537061691284, .5806517004966736, 0, 2, 14, 12, 2, 2, -1, 14, 13, 2, 1, 2, -.006784149911254644, .1468873023986816, .5182775259017944, 0, 2, 4, 12, 2, 2, -1, 4, 13, 2, 1, 2, .00021705629478674382, .5293524265289307, .345617413520813, 0, 2, 8, 12, 9, 2, -1, 8, 13, 9, 1, 2, .00031198898795992136, .4652450978755951, .5942413806915283, 0, 2, 9, 14, 2, 3, -1, 9, 15, 2, 1, 3, .005450753029435873, .4653508961200714, .7024846076965332, 0, 2, 11, 10, 3, 6, -1, 11, 13, 3, 3, 2, -.00025818689027801156, .5497295260429382, .3768967092037201, 0, 2, 5, 6, 9, 12, -1, 5, 12, 9, 6, 2, -.0174425393342972, .3919087946414948, .5457497835159302, 0, 2, 11, 10, 3, 6, -1, 11, 13, 3, 3, 2, -.045343529433012, .1631357073783875, .5154908895492554, 0, 2, 6, 10, 3, 6, -1, 6, 13, 3, 3, 2, .0019190689781680703, .514589786529541, .2791895866394043, 0, 2, 5, 4, 11, 3, -1, 5, 5, 11, 1, 3, -.006017786916345358, .6517636179924011, .4756332933902741, 0, 2, 7, 1, 5, 10, -1, 7, 6, 5, 5, 2, -.004072073847055435, .5514652729034424, .4092685878276825, 0, 2, 2, 8, 18, 2, -1, 2, 9, 18, 1, 2, .00039855059003457427, .316524088382721, .5285550951957703, 0, 2, 7, 17, 5, 3, -1, 7, 18, 5, 1, 3, -.0065418570302426815, .6853377819061279, .4652808904647827, 0, 2, 5, 9, 12, 1, -1, 9, 9, 4, 1, 3, .003484508953988552, .5484588146209717, .4502759873867035, 0, 3, 0, 14, 6, 6, -1, 0, 14, 3, 3, 2, 3, 17, 3, 3, 2, -.0136967804282904, .6395779848098755, .4572555124759674, 0, 2, 5, 9, 12, 1, -1, 9, 9, 4, 1, 3, -.017347140237689, .2751072943210602, .5181614756584167, 0, 2, 3, 9, 12, 1, -1, 7, 9, 4, 1, 3, -.004088542889803648, .3325636088848114, .5194984078407288, 0, 2, 14, 10, 6, 7, -1, 14, 10, 3, 7, 2, -.009468790143728256, .5942280888557434, .485181987285614, 0, 2, 1, 0, 16, 2, -1, 1, 1, 16, 1, 2, .0017084840219467878, .4167110919952393, .5519806146621704, 0, 2, 10, 9, 10, 9, -1, 10, 12, 10, 3, 3, .009480909444391727, .5433894991874695, .4208514988422394, 0, 2, 0, 1, 10, 2, -1, 5, 1, 5, 2, 2, -.004738965071737766, .6407189965248108, .4560655057430267, 0, 2, 17, 3, 2, 3, -1, 17, 4, 2, 1, 3, .006576105020940304, .5214555263519287, .2258227020502091, 0, 2, 1, 3, 2, 3, -1, 1, 4, 2, 1, 3, -.0021690549328923225, .3151527941226959, .5156704783439636, 0, 2, 9, 7, 3, 6, -1, 10, 7, 1, 6, 3, .014660170301795, .4870837032794952, .668994128704071, 0, 2, 6, 5, 4, 3, -1, 8, 5, 2, 3, 2, .00017231999663636088, .3569748997688294, .5251078009605408, 0, 2, 7, 5, 6, 6, -1, 9, 5, 2, 6, 3, -.0218037609010935, .8825920820236206, .496632993221283, 0, 3, 3, 4, 12, 12, -1, 3, 4, 6, 6, 2, 9, 10, 6, 6, 2, -.0947361066937447, .1446162015199661, .5061113834381104, 0, 2, 9, 2, 6, 15, -1, 11, 2, 2, 15, 3, .0055825551971793175, .5396478772163391, .4238066077232361, 0, 2, 2, 2, 6, 17, -1, 4, 2, 2, 17, 3, .001951709040440619, .4170410931110382, .5497786998748779, 0, 2, 14, 10, 6, 7, -1, 14, 10, 3, 7, 2, .0121499001979828, .4698367118835449, .5664274096488953, 0, 2, 0, 10, 6, 7, -1, 3, 10, 3, 7, 2, -.007516962010413408, .6267772912979126, .4463135898113251, 0, 2, 9, 2, 6, 15, -1, 11, 2, 2, 15, 3, -.0716679096221924, .3097011148929596, .5221003293991089, 0, 2, 5, 2, 6, 15, -1, 7, 2, 2, 15, 3, -.0882924199104309, .0811238884925842, .5006365180015564, 0, 2, 17, 9, 3, 6, -1, 17, 11, 3, 2, 3, .0310630798339844, .5155503749847412, .1282255947589874, 0, 2, 6, 7, 6, 6, -1, 8, 7, 2, 6, 3, .0466218404471874, .4699777960777283, .736396074295044, 0, 3, 1, 10, 18, 6, -1, 10, 10, 9, 3, 2, 1, 13, 9, 3, 2, -.0121894897893071, .3920530080795288, .5518996715545654, 0, 2, 0, 9, 10, 9, -1, 0, 12, 10, 3, 3, .0130161102861166, .5260658264160156, .3685136139392853, 0, 2, 8, 15, 4, 3, -1, 8, 16, 4, 1, 3, -.003495289944112301, .6339294910430908, .4716280996799469, 0, 2, 5, 12, 3, 4, -1, 5, 14, 3, 2, 2, -4401503974804655e-20, .5333027243614197, .3776184916496277, 0, 2, 3, 3, 16, 12, -1, 3, 9, 16, 6, 2, -.1096649020910263, .1765342056751251, .5198346972465515, 0, 3, 1, 1, 12, 12, -1, 1, 1, 6, 6, 2, 7, 7, 6, 6, 2, -.0009027955820783973, .5324159860610962, .3838908076286316, 0, 3, 10, 4, 2, 4, -1, 11, 4, 1, 2, 2, 10, 6, 1, 2, 2, .0007112664170563221, .4647929966449738, .5755224227905273, 0, 3, 0, 9, 10, 2, -1, 0, 9, 5, 1, 2, 5, 10, 5, 1, 2, -.003125027986243367, .323670893907547, .5166770815849304, 0, 2, 9, 11, 3, 3, -1, 9, 12, 3, 1, 3, .002414467977359891, .4787439107894898, .6459717750549316, 0, 2, 3, 12, 9, 2, -1, 3, 13, 9, 1, 2, .00044391240226104856, .4409308135509491, .6010255813598633, 0, 2, 9, 9, 2, 2, -1, 9, 10, 2, 1, 2, -.0002261118934256956, .4038113951683044, .5493255853652954, 66.66912078857422, 135, 0, 2, 3, 4, 13, 6, -1, 3, 6, 13, 2, 3, -.0469012893736362, .660017192363739, .3743801116943359, 0, 3, 9, 7, 6, 4, -1, 12, 7, 3, 2, 2, 9, 9, 3, 2, 2, -.001456834957934916, .578399121761322, .3437797129154205, 0, 2, 1, 0, 6, 8, -1, 4, 0, 3, 8, 2, .005559836979955435, .3622266948223114, .5908216238021851, 0, 2, 9, 5, 2, 12, -1, 9, 11, 2, 6, 2, .0007317048730328679, .550041913986206, .2873558104038239, 0, 2, 4, 4, 3, 10, -1, 4, 9, 3, 5, 2, .001331800944171846, .267316997051239, .5431019067764282, 0, 2, 6, 17, 8, 3, -1, 6, 18, 8, 1, 3, .00024347059661522508, .3855027854442596, .574138879776001, 0, 2, 0, 5, 10, 6, -1, 0, 7, 10, 2, 3, -.0030512469820678234, .5503209829330444, .3462845087051392, 0, 2, 13, 2, 3, 2, -1, 13, 3, 3, 1, 2, -.0006865719915367663, .3291221857070923, .5429509282112122, 0, 2, 7, 5, 4, 5, -1, 9, 5, 2, 5, 2, .001466820016503334, .3588382005691528, .5351811051368713, 0, 2, 12, 14, 3, 6, -1, 12, 16, 3, 2, 3, .0003202187072020024, .429684191942215, .5700234174728394, 0, 2, 1, 11, 8, 2, -1, 1, 12, 8, 1, 2, .0007412218837998807, .5282164812088013, .3366870880126953, 0, 2, 7, 13, 6, 3, -1, 7, 14, 6, 1, 3, .0038330298848450184, .4559567868709564, .6257336139678955, 0, 2, 0, 5, 3, 6, -1, 0, 7, 3, 2, 3, -.0154564399272203, .2350116968154907, .512945294380188, 0, 2, 13, 2, 3, 2, -1, 13, 3, 3, 1, 2, .002679677912965417, .5329415202140808, .4155062139034271, 0, 3, 4, 14, 4, 6, -1, 4, 14, 2, 3, 2, 6, 17, 2, 3, 2, .0028296569362282753, .4273087978363037, .5804538130760193, 0, 2, 13, 2, 3, 2, -1, 13, 3, 3, 1, 2, -.0039444249123334885, .2912611961364746, .5202686190605164, 0, 2, 8, 2, 4, 12, -1, 8, 6, 4, 4, 3, .002717955969274044, .5307688117027283, .3585677146911621, 0, 3, 14, 0, 6, 8, -1, 17, 0, 3, 4, 2, 14, 4, 3, 4, 2, .005907762795686722, .470377504825592, .5941585898399353, 0, 2, 7, 17, 3, 2, -1, 8, 17, 1, 2, 3, -.004224034957587719, .2141567021608353, .5088796019554138, 0, 2, 8, 12, 4, 2, -1, 8, 13, 4, 1, 2, .0040725888684391975, .4766413867473602, .6841061115264893, 0, 3, 6, 0, 8, 12, -1, 6, 0, 4, 6, 2, 10, 6, 4, 6, 2, .0101495301350951, .5360798835754395, .3748497068881989, 0, 3, 14, 0, 2, 10, -1, 15, 0, 1, 5, 2, 14, 5, 1, 5, 2, -.00018864999583456665, .5720130205154419, .3853805065155029, 0, 3, 5, 3, 8, 6, -1, 5, 3, 4, 3, 2, 9, 6, 4, 3, 2, -.0048864358104765415, .3693122863769531, .5340958833694458, 0, 3, 14, 0, 6, 10, -1, 17, 0, 3, 5, 2, 14, 5, 3, 5, 2, .0261584799736738, .4962374866008759, .6059989929199219, 0, 2, 9, 14, 1, 2, -1, 9, 15, 1, 1, 2, .0004856075975112617, .4438945949077606, .6012468934059143, 0, 2, 15, 10, 4, 3, -1, 15, 11, 4, 1, 3, .0112687097862363, .5244250297546387, .1840388029813767, 0, 2, 8, 14, 2, 3, -1, 8, 15, 2, 1, 3, -.0028114619199186563, .6060283780097961, .4409897029399872, 0, 3, 3, 13, 14, 4, -1, 10, 13, 7, 2, 2, 3, 15, 7, 2, 2, -.005611272994428873, .3891170918941498, .5589237213134766, 0, 2, 1, 10, 4, 3, -1, 1, 11, 4, 1, 3, .008568009361624718, .5069345831871033, .2062619030475617, 0, 2, 9, 11, 6, 1, -1, 11, 11, 2, 1, 3, -.00038172779022715986, .5882201790809631, .41926109790802, 0, 2, 5, 11, 6, 1, -1, 7, 11, 2, 1, 3, -.00017680290329735726, .5533605813980103, .400336891412735, 0, 2, 3, 5, 16, 15, -1, 3, 10, 16, 5, 3, .006511253770440817, .3310146927833557, .5444191098213196, 0, 2, 6, 12, 4, 2, -1, 8, 12, 2, 2, 2, -6594868318643421e-20, .5433831810951233, .3944905996322632, 0, 3, 4, 4, 12, 10, -1, 10, 4, 6, 5, 2, 4, 9, 6, 5, 2, .006993905175477266, .5600358247756958, .4192714095115662, 0, 2, 8, 6, 3, 4, -1, 9, 6, 1, 4, 3, -.0046744439750909805, .6685466766357422, .4604960978031158, 0, 3, 8, 12, 4, 8, -1, 10, 12, 2, 4, 2, 8, 16, 2, 4, 2, .0115898502990603, .5357121229171753, .2926830053329468, 0, 2, 8, 14, 4, 3, -1, 8, 15, 4, 1, 3, .013007840141654, .4679817855358124, .730746328830719, 0, 2, 12, 2, 3, 2, -1, 13, 2, 1, 2, 3, -.0011008579749614, .3937501013278961, .5415065288543701, 0, 2, 8, 15, 3, 2, -1, 8, 16, 3, 1, 2, .0006047264905646443, .4242376089096069, .5604041218757629, 0, 2, 6, 0, 9, 14, -1, 9, 0, 3, 14, 3, -.0144948400557041, .3631210029125214, .5293182730674744, 0, 2, 9, 6, 2, 3, -1, 10, 6, 1, 3, 2, -.005305694881826639, .686045229434967, .4621821045875549, 0, 2, 10, 8, 2, 3, -1, 10, 9, 2, 1, 3, -.00081829127157107, .3944096863269806, .542043924331665, 0, 2, 0, 9, 4, 6, -1, 0, 11, 4, 2, 3, -.0190775208175182, .1962621957063675, .5037891864776611, 0, 2, 6, 0, 8, 2, -1, 6, 1, 8, 1, 2, .00035549470339901745, .4086259007453919, .5613973140716553, 0, 2, 6, 14, 7, 3, -1, 6, 15, 7, 1, 3, .0019679730758070946, .448912113904953, .5926123261451721, 0, 2, 8, 10, 8, 9, -1, 8, 13, 8, 3, 3, .006918914150446653, .5335925817489624, .3728385865688324, 0, 2, 5, 2, 3, 2, -1, 6, 2, 1, 2, 3, .002987277926877141, .5111321210861206, .2975643873214722, 0, 3, 14, 1, 6, 8, -1, 17, 1, 3, 4, 2, 14, 5, 3, 4, 2, -.006226461846381426, .5541489720344543, .4824537932872772, 0, 3, 0, 1, 6, 8, -1, 0, 1, 3, 4, 2, 3, 5, 3, 4, 2, .013353300280869, .4586423933506012, .6414797902107239, 0, 3, 1, 2, 18, 6, -1, 10, 2, 9, 3, 2, 1, 5, 9, 3, 2, .0335052385926247, .5392425060272217, .3429994881153107, 0, 2, 9, 3, 2, 1, -1, 10, 3, 1, 1, 2, -.0025294460356235504, .1703713983297348, .5013315081596375, 0, 3, 13, 2, 4, 6, -1, 15, 2, 2, 3, 2, 13, 5, 2, 3, 2, -.001280162949115038, .5305461883544922, .4697405099868774, 0, 2, 5, 4, 3, 3, -1, 5, 5, 3, 1, 3, .007068738806992769, .4615545868873596, .643650472164154, 0, 2, 13, 5, 1, 3, -1, 13, 6, 1, 1, 3, .0009688049904070795, .4833599030971527, .6043894290924072, 0, 2, 2, 16, 5, 3, -1, 2, 17, 5, 1, 3, .003964765928685665, .5187637209892273, .323181688785553, 0, 3, 13, 2, 4, 6, -1, 15, 2, 2, 3, 2, 13, 5, 2, 3, 2, -.022057730704546, .4079256951808929, .520098090171814, 0, 3, 3, 2, 4, 6, -1, 3, 2, 2, 3, 2, 5, 5, 2, 3, 2, -.0006690631271339953, .533160924911499, .3815600872039795, 0, 2, 13, 5, 1, 2, -1, 13, 6, 1, 1, 2, -.0006700932863168418, .5655422210693359, .4688901901245117, 0, 2, 5, 5, 2, 2, -1, 5, 6, 2, 1, 2, .000742845528293401, .4534381031990051, .6287400126457214, 0, 2, 13, 9, 2, 2, -1, 13, 9, 1, 2, 2, .0022227810695767403, .5350633263587952, .3303655982017517, 0, 2, 5, 9, 2, 2, -1, 6, 9, 1, 2, 2, -.005413052160292864, .1113687008619309, .500543475151062, 0, 2, 13, 17, 3, 2, -1, 13, 18, 3, 1, 2, -14520040167553816e-21, .5628737807273865, .4325133860111237, 0, 3, 6, 16, 4, 4, -1, 6, 16, 2, 2, 2, 8, 18, 2, 2, 2, .00023369169502984732, .4165835082530975, .5447791218757629, 0, 2, 9, 16, 2, 3, -1, 9, 17, 2, 1, 3, .004289454780519009, .4860391020774841, .6778649091720581, 0, 2, 0, 13, 9, 6, -1, 0, 15, 9, 2, 3, .0059103150852024555, .52623051404953, .3612113893032074, 0, 2, 9, 14, 2, 6, -1, 9, 17, 2, 3, 2, .0129005396738648, .5319377183914185, .32502880692482, 0, 2, 9, 15, 2, 3, -1, 9, 16, 2, 1, 3, .004698297940194607, .461824506521225, .6665925979614258, 0, 2, 1, 10, 18, 6, -1, 1, 12, 18, 2, 3, .0104398597031832, .550567090511322, .3883604109287262, 0, 2, 8, 11, 4, 2, -1, 8, 12, 4, 1, 2, .0030443191062659025, .4697853028774262, .7301844954490662, 0, 2, 7, 9, 6, 2, -1, 7, 10, 6, 1, 2, -.0006159375188872218, .3830839097499847, .5464984178543091, 0, 2, 8, 8, 2, 3, -1, 8, 9, 2, 1, 3, -.0034247159492224455, .256630003452301, .5089530944824219, 0, 2, 17, 5, 3, 4, -1, 18, 5, 1, 4, 3, -.009353856556117535, .6469966173171997, .49407958984375, 0, 2, 1, 19, 18, 1, -1, 7, 19, 6, 1, 3, .0523389987647533, .4745982885360718, .787877082824707, 0, 2, 9, 0, 3, 2, -1, 10, 0, 1, 2, 3, .0035765620414167643, .5306664705276489, .2748498022556305, 0, 2, 1, 8, 1, 6, -1, 1, 10, 1, 2, 3, .0007155531784519553, .541312575340271, .4041908979415894, 0, 2, 12, 17, 8, 3, -1, 12, 17, 4, 3, 2, -.0105166798457503, .6158512234687805, .4815283119678497, 0, 2, 0, 5, 3, 4, -1, 1, 5, 1, 4, 3, .007734792772680521, .4695805907249451, .7028980851173401, 0, 2, 9, 7, 2, 3, -1, 9, 8, 2, 1, 3, -.004322677850723267, .2849566042423248, .5304684042930603, 0, 3, 7, 11, 2, 2, -1, 7, 11, 1, 1, 2, 8, 12, 1, 1, 2, -.0025534399319440126, .7056984901428223, .4688892066478729, 0, 2, 11, 3, 2, 5, -1, 11, 3, 1, 5, 2, .00010268510231981054, .3902932107448578, .5573464035987854, 0, 2, 7, 3, 2, 5, -1, 8, 3, 1, 5, 2, 7139518857002258e-21, .368423193693161, .526398777961731, 0, 2, 15, 13, 2, 3, -1, 15, 14, 2, 1, 3, -.0016711989883333445, .3849175870418549, .5387271046638489, 0, 2, 5, 6, 2, 3, -1, 5, 7, 2, 1, 3, .004926044959574938, .4729771912097931, .7447251081466675, 0, 2, 4, 19, 15, 1, -1, 9, 19, 5, 1, 3, .0043908702209591866, .4809181094169617, .5591921806335449, 0, 2, 1, 19, 15, 1, -1, 6, 19, 5, 1, 3, -.0177936293184757, .6903678178787231, .4676927030086517, 0, 2, 15, 13, 2, 3, -1, 15, 14, 2, 1, 3, .002046966925263405, .5370690226554871, .3308162093162537, 0, 2, 5, 0, 4, 15, -1, 7, 0, 2, 15, 2, .0298914890736341, .5139865279197693, .3309059143066406, 0, 2, 9, 6, 2, 5, -1, 9, 6, 1, 5, 2, .0015494900289922953, .466023713350296, .6078342795372009, 0, 2, 9, 5, 2, 7, -1, 10, 5, 1, 7, 2, .001495696953497827, .4404835999011993, .5863919854164124, 0, 2, 16, 11, 3, 3, -1, 16, 12, 3, 1, 3, .0009588592802174389, .5435971021652222, .4208523035049439, 0, 2, 1, 11, 3, 3, -1, 1, 12, 3, 1, 3, .0004964370164088905, .5370578169822693, .4000622034072876, 0, 2, 6, 6, 8, 3, -1, 6, 7, 8, 1, 3, -.00272808107547462, .5659412741661072, .4259642958641052, 0, 2, 0, 15, 6, 2, -1, 0, 16, 6, 1, 2, .0023026480339467525, .5161657929420471, .3350869119167328, 0, 2, 1, 0, 18, 6, -1, 7, 0, 6, 6, 3, .2515163123607636, .4869661927223206, .714730978012085, 0, 2, 6, 0, 3, 4, -1, 7, 0, 1, 4, 3, -.004632802214473486, .27274489402771, .5083789825439453, 0, 3, 14, 10, 4, 10, -1, 16, 10, 2, 5, 2, 14, 15, 2, 5, 2, -.0404344908893108, .6851438879966736, .5021767020225525, 0, 2, 3, 2, 3, 2, -1, 4, 2, 1, 2, 3, 14972220014897175e-21, .428446501493454, .5522555112838745, 0, 2, 11, 2, 2, 2, -1, 11, 3, 2, 1, 2, -.00024050309730228037, .4226118922233582, .5390074849128723, 0, 3, 2, 10, 4, 10, -1, 2, 10, 2, 5, 2, 4, 15, 2, 5, 2, .0236578397452831, .4744631946086884, .7504366040229797, 0, 3, 0, 13, 20, 6, -1, 10, 13, 10, 3, 2, 0, 16, 10, 3, 2, -.00814491044729948, .424505889415741, .5538362860679626, 0, 2, 0, 5, 2, 15, -1, 1, 5, 1, 15, 2, -.003699213033542037, .5952357053756714, .4529713094234467, 0, 3, 1, 7, 18, 4, -1, 10, 7, 9, 2, 2, 1, 9, 9, 2, 2, -.0067718601785600185, .4137794077396393, .5473399758338928, 0, 2, 0, 0, 2, 17, -1, 1, 0, 1, 17, 2, .004266953095793724, .4484114944934845, .5797994136810303, 0, 3, 2, 6, 16, 6, -1, 10, 6, 8, 3, 2, 2, 9, 8, 3, 2, .0017791989957913756, .5624858736991882, .4432444870471954, 0, 2, 8, 14, 1, 3, -1, 8, 15, 1, 1, 3, .0016774770338088274, .4637751877307892, .63642418384552, 0, 2, 8, 15, 4, 2, -1, 8, 16, 4, 1, 2, .0011732629500329494, .4544503092765808, .5914415717124939, 0, 3, 5, 2, 8, 2, -1, 5, 2, 4, 1, 2, 9, 3, 4, 1, 2, .000869981711730361, .5334752798080444, .3885917961597443, 0, 2, 6, 11, 8, 6, -1, 6, 14, 8, 3, 2, .0007637834060005844, .5398585200309753, .374494194984436, 0, 2, 9, 13, 2, 2, -1, 9, 14, 2, 1, 2, .00015684569370932877, .4317873120307922, .5614616274833679, 0, 2, 18, 4, 2, 6, -1, 18, 6, 2, 2, 3, -.0215113703161478, .1785925030708313, .5185542702674866, 0, 2, 9, 12, 2, 2, -1, 9, 13, 2, 1, 2, .00013081369979772717, .4342499077320099, .5682849884033203, 0, 2, 18, 4, 2, 6, -1, 18, 6, 2, 2, 3, .021992040798068, .5161716938018799, .2379394024610519, 0, 2, 9, 13, 1, 3, -1, 9, 14, 1, 1, 3, -.0008013650076463819, .598676323890686, .4466426968574524, 0, 2, 18, 4, 2, 6, -1, 18, 6, 2, 2, 3, -.008273609913885593, .410821795463562, .5251057147979736, 0, 2, 0, 4, 2, 6, -1, 0, 6, 2, 2, 3, .0036831789184361696, .5173814296722412, .339751809835434, 0, 2, 9, 12, 3, 3, -1, 9, 13, 3, 1, 3, -.007952568121254444, .6888983249664307, .4845924079418182, 0, 2, 3, 13, 2, 3, -1, 3, 14, 2, 1, 3, .0015382299898192286, .5178567171096802, .3454113900661469, 0, 2, 13, 13, 4, 3, -1, 13, 14, 4, 1, 3, -.0140435304492712, .1678421050310135, .518866777420044, 0, 2, 5, 4, 3, 3, -1, 5, 5, 3, 1, 3, .0014315890148282051, .436825692653656, .5655773878097534, 0, 2, 5, 2, 10, 6, -1, 5, 4, 10, 2, 3, -.0340142287313938, .7802296280860901, .4959217011928558, 0, 2, 3, 13, 4, 3, -1, 3, 14, 4, 1, 3, -.0120272999629378, .1585101038217545, .503223180770874, 0, 2, 3, 7, 15, 5, -1, 8, 7, 5, 5, 3, .1331661939620972, .5163304805755615, .2755128145217896, 0, 2, 3, 7, 12, 2, -1, 7, 7, 4, 2, 3, -.0015221949433907866, .372831791639328, .5214552283287048, 0, 2, 10, 3, 3, 9, -1, 11, 3, 1, 9, 3, -.000939292716793716, .5838379263877869, .4511165022850037, 0, 2, 8, 6, 4, 6, -1, 10, 6, 2, 6, 2, .0277197398245335, .4728286862373352, .7331544756889343, 0, 2, 9, 7, 4, 3, -1, 9, 8, 4, 1, 3, .003103015013039112, .5302202105522156, .4101563096046448, 0, 2, 0, 9, 4, 9, -1, 2, 9, 2, 9, 2, .0778612196445465, .4998334050178528, .127296194434166, 0, 2, 9, 13, 3, 5, -1, 10, 13, 1, 5, 3, -.0158549398183823, .0508333593606949, .5165656208992004, 0, 2, 7, 7, 6, 3, -1, 9, 7, 2, 3, 3, -.00497253006324172, .6798133850097656, .4684231877326965, 0, 2, 9, 7, 3, 5, -1, 10, 7, 1, 5, 3, -.0009767650626599789, .6010771989822388, .4788931906223297, 0, 2, 5, 7, 8, 2, -1, 9, 7, 4, 2, 2, -.0024647710379213095, .3393397927284241, .5220503807067871, 0, 2, 5, 9, 12, 2, -1, 9, 9, 4, 2, 3, -.006793770007789135, .4365136921405792, .5239663124084473, 0, 2, 5, 6, 10, 3, -1, 10, 6, 5, 3, 2, .0326080210506916, .505272388458252, .2425214946269989, 0, 2, 10, 12, 3, 1, -1, 11, 12, 1, 1, 3, -.0005851442110724747, .5733973979949951, .4758574068546295, 0, 2, 0, 1, 11, 15, -1, 0, 6, 11, 5, 3, -.0296326000243425, .3892289102077484, .5263597965240479, 67.69892120361328, 137, 0, 2, 1, 0, 18, 6, -1, 7, 0, 6, 6, 3, .0465508513152599, .3276950120925903, .6240522861480713, 0, 2, 7, 7, 6, 1, -1, 9, 7, 2, 1, 3, .007953712716698647, .4256485104560852, .6942939162254333, 0, 3, 5, 16, 6, 4, -1, 5, 16, 3, 2, 2, 8, 18, 3, 2, 2, .0006822156137786806, .3711487054824829, .59007328748703, 0, 2, 6, 5, 9, 8, -1, 6, 9, 9, 4, 2, -.00019348249770700932, .2041133940219879, .53005450963974, 0, 2, 5, 10, 2, 6, -1, 5, 13, 2, 3, 2, -.0002671050897333771, .5416126251220703, .3103179037570953, 0, 3, 7, 6, 8, 10, -1, 11, 6, 4, 5, 2, 7, 11, 4, 5, 2, .0027818060480058193, .5277832746505737, .3467069864273071, 0, 3, 5, 6, 8, 10, -1, 5, 6, 4, 5, 2, 9, 11, 4, 5, 2, -.000467790785478428, .5308231115341187, .3294492065906525, 0, 2, 9, 5, 2, 2, -1, 9, 6, 2, 1, 2, -30335160772665404e-21, .577387273311615, .3852097094058991, 0, 2, 5, 12, 8, 2, -1, 5, 13, 8, 1, 2, .0007803800981491804, .4317438900470734, .6150057911872864, 0, 2, 10, 2, 8, 2, -1, 10, 3, 8, 1, 2, -.004255385138094425, .2933903932571411, .5324292778968811, 0, 3, 4, 0, 2, 10, -1, 4, 0, 1, 5, 2, 5, 5, 1, 5, 2, -.0002473561035003513, .5468844771385193, .3843030035495758, 0, 2, 9, 10, 2, 2, -1, 9, 11, 2, 1, 2, -.00014724259381182492, .4281542897224426, .5755587220191956, 0, 2, 2, 8, 15, 3, -1, 2, 9, 15, 1, 3, .0011864770203828812, .374730110168457, .5471466183662415, 0, 2, 8, 13, 4, 3, -1, 8, 14, 4, 1, 3, .0023936580400913954, .4537783861160278, .6111528873443604, 0, 2, 7, 2, 3, 2, -1, 8, 2, 1, 2, 3, -.0015390539774671197, .2971341907978058, .518953800201416, 0, 2, 7, 13, 6, 3, -1, 7, 14, 6, 1, 3, -.007196879014372826, .6699066758155823, .4726476967334747, 0, 2, 9, 9, 2, 2, -1, 9, 10, 2, 1, 2, -.0004149978922214359, .3384954035282135, .5260317921638489, 0, 2, 17, 2, 3, 6, -1, 17, 4, 3, 2, 3, .004435983020812273, .539912223815918, .3920140862464905, 0, 2, 1, 5, 3, 4, -1, 2, 5, 1, 4, 3, .0026606200262904167, .4482578039169312, .6119617819786072, 0, 2, 14, 8, 4, 6, -1, 14, 10, 4, 2, 3, -.0015287200221791863, .3711237907409668, .5340266227722168, 0, 2, 1, 4, 3, 8, -1, 2, 4, 1, 8, 3, -.0047397250309586525, .603108823299408, .4455145001411438, 0, 2, 8, 13, 4, 6, -1, 8, 16, 4, 3, 2, -.0148291299119592, .2838754057884216, .5341861844062805, 0, 2, 3, 14, 2, 2, -1, 3, 15, 2, 1, 2, .0009227555710822344, .5209547281265259, .3361653983592987, 0, 2, 14, 8, 4, 6, -1, 14, 10, 4, 2, 3, .0835298076272011, .5119969844818115, .0811644494533539, 0, 2, 2, 8, 4, 6, -1, 2, 10, 4, 2, 3, -.0007563314866274595, .331712007522583, .5189831256866455, 0, 2, 10, 14, 1, 6, -1, 10, 17, 1, 3, 2, .009840385988354683, .524759829044342, .233495905995369, 0, 2, 7, 5, 3, 6, -1, 8, 5, 1, 6, 3, -.0015953830443322659, .5750094056129456, .4295622110366821, 0, 3, 11, 2, 2, 6, -1, 12, 2, 1, 3, 2, 11, 5, 1, 3, 2, 34766020689858124e-21, .4342445135116577, .5564029216766357, 0, 2, 6, 6, 6, 5, -1, 8, 6, 2, 5, 3, .0298629105091095, .4579147100448608, .6579188108444214, 0, 2, 17, 1, 3, 6, -1, 17, 3, 3, 2, 3, .0113255903124809, .5274311900138855, .3673888146877289, 0, 2, 8, 7, 3, 5, -1, 9, 7, 1, 5, 3, -.008782864548265934, .7100368738174438, .4642167091369629, 0, 2, 9, 18, 3, 2, -1, 10, 18, 1, 2, 3, .004363995976746082, .5279216170310974, .2705877125263214, 0, 2, 8, 18, 3, 2, -1, 9, 18, 1, 2, 3, .004180472809821367, .5072525143623352, .2449083030223846, 0, 2, 12, 3, 5, 2, -1, 12, 4, 5, 1, 2, -.0004566851130221039, .4283105134963989, .5548691153526306, 0, 2, 7, 1, 5, 12, -1, 7, 7, 5, 6, 2, -.0037140368949621916, .5519387722015381, .4103653132915497, 0, 2, 1, 0, 18, 4, -1, 7, 0, 6, 4, 3, -.025304289534688, .6867002248764038, .48698890209198, 0, 2, 4, 2, 2, 2, -1, 4, 3, 2, 1, 2, -.0003445408074185252, .3728874027729034, .528769314289093, 0, 3, 11, 14, 4, 2, -1, 13, 14, 2, 1, 2, 11, 15, 2, 1, 2, -.0008393523166887462, .6060152053833008, .4616062045097351, 0, 2, 0, 2, 3, 6, -1, 0, 4, 3, 2, 3, .0172800496220589, .5049635767936707, .1819823980331421, 0, 2, 9, 7, 2, 3, -1, 9, 8, 2, 1, 3, -.006359507795423269, .1631239950656891, .5232778787612915, 0, 2, 5, 5, 1, 3, -1, 5, 6, 1, 1, 3, .0010298109846189618, .446327805519104, .6176549196243286, 0, 2, 10, 10, 6, 1, -1, 10, 10, 3, 1, 2, .0010117109632119536, .5473384857177734, .4300698935985565, 0, 2, 4, 10, 6, 1, -1, 7, 10, 3, 1, 2, -.010308800265193, .1166985034942627, .5000867247581482, 0, 2, 9, 17, 3, 3, -1, 9, 18, 3, 1, 3, .005468201823532581, .4769287109375, .6719213724136353, 0, 2, 4, 14, 1, 3, -1, 4, 15, 1, 1, 3, -.0009169646073132753, .3471089899539948, .5178164839744568, 0, 2, 12, 5, 3, 3, -1, 12, 6, 3, 1, 3, .002392282010987401, .4785236120223999, .6216310858726501, 0, 2, 4, 5, 12, 3, -1, 4, 6, 12, 1, 3, -.007557381875813007, .5814796090126038, .4410085082054138, 0, 2, 9, 8, 2, 3, -1, 9, 9, 2, 1, 3, -.0007702403236180544, .387800008058548, .546572208404541, 0, 2, 4, 9, 3, 3, -1, 5, 9, 1, 3, 3, -.00871259905397892, .1660051047801971, .4995836019515991, 0, 2, 6, 0, 9, 17, -1, 9, 0, 3, 17, 3, -.0103063201531768, .4093391001224518, .5274233818054199, 0, 2, 9, 12, 1, 3, -1, 9, 13, 1, 1, 3, -.002094097901135683, .6206194758415222, .4572280049324036, 0, 2, 9, 5, 2, 15, -1, 9, 10, 2, 5, 3, .006809905171394348, .5567759275436401, .4155600070953369, 0, 2, 8, 14, 2, 3, -1, 8, 15, 2, 1, 3, -.0010746059706434608, .5638927817344666, .4353024959564209, 0, 2, 10, 14, 1, 3, -1, 10, 15, 1, 1, 3, .0021550289820879698, .4826265871524811, .6749758124351501, 0, 2, 7, 1, 6, 5, -1, 9, 1, 2, 5, 3, .0317423194646835, .5048379898071289, .188324898481369, 0, 2, 0, 0, 20, 2, -1, 0, 0, 10, 2, 2, -.0783827230334282, .2369548976421356, .5260158181190491, 0, 2, 2, 13, 5, 3, -1, 2, 14, 5, 1, 3, .005741511937230825, .5048828721046448, .2776469886302948, 0, 2, 9, 11, 2, 3, -1, 9, 12, 2, 1, 3, -.0029014600440859795, .6238604784011841, .4693317115306854, 0, 2, 2, 5, 9, 15, -1, 2, 10, 9, 5, 3, -.0026427931152284145, .3314141929149628, .5169777274131775, 0, 3, 5, 0, 12, 10, -1, 11, 0, 6, 5, 2, 5, 5, 6, 5, 2, -.1094966009259224, .2380045056343079, .5183441042900085, 0, 2, 5, 1, 2, 3, -1, 6, 1, 1, 3, 2, 7407591328956187e-20, .406963586807251, .5362150073051453, 0, 2, 10, 7, 6, 1, -1, 12, 7, 2, 1, 3, -.0005059380200691521, .5506706237792969, .437459409236908, 0, 3, 3, 1, 2, 10, -1, 3, 1, 1, 5, 2, 4, 6, 1, 5, 2, -.0008213177789002657, .5525709986686707, .4209375977516174, 0, 2, 13, 7, 2, 1, -1, 13, 7, 1, 1, 2, -60276539443293586e-21, .5455474853515625, .4748266041278839, 0, 2, 4, 13, 4, 6, -1, 4, 15, 4, 2, 3, .006806514225900173, .5157995820045471, .3424577116966248, 0, 2, 13, 7, 2, 1, -1, 13, 7, 1, 1, 2, .0017202789895236492, .5013207793235779, .6331263780593872, 0, 2, 5, 7, 2, 1, -1, 6, 7, 1, 1, 2, -.0001301692973356694, .5539718270301819, .4226869940757752, 0, 3, 2, 12, 18, 4, -1, 11, 12, 9, 2, 2, 2, 14, 9, 2, 2, -.004801638890057802, .4425095021724701, .5430780053138733, 0, 3, 5, 7, 2, 2, -1, 5, 7, 1, 1, 2, 6, 8, 1, 1, 2, -.002539931097999215, .7145782113075256, .4697605073451996, 0, 2, 16, 3, 4, 2, -1, 16, 4, 4, 1, 2, -.0014278929447755218, .4070445001125336, .539960503578186, 0, 3, 0, 2, 2, 18, -1, 0, 2, 1, 9, 2, 1, 11, 1, 9, 2, -.0251425504684448, .7884690761566162, .4747352004051209, 0, 3, 1, 2, 18, 4, -1, 10, 2, 9, 2, 2, 1, 4, 9, 2, 2, -.0038899609353393316, .4296191930770874, .5577110052108765, 0, 2, 9, 14, 1, 3, -1, 9, 15, 1, 1, 3, .004394745919853449, .4693162143230438, .702394425868988, 0, 3, 2, 12, 18, 4, -1, 11, 12, 9, 2, 2, 2, 14, 9, 2, 2, .0246784202754498, .5242322087287903, .3812510073184967, 0, 3, 0, 12, 18, 4, -1, 0, 12, 9, 2, 2, 9, 14, 9, 2, 2, .0380476787686348, .5011739730834961, .1687828004360199, 0, 2, 11, 4, 5, 3, -1, 11, 5, 5, 1, 3, .007942486554384232, .4828582108020783, .6369568109512329, 0, 2, 6, 4, 7, 3, -1, 6, 5, 7, 1, 3, -.0015110049862414598, .5906485915184021, .4487667977809906, 0, 2, 13, 17, 3, 3, -1, 13, 18, 3, 1, 3, .0064201741479337215, .5241097807884216, .2990570068359375, 0, 2, 8, 1, 3, 4, -1, 9, 1, 1, 4, 3, -.0029802159406244755, .3041465878486633, .5078489780426025, 0, 2, 11, 4, 2, 4, -1, 11, 4, 1, 4, 2, -.0007458007894456387, .4128139019012451, .5256826281547546, 0, 2, 0, 17, 9, 3, -1, 3, 17, 3, 3, 3, -.0104709500446916, .5808395147323608, .4494296014308929, 0, 3, 11, 0, 2, 8, -1, 12, 0, 1, 4, 2, 11, 4, 1, 4, 2, .009336920455098152, .524655282497406, .265894889831543, 0, 3, 0, 8, 6, 12, -1, 0, 8, 3, 6, 2, 3, 14, 3, 6, 2, .0279369000345469, .4674955010414124, .7087256908416748, 0, 2, 10, 7, 4, 12, -1, 10, 13, 4, 6, 2, .007427767850458622, .5409486889839172, .3758518099784851, 0, 2, 5, 3, 8, 14, -1, 5, 10, 8, 7, 2, -.0235845092684031, .3758639991283417, .5238550901412964, 0, 2, 14, 10, 6, 1, -1, 14, 10, 3, 1, 2, .0011452640173956752, .4329578876495361, .5804247260093689, 0, 2, 0, 4, 10, 4, -1, 0, 6, 10, 2, 2, -.0004346866044215858, .5280618071556091, .3873069882392883, 0, 2, 10, 0, 5, 8, -1, 10, 4, 5, 4, 2, .0106485402211547, .4902113080024719, .5681251883506775, 0, 3, 8, 1, 4, 8, -1, 8, 1, 2, 4, 2, 10, 5, 2, 4, 2, -.0003941805043723434, .5570880174636841, .4318251013755798, 0, 2, 9, 11, 6, 1, -1, 11, 11, 2, 1, 3, -.00013270479394122958, .5658439993858337, .4343554973602295, 0, 2, 8, 9, 3, 4, -1, 9, 9, 1, 4, 3, -.002012551063671708, .6056739091873169, .4537523984909058, 0, 2, 18, 4, 2, 6, -1, 18, 6, 2, 2, 3, .0024854319635778666, .5390477180480957, .4138010144233704, 0, 2, 8, 8, 3, 4, -1, 9, 8, 1, 4, 3, .0018237880431115627, .4354828894138336, .5717188715934753, 0, 2, 7, 1, 13, 3, -1, 7, 2, 13, 1, 3, -.0166566595435143, .3010913133621216, .521612286567688, 0, 2, 7, 13, 6, 1, -1, 9, 13, 2, 1, 3, .0008034955826587975, .5300151109695435, .3818396925926209, 0, 2, 12, 11, 3, 6, -1, 12, 13, 3, 2, 3, .003417037893086672, .5328028798103333, .4241400063037872, 0, 2, 5, 11, 6, 1, -1, 7, 11, 2, 1, 3, -.00036222729249857366, .5491728186607361, .418697714805603, 0, 3, 1, 4, 18, 10, -1, 10, 4, 9, 5, 2, 1, 9, 9, 5, 2, -.1163002029061317, .1440722048282623, .522645115852356, 0, 2, 8, 6, 4, 9, -1, 8, 9, 4, 3, 3, -.0146950101479888, .7747725248336792, .4715717136859894, 0, 2, 8, 6, 4, 3, -1, 8, 7, 4, 1, 3, .0021972130052745342, .5355433821678162, .3315644860267639, 0, 2, 8, 7, 3, 3, -1, 9, 7, 1, 3, 3, -.00046965209185145795, .5767235159873962, .4458136856555939, 0, 2, 14, 15, 4, 3, -1, 14, 16, 4, 1, 3, .006514499895274639, .5215674042701721, .3647888898849487, 0, 2, 5, 10, 3, 10, -1, 6, 10, 1, 10, 3, .0213000606745481, .4994204938411713, .1567950993776321, 0, 2, 8, 15, 4, 3, -1, 8, 16, 4, 1, 3, .0031881409231573343, .4742200076580048, .6287270188331604, 0, 2, 0, 8, 1, 6, -1, 0, 10, 1, 2, 3, .0009001977741718292, .5347954034805298, .394375205039978, 0, 2, 10, 15, 1, 3, -1, 10, 16, 1, 1, 3, -.005177227780222893, .6727191805839539, .5013138055801392, 0, 2, 2, 15, 4, 3, -1, 2, 16, 4, 1, 3, -.004376464989036322, .3106675148010254, .5128793120384216, 0, 3, 18, 3, 2, 8, -1, 19, 3, 1, 4, 2, 18, 7, 1, 4, 2, .002629996044561267, .488631010055542, .5755215883255005, 0, 3, 0, 3, 2, 8, -1, 0, 3, 1, 4, 2, 1, 7, 1, 4, 2, -.002045868895947933, .6025794148445129, .4558076858520508, 0, 3, 3, 7, 14, 10, -1, 10, 7, 7, 5, 2, 3, 12, 7, 5, 2, .0694827064871788, .5240747928619385, .2185259014368057, 0, 2, 0, 7, 19, 3, -1, 0, 8, 19, 1, 3, .0240489393472672, .501186728477478, .2090622037649155, 0, 2, 12, 6, 3, 3, -1, 12, 7, 3, 1, 3, .003109534038230777, .4866712093353272, .7108548283576965, 0, 2, 0, 6, 1, 3, -1, 0, 7, 1, 1, 3, -.00125032605137676, .3407891094684601, .5156195163726807, 0, 2, 12, 6, 3, 3, -1, 12, 7, 3, 1, 3, -.0010281190043315291, .557557225227356, .443943202495575, 0, 2, 5, 6, 3, 3, -1, 5, 7, 3, 1, 3, -.008889362215995789, .6402000784873962, .4620442092418671, 0, 2, 8, 2, 4, 2, -1, 8, 3, 4, 1, 2, -.0006109480164013803, .3766441941261292, .5448899865150452, 0, 2, 6, 3, 4, 12, -1, 8, 3, 2, 12, 2, -.005768635775893927, .3318648934364319, .5133677124977112, 0, 2, 13, 6, 2, 3, -1, 13, 7, 2, 1, 3, .0018506490159779787, .4903570115566254, .6406934857368469, 0, 2, 0, 10, 20, 4, -1, 0, 12, 20, 2, 2, -.0997994691133499, .1536051034927368, .5015562176704407, 0, 2, 2, 0, 17, 14, -1, 2, 7, 17, 7, 2, -.3512834906578064, .0588231310248375, .5174378752708435, 0, 3, 0, 0, 6, 10, -1, 0, 0, 3, 5, 2, 3, 5, 3, 5, 2, -.0452445708215237, .6961488723754883, .4677872955799103, 0, 2, 14, 6, 6, 4, -1, 14, 6, 3, 4, 2, .0714815780520439, .5167986154556274, .1038092970848084, 0, 2, 0, 6, 6, 4, -1, 3, 6, 3, 4, 2, .0021895780228078365, .4273078143596649, .5532060861587524, 0, 2, 13, 2, 7, 2, -1, 13, 3, 7, 1, 2, -.0005924265133216977, .46389439702034, .5276389122009277, 0, 2, 0, 2, 7, 2, -1, 0, 3, 7, 1, 2, .0016788389766588807, .530164897441864, .3932034969329834, 0, 3, 6, 11, 14, 2, -1, 13, 11, 7, 1, 2, 6, 12, 7, 1, 2, -.0022163488902151585, .5630694031715393, .4757033884525299, 0, 3, 8, 5, 2, 2, -1, 8, 5, 1, 1, 2, 9, 6, 1, 1, 2, .00011568699846975505, .4307535886764526, .5535702705383301, 0, 2, 13, 9, 2, 3, -1, 13, 9, 1, 3, 2, -.007201728876680136, .144488200545311, .5193064212799072, 0, 2, 1, 1, 3, 12, -1, 2, 1, 1, 12, 3, .0008908127201721072, .4384432137012482, .5593621134757996, 0, 2, 17, 4, 1, 3, -1, 17, 5, 1, 1, 3, .00019605009583756328, .5340415835380554, .4705956876277924, 0, 2, 2, 4, 1, 3, -1, 2, 5, 1, 1, 3, .0005202214233577251, .5213856101036072, .3810079097747803, 0, 2, 14, 5, 1, 3, -1, 14, 6, 1, 1, 3, .0009458857239224017, .4769414961338043, .6130738854408264, 0, 2, 7, 16, 2, 3, -1, 7, 17, 2, 1, 3, 916984718060121e-19, .4245009124279022, .5429363250732422, 0, 3, 8, 13, 4, 6, -1, 10, 13, 2, 3, 2, 8, 16, 2, 3, 2, .002183320000767708, .5457730889320374, .419107586145401, 0, 2, 5, 5, 1, 3, -1, 5, 6, 1, 1, 3, -.0008603967144154012, .5764588713645935, .4471659958362579, 0, 2, 16, 0, 4, 20, -1, 16, 0, 2, 20, 2, -.0132362395524979, .6372823119163513, .4695009887218475, 0, 3, 5, 1, 2, 6, -1, 5, 1, 1, 3, 2, 6, 4, 1, 3, 2, .0004337670106906444, .5317873954772949, .394582986831665, 69.22987365722656, 140, 0, 2, 5, 4, 10, 4, -1, 5, 6, 10, 2, 2, -.024847149848938, .6555516719818115, .3873311877250671, 0, 2, 15, 2, 4, 12, -1, 15, 2, 2, 12, 2, .006134861148893833, .374807208776474, .5973997712135315, 0, 2, 7, 6, 4, 12, -1, 7, 12, 4, 6, 2, .006449849810451269, .542549192905426, .2548811137676239, 0, 2, 14, 5, 1, 8, -1, 14, 9, 1, 4, 2, .0006349121103994548, .2462442070245743, .5387253761291504, 0, 3, 1, 4, 14, 10, -1, 1, 4, 7, 5, 2, 8, 9, 7, 5, 2, .0014023890253156424, .5594322085380554, .3528657853603363, 0, 3, 11, 6, 6, 14, -1, 14, 6, 3, 7, 2, 11, 13, 3, 7, 2, .0003004400059580803, .3958503901958466, .576593816280365, 0, 3, 3, 6, 6, 14, -1, 3, 6, 3, 7, 2, 6, 13, 3, 7, 2, .00010042409849120304, .3698996901512146, .5534998178482056, 0, 2, 4, 9, 15, 2, -1, 9, 9, 5, 2, 3, -.005084149073809385, .3711090981960297, .5547800064086914, 0, 2, 7, 14, 6, 3, -1, 7, 15, 6, 1, 3, -.0195372607558966, .7492755055427551, .4579297006130219, 0, 3, 6, 3, 14, 4, -1, 13, 3, 7, 2, 2, 6, 5, 7, 2, 2, -7453274065483129e-21, .5649787187576294, .390406996011734, 0, 2, 1, 9, 15, 2, -1, 6, 9, 5, 2, 3, -.0036079459823668003, .3381088078022003, .5267801284790039, 0, 2, 6, 11, 8, 9, -1, 6, 14, 8, 3, 3, .002069750102236867, .5519291162490845, .3714388906955719, 0, 2, 7, 4, 3, 8, -1, 8, 4, 1, 8, 3, -.0004646384040825069, .5608214735984802, .4113566875457764, 0, 2, 14, 6, 2, 6, -1, 14, 9, 2, 3, 2, .0007549045258201659, .3559206128120422, .532935619354248, 0, 3, 5, 7, 6, 4, -1, 5, 7, 3, 2, 2, 8, 9, 3, 2, 2, -.0009832223877310753, .5414795875549316, .3763205111026764, 0, 2, 1, 1, 18, 19, -1, 7, 1, 6, 19, 3, -.0199406407773495, .634790301322937, .4705299139022827, 0, 2, 1, 2, 6, 5, -1, 4, 2, 3, 5, 2, .0037680300883948803, .3913489878177643, .5563716292381287, 0, 2, 12, 17, 6, 2, -1, 12, 18, 6, 1, 2, -.009452850557863712, .2554892897605896, .5215116739273071, 0, 2, 2, 17, 6, 2, -1, 2, 18, 6, 1, 2, .002956084907054901, .5174679160118103, .3063920140266419, 0, 2, 17, 3, 3, 6, -1, 17, 5, 3, 2, 3, .009107873775064945, .5388448238372803, .2885963022708893, 0, 2, 8, 17, 3, 3, -1, 8, 18, 3, 1, 3, .0018219229532405734, .4336043000221252, .58521968126297, 0, 2, 10, 13, 2, 6, -1, 10, 16, 2, 3, 2, .0146887395530939, .5287361741065979, .2870005965232849, 0, 2, 7, 13, 6, 3, -1, 7, 14, 6, 1, 3, -.0143879903480411, .701944887638092, .4647370874881744, 0, 2, 17, 3, 3, 6, -1, 17, 5, 3, 2, 3, -.0189866498112679, .2986552119255066, .5247011780738831, 0, 2, 8, 13, 2, 3, -1, 8, 14, 2, 1, 3, .0011527639580890536, .4323473870754242, .593166172504425, 0, 2, 9, 3, 6, 2, -1, 11, 3, 2, 2, 3, .0109336702153087, .5286864042282104, .3130319118499756, 0, 2, 0, 3, 3, 6, -1, 0, 5, 3, 2, 3, -.0149327302351594, .2658419013023377, .508407711982727, 0, 2, 8, 5, 4, 6, -1, 8, 7, 4, 2, 3, -.0002997053961735219, .5463526844978333, .374072402715683, 0, 2, 5, 5, 3, 2, -1, 5, 6, 3, 1, 2, .004167762119323015, .4703496992588043, .7435721755027771, 0, 2, 10, 1, 3, 4, -1, 11, 1, 1, 4, 3, -.00639053201302886, .2069258987903595, .5280538201332092, 0, 2, 1, 2, 5, 9, -1, 1, 5, 5, 3, 3, .004502960946410894, .518264889717102, .348354309797287, 0, 2, 13, 6, 2, 3, -1, 13, 7, 2, 1, 3, -.009204036556184292, .680377721786499, .4932360053062439, 0, 2, 0, 6, 14, 3, -1, 7, 6, 7, 3, 2, .0813272595405579, .5058398842811584, .2253051996231079, 0, 2, 2, 11, 18, 8, -1, 2, 15, 18, 4, 2, -.150792807340622, .2963424921035767, .5264679789543152, 0, 2, 5, 6, 2, 3, -1, 5, 7, 2, 1, 3, .0033179009333252907, .4655495882034302, .7072932124137878, 0, 3, 10, 6, 4, 2, -1, 12, 6, 2, 1, 2, 10, 7, 2, 1, 2, .0007740280125290155, .4780347943305969, .5668237805366516, 0, 3, 6, 6, 4, 2, -1, 6, 6, 2, 1, 2, 8, 7, 2, 1, 2, .0006819954141974449, .4286996126174927, .5722156763076782, 0, 2, 10, 1, 3, 4, -1, 11, 1, 1, 4, 3, .0053671570494771, .5299307107925415, .3114621937274933, 0, 2, 7, 1, 2, 7, -1, 8, 1, 1, 7, 2, 9701866656541824e-20, .3674638867378235, .5269461870193481, 0, 2, 4, 2, 15, 14, -1, 4, 9, 15, 7, 2, -.1253408938646317, .2351492047309876, .5245791077613831, 0, 2, 8, 7, 3, 2, -1, 9, 7, 1, 2, 3, -.005251626949757338, .7115936875343323, .4693767130374908, 0, 3, 2, 3, 18, 4, -1, 11, 3, 9, 2, 2, 2, 5, 9, 2, 2, -.007834210991859436, .4462651014328003, .5409085750579834, 0, 2, 9, 7, 2, 2, -1, 10, 7, 1, 2, 2, -.001131006982177496, .5945618748664856, .4417662024497986, 0, 2, 13, 9, 2, 3, -1, 13, 9, 1, 3, 2, .0017601120052859187, .5353249907493591, .3973453044891357, 0, 2, 5, 2, 6, 2, -1, 7, 2, 2, 2, 3, -.00081581249833107, .3760268092155457, .5264726877212524, 0, 2, 9, 5, 2, 7, -1, 9, 5, 1, 7, 2, -.003868758911266923, .6309912800788879, .4749819934368134, 0, 2, 5, 9, 2, 3, -1, 6, 9, 1, 3, 2, .0015207129763439298, .5230181813240051, .3361223936080933, 0, 2, 6, 0, 14, 18, -1, 6, 9, 14, 9, 2, .545867383480072, .5167139768600464, .1172635033726692, 0, 2, 2, 16, 6, 3, -1, 2, 17, 6, 1, 3, .0156501904129982, .4979439079761505, .1393294930458069, 0, 2, 9, 7, 3, 6, -1, 10, 7, 1, 6, 3, -.0117318602278829, .7129650712013245, .4921196103096008, 0, 2, 7, 8, 4, 3, -1, 7, 9, 4, 1, 3, -.006176512222737074, .2288102954626083, .5049701929092407, 0, 2, 7, 12, 6, 3, -1, 7, 13, 6, 1, 3, .0022457661107182503, .4632433950901032, .6048725843429565, 0, 2, 9, 12, 2, 3, -1, 9, 13, 2, 1, 3, -.005191586911678314, .6467421054840088, .4602192938327789, 0, 2, 7, 12, 6, 2, -1, 9, 12, 2, 2, 3, -.0238278806209564, .1482000946998596, .5226079225540161, 0, 2, 5, 11, 4, 6, -1, 5, 14, 4, 3, 2, .0010284580057486892, .5135489106178284, .3375957012176514, 0, 2, 11, 12, 7, 2, -1, 11, 13, 7, 1, 2, -.0100788502022624, .2740561068058014, .5303567051887512, 0, 3, 6, 10, 8, 6, -1, 6, 10, 4, 3, 2, 10, 13, 4, 3, 2, .002616893034428358, .533267080783844, .3972454071044922, 0, 2, 11, 10, 3, 4, -1, 11, 12, 3, 2, 2, .000543853675480932, .5365604162216187, .4063411951065064, 0, 2, 9, 16, 2, 3, -1, 9, 17, 2, 1, 3, .005351051222532988, .4653759002685547, .6889045834541321, 0, 2, 13, 3, 1, 9, -1, 13, 6, 1, 3, 3, -.0015274790348485112, .5449501276016235, .3624723851680756, 0, 2, 1, 13, 14, 6, -1, 1, 15, 14, 2, 3, -.0806244164705276, .1656087040901184, .5000287294387817, 0, 2, 13, 6, 1, 6, -1, 13, 9, 1, 3, 2, .0221920292824507, .5132731199264526, .2002808004617691, 0, 2, 0, 4, 3, 8, -1, 1, 4, 1, 8, 3, .007310063112527132, .4617947936058044, .6366536021232605, 0, 2, 18, 0, 2, 18, -1, 18, 0, 1, 18, 2, -.006406307220458984, .5916250944137573, .4867860972881317, 0, 2, 2, 3, 6, 2, -1, 2, 4, 6, 1, 2, -.0007641504053026438, .388840913772583, .5315797924995422, 0, 2, 9, 0, 8, 6, -1, 9, 2, 8, 2, 3, .0007673448999412358, .4159064888954163, .5605279803276062, 0, 2, 6, 6, 1, 6, -1, 6, 9, 1, 3, 2, .0006147450185380876, .3089022040367127, .5120148062705994, 0, 2, 14, 8, 6, 3, -1, 14, 9, 6, 1, 3, -.005010527092963457, .3972199857234955, .5207306146621704, 0, 2, 0, 0, 2, 18, -1, 1, 0, 1, 18, 2, -.008690913207828999, .6257408261299133, .4608575999736786, 0, 3, 1, 18, 18, 2, -1, 10, 18, 9, 1, 2, 1, 19, 9, 1, 2, -.016391459852457, .2085209935903549, .5242266058921814, 0, 2, 3, 15, 2, 2, -1, 3, 16, 2, 1, 2, .00040973909199237823, .5222427248954773, .3780320882797241, 0, 2, 8, 14, 5, 3, -1, 8, 15, 5, 1, 3, -.002524228999391198, .5803927183151245, .4611890017986298, 0, 2, 8, 14, 2, 3, -1, 8, 15, 2, 1, 3, .0005094531225040555, .4401271939277649, .5846015810966492, 0, 2, 12, 3, 3, 3, -1, 13, 3, 1, 3, 3, .001965641975402832, .5322325229644775, .4184590876102448, 0, 2, 7, 5, 6, 2, -1, 9, 5, 2, 2, 3, .0005629889783449471, .3741844892501831, .5234565734863281, 0, 2, 15, 5, 5, 2, -1, 15, 6, 5, 1, 2, -.0006794679793529212, .4631041884422302, .5356478095054626, 0, 2, 0, 5, 5, 2, -1, 0, 6, 5, 1, 2, .007285634987056255, .5044670104980469, .2377564013004303, 0, 2, 17, 14, 1, 6, -1, 17, 17, 1, 3, 2, -.0174594894051552, .7289121150970459, .5050435066223145, 0, 2, 2, 9, 9, 3, -1, 5, 9, 3, 3, 3, -.0254217498004436, .6667134761810303, .4678100049495697, 0, 2, 12, 3, 3, 3, -1, 13, 3, 1, 3, 3, -.0015647639520466328, .4391759037971497, .532362699508667, 0, 2, 0, 0, 4, 18, -1, 2, 0, 2, 18, 2, .0114443600177765, .4346440136432648, .5680012106895447, 0, 2, 17, 6, 1, 3, -1, 17, 7, 1, 1, 3, -.0006735255010426044, .44771409034729, .5296812057495117, 0, 2, 2, 14, 1, 6, -1, 2, 17, 1, 3, 2, .009319420903921127, .4740200042724609, .7462607026100159, 0, 2, 19, 8, 1, 2, -1, 19, 9, 1, 1, 2, .00013328490604180843, .536506175994873, .475213497877121, 0, 2, 5, 3, 3, 3, -1, 6, 3, 1, 3, 3, -.007881579920649529, .1752219051122665, .5015255212783813, 0, 2, 9, 16, 2, 3, -1, 9, 17, 2, 1, 3, -.005798568017780781, .7271236777305603, .4896200895309448, 0, 2, 2, 6, 1, 3, -1, 2, 7, 1, 1, 3, -.0003892249951604754, .4003908932209015, .5344941020011902, 0, 3, 12, 4, 8, 2, -1, 16, 4, 4, 1, 2, 12, 5, 4, 1, 2, -.0019288610201328993, .5605612993240356, .4803955852985382, 0, 3, 0, 4, 8, 2, -1, 0, 4, 4, 1, 2, 4, 5, 4, 1, 2, .008421415463089943, .4753246903419495, .7623608708381653, 0, 2, 2, 16, 18, 4, -1, 2, 18, 18, 2, 2, .008165587671101093, .5393261909484863, .419164389371872, 0, 2, 7, 15, 2, 4, -1, 7, 17, 2, 2, 2, .00048280550981871784, .4240800142288208, .5399821996688843, 0, 2, 4, 0, 14, 3, -1, 4, 1, 14, 1, 3, -.002718663075938821, .4244599938392639, .5424923896789551, 0, 2, 0, 0, 4, 20, -1, 2, 0, 2, 20, 2, -.0125072300434113, .5895841717720032, .4550411105155945, 0, 3, 12, 4, 4, 8, -1, 14, 4, 2, 4, 2, 12, 8, 2, 4, 2, -.0242865197360516, .2647134959697723, .518917977809906, 0, 3, 6, 7, 2, 2, -1, 6, 7, 1, 1, 2, 7, 8, 1, 1, 2, -.0029676330741494894, .734768271446228, .4749749898910523, 0, 2, 10, 6, 2, 3, -1, 10, 7, 2, 1, 3, -.0125289997085929, .2756049931049347, .5177599787712097, 0, 2, 8, 7, 3, 2, -1, 8, 8, 3, 1, 2, -.0010104000102728605, .3510560989379883, .5144724249839783, 0, 2, 8, 2, 6, 12, -1, 8, 8, 6, 6, 2, -.0021348530426621437, .5637925863265991, .466731995344162, 0, 2, 4, 0, 11, 12, -1, 4, 4, 11, 4, 3, .0195642597973347, .4614573121070862, .6137639880180359, 0, 2, 14, 9, 6, 11, -1, 16, 9, 2, 11, 3, -.0971463471651077, .2998378872871399, .5193555951118469, 0, 2, 0, 14, 4, 3, -1, 0, 15, 4, 1, 3, .00450145686045289, .5077884793281555, .3045755922794342, 0, 2, 9, 10, 2, 3, -1, 9, 11, 2, 1, 3, .006370697170495987, .486101895570755, .6887500882148743, 0, 2, 5, 11, 3, 2, -1, 5, 12, 3, 1, 2, -.009072152897715569, .1673395931720734, .5017563104629517, 0, 2, 9, 15, 3, 3, -1, 10, 15, 1, 3, 3, -.005353720858693123, .2692756950855255, .524263322353363, 0, 2, 8, 8, 3, 4, -1, 9, 8, 1, 4, 3, -.0109328404068947, .7183864116668701, .4736028909683228, 0, 2, 9, 15, 3, 3, -1, 10, 15, 1, 3, 3, .008235607296228409, .5223966836929321, .2389862984418869, 0, 2, 7, 7, 3, 2, -1, 8, 7, 1, 2, 3, -.0010038160253316164, .5719355940818787, .4433943033218384, 0, 3, 2, 10, 16, 4, -1, 10, 10, 8, 2, 2, 2, 12, 8, 2, 2, .004085912834852934, .5472841858863831, .4148836135864258, 0, 2, 2, 3, 4, 17, -1, 4, 3, 2, 17, 2, .1548541933298111, .4973812103271484, .0610615983605385, 0, 2, 15, 13, 2, 7, -1, 15, 13, 1, 7, 2, .00020897459762636572, .4709174036979675, .542388916015625, 0, 2, 2, 2, 6, 1, -1, 5, 2, 3, 1, 2, .0003331699117552489, .4089626967906952, .5300992131233215, 0, 2, 5, 2, 12, 4, -1, 9, 2, 4, 4, 3, -.0108134001493454, .6104369759559631, .4957334101200104, 0, 3, 6, 0, 8, 12, -1, 6, 0, 4, 6, 2, 10, 6, 4, 6, 2, .0456560105085373, .5069689154624939, .2866660058498383, 0, 3, 13, 7, 2, 2, -1, 14, 7, 1, 1, 2, 13, 8, 1, 1, 2, .0012569549726322293, .484691709280014, .631817102432251, 0, 2, 0, 12, 20, 6, -1, 0, 14, 20, 2, 3, -.120150700211525, .0605261400341988, .4980959892272949, 0, 2, 14, 7, 2, 3, -1, 14, 7, 1, 3, 2, -.00010533799650147557, .5363109707832336, .4708042144775391, 0, 2, 0, 8, 9, 12, -1, 3, 8, 3, 12, 3, -.2070319056510925, .059660330414772, .497909814119339, 0, 2, 3, 0, 16, 2, -1, 3, 0, 8, 2, 2, .00012909180077258497, .4712977111339569, .5377997756004333, 0, 2, 6, 15, 3, 3, -1, 6, 16, 3, 1, 3, .000388185289921239, .4363538026809692, .5534191131591797, 0, 2, 8, 15, 6, 3, -1, 8, 16, 6, 1, 3, -.0029243610333651304, .5811185836791992, .4825215935707092, 0, 2, 0, 10, 1, 6, -1, 0, 12, 1, 2, 3, .0008388233254663646, .5311700105667114, .403813898563385, 0, 2, 10, 9, 4, 3, -1, 10, 10, 4, 1, 3, -.0019061550265178084, .3770701885223389, .526001513004303, 0, 2, 9, 15, 2, 3, -1, 9, 16, 2, 1, 3, .00895143486559391, .4766167998313904, .7682183980941772, 0, 2, 5, 7, 10, 1, -1, 5, 7, 5, 1, 2, .0130834598094225, .5264462828636169, .3062222003936768, 0, 2, 4, 0, 12, 19, -1, 10, 0, 6, 19, 2, -.2115933001041412, .6737198233604431, .4695810079574585, 0, 3, 0, 6, 20, 6, -1, 10, 6, 10, 3, 2, 0, 9, 10, 3, 2, .0031493250280618668, .5644835233688354, .4386953115463257, 0, 3, 3, 6, 2, 2, -1, 3, 6, 1, 1, 2, 4, 7, 1, 1, 2, .00039754100725986063, .4526061117649078, .5895630121231079, 0, 3, 15, 6, 2, 2, -1, 16, 6, 1, 1, 2, 15, 7, 1, 1, 2, -.0013814480043947697, .6070582270622253, .4942413866519928, 0, 3, 3, 6, 2, 2, -1, 3, 6, 1, 1, 2, 4, 7, 1, 1, 2, -.0005812218878418207, .5998213291168213, .4508252143859863, 0, 2, 14, 4, 1, 12, -1, 14, 10, 1, 6, 2, -.002390532987192273, .420558899641037, .5223848223686218, 0, 3, 2, 5, 16, 10, -1, 2, 5, 8, 5, 2, 10, 10, 8, 5, 2, .0272689294070005, .5206447243690491, .3563301861286163, 0, 2, 9, 17, 3, 2, -1, 10, 17, 1, 2, 3, -.0037658358924090862, .3144704103469849, .5218814015388489, 0, 2, 1, 4, 2, 2, -1, 1, 5, 2, 1, 2, -.0014903489500284195, .338019609451294, .5124437212944031, 0, 2, 5, 0, 15, 5, -1, 10, 0, 5, 5, 3, -.0174282304942608, .5829960703849792, .4919725954532623, 0, 2, 0, 0, 15, 5, -1, 5, 0, 5, 5, 3, -.0152780301868916, .6163144707679749, .4617887139320374, 0, 2, 11, 2, 2, 17, -1, 11, 2, 1, 17, 2, .0319956094026566, .5166357159614563, .171276405453682, 0, 2, 7, 2, 2, 17, -1, 8, 2, 1, 17, 2, -.003825671039521694, .3408012092113495, .5131387710571289, 0, 2, 15, 11, 2, 9, -1, 15, 11, 1, 9, 2, -.00851864367723465, .6105518937110901, .4997941851615906, 0, 2, 3, 11, 2, 9, -1, 4, 11, 1, 9, 2, .0009064162150025368, .4327270984649658, .5582311153411865, 0, 2, 5, 16, 14, 4, -1, 5, 16, 7, 4, 2, .0103448498994112, .4855653047561646, .5452420115470886, 79.24907684326172, 160, 0, 2, 1, 4, 18, 1, -1, 7, 4, 6, 1, 3, .007898182608187199, .333252489566803, .5946462154388428, 0, 3, 13, 7, 6, 4, -1, 16, 7, 3, 2, 2, 13, 9, 3, 2, 2, .0016170160379260778, .3490641117095947, .5577868819236755, 0, 2, 9, 8, 2, 12, -1, 9, 12, 2, 4, 3, -.0005544974119402468, .5542566180229187, .3291530013084412, 0, 2, 12, 1, 6, 6, -1, 12, 3, 6, 2, 3, .001542898011393845, .3612579107284546, .5545979142189026, 0, 3, 5, 2, 6, 6, -1, 5, 2, 3, 3, 2, 8, 5, 3, 3, 2, -.0010329450014978647, .3530139029026032, .5576140284538269, 0, 3, 9, 16, 6, 4, -1, 12, 16, 3, 2, 2, 9, 18, 3, 2, 2, .0007769815856590867, .3916778862476349, .5645321011543274, 0, 2, 1, 2, 18, 3, -1, 7, 2, 6, 3, 3, .143203005194664, .4667482078075409, .7023633122444153, 0, 2, 7, 4, 9, 10, -1, 7, 9, 9, 5, 2, -.007386649027466774, .3073684871196747, .5289257764816284, 0, 2, 5, 9, 4, 4, -1, 7, 9, 2, 4, 2, -.0006293674232438207, .562211811542511, .4037049114704132, 0, 2, 11, 10, 3, 6, -1, 11, 13, 3, 3, 2, .0007889352855272591, .5267661213874817, .3557874858379364, 0, 2, 7, 11, 5, 3, -1, 7, 12, 5, 1, 3, -.0122280502691865, .6668320894241333, .4625549912452698, 0, 3, 7, 11, 6, 6, -1, 10, 11, 3, 3, 2, 7, 14, 3, 3, 2, .0035420239437371492, .5521438121795654, .3869673013687134, 0, 2, 0, 0, 10, 9, -1, 0, 3, 10, 3, 3, -.0010585320414975286, .3628678023815155, .5320926904678345, 0, 2, 13, 14, 1, 6, -1, 13, 16, 1, 2, 3, 14935660146875307e-21, .4632444977760315, .5363323092460632, 0, 2, 0, 2, 3, 6, -1, 0, 4, 3, 2, 3, .005253770854324102, .5132231712341309, .3265708982944489, 0, 2, 8, 14, 4, 3, -1, 8, 15, 4, 1, 3, -.008233802393078804, .6693689823150635, .4774140119552612, 0, 2, 6, 14, 1, 6, -1, 6, 16, 1, 2, 3, 2186681012972258e-20, .405386209487915, .5457931160926819, 0, 2, 9, 15, 2, 3, -1, 9, 16, 2, 1, 3, -.0038150229956954718, .645499587059021, .4793178141117096, 0, 2, 6, 4, 3, 3, -1, 7, 4, 1, 3, 3, .0011105879675596952, .5270407199859619, .3529678881168366, 0, 2, 9, 0, 11, 3, -1, 9, 1, 11, 1, 3, -.005770768970251083, .3803547024726868, .5352957844734192, 0, 2, 0, 6, 20, 3, -1, 0, 7, 20, 1, 3, -.003015833906829357, .533940315246582, .3887133002281189, 0, 2, 10, 1, 1, 2, -1, 10, 2, 1, 1, 2, -.0008545368909835815, .3564616143703461, .5273603796958923, 0, 2, 9, 6, 2, 6, -1, 10, 6, 1, 6, 2, .0110505102202296, .4671907126903534, .6849737763404846, 0, 2, 5, 8, 12, 1, -1, 9, 8, 4, 1, 3, .0426058396697044, .51514732837677, .0702200904488564, 0, 2, 3, 8, 12, 1, -1, 7, 8, 4, 1, 3, -.0030781750101596117, .3041661083698273, .5152602195739746, 0, 2, 9, 7, 3, 5, -1, 10, 7, 1, 5, 3, -.005481572821736336, .6430295705795288, .4897229969501495, 0, 2, 3, 9, 6, 2, -1, 6, 9, 3, 2, 2, .003188186092302203, .5307493209838867, .3826209902763367, 0, 2, 12, 9, 3, 3, -1, 12, 10, 3, 1, 3, .00035947180003859103, .4650047123432159, .5421904921531677, 0, 2, 7, 0, 6, 1, -1, 9, 0, 2, 1, 3, -.004070503171533346, .2849679887294769, .5079116225242615, 0, 2, 12, 9, 3, 3, -1, 12, 10, 3, 1, 3, -.0145941702648997, .2971645891666412, .5128461718559265, 0, 2, 7, 10, 2, 1, -1, 8, 10, 1, 1, 2, -.00011947689927183092, .563109815120697, .4343082010746002, 0, 2, 6, 4, 9, 13, -1, 9, 4, 3, 13, 3, -.0006934464909136295, .4403578042984009, .5359959006309509, 0, 2, 6, 8, 4, 2, -1, 6, 9, 4, 1, 2, 14834799912932795e-21, .3421008884906769, .5164697766304016, 0, 2, 16, 2, 4, 6, -1, 16, 2, 2, 6, 2, .009029698558151722, .4639343023300171, .6114075183868408, 0, 2, 0, 17, 6, 3, -1, 0, 18, 6, 1, 3, -.008064081892371178, .2820158898830414, .5075494050979614, 0, 2, 10, 10, 3, 10, -1, 10, 15, 3, 5, 2, .0260621197521687, .5208905935287476, .2688778042793274, 0, 2, 8, 7, 3, 5, -1, 9, 7, 1, 5, 3, .0173146594315767, .4663713872432709, .6738539934158325, 0, 2, 10, 4, 4, 3, -1, 10, 4, 2, 3, 2, .0226666405797005, .5209349989891052, .2212723940610886, 0, 2, 8, 4, 3, 8, -1, 9, 4, 1, 8, 3, -.002196592977270484, .6063101291656494, .4538190066814423, 0, 2, 6, 6, 9, 13, -1, 9, 6, 3, 13, 3, -.009528247639536858, .4635204970836639, .5247430801391602, 0, 3, 6, 0, 8, 12, -1, 6, 0, 4, 6, 2, 10, 6, 4, 6, 2, .00809436198323965, .5289440155029297, .3913882076740265, 0, 2, 14, 2, 6, 8, -1, 16, 2, 2, 8, 3, -.0728773325681686, .7752001881599426, .4990234971046448, 0, 2, 6, 0, 3, 6, -1, 7, 0, 1, 6, 3, -.006900952197611332, .2428039014339447, .5048090219497681, 0, 2, 14, 2, 6, 8, -1, 16, 2, 2, 8, 3, -.0113082397729158, .5734364986419678, .4842376112937927, 0, 2, 0, 5, 6, 6, -1, 0, 8, 6, 3, 2, .0596132017672062, .5029836297035217, .2524977028369904, 0, 3, 9, 12, 6, 2, -1, 12, 12, 3, 1, 2, 9, 13, 3, 1, 2, -.0028624620754271746, .6073045134544373, .4898459911346436, 0, 2, 8, 17, 3, 2, -1, 9, 17, 1, 2, 3, .00447814492508769, .5015289187431335, .2220316976308823, 0, 3, 11, 6, 2, 2, -1, 12, 6, 1, 1, 2, 11, 7, 1, 1, 2, -.001751324045471847, .6614428758621216, .4933868944644928, 0, 2, 1, 9, 18, 2, -1, 7, 9, 6, 2, 3, .0401634201407433, .5180878043174744, .3741044998168945, 0, 3, 11, 6, 2, 2, -1, 12, 6, 1, 1, 2, 11, 7, 1, 1, 2, .0003476894926279783, .4720416963100433, .5818032026290894, 0, 2, 3, 4, 12, 8, -1, 7, 4, 4, 8, 3, .00265516503714025, .3805010914802551, .5221335887908936, 0, 2, 13, 11, 5, 3, -1, 13, 12, 5, 1, 3, -.008770627900958061, .294416606426239, .5231295228004456, 0, 2, 9, 10, 2, 3, -1, 9, 11, 2, 1, 3, -.005512209143489599, .7346177101135254, .4722816944122315, 0, 2, 14, 7, 2, 3, -1, 14, 7, 1, 3, 2, .0006867204210720956, .5452876091003418, .424241304397583, 0, 2, 5, 4, 1, 3, -1, 5, 5, 1, 1, 3, .0005601966986432672, .439886212348938, .5601285099983215, 0, 2, 13, 4, 2, 3, -1, 13, 5, 2, 1, 3, .0024143769405782223, .4741686880588532, .6136621832847595, 0, 2, 5, 4, 2, 3, -1, 5, 5, 2, 1, 3, -.0015680900542065501, .604455292224884, .4516409933567047, 0, 2, 9, 8, 2, 3, -1, 9, 9, 2, 1, 3, -.0036827491130679846, .2452459037303925, .5294982194900513, 0, 2, 8, 9, 2, 2, -1, 8, 10, 2, 1, 2, -.000294091907562688, .3732838034629822, .5251451134681702, 0, 2, 15, 14, 1, 4, -1, 15, 16, 1, 2, 2, .00042847759323194623, .5498809814453125, .4065535068511963, 0, 2, 3, 12, 2, 2, -1, 3, 13, 2, 1, 2, -.004881707020103931, .2139908969402313, .4999957084655762, 0, 3, 12, 15, 2, 2, -1, 13, 15, 1, 1, 2, 12, 16, 1, 1, 2, .00027272020815871656, .465028703212738, .581342875957489, 0, 2, 9, 13, 2, 2, -1, 9, 14, 2, 1, 2, .00020947199664078653, .4387486875057221, .5572792887687683, 0, 2, 4, 11, 14, 9, -1, 4, 14, 14, 3, 3, .0485011897981167, .5244972705841064, .3212889134883881, 0, 2, 7, 13, 4, 3, -1, 7, 14, 4, 1, 3, -.004516641143709421, .605681300163269, .4545882046222687, 0, 2, 15, 14, 1, 4, -1, 15, 16, 1, 2, 2, -.0122916800901294, .2040929049253464, .5152214169502258, 0, 2, 4, 14, 1, 4, -1, 4, 16, 1, 2, 2, .0004854967992287129, .5237604975700378, .3739503026008606, 0, 2, 14, 0, 6, 13, -1, 16, 0, 2, 13, 3, .0305560491979122, .4960533976554871, .5938246250152588, 0, 3, 4, 1, 2, 12, -1, 4, 1, 1, 6, 2, 5, 7, 1, 6, 2, -.00015105320198927075, .5351303815841675, .4145204126834869, 0, 3, 11, 14, 6, 6, -1, 14, 14, 3, 3, 2, 11, 17, 3, 3, 2, .0024937440175563097, .4693366885185242, .5514941215515137, 0, 3, 3, 14, 6, 6, -1, 3, 14, 3, 3, 2, 6, 17, 3, 3, 2, -.012382130138576, .6791396737098694, .4681667983531952, 0, 2, 14, 17, 3, 2, -1, 14, 18, 3, 1, 2, -.005133346188813448, .3608739078044891, .5229160189628601, 0, 2, 3, 17, 3, 2, -1, 3, 18, 3, 1, 2, .0005191927775740623, .5300073027610779, .3633613884449005, 0, 2, 14, 0, 6, 13, -1, 16, 0, 2, 13, 3, .1506042033433914, .515731692314148, .2211782038211823, 0, 2, 0, 0, 6, 13, -1, 2, 0, 2, 13, 3, .007714414969086647, .4410496950149536, .5776609182357788, 0, 2, 10, 10, 7, 6, -1, 10, 12, 7, 2, 3, .009444352239370346, .5401855111122131, .375665009021759, 0, 3, 6, 15, 2, 2, -1, 6, 15, 1, 1, 2, 7, 16, 1, 1, 2, .00025006249779835343, .4368270933628082, .5607374906539917, 0, 3, 6, 11, 8, 6, -1, 10, 11, 4, 3, 2, 6, 14, 4, 3, 2, -.003307715058326721, .4244799017906189, .551823079586029, 0, 3, 7, 6, 2, 2, -1, 7, 6, 1, 1, 2, 8, 7, 1, 1, 2, .0007404891075566411, .4496962130069733, .5900576710700989, 0, 3, 2, 2, 16, 6, -1, 10, 2, 8, 3, 2, 2, 5, 8, 3, 2, .0440920516848564, .5293493270874023, .3156355023384094, 0, 2, 5, 4, 3, 3, -1, 5, 5, 3, 1, 3, .0033639909233897924, .4483296871185303, .5848662257194519, 0, 2, 11, 7, 3, 10, -1, 11, 12, 3, 5, 2, -.003976007923483849, .4559507071971893, .5483639240264893, 0, 2, 6, 7, 3, 10, -1, 6, 12, 3, 5, 2, .0027716930489987135, .534178614616394, .3792484104633331, 0, 2, 10, 7, 3, 2, -1, 11, 7, 1, 2, 3, -.00024123019829858094, .5667188763618469, .4576973021030426, 0, 2, 8, 12, 4, 2, -1, 8, 13, 4, 1, 2, .0004942566738463938, .4421244859695435, .5628787279129028, 0, 2, 10, 1, 1, 3, -1, 10, 2, 1, 1, 3, -.0003887646889779717, .4288370907306671, .5391063094139099, 0, 3, 1, 2, 4, 18, -1, 1, 2, 2, 9, 2, 3, 11, 2, 9, 2, -.0500488989055157, .6899513006210327, .4703742861747742, 0, 2, 12, 4, 4, 12, -1, 12, 10, 4, 6, 2, -.0366354808211327, .2217779010534287, .5191826224327087, 0, 2, 0, 0, 1, 6, -1, 0, 2, 1, 2, 3, .0024273579474538565, .5136224031448364, .3497397899627686, 0, 2, 9, 11, 2, 3, -1, 9, 12, 2, 1, 3, .001955803018063307, .4826192855834961, .640838086605072, 0, 2, 8, 7, 4, 3, -1, 8, 8, 4, 1, 3, -.0017494610510766506, .3922835886478424, .5272685289382935, 0, 2, 10, 7, 3, 2, -1, 11, 7, 1, 2, 3, .0139550799503922, .507820188999176, .8416504859924316, 0, 2, 7, 7, 3, 2, -1, 8, 7, 1, 2, 3, -.00021896739781368524, .5520489811897278, .4314234852790833, 0, 2, 9, 4, 6, 1, -1, 11, 4, 2, 1, 3, -.0015131309628486633, .3934605121612549, .5382571220397949, 0, 2, 8, 7, 2, 3, -1, 9, 7, 1, 3, 2, -.004362280014902353, .7370628714561462, .4736475944519043, 0, 3, 12, 7, 8, 6, -1, 16, 7, 4, 3, 2, 12, 10, 4, 3, 2, .0651605874300003, .5159279704093933, .328159511089325, 0, 3, 0, 7, 8, 6, -1, 0, 7, 4, 3, 2, 4, 10, 4, 3, 2, -.0023567399475723505, .3672826886177063, .5172886252403259, 0, 3, 18, 2, 2, 10, -1, 19, 2, 1, 5, 2, 18, 7, 1, 5, 2, .0151466596871614, .5031493902206421, .6687604188919067, 0, 2, 0, 2, 6, 4, -1, 3, 2, 3, 4, 2, -.0228509604930878, .676751971244812, .4709596931934357, 0, 2, 9, 4, 6, 1, -1, 11, 4, 2, 1, 3, .004886765033006668, .5257998108863831, .4059878885746002, 0, 3, 7, 15, 2, 2, -1, 7, 15, 1, 1, 2, 8, 16, 1, 1, 2, .0017619599821045995, .4696272909641266, .6688278913497925, 0, 2, 11, 13, 1, 6, -1, 11, 16, 1, 3, 2, -.0012942519970238209, .4320712983608246, .5344281792640686, 0, 2, 8, 13, 1, 6, -1, 8, 16, 1, 3, 2, .0109299495816231, .4997706115245819, .1637486070394516, 0, 2, 14, 3, 2, 1, -1, 14, 3, 1, 1, 2, 2995848990394734e-20, .4282417893409729, .5633224248886108, 0, 2, 8, 15, 2, 3, -1, 8, 16, 2, 1, 3, -.0065884361974895, .677212119102478, .4700526893138886, 0, 2, 12, 15, 7, 4, -1, 12, 17, 7, 2, 2, .0032527779694646597, .531339704990387, .4536148905754089, 0, 2, 4, 14, 12, 3, -1, 4, 15, 12, 1, 3, -.00404357397928834, .5660061836242676, .4413388967514038, 0, 2, 10, 3, 3, 2, -1, 11, 3, 1, 2, 3, -.0012523540062829852, .3731913864612579, .5356451869010925, 0, 2, 4, 12, 2, 2, -1, 4, 13, 2, 1, 2, .00019246719602961093, .5189986228942871, .3738811016082764, 0, 2, 10, 11, 4, 6, -1, 10, 14, 4, 3, 2, -.038589671254158, .2956373989582062, .51888108253479, 0, 3, 7, 13, 2, 2, -1, 7, 13, 1, 1, 2, 8, 14, 1, 1, 2, .0001548987056594342, .4347135126590729, .5509533286094666, 0, 3, 4, 11, 14, 4, -1, 11, 11, 7, 2, 2, 4, 13, 7, 2, 2, -.0337638482451439, .3230330049991608, .5195475816726685, 0, 2, 1, 18, 18, 2, -1, 7, 18, 6, 2, 3, -.008265706710517406, .5975489020347595, .4552114009857178, 0, 3, 11, 18, 2, 2, -1, 12, 18, 1, 1, 2, 11, 19, 1, 1, 2, 14481440302915871e-21, .4745678007602692, .5497426986694336, 0, 3, 7, 18, 2, 2, -1, 7, 18, 1, 1, 2, 8, 19, 1, 1, 2, 14951299817766994e-21, .4324473142623901, .5480644106864929, 0, 2, 12, 18, 8, 2, -1, 12, 19, 8, 1, 2, -.018741799518466, .1580052971839905, .517853319644928, 0, 2, 7, 14, 6, 2, -1, 7, 15, 6, 1, 2, .0017572239739820361, .4517636895179749, .5773764252662659, 0, 3, 8, 12, 4, 8, -1, 10, 12, 2, 4, 2, 8, 16, 2, 4, 2, -.0031391119118779898, .4149647951126099, .5460842251777649, 0, 2, 4, 9, 3, 3, -1, 4, 10, 3, 1, 3, 6665677938144654e-20, .4039090871810913, .5293084979057312, 0, 2, 7, 10, 6, 2, -1, 9, 10, 2, 2, 3, .006774342153221369, .4767651855945587, .612195611000061, 0, 2, 5, 0, 4, 15, -1, 7, 0, 2, 15, 2, -.0073868161998689175, .3586258888244629, .5187280774116516, 0, 2, 8, 6, 12, 14, -1, 12, 6, 4, 14, 3, .0140409301966429, .4712139964103699, .5576155781745911, 0, 2, 5, 16, 3, 3, -1, 5, 17, 3, 1, 3, -.005525832995772362, .2661027014255524, .5039281249046326, 0, 2, 8, 1, 12, 19, -1, 12, 1, 4, 19, 3, .3868423998355866, .5144339799880981, .2525899112224579, 0, 2, 3, 0, 3, 2, -1, 3, 1, 3, 1, 2, .0001145924034062773, .4284994900226593, .5423371195793152, 0, 2, 10, 12, 4, 5, -1, 10, 12, 2, 5, 2, -.0184675697237253, .3885835111141205, .5213062167167664, 0, 2, 6, 12, 4, 5, -1, 8, 12, 2, 5, 2, -.0004590701137203723, .541256308555603, .4235909879207611, 0, 3, 11, 11, 2, 2, -1, 12, 11, 1, 1, 2, 11, 12, 1, 1, 2, .0012527540093287826, .4899305105209351, .6624091267585754, 0, 2, 0, 2, 3, 6, -1, 0, 4, 3, 2, 3, .001491060946136713, .5286778211593628, .4040051996707916, 0, 3, 11, 11, 2, 2, -1, 12, 11, 1, 1, 2, 11, 12, 1, 1, 2, -.0007543556275777519, .6032990217208862, .4795120060443878, 0, 2, 7, 6, 4, 10, -1, 7, 11, 4, 5, 2, -.0069478838704526424, .408440113067627, .5373504161834717, 0, 3, 11, 11, 2, 2, -1, 12, 11, 1, 1, 2, 11, 12, 1, 1, 2, .0002809292054735124, .4846062958240509, .5759382247924805, 0, 2, 2, 13, 5, 2, -1, 2, 14, 5, 1, 2, .0009607371757738292, .5164741277694702, .3554979860782623, 0, 3, 11, 11, 2, 2, -1, 12, 11, 1, 1, 2, 11, 12, 1, 1, 2, -.0002688392996788025, .5677582025527954, .4731765985488892, 0, 3, 7, 11, 2, 2, -1, 7, 11, 1, 1, 2, 8, 12, 1, 1, 2, .0021599370520561934, .4731487035751343, .7070567011833191, 0, 2, 14, 13, 3, 3, -1, 14, 14, 3, 1, 3, .005623530130833387, .5240243077278137, .2781791985034943, 0, 2, 3, 13, 3, 3, -1, 3, 14, 3, 1, 3, -.005024399142712355, .2837013900279999, .5062304139137268, 0, 2, 9, 14, 2, 3, -1, 9, 15, 2, 1, 3, -.009761163964867592, .7400717735290527, .4934569001197815, 0, 2, 8, 7, 3, 3, -1, 8, 8, 3, 1, 3, .004151510074734688, .5119131207466125, .3407008051872253, 0, 2, 13, 5, 3, 3, -1, 13, 6, 3, 1, 3, .006246508099138737, .4923788011074066, .6579058766365051, 0, 2, 0, 9, 5, 3, -1, 0, 10, 5, 1, 3, -.007059747818857431, .2434711009263992, .503284215927124, 0, 2, 13, 5, 3, 3, -1, 13, 6, 3, 1, 3, -.0020587709732353687, .590031087398529, .469508707523346, 0, 3, 9, 12, 2, 8, -1, 9, 12, 1, 4, 2, 10, 16, 1, 4, 2, -.0024146060459315777, .3647317886352539, .5189201831817627, 0, 3, 11, 7, 2, 2, -1, 12, 7, 1, 1, 2, 11, 8, 1, 1, 2, -.0014817609917372465, .6034948229789734, .4940128028392792, 0, 2, 0, 16, 6, 4, -1, 3, 16, 3, 4, 2, -.0063016400672495365, .5818989872932434, .4560427963733673, 0, 2, 10, 6, 2, 3, -1, 10, 7, 2, 1, 3, .00347634288482368, .5217475891113281, .3483993113040924, 0, 2, 9, 5, 2, 6, -1, 9, 7, 2, 2, 3, -.0222508702427149, .2360700070858002, .5032082796096802, 0, 2, 12, 15, 8, 4, -1, 12, 15, 4, 4, 2, -.030612550675869, .6499186754226685, .4914919137954712, 0, 2, 0, 14, 8, 6, -1, 4, 14, 4, 6, 2, .013057479634881, .4413323104381561, .5683764219284058, 0, 2, 9, 0, 3, 2, -1, 10, 0, 1, 2, 3, -.0006009574281051755, .4359731078147888, .5333483219146729, 0, 2, 4, 15, 4, 2, -1, 6, 15, 2, 2, 2, -.0004151425091549754, .550406277179718, .4326060116291046, 0, 2, 12, 7, 3, 13, -1, 13, 7, 1, 13, 3, -.013776290230453, .4064112901687622, .5201548933982849, 0, 2, 5, 7, 3, 13, -1, 6, 7, 1, 13, 3, -.0322965085506439, .0473519712686539, .4977194964885712, 0, 2, 9, 6, 3, 9, -1, 9, 9, 3, 3, 3, .0535569787025452, .4881733059883118, .666693925857544, 0, 2, 4, 4, 7, 12, -1, 4, 10, 7, 6, 2, .008188954554498196, .5400037169456482, .4240820109844208, 0, 3, 12, 12, 2, 2, -1, 13, 12, 1, 1, 2, 12, 13, 1, 1, 2, .00021055320394225419, .4802047908306122, .5563852787017822, 0, 3, 6, 12, 2, 2, -1, 6, 12, 1, 1, 2, 7, 13, 1, 1, 2, -.00243827304802835, .7387793064117432, .4773685038089752, 0, 3, 8, 9, 4, 2, -1, 10, 9, 2, 1, 2, 8, 10, 2, 1, 2, .003283557016402483, .5288546085357666, .3171291947364807, 0, 3, 3, 6, 2, 2, -1, 3, 6, 1, 1, 2, 4, 7, 1, 1, 2, .00237295706756413, .4750812947750092, .7060170769691467, 0, 2, 16, 6, 3, 2, -1, 16, 7, 3, 1, 2, -.0014541699783876538, .3811730146408081, .533073902130127, 87.69602966308594, 177, 0, 2, 0, 7, 19, 4, -1, 0, 9, 19, 2, 2, .0557552389800549, .4019156992435455, .6806036829948425, 0, 2, 10, 2, 10, 1, -1, 10, 2, 5, 1, 2, .002473024884238839, .3351148962974548, .5965719819068909, 0, 2, 9, 4, 2, 12, -1, 9, 10, 2, 6, 2, -.00035031698644161224, .5557708144187927, .3482286930084229, 0, 2, 12, 18, 4, 1, -1, 12, 18, 2, 1, 2, .0005416763015091419, .426085889339447, .5693380832672119, 0, 3, 1, 7, 6, 4, -1, 1, 7, 3, 2, 2, 4, 9, 3, 2, 2, .0007719367858953774, .3494240045547485, .5433688759803772, 0, 2, 12, 0, 6, 13, -1, 14, 0, 2, 13, 3, -.0015999219613149762, .4028499126434326, .5484359264373779, 0, 2, 2, 0, 6, 13, -1, 4, 0, 2, 13, 3, -.00011832080053864047, .3806901872158051, .5425465106964111, 0, 2, 10, 5, 8, 8, -1, 10, 9, 8, 4, 2, .0003290903114248067, .262010008096695, .5429521799087524, 0, 2, 8, 3, 2, 5, -1, 9, 3, 1, 5, 2, .0002951810893137008, .379976898431778, .5399264097213745, 0, 2, 8, 4, 9, 1, -1, 11, 4, 3, 1, 3, 9046671038959175e-20, .4433645009994507, .5440226197242737, 0, 2, 3, 4, 9, 1, -1, 6, 4, 3, 1, 3, 15007190086180344e-21, .3719654977321625, .5409119725227356, 0, 2, 1, 0, 18, 10, -1, 7, 0, 6, 10, 3, .1393561065196991, .552539587020874, .4479042887687683, 0, 2, 7, 17, 5, 3, -1, 7, 18, 5, 1, 3, .0016461990308016539, .4264501035213471, .5772169828414917, 0, 2, 7, 11, 6, 1, -1, 9, 11, 2, 1, 3, .0004998443182557821, .4359526038169861, .5685871243476868, 0, 2, 2, 2, 3, 2, -1, 2, 3, 3, 1, 2, -.001097128028050065, .3390136957168579, .5205408930778503, 0, 2, 8, 12, 4, 2, -1, 8, 13, 4, 1, 2, .0006691989256069064, .4557456076145172, .598065972328186, 0, 2, 6, 10, 3, 6, -1, 6, 13, 3, 3, 2, .0008647104259580374, .5134841203689575, .2944033145904541, 0, 2, 11, 4, 2, 4, -1, 11, 4, 1, 4, 2, -.0002718259929679334, .3906578123569489, .5377181172370911, 0, 2, 7, 4, 2, 4, -1, 8, 4, 1, 4, 2, 3024949910468422e-20, .3679609894752502, .5225688815116882, 0, 2, 9, 6, 2, 4, -1, 9, 6, 1, 4, 2, -.008522589690983295, .7293102145195007, .4892365038394928, 0, 2, 6, 13, 8, 3, -1, 6, 14, 8, 1, 3, .0016705560265108943, .43453249335289, .5696138143539429, 0, 2, 9, 15, 3, 4, -1, 10, 15, 1, 4, 3, -.0071433838456869125, .2591280043125153, .5225623846054077, 0, 2, 9, 2, 2, 17, -1, 10, 2, 1, 17, 2, -.0163193698972464, .6922279000282288, .4651575982570648, 0, 2, 7, 0, 6, 1, -1, 9, 0, 2, 1, 3, .004803426098078489, .5352262854576111, .3286302983760834, 0, 2, 8, 15, 3, 4, -1, 9, 15, 1, 4, 3, -.0075421929359436035, .2040544003248215, .5034546256065369, 0, 2, 7, 13, 7, 3, -1, 7, 14, 7, 1, 3, -.0143631100654602, .6804888844490051, .4889059066772461, 0, 2, 8, 16, 3, 3, -1, 9, 16, 1, 3, 3, .0008906358852982521, .5310695767402649, .3895480930805206, 0, 2, 6, 2, 8, 10, -1, 6, 7, 8, 5, 2, -.004406019113957882, .5741562843322754, .4372426867485046, 0, 2, 2, 5, 8, 8, -1, 2, 9, 8, 4, 2, -.0001886254030978307, .2831785976886749, .5098205208778381, 0, 2, 14, 16, 2, 2, -1, 14, 17, 2, 1, 2, -.0037979281041771173, .3372507989406586, .5246580243110657, 0, 2, 4, 16, 2, 2, -1, 4, 17, 2, 1, 2, .00014627049677073956, .5306674242019653, .391171008348465, 0, 2, 10, 11, 4, 6, -1, 10, 14, 4, 3, 2, -49164638767251745e-21, .5462496280670166, .3942720890045166, 0, 2, 6, 11, 4, 6, -1, 6, 14, 4, 3, 2, -.0335825011134148, .2157824039459229, .5048211812973022, 0, 2, 10, 14, 1, 3, -1, 10, 15, 1, 1, 3, -.0035339309833943844, .6465312242507935, .4872696995735169, 0, 2, 8, 14, 4, 3, -1, 8, 15, 4, 1, 3, .005014411173760891, .4617668092250824, .6248074769973755, 0, 3, 10, 0, 4, 6, -1, 12, 0, 2, 3, 2, 10, 3, 2, 3, 2, .0188173707574606, .5220689177513123, .2000052034854889, 0, 2, 0, 3, 20, 2, -1, 0, 4, 20, 1, 2, -.001343433978036046, .4014537930488586, .53016197681427, 0, 3, 12, 0, 8, 2, -1, 16, 0, 4, 1, 2, 12, 1, 4, 1, 2, .001755796023644507, .4794039130210877, .5653169751167297, 0, 2, 2, 12, 10, 8, -1, 2, 16, 10, 4, 2, -.0956374630331993, .2034195065498352, .5006706714630127, 0, 3, 17, 7, 2, 10, -1, 18, 7, 1, 5, 2, 17, 12, 1, 5, 2, -.0222412291914225, .7672473192214966, .5046340227127075, 0, 3, 1, 7, 2, 10, -1, 1, 7, 1, 5, 2, 2, 12, 1, 5, 2, -.0155758196488023, .7490342259407043, .4755851030349731, 0, 2, 15, 10, 3, 6, -1, 15, 12, 3, 2, 3, .005359911825507879, .5365303754806519, .4004670977592468, 0, 2, 4, 4, 6, 2, -1, 6, 4, 2, 2, 3, -.0217634998261929, .0740154981613159, .4964174926280975, 0, 2, 0, 5, 20, 6, -1, 0, 7, 20, 2, 3, -.165615901350975, .2859103083610535, .5218086242675781, 0, 3, 0, 0, 8, 2, -1, 0, 0, 4, 1, 2, 4, 1, 4, 1, 2, .0001646132004680112, .4191615879535675, .5380793213844299, 0, 2, 1, 0, 18, 4, -1, 7, 0, 6, 4, 3, -.008907750248908997, .6273192763328552, .4877404868602753, 0, 2, 1, 13, 6, 2, -1, 1, 14, 6, 1, 2, .0008634644909761846, .5159940719604492, .3671025931835175, 0, 2, 10, 8, 3, 4, -1, 11, 8, 1, 4, 3, -.0013751760125160217, .5884376764297485, .4579083919525147, 0, 2, 6, 1, 6, 1, -1, 8, 1, 2, 1, 3, -.0014081239933148026, .3560509979724884, .5139945149421692, 0, 2, 8, 14, 4, 3, -1, 8, 15, 4, 1, 3, -.003934288863092661, .5994288921356201, .466427206993103, 0, 2, 1, 6, 18, 2, -1, 10, 6, 9, 2, 2, -.0319669283926487, .3345462083816528, .5144183039665222, 0, 2, 15, 11, 1, 2, -1, 15, 12, 1, 1, 2, -15089280168467667e-21, .5582656264305115, .441405713558197, 0, 2, 6, 5, 1, 2, -1, 6, 6, 1, 1, 2, .0005199447041377425, .4623680114746094, .6168993711471558, 0, 2, 13, 4, 1, 3, -1, 13, 5, 1, 1, 3, -.0034220460802316666, .6557074785232544, .4974805116653442, 0, 2, 2, 15, 1, 2, -1, 2, 16, 1, 1, 2, .00017723299970384687, .5269501805305481, .3901908099651337, 0, 2, 12, 4, 4, 3, -1, 12, 5, 4, 1, 3, .0015716759953647852, .4633373022079468, .5790457725524902, 0, 2, 0, 0, 7, 3, -1, 0, 1, 7, 1, 3, -.00890413299202919, .2689608037471771, .5053591132164001, 0, 2, 9, 12, 6, 2, -1, 9, 12, 3, 2, 2, .00040677518700249493, .5456603169441223, .4329898953437805, 0, 2, 5, 4, 2, 3, -1, 5, 5, 2, 1, 3, .0067604780197143555, .4648993909358978, .6689761877059937, 0, 2, 18, 4, 2, 3, -1, 18, 5, 2, 1, 3, .0029100088868290186, .5309703946113586, .3377839922904968, 0, 2, 3, 0, 8, 6, -1, 3, 2, 8, 2, 3, .0013885459629818797, .4074738919734955, .5349133014678955, 0, 3, 0, 2, 20, 6, -1, 10, 2, 10, 3, 2, 0, 5, 10, 3, 2, -.0767642632126808, .1992176026105881, .522824227809906, 0, 2, 4, 7, 2, 4, -1, 5, 7, 1, 4, 2, -.00022688310127705336, .5438501834869385, .4253072142601013, 0, 2, 3, 10, 15, 2, -1, 8, 10, 5, 2, 3, -.006309415213763714, .4259178936481476, .5378909707069397, 0, 2, 3, 0, 12, 11, -1, 9, 0, 6, 11, 2, -.1100727990269661, .6904156804084778, .4721749126911163, 0, 2, 13, 0, 2, 6, -1, 13, 0, 1, 6, 2, .0002861965913325548, .4524914920330048, .5548306107521057, 0, 2, 0, 19, 2, 1, -1, 1, 19, 1, 1, 2, 2942532955785282e-20, .5370373725891113, .4236463904380798, 0, 3, 16, 10, 4, 10, -1, 18, 10, 2, 5, 2, 16, 15, 2, 5, 2, -.0248865708708763, .6423557996749878, .4969303905963898, 0, 2, 4, 8, 10, 3, -1, 4, 9, 10, 1, 3, .0331488512456417, .4988475143909454, .1613811999559403, 0, 2, 14, 12, 3, 3, -1, 14, 13, 3, 1, 3, .0007849169196560979, .541602611541748, .4223009049892426, 0, 3, 0, 10, 4, 10, -1, 0, 10, 2, 5, 2, 2, 15, 2, 5, 2, .004708718974143267, .4576328992843628, .6027557849884033, 0, 2, 18, 3, 2, 6, -1, 18, 5, 2, 2, 3, .0024144479539245367, .530897319316864, .4422498941421509, 0, 2, 6, 6, 1, 3, -1, 6, 7, 1, 1, 3, .0019523180089890957, .4705634117126465, .666332483291626, 0, 2, 7, 7, 7, 2, -1, 7, 8, 7, 1, 2, .0013031980488449335, .4406126141548157, .5526962280273438, 0, 2, 0, 3, 2, 6, -1, 0, 5, 2, 2, 3, .004473549779504538, .5129023790359497, .3301498889923096, 0, 2, 11, 1, 3, 1, -1, 12, 1, 1, 1, 3, -.002665286883711815, .3135471045970917, .5175036191940308, 0, 2, 5, 0, 2, 6, -1, 6, 0, 1, 6, 2, .0001366677024634555, .4119370877742767, .530687689781189, 0, 2, 1, 1, 18, 14, -1, 7, 1, 6, 14, 3, -.0171264503151178, .6177806258201599, .4836578965187073, 0, 2, 4, 6, 8, 3, -1, 8, 6, 4, 3, 2, -.0002660143072716892, .3654330968856812, .5169736742973328, 0, 2, 9, 12, 6, 2, -1, 9, 12, 3, 2, 2, -.022932380437851, .349091500043869, .5163992047309875, 0, 2, 5, 12, 6, 2, -1, 8, 12, 3, 2, 2, .0023316550068557262, .5166299939155579, .3709389865398407, 0, 2, 10, 7, 3, 5, -1, 11, 7, 1, 5, 3, .016925660893321, .501473605632782, .8053988218307495, 0, 2, 7, 7, 3, 5, -1, 8, 7, 1, 5, 3, -.008985882624983788, .6470788717269897, .465702086687088, 0, 2, 13, 0, 3, 10, -1, 14, 0, 1, 10, 3, -.0118746999651194, .3246378898620606, .5258755087852478, 0, 2, 4, 11, 3, 2, -1, 4, 12, 3, 1, 2, .00019350569345988333, .5191941857337952, .3839643895626068, 0, 2, 17, 3, 3, 6, -1, 18, 3, 1, 6, 3, .005871349014341831, .4918133914470673, .6187043190002441, 0, 2, 1, 8, 18, 10, -1, 1, 13, 18, 5, 2, -.2483879029750824, .1836802959442139, .4988150000572205, 0, 2, 13, 0, 3, 10, -1, 14, 0, 1, 10, 3, .0122560001909733, .5227053761482239, .3632029891014099, 0, 2, 9, 14, 2, 3, -1, 9, 15, 2, 1, 3, .0008399017970077693, .4490250051021576, .5774148106575012, 0, 2, 16, 3, 3, 7, -1, 17, 3, 1, 7, 3, .002540736924856901, .4804787039756775, .5858299136161804, 0, 2, 4, 0, 3, 10, -1, 5, 0, 1, 10, 3, -.0148224299773574, .2521049976348877, .5023537278175354, 0, 2, 16, 3, 3, 7, -1, 17, 3, 1, 7, 3, -.005797395948320627, .5996695756912231, .4853715002536774, 0, 2, 0, 9, 1, 2, -1, 0, 10, 1, 1, 2, .000726621481589973, .5153716802597046, .3671779930591583, 0, 2, 18, 1, 2, 10, -1, 18, 1, 1, 10, 2, -.0172325801104307, .6621719002723694, .4994656145572662, 0, 2, 0, 1, 2, 10, -1, 1, 1, 1, 10, 2, .007862408645451069, .4633395075798035, .6256101727485657, 0, 2, 10, 16, 3, 4, -1, 11, 16, 1, 4, 3, -.004734362009912729, .3615573048591614, .5281885266304016, 0, 2, 2, 8, 3, 3, -1, 3, 8, 1, 3, 3, .0008304847870022058, .4442889094352722, .5550957918167114, 0, 3, 11, 0, 2, 6, -1, 12, 0, 1, 3, 2, 11, 3, 1, 3, 2, .00766021991148591, .5162935256958008, .2613354921340942, 0, 3, 7, 0, 2, 6, -1, 7, 0, 1, 3, 2, 8, 3, 1, 3, 2, -.004104837775230408, .2789632081985474, .5019031763076782, 0, 2, 16, 3, 3, 7, -1, 17, 3, 1, 7, 3, .004851257894188166, .4968984127044678, .5661668181419373, 0, 2, 1, 3, 3, 7, -1, 2, 3, 1, 7, 3, .0009989645332098007, .4445607960224152, .5551813244819641, 0, 2, 14, 1, 6, 16, -1, 16, 1, 2, 16, 3, -.2702363133430481, .0293882098048925, .515131413936615, 0, 2, 0, 1, 6, 16, -1, 2, 1, 2, 16, 3, -.0130906803533435, .5699399709701538, .4447459876537323, 0, 3, 2, 0, 16, 8, -1, 10, 0, 8, 4, 2, 2, 4, 8, 4, 2, -.009434279054403305, .4305466115474701, .5487895011901855, 0, 2, 6, 8, 5, 3, -1, 6, 9, 5, 1, 3, -.0015482039889320731, .3680317103862763, .512808084487915, 0, 2, 9, 7, 3, 3, -1, 10, 7, 1, 3, 3, .005374613218009472, .4838916957378388, .6101555824279785, 0, 2, 8, 8, 4, 3, -1, 8, 9, 4, 1, 3, .0015786769799888134, .5325223207473755, .4118548035621643, 0, 2, 9, 6, 2, 4, -1, 9, 6, 1, 4, 2, .003685605013743043, .4810948073863983, .6252303123474121, 0, 2, 0, 7, 15, 1, -1, 5, 7, 5, 1, 3, .009388701990246773, .520022988319397, .3629410862922669, 0, 2, 8, 2, 7, 9, -1, 8, 5, 7, 3, 3, .0127926301211119, .4961709976196289, .673801600933075, 0, 3, 1, 7, 16, 4, -1, 1, 7, 8, 2, 2, 9, 9, 8, 2, 2, -.003366104094311595, .4060279130935669, .5283598899841309, 0, 2, 6, 12, 8, 2, -1, 6, 13, 8, 1, 2, .00039771420415490866, .4674113988876343, .5900775194168091, 0, 2, 8, 11, 3, 3, -1, 8, 12, 3, 1, 3, .0014868030557408929, .4519116878509522, .6082053780555725, 0, 3, 4, 5, 14, 10, -1, 11, 5, 7, 5, 2, 4, 10, 7, 5, 2, -.0886867493391037, .2807899117469788, .5180991888046265, 0, 2, 4, 12, 3, 2, -1, 4, 13, 3, 1, 2, -7429611287079751e-20, .5295584201812744, .408762514591217, 0, 2, 9, 11, 6, 1, -1, 11, 11, 2, 1, 3, -14932939848222304e-21, .5461400151252747, .4538542926311493, 0, 2, 4, 9, 7, 6, -1, 4, 11, 7, 2, 3, .005916223861277103, .5329161286354065, .4192134141921997, 0, 2, 7, 10, 6, 3, -1, 7, 11, 6, 1, 3, .001114164013415575, .4512017965316773, .5706217288970947, 0, 2, 9, 11, 2, 2, -1, 9, 12, 2, 1, 2, 8924936264520511e-20, .4577805995941162, .5897638201713562, 0, 2, 0, 5, 20, 6, -1, 0, 7, 20, 2, 3, .0025319510605186224, .5299603939056396, .3357639014720917, 0, 2, 6, 4, 6, 1, -1, 8, 4, 2, 1, 3, .0124262003228068, .4959059059619904, .1346601992845535, 0, 2, 9, 11, 6, 1, -1, 11, 11, 2, 1, 3, .0283357501029968, .5117079019546509, .0006104363710619509, 0, 2, 5, 11, 6, 1, -1, 7, 11, 2, 1, 3, .006616588216274977, .4736349880695343, .7011628150939941, 0, 2, 10, 16, 3, 4, -1, 11, 16, 1, 4, 3, .008046876639127731, .5216417908668518, .3282819986343384, 0, 2, 8, 7, 3, 3, -1, 9, 7, 1, 3, 3, -.001119398046284914, .5809860825538635, .4563739001750946, 0, 2, 2, 12, 16, 8, -1, 2, 16, 16, 4, 2, .0132775902748108, .5398362278938293, .4103901088237763, 0, 2, 0, 15, 15, 2, -1, 0, 16, 15, 1, 2, .0004879473999608308, .424928605556488, .5410590767860413, 0, 2, 15, 4, 5, 6, -1, 15, 6, 5, 2, 3, .0112431701272726, .526996374130249, .3438215851783752, 0, 2, 9, 5, 2, 4, -1, 10, 5, 1, 4, 2, -.0008989666821435094, .5633075833320618, .4456613063812256, 0, 2, 8, 10, 9, 6, -1, 8, 12, 9, 2, 3, .006667715962976217, .5312889218330383, .4362679123878479, 0, 2, 2, 19, 15, 1, -1, 7, 19, 5, 1, 3, .0289472993463278, .4701794981956482, .657579779624939, 0, 2, 10, 16, 3, 4, -1, 11, 16, 1, 4, 3, -.0234000496566296, 0, .5137398838996887, 0, 2, 0, 15, 20, 4, -1, 0, 17, 20, 2, 2, -.0891170501708984, .0237452797591686, .4942430853843689, 0, 2, 10, 16, 3, 4, -1, 11, 16, 1, 4, 3, -.0140546001493931, .3127323091030121, .511751115322113, 0, 2, 7, 16, 3, 4, -1, 8, 16, 1, 4, 3, .008123939856886864, .50090491771698, .2520025968551636, 0, 2, 9, 16, 3, 3, -1, 9, 17, 3, 1, 3, -.004996465053409338, .6387143731117249, .4927811920642853, 0, 2, 8, 11, 4, 6, -1, 8, 14, 4, 3, 2, .0031253970228135586, .5136849880218506, .3680452108383179, 0, 2, 9, 6, 2, 12, -1, 9, 10, 2, 4, 3, .006766964215785265, .5509843826293945, .4363631904125214, 0, 2, 8, 17, 4, 3, -1, 8, 18, 4, 1, 3, -.002371144015341997, .6162335276603699, .4586946964263916, 0, 3, 9, 18, 8, 2, -1, 13, 18, 4, 1, 2, 9, 19, 4, 1, 2, -.005352279171347618, .6185457706451416, .4920490980148315, 0, 2, 1, 18, 8, 2, -1, 1, 19, 8, 1, 2, -.0159688591957092, .1382617950439453, .4983252882957459, 0, 2, 13, 5, 6, 15, -1, 15, 5, 2, 15, 3, .004767606034874916, .4688057899475098, .5490046143531799, 0, 2, 9, 8, 2, 2, -1, 9, 9, 2, 1, 2, -.002471469109877944, .2368514984846115, .5003952980041504, 0, 2, 9, 5, 2, 3, -1, 9, 5, 1, 3, 2, -.0007103378884494305, .5856394171714783, .4721533060073853, 0, 2, 1, 5, 6, 15, -1, 3, 5, 2, 15, 3, -.1411755979061127, .0869000628590584, .4961591064929962, 0, 3, 4, 1, 14, 8, -1, 11, 1, 7, 4, 2, 4, 5, 7, 4, 2, .1065180972218514, .5138837099075317, .1741005033254623, 0, 3, 2, 4, 4, 16, -1, 2, 4, 2, 8, 2, 4, 12, 2, 8, 2, -.0527447499334812, .7353636026382446, .4772881865501404, 0, 2, 12, 4, 3, 12, -1, 12, 10, 3, 6, 2, -.00474317604675889, .3884406089782715, .5292701721191406, 0, 3, 4, 5, 10, 12, -1, 4, 5, 5, 6, 2, 9, 11, 5, 6, 2, .0009967676596716046, .5223492980003357, .4003424048423767, 0, 2, 9, 14, 2, 3, -1, 9, 15, 2, 1, 3, .00802841316908598, .4959106147289276, .7212964296340942, 0, 2, 5, 4, 2, 3, -1, 5, 5, 2, 1, 3, .0008602585876360536, .4444884061813355, .55384761095047, 0, 3, 12, 2, 4, 10, -1, 14, 2, 2, 5, 2, 12, 7, 2, 5, 2, .0009319150121882558, .539837121963501, .4163244068622589, 0, 2, 6, 4, 7, 3, -1, 6, 5, 7, 1, 3, -.002508206060156226, .5854265093803406, .456250011920929, 0, 3, 2, 0, 18, 2, -1, 11, 0, 9, 1, 2, 2, 1, 9, 1, 2, -.0021378761157393456, .4608069062232971, .5280259251594543, 0, 3, 0, 0, 18, 2, -1, 0, 0, 9, 1, 2, 9, 1, 9, 1, 2, -.002154604997485876, .3791126906871796, .5255997180938721, 0, 3, 13, 13, 4, 6, -1, 15, 13, 2, 3, 2, 13, 16, 2, 3, 2, -.007621400989592075, .5998609066009521, .4952073991298676, 0, 3, 3, 13, 4, 6, -1, 3, 13, 2, 3, 2, 5, 16, 2, 3, 2, .002205536002293229, .4484206140041351, .5588530898094177, 0, 2, 10, 12, 2, 6, -1, 10, 15, 2, 3, 2, .0012586950324475765, .5450747013092041, .4423840939998627, 0, 3, 5, 9, 10, 10, -1, 5, 9, 5, 5, 2, 10, 14, 5, 5, 2, -.005092672072350979, .4118275046348572, .5263035893440247, 0, 3, 11, 4, 4, 2, -1, 13, 4, 2, 1, 2, 11, 5, 2, 1, 2, -.0025095739401876926, .5787907838821411, .4998494982719421, 0, 2, 7, 12, 6, 8, -1, 10, 12, 3, 8, 2, -.0773275569081306, .8397865891456604, .481112003326416, 0, 3, 12, 2, 4, 10, -1, 14, 2, 2, 5, 2, 12, 7, 2, 5, 2, -.041485819965601, .240861102938652, .5176993012428284, 0, 2, 8, 11, 2, 1, -1, 9, 11, 1, 1, 2, .00010355669655837119, .4355360865592957, .5417054295539856, 0, 2, 10, 5, 1, 12, -1, 10, 9, 1, 4, 3, .0013255809899419546, .5453971028327942, .4894095063209534, 0, 2, 0, 11, 6, 9, -1, 3, 11, 3, 9, 2, -.00805987324565649, .5771024227142334, .4577918946743012, 0, 3, 12, 2, 4, 10, -1, 14, 2, 2, 5, 2, 12, 7, 2, 5, 2, .019058620557189, .5169867873191833, .3400475084781647, 0, 3, 4, 2, 4, 10, -1, 4, 2, 2, 5, 2, 6, 7, 2, 5, 2, -.0350578911602497, .2203243970870972, .5000503063201904, 0, 3, 11, 4, 4, 2, -1, 13, 4, 2, 1, 2, 11, 5, 2, 1, 2, .005729605909436941, .5043408274650574, .6597570776939392, 0, 2, 0, 14, 6, 3, -1, 0, 15, 6, 1, 3, -.0116483299061656, .2186284959316254, .4996652901172638, 0, 3, 11, 4, 4, 2, -1, 13, 4, 2, 1, 2, 11, 5, 2, 1, 2, .0014544479781761765, .5007681846618652, .5503727793693542, 0, 2, 6, 1, 3, 2, -1, 7, 1, 1, 2, 3, -.00025030909455381334, .4129841029644013, .524167001247406, 0, 3, 11, 4, 4, 2, -1, 13, 4, 2, 1, 2, 11, 5, 2, 1, 2, -.000829072727356106, .541286826133728, .4974496066570282, 0, 3, 5, 4, 4, 2, -1, 5, 4, 2, 1, 2, 7, 5, 2, 1, 2, .0010862209601327777, .460552990436554, .5879228711128235, 0, 3, 13, 0, 2, 12, -1, 14, 0, 1, 6, 2, 13, 6, 1, 6, 2, .0002000050008064136, .5278854966163635, .4705209136009216, 0, 2, 6, 0, 3, 10, -1, 7, 0, 1, 10, 3, .0029212920926511288, .5129609704017639, .375553697347641, 0, 2, 3, 0, 17, 8, -1, 3, 4, 17, 4, 2, .0253874007612467, .4822691977024078, .5790768265724182, 0, 2, 0, 4, 20, 4, -1, 0, 6, 20, 2, 2, -.00319684692658484, .5248395204544067, .3962840139865875, 90.25334930419922, 182, 0, 2, 0, 3, 8, 2, -1, 4, 3, 4, 2, 2, .005803173873573542, .3498983979225159, .596198320388794, 0, 2, 8, 11, 4, 3, -1, 8, 12, 4, 1, 3, -.009000306949019432, .6816636919975281, .4478552043437958, 0, 3, 5, 7, 6, 4, -1, 5, 7, 3, 2, 2, 8, 9, 3, 2, 2, -.00115496595390141, .5585706233978271, .3578251004219055, 0, 2, 8, 3, 4, 9, -1, 8, 6, 4, 3, 3, -.0011069850297644734, .5365036129951477, .3050428032875061, 0, 2, 8, 15, 1, 4, -1, 8, 17, 1, 2, 2, .00010308309720130637, .363909512758255, .5344635844230652, 0, 2, 4, 5, 12, 7, -1, 8, 5, 4, 7, 3, -.005098483990877867, .2859157025814056, .5504264831542969, 0, 3, 4, 2, 4, 10, -1, 4, 2, 2, 5, 2, 6, 7, 2, 5, 2, .0008257220033556223, .5236523747444153, .3476041853427887, 0, 2, 3, 0, 17, 2, -1, 3, 1, 17, 1, 2, .009978332556784153, .4750322103500366, .621964693069458, 0, 2, 2, 2, 16, 15, -1, 2, 7, 16, 5, 3, -.0374025292694569, .334337592124939, .527806282043457, 0, 2, 15, 2, 5, 2, -1, 15, 3, 5, 1, 2, .0048548257909715176, .5192180871963501, .3700444102287293, 0, 2, 9, 3, 2, 2, -1, 10, 3, 1, 2, 2, -.001866447040811181, .2929843962192535, .5091944932937622, 0, 2, 4, 5, 16, 15, -1, 4, 10, 16, 5, 3, .0168888904154301, .3686845898628235, .5431225895881653, 0, 2, 7, 13, 5, 6, -1, 7, 16, 5, 3, 2, -.005837262142449617, .3632183969020844, .5221335887908936, 0, 2, 10, 7, 3, 2, -1, 11, 7, 1, 2, 3, -.00147137395106256, .5870683789253235, .4700650870800018, 0, 2, 8, 3, 3, 1, -1, 9, 3, 1, 1, 3, -.0011522950371727347, .3195894956588745, .5140954256057739, 0, 2, 9, 16, 3, 3, -1, 9, 17, 3, 1, 3, -.004256030078977346, .6301859021186829, .4814921021461487, 0, 2, 0, 2, 5, 2, -1, 0, 3, 5, 1, 2, -.006737829186022282, .1977048069238663, .5025808215141296, 0, 2, 12, 5, 4, 3, -1, 12, 6, 4, 1, 3, .0113826701417565, .495413213968277, .6867045760154724, 0, 2, 1, 7, 12, 1, -1, 5, 7, 4, 1, 3, .005179470870643854, .5164427757263184, .3350647985935211, 0, 2, 7, 5, 6, 14, -1, 7, 12, 6, 7, 2, -.1174378991127014, .2315246015787125, .5234413743019104, 0, 3, 0, 0, 8, 10, -1, 0, 0, 4, 5, 2, 4, 5, 4, 5, 2, .0287034492939711, .4664297103881836, .6722521185874939, 0, 2, 9, 1, 3, 2, -1, 10, 1, 1, 2, 3, .004823103081434965, .5220875144004822, .2723532915115356, 0, 2, 8, 1, 3, 2, -1, 9, 1, 1, 2, 3, .0026798530016094446, .5079277157783508, .2906948924064636, 0, 2, 12, 4, 3, 3, -1, 12, 5, 3, 1, 3, .008050408214330673, .4885950982570648, .6395021080970764, 0, 2, 7, 4, 6, 16, -1, 7, 12, 6, 8, 2, .004805495962500572, .5197256803512573, .365666389465332, 0, 2, 12, 4, 3, 3, -1, 12, 5, 3, 1, 3, -.0022420159075409174, .6153467893600464, .4763701856136322, 0, 2, 2, 3, 2, 6, -1, 2, 5, 2, 2, 3, -.0137577103450894, .2637344896793366, .5030903220176697, 0, 2, 14, 2, 6, 9, -1, 14, 5, 6, 3, 3, -.1033829972147942, .2287521958351135, .5182461142539978, 0, 2, 5, 4, 3, 3, -1, 5, 5, 3, 1, 3, -.009443208575248718, .6953303813934326, .4694949090480804, 0, 2, 9, 17, 3, 2, -1, 10, 17, 1, 2, 3, .0008027118165045977, .5450655221939087, .4268783926963806, 0, 2, 5, 5, 2, 3, -1, 5, 6, 2, 1, 3, -.004194566980004311, .6091387867927551, .4571642875671387, 0, 2, 13, 11, 3, 6, -1, 13, 13, 3, 2, 3, .0109422104433179, .5241063237190247, .3284547030925751, 0, 2, 3, 14, 2, 6, -1, 3, 17, 2, 3, 2, -.0005784106906503439, .5387929081916809, .4179368913173676, 0, 2, 14, 3, 6, 2, -1, 14, 4, 6, 1, 2, -.002088862005621195, .4292691051959992, .5301715731620789, 0, 2, 0, 8, 16, 2, -1, 0, 9, 16, 1, 2, .0032383969519287348, .379234790802002, .5220744013786316, 0, 2, 14, 3, 6, 2, -1, 14, 4, 6, 1, 2, .004907502792775631, .5237283110618591, .4126757979393005, 0, 2, 0, 0, 5, 6, -1, 0, 2, 5, 2, 3, -.0322779417037964, .1947655975818634, .4994502067565918, 0, 2, 12, 5, 4, 3, -1, 12, 6, 4, 1, 3, -.008971123024821281, .6011285185813904, .4929032027721405, 0, 2, 4, 11, 3, 6, -1, 4, 13, 3, 2, 3, .0153210898861289, .5009753704071045, .2039822041988373, 0, 2, 12, 5, 4, 3, -1, 12, 6, 4, 1, 3, .002085556974634528, .4862189888954163, .5721694827079773, 0, 2, 9, 5, 1, 3, -1, 9, 6, 1, 1, 3, .005061502102762461, .5000218749046326, .1801805943250656, 0, 2, 12, 5, 4, 3, -1, 12, 6, 4, 1, 3, -.0037174751050770283, .5530117154121399, .4897592961788178, 0, 2, 6, 6, 8, 12, -1, 6, 12, 8, 6, 2, -.0121705001220107, .4178605973720551, .5383723974227905, 0, 2, 12, 5, 4, 3, -1, 12, 6, 4, 1, 3, .004624839872121811, .4997169971466065, .5761327147483826, 0, 2, 5, 12, 9, 2, -1, 8, 12, 3, 2, 3, -.0002104042941937223, .5331807136535645, .4097681045532227, 0, 2, 12, 5, 4, 3, -1, 12, 6, 4, 1, 3, -.0146417804062366, .5755925178527832, .5051776170730591, 0, 2, 4, 5, 4, 3, -1, 4, 6, 4, 1, 3, .00331994891166687, .4576976895332336, .6031805872917175, 0, 2, 6, 6, 9, 2, -1, 9, 6, 3, 2, 3, .003723687957972288, .4380396902561188, .541588306427002, 0, 2, 4, 11, 1, 3, -1, 4, 12, 1, 1, 3, .0008295116131193936, .5163031816482544, .3702219128608704, 0, 2, 14, 12, 6, 6, -1, 14, 12, 3, 6, 2, -.0114084901288152, .6072946786880493, .4862565100193024, 0, 2, 7, 0, 3, 7, -1, 8, 0, 1, 7, 3, -.004532012157142162, .3292475938796997, .5088962912559509, 0, 2, 9, 8, 3, 3, -1, 10, 8, 1, 3, 3, .00512760179117322, .4829767942428589, .6122708916664124, 0, 2, 8, 8, 3, 3, -1, 9, 8, 1, 3, 3, .00985831581056118, .4660679996013641, .6556177139282227, 0, 2, 5, 10, 11, 3, -1, 5, 11, 11, 1, 3, .036985918879509, .5204849243164062, .1690472066402435, 0, 2, 5, 7, 10, 1, -1, 10, 7, 5, 1, 2, .004649116192013025, .5167322158813477, .3725225031375885, 0, 2, 9, 7, 3, 2, -1, 10, 7, 1, 2, 3, -.004266470205038786, .6406493186950684, .4987342953681946, 0, 2, 8, 7, 3, 2, -1, 9, 7, 1, 2, 3, -.0004795659042429179, .5897293090820312, .4464873969554901, 0, 2, 11, 9, 4, 2, -1, 11, 9, 2, 2, 2, .0036827160511165857, .5441560745239258, .347266286611557, 0, 2, 5, 9, 4, 2, -1, 7, 9, 2, 2, 2, -.0100598800927401, .2143162935972214, .500482976436615, 0, 2, 14, 10, 2, 4, -1, 14, 12, 2, 2, 2, -.0003036184061784297, .538642406463623, .4590323865413666, 0, 2, 7, 7, 3, 2, -1, 8, 7, 1, 2, 3, -.0014545479789376259, .5751184225082397, .4497095048427582, 0, 2, 14, 17, 6, 3, -1, 14, 18, 6, 1, 3, .0016515209572389722, .5421937704086304, .4238520860671997, 0, 3, 4, 5, 12, 12, -1, 4, 5, 6, 6, 2, 10, 11, 6, 6, 2, -.007846863940358162, .4077920913696289, .5258157253265381, 0, 3, 6, 9, 8, 8, -1, 10, 9, 4, 4, 2, 6, 13, 4, 4, 2, -.005125985015183687, .422927588224411, .5479453206062317, 0, 2, 0, 4, 15, 4, -1, 5, 4, 5, 4, 3, -.0368909612298012, .6596375703811646, .4674678146839142, 0, 2, 13, 2, 4, 1, -1, 13, 2, 2, 1, 2, .0002403563994448632, .4251135885715485, .5573202967643738, 0, 2, 4, 12, 2, 2, -1, 4, 13, 2, 1, 2, -15150169929256663e-21, .5259246826171875, .4074114859104157, 0, 2, 8, 13, 4, 3, -1, 8, 14, 4, 1, 3, .0022108471021056175, .4671722948551178, .5886352062225342, 0, 2, 9, 13, 2, 3, -1, 9, 14, 2, 1, 3, -.0011568620102480054, .5711066126823425, .4487161934375763, 0, 2, 13, 11, 2, 3, -1, 13, 12, 2, 1, 3, .004999629221856594, .5264198184013367, .2898327112197876, 0, 3, 7, 12, 4, 4, -1, 7, 12, 2, 2, 2, 9, 14, 2, 2, 2, -.0014656189596280456, .3891738057136536, .5197871923446655, 0, 3, 10, 11, 2, 2, -1, 11, 11, 1, 1, 2, 10, 12, 1, 1, 2, -.0011975039960816503, .5795872807502747, .4927955865859985, 0, 2, 8, 17, 3, 2, -1, 9, 17, 1, 2, 3, -.0044954330660402775, .2377603054046631, .5012555122375488, 0, 3, 10, 11, 2, 2, -1, 11, 11, 1, 1, 2, 10, 12, 1, 1, 2, .00014997160178609192, .4876626133918762, .5617607831954956, 0, 2, 0, 17, 6, 3, -1, 0, 18, 6, 1, 3, .002639150945469737, .516808807849884, .3765509128570557, 0, 3, 10, 11, 2, 2, -1, 11, 11, 1, 1, 2, 10, 12, 1, 1, 2, -.0002936813107226044, .5446649193763733, .4874630868434906, 0, 3, 8, 11, 2, 2, -1, 8, 11, 1, 1, 2, 9, 12, 1, 1, 2, .0014211760135367513, .4687897861003876, .669133186340332, 0, 2, 12, 5, 8, 4, -1, 12, 5, 4, 4, 2, .0794276371598244, .5193443894386292, .273294597864151, 0, 2, 0, 5, 8, 4, -1, 4, 5, 4, 4, 2, .0799375027418137, .4971731007099152, .1782083958387375, 0, 2, 13, 2, 4, 1, -1, 13, 2, 2, 1, 2, .0110892597585917, .5165994763374329, .3209475874900818, 0, 2, 3, 2, 4, 1, -1, 5, 2, 2, 1, 2, .00016560709627810866, .4058471918106079, .5307276248931885, 0, 3, 10, 0, 4, 2, -1, 12, 0, 2, 1, 2, 10, 1, 2, 1, 2, -.0053354292176663876, .3445056974887848, .5158129930496216, 0, 2, 7, 12, 3, 1, -1, 8, 12, 1, 1, 3, .0011287260567769408, .4594863057136536, .6075533032417297, 0, 3, 8, 11, 4, 8, -1, 10, 11, 2, 4, 2, 8, 15, 2, 4, 2, -.0219692196696997, .1680400967597961, .5228595733642578, 0, 2, 9, 9, 2, 2, -1, 9, 10, 2, 1, 2, -.00021775320055894554, .3861596882343292, .5215672850608826, 0, 2, 3, 18, 15, 2, -1, 3, 19, 15, 1, 2, .00020200149447191507, .5517979264259338, .4363039135932922, 0, 3, 2, 6, 2, 12, -1, 2, 6, 1, 6, 2, 3, 12, 1, 6, 2, -.0217331498861313, .7999460101127625, .4789851009845734, 0, 2, 9, 8, 2, 3, -1, 9, 9, 2, 1, 3, -.0008439993252977729, .4085975885391235, .5374773144721985, 0, 2, 7, 10, 3, 2, -1, 8, 10, 1, 2, 3, -.00043895249837078154, .5470405220985413, .4366143047809601, 0, 2, 11, 11, 3, 1, -1, 12, 11, 1, 1, 3, .0015092400135472417, .4988996982574463, .5842149257659912, 0, 2, 6, 11, 3, 1, -1, 7, 11, 1, 1, 3, -.003554783994331956, .6753690242767334, .4721005856990814, 0, 3, 9, 2, 4, 2, -1, 11, 2, 2, 1, 2, 9, 3, 2, 1, 2, .00048191400128416717, .541585385799408, .4357109069824219, 0, 2, 4, 12, 2, 3, -1, 4, 13, 2, 1, 3, -.00602643983438611, .2258509993553162, .499188095331192, 0, 2, 2, 1, 18, 3, -1, 8, 1, 6, 3, 3, -.0116681400686502, .625655472278595, .4927498996257782, 0, 2, 5, 1, 4, 14, -1, 7, 1, 2, 14, 2, -.0028718370012938976, .3947784900665283, .524580180644989, 0, 2, 8, 16, 12, 3, -1, 8, 16, 6, 3, 2, .0170511696487665, .4752511084079742, .5794224143028259, 0, 2, 1, 17, 18, 3, -1, 7, 17, 6, 3, 3, -.0133520802482963, .6041104793548584, .4544535875320435, 0, 2, 9, 14, 2, 6, -1, 9, 17, 2, 3, 2, -.0003930180100724101, .4258275926113129, .5544905066490173, 0, 2, 9, 12, 1, 8, -1, 9, 16, 1, 4, 2, .0030483349692076445, .5233420133590698, .3780272901058197, 0, 2, 9, 14, 2, 3, -1, 9, 15, 2, 1, 3, -.00435792887583375, .6371889114379883, .4838674068450928, 0, 2, 9, 6, 2, 12, -1, 9, 10, 2, 4, 3, .0056661018170416355, .5374705791473389, .4163666069507599, 0, 2, 12, 9, 3, 3, -1, 12, 10, 3, 1, 3, 6067733920644969e-20, .4638795852661133, .5311625003814697, 0, 2, 0, 1, 4, 8, -1, 2, 1, 2, 8, 2, .0367381609976292, .4688656032085419, .6466524004936218, 0, 3, 9, 1, 6, 2, -1, 12, 1, 3, 1, 2, 9, 2, 3, 1, 2, .008652813732624054, .5204318761825562, .2188657969236374, 0, 2, 1, 3, 12, 14, -1, 1, 10, 12, 7, 2, -.1537135988473892, .1630371958017349, .4958840012550354, 0, 3, 8, 12, 4, 2, -1, 10, 12, 2, 1, 2, 8, 13, 2, 1, 2, -.00041560421232134104, .577445924282074, .4696458876132965, 0, 3, 1, 9, 10, 2, -1, 1, 9, 5, 1, 2, 6, 10, 5, 1, 2, -.0012640169588848948, .3977175951004028, .5217198133468628, 0, 2, 8, 15, 4, 3, -1, 8, 16, 4, 1, 3, -.003547334112226963, .6046528220176697, .480831503868103, 0, 2, 6, 8, 8, 3, -1, 6, 9, 8, 1, 3, 3001906952704303e-20, .3996723890304565, .5228201150894165, 0, 2, 9, 15, 5, 3, -1, 9, 16, 5, 1, 3, .00131130195222795, .4712158143520355, .5765997767448425, 0, 2, 8, 7, 4, 3, -1, 8, 8, 4, 1, 3, -.0013374709524214268, .4109584987163544, .5253170132637024, 0, 2, 7, 7, 6, 2, -1, 7, 8, 6, 1, 2, .0208767093718052, .5202993750572205, .1757981926202774, 0, 3, 5, 7, 8, 2, -1, 5, 7, 4, 1, 2, 9, 8, 4, 1, 2, -.007549794856458902, .6566609740257263, .4694975018501282, 0, 2, 12, 9, 3, 3, -1, 12, 10, 3, 1, 3, .0241885501891375, .5128673911094666, .3370220959186554, 0, 2, 4, 7, 4, 2, -1, 4, 8, 4, 1, 2, -.002935882890596986, .658078670501709, .4694541096687317, 0, 2, 14, 2, 6, 9, -1, 14, 5, 6, 3, 3, .0575579293072224, .5146445035934448, .2775259912014008, 0, 2, 4, 9, 3, 3, -1, 5, 9, 1, 3, 3, -.0011343370424583554, .3836601972579956, .5192667245864868, 0, 2, 12, 9, 3, 3, -1, 12, 10, 3, 1, 3, .0168169997632504, .5085592865943909, .6177260875701904, 0, 2, 0, 2, 6, 9, -1, 0, 5, 6, 3, 3, .005053517874330282, .5138763189315796, .3684791922569275, 0, 2, 17, 3, 3, 6, -1, 18, 3, 1, 6, 3, -.004587471019476652, .5989655256271362, .4835202097892761, 0, 2, 0, 3, 3, 6, -1, 1, 3, 1, 6, 3, .001688246033154428, .4509486854076386, .5723056793212891, 0, 2, 17, 14, 1, 2, -1, 17, 15, 1, 1, 2, -.0016554000321775675, .3496770858764648, .5243319272994995, 0, 2, 4, 9, 4, 3, -1, 6, 9, 2, 3, 2, -.0193738006055355, .1120536997914314, .496871292591095, 0, 2, 12, 9, 3, 3, -1, 12, 10, 3, 1, 3, .0103744501248002, .5148196816444397, .4395213127136231, 0, 2, 5, 9, 3, 3, -1, 5, 10, 3, 1, 3, .00014973050565458834, .4084999859333038, .526988685131073, 0, 3, 9, 5, 6, 8, -1, 12, 5, 3, 4, 2, 9, 9, 3, 4, 2, -.042981930077076, .6394104957580566, .501850426197052, 0, 3, 5, 5, 6, 8, -1, 5, 5, 3, 4, 2, 8, 9, 3, 4, 2, .008306593634188175, .470755398273468, .6698353290557861, 0, 2, 16, 1, 4, 6, -1, 16, 4, 4, 3, 2, -.0041285790503025055, .4541369080543518, .5323647260665894, 0, 2, 1, 0, 6, 20, -1, 3, 0, 2, 20, 3, .0017399420030415058, .433396190404892, .5439866185188293, 0, 2, 12, 11, 3, 2, -1, 13, 11, 1, 2, 3, .00011739750334527344, .4579687118530273, .5543426275253296, 0, 2, 5, 11, 3, 2, -1, 6, 11, 1, 2, 3, .00018585780344437808, .4324643909931183, .5426754951477051, 0, 2, 9, 4, 6, 1, -1, 11, 4, 2, 1, 3, .005558769218623638, .525722086429596, .3550611138343811, 0, 2, 0, 0, 8, 3, -1, 4, 0, 4, 3, 2, -.007985156029462814, .6043018102645874, .4630635976791382, 0, 2, 15, 0, 2, 5, -1, 15, 0, 1, 5, 2, .0006059412262402475, .4598254859447479, .55331951379776, 0, 2, 4, 1, 3, 2, -1, 5, 1, 1, 2, 3, -.0002298304025316611, .4130752086639404, .5322461128234863, 0, 2, 7, 0, 6, 15, -1, 9, 0, 2, 15, 3, .0004374021082185209, .4043039977550507, .5409289002418518, 0, 2, 6, 11, 3, 1, -1, 7, 11, 1, 1, 3, .0002948202018160373, .4494963884353638, .5628852248191833, 0, 2, 12, 0, 3, 4, -1, 13, 0, 1, 4, 3, .0103126596659422, .5177510976791382, .2704316973686218, 0, 2, 5, 4, 6, 1, -1, 7, 4, 2, 1, 3, -.007724110968410969, .1988019049167633, .4980553984642029, 0, 2, 12, 7, 3, 2, -1, 12, 8, 3, 1, 2, -.004679720848798752, .6644750237464905, .5018296241760254, 0, 2, 0, 1, 4, 6, -1, 0, 4, 4, 3, 2, -.005075545981526375, .3898304998874664, .5185269117355347, 0, 2, 12, 7, 3, 2, -1, 12, 8, 3, 1, 2, .00224797404371202, .4801808893680573, .5660336017608643, 0, 2, 2, 16, 3, 3, -1, 2, 17, 3, 1, 3, .0008332700817845762, .5210919976234436, .3957188129425049, 0, 3, 13, 8, 6, 10, -1, 16, 8, 3, 5, 2, 13, 13, 3, 5, 2, -.0412793308496475, .6154541969299316, .5007054209709167, 0, 2, 0, 9, 5, 2, -1, 0, 10, 5, 1, 2, -.0005093018990010023, .3975942134857178, .5228403806686401, 0, 3, 12, 11, 2, 2, -1, 13, 11, 1, 1, 2, 12, 12, 1, 1, 2, .0012568780221045017, .4979138076305389, .5939183235168457, 0, 2, 3, 15, 3, 3, -1, 3, 16, 3, 1, 3, .008004849776625633, .4984497129917145, .1633366048336029, 0, 2, 12, 7, 3, 2, -1, 12, 8, 3, 1, 2, -.0011879300000146031, .5904964804649353, .4942624866962433, 0, 2, 5, 7, 3, 2, -1, 5, 8, 3, 1, 2, .0006194895249791443, .4199557900428772, .5328726172447205, 0, 2, 9, 5, 9, 9, -1, 9, 8, 9, 3, 3, .006682985927909613, .5418602824211121, .490588903427124, 0, 2, 5, 0, 3, 7, -1, 6, 0, 1, 7, 3, -.0037062340416014194, .3725939095020294, .5138000249862671, 0, 2, 5, 2, 12, 5, -1, 9, 2, 4, 5, 3, -.0397394113242626, .6478961110115051, .5050346851348877, 0, 3, 6, 11, 2, 2, -1, 6, 11, 1, 1, 2, 7, 12, 1, 1, 2, .0014085009461268783, .4682339131832123, .6377884149551392, 0, 2, 15, 15, 3, 2, -1, 15, 16, 3, 1, 2, .0003932268882635981, .5458530187606812, .415048211812973, 0, 2, 2, 15, 3, 2, -1, 2, 16, 3, 1, 2, -.0018979819724336267, .3690159916877747, .5149704217910767, 0, 3, 14, 12, 6, 8, -1, 17, 12, 3, 4, 2, 14, 16, 3, 4, 2, -.0139704402536154, .6050562858581543, .4811357855796814, 0, 2, 2, 8, 15, 6, -1, 7, 8, 5, 6, 3, -.1010081991553307, .2017080038785934, .4992361962795258, 0, 2, 2, 2, 18, 17, -1, 8, 2, 6, 17, 3, -.0173469204455614, .5713148713111877, .4899486005306244, 0, 2, 5, 1, 4, 1, -1, 7, 1, 2, 1, 2, .000156197595060803, .4215388894081116, .5392642021179199, 0, 2, 5, 2, 12, 5, -1, 9, 2, 4, 5, 3, .1343892961740494, .5136151909828186, .3767612874507904, 0, 2, 3, 2, 12, 5, -1, 7, 2, 4, 5, 3, -.0245822407305241, .7027357816696167, .4747906923294067, 0, 3, 4, 9, 12, 4, -1, 10, 9, 6, 2, 2, 4, 11, 6, 2, 2, -.0038553720805794, .4317409098148346, .5427716970443726, 0, 3, 5, 15, 6, 2, -1, 5, 15, 3, 1, 2, 8, 16, 3, 1, 2, -.002316524973139167, .594269871711731, .4618647992610931, 0, 2, 10, 14, 2, 3, -1, 10, 15, 2, 1, 3, -.004851812031120062, .6191568970680237, .4884895086288452, 0, 3, 0, 13, 20, 2, -1, 0, 13, 10, 1, 2, 10, 14, 10, 1, 2, .002469993894919753, .5256664752960205, .4017199873924255, 0, 3, 4, 9, 12, 8, -1, 10, 9, 6, 4, 2, 4, 13, 6, 4, 2, .0454969592392445, .5237867832183838, .2685773968696594, 0, 2, 8, 13, 3, 6, -1, 8, 16, 3, 3, 2, -.0203195996582508, .213044598698616, .4979738891124725, 0, 2, 10, 12, 2, 2, -1, 10, 13, 2, 1, 2, .0002699499891605228, .481404185295105, .5543122291564941, 0, 3, 9, 12, 2, 2, -1, 9, 12, 1, 1, 2, 10, 13, 1, 1, 2, -.0018232699949294329, .6482579708099365, .4709989130496979, 0, 3, 4, 11, 14, 4, -1, 11, 11, 7, 2, 2, 4, 13, 7, 2, 2, -.006301579065620899, .4581927955150604, .5306236147880554, 0, 2, 8, 5, 4, 2, -1, 8, 6, 4, 1, 2, -.0002413949987385422, .5232086777687073, .4051763117313385, 0, 2, 10, 10, 6, 3, -1, 12, 10, 2, 3, 3, -.001033036969602108, .5556201934814453, .4789193868637085, 0, 2, 2, 14, 1, 2, -1, 2, 15, 1, 1, 2, .0001804116036510095, .5229442715644836, .4011810123920441, 0, 3, 13, 8, 6, 12, -1, 16, 8, 3, 6, 2, 13, 14, 3, 6, 2, -.0614078603684902, .62986820936203, .5010703206062317, 0, 3, 1, 8, 6, 12, -1, 1, 8, 3, 6, 2, 4, 14, 3, 6, 2, -.0695439130067825, .7228280901908875, .4773184061050415, 0, 2, 10, 0, 6, 10, -1, 12, 0, 2, 10, 3, -.0705426633358002, .2269513010978699, .5182529091835022, 0, 3, 5, 11, 8, 4, -1, 5, 11, 4, 2, 2, 9, 13, 4, 2, 2, .0024423799477517605, .5237097144126892, .4098151028156281, 0, 3, 10, 16, 8, 4, -1, 14, 16, 4, 2, 2, 10, 18, 4, 2, 2, .0015494349645450711, .4773750901222229, .5468043088912964, 0, 2, 7, 7, 6, 6, -1, 9, 7, 2, 6, 3, -.0239142198115587, .7146975994110107, .4783824980258942, 0, 2, 10, 2, 4, 10, -1, 10, 2, 2, 10, 2, -.0124536901712418, .2635296881198883, .5241122841835022, 0, 2, 6, 1, 4, 9, -1, 8, 1, 2, 9, 2, -.00020760179904755205, .3623757064342499, .5113608837127686, 0, 2, 12, 19, 2, 1, -1, 12, 19, 1, 1, 2, 29781080229440704e-21, .4705932140350342, .5432801842689514, 104.74919891357422, 211, 0, 2, 1, 2, 4, 9, -1, 3, 2, 2, 9, 2, .0117727499455214, .3860518932342529, .6421167254447937, 0, 2, 7, 5, 6, 4, -1, 9, 5, 2, 4, 3, .0270375702530146, .4385654926300049, .675403892993927, 0, 2, 9, 4, 2, 4, -1, 9, 6, 2, 2, 2, -3641950024757534e-20, .5487101078033447, .34233158826828, 0, 2, 14, 5, 2, 8, -1, 14, 9, 2, 4, 2, .001999540952965617, .3230532109737396, .5400317907333374, 0, 2, 7, 6, 5, 12, -1, 7, 12, 5, 6, 2, .0045278300531208515, .5091639757156372, .2935043871402741, 0, 2, 14, 6, 2, 6, -1, 14, 9, 2, 3, 2, .00047890920541249216, .4178153872489929, .5344064235687256, 0, 2, 4, 6, 2, 6, -1, 4, 9, 2, 3, 2, .0011720920447260141, .2899182140827179, .5132070779800415, 0, 3, 8, 15, 10, 4, -1, 13, 15, 5, 2, 2, 8, 17, 5, 2, 2, .0009530570241622627, .428012490272522, .5560845136642456, 0, 2, 6, 18, 2, 2, -1, 7, 18, 1, 2, 2, 15099150004971307e-21, .4044871926307678, .5404760241508484, 0, 2, 11, 3, 6, 2, -1, 11, 4, 6, 1, 2, -.0006081790197640657, .4271768927574158, .5503466129302979, 0, 2, 2, 0, 16, 6, -1, 2, 2, 16, 2, 3, .003322452073916793, .3962723910808563, .5369734764099121, 0, 2, 11, 3, 6, 2, -1, 11, 4, 6, 1, 2, -.0011037490330636501, .4727177917957306, .5237749814987183, 0, 2, 4, 11, 10, 3, -1, 4, 12, 10, 1, 3, -.0014350269921123981, .5603008270263672, .4223509132862091, 0, 2, 11, 3, 6, 2, -1, 11, 4, 6, 1, 2, .0020767399109899998, .5225917100906372, .4732725918292999, 0, 2, 3, 3, 6, 2, -1, 3, 4, 6, 1, 2, -.00016412809782195836, .3999075889587402, .5432739853858948, 0, 2, 16, 0, 4, 7, -1, 16, 0, 2, 7, 2, .008830243721604347, .4678385853767395, .6027327179908752, 0, 2, 0, 14, 9, 6, -1, 0, 16, 9, 2, 3, -.0105520701035857, .3493967056274414, .5213974714279175, 0, 2, 9, 16, 3, 3, -1, 9, 17, 3, 1, 3, -.00227316003292799, .6185818910598755, .4749062955379486, 0, 2, 4, 6, 6, 2, -1, 6, 6, 2, 2, 3, -.0008478633244521916, .5285341143608093, .3843482136726379, 0, 2, 15, 11, 1, 3, -1, 15, 12, 1, 1, 3, .0012081359745934606, .536064088344574, .3447335958480835, 0, 2, 5, 5, 2, 3, -1, 5, 6, 2, 1, 3, .002651273040100932, .4558292031288147, .6193962097167969, 0, 2, 10, 9, 2, 2, -1, 10, 10, 2, 1, 2, -.0011012479662895203, .368023008108139, .5327628254890442, 0, 2, 3, 1, 4, 3, -1, 5, 1, 2, 3, 2, .0004956151824444532, .396059513092041, .5274940729141235, 0, 2, 16, 0, 4, 7, -1, 16, 0, 2, 7, 2, -.0439017713069916, .7020444869995117, .4992839097976685, 0, 2, 0, 0, 20, 1, -1, 10, 0, 10, 1, 2, .0346903502941132, .5049164295196533, .276660293340683, 0, 2, 15, 11, 1, 3, -1, 15, 12, 1, 1, 3, -.002744219033047557, .2672632932662964, .5274971127510071, 0, 2, 0, 4, 3, 4, -1, 1, 4, 1, 4, 3, .003331658896058798, .4579482972621918, .6001101732254028, 0, 2, 16, 3, 3, 6, -1, 16, 5, 3, 2, 3, -.0200445707887411, .3171594142913818, .523571789264679, 0, 2, 1, 3, 3, 6, -1, 1, 5, 3, 2, 3, .0013492030557245016, .5265362858772278, .4034324884414673, 0, 3, 6, 2, 12, 6, -1, 12, 2, 6, 3, 2, 6, 5, 6, 3, 2, .0029702018946409225, .5332456827163696, .4571984112262726, 0, 2, 8, 10, 4, 3, -1, 8, 11, 4, 1, 3, .006303998176008463, .4593310952186585, .6034635901451111, 0, 3, 4, 2, 14, 6, -1, 11, 2, 7, 3, 2, 4, 5, 7, 3, 2, -.0129365902394056, .4437963962554932, .5372971296310425, 0, 2, 9, 11, 2, 3, -1, 9, 12, 2, 1, 3, .004014872945845127, .4680323898792267, .6437833905220032, 0, 2, 15, 13, 2, 3, -1, 15, 14, 2, 1, 3, -.002640167949721217, .3709631860256195, .5314332842826843, 0, 2, 8, 12, 4, 3, -1, 8, 13, 4, 1, 3, .0139184398576617, .4723555147647858, .713080883026123, 0, 2, 15, 11, 1, 3, -1, 15, 12, 1, 1, 3, -.00045087869511917233, .4492394030094147, .5370404124259949, 0, 2, 7, 13, 5, 2, -1, 7, 14, 5, 1, 2, .00025384349282830954, .4406864047050476, .5514402985572815, 0, 2, 7, 12, 6, 3, -1, 7, 13, 6, 1, 3, .002271000063046813, .4682416915893555, .5967984199523926, 0, 2, 5, 11, 4, 4, -1, 5, 13, 4, 2, 2, .002412077970802784, .5079392194747925, .3018598854541779, 0, 2, 11, 4, 3, 3, -1, 12, 4, 1, 3, 3, -3602567085181363e-20, .560103714466095, .4471096992492676, 0, 2, 6, 4, 3, 3, -1, 7, 4, 1, 3, 3, -.0074905529618263245, .2207535058259964, .4989944100379944, 0, 2, 16, 5, 3, 6, -1, 17, 5, 1, 6, 3, -.017513120546937, .6531215906143188, .5017648935317993, 0, 2, 3, 6, 12, 7, -1, 7, 6, 4, 7, 3, .1428163051605225, .4967963099479675, .1482062041759491, 0, 2, 16, 5, 3, 6, -1, 17, 5, 1, 6, 3, .005534526892006397, .4898946881294251, .5954223871231079, 0, 2, 3, 13, 2, 3, -1, 3, 14, 2, 1, 3, -.0009632359142415226, .3927116990089417, .519607424736023, 0, 2, 16, 5, 3, 6, -1, 17, 5, 1, 6, 3, -.0020370010752230883, .5613325238227844, .4884858131408691, 0, 2, 1, 5, 3, 6, -1, 2, 5, 1, 6, 3, .0016614829655736685, .4472880065441132, .5578880906105042, 0, 2, 1, 9, 18, 1, -1, 7, 9, 6, 1, 3, -.0031188090797513723, .3840532898902893, .5397477746009827, 0, 2, 0, 9, 8, 7, -1, 4, 9, 4, 7, 2, -.006400061771273613, .5843983888626099, .4533218145370483, 0, 2, 12, 11, 8, 2, -1, 12, 12, 8, 1, 2, .0003131960111204535, .5439221858978271, .4234727919101715, 0, 2, 0, 11, 8, 2, -1, 0, 12, 8, 1, 2, -.0182220991700888, .1288464963436127, .4958404898643494, 0, 2, 9, 13, 2, 3, -1, 9, 14, 2, 1, 3, .008796924725174904, .49512979388237, .7153480052947998, 0, 3, 4, 10, 12, 4, -1, 4, 10, 6, 2, 2, 10, 12, 6, 2, 2, -.004239507019519806, .3946599960327148, .5194936990737915, 0, 2, 9, 3, 3, 7, -1, 10, 3, 1, 7, 3, .009708627127110958, .4897503852844238, .6064900159835815, 0, 2, 7, 2, 3, 5, -1, 8, 2, 1, 5, 3, -.003993417136371136, .3245440125465393, .5060828924179077, 0, 3, 9, 12, 4, 6, -1, 11, 12, 2, 3, 2, 9, 15, 2, 3, 2, -.0167850591242313, .1581953018903732, .5203778743743896, 0, 2, 8, 7, 3, 6, -1, 9, 7, 1, 6, 3, .018272090703249, .4680935144424439, .6626979112625122, 0, 2, 15, 4, 4, 2, -1, 15, 5, 4, 1, 2, .00568728381767869, .5211697816848755, .3512184917926788, 0, 2, 8, 7, 3, 3, -1, 9, 7, 1, 3, 3, -.0010739039862528443, .5768386125564575, .4529845118522644, 0, 2, 14, 2, 6, 4, -1, 14, 4, 6, 2, 2, -.00370938703417778, .4507763087749481, .5313581228256226, 0, 2, 7, 16, 6, 1, -1, 9, 16, 2, 1, 3, -.0002111070934915915, .5460820198059082, .4333376884460449, 0, 2, 15, 13, 2, 3, -1, 15, 14, 2, 1, 3, .0010670139454305172, .5371856093406677, .4078390896320343, 0, 2, 8, 7, 3, 10, -1, 9, 7, 1, 10, 3, .0035943021066486835, .4471287131309509, .5643836259841919, 0, 2, 11, 10, 2, 6, -1, 11, 12, 2, 2, 3, -.005177603103220463, .4499393105506897, .5280330181121826, 0, 2, 6, 10, 4, 1, -1, 8, 10, 2, 1, 2, -.00025414369883947074, .5516173243522644, .4407708048820496, 0, 2, 10, 9, 2, 2, -1, 10, 10, 2, 1, 2, .006352256052196026, .5194190144538879, .2465227991342545, 0, 2, 8, 9, 2, 2, -1, 8, 10, 2, 1, 2, -.00044205080484971404, .3830705881118774, .5139682292938232, 0, 3, 12, 7, 2, 2, -1, 13, 7, 1, 1, 2, 12, 8, 1, 1, 2, .0007448872784152627, .4891090989112854, .5974786877632141, 0, 3, 5, 7, 2, 2, -1, 5, 7, 1, 1, 2, 6, 8, 1, 1, 2, -.0035116379149258137, .7413681745529175, .4768764972686768, 0, 2, 13, 0, 3, 14, -1, 14, 0, 1, 14, 3, -.0125409103929996, .3648819029331207, .5252826809883118, 0, 2, 4, 0, 3, 14, -1, 5, 0, 1, 14, 3, .009493185207247734, .5100492835044861, .362958699464798, 0, 2, 13, 4, 3, 14, -1, 14, 4, 1, 14, 3, .0129611501470208, .5232442021369934, .4333561062812805, 0, 2, 9, 14, 2, 3, -1, 9, 15, 2, 1, 3, .004720944911241531, .4648149013519287, .6331052780151367, 0, 2, 8, 14, 4, 3, -1, 8, 15, 4, 1, 3, -.0023119079414755106, .5930309891700745, .4531058073043823, 0, 2, 4, 2, 3, 16, -1, 5, 2, 1, 16, 3, -.002826229901984334, .3870477974414825, .5257101058959961, 0, 2, 7, 2, 8, 10, -1, 7, 7, 8, 5, 2, -.0014311339473351836, .552250325679779, .4561854898929596, 0, 2, 6, 14, 7, 3, -1, 6, 15, 7, 1, 3, .0019378310535103083, .4546220898628235, .5736966729164124, 0, 3, 9, 2, 10, 12, -1, 14, 2, 5, 6, 2, 9, 8, 5, 6, 2, .00026343559147790074, .5345739126205444, .4571875035762787, 0, 2, 6, 7, 8, 2, -1, 6, 8, 8, 1, 2, .0007825752254575491, .3967815935611725, .5220187902450562, 0, 2, 8, 13, 4, 6, -1, 8, 16, 4, 3, 2, -.0195504408329725, .282964289188385, .5243508219718933, 0, 2, 6, 6, 1, 3, -1, 6, 7, 1, 1, 3, .00043914958951063454, .4590066969394684, .589909017086029, 0, 2, 16, 2, 4, 6, -1, 16, 4, 4, 2, 3, .0214520003646612, .523141086101532, .2855378985404968, 0, 3, 6, 6, 4, 2, -1, 6, 6, 2, 1, 2, 8, 7, 2, 1, 2, .0005897358059883118, .4397256970405579, .550642192363739, 0, 2, 16, 2, 4, 6, -1, 16, 4, 4, 2, 3, -.0261576101183891, .3135079145431519, .5189175009727478, 0, 2, 0, 2, 4, 6, -1, 0, 4, 4, 2, 3, -.0139598604291677, .3213272988796234, .5040717720985413, 0, 2, 9, 6, 2, 6, -1, 9, 6, 1, 6, 2, -.006369901821017265, .6387544870376587, .4849506914615631, 0, 2, 3, 4, 6, 10, -1, 3, 9, 6, 5, 2, -.008561382070183754, .2759132087230682, .5032019019126892, 0, 2, 9, 5, 2, 6, -1, 9, 5, 1, 6, 2, .000966229010373354, .4685640931129456, .5834879279136658, 0, 2, 3, 13, 2, 3, -1, 3, 14, 2, 1, 3, .0007655026856809855, .5175207257270813, .389642208814621, 0, 2, 13, 13, 3, 2, -1, 13, 14, 3, 1, 2, -.008183334022760391, .2069136947393417, .5208122134208679, 0, 3, 2, 16, 10, 4, -1, 2, 16, 5, 2, 2, 7, 18, 5, 2, 2, -.009397693909704685, .6134091019630432, .4641222953796387, 0, 3, 5, 6, 10, 6, -1, 10, 6, 5, 3, 2, 5, 9, 5, 3, 2, .004802898038178682, .5454108119010925, .439521998167038, 0, 2, 7, 14, 1, 3, -1, 7, 15, 1, 1, 3, -.003568056970834732, .6344485282897949, .4681093990802765, 0, 2, 14, 16, 6, 3, -1, 14, 17, 6, 1, 3, .0040733120404183865, .5292683243751526, .4015620052814484, 0, 2, 5, 4, 3, 3, -1, 5, 5, 3, 1, 3, .0012568129459396005, .4392988085746765, .5452824831008911, 0, 2, 7, 4, 10, 3, -1, 7, 5, 10, 1, 3, -.0029065010603517294, .5898832082748413, .4863379895687103, 0, 2, 0, 4, 5, 4, -1, 0, 6, 5, 2, 2, -.00244093406945467, .4069364964962006, .5247421860694885, 0, 2, 13, 11, 3, 9, -1, 13, 14, 3, 3, 3, .0248307008296251, .5182725787162781, .3682524859905243, 0, 2, 4, 11, 3, 9, -1, 4, 14, 3, 3, 3, -.0488540083169937, .1307577937841415, .496128112077713, 0, 2, 9, 7, 2, 1, -1, 9, 7, 1, 1, 2, -.001611037994734943, .6421005725860596, .4872662127017975, 0, 2, 5, 0, 6, 17, -1, 7, 0, 2, 17, 3, -.0970094799995422, .0477693490684032, .495098888874054, 0, 2, 10, 3, 6, 3, -1, 10, 3, 3, 3, 2, .0011209240183234215, .4616267085075378, .5354745984077454, 0, 2, 2, 2, 15, 4, -1, 7, 2, 5, 4, 3, -.001306409016251564, .626185417175293, .4638805985450745, 0, 3, 8, 2, 8, 2, -1, 12, 2, 4, 1, 2, 8, 3, 4, 1, 2, .00045771620352752507, .5384417772293091, .4646640121936798, 0, 2, 8, 1, 3, 6, -1, 8, 3, 3, 2, 3, -.0006314995116554201, .3804047107696533, .51302570104599, 0, 2, 9, 17, 2, 2, -1, 9, 18, 2, 1, 2, .0001450597046641633, .4554310142993927, .5664461851119995, 0, 2, 0, 0, 2, 14, -1, 1, 0, 1, 14, 2, -.0164745505899191, .6596958041191101, .4715859889984131, 0, 2, 12, 0, 7, 3, -1, 12, 1, 7, 1, 3, .0133695797994733, .519546627998352, .3035964965820313, 0, 2, 1, 14, 1, 2, -1, 1, 15, 1, 1, 2, .00010271780047332868, .522917628288269, .4107066094875336, 0, 3, 14, 12, 2, 8, -1, 15, 12, 1, 4, 2, 14, 16, 1, 4, 2, -.0055311559699475765, .6352887749671936, .4960907101631165, 0, 2, 1, 0, 7, 3, -1, 1, 1, 7, 1, 3, -.0026187049224972725, .3824546039104462, .5140984058380127, 0, 3, 14, 12, 2, 8, -1, 15, 12, 1, 4, 2, 14, 16, 1, 4, 2, .005083426833152771, .4950439929962158, .6220818758010864, 0, 3, 6, 0, 8, 12, -1, 6, 0, 4, 6, 2, 10, 6, 4, 6, 2, .0798181593418121, .4952335953712463, .1322475969791412, 0, 2, 6, 1, 8, 9, -1, 6, 4, 8, 3, 3, -.0992265865206718, .7542728781700134, .5008416771888733, 0, 2, 5, 2, 2, 2, -1, 5, 3, 2, 1, 2, -.0006517401780001819, .3699302971363068, .5130121111869812, 0, 3, 13, 14, 6, 6, -1, 16, 14, 3, 3, 2, 13, 17, 3, 3, 2, -.018996849656105, .6689178943634033, .4921202957630158, 0, 3, 0, 17, 20, 2, -1, 0, 17, 10, 1, 2, 10, 18, 10, 1, 2, .0173468999564648, .4983300864696503, .1859198063611984, 0, 3, 10, 3, 2, 6, -1, 11, 3, 1, 3, 2, 10, 6, 1, 3, 2, .0005508210160769522, .4574424028396606, .5522121787071228, 0, 2, 5, 12, 6, 2, -1, 8, 12, 3, 2, 2, .002005605027079582, .5131744742393494, .3856469988822937, 0, 2, 10, 7, 6, 13, -1, 10, 7, 3, 13, 2, -.007768819108605385, .4361700117588043, .5434309244155884, 0, 2, 5, 15, 10, 5, -1, 10, 15, 5, 5, 2, .0508782789111137, .4682720899581909, .6840639710426331, 0, 2, 10, 4, 4, 10, -1, 10, 4, 2, 10, 2, -.0022901780903339386, .4329245090484619, .5306099057197571, 0, 2, 5, 7, 2, 1, -1, 6, 7, 1, 1, 2, -.00015715380141045898, .5370057225227356, .4378164112567902, 0, 2, 10, 3, 6, 7, -1, 10, 3, 3, 7, 2, .1051924005150795, .5137274265289307, .0673614665865898, 0, 2, 4, 3, 6, 7, -1, 7, 3, 3, 7, 2, .002719891956076026, .4112060964107513, .5255665183067322, 0, 2, 1, 7, 18, 5, -1, 7, 7, 6, 5, 3, .0483377799391747, .5404623746871948, .4438967108726502, 0, 2, 3, 17, 4, 3, -1, 5, 17, 2, 3, 2, .0009570376132614911, .4355969130992889, .5399510860443115, 0, 3, 8, 14, 12, 6, -1, 14, 14, 6, 3, 2, 8, 17, 6, 3, 2, -.0253712590783834, .5995175242424011, .5031024813652039, 0, 3, 0, 13, 20, 4, -1, 0, 13, 10, 2, 2, 10, 15, 10, 2, 2, .0524579510092735, .4950287938117981, .1398351043462753, 0, 3, 4, 5, 14, 2, -1, 11, 5, 7, 1, 2, 4, 6, 7, 1, 2, -.0123656298965216, .639729917049408, .496410608291626, 0, 3, 1, 2, 10, 12, -1, 1, 2, 5, 6, 2, 6, 8, 5, 6, 2, -.1458971947431564, .1001669988036156, .494632214307785, 0, 2, 6, 1, 14, 3, -1, 6, 2, 14, 1, 3, -.0159086007624865, .3312329947948456, .5208340883255005, 0, 2, 8, 16, 2, 3, -1, 8, 17, 2, 1, 3, .00039486068999394774, .4406363964080811, .5426102876663208, 0, 2, 9, 17, 3, 2, -1, 10, 17, 1, 2, 3, -.0052454001270234585, .2799589931964874, .5189967155456543, 0, 3, 5, 15, 4, 2, -1, 5, 15, 2, 1, 2, 7, 16, 2, 1, 2, -.005042179953306913, .6987580060958862, .4752142131328583, 0, 2, 10, 15, 1, 3, -1, 10, 16, 1, 1, 3, .0029812189750373363, .4983288943767548, .6307479739189148, 0, 3, 8, 16, 4, 4, -1, 8, 16, 2, 2, 2, 10, 18, 2, 2, 2, -.007288430817425251, .298233300447464, .5026869773864746, 0, 2, 6, 11, 8, 6, -1, 6, 14, 8, 3, 2, .0015094350092113018, .5308442115783691, .3832970857620239, 0, 2, 2, 13, 5, 2, -1, 2, 14, 5, 1, 2, -.009334079921245575, .2037964016199112, .4969817101955414, 0, 3, 13, 14, 6, 6, -1, 16, 14, 3, 3, 2, 13, 17, 3, 3, 2, .0286671407520771, .5025696754455566, .6928027272224426, 0, 2, 1, 9, 18, 4, -1, 7, 9, 6, 4, 3, .1701968014240265, .4960052967071533, .1476442962884903, 0, 3, 13, 14, 6, 6, -1, 16, 14, 3, 3, 2, 13, 17, 3, 3, 2, -.003261447884142399, .5603063702583313, .4826056063175201, 0, 2, 0, 2, 1, 6, -1, 0, 4, 1, 2, 3, .0005576927796937525, .5205562114715576, .4129633009433746, 0, 2, 5, 0, 15, 20, -1, 5, 10, 15, 10, 2, .3625833988189697, .5221652984619141, .3768612146377564, 0, 3, 1, 14, 6, 6, -1, 1, 14, 3, 3, 2, 4, 17, 3, 3, 2, -.0116151301190257, .6022682785987854, .4637489914894104, 0, 3, 8, 14, 4, 6, -1, 10, 14, 2, 3, 2, 8, 17, 2, 3, 2, -.004079519771039486, .4070447087287903, .5337479114532471, 0, 2, 7, 11, 2, 1, -1, 8, 11, 1, 1, 2, .0005720430053770542, .4601835012435913, .5900393128395081, 0, 2, 9, 17, 3, 2, -1, 10, 17, 1, 2, 3, .000675433489959687, .5398252010345459, .4345428943634033, 0, 2, 8, 17, 3, 2, -1, 9, 17, 1, 2, 3, .0006329569732770324, .5201563239097595, .4051358997821808, 0, 3, 12, 14, 4, 6, -1, 14, 14, 2, 3, 2, 12, 17, 2, 3, 2, .00124353205319494, .4642387926578522, .5547441244125366, 0, 3, 4, 14, 4, 6, -1, 4, 14, 2, 3, 2, 6, 17, 2, 3, 2, -.004736385773867369, .6198567152023315, .4672552049160004, 0, 3, 13, 14, 2, 6, -1, 14, 14, 1, 3, 2, 13, 17, 1, 3, 2, -.006465846206992865, .6837332844734192, .5019000768661499, 0, 3, 5, 14, 2, 6, -1, 5, 14, 1, 3, 2, 6, 17, 1, 3, 2, .000350173213519156, .4344803094863892, .5363622903823853, 0, 2, 7, 0, 6, 12, -1, 7, 4, 6, 4, 3, .00015754920605104417, .4760079085826874, .5732020735740662, 0, 2, 0, 7, 12, 2, -1, 4, 7, 4, 2, 3, .009977436624467373, .5090985894203186, .3635039925575256, 0, 2, 10, 3, 3, 13, -1, 11, 3, 1, 13, 3, -.0004146452993154526, .5570064783096313, .4593802094459534, 0, 2, 7, 3, 3, 13, -1, 8, 3, 1, 13, 3, -.00035888899583369493, .5356845855712891, .4339134991168976, 0, 2, 10, 8, 6, 3, -1, 10, 9, 6, 1, 3, .0004046325047966093, .4439803063869476, .5436776876449585, 0, 2, 3, 11, 3, 2, -1, 4, 11, 1, 2, 3, -.0008218478760682046, .4042294919490814, .5176299214363098, 0, 3, 13, 12, 6, 8, -1, 16, 12, 3, 4, 2, 13, 16, 3, 4, 2, .005946741905063391, .4927651882171631, .5633779764175415, 0, 2, 7, 6, 6, 5, -1, 9, 6, 2, 5, 3, -.0217533893883228, .8006293773651123, .480084091424942, 0, 2, 17, 11, 2, 7, -1, 17, 11, 1, 7, 2, -.0145403798669577, .3946054875850678, .5182222723960876, 0, 2, 3, 13, 8, 2, -1, 7, 13, 4, 2, 2, -.0405107699334621, .0213249903172255, .4935792982578278, 0, 2, 6, 9, 8, 3, -1, 6, 10, 8, 1, 3, -.0005845826817676425, .4012795984745026, .5314025282859802, 0, 2, 4, 3, 4, 3, -1, 4, 4, 4, 1, 3, .005515180062502623, .4642418920993805, .5896260738372803, 0, 2, 11, 3, 4, 3, -1, 11, 4, 4, 1, 3, -.006062622182071209, .6502159237861633, .5016477704048157, 0, 2, 1, 4, 17, 12, -1, 1, 8, 17, 4, 3, .0945358425378799, .5264708995819092, .4126827120780945, 0, 2, 11, 3, 4, 3, -1, 11, 4, 4, 1, 3, .004731505177915096, .4879199862480164, .5892447829246521, 0, 2, 4, 8, 6, 3, -1, 4, 9, 6, 1, 3, -.0005257147131487727, .391728013753891, .5189412832260132, 0, 2, 12, 3, 5, 3, -1, 12, 4, 5, 1, 3, -.002546404954046011, .5837599039077759, .498570591211319, 0, 2, 1, 11, 2, 7, -1, 2, 11, 1, 7, 2, -.0260756891220808, .1261983960866928, .4955821931362152, 0, 3, 15, 12, 2, 8, -1, 16, 12, 1, 4, 2, 15, 16, 1, 4, 2, -.00547797093167901, .5722513794898987, .5010265707969666, 0, 2, 4, 8, 11, 3, -1, 4, 9, 11, 1, 3, .005133774131536484, .527326226234436, .4226376116275787, 0, 3, 9, 13, 6, 2, -1, 12, 13, 3, 1, 2, 9, 14, 3, 1, 2, .000479449809063226, .4450066983699799, .5819587111473083, 0, 2, 6, 13, 4, 3, -1, 6, 14, 4, 1, 3, -.0021114079281687737, .5757653117179871, .451171487569809, 0, 2, 9, 12, 3, 3, -1, 10, 12, 1, 3, 3, -.0131799904629588, .1884381026029587, .5160734057426453, 0, 2, 5, 3, 3, 3, -1, 5, 4, 3, 1, 3, -.004796809982508421, .6589789986610413, .4736118912696838, 0, 2, 9, 4, 2, 3, -1, 9, 5, 2, 1, 3, .0067483168095350266, .5259429812431335, .3356395065784454, 0, 2, 0, 2, 16, 3, -1, 0, 3, 16, 1, 3, .0014623369788751006, .5355271100997925, .4264092147350311, 0, 3, 15, 12, 2, 8, -1, 16, 12, 1, 4, 2, 15, 16, 1, 4, 2, .004764515906572342, .5034406781196594, .5786827802658081, 0, 3, 3, 12, 2, 8, -1, 3, 12, 1, 4, 2, 4, 16, 1, 4, 2, .0068066660314798355, .475660502910614, .6677829027175903, 0, 2, 14, 13, 3, 6, -1, 14, 15, 3, 2, 3, .0036608621012419462, .5369611978530884, .4311546981334686, 0, 2, 3, 13, 3, 6, -1, 3, 15, 3, 2, 3, .0214496403932571, .4968641996383667, .1888816058635712, 0, 3, 6, 5, 10, 2, -1, 11, 5, 5, 1, 2, 6, 6, 5, 1, 2, .004167890176177025, .4930733144283295, .5815368890762329, 0, 2, 2, 14, 14, 6, -1, 2, 17, 14, 3, 2, .008646756410598755, .5205205082893372, .4132595062255859, 0, 2, 10, 14, 1, 3, -1, 10, 15, 1, 1, 3, -.0003611407882999629, .5483555197715759, .4800927937030792, 0, 3, 4, 16, 2, 2, -1, 4, 16, 1, 1, 2, 5, 17, 1, 1, 2, .0010808729566633701, .4689902067184448, .6041421294212341, 0, 2, 10, 6, 2, 3, -1, 10, 7, 2, 1, 3, .005771995987743139, .5171142220497131, .3053277134895325, 0, 3, 0, 17, 20, 2, -1, 0, 17, 10, 1, 2, 10, 18, 10, 1, 2, .001572077046148479, .5219978094100952, .4178803861141205, 0, 2, 13, 6, 1, 3, -1, 13, 7, 1, 1, 3, -.0019307859474793077, .5860369801521301, .4812920093536377, 0, 2, 8, 13, 3, 2, -1, 9, 13, 1, 2, 3, -.007892627269029617, .1749276965856552, .497173398733139, 0, 2, 12, 2, 3, 3, -1, 13, 2, 1, 3, 3, -.002222467912361026, .434258908033371, .521284818649292, 0, 3, 3, 18, 2, 2, -1, 3, 18, 1, 1, 2, 4, 19, 1, 1, 2, .0019011989934369922, .4765186905860901, .689205527305603, 0, 2, 9, 16, 3, 4, -1, 10, 16, 1, 4, 3, .0027576119173318148, .5262191295623779, .4337486028671265, 0, 2, 6, 6, 1, 3, -1, 6, 7, 1, 1, 3, .005178744904696941, .4804069101810455, .7843729257583618, 0, 2, 13, 1, 5, 2, -1, 13, 2, 5, 1, 2, -.0009027334162965417, .412084698677063, .5353423953056335, 0, 3, 7, 14, 6, 2, -1, 7, 14, 3, 1, 2, 10, 15, 3, 1, 2, .005179795902222395, .4740372896194458, .6425960063934326, 0, 2, 11, 3, 3, 4, -1, 12, 3, 1, 4, 3, -.0101140001788735, .2468792051076889, .5175017714500427, 0, 2, 1, 13, 12, 6, -1, 5, 13, 4, 6, 3, -.0186170600354671, .5756294131278992, .4628978967666626, 0, 2, 14, 11, 5, 2, -1, 14, 12, 5, 1, 2, .0059225959703326225, .5169625878334045, .3214271068572998, 0, 3, 2, 15, 14, 4, -1, 2, 15, 7, 2, 2, 9, 17, 7, 2, 2, -.006294507998973131, .3872014880180359, .5141636729240417, 0, 3, 3, 7, 14, 2, -1, 10, 7, 7, 1, 2, 3, 8, 7, 1, 2, .0065353019163012505, .4853048920631409, .6310489773750305, 0, 2, 1, 11, 4, 2, -1, 1, 12, 4, 1, 2, .0010878399480134249, .5117315053939819, .3723258972167969, 0, 2, 14, 0, 6, 14, -1, 16, 0, 2, 14, 3, -.0225422400981188, .5692740082740784, .4887112975120544, 0, 2, 4, 11, 1, 3, -1, 4, 12, 1, 1, 3, -.003006566083058715, .2556012868881226, .5003992915153503, 0, 2, 14, 0, 6, 14, -1, 16, 0, 2, 14, 3, .007474127225577831, .4810872972011566, .5675926804542542, 0, 2, 1, 10, 3, 7, -1, 2, 10, 1, 7, 3, .0261623207479715, .4971194863319397, .1777237057685852, 0, 2, 8, 12, 9, 2, -1, 8, 13, 9, 1, 2, .0009435273823328316, .4940010905265808, .549125075340271, 0, 2, 0, 6, 20, 1, -1, 10, 6, 10, 1, 2, .0333632417023182, .5007612109184265, .2790724039077759, 0, 2, 8, 4, 4, 4, -1, 8, 4, 2, 4, 2, -.0151186501607299, .7059578895568848, .4973031878471375, 0, 2, 0, 0, 2, 2, -1, 0, 1, 2, 1, 2, .0009864894673228264, .5128620266914368, .3776761889457703, 105.76110076904297, 213, 0, 2, 5, 3, 10, 9, -1, 5, 6, 10, 3, 3, -.0951507985591888, .6470757126808167, .4017286896705627, 0, 2, 15, 2, 4, 10, -1, 15, 2, 2, 10, 2, .006270234007388353, .399982213973999, .574644923210144, 0, 2, 8, 2, 2, 7, -1, 9, 2, 1, 7, 2, .000300180894555524, .355877012014389, .5538809895515442, 0, 2, 7, 4, 12, 1, -1, 11, 4, 4, 1, 3, .0011757409665733576, .425653487443924, .5382617712020874, 0, 2, 3, 4, 9, 1, -1, 6, 4, 3, 1, 3, 4423526843311265e-20, .3682908117771149, .5589926838874817, 0, 2, 15, 10, 1, 4, -1, 15, 12, 1, 2, 2, -29936920327600092e-21, .5452470183372498, .4020367860794067, 0, 2, 4, 10, 6, 4, -1, 7, 10, 3, 4, 2, .003007319988682866, .5239058136940002, .3317843973636627, 0, 2, 15, 9, 1, 6, -1, 15, 12, 1, 3, 2, -.0105138896033168, .4320689141750336, .5307983756065369, 0, 2, 7, 17, 6, 3, -1, 7, 18, 6, 1, 3, .008347682654857635, .4504637122154236, .6453298926353455, 0, 3, 14, 3, 2, 16, -1, 15, 3, 1, 8, 2, 14, 11, 1, 8, 2, -.0031492270063608885, .4313425123691559, .5370525121688843, 0, 2, 4, 9, 1, 6, -1, 4, 12, 1, 3, 2, -1443564997316571e-20, .5326603055000305, .381797194480896, 0, 2, 12, 1, 5, 2, -1, 12, 2, 5, 1, 2, -.00042855090578086674, .430516391992569, .5382009744644165, 0, 3, 6, 18, 4, 2, -1, 6, 18, 2, 1, 2, 8, 19, 2, 1, 2, .00015062429883982986, .4235970973968506, .5544965267181396, 0, 3, 2, 4, 16, 10, -1, 10, 4, 8, 5, 2, 2, 9, 8, 5, 2, .0715598315000534, .5303059816360474, .2678802907466888, 0, 2, 6, 5, 1, 10, -1, 6, 10, 1, 5, 2, .0008409518050029874, .3557108938694, .5205433964729309, 0, 2, 4, 8, 15, 2, -1, 9, 8, 5, 2, 3, .0629865005612373, .5225362777709961, .2861376106739044, 0, 2, 1, 8, 15, 2, -1, 6, 8, 5, 2, 3, -.0033798629883676767, .3624185919761658, .5201697945594788, 0, 2, 9, 5, 3, 6, -1, 9, 7, 3, 2, 3, -.00011810739670181647, .547447681427002, .3959893882274628, 0, 2, 5, 7, 8, 2, -1, 9, 7, 4, 2, 2, -.0005450560129247606, .3740422129631043, .5215715765953064, 0, 2, 9, 11, 2, 3, -1, 9, 12, 2, 1, 3, -.0018454910023137927, .5893052220344543, .4584448933601379, 0, 2, 1, 0, 16, 3, -1, 1, 1, 16, 1, 3, -.0004383237101137638, .4084582030773163, .5385351181030273, 0, 2, 11, 2, 7, 2, -1, 11, 3, 7, 1, 2, -.002400083001703024, .377745509147644, .5293580293655396, 0, 2, 5, 1, 10, 18, -1, 5, 7, 10, 6, 3, -.0987957417964935, .2963612079620361, .5070089101791382, 0, 2, 17, 4, 3, 2, -1, 18, 4, 1, 2, 3, .0031798239797353745, .4877632856369019, .6726443767547607, 0, 2, 8, 13, 1, 3, -1, 8, 14, 1, 1, 3, .00032406419632025063, .4366911053657532, .5561109781265259, 0, 2, 3, 14, 14, 6, -1, 3, 16, 14, 2, 3, -.0325472503900528, .31281578540802, .5308616161346436, 0, 2, 0, 2, 3, 4, -1, 1, 2, 1, 4, 3, -.007756113074719906, .6560224890708923, .4639872014522553, 0, 2, 12, 1, 5, 2, -1, 12, 2, 5, 1, 2, .0160272493958473, .5172680020332336, .3141897916793823, 0, 2, 3, 1, 5, 2, -1, 3, 2, 5, 1, 2, 710023505234858e-20, .4084446132183075, .5336294770240784, 0, 2, 10, 13, 2, 3, -1, 10, 14, 2, 1, 3, .007342280820012093, .4966922104358673, .660346508026123, 0, 2, 8, 13, 2, 3, -1, 8, 14, 2, 1, 3, -.0016970280557870865, .5908237099647522, .4500182867050171, 0, 2, 14, 12, 2, 3, -1, 14, 13, 2, 1, 3, .0024118260480463505, .5315160751342773, .3599720895290375, 0, 2, 7, 2, 2, 3, -1, 7, 3, 2, 1, 3, -.005530093796551228, .2334040999412537, .4996814131736755, 0, 3, 5, 6, 10, 4, -1, 10, 6, 5, 2, 2, 5, 8, 5, 2, 2, -.0026478730142116547, .5880935788154602, .4684734046459198, 0, 2, 9, 13, 1, 6, -1, 9, 16, 1, 3, 2, .0112956296652555, .4983777105808258, .1884590983390808, 0, 3, 10, 12, 2, 2, -1, 11, 12, 1, 1, 2, 10, 13, 1, 1, 2, -.000669528788421303, .5872138142585754, .4799019992351532, 0, 2, 4, 12, 2, 3, -1, 4, 13, 2, 1, 3, .0014410680159926414, .5131189227104187, .350101113319397, 0, 2, 14, 4, 6, 6, -1, 14, 6, 6, 2, 3, .0024637870956212282, .5339372158050537, .4117639064788818, 0, 2, 8, 17, 2, 3, -1, 8, 18, 2, 1, 3, .0003311451873742044, .4313383102416992, .5398246049880981, 0, 2, 16, 4, 4, 6, -1, 16, 6, 4, 2, 3, -.0335572697222233, .26753368973732, .5179154872894287, 0, 2, 0, 4, 4, 6, -1, 0, 6, 4, 2, 3, .0185394193977118, .4973869919776917, .2317177057266235, 0, 2, 14, 6, 2, 3, -1, 14, 6, 1, 3, 2, -.00029698139405809343, .552970826625824, .4643664062023163, 0, 2, 4, 9, 8, 1, -1, 8, 9, 4, 1, 2, -.0004557725915219635, .5629584193229675, .4469191133975983, 0, 2, 8, 12, 4, 3, -1, 8, 13, 4, 1, 3, -.0101589802652597, .6706212759017944, .4925918877124786, 0, 2, 5, 12, 10, 6, -1, 5, 14, 10, 2, 3, -22413829356082715e-21, .5239421725273132, .3912901878356934, 0, 2, 11, 12, 1, 2, -1, 11, 13, 1, 1, 2, 7203496352303773e-20, .4799438118934631, .5501788854598999, 0, 2, 8, 15, 4, 2, -1, 8, 16, 4, 1, 2, -.006926720961928368, .6930009722709656, .4698084890842438, 0, 3, 6, 9, 8, 8, -1, 10, 9, 4, 4, 2, 6, 13, 4, 4, 2, -.007699783891439438, .409962385892868, .5480883121490479, 0, 3, 7, 12, 4, 6, -1, 7, 12, 2, 3, 2, 9, 15, 2, 3, 2, -.007313054986298084, .3283475935459137, .5057886242866516, 0, 2, 10, 11, 3, 1, -1, 11, 11, 1, 1, 3, .0019650589674711227, .4978047013282776, .6398249864578247, 0, 3, 9, 7, 2, 10, -1, 9, 7, 1, 5, 2, 10, 12, 1, 5, 2, .007164760027080774, .4661160111427307, .6222137212753296, 0, 2, 8, 0, 6, 6, -1, 10, 0, 2, 6, 3, -.0240786392241716, .2334644943475723, .5222162008285522, 0, 2, 3, 11, 2, 6, -1, 3, 13, 2, 2, 3, -.0210279691964388, .1183653995394707, .4938226044178009, 0, 2, 16, 12, 1, 2, -1, 16, 13, 1, 1, 2, .00036017020465806127, .5325019955635071, .4116711020469666, 0, 3, 1, 14, 6, 6, -1, 1, 14, 3, 3, 2, 4, 17, 3, 3, 2, -.0172197297215462, .6278762221336365, .4664269089698792, 0, 2, 13, 1, 3, 6, -1, 14, 1, 1, 6, 3, -.007867214269936085, .3403415083885193, .5249736905097961, 0, 2, 8, 8, 2, 2, -1, 8, 9, 2, 1, 2, -.000447773898486048, .3610411882400513, .5086259245872498, 0, 2, 9, 9, 3, 3, -1, 10, 9, 1, 3, 3, .005548601038753986, .4884265959262848, .6203498244285583, 0, 2, 8, 7, 3, 3, -1, 8, 8, 3, 1, 3, -.00694611482322216, .262593001127243, .5011097192764282, 0, 2, 14, 0, 2, 3, -1, 14, 0, 1, 3, 2, .00013569870498031378, .4340794980525971, .5628312230110168, 0, 2, 1, 0, 18, 9, -1, 7, 0, 6, 9, 3, -.0458802506327629, .6507998704910278, .4696274995803833, 0, 2, 11, 5, 4, 15, -1, 11, 5, 2, 15, 2, -.0215825606137514, .3826502859592438, .5287616848945618, 0, 2, 5, 5, 4, 15, -1, 7, 5, 2, 15, 2, -.0202095396816731, .3233368098735809, .5074477195739746, 0, 2, 14, 0, 2, 3, -1, 14, 0, 1, 3, 2, .005849671084433794, .5177603960037231, .4489670991897583, 0, 2, 4, 0, 2, 3, -1, 5, 0, 1, 3, 2, -5747637987951748e-20, .4020850956439972, .5246363878250122, 0, 3, 11, 12, 2, 2, -1, 12, 12, 1, 1, 2, 11, 13, 1, 1, 2, -.001151310047134757, .6315072178840637, .490515410900116, 0, 3, 7, 12, 2, 2, -1, 7, 12, 1, 1, 2, 8, 13, 1, 1, 2, .0019862831104546785, .4702459871768951, .6497151255607605, 0, 2, 12, 0, 3, 4, -1, 13, 0, 1, 4, 3, -.005271951202303171, .3650383949279785, .5227652788162231, 0, 2, 4, 11, 3, 3, -1, 4, 12, 3, 1, 3, .0012662699446082115, .5166100859642029, .387761801481247, 0, 2, 12, 7, 4, 2, -1, 12, 8, 4, 1, 2, -.006291944067925215, .737589418888092, .5023847818374634, 0, 2, 8, 10, 3, 2, -1, 9, 10, 1, 2, 3, .000673601112794131, .4423226118087769, .5495585799217224, 0, 2, 9, 9, 3, 2, -1, 10, 9, 1, 2, 3, -.0010523450328037143, .5976396203041077, .4859583079814911, 0, 2, 8, 9, 3, 2, -1, 9, 9, 1, 2, 3, -.00044216238893568516, .5955939292907715, .4398930966854096, 0, 2, 12, 0, 3, 4, -1, 13, 0, 1, 4, 3, .0011747940443456173, .5349888205528259, .4605058133602142, 0, 2, 5, 0, 3, 4, -1, 6, 0, 1, 4, 3, .005245743785053492, .5049191117286682, .2941577136516571, 0, 3, 4, 14, 12, 4, -1, 10, 14, 6, 2, 2, 4, 16, 6, 2, 2, -.0245397202670574, .2550177872180939, .5218586921691895, 0, 2, 8, 13, 2, 3, -1, 8, 14, 2, 1, 3, .0007379304151982069, .4424861073493958, .5490816235542297, 0, 2, 10, 10, 3, 8, -1, 10, 14, 3, 4, 2, .0014233799884095788, .5319514274597168, .4081355929374695, 0, 3, 8, 10, 4, 8, -1, 8, 10, 2, 4, 2, 10, 14, 2, 4, 2, -.0024149110540747643, .4087659120559692, .5238950252532959, 0, 2, 10, 8, 3, 1, -1, 11, 8, 1, 1, 3, -.0012165299849584699, .567457914352417, .4908052980899811, 0, 2, 9, 12, 1, 6, -1, 9, 15, 1, 3, 2, -.0012438809499144554, .4129425883293152, .5256118178367615, 0, 2, 10, 8, 3, 1, -1, 11, 8, 1, 1, 3, .006194273941218853, .5060194134712219, .7313653230667114, 0, 2, 7, 8, 3, 1, -1, 8, 8, 1, 1, 3, -.0016607169527560472, .5979632139205933, .4596369862556458, 0, 2, 5, 2, 15, 14, -1, 5, 9, 15, 7, 2, -.0273162592202425, .4174365103244782, .5308842062950134, 0, 3, 2, 1, 2, 10, -1, 2, 1, 1, 5, 2, 3, 6, 1, 5, 2, -.00158455700147897, .56158047914505, .4519486129283905, 0, 2, 14, 14, 2, 3, -1, 14, 15, 2, 1, 3, -.0015514739789068699, .4076187014579773, .5360785126686096, 0, 2, 2, 7, 3, 3, -1, 3, 7, 1, 3, 3, .0003844655875582248, .4347293972969055, .5430442094802856, 0, 2, 17, 4, 3, 3, -1, 17, 5, 3, 1, 3, -.0146722598001361, .1659304946660996, .5146093964576721, 0, 2, 0, 4, 3, 3, -1, 0, 5, 3, 1, 3, .008160888217389584, .4961819052696228, .1884745955467224, 0, 3, 13, 5, 6, 2, -1, 16, 5, 3, 1, 2, 13, 6, 3, 1, 2, .0011121659772470593, .4868263900279999, .6093816161155701, 0, 2, 4, 19, 12, 1, -1, 8, 19, 4, 1, 3, -.007260377053171396, .6284325122833252, .4690375924110413, 0, 2, 12, 12, 2, 4, -1, 12, 14, 2, 2, 2, -.00024046430189628154, .5575000047683716, .4046044051647186, 0, 2, 3, 15, 1, 3, -1, 3, 16, 1, 1, 3, -.00023348190006799996, .4115762114524841, .5252848267555237, 0, 2, 11, 16, 6, 4, -1, 11, 16, 3, 4, 2, .005573648028075695, .4730072915554047, .5690100789070129, 0, 2, 2, 10, 3, 10, -1, 3, 10, 1, 10, 3, .0306237693876028, .4971886873245239, .1740095019340515, 0, 2, 12, 8, 2, 4, -1, 12, 8, 1, 4, 2, .0009207479888573289, .5372117757797241, .4354872107505798, 0, 2, 6, 8, 2, 4, -1, 7, 8, 1, 4, 2, -4355073906481266e-20, .5366883873939514, .4347316920757294, 0, 2, 10, 14, 2, 3, -1, 10, 14, 1, 3, 2, -.006645271088927984, .3435518145561218, .516053318977356, 0, 2, 5, 1, 10, 3, -1, 10, 1, 5, 3, 2, .0432219989597797, .4766792058944702, .7293652892112732, 0, 2, 10, 7, 3, 2, -1, 11, 7, 1, 2, 3, .0022331769578158855, .5029315948486328, .5633171200752258, 0, 2, 5, 6, 9, 2, -1, 8, 6, 3, 2, 3, .0031829739455133677, .4016092121601105, .5192136764526367, 0, 2, 9, 8, 2, 2, -1, 9, 9, 2, 1, 2, -.00018027749320026487, .4088315963745117, .5417919754981995, 0, 3, 2, 11, 16, 6, -1, 2, 11, 8, 3, 2, 10, 14, 8, 3, 2, -.0052934689447283745, .407567709684372, .5243561863899231, 0, 3, 12, 7, 2, 2, -1, 13, 7, 1, 1, 2, 12, 8, 1, 1, 2, .0012750959722325206, .4913282990455627, .6387010812759399, 0, 2, 9, 5, 2, 3, -1, 9, 6, 2, 1, 3, .004338532220572233, .5031672120094299, .2947346866130829, 0, 2, 9, 7, 3, 2, -1, 10, 7, 1, 2, 3, .00852507445961237, .4949789047241211, .6308869123458862, 0, 2, 5, 1, 8, 12, -1, 5, 7, 8, 6, 2, -.0009426635224372149, .5328366756439209, .4285649955272675, 0, 2, 13, 5, 2, 2, -1, 13, 6, 2, 1, 2, .0013609660090878606, .4991525113582611, .5941501259803772, 0, 2, 5, 5, 2, 2, -1, 5, 6, 2, 1, 2, .0004478250921238214, .4573504030704498, .5854480862617493, 0, 2, 12, 4, 3, 3, -1, 12, 5, 3, 1, 3, .001336005050688982, .4604358971118927, .584905207157135, 0, 2, 4, 14, 2, 3, -1, 4, 15, 2, 1, 3, -.0006096754805184901, .3969388902187347, .522942304611206, 0, 2, 12, 4, 3, 3, -1, 12, 5, 3, 1, 3, -.002365678083151579, .5808320045471191, .4898357093334198, 0, 2, 5, 4, 3, 3, -1, 5, 5, 3, 1, 3, .001073434017598629, .435121089220047, .5470039248466492, 0, 3, 9, 14, 2, 6, -1, 10, 14, 1, 3, 2, 9, 17, 1, 3, 2, .0021923359017819166, .535506010055542, .3842903971672058, 0, 2, 8, 14, 3, 2, -1, 9, 14, 1, 2, 3, .005496861878782511, .5018138885498047, .2827191948890686, 0, 2, 9, 5, 6, 6, -1, 11, 5, 2, 6, 3, -.0753688216209412, .1225076019763947, .5148826837539673, 0, 2, 5, 5, 6, 6, -1, 7, 5, 2, 6, 3, .0251344703137875, .4731766879558563, .702544629573822, 0, 2, 13, 13, 1, 2, -1, 13, 14, 1, 1, 2, -2935859993158374e-20, .5430532097816467, .465608686208725, 0, 2, 0, 2, 10, 2, -1, 0, 3, 10, 1, 2, -.0005835591000504792, .4031040072441101, .5190119743347168, 0, 2, 13, 13, 1, 2, -1, 13, 14, 1, 1, 2, -.0026639450807124376, .4308126866817474, .5161771178245544, 0, 3, 5, 7, 2, 2, -1, 5, 7, 1, 1, 2, 6, 8, 1, 1, 2, -.0013804089976474643, .621982991695404, .4695515930652618, 0, 2, 13, 5, 2, 7, -1, 13, 5, 1, 7, 2, .0012313219485804439, .5379363894462585, .4425831139087677, 0, 2, 6, 13, 1, 2, -1, 6, 14, 1, 1, 2, -14644179827882908e-21, .5281640291213989, .4222503006458283, 0, 2, 11, 0, 3, 7, -1, 12, 0, 1, 7, 3, -.0128188095986843, .2582092881202698, .5179932713508606, 0, 3, 0, 3, 2, 16, -1, 0, 3, 1, 8, 2, 1, 11, 1, 8, 2, .0228521898388863, .4778693020343781, .7609264254570007, 0, 2, 11, 0, 3, 7, -1, 12, 0, 1, 7, 3, .0008230597013607621, .5340992212295532, .4671724140644074, 0, 2, 6, 0, 3, 7, -1, 7, 0, 1, 7, 3, .0127701200544834, .4965761005878449, .1472366005182266, 0, 2, 11, 16, 8, 4, -1, 11, 16, 4, 4, 2, -.0500515103340149, .641499400138855, .5016592144966125, 0, 2, 1, 16, 8, 4, -1, 5, 16, 4, 4, 2, .0157752707600594, .4522320032119751, .5685362219810486, 0, 2, 13, 5, 2, 7, -1, 13, 5, 1, 7, 2, -.0185016207396984, .2764748930931091, .5137959122657776, 0, 2, 5, 5, 2, 7, -1, 6, 5, 1, 7, 2, .0024626250378787518, .5141941905021667, .3795408010482788, 0, 2, 18, 6, 2, 14, -1, 18, 13, 2, 7, 2, .0629161670804024, .5060648918151855, .658043384552002, 0, 2, 6, 10, 3, 4, -1, 6, 12, 3, 2, 2, -21648500478477217e-21, .5195388197898865, .401988685131073, 0, 2, 14, 7, 1, 2, -1, 14, 8, 1, 1, 2, .0021180990152060986, .4962365031242371, .5954458713531494, 0, 3, 0, 1, 18, 6, -1, 0, 1, 9, 3, 2, 9, 4, 9, 3, 2, -.0166348908096552, .3757933080196381, .517544686794281, 0, 2, 14, 7, 1, 2, -1, 14, 8, 1, 1, 2, -.002889947034418583, .6624013781547546, .5057178735733032, 0, 2, 0, 6, 2, 14, -1, 0, 13, 2, 7, 2, .076783262193203, .4795796871185303, .8047714829444885, 0, 2, 17, 0, 3, 12, -1, 18, 0, 1, 12, 3, .003917067777365446, .4937882125377655, .5719941854476929, 0, 2, 0, 6, 18, 3, -1, 0, 7, 18, 1, 3, -.0726706013083458, .0538945607841015, .4943903982639313, 0, 2, 6, 0, 14, 16, -1, 6, 8, 14, 8, 2, .5403950214385986, .5129774212837219, .1143338978290558, 0, 2, 0, 0, 3, 12, -1, 1, 0, 1, 12, 3, .0029510019812732935, .4528343975543976, .5698574185371399, 0, 2, 13, 0, 3, 7, -1, 14, 0, 1, 7, 3, .0034508369863033295, .5357726812362671, .4218730926513672, 0, 2, 5, 7, 1, 2, -1, 5, 8, 1, 1, 2, -.0004207793972454965, .5916172862052917, .4637925922870636, 0, 2, 14, 4, 6, 6, -1, 14, 6, 6, 2, 3, .0033051050268113613, .5273385047912598, .438204288482666, 0, 2, 5, 7, 7, 2, -1, 5, 8, 7, 1, 2, .0004773506079800427, .4046528041362763, .5181884765625, 0, 2, 8, 6, 6, 9, -1, 8, 9, 6, 3, 3, -.0259285103529692, .7452235817909241, .5089386105537415, 0, 2, 5, 4, 6, 1, -1, 7, 4, 2, 1, 3, -.002972979098558426, .3295435905456543, .5058795213699341, 0, 3, 13, 0, 6, 4, -1, 16, 0, 3, 2, 2, 13, 2, 3, 2, 2, .005850832909345627, .4857144057750702, .5793024897575378, 0, 2, 1, 2, 18, 12, -1, 1, 6, 18, 4, 3, -.0459675192832947, .4312731027603149, .5380653142929077, 0, 2, 3, 2, 17, 12, -1, 3, 6, 17, 4, 3, .1558596044778824, .5196170210838318, .1684713959693909, 0, 2, 5, 14, 7, 3, -1, 5, 15, 7, 1, 3, .0151648297905922, .4735757112503052, .6735026836395264, 0, 2, 10, 14, 1, 3, -1, 10, 15, 1, 1, 3, -.0010604249546304345, .5822926759719849, .4775702953338623, 0, 2, 3, 14, 3, 3, -1, 3, 15, 3, 1, 3, .006647629197686911, .4999198913574219, .231953501701355, 0, 2, 14, 4, 6, 6, -1, 14, 6, 6, 2, 3, -.0122311301529408, .4750893115997315, .5262982249259949, 0, 2, 0, 4, 6, 6, -1, 0, 6, 6, 2, 3, .005652888212352991, .5069767832756042, .3561818897724152, 0, 2, 12, 5, 4, 3, -1, 12, 6, 4, 1, 3, .0012977829901501536, .4875693917274475, .5619062781333923, 0, 2, 4, 5, 4, 3, -1, 4, 6, 4, 1, 3, .0107815898954868, .4750770032405853, .6782308220863342, 0, 2, 18, 0, 2, 6, -1, 18, 2, 2, 2, 3, .002865477930754423, .5305461883544922, .4290736019611359, 0, 2, 8, 1, 4, 9, -1, 10, 1, 2, 9, 2, .0028663428965955973, .4518479108810425, .5539351105690002, 0, 2, 6, 6, 8, 2, -1, 6, 6, 4, 2, 2, -.005198332015424967, .4149119853973389, .5434188842773438, 0, 3, 6, 5, 4, 2, -1, 6, 5, 2, 1, 2, 8, 6, 2, 1, 2, .005373999010771513, .471789687871933, .6507657170295715, 0, 2, 10, 5, 2, 3, -1, 10, 6, 2, 1, 3, -.0146415298804641, .2172164022922516, .5161777138710022, 0, 2, 9, 5, 1, 3, -1, 9, 6, 1, 1, 3, -15042580344015732e-21, .533738374710083, .4298836886882782, 0, 2, 9, 10, 2, 2, -1, 9, 11, 2, 1, 2, -.0001187566012958996, .4604594111442566, .5582447052001953, 0, 2, 0, 8, 4, 3, -1, 0, 9, 4, 1, 3, .0169955305755138, .4945895075798035, .0738800764083862, 0, 2, 6, 0, 8, 6, -1, 6, 3, 8, 3, 2, -.0350959412753582, .70055091381073, .4977591037750244, 0, 3, 1, 0, 6, 4, -1, 1, 0, 3, 2, 2, 4, 2, 3, 2, 2, .0024217350874096155, .4466265141963959, .5477694272994995, 0, 2, 13, 0, 3, 7, -1, 14, 0, 1, 7, 3, -.0009634033776819706, .4714098870754242, .5313338041305542, 0, 2, 9, 16, 2, 2, -1, 9, 17, 2, 1, 2, .00016391130338888615, .4331546127796173, .5342242121696472, 0, 2, 11, 4, 6, 10, -1, 11, 9, 6, 5, 2, -.0211414601653814, .2644700109958649, .5204498767852783, 0, 2, 0, 10, 19, 2, -1, 0, 11, 19, 1, 2, .0008777520270086825, .5208349823951721, .4152742922306061, 0, 2, 9, 5, 8, 9, -1, 9, 8, 8, 3, 3, -.0279439203441143, .6344125270843506, .5018811821937561, 0, 2, 4, 0, 3, 7, -1, 5, 0, 1, 7, 3, .006729737855494022, .5050438046455383, .3500863909721375, 0, 3, 8, 6, 4, 12, -1, 10, 6, 2, 6, 2, 8, 12, 2, 6, 2, .0232810396701097, .4966318011283875, .6968677043914795, 0, 2, 0, 2, 6, 4, -1, 0, 4, 6, 2, 2, -.0116449799388647, .3300260007381439, .5049629807472229, 0, 2, 8, 15, 4, 3, -1, 8, 16, 4, 1, 3, .0157643090933561, .4991598129272461, .7321153879165649, 0, 2, 8, 0, 3, 7, -1, 9, 0, 1, 7, 3, -.001361147966235876, .3911735117435455, .5160670876502991, 0, 2, 9, 5, 3, 4, -1, 10, 5, 1, 4, 3, -.0008152233785949647, .5628911256790161, .49497190117836, 0, 2, 8, 5, 3, 4, -1, 9, 5, 1, 4, 3, -.0006006627227179706, .585359513759613, .4550595879554749, 0, 2, 7, 6, 6, 1, -1, 9, 6, 2, 1, 3, .0004971551825292408, .4271470010280609, .5443599224090576, 0, 3, 7, 14, 4, 4, -1, 7, 14, 2, 2, 2, 9, 16, 2, 2, 2, .0023475370835512877, .5143110752105713, .3887656927108765, 0, 3, 13, 14, 4, 6, -1, 15, 14, 2, 3, 2, 13, 17, 2, 3, 2, -.008926156908273697, .6044502258300781, .497172087430954, 0, 2, 7, 8, 1, 8, -1, 7, 12, 1, 4, 2, -.013919910416007, .2583160996437073, .5000367760658264, 0, 3, 16, 0, 2, 8, -1, 17, 0, 1, 4, 2, 16, 4, 1, 4, 2, .0010209949687123299, .4857374131679535, .5560358166694641, 0, 3, 2, 0, 2, 8, -1, 2, 0, 1, 4, 2, 3, 4, 1, 4, 2, -.0027441629208624363, .5936884880065918, .464577704668045, 0, 2, 6, 1, 14, 3, -1, 6, 2, 14, 1, 3, -.0162001308053732, .3163014948368073, .5193495154380798, 0, 2, 7, 9, 3, 10, -1, 7, 14, 3, 5, 2, .004333198070526123, .5061224102973938, .3458878993988037, 0, 2, 9, 14, 2, 2, -1, 9, 15, 2, 1, 2, .0005849793087691069, .4779017865657806, .5870177745819092, 0, 2, 7, 7, 6, 8, -1, 7, 11, 6, 4, 2, -.0022466450463980436, .4297851026058197, .5374773144721985, 0, 2, 9, 7, 3, 6, -1, 9, 10, 3, 3, 2, .0023146099410951138, .5438671708106995, .4640969932079315, 0, 2, 7, 13, 3, 3, -1, 7, 14, 3, 1, 3, .008767912164330482, .472689300775528, .6771789789199829, 0, 2, 9, 9, 2, 2, -1, 9, 10, 2, 1, 2, -.00022448020172305405, .4229173064231873, .5428048968315125, 0, 2, 0, 1, 18, 2, -1, 6, 1, 6, 2, 3, -.007433602120727301, .6098880767822266, .4683673977851868, 0, 2, 7, 1, 6, 14, -1, 7, 8, 6, 7, 2, -.0023189240600913763, .5689436793327332, .4424242079257965, 0, 2, 1, 9, 18, 1, -1, 7, 9, 6, 1, 3, -.0021042178850620985, .3762221038341522, .5187087059020996, 0, 2, 9, 7, 2, 2, -1, 9, 7, 1, 2, 2, .000460348412161693, .4699405133724213, .5771207213401794, 0, 2, 9, 3, 2, 9, -1, 10, 3, 1, 9, 2, .0010547629790380597, .4465216994285584, .5601701736450195, 0, 2, 18, 14, 2, 3, -1, 18, 15, 2, 1, 3, .0008714881842024624, .544980525970459, .3914709091186523, 0, 2, 7, 11, 3, 1, -1, 8, 11, 1, 1, 3, .00033364820410497487, .4564009010791779, .5645738840103149, 0, 2, 10, 8, 3, 4, -1, 11, 8, 1, 4, 3, -.0014853250468149781, .5747377872467041, .4692778885364533, 0, 2, 7, 14, 3, 6, -1, 8, 14, 1, 6, 3, .0030251620337367058, .5166196823120117, .3762814104557037, 0, 2, 10, 8, 3, 4, -1, 11, 8, 1, 4, 3, .005028074141591787, .5002111792564392, .6151527166366577, 0, 2, 7, 8, 3, 4, -1, 8, 8, 1, 4, 3, -.0005816451157443225, .5394598245620728, .4390751123428345, 0, 2, 7, 9, 6, 9, -1, 7, 12, 6, 3, 3, .0451415292918682, .5188326835632324, .206303596496582, 0, 2, 0, 14, 2, 3, -1, 0, 15, 2, 1, 3, -.001079562003724277, .3904685080051422, .5137907266616821, 0, 2, 11, 12, 1, 2, -1, 11, 13, 1, 1, 2, .00015995999274309725, .4895322918891907, .5427504181861877, 0, 2, 4, 3, 8, 3, -1, 8, 3, 4, 3, 2, -.0193592701107264, .6975228786468506, .4773507118225098, 0, 2, 0, 4, 20, 6, -1, 0, 4, 10, 6, 2, .207255095243454, .5233635902404785, .3034991919994354, 0, 2, 9, 14, 1, 3, -1, 9, 15, 1, 1, 3, -.00041953290929086506, .5419396758079529, .4460186064243317, 0, 2, 8, 14, 4, 3, -1, 8, 15, 4, 1, 3, .0022582069505006075, .4815764129161835, .6027408838272095, 0, 2, 0, 15, 14, 4, -1, 0, 17, 14, 2, 2, -.0067811207845807076, .3980278968811035, .5183305740356445, 0, 2, 1, 14, 18, 6, -1, 1, 17, 18, 3, 2, .0111543098464608, .543123185634613, .4188759922981262, 0, 3, 0, 0, 10, 6, -1, 0, 0, 5, 3, 2, 5, 3, 5, 3, 2, .0431624315679073, .4738228023052216, .6522961258888245]);

  /**
   * tracking.js - A modern approach for Computer Vision on the web.
   * @author Eduardo Lundgren <edu@rdo.io>
   * @version v1.0.0
   * @link http://trackingjs.com
   * @license BSD
   */
  tracking.ViolaJones.classifiers.eye = new Float64Array([20, 20, -1.4562760591506958, 6, 0, 2, 0, 8, 20, 12, -1, 0, 14, 20, 6, 2, .129639595746994, -.7730420827865601, .6835014820098877, 0, 2, 9, 1, 4, 15, -1, 9, 6, 4, 5, 3, -.0463268086314201, .5735275149345398, -.4909768998622894, 0, 2, 6, 10, 9, 2, -1, 9, 10, 3, 2, 3, -.0161730907857418, .6025434136390686, -.3161070942878723, 0, 2, 7, 0, 10, 9, -1, 7, 3, 10, 3, 3, -.0458288416266441, .6417754888534546, -.1554504036903381, 0, 2, 12, 2, 2, 18, -1, 12, 8, 2, 6, 3, -.0537596195936203, .5421931743621826, -.2048082947731018, 0, 2, 8, 6, 8, 6, -1, 8, 9, 8, 3, 2, .0341711901128292, -.2338819056749344, .4841090142726898, -1.2550230026245117, 12, 0, 2, 2, 0, 17, 18, -1, 2, 6, 17, 6, 3, -.2172762006521225, .7109889984130859, -.5936073064804077, 0, 2, 10, 10, 1, 8, -1, 10, 14, 1, 4, 2, .0120719699189067, -.2824048101902008, .5901355147361755, 0, 2, 7, 10, 9, 2, -1, 10, 10, 3, 2, 3, -.0178541392087936, .5313752293586731, -.2275896072387695, 0, 2, 5, 1, 6, 6, -1, 5, 3, 6, 2, 3, .0223336108028889, -.1755609959363937, .633561372756958, 0, 2, 3, 1, 15, 9, -1, 3, 4, 15, 3, 3, -.091420017182827, .6156309247016907, -.1689953058958054, 0, 2, 6, 3, 9, 6, -1, 6, 5, 9, 2, 3, .028973650187254, -.1225007995963097, .7440117001533508, 0, 2, 8, 17, 6, 3, -1, 10, 17, 2, 3, 3, .007820346392691135, .1697437018156052, -.6544165015220642, 0, 2, 9, 10, 9, 1, -1, 12, 10, 3, 1, 3, .0203404892235994, -.1255664974451065, .8271045088768005, 0, 2, 1, 7, 6, 11, -1, 3, 7, 2, 11, 3, -.0119261499494314, .3860568106174469, -.2099234014749527, 0, 2, 9, 18, 3, 1, -1, 10, 18, 1, 1, 3, -.000972811016254127, -.6376119256019592, .129523903131485, 0, 2, 16, 16, 1, 2, -1, 16, 17, 1, 1, 2, 18322050891583785e-21, -.3463147878646851, .2292426973581314, 0, 2, 9, 17, 6, 3, -1, 11, 17, 2, 3, 3, -.008085441775619984, -.6366580128669739, .1307865977287293, -1.372818946838379, 9, 0, 2, 8, 0, 5, 18, -1, 8, 6, 5, 6, 3, -.1181226968765259, .6784452199935913, -.5004578232765198, 0, 2, 6, 7, 9, 7, -1, 9, 7, 3, 7, 3, -.0343327596783638, .6718636155128479, -.3574487864971161, 0, 2, 14, 6, 6, 10, -1, 16, 6, 2, 10, 3, -.0215307995676994, .7222070097923279, -.1819241940975189, 0, 2, 9, 8, 9, 5, -1, 12, 8, 3, 5, 3, -.0219099707901478, .6652938723564148, -.2751022875308991, 0, 2, 3, 7, 9, 6, -1, 6, 7, 3, 6, 3, -.0287135392427444, .6995570063591003, -.1961558014154434, 0, 2, 1, 7, 6, 6, -1, 3, 7, 2, 6, 3, -.0114674801006913, .5926734805107117, -.2209735065698624, 0, 2, 16, 0, 4, 18, -1, 16, 6, 4, 6, 3, -.0226111691445112, .3448306918144226, -.3837955892086029, 0, 2, 0, 17, 3, 3, -1, 0, 18, 3, 1, 3, -.0019308089977130294, -.794457197189331, .1562865972518921, 0, 2, 16, 0, 2, 1, -1, 17, 0, 1, 1, 2, 5641991083393805e-20, -.3089601099491119, .3543108999729157, -1.2879480123519897, 16, 0, 2, 0, 8, 20, 12, -1, 0, 14, 20, 6, 2, .1988652050495148, -.5286070108413696, .3553672134876251, 0, 2, 6, 6, 9, 8, -1, 9, 6, 3, 8, 3, -.0360089391469955, .4210968911647797, -.393489807844162, 0, 2, 5, 3, 12, 9, -1, 5, 6, 12, 3, 3, -.0775698497891426, .4799154102802277, -.2512216866016388, 0, 2, 4, 16, 1, 2, -1, 4, 17, 1, 1, 2, 8263085328508168e-20, -.3847548961639404, .318492203950882, 0, 2, 18, 10, 2, 1, -1, 19, 10, 1, 1, 2, .00032773229759186506, -.2642731964588165, .3254724144935608, 0, 2, 9, 8, 6, 5, -1, 11, 8, 2, 5, 3, -.0185748506337404, .4673658907413483, -.1506727039813995, 0, 2, 0, 0, 2, 1, -1, 1, 0, 1, 1, 2, -7000876212259755e-20, .2931315004825592, -.2536509931087494, 0, 2, 6, 8, 6, 6, -1, 8, 8, 2, 6, 3, -.0185521300882101, .4627366065979004, -.1314805001020432, 0, 2, 11, 7, 6, 7, -1, 13, 7, 2, 7, 3, -.0130304200574756, .4162721931934357, -.1775148957967758, 0, 2, 19, 14, 1, 2, -1, 19, 15, 1, 1, 2, 6569414108525962e-20, -.2803510129451752, .2668074071407318, 0, 2, 6, 17, 1, 2, -1, 6, 18, 1, 1, 2, .00017005260451696813, -.2702724933624268, .2398165017366409, 0, 2, 14, 7, 2, 7, -1, 15, 7, 1, 7, 2, -.0033129199873656034, .4441143870353699, -.1442888975143433, 0, 2, 6, 8, 2, 4, -1, 7, 8, 1, 4, 2, .0017583490116521716, -.1612619012594223, .4294076859951019, 0, 2, 5, 8, 12, 6, -1, 5, 10, 12, 2, 3, -.0251947492361069, .4068729877471924, -.1820258051156998, 0, 2, 2, 17, 1, 3, -1, 2, 18, 1, 1, 3, .0014031709870323539, .0847597867250443, -.8001856803894043, 0, 2, 6, 7, 3, 6, -1, 7, 7, 1, 6, 3, -.007399172987788916, .5576609969139099, -.1184315979480743, -1.2179850339889526, 23, 0, 2, 6, 7, 9, 12, -1, 9, 7, 3, 12, 3, -.0299430806189775, .3581081032752991, -.3848763108253479, 0, 2, 6, 2, 11, 12, -1, 6, 6, 11, 4, 3, -.1256738007068634, .3931693136692047, -.3001225888729096, 0, 2, 1, 12, 5, 8, -1, 1, 16, 5, 4, 2, .0053635272197425365, -.4390861988067627, .1925701051950455, 0, 2, 14, 7, 6, 7, -1, 16, 7, 2, 7, 3, -.008097182027995586, .399066686630249, -.2340787053108215, 0, 2, 10, 8, 6, 6, -1, 12, 8, 2, 6, 3, -.0165979098528624, .4209528863430023, -.2267484068870544, 0, 2, 16, 18, 4, 2, -1, 16, 19, 4, 1, 2, -.0020199299324303865, -.7415673136711121, .1260118931531906, 0, 2, 18, 17, 2, 3, -1, 18, 18, 2, 1, 3, -.0015202340437099338, -.7615460157394409, .0863736122846603, 0, 2, 9, 7, 3, 7, -1, 10, 7, 1, 7, 3, -.004966394044458866, .4218223989009857, -.1790491938591003, 0, 2, 5, 6, 6, 8, -1, 7, 6, 2, 8, 3, -.0192076005041599, .4689489901065826, -.1437875032424927, 0, 2, 2, 6, 6, 11, -1, 4, 6, 2, 11, 3, -.0122226802632213, .3284207880496979, -.218021497130394, 0, 2, 8, 10, 12, 8, -1, 8, 14, 12, 4, 2, .0575486682355404, -.3676880896091461, .2435711026191711, 0, 2, 7, 17, 6, 3, -1, 9, 17, 2, 3, 3, -.00957940798252821, -.7224506735801697, .0636645630002022, 0, 2, 10, 9, 3, 3, -1, 11, 9, 1, 3, 3, -.002954574069008231, .358464390039444, -.1669632941484451, 0, 2, 8, 8, 3, 6, -1, 9, 8, 1, 6, 3, -.004201799165457487, .390948086977005, -.1204179003834724, 0, 2, 7, 0, 6, 5, -1, 9, 0, 2, 5, 3, -.0136249903589487, -.5876771807670593, .0884047299623489, 0, 2, 6, 17, 1, 3, -1, 6, 18, 1, 1, 3, 6285311246756464e-20, -.2634845972061157, .2141927927732468, 0, 2, 0, 18, 4, 2, -1, 0, 19, 4, 1, 2, -.0026782939676195383, -.7839016914367676, .0805269628763199, 0, 2, 4, 1, 11, 9, -1, 4, 4, 11, 3, 3, -.0705971792340279, .414692610502243, -.1398995965719223, 0, 2, 3, 1, 14, 9, -1, 3, 4, 14, 3, 3, .0920936465263367, -.1305518001317978, .5043578147888184, 0, 2, 0, 9, 6, 4, -1, 2, 9, 2, 4, 3, -.008800438605248928, .3660975098609924, -.1403664946556091, 0, 2, 18, 13, 1, 2, -1, 18, 14, 1, 1, 2, 750809776945971e-19, -.2970443964004517, .207029402256012, 0, 2, 13, 5, 3, 11, -1, 14, 5, 1, 11, 3, -.002987045096233487, .3561570048332214, -.1544596999883652, 0, 3, 0, 18, 8, 2, -1, 0, 18, 4, 1, 2, 4, 19, 4, 1, 2, -.002644150983542204, -.5435351729393005, .1029511019587517, -1.2905240058898926, 27, 0, 2, 5, 8, 12, 5, -1, 9, 8, 4, 5, 3, -.0478624701499939, .4152823984622955, -.3418582081794739, 0, 2, 4, 7, 11, 10, -1, 4, 12, 11, 5, 2, .087350532412529, -.3874978125095367, .2420420050621033, 0, 2, 14, 9, 6, 4, -1, 16, 9, 2, 4, 3, -.0168494991958141, .5308247804641724, -.1728291064500809, 0, 2, 0, 7, 6, 8, -1, 3, 7, 3, 8, 2, -.0288700293749571, .3584350943565369, -.2240259051322937, 0, 2, 0, 16, 3, 3, -1, 0, 17, 3, 1, 3, .00256793899461627, .1499049961566925, -.6560940742492676, 0, 2, 7, 11, 12, 1, -1, 11, 11, 4, 1, 3, -.0241166595369577, .5588967800140381, -.148102805018425, 0, 2, 4, 8, 9, 4, -1, 7, 8, 3, 4, 3, -.0328266583383083, .4646868109703064, -.1078552976250649, 0, 2, 5, 16, 6, 4, -1, 7, 16, 2, 4, 3, -.0152330603450537, -.7395442724227905, .056236881762743, 0, 2, 18, 17, 1, 3, -1, 18, 18, 1, 1, 3, -.0003020951116923243, -.4554882049560547, .0970698371529579, 0, 2, 18, 17, 1, 3, -1, 18, 18, 1, 1, 3, .0007536510820500553, .0951472967863083, -.5489501953125, 0, 3, 4, 9, 4, 10, -1, 4, 9, 2, 5, 2, 6, 14, 2, 5, 2, -.0106389503926039, .4091297090053558, -.1230840981006622, 0, 2, 4, 8, 6, 4, -1, 6, 8, 2, 4, 3, -.007521783001720905, .4028914868831635, -.1604878008365631, 0, 2, 10, 2, 2, 18, -1, 10, 8, 2, 6, 3, -.1067709997296333, .6175932288169861, -.0730911865830421, 0, 3, 0, 5, 8, 6, -1, 0, 5, 4, 3, 2, 4, 8, 4, 3, 2, .0162569191306829, -.1310368031263351, .3745365142822266, 0, 2, 6, 0, 6, 5, -1, 8, 0, 2, 5, 3, -.020679360255599, -.71402907371521, .0523900091648102, 0, 2, 18, 0, 2, 14, -1, 18, 7, 2, 7, 2, .0170523691922426, .1282286047935486, -.3108068108558655, 0, 2, 8, 18, 4, 2, -1, 10, 18, 2, 2, 2, -.0057122060097754, -.605565071105957, .0818847566843033, 0, 2, 1, 17, 6, 3, -1, 1, 18, 6, 1, 3, 20851430235779844e-21, -.2681298851966858, .1445384025573731, 0, 2, 11, 8, 3, 5, -1, 12, 8, 1, 5, 3, .007928443141281605, -.078795351088047, .5676258206367493, 0, 2, 11, 8, 3, 4, -1, 12, 8, 1, 4, 3, -.0025217379443347454, .3706862926483154, -.1362057030200958, 0, 2, 11, 0, 6, 5, -1, 13, 0, 2, 5, 3, -.0224261991679668, -.6870499849319458, .0510628595948219, 0, 2, 1, 7, 6, 7, -1, 3, 7, 2, 7, 3, -.007645144127309322, .2349222004413605, -.1790595948696137, 0, 2, 0, 13, 1, 3, -1, 0, 14, 1, 1, 3, -.0011175329564139247, -.5986905097961426, .0743244364857674, 0, 2, 3, 2, 9, 6, -1, 3, 4, 9, 2, 3, .0192127898335457, -.1570255011320114, .2973746955394745, 0, 2, 8, 6, 9, 2, -1, 8, 7, 9, 1, 2, .00562934298068285, -.0997690185904503, .4213027060031891, 0, 2, 0, 14, 3, 6, -1, 0, 16, 3, 2, 3, -.00956718623638153, -.6085879802703857, .0735062584280968, 0, 2, 1, 11, 6, 4, -1, 3, 11, 2, 4, 3, .0112179601565003, -.103208102285862, .4190984964370728, -1.160048007965088, 28, 0, 2, 6, 9, 9, 3, -1, 9, 9, 3, 3, 3, -.0174864400178194, .3130728006362915, -.3368118107318878, 0, 2, 6, 0, 9, 6, -1, 6, 2, 9, 2, 3, .0307146497070789, -.1876619011163712, .5378080010414124, 0, 2, 8, 5, 6, 6, -1, 8, 7, 6, 2, 3, -.0221887193620205, .3663788139820099, -.1612481027841568, 0, 2, 1, 12, 2, 1, -1, 2, 12, 1, 1, 2, -50700771680567414e-21, .2124571055173874, -.2844462096691132, 0, 2, 10, 10, 6, 2, -1, 12, 10, 2, 2, 3, -.007017042022198439, .3954311013221741, -.1317359060049057, 0, 2, 13, 8, 6, 6, -1, 15, 8, 2, 6, 3, -.00685636093840003, .3037385940551758, -.2065781950950623, 0, 2, 6, 16, 6, 4, -1, 8, 16, 2, 4, 3, -.0141292596235871, -.7650300860404968, .0982131883502007, 0, 2, 8, 0, 9, 9, -1, 8, 3, 9, 3, 3, -.047915481030941, .483073890209198, -.1300680935382843, 0, 2, 18, 17, 1, 3, -1, 18, 18, 1, 1, 3, 47032979637151584e-21, -.2521657049655914, .2438668012619019, 0, 2, 18, 17, 1, 3, -1, 18, 18, 1, 1, 3, .0010221180273219943, .0688576027750969, -.6586114168167114, 0, 2, 7, 10, 3, 3, -1, 8, 10, 1, 3, 3, -.002605610992759466, .4294202923774719, -.1302246004343033, 0, 3, 9, 14, 2, 2, -1, 9, 14, 1, 1, 2, 10, 15, 1, 1, 2, 5450534081319347e-20, -.1928862035274506, .2895849943161011, 0, 3, 9, 14, 2, 2, -1, 9, 14, 1, 1, 2, 10, 15, 1, 1, 2, -6672115705441684e-20, .3029071092605591, -.1985436975955963, 0, 2, 0, 8, 19, 12, -1, 0, 14, 19, 6, 2, .2628143131732941, -.2329394072294235, .2369246035814285, 0, 2, 7, 6, 9, 14, -1, 10, 6, 3, 14, 3, -.0235696695744991, .1940104067325592, -.2848461866378784, 0, 2, 13, 8, 3, 4, -1, 14, 8, 1, 4, 3, -.003912017215043306, .5537897944450378, -.0956656783819199, 0, 2, 4, 17, 1, 3, -1, 4, 18, 1, 1, 3, 5078879985376261e-20, -.239126592874527, .217994898557663, 0, 2, 4, 9, 6, 3, -1, 6, 9, 2, 3, 3, -.007873201742768288, .4069742858409882, -.1276804059743881, 0, 2, 2, 18, 5, 2, -1, 2, 19, 5, 1, 2, -.0016778609715402126, -.5774465799331665, .0973247885704041, 0, 3, 7, 8, 2, 2, -1, 7, 8, 1, 1, 2, 8, 9, 1, 1, 2, -.0002683243073988706, .2902188003063202, -.1683126986026764, 0, 3, 7, 8, 2, 2, -1, 7, 8, 1, 1, 2, 8, 9, 1, 1, 2, 7868718239478767e-20, -.1955157071352005, .2772096991539002, 0, 2, 5, 10, 13, 2, -1, 5, 11, 13, 1, 2, .0129535002633929, -.0968383178114891, .4032387137413025, 0, 2, 10, 8, 1, 9, -1, 10, 11, 1, 3, 3, -.0130439596250653, .4719856977462769, -.0892875492572784, 0, 3, 15, 8, 2, 12, -1, 15, 8, 1, 6, 2, 16, 14, 1, 6, 2, .0030261781066656113, -.1362338066101074, .3068627119064331, 0, 2, 4, 0, 3, 5, -1, 5, 0, 1, 5, 3, -.006043803878128529, -.779541015625, .0573163107037544, 0, 2, 12, 6, 3, 7, -1, 13, 6, 1, 7, 3, -.0022507249377667904, .3087705969810486, -.1500630974769592, 0, 2, 7, 16, 6, 4, -1, 9, 16, 2, 4, 3, .0158268101513386, .0645518898963928, -.7245556712150574, 0, 2, 9, 16, 2, 1, -1, 10, 16, 1, 1, 2, 6586450763279572e-20, -.1759884059429169, .2321038991212845, -1.2257250547409058, 36, 0, 2, 6, 10, 9, 2, -1, 9, 10, 3, 2, 3, -.0278548691421747, .4551844894886017, -.1809991002082825, 0, 2, 0, 6, 15, 14, -1, 0, 13, 15, 7, 2, .1289504021406174, -.5256553292274475, .1618890017271042, 0, 2, 9, 1, 5, 6, -1, 9, 3, 5, 2, 3, .0244031809270382, -.1497496068477631, .4235737919807434, 0, 2, 3, 9, 3, 4, -1, 4, 9, 1, 4, 3, -.0024458570405840874, .3294866979122162, -.1744769066572189, 0, 2, 5, 7, 3, 6, -1, 6, 7, 1, 6, 3, -.0035336529836058617, .4742664098739624, -.0736183598637581, 0, 2, 17, 16, 1, 2, -1, 17, 17, 1, 1, 2, 5135815081303008e-20, -.3042193055152893, .1563327014446259, 0, 2, 9, 8, 6, 12, -1, 11, 8, 2, 12, 3, -.0162256807088852, .2300218045711517, -.2035982012748718, 0, 2, 6, 10, 6, 1, -1, 8, 10, 2, 1, 3, -.004600700922310352, .4045926928520203, -.1348544061183929, 0, 2, 7, 17, 9, 3, -1, 10, 17, 3, 3, 3, -.0219289995729923, -.6872448921203613, .0806842669844627, 0, 2, 14, 18, 6, 2, -1, 14, 19, 6, 1, 2, -.002897121012210846, -.6961960792541504, .0485452190041542, 0, 2, 9, 5, 3, 14, -1, 10, 5, 1, 14, 3, -.0044074649922549725, .2516626119613648, -.1623664945363998, 0, 2, 8, 16, 9, 4, -1, 11, 16, 3, 4, 3, .0284371692687273, .0603942610323429, -.6674445867538452, 0, 2, 0, 0, 4, 14, -1, 0, 7, 4, 7, 2, .0832128822803497, .0643579214811325, -.5362604260444641, 0, 2, 8, 1, 6, 3, -1, 10, 1, 2, 3, 3, -.0124193299561739, -.708168625831604, .0575266107916832, 0, 2, 6, 8, 3, 4, -1, 7, 8, 1, 4, 3, -.004699259996414185, .5125433206558228, -.0873508006334305, 0, 2, 4, 8, 3, 4, -1, 5, 8, 1, 4, 3, -.0007802580948919058, .266876608133316, -.1796150952577591, 0, 2, 5, 1, 6, 5, -1, 7, 1, 2, 5, 3, -.0197243392467499, -.6756373047828674, .0729419067502022, 0, 2, 1, 18, 1, 2, -1, 1, 19, 1, 1, 2, .001026925048790872, .0539193190634251, -.5554018020629883, 0, 2, 7, 0, 6, 6, -1, 7, 2, 6, 2, 3, -.0259571895003319, .5636252760887146, -.0718983933329582, 0, 2, 0, 18, 4, 2, -1, 0, 19, 4, 1, 2, -.0012552699772641063, -.5034663081169128, .0896914526820183, 0, 2, 12, 3, 8, 12, -1, 12, 7, 8, 4, 3, -.0499705784022808, .1768511980772018, -.2230195999145508, 0, 2, 12, 9, 3, 4, -1, 13, 9, 1, 4, 3, -.002989961067214608, .391224205493927, -.1014975011348724, 0, 2, 12, 8, 3, 5, -1, 13, 8, 1, 5, 3, .004854684229940176, -.1177017986774445, .4219093918800354, 0, 2, 16, 0, 2, 1, -1, 17, 0, 1, 1, 2, .0001044886012095958, -.1733397990465164, .223444402217865, 0, 2, 5, 17, 1, 3, -1, 5, 18, 1, 1, 3, 5968926052446477e-20, -.2340963035821915, .1655824035406113, 0, 2, 10, 2, 3, 6, -1, 10, 4, 3, 2, 3, -.0134239196777344, .4302381873130798, -.0997236520051956, 0, 2, 4, 17, 2, 3, -1, 4, 18, 2, 1, 3, .002258199965581298, .0727209895849228, -.5750101804733276, 0, 2, 12, 7, 1, 9, -1, 12, 10, 1, 3, 3, -.0125462803989649, .3618457913398743, -.1145701035857201, 0, 2, 7, 6, 3, 9, -1, 8, 6, 1, 9, 3, -.002870576921850443, .2821053862571716, -.1236755028367043, 0, 2, 17, 13, 3, 6, -1, 17, 15, 3, 2, 3, .0197856407612562, .0478767491877079, -.806662380695343, 0, 2, 7, 7, 3, 8, -1, 8, 7, 1, 8, 3, .004758893046528101, -.1092538982629776, .3374697864055634, 0, 2, 5, 0, 3, 5, -1, 6, 0, 1, 5, 3, -.006997426971793175, -.8029593825340271, .0457067005336285, 0, 2, 4, 6, 9, 8, -1, 7, 6, 3, 8, 3, -.0130334803834558, .18680439889431, -.176889106631279, 0, 2, 2, 9, 3, 3, -1, 3, 9, 1, 3, 3, -.0013742579612880945, .2772547900676727, -.1280900985002518, 0, 2, 16, 18, 4, 2, -1, 16, 19, 4, 1, 2, .0027657810132950544, .0907589420676231, -.4259473979473114, 0, 2, 17, 10, 3, 10, -1, 17, 15, 3, 5, 2, .0002894184144679457, -.388163298368454, .089267797768116, -1.2863140106201172, 47, 0, 2, 8, 9, 6, 4, -1, 10, 9, 2, 4, 3, -.0144692296162248, .3750782907009125, -.2492828965187073, 0, 2, 5, 2, 10, 12, -1, 5, 6, 10, 4, 3, -.1331762969493866, .3016637861728668, -.2241407036781311, 0, 2, 6, 9, 6, 3, -1, 8, 9, 2, 3, 3, -.010132160037756, .3698559105396271, -.1785001009702683, 0, 2, 11, 7, 3, 7, -1, 12, 7, 1, 7, 3, -.007851118221879005, .4608676135540009, -.1293139010667801, 0, 2, 12, 8, 6, 4, -1, 14, 8, 2, 4, 3, -.0142958397045732, .4484142959117889, -.1022624000906944, 0, 2, 14, 8, 6, 5, -1, 16, 8, 2, 5, 3, -.005960694048553705, .279279887676239, -.1532382965087891, 0, 2, 12, 12, 2, 4, -1, 12, 14, 2, 2, 2, .010932769626379, -.1514174044132233, .3988964855670929, 0, 2, 3, 15, 1, 2, -1, 3, 16, 1, 1, 2, 50430990086169913e-21, -.2268157005310059, .2164438962936401, 0, 2, 12, 7, 3, 4, -1, 13, 7, 1, 4, 3, -.0058431681245565414, .4542014896869659, -.1258715987205505, 0, 2, 10, 0, 6, 6, -1, 12, 0, 2, 6, 3, -.0223462097346783, -.6269019246101379, .0824031233787537, 0, 2, 10, 6, 3, 8, -1, 11, 6, 1, 8, 3, -.00488366698846221, .2635925114154816, -.1468663066625595, 0, 2, 16, 17, 1, 2, -1, 16, 18, 1, 1, 2, 7550600275862962e-20, -.2450702041387558, .1667888015508652, 0, 2, 16, 16, 1, 3, -1, 16, 17, 1, 1, 3, -.0004902699729427695, -.426499605178833, .0899735614657402, 0, 2, 11, 11, 1, 2, -1, 11, 12, 1, 1, 2, .0014861579984426498, -.1204025000333786, .3009765148162842, 0, 2, 3, 7, 6, 9, -1, 5, 7, 2, 9, 3, -.0119883399456739, .278524786233902, -.122443400323391, 0, 2, 4, 18, 9, 1, -1, 7, 18, 3, 1, 3, .0105022396892309, .0404527597129345, -.7405040860176086, 0, 2, 0, 11, 4, 9, -1, 0, 14, 4, 3, 3, -.0309630092233419, -.6284269094467163, .048013761639595, 0, 2, 9, 17, 6, 3, -1, 11, 17, 2, 3, 3, .0114145204424858, .0394052118062973, -.7167412042617798, 0, 2, 7, 8, 6, 12, -1, 9, 8, 2, 12, 3, -.0123370001092553, .1994132995605469, -.1927430033683777, 0, 2, 6, 8, 3, 4, -1, 7, 8, 1, 4, 3, -.005994226783514023, .5131816267967224, -.0616580583155155, 0, 2, 3, 17, 1, 3, -1, 3, 18, 1, 1, 3, -.0011923230485990644, -.72605299949646, .0506527200341225, 0, 2, 11, 9, 6, 4, -1, 13, 9, 2, 4, 3, -.0074582789093256, .2960307896137238, -.1175478994846344, 0, 2, 6, 1, 3, 2, -1, 7, 1, 1, 2, 3, .0027877509128302336, .0450687110424042, -.6953541040420532, 0, 2, 1, 0, 2, 1, -1, 2, 0, 1, 1, 2, -.0002250320976600051, .200472503900528, -.1577524989843369, 0, 3, 1, 0, 2, 14, -1, 1, 0, 1, 7, 2, 2, 7, 1, 7, 2, -.005036788992583752, .292998194694519, -.1170049980282784, 0, 2, 5, 5, 11, 8, -1, 5, 9, 11, 4, 2, .0747421607375145, -.1139231994748116, .3025662004947662, 0, 2, 9, 3, 5, 6, -1, 9, 5, 5, 2, 3, .0202555190771818, -.1051589027047157, .4067046046257019, 0, 2, 7, 9, 5, 10, -1, 7, 14, 5, 5, 2, .0442145094275475, -.2763164043426514, .1236386969685555, 0, 2, 15, 10, 2, 2, -1, 16, 10, 1, 2, 2, -.0008725955849513412, .2435503005981445, -.1330094933509827, 0, 2, 0, 18, 8, 2, -1, 0, 19, 8, 1, 2, -.0024453739169985056, -.5386617183685303, .062510646879673, 0, 2, 7, 17, 1, 3, -1, 7, 18, 1, 1, 3, 827253534225747e-19, -.2077220976352692, .1627043932676315, 0, 2, 7, 2, 11, 6, -1, 7, 4, 11, 2, 3, -.036627110093832, .3656840920448303, -.0903302803635597, 0, 2, 8, 3, 9, 3, -1, 8, 4, 9, 1, 3, .0030996399000287056, -.1318302005529404, .2535429894924164, 0, 2, 0, 9, 2, 2, -1, 0, 10, 2, 1, 2, -.0024709280114620924, -.5685349702835083, .0535054318606853, 0, 2, 0, 5, 3, 6, -1, 0, 7, 3, 2, 3, -.0141146704554558, -.4859901070594788, .0584852509200573, 0, 3, 6, 7, 2, 2, -1, 6, 7, 1, 1, 2, 7, 8, 1, 1, 2, .0008453726186417043, -.0800936371088028, .4026564955711365, 0, 2, 7, 6, 3, 6, -1, 8, 6, 1, 6, 3, -.007109863217920065, .4470323920249939, -.0629474371671677, 0, 2, 12, 1, 6, 4, -1, 14, 1, 2, 4, 3, -.0191259607672691, -.6642286777496338, .0498227700591087, 0, 2, 9, 11, 6, 8, -1, 11, 11, 2, 8, 3, -.005077301058918238, .1737940013408661, -.168505996465683, 0, 2, 17, 15, 3, 3, -1, 17, 16, 3, 1, 3, -.002919828984886408, -.6011028289794922, .0574279390275478, 0, 2, 6, 6, 3, 9, -1, 6, 9, 3, 3, 3, -.0249021500349045, .233979806303978, -.1181845963001251, 0, 3, 0, 5, 8, 6, -1, 0, 5, 4, 3, 2, 4, 8, 4, 3, 2, .02014777995646, -.0894598215818405, .3602440059185028, 0, 2, 0, 6, 1, 3, -1, 0, 7, 1, 1, 3, .001759764039888978, .0494584403932095, -.6310262084007263, 0, 2, 17, 0, 2, 6, -1, 18, 0, 1, 6, 2, .0013812039978802204, -.1521805971860886, .1897173970937729, 0, 2, 10, 17, 6, 3, -1, 12, 17, 2, 3, 3, -.0109045403078198, -.5809738039970398, .0448627285659313, 0, 3, 13, 15, 2, 2, -1, 13, 15, 1, 1, 2, 14, 16, 1, 1, 2, 7515717879869044e-20, -.1377734988927841, .1954316049814224, 0, 2, 4, 0, 12, 3, -1, 4, 1, 12, 1, 3, .003864977043122053, -.1030222997069359, .2537496984004974, -1.1189440488815308, 48, 0, 2, 5, 3, 10, 9, -1, 5, 6, 10, 3, 3, -.102158896625042, .4168125987052918, -.1665562987327576, 0, 2, 7, 7, 9, 7, -1, 10, 7, 3, 7, 3, -.051939819008112, .3302395045757294, -.2071571052074432, 0, 2, 5, 8, 9, 6, -1, 8, 8, 3, 6, 3, -.0427177809178829, .2609373033046722, -.1601389050483704, 0, 2, 0, 16, 6, 2, -1, 0, 17, 6, 1, 2, .00043890418601222336, -.3475053012371063, .1391891986131668, 0, 2, 12, 6, 7, 14, -1, 12, 13, 7, 7, 2, .0242643896490335, -.4255205988883972, .1357838064432144, 0, 2, 13, 7, 6, 8, -1, 15, 7, 2, 8, 3, -.0238205995410681, .3174980878829956, -.1665204018354416, 0, 2, 2, 10, 6, 3, -1, 4, 10, 2, 3, 3, -.007051818072795868, .3094717860221863, -.1333830058574677, 0, 2, 18, 17, 1, 3, -1, 18, 18, 1, 1, 3, -.0006851715734228492, -.6008226275444031, .0877470001578331, 0, 2, 7, 1, 6, 2, -1, 7, 2, 6, 1, 2, .0053705149330198765, -.1231144964694977, .3833355009555817, 0, 2, 6, 0, 6, 4, -1, 6, 2, 6, 2, 2, -.0134035395458341, .3387736976146698, -.1014048978686333, 0, 2, 8, 18, 6, 2, -1, 10, 18, 2, 2, 3, -.006685636006295681, -.6119359731674194, .0477402210235596, 0, 2, 7, 6, 5, 2, -1, 7, 7, 5, 1, 2, -.0042887418530881405, .2527579069137573, -.1443451046943665, 0, 2, 6, 7, 3, 6, -1, 7, 7, 1, 6, 3, -.0108767496421933, .5477573275566101, -.0594554804265499, 0, 3, 18, 18, 2, 2, -1, 18, 18, 1, 1, 2, 19, 19, 1, 1, 2, .0003788264002650976, .0834103003144264, -.4422636926174164, 0, 2, 16, 8, 3, 7, -1, 17, 8, 1, 7, 3, -.002455014968290925, .2333099991083145, -.1396448016166687, 0, 2, 0, 16, 2, 3, -1, 0, 17, 2, 1, 3, .0012721839593723416, .0604802891612053, -.4945608973503113, 0, 2, 5, 19, 6, 1, -1, 7, 19, 2, 1, 3, -.004893315955996513, -.6683326959609985, .0462184995412827, 0, 2, 9, 5, 6, 6, -1, 9, 7, 6, 2, 3, .0264499895274639, -.0732353627681732, .4442596137523651, 0, 2, 0, 10, 2, 4, -1, 0, 12, 2, 2, 2, -.003370607038959861, -.4246433973312378, .0686765611171722, 0, 2, 0, 9, 4, 3, -1, 2, 9, 2, 3, 2, -.0029559480026364326, .1621803939342499, -.1822299957275391, 0, 2, 1, 10, 6, 9, -1, 3, 10, 2, 9, 3, .0306199099868536, -.0586433410644531, .532636284828186, 0, 2, 9, 0, 6, 2, -1, 11, 0, 2, 2, 3, -.009576590731739998, -.6056268215179443, .0533459894359112, 0, 2, 14, 1, 2, 1, -1, 15, 1, 1, 1, 2, 6637249316554517e-20, -.1668083965778351, .1928416043519974, 0, 2, 0, 8, 1, 4, -1, 0, 10, 1, 2, 2, .005097595043480396, .0441195107996464, -.574588418006897, 0, 3, 15, 6, 2, 2, -1, 15, 6, 1, 1, 2, 16, 7, 1, 1, 2, .0003711271856445819, -.1108639985322952, .2310539036989212, 0, 2, 7, 5, 3, 6, -1, 8, 5, 1, 6, 3, -.008660758845508099, .4045628905296326, -.062446091324091, 0, 2, 19, 17, 1, 3, -1, 19, 18, 1, 1, 3, .0008748915861360729, .0648751482367516, -.4487104117870331, 0, 2, 7, 10, 3, 1, -1, 8, 10, 1, 1, 3, .0011120870476588607, -.09386146068573, .3045391142368317, 0, 2, 12, 1, 6, 6, -1, 14, 1, 2, 6, 3, -.0238378196954727, -.5888742804527283, .0466594211757183, 0, 2, 15, 5, 2, 1, -1, 16, 5, 1, 1, 2, .00022272899514064193, -.1489859968423843, .1770195066928864, 0, 2, 8, 2, 7, 4, -1, 8, 4, 7, 2, 2, .0244674701243639, -.0557896010577679, .4920830130577087, 0, 2, 4, 0, 14, 15, -1, 4, 5, 14, 5, 3, -.1423932015895844, .1519200056791306, -.1877889931201935, 0, 2, 7, 8, 6, 6, -1, 9, 8, 2, 6, 3, -.0201231203973293, .2178010046482086, -.1208190023899078, 0, 2, 11, 17, 1, 3, -1, 11, 18, 1, 1, 3, .00011513679783092812, -.1685658991336823, .1645192950963974, 0, 3, 12, 16, 2, 4, -1, 12, 16, 1, 2, 2, 13, 18, 1, 2, 2, -.0027556740678846836, -.6944203972816467, .039449468255043, 0, 2, 10, 13, 2, 1, -1, 11, 13, 1, 1, 2, -7584391278214753e-20, .1894136965274811, -.151838406920433, 0, 2, 11, 8, 3, 3, -1, 12, 8, 1, 3, 3, -.0070697711780667305, .4706459939479828, -.0579276196658611, 0, 2, 2, 0, 6, 8, -1, 4, 0, 2, 8, 3, -.0373931787908077, -.7589244842529297, .0341160483658314, 0, 3, 3, 5, 6, 6, -1, 3, 5, 3, 3, 2, 6, 8, 3, 3, 2, -.0159956105053425, .3067046999931335, -.0875255763530731, 0, 2, 10, 8, 3, 3, -1, 11, 8, 1, 3, 3, -.003118399064987898, .2619537115097046, -.0912148877978325, 0, 2, 5, 17, 4, 2, -1, 5, 18, 4, 1, 2, .001065136049874127, -.1742756068706513, .1527764052152634, 0, 2, 8, 16, 5, 2, -1, 8, 17, 5, 1, 2, -.0016029420075938106, .3561263084411621, -.0766299962997437, 0, 2, 0, 4, 3, 3, -1, 0, 5, 3, 1, 3, .004361990839242935, .04935697093606, -.5922877192497253, 0, 2, 6, 3, 6, 2, -1, 8, 3, 2, 2, 3, -.0107799097895622, -.6392217874526978, .0332045406103134, 0, 2, 4, 4, 9, 3, -1, 7, 4, 3, 3, 3, -.004359086975455284, .1610738933086395, -.1522132009267807, 0, 2, 0, 13, 1, 4, -1, 0, 15, 1, 2, 2, .007459606975317001, .0331729613244534, -.7500774264335632, 0, 2, 0, 17, 8, 3, -1, 0, 18, 8, 1, 3, .008138544857501984, .0263252798467875, -.7173116207122803, 0, 2, 6, 1, 11, 6, -1, 6, 3, 11, 2, 3, -.0333384908735752, .3353661000728607, -.070803590118885, -1.1418989896774292, 55, 0, 2, 4, 10, 6, 2, -1, 6, 10, 2, 2, 3, .0195539798587561, -.1043972000479698, .5312895178794861, 0, 2, 10, 8, 1, 12, -1, 10, 14, 1, 6, 2, .0221229195594788, -.2474727034568787, .2084725052118301, 0, 2, 5, 8, 3, 4, -1, 6, 8, 1, 4, 3, -.004182938951998949, .3828943967819214, -.1471157968044281, 0, 2, 0, 17, 1, 3, -1, 0, 18, 1, 1, 3, -.0008638172876089811, -.6263288855552673, .1199325993657112, 0, 2, 0, 17, 1, 3, -1, 0, 18, 1, 1, 3, .0007995861233212054, .0925734713673592, -.5516883134841919, 0, 2, 13, 8, 3, 4, -1, 14, 8, 1, 4, 3, .009152757003903389, -.0729298070073128, .5551251173019409, 0, 2, 1, 5, 5, 4, -1, 1, 7, 5, 2, 2, -.003938868176192045, .2019603997468948, -.2091203927993774, 0, 2, 18, 14, 1, 2, -1, 18, 15, 1, 1, 2, .00014613410166930407, -.278618186712265, .1381741017103195, 0, 2, 13, 8, 2, 4, -1, 14, 8, 1, 4, 2, -.0031691689509898424, .3668589890003204, -.0763082429766655, 0, 2, 10, 6, 6, 8, -1, 12, 6, 2, 8, 3, -.0221893899142742, .39096599817276, -.1097154021263123, 0, 2, 8, 6, 6, 10, -1, 10, 6, 2, 10, 3, -.007452360820025206, .1283859014511108, -.2415986955165863, 0, 2, 17, 16, 1, 3, -1, 17, 17, 1, 1, 3, .000779970025178045, .0719780698418617, -.4397650063037872, 0, 2, 1, 7, 2, 10, -1, 2, 7, 1, 10, 2, -.004678363911807537, .2156984955072403, -.1420592069625855, 0, 2, 5, 9, 6, 3, -1, 7, 9, 2, 3, 3, -.0151886399835348, .364587813615799, -.08267592638731, 0, 2, 0, 8, 5, 12, -1, 0, 14, 5, 6, 2, .0050619798712432384, -.3438040912151337, .0920682325959206, 0, 2, 0, 11, 1, 3, -1, 0, 12, 1, 1, 3, -.0017351920250803232, -.6172549724578857, .0492144785821438, 0, 2, 6, 16, 6, 4, -1, 8, 16, 2, 4, 3, -.012423450127244, -.5855895280838013, .0461126007139683, 0, 2, 0, 6, 2, 6, -1, 0, 8, 2, 2, 3, -.0130314296111465, -.5971078872680664, .0406724587082863, 0, 2, 11, 18, 2, 1, -1, 12, 18, 1, 1, 2, -.0012369629694148898, -.6833416819572449, .0331561788916588, 0, 2, 5, 1, 9, 2, -1, 5, 2, 9, 1, 2, .006102210842072964, -.0947292372584343, .3010224103927612, 0, 2, 0, 0, 1, 2, -1, 0, 1, 1, 1, 2, .0006695284973829985, .0818168669939041, -.351960301399231, 0, 2, 15, 9, 3, 3, -1, 16, 9, 1, 3, 3, -.001797058037482202, .2371897995471954, -.1176870986819267, 0, 2, 18, 16, 1, 3, -1, 18, 17, 1, 1, 3, -.0007107452838681638, -.4476378858089447, .0576824806630611, 0, 2, 11, 10, 6, 1, -1, 13, 10, 2, 1, 3, -.005912647116929293, .4342541098594666, -.0668685734272003, 0, 2, 1, 3, 4, 4, -1, 3, 3, 2, 4, 2, -.003313214983791113, .181500107049942, -.1418032050132752, 0, 2, 11, 2, 1, 18, -1, 11, 8, 1, 6, 3, -.0608146600425243, .4722171127796173, -.0614106394350529, 0, 2, 9, 1, 5, 12, -1, 9, 5, 5, 4, 3, -.0967141836881638, .2768316864967346, -.0944900363683701, 0, 2, 12, 0, 8, 1, -1, 16, 0, 4, 1, 2, .003907355014234781, -.1227853000164032, .2105740010738373, 0, 2, 8, 6, 3, 10, -1, 9, 6, 1, 10, 3, -.009043186902999878, .3564156889915466, -.0778062269091606, 0, 2, 19, 2, 1, 6, -1, 19, 4, 1, 2, 3, -.004880003165453672, -.4103479087352753, .0696943774819374, 0, 2, 18, 6, 2, 2, -1, 18, 7, 2, 1, 2, -.00435474282130599, -.7301788926124573, .0366551503539085, 0, 2, 7, 7, 3, 4, -1, 8, 7, 1, 4, 3, -.009650062769651413, .5518112778663635, -.0531680807471275, 0, 2, 5, 0, 6, 5, -1, 7, 0, 2, 5, 3, -.0173973105847836, -.5708423256874084, .0502140894532204, 0, 2, 0, 3, 7, 3, -1, 0, 4, 7, 1, 3, -.006830432917922735, -.4618028104305267, .0502026900649071, 0, 2, 1, 6, 2, 1, -1, 2, 6, 1, 1, 2, .00033255619928240776, -.0953627303242683, .2598375976085663, 0, 3, 4, 8, 2, 10, -1, 4, 8, 1, 5, 2, 5, 13, 1, 5, 2, -.0023100529797375202, .2287247031927109, -.1053353026509285, 0, 3, 2, 18, 18, 2, -1, 2, 18, 9, 1, 2, 11, 19, 9, 1, 2, -.0075426651164889336, -.5699051022529602, .0488634593784809, 0, 3, 2, 7, 4, 4, -1, 2, 7, 2, 2, 2, 4, 9, 2, 2, 2, -.0052723060362041, .3514518141746521, -.0823901072144508, 0, 2, 17, 3, 3, 4, -1, 18, 3, 1, 4, 3, -.004857896827161312, -.6041762232780457, .0445394404232502, 0, 3, 16, 9, 2, 8, -1, 16, 9, 1, 4, 2, 17, 13, 1, 4, 2, .001586731057614088, -.1034090965986252, .2328201979398727, 0, 2, 15, 7, 1, 6, -1, 15, 9, 1, 2, 3, -.004742781165987253, .284902811050415, -.0980904996395111, 0, 2, 14, 2, 2, 2, -1, 14, 3, 2, 1, 2, -.0013515240279957652, .2309643030166626, -.113618403673172, 0, 2, 17, 0, 2, 3, -1, 17, 1, 2, 1, 3, .0022526069078594446, .0644783228635788, -.4220589101314545, 0, 3, 16, 18, 2, 2, -1, 16, 18, 1, 1, 2, 17, 19, 1, 1, 2, -.0003803865984082222, -.3807620108127594, .0600432902574539, 0, 2, 10, 4, 4, 3, -1, 10, 5, 4, 1, 3, .004904392175376415, -.076104998588562, .3323217034339905, 0, 2, 0, 2, 8, 6, -1, 4, 2, 4, 6, 2, -.009096967056393623, .1428779065608978, -.1688780039548874, 0, 2, 7, 14, 6, 6, -1, 7, 16, 6, 2, 3, -.0069317929446697235, .2725540995597839, -.0928795635700226, 0, 2, 11, 15, 2, 2, -1, 11, 16, 2, 1, 2, .0011471060570329428, -.1527305990457535, .1970240026712418, 0, 2, 7, 1, 9, 4, -1, 10, 1, 3, 4, 3, -.0376628898084164, -.5932043790817261, .0407386012375355, 0, 2, 9, 7, 3, 7, -1, 10, 7, 1, 7, 3, -.006816557142883539, .2549408972263336, -.0940819606184959, 0, 3, 6, 17, 2, 2, -1, 6, 17, 1, 1, 2, 7, 18, 1, 1, 2, .0006620556232519448, .0467957183718681, -.4845437109470367, 0, 2, 4, 6, 3, 9, -1, 5, 6, 1, 9, 3, -.004220255184918642, .2468214929103851, -.0946739763021469, 0, 2, 0, 10, 19, 10, -1, 0, 15, 19, 5, 2, -.0689865127205849, -.6651480197906494, .0359263904392719, 0, 2, 5, 17, 6, 1, -1, 7, 17, 2, 1, 3, .006170760840177536, .0258333198726177, -.7268627285957336, 0, 2, 0, 12, 6, 3, -1, 3, 12, 3, 3, 2, .0105362497270107, -.0818289965391159, .2976079881191254, -1.1255199909210205, 32, 0, 2, 2, 5, 18, 5, -1, 8, 5, 6, 5, 3, -.0627587288618088, .2789908051490784, -.2965610921382904, 0, 2, 1, 15, 6, 4, -1, 1, 17, 6, 2, 2, .003451647935435176, -.3463588058948517, .2090384066104889, 0, 2, 14, 10, 6, 6, -1, 16, 10, 2, 6, 3, -.007869948633015156, .2414488941431046, -.1920557022094727, 0, 2, 0, 14, 4, 3, -1, 0, 15, 4, 1, 3, -.0034624869003891945, -.5915178060531616, .1248644962906838, 0, 2, 1, 7, 6, 11, -1, 3, 7, 2, 11, 3, -.009481876157224178, .1839154064655304, -.2485826015472412, 0, 2, 13, 17, 7, 2, -1, 13, 18, 7, 1, 2, .00023226840130519122, -.3304725885391235, .1099926009774208, 0, 2, 0, 14, 2, 3, -1, 0, 15, 2, 1, 3, .0018101120367646217, .0987440124154091, -.4963478147983551, 0, 2, 0, 0, 6, 2, -1, 3, 0, 3, 2, 2, -.005442243069410324, .2934441864490509, -.1309475004673004, 0, 2, 0, 1, 6, 3, -1, 3, 1, 3, 3, 2, .007414812222123146, -.1476269960403442, .3327716886997223, 0, 2, 0, 8, 2, 6, -1, 0, 10, 2, 2, 3, -.0155651401728392, -.6840490102767944, .0998726934194565, 0, 3, 1, 2, 6, 14, -1, 1, 2, 3, 7, 2, 4, 9, 3, 7, 2, .0287205204367638, -.148332804441452, .3090257942676544, 0, 3, 17, 5, 2, 2, -1, 17, 5, 1, 1, 2, 18, 6, 1, 1, 2, 9668739221524447e-20, -.1743104010820389, .2140295952558518, 0, 2, 11, 10, 9, 4, -1, 14, 10, 3, 4, 3, .0523710586130619, -.0701568573713303, .4922299087047577, 0, 2, 2, 9, 12, 4, -1, 6, 9, 4, 4, 3, -.0864856913685799, .5075724720954895, -.0752942115068436, 0, 2, 7, 10, 12, 2, -1, 11, 10, 4, 2, 3, -.0421698689460754, .4568096101284027, -.0902199000120163, 0, 2, 2, 13, 1, 2, -1, 2, 14, 1, 1, 2, 45369830331765115e-21, -.2653827965259552, .1618953943252564, 0, 2, 16, 7, 4, 3, -1, 16, 8, 4, 1, 3, .0052918000146746635, .0748901516199112, -.540546715259552, 0, 2, 19, 16, 1, 3, -1, 19, 17, 1, 1, 3, -.0007551165181212127, -.4926199018955231, .0587239488959312, 0, 2, 18, 11, 1, 2, -1, 18, 12, 1, 1, 2, 7510813884437084e-20, -.2143210023641586, .1407776027917862, 0, 3, 12, 7, 8, 2, -1, 12, 7, 4, 1, 2, 16, 8, 4, 1, 2, .004998120944947004, -.0905473381280899, .3571606874465942, 0, 2, 14, 9, 2, 4, -1, 15, 9, 1, 4, 2, -.0014929979806765914, .2562345862388611, -.1422906965017319, 0, 3, 14, 2, 6, 4, -1, 14, 2, 3, 2, 2, 17, 4, 3, 2, 2, .0027239411137998104, -.1564925014972687, .2108871042728424, 0, 2, 14, 0, 6, 1, -1, 17, 0, 3, 1, 2, .002221832051873207, -.1507298946380615, .2680186927318573, 0, 2, 3, 12, 2, 1, -1, 4, 12, 1, 1, 2, -.0007399307214654982, .2954699099063873, -.1069239005446434, 0, 2, 17, 2, 3, 1, -1, 18, 2, 1, 1, 3, .0020113459322601557, .0506143495440483, -.7168337106704712, 0, 2, 1, 16, 18, 2, -1, 7, 16, 6, 2, 3, .0114528704434633, -.1271906942129135, .241527795791626, 0, 2, 2, 19, 8, 1, -1, 6, 19, 4, 1, 2, -.0010782170575112104, .2481300979852676, -.1346119940280914, 0, 2, 1, 17, 4, 3, -1, 1, 18, 4, 1, 3, .00334176910109818, .0535783097147942, -.5227416753768921, 0, 2, 19, 13, 1, 2, -1, 19, 14, 1, 1, 2, 6939865124877542e-20, -.2169874012470245, .1281217932701111, 0, 3, 9, 16, 10, 4, -1, 9, 16, 5, 2, 2, 14, 18, 5, 2, 2, -.0040982551872730255, .2440188974142075, -.1157058998942375, 0, 3, 12, 9, 2, 4, -1, 12, 9, 1, 2, 2, 13, 11, 1, 2, 2, -.0016289720078930259, .2826147079467773, -.1065946966409683, 0, 2, 19, 11, 1, 9, -1, 19, 14, 1, 3, 3, .0139848599210382, .0427158996462822, -.7364631295204163, -1.1729990243911743, 30, 0, 2, 6, 6, 14, 14, -1, 6, 13, 14, 7, 2, .164165198802948, -.4896030128002167, .1760770976543427, 0, 2, 2, 17, 4, 2, -1, 2, 18, 4, 1, 2, .0008341306238435209, -.2822043001651764, .2419957965612412, 0, 2, 0, 2, 1, 3, -1, 0, 3, 1, 1, 3, -.0017193210078403354, -.714858889579773, .0861622169613838, 0, 2, 0, 12, 1, 3, -1, 0, 13, 1, 1, 3, -.001565495040267706, -.7297238111495972, .0940706729888916, 0, 2, 15, 15, 4, 4, -1, 15, 17, 4, 2, 2, .0019124479731544852, -.3118715882301331, .1814339011907578, 0, 2, 2, 5, 18, 7, -1, 8, 5, 6, 7, 3, -.1351236999034882, .2957729995250702, -.2217925041913986, 0, 2, 1, 16, 5, 3, -1, 1, 17, 5, 1, 3, -.004030054900795221, -.6659513711929321, .0854310169816017, 0, 2, 0, 4, 2, 3, -1, 0, 5, 2, 1, 3, -.002864046022295952, -.6208636164665222, .0531060211360455, 0, 2, 0, 6, 2, 6, -1, 1, 6, 1, 6, 2, -.0014065420255064964, .2234628945589066, -.2021100968122482, 0, 2, 16, 14, 4, 3, -1, 16, 15, 4, 1, 3, -.0035820449702441692, -.5403040051460266, .0682136192917824, 0, 3, 0, 0, 10, 6, -1, 0, 0, 5, 3, 2, 5, 3, 5, 3, 2, .04154447093606, -.0652158409357071, .6210923194885254, 0, 2, 2, 2, 3, 6, -1, 3, 2, 1, 6, 3, -.009170955047011375, -.75553297996521, .0526404492557049, 0, 2, 2, 0, 3, 10, -1, 3, 0, 1, 10, 3, .006155273877084255, .0909394025802612, -.4424613118171692, 0, 2, 5, 5, 2, 2, -1, 5, 6, 2, 1, 2, -.0010043520014733076, .242923304438591, -.1866979002952576, 0, 2, 12, 6, 4, 4, -1, 12, 8, 4, 2, 2, .0115198297426105, -.1176315024495125, .3672345876693726, 0, 2, 13, 5, 7, 3, -1, 13, 6, 7, 1, 3, -.008904073387384415, -.4893133044242859, .1089702025055885, 0, 2, 10, 13, 1, 2, -1, 10, 14, 1, 1, 2, .0005397367058321834, -.2185039967298508, .1848998963832855, 0, 2, 16, 16, 4, 2, -1, 18, 16, 2, 2, 2, .0013727260520681739, -.1507291048765183, .2917312979698181, 0, 2, 16, 12, 4, 7, -1, 18, 12, 2, 7, 2, -.0108073903247714, .4289745092391968, -.1028013974428177, 0, 2, 16, 17, 1, 3, -1, 16, 18, 1, 1, 3, .0012670770520344377, .0741921588778496, -.6420825123786926, 0, 2, 19, 9, 1, 3, -1, 19, 10, 1, 1, 3, .002299112966284156, .0471002794802189, -.723352313041687, 0, 2, 18, 7, 2, 6, -1, 19, 7, 1, 6, 2, .002718751085922122, -.1708686947822571, .235135093331337, 0, 2, 8, 1, 3, 4, -1, 9, 1, 1, 4, 3, -.006661918014287949, -.7897542715072632, .0450846701860428, 0, 2, 14, 0, 6, 9, -1, 16, 0, 2, 9, 3, -.0482666492462158, -.6957991719245911, .0419760793447495, 0, 2, 4, 2, 10, 2, -1, 9, 2, 5, 2, 2, .0152146900072694, -.1081828027963638, .3646062016487122, 0, 3, 2, 12, 8, 4, -1, 2, 12, 4, 2, 2, 6, 14, 4, 2, 2, -.006008013151586056, .309709906578064, -.1135921031236649, 0, 2, 0, 4, 7, 3, -1, 0, 5, 7, 1, 3, .006612715777009726, .0806653425097466, -.4665853083133698, 0, 2, 14, 14, 3, 3, -1, 15, 14, 1, 3, 3, -.007960701361298561, -.8720194101333618, .0367745906114578, 0, 2, 0, 3, 4, 3, -1, 2, 3, 2, 3, 2, .003884719917550683, -.11666289716959, .3307026922702789, 0, 2, 1, 0, 2, 7, -1, 2, 0, 1, 7, 2, -.001098881009966135, .2387257069349289, -.1765675991773605, -1.036829948425293, 44, 0, 2, 15, 16, 4, 4, -1, 15, 18, 4, 2, 2, .0035903379321098328, -.2368807941675186, .2463164031505585, 0, 2, 5, 8, 12, 4, -1, 5, 10, 12, 2, 2, .006481593009084463, -.3137362003326416, .1867575943470001, 0, 2, 3, 17, 1, 2, -1, 3, 18, 1, 1, 2, 7304840255528688e-20, -.2764435112476349, .1649623960256577, 0, 2, 6, 1, 3, 4, -1, 7, 1, 1, 4, 3, -.00385146401822567, -.5601450800895691, .1129473969340324, 0, 2, 6, 2, 3, 4, -1, 7, 2, 1, 4, 3, .003858821000903845, .0398489981889725, -.5807185769081116, 0, 2, 6, 8, 9, 12, -1, 9, 8, 3, 12, 3, -.0246512200683355, .1675501018762589, -.2534367144107819, 0, 2, 8, 1, 8, 6, -1, 8, 3, 8, 2, 3, .0472455210983753, -.1066208034753799, .3945198059082031, 0, 2, 14, 2, 6, 3, -1, 17, 2, 3, 3, 2, .00659646512940526, -.1774425059556961, .2728019058704376, 0, 2, 0, 6, 1, 3, -1, 0, 7, 1, 1, 3, -.0013177490327507257, -.5427265167236328, .0486065894365311, 0, 2, 10, 0, 10, 2, -1, 15, 0, 5, 2, 2, -.005026170983910561, .2439424991607666, -.1314364969730377, 0, 2, 11, 0, 3, 2, -1, 12, 0, 1, 2, 3, .003463276894763112, .0690493434667587, -.7033624053001404, 0, 2, 3, 19, 10, 1, -1, 8, 19, 5, 1, 2, .0021692588925361633, -.1328946053981781, .2209852933883667, 0, 2, 0, 4, 7, 16, -1, 0, 12, 7, 8, 2, .0293958708643913, -.2853052020072937, .1354399025440216, 0, 2, 2, 16, 1, 3, -1, 2, 17, 1, 1, 3, -.0009618144831620157, -.580413818359375, .0374506488442421, 0, 2, 7, 8, 12, 6, -1, 11, 8, 4, 6, 3, -.1082099974155426, .3946728110313416, -.078655943274498, 0, 2, 14, 9, 6, 7, -1, 16, 9, 2, 7, 3, -.0180248692631722, .2735562920570374, -.1341529935598373, 0, 2, 12, 17, 6, 1, -1, 14, 17, 2, 1, 3, .006250984035432339, .023388059809804, -.8008859157562256, 0, 2, 16, 1, 3, 1, -1, 17, 1, 1, 1, 3, -.0016088379779830575, -.5676252245903015, .0412156693637371, 0, 3, 0, 17, 8, 2, -1, 0, 17, 4, 1, 2, 4, 18, 4, 1, 2, .0007756475242786109, -.1489126980304718, .1908618062734604, 0, 2, 17, 0, 2, 1, -1, 18, 0, 1, 1, 2, 8712233830010518e-20, -.155575305223465, .194282203912735, 0, 2, 4, 15, 6, 5, -1, 6, 15, 2, 5, 3, -.0207553207874298, -.6300653219223022, .0361343808472157, 0, 2, 7, 2, 8, 2, -1, 7, 3, 8, 1, 2, -.0062931738793849945, .2560924887657166, -.1058826968073845, 0, 2, 4, 1, 8, 4, -1, 4, 3, 8, 2, 2, .0108441496267915, -.1012485027313232, .3032212853431702, 0, 2, 5, 19, 2, 1, -1, 6, 19, 1, 1, 2, -6375277735060081e-20, .1911157965660095, -.1384923011064529, 0, 2, 5, 19, 2, 1, -1, 6, 19, 1, 1, 2, 6648096314165741e-20, -.1520525068044663, .2170630991458893, 0, 2, 16, 17, 1, 3, -1, 16, 18, 1, 1, 3, .0013560829684138298, .0494317896664143, -.6427984237670898, 0, 2, 0, 11, 2, 3, -1, 1, 11, 1, 3, 2, -.0009066255879588425, .1798201054334641, -.1404460966587067, 0, 2, 0, 19, 4, 1, -1, 2, 19, 2, 1, 2, .0010473709553480148, -.1093354970216751, .242659404873848, 0, 2, 0, 18, 4, 2, -1, 2, 18, 2, 2, 2, -.0010243969736620784, .2716268002986908, -.1182091981172562, 0, 2, 2, 17, 1, 3, -1, 2, 18, 1, 1, 3, -.0012024149764329195, -.701511025428772, .0394898988306522, 0, 2, 5, 7, 11, 2, -1, 5, 8, 11, 1, 2, .007691164966672659, -.0922189131379128, .3104628920555115, 0, 2, 9, 2, 4, 10, -1, 9, 7, 4, 5, 2, -.139665499329567, .6897938847541809, -.0397061184048653, 0, 2, 0, 2, 4, 3, -1, 0, 3, 4, 1, 3, .0021276050247251987, .0972776114940643, -.2884179949760437, 0, 2, 10, 19, 10, 1, -1, 15, 19, 5, 1, 2, -.0027594310231506824, .2416867017745972, -.1127782016992569, 0, 2, 11, 17, 8, 3, -1, 15, 17, 4, 3, 2, .005223613232374191, -.1143027991056442, .2425678074359894, 0, 2, 8, 19, 3, 1, -1, 9, 19, 1, 1, 3, -.0012590440455824137, -.5967938899993896, .0476639606058598, 0, 2, 14, 0, 3, 4, -1, 15, 0, 1, 4, 3, -.0037192099262028933, -.464141309261322, .0528476908802986, 0, 2, 10, 6, 4, 3, -1, 10, 7, 4, 1, 3, .005969615187495947, -.0732442885637283, .3874309062957764, 0, 2, 0, 8, 3, 2, -1, 0, 9, 3, 1, 2, -.005177672021090984, -.7419322729110718, .0404967106878757, 0, 2, 7, 12, 3, 6, -1, 7, 14, 3, 2, 3, .005003510043025017, -.1388880014419556, .1876762062311173, 0, 2, 1, 18, 1, 2, -1, 1, 19, 1, 1, 2, -.0005201345775276423, -.5494061708450317, .0494178496301174, 0, 2, 0, 12, 4, 4, -1, 2, 12, 2, 4, 2, .00531687680631876, -.0824829787015915, .3174056112766266, 0, 2, 1, 8, 6, 7, -1, 3, 8, 2, 7, 3, -.0147745897993445, .2081609964370728, -.1211555972695351, 0, 2, 0, 8, 4, 5, -1, 2, 8, 2, 5, 2, -.0414164513349533, -.8243780732154846, .0333291888237, -1.0492420196533203, 53, 0, 2, 19, 16, 1, 3, -1, 19, 17, 1, 1, 3, .0009096252033486962, .0845799669623375, -.5611841082572937, 0, 2, 1, 5, 18, 6, -1, 7, 5, 6, 6, 3, -.0561397895216942, .1534174978733063, -.2696731984615326, 0, 2, 2, 15, 4, 2, -1, 2, 16, 4, 1, 2, .0010292009683325887, -.2048998028039932, .2015317976474762, 0, 2, 18, 6, 2, 11, -1, 19, 6, 1, 11, 2, .00287830107845366, -.1735114008188248, .2129794955253601, 0, 2, 0, 12, 2, 6, -1, 0, 14, 2, 2, 3, -.0074144392274320126, -.5962486863136292, .0470779500901699, 0, 2, 12, 5, 3, 2, -1, 12, 6, 3, 1, 2, -.0014831849839538336, .1902461051940918, -.1598639041185379, 0, 2, 1, 3, 2, 3, -1, 1, 4, 2, 1, 3, .0045968941412866116, .0314471311867237, -.6869434118270874, 0, 2, 16, 14, 4, 4, -1, 16, 16, 4, 2, 2, .0024255330208688974, -.23609359562397, .1103610992431641, 0, 2, 6, 8, 12, 5, -1, 10, 8, 4, 5, 3, -.0849505662918091, .2310716062784195, -.1377653032541275, 0, 2, 13, 7, 2, 7, -1, 14, 7, 1, 7, 2, -.005014568101614714, .3867610991001129, -.0562173798680305, 0, 2, 1, 8, 2, 6, -1, 2, 8, 1, 6, 2, -.002148206112906337, .1819159984588623, -.1761569976806641, 0, 2, 15, 0, 3, 7, -1, 16, 0, 1, 7, 3, -.0103967702016234, -.7535138130187988, .0240919701755047, 0, 2, 4, 2, 6, 2, -1, 6, 2, 2, 2, 3, -.0134667502716184, -.7211886048316956, .0349493697285652, 0, 2, 0, 9, 20, 9, -1, 0, 12, 20, 3, 3, -.0844354778528214, -.3379263877868652, .0711138173937798, 0, 2, 10, 14, 2, 2, -1, 10, 15, 2, 1, 2, .00247714901342988, -.1176510974764824, .225419893860817, 0, 2, 6, 5, 10, 4, -1, 6, 7, 10, 2, 2, .015828050673008, -.0695362165570259, .313953697681427, 0, 2, 6, 1, 5, 9, -1, 6, 4, 5, 3, 3, .0649169832468033, -.0750435888767242, .4067733883857727, 0, 3, 16, 18, 2, 2, -1, 16, 18, 1, 1, 2, 17, 19, 1, 1, 2, .00029652469675056636, .0739533603191376, -.3454400897026062, 0, 2, 0, 14, 2, 4, -1, 0, 16, 2, 2, 2, .001312952022999525, -.1690943986177445, .1525837033987045, 0, 2, 10, 8, 2, 5, -1, 11, 8, 1, 5, 2, -.0058032129891216755, .3526014983654022, -.0834440663456917, 0, 2, 3, 7, 12, 7, -1, 7, 7, 4, 7, 3, -.1479167938232422, .4300465881824493, -.0573099292814732, 0, 2, 0, 0, 6, 6, -1, 3, 0, 3, 6, 2, -.016584150493145, .2343268990516663, -.1090764030814171, 0, 2, 1, 0, 4, 4, -1, 3, 0, 2, 4, 2, .003018327057361603, -.1360093951225281, .264092892408371, 0, 2, 0, 0, 6, 8, -1, 2, 0, 2, 8, 3, -.0364719182252884, -.628097414970398, .0435451082885265, 0, 2, 0, 0, 2, 1, -1, 1, 0, 1, 1, 2, -7311922672670335e-20, .1647063046693802, -.1646378040313721, 0, 2, 0, 0, 3, 3, -1, 0, 1, 3, 1, 3, -.003671945072710514, -.4742136001586914, .0485869199037552, 0, 2, 5, 4, 2, 4, -1, 5, 6, 2, 2, 2, -.004015117883682251, .1822218000888825, -.1409751027822495, 0, 2, 2, 10, 9, 1, -1, 5, 10, 3, 1, 3, .0199480205774307, -.0697876587510109, .3670746088027954, 0, 2, 1, 17, 1, 3, -1, 1, 18, 1, 1, 3, .0007669943734072149, .0557292997837067, -.4458543062210083, 0, 2, 0, 17, 2, 3, -1, 0, 18, 2, 1, 3, -.0011806039838120341, -.4687662124633789, .0489022210240364, 0, 2, 0, 15, 16, 3, -1, 8, 15, 8, 3, 2, .0158473495393991, -.1212020963430405, .2056653052568436, 0, 2, 0, 5, 4, 1, -1, 2, 5, 2, 1, 2, -.0011985700111836195, .2026209980249405, -.1282382011413574, 0, 2, 1, 0, 6, 20, -1, 3, 0, 2, 20, 3, -.1096495985984802, -.8661919236183167, .0303518492728472, 0, 3, 2, 5, 4, 6, -1, 2, 5, 2, 3, 2, 4, 8, 2, 3, 2, -.009253260679543018, .2934311926364899, -.0853619500994682, 0, 2, 9, 16, 6, 3, -1, 11, 16, 2, 3, 3, .0146865304559469, .0327986218035221, -.7755656242370605, 0, 2, 11, 17, 6, 1, -1, 14, 17, 3, 1, 2, -.0013514430029317737, .244269996881485, -.1150325015187264, 0, 2, 3, 17, 15, 2, -1, 8, 17, 5, 2, 3, -.004372809082269669, .2168767005205154, -.1398448050022125, 0, 2, 18, 0, 2, 3, -1, 18, 1, 2, 1, 3, .0034263390116393566, .0456142202019691, -.545677125453949, 0, 2, 13, 1, 7, 4, -1, 13, 3, 7, 2, 2, -.0038404068909585476, .149495005607605, -.1506250947713852, 0, 3, 13, 6, 4, 4, -1, 13, 6, 2, 2, 2, 15, 8, 2, 2, 2, .0037988980766385794, -.0873016268014908, .2548153102397919, 0, 2, 17, 6, 3, 4, -1, 17, 8, 3, 2, 2, -.0020094281062483788, .1725907027721405, -.1428847014904022, 0, 2, 14, 9, 2, 2, -1, 15, 9, 1, 2, 2, -.002437070943415165, .2684809863567352, -.0818982198834419, 0, 2, 17, 17, 1, 3, -1, 17, 18, 1, 1, 3, .001048539998009801, .0461132600903511, -.4724327921867371, 0, 2, 3, 19, 8, 1, -1, 7, 19, 4, 1, 2, .00174607802182436, -.1103043034672737, .2037972956895828, 0, 2, 0, 9, 3, 6, -1, 0, 12, 3, 3, 2, .005860862787812948, -.1561965942382813, .1592743992805481, 0, 2, 4, 7, 15, 5, -1, 9, 7, 5, 5, 3, -.0277249794453382, .1134911999106407, -.2188514024019241, 0, 2, 6, 9, 9, 5, -1, 9, 9, 3, 5, 3, .0470806397497654, -.0416887290775776, .5363004803657532, 0, 2, 8, 1, 6, 2, -1, 10, 1, 2, 2, 3, -.007928377017378807, -.5359513163566589, .0442375093698502, 0, 2, 4, 0, 12, 2, -1, 10, 0, 6, 2, 2, -.0128805404528975, .2323794960975647, -.102462500333786, 0, 2, 7, 0, 10, 3, -1, 12, 0, 5, 3, 2, .0236047692596912, -.0882914364337921, .3056105971336365, 0, 2, 5, 0, 9, 6, -1, 5, 2, 9, 2, 3, .0159022007137537, -.1223810985684395, .1784912049770355, 0, 2, 8, 3, 6, 4, -1, 8, 5, 6, 2, 2, .007993949577212334, -.0837290063500404, .3231959044933319, 0, 2, 17, 4, 2, 3, -1, 17, 5, 2, 1, 3, .005710086785256863, .038479208946228, -.6813815236091614, -1.1122100353240967, 51, 0, 2, 5, 2, 4, 3, -1, 5, 3, 4, 1, 3, .002248072065412998, -.1641687005758286, .4164853096008301, 0, 2, 5, 9, 2, 6, -1, 6, 9, 1, 6, 2, .004581355024129152, -.1246595978736877, .4038512110710144, 0, 2, 14, 10, 2, 6, -1, 15, 10, 1, 6, 2, -.0016073239967226982, .260824590921402, -.202825203537941, 0, 2, 7, 4, 3, 3, -1, 7, 5, 3, 1, 3, .0025205370038747787, -.1055722981691361, .3666911125183106, 0, 3, 12, 4, 8, 2, -1, 12, 4, 4, 1, 2, 16, 5, 4, 1, 2, .0024119189474731684, -.1387760043144226, .2995991110801697, 0, 2, 15, 8, 1, 6, -1, 15, 10, 1, 2, 3, .005715617910027504, -.0776834636926651, .4848192036151886, 0, 2, 4, 17, 11, 3, -1, 4, 18, 11, 1, 3, .0031093840952962637, -.1122900024056435, .2921550869941711, 0, 2, 3, 0, 16, 20, -1, 3, 10, 16, 10, 2, -.0868366286158562, -.367796003818512, .0725972428917885, 0, 2, 12, 4, 4, 6, -1, 12, 6, 4, 2, 3, .0052652182057499886, -.1089029014110565, .3179126083850861, 0, 2, 11, 0, 6, 6, -1, 13, 0, 2, 6, 3, -.0199135299772024, -.5337343811988831, .0705857127904892, 0, 3, 13, 1, 6, 4, -1, 13, 1, 3, 2, 2, 16, 3, 3, 2, 2, .00382978399284184, -.135759100317955, .2278887927532196, 0, 2, 11, 0, 6, 4, -1, 13, 0, 2, 4, 3, .0104318596422672, .0887979120016098, -.4795897006988525, 0, 2, 8, 6, 6, 9, -1, 10, 6, 2, 9, 3, -.0200404394418001, .1574553996324539, -.1777157038450241, 0, 2, 7, 0, 3, 4, -1, 8, 0, 1, 4, 3, -.005296729039400816, -.6843491792678833, .0356714613735676, 0, 3, 0, 17, 14, 2, -1, 0, 17, 7, 1, 2, 7, 18, 7, 1, 2, -.0021624139044433832, .2831803858280182, -.098511278629303, 0, 3, 6, 18, 2, 2, -1, 6, 18, 1, 1, 2, 7, 19, 1, 1, 2, -.00035464888787828386, -.3707734048366547, .0809329524636269, 0, 2, 18, 17, 1, 3, -1, 18, 18, 1, 1, 3, -.00018152060511056334, -.322070300579071, .0775510594248772, 0, 3, 17, 18, 2, 2, -1, 17, 18, 1, 1, 2, 18, 19, 1, 1, 2, -.000275630212854594, -.3244127929210663, .0879494771361351, 0, 2, 5, 7, 1, 9, -1, 5, 10, 1, 3, 3, .006382381077855825, -.0889247134327888, .3172721862792969, 0, 2, 5, 3, 6, 4, -1, 7, 3, 2, 4, 3, .0111509095877409, .0710198432207108, -.4049403965473175, 0, 3, 1, 9, 6, 2, -1, 1, 9, 3, 1, 2, 4, 10, 3, 1, 2, -.0010593760525807738, .2605066895484924, -.1176564022898674, 0, 2, 6, 9, 2, 3, -1, 7, 9, 1, 3, 2, .002390648005530238, -.0843886211514473, .3123055100440979, 0, 2, 6, 8, 6, 12, -1, 8, 8, 2, 12, 3, -.0110007496550679, .1915224939584732, -.1521002054214478, 0, 3, 4, 18, 2, 2, -1, 4, 18, 1, 1, 2, 5, 19, 1, 1, 2, -.00024643228971399367, -.3176515996456146, .0865822583436966, 0, 2, 9, 1, 6, 6, -1, 9, 3, 6, 2, 3, .0230532698333263, -.1008976027369499, .2576929032802582, 0, 2, 6, 17, 6, 2, -1, 6, 18, 6, 1, 2, -.0022135660983622074, .4568921029567719, -.0524047911167145, 0, 2, 3, 18, 16, 2, -1, 3, 19, 16, 1, 2, -.000971397093962878, -.3551838099956513, .0800943821668625, 0, 2, 3, 0, 3, 11, -1, 4, 0, 1, 11, 3, .0015676229959353805, .1009142026305199, -.2160304039716721, 0, 2, 13, 18, 3, 1, -1, 14, 18, 1, 1, 3, .0007546080159954727, .0578961782157421, -.4046111106872559, 0, 2, 6, 0, 9, 6, -1, 6, 2, 9, 2, 3, -.0206989701837301, .3154363036155701, -.0807130485773087, 0, 3, 1, 2, 12, 4, -1, 1, 2, 6, 2, 2, 7, 4, 6, 2, 2, -.0206199400126934, .271816611289978, -.0763586163520813, 0, 2, 3, 3, 6, 4, -1, 5, 3, 2, 4, 3, .0216111298650503, .0394934490323067, -.5942965149879456, 0, 2, 12, 0, 8, 1, -1, 16, 0, 4, 1, 2, .006567674223333597, -.0983536690473557, .2364927977323532, 0, 2, 9, 0, 6, 2, -1, 11, 0, 2, 2, 3, -.008843479678034782, -.5252342820167542, .0430999211966991, 0, 2, 3, 3, 12, 1, -1, 9, 3, 6, 1, 2, -.009426074102520943, .2466513067483902, -.0941307172179222, 0, 3, 2, 7, 6, 2, -1, 2, 7, 3, 1, 2, 5, 8, 3, 1, 2, -.001983023015782237, .2674370110034943, -.0900693163275719, 0, 2, 0, 8, 4, 6, -1, 0, 10, 4, 2, 3, -.001735839992761612, .1594001948833466, -.157894104719162, 0, 2, 9, 6, 3, 7, -1, 10, 6, 1, 7, 3, -.0135138696059585, .4079233109951019, -.0642231181263924, 0, 2, 9, 6, 6, 13, -1, 11, 6, 2, 13, 3, -.0193940103054047, .1801564991474152, -.1373140066862106, 0, 2, 11, 12, 6, 1, -1, 13, 12, 2, 1, 3, -.003268477041274309, .2908039093017578, -.0801619067788124, 0, 2, 18, 9, 2, 6, -1, 18, 12, 2, 3, 2, .00041773589327931404, -.2141298055648804, .1127343997359276, 0, 2, 17, 2, 3, 9, -1, 18, 2, 1, 9, 3, -.007635111920535564, -.4536595940589905, .0546250604093075, 0, 3, 13, 8, 4, 6, -1, 13, 8, 2, 3, 2, 15, 11, 2, 3, 2, -.008365297690033913, .2647292017936707, -.0943341106176376, 0, 2, 4, 2, 12, 6, -1, 10, 2, 6, 6, 2, .027768449857831, -.1013671010732651, .2074397951364517, 0, 2, 4, 14, 16, 6, -1, 12, 14, 8, 6, 2, -.0548912286758423, .2884030938148499, -.075312040746212, 0, 2, 6, 19, 10, 1, -1, 11, 19, 5, 1, 2, .002579333959147334, -.1108852997422218, .2172496020793915, 0, 2, 6, 17, 1, 3, -1, 6, 18, 1, 1, 3, 6619651685468853e-20, -.1887210011482239, .1444068998098373, 0, 2, 4, 14, 10, 3, -1, 4, 15, 10, 1, 3, .005090725142508745, -.0776012316346169, .2939837872982025, 0, 2, 6, 0, 12, 12, -1, 6, 4, 12, 4, 3, -.1044425964355469, .2013310939073563, -.1090397015213966, 0, 3, 5, 7, 4, 2, -1, 5, 7, 2, 1, 2, 7, 8, 2, 1, 2, -.0006727309082634747, .1794590055942535, -.1202367022633553, 0, 2, 17, 5, 3, 2, -1, 18, 5, 1, 2, 3, .0032412849832326174, .0406881310045719, -.5460057258605957, -1.2529590129852295, 44, 0, 2, 8, 13, 6, 3, -1, 8, 14, 6, 1, 3, .005296532064676285, -.1215452998876572, .6442037224769592, 0, 2, 8, 13, 5, 3, -1, 8, 14, 5, 1, 3, -.002532626036554575, .5123322010040283, -.111082598567009, 0, 2, 13, 2, 1, 18, -1, 13, 11, 1, 9, 2, -.0029183230362832546, -.5061542987823486, .1150197982788086, 0, 2, 6, 10, 9, 2, -1, 9, 10, 3, 2, 3, -.0236923396587372, .3716728091239929, -.1467268019914627, 0, 2, 11, 0, 7, 4, -1, 11, 2, 7, 2, 2, .0201774705201387, -.1738884001970291, .4775949120521545, 0, 2, 1, 0, 6, 8, -1, 3, 0, 2, 8, 3, -.021723210811615, -.4388009011745453, .1357689946889877, 0, 2, 9, 15, 3, 3, -1, 9, 16, 3, 1, 3, .0028369780629873276, -.1251206994056702, .4678902924060822, 0, 2, 9, 17, 9, 3, -1, 9, 18, 9, 1, 3, .002714842092245817, -.0880188569426537, .3686651885509491, 0, 2, 12, 12, 3, 3, -1, 12, 13, 3, 1, 3, .003262568963691592, -.0853353068232536, .5164473056793213, 0, 2, 4, 1, 3, 5, -1, 5, 1, 1, 5, 3, -.0035618850961327553, -.445039302110672, .0917381718754768, 0, 2, 10, 14, 2, 3, -1, 10, 15, 2, 1, 3, .001922774943523109, -.1107731014490128, .3941699862480164, 0, 3, 18, 17, 2, 2, -1, 18, 17, 1, 1, 2, 19, 18, 1, 1, 2, -.0003511196991894394, -.3777570128440857, .1216617003083229, 0, 3, 18, 18, 2, 2, -1, 18, 18, 1, 1, 2, 19, 19, 1, 1, 2, .0001912177976919338, .0748160183429718, -.4076710045337677, 0, 3, 18, 18, 2, 2, -1, 18, 18, 1, 1, 2, 19, 19, 1, 1, 2, -.00026525629800744355, -.3315171897411346, .1129112020134926, 0, 2, 4, 10, 9, 1, -1, 7, 10, 3, 1, 3, .0200867000967264, -.0615981183946133, .5612881779670715, 0, 2, 3, 9, 6, 5, -1, 5, 9, 2, 5, 3, .0367832481861115, -.0602513886988163, .5219249129295349, 0, 2, 18, 8, 1, 12, -1, 18, 14, 1, 6, 2, .0013941619545221329, -.3550305068492889, .1086302027106285, 0, 3, 0, 2, 8, 6, -1, 0, 2, 4, 3, 2, 4, 5, 4, 3, 2, -.0151816699653864, .2273965030908585, -.1625299006700516, 0, 2, 9, 4, 3, 3, -1, 9, 5, 3, 1, 3, .0046796840615570545, -.0575350411236286, .4812423884868622, 0, 3, 3, 18, 2, 2, -1, 3, 18, 1, 1, 2, 4, 19, 1, 1, 2, -.00017988319450523704, -.3058767020702362, .1086815968155861, 0, 2, 6, 4, 4, 3, -1, 6, 5, 4, 1, 3, -.0035850999411195517, .3859694004058838, -.0921940729022026, 0, 3, 16, 7, 4, 2, -1, 16, 7, 2, 1, 2, 18, 8, 2, 1, 2, .001079336041584611, -.1119038984179497, .31125208735466, 0, 2, 5, 17, 1, 3, -1, 5, 18, 1, 1, 3, 7328580250032246e-20, -.2023991048336029, .155866801738739, 0, 2, 2, 0, 15, 20, -1, 2, 10, 15, 10, 2, .1367873996496201, -.2167285978794098, .1442039012908936, 0, 3, 8, 11, 6, 4, -1, 8, 11, 3, 2, 2, 11, 13, 3, 2, 2, -.0117292599752545, .4350377023220062, -.0748865306377411, 0, 2, 8, 16, 4, 3, -1, 8, 17, 4, 1, 3, .003923084121197462, -.0502893291413784, .5883116126060486, 0, 3, 8, 18, 2, 2, -1, 8, 18, 1, 1, 2, 9, 19, 1, 1, 2, -.0002981912111863494, -.3823240101337433, .0924511328339577, 0, 2, 2, 16, 13, 3, -1, 2, 17, 13, 1, 3, -.004799277056008577, .4848878979682922, -.0731365233659744, 0, 3, 16, 16, 2, 2, -1, 16, 16, 1, 1, 2, 17, 17, 1, 1, 2, -.0003015589027199894, -.3575735986232758, .1058188006281853, 0, 2, 8, 1, 6, 3, -1, 10, 1, 2, 3, 3, .0103907696902752, .0529204681515694, -.5724965929985046, 0, 3, 16, 7, 2, 2, -1, 16, 7, 1, 1, 2, 17, 8, 1, 1, 2, -.0009448804194107652, .449668288230896, -.0830755233764648, 0, 3, 14, 7, 4, 2, -1, 14, 7, 2, 1, 2, 16, 8, 2, 1, 2, .0012651870492845774, -.0966954380273819, .3130227029323578, 0, 2, 4, 0, 14, 1, -1, 11, 0, 7, 1, 2, .0170945394784212, -.081248976290226, .3611383140087128, 0, 3, 10, 4, 8, 2, -1, 10, 4, 4, 1, 2, 14, 5, 4, 1, 2, .002597335958853364, -.1133835017681122, .2223394960165024, 0, 2, 8, 2, 3, 2, -1, 9, 2, 1, 2, 3, .0014527440071105957, .0697504431009293, -.3672071099281311, 0, 2, 12, 11, 6, 3, -1, 12, 12, 6, 1, 3, .00476386584341526, -.0657889619469643, .383285403251648, 0, 2, 1, 5, 1, 4, -1, 1, 7, 1, 2, 2, -.006250108126550913, -.7075446844100952, .038350198417902, 0, 2, 1, 1, 1, 18, -1, 1, 7, 1, 6, 3, -.003176532918587327, .1375540047883987, -.2324002981185913, 0, 2, 11, 13, 3, 2, -1, 11, 14, 3, 1, 2, .003219116944819689, -.1293545067310333, .2273788005113602, 0, 3, 0, 1, 12, 2, -1, 0, 1, 6, 1, 2, 6, 2, 6, 1, 2, -.005636557936668396, .380671501159668, -.0672468394041061, 0, 3, 10, 18, 2, 2, -1, 10, 18, 1, 1, 2, 11, 19, 1, 1, 2, -.00023844049428589642, -.3112238049507141, .0838383585214615, 0, 3, 4, 5, 4, 4, -1, 4, 5, 2, 2, 2, 6, 7, 2, 2, 2, -.004101756028831005, .2606728076934815, -.1044974029064179, 0, 2, 6, 7, 1, 3, -1, 6, 8, 1, 1, 3, .0013336989795789123, -.0582501403987408, .4768244028091431, 0, 2, 14, 10, 6, 2, -1, 16, 10, 2, 2, 3, -.0012090239906683564, .148345097899437, -.1732946932315826, -1.118873953819275, 72, 0, 2, 16, 8, 3, 6, -1, 17, 8, 1, 6, 3, -.003176093101501465, .3333333134651184, -.166423499584198, 0, 2, 4, 10, 6, 2, -1, 6, 10, 2, 2, 3, .0248580798506737, -.0727288722991943, .5667458176612854, 0, 2, 6, 5, 3, 7, -1, 7, 5, 1, 7, 3, -.007759728003293276, .4625856876373291, -.0931121781468391, 0, 2, 0, 13, 6, 6, -1, 0, 16, 6, 3, 2, .007823902182281017, -.2741461098194122, .1324304938316345, 0, 2, 12, 5, 1, 9, -1, 12, 8, 1, 3, 3, -.010948839597404, .2234548032283783, -.1496544927358627, 0, 2, 5, 9, 3, 3, -1, 6, 9, 1, 3, 3, -.0034349008928984404, .3872498869895935, -.0661217272281647, 0, 2, 7, 5, 6, 13, -1, 9, 5, 2, 13, 3, -.0311562903225422, .2407827973365784, -.1140690967440605, 0, 2, 19, 8, 1, 10, -1, 19, 13, 1, 5, 2, .001110051991418004, -.2820797860622406, .1327542960643768, 0, 2, 11, 18, 6, 1, -1, 13, 18, 2, 1, 3, .003176274010911584, .0345859304070473, -.5137431025505066, 0, 2, 9, 7, 6, 12, -1, 11, 7, 2, 12, 3, -.0279774591326714, .2392677962779999, -.1325591951608658, 0, 2, 12, 7, 6, 6, -1, 14, 7, 2, 6, 3, -.0230979397892952, .3901962041854858, -.0784780085086823, 0, 2, 15, 8, 3, 4, -1, 16, 8, 1, 4, 3, -.003973193001002073, .3069106936454773, -.0706014037132263, 0, 2, 6, 11, 4, 2, -1, 6, 12, 4, 1, 2, .003033574903383851, -.1400219053030014, .191348597407341, 0, 2, 1, 6, 6, 8, -1, 3, 6, 2, 8, 3, -.0108443703502417, .1654873043298721, -.1565777957439423, 0, 2, 11, 15, 6, 5, -1, 13, 15, 2, 5, 3, -.0181505102664232, -.6324359178543091, .0395618192851543, 0, 2, 15, 17, 4, 2, -1, 15, 18, 4, 1, 2, .0007105229888111353, -.1851557046175003, .1340880990028381, 0, 2, 13, 11, 6, 1, -1, 15, 11, 2, 1, 3, .0108933402225375, -.0267302300781012, .6097180247306824, 0, 3, 5, 18, 2, 2, -1, 5, 18, 1, 1, 2, 6, 19, 1, 1, 2, -.0002878090017475188, -.3006514012813568, .0731714591383934, 0, 3, 4, 8, 4, 4, -1, 4, 8, 2, 2, 2, 6, 10, 2, 2, 2, -.0035855069290846586, .2621760964393616, -.0797140970826149, 0, 2, 11, 7, 9, 3, -1, 11, 8, 9, 1, 3, -.0197592806071043, -.5903922915458679, .0406989715993404, 0, 3, 0, 3, 10, 4, -1, 0, 3, 5, 2, 2, 5, 5, 5, 2, 2, -.010845210403204, .1636455953121185, -.1258606016635895, 0, 2, 7, 18, 6, 1, -1, 9, 18, 2, 1, 3, -.004318309016525745, -.5747488141059875, .0376443117856979, 0, 2, 0, 8, 3, 3, -1, 0, 9, 3, 1, 3, .0014913700288161635, .0609134696424007, -.3022292852401733, 0, 3, 0, 0, 6, 8, -1, 0, 0, 3, 4, 2, 3, 4, 3, 4, 2, .0156756993383169, -.0731459110975266, .2937945127487183, 0, 2, 7, 6, 3, 8, -1, 8, 6, 1, 8, 3, -.0110335601493716, .393188089132309, -.0470843203365803, 0, 2, 13, 7, 7, 3, -1, 13, 8, 7, 1, 3, .008855575695633888, .0376013815402985, -.4910849034786224, 0, 2, 3, 3, 2, 2, -1, 3, 4, 2, 1, 2, -.0008966567111201584, .1795202046632767, -.1108623966574669, 0, 2, 0, 3, 3, 3, -1, 0, 4, 3, 1, 3, -.0030592409893870354, -.4442946016788483, .0510054305195808, 0, 2, 9, 3, 5, 2, -1, 9, 4, 5, 1, 2, .006320117972791195, -.0528410896658897, .3719710111618042, 0, 2, 6, 5, 9, 4, -1, 9, 5, 3, 4, 3, .020682830363512, .0576671697199345, -.3690159916877747, 0, 2, 3, 10, 12, 3, -1, 7, 10, 4, 3, 3, .0998226627707481, -.037377018481493, .5816559195518494, 0, 2, 8, 7, 3, 6, -1, 9, 7, 1, 6, 3, -.006585422903299332, .2850944101810455, -.0609780699014664, 0, 2, 5, 5, 6, 5, -1, 8, 5, 3, 5, 2, -.0609003007411957, -.5103176832199097, .0377874001860619, 0, 2, 0, 5, 2, 3, -1, 0, 6, 2, 1, 3, -.0029991709161549807, -.4794301092624664, .0388338901102543, 0, 2, 9, 7, 3, 4, -1, 10, 7, 1, 4, 3, -.009890643879771233, .4060907959938049, -.047869648784399, 0, 2, 1, 0, 6, 15, -1, 3, 0, 2, 15, 3, -.0826889276504517, -.7067118287086487, .0274877492338419, 0, 2, 15, 1, 3, 5, -1, 16, 1, 1, 5, 3, .00500603998079896, .028208440169692, -.5290969014167786, 0, 2, 9, 2, 3, 10, -1, 10, 2, 1, 10, 3, .006169503089040518, -.0545548610389233, .3283798098564148, 0, 2, 8, 8, 6, 12, -1, 10, 8, 2, 12, 3, -.0033914761152118444, .0921176671981812, -.2163711041212082, 0, 2, 16, 4, 3, 4, -1, 16, 6, 3, 2, 2, -.0026131230406463146, .1365101933479309, -.1378113031387329, 0, 3, 16, 7, 2, 2, -1, 16, 7, 1, 1, 2, 17, 8, 1, 1, 2, .0008049065945670009, -.0686371102929115, .3358106911182404, 0, 2, 13, 0, 6, 9, -1, 13, 3, 6, 3, 3, -.0381065085530281, .2944543063640595, -.068239226937294, 0, 2, 7, 17, 1, 3, -1, 7, 18, 1, 1, 3, 7245079905260354e-20, -.167501300573349, .1217823028564453, 0, 2, 12, 1, 4, 2, -1, 12, 2, 4, 1, 2, .0015837959945201874, -.0920428484678268, .213489904999733, 0, 2, 17, 3, 1, 3, -1, 17, 4, 1, 1, 3, .0012924340553581715, .0629172325134277, -.3617450892925263, 0, 2, 0, 16, 9, 3, -1, 0, 17, 9, 1, 3, .00991467759013176, .0195340607315302, -.8101503849029541, 0, 3, 3, 6, 2, 4, -1, 3, 6, 1, 2, 2, 4, 8, 1, 2, 2, -.0017086310544982553, .2552523910999298, -.0682294592261314, 0, 2, 13, 18, 3, 1, -1, 14, 18, 1, 1, 3, .002184439916163683, .0233140494674444, -.8429678082466125, 0, 2, 0, 18, 4, 2, -1, 2, 18, 2, 2, 2, -.003424433059990406, .2721368968486786, -.0763952285051346, 0, 2, 1, 19, 2, 1, -1, 2, 19, 1, 1, 2, .00027591470279730856, -.1074284017086029, .2288897037506104, 0, 2, 0, 18, 4, 2, -1, 0, 19, 4, 1, 2, -.0006000517751090229, -.2985421121120453, .0634797364473343, 0, 2, 2, 17, 1, 3, -1, 2, 18, 1, 1, 3, -.00025001438916660845, -.2717896997928619, .0696150064468384, 0, 2, 4, 8, 3, 5, -1, 5, 8, 1, 5, 3, .006875139195472002, -.0571858994662762, .3669595122337341, 0, 2, 2, 1, 6, 7, -1, 4, 1, 2, 7, 3, .0127619002014399, .0679556876420975, -.2853415012359619, 0, 3, 3, 6, 2, 8, -1, 3, 6, 1, 4, 2, 4, 10, 1, 4, 2, -.0014752789866179228, .2068066000938416, -.1005939021706581, 0, 2, 4, 5, 11, 10, -1, 4, 10, 11, 5, 2, .1213881969451904, -.0971267968416214, .1978961974382401, 0, 2, 0, 13, 20, 2, -1, 10, 13, 10, 2, 2, -.0500812791287899, .2841717898845673, -.0678799971938133, 0, 2, 1, 13, 16, 3, -1, 9, 13, 8, 3, 2, .0314549505710602, -.0894686728715897, .2129842042922974, 0, 3, 16, 4, 4, 4, -1, 16, 4, 2, 2, 2, 18, 6, 2, 2, 2, .0018878319533541799, -.1165644004940987, .166635200381279, 0, 3, 16, 0, 4, 12, -1, 16, 0, 2, 6, 2, 18, 6, 2, 6, 2, -.005721196066588163, .2370214015245438, -.0907766073942184, 0, 2, 14, 15, 3, 1, -1, 15, 15, 1, 1, 3, -.00018076719425152987, .1795192956924439, -.1079348027706146, 0, 2, 3, 4, 12, 10, -1, 3, 9, 12, 5, 2, -.1976184993982315, .4567429125308991, -.0404801592230797, 0, 3, 9, 18, 2, 2, -1, 9, 18, 1, 1, 2, 10, 19, 1, 1, 2, -.00023846809926908463, -.2373300939798355, .0759221613407135, 0, 3, 9, 18, 2, 2, -1, 9, 18, 1, 1, 2, 10, 19, 1, 1, 2, .00021540730085689574, .0816880166530609, -.2868503034114838, 0, 3, 13, 4, 2, 14, -1, 13, 4, 1, 7, 2, 14, 11, 1, 7, 2, .0101630901917815, -.0412500202655792, .4803834855556488, 0, 2, 4, 2, 6, 4, -1, 7, 2, 3, 4, 2, -.007218487095087767, .1745858043432236, -.1014650017023087, 0, 3, 0, 0, 18, 20, -1, 0, 0, 9, 10, 2, 9, 10, 9, 10, 2, .2426317036151886, .05342648178339, -.3231852948665619, 0, 2, 15, 11, 1, 2, -1, 15, 12, 1, 1, 2, .0006930410163477063, -.1149917989969254, .1479393988847733, 0, 3, 16, 10, 2, 4, -1, 16, 10, 1, 2, 2, 17, 12, 1, 2, 2, .003547519911080599, -.0394249781966209, .5312618017196655, 0, 3, 18, 17, 2, 2, -1, 18, 17, 1, 1, 2, 19, 18, 1, 1, 2, .00021403690334409475, .0697538331151009, -.2731958031654358, 0, 2, 9, 17, 1, 2, -1, 9, 18, 1, 1, 2, -.0005711946287192404, .3436990082263947, -.0576990097761154, 0, 2, 8, 4, 9, 6, -1, 11, 4, 3, 6, 3, -.006629006937146187, .1175848990678787, -.1502013951539993, -1.088881015777588, 66, 0, 2, 6, 9, 9, 10, -1, 9, 9, 3, 10, 3, -.0265134498476982, .2056864053010941, -.2647390067577362, 0, 2, 5, 0, 5, 4, -1, 5, 2, 5, 2, 2, .00977274589240551, -.111928403377533, .325705498456955, 0, 2, 5, 7, 11, 4, -1, 5, 9, 11, 2, 2, .0322903506457806, -.0985747575759888, .3177917003631592, 0, 2, 2, 4, 2, 14, -1, 3, 4, 1, 14, 2, -.00281032407656312, .1521389931440353, -.1968640983104706, 0, 2, 8, 6, 3, 5, -1, 9, 6, 1, 5, 3, -.0109914299100637, .5140765905380249, -.0437072105705738, 0, 2, 8, 4, 3, 9, -1, 9, 4, 1, 9, 3, .006313383113592863, -.0927810221910477, .3470247089862824, 0, 2, 0, 8, 20, 6, -1, 0, 10, 20, 2, 3, .0871059820055962, .030053649097681, -.8281481862068176, 0, 2, 14, 16, 6, 1, -1, 17, 16, 3, 1, 2, .0011799359926953912, -.1292842030525208, .2064612060785294, 0, 2, 17, 18, 2, 2, -1, 17, 19, 2, 1, 2, -.0009305689018219709, -.5002143979072571, .0936669930815697, 0, 2, 8, 17, 6, 3, -1, 10, 17, 2, 3, 3, -.0136871701106429, -.793581485748291, -.006673363968729973, 0, 2, 4, 1, 9, 15, -1, 7, 1, 3, 15, 3, -.0759174525737762, .3046964108943939, -.0796558931469917, 0, 2, 11, 5, 3, 12, -1, 12, 5, 1, 12, 3, -.0028559709899127483, .2096146047115326, -.1273255050182343, 0, 2, 0, 15, 4, 3, -1, 0, 16, 4, 1, 3, -.004023151006549597, -.6581727862358093, .0506836399435997, 0, 2, 0, 0, 15, 1, -1, 5, 0, 5, 1, 3, .0175580400973558, -.0853826925158501, .3617455959320068, 0, 2, 6, 0, 6, 4, -1, 8, 0, 2, 4, 3, .0219882391393185, .062943696975708, -.7089633941650391, 0, 2, 2, 0, 9, 3, -1, 5, 0, 3, 3, 3, -.002859958913177252, .1468378007411957, -.1646597981452942, 0, 2, 13, 6, 3, 7, -1, 14, 6, 1, 7, 3, -.0100308498367667, .4957993924617767, -.0271883402019739, 0, 2, 7, 6, 4, 2, -1, 7, 7, 4, 1, 2, -.006956032942980528, .2797777950763702, -.0779533311724663, 0, 2, 6, 18, 6, 1, -1, 8, 18, 2, 1, 3, -.0038356808945536613, -.58163982629776, .0357399396598339, 0, 2, 18, 6, 2, 2, -1, 18, 7, 2, 1, 2, -.0032647319603711367, -.4994508028030396, .0469864904880524, 0, 2, 6, 4, 7, 3, -1, 6, 5, 7, 1, 3, -.007841235026717186, .34532830119133, -.0688104033470154, 0, 2, 12, 7, 3, 1, -1, 13, 7, 1, 1, 3, -8171811350621283e-20, .1504171043634415, -.1414667963981628, 0, 3, 15, 1, 2, 10, -1, 15, 1, 1, 5, 2, 16, 6, 1, 5, 2, -.0032448628917336464, .227245107293129, -.0928602069616318, 0, 2, 0, 18, 2, 2, -1, 0, 19, 2, 1, 2, -.0007856115116737783, -.4431901872158051, .0578124411404133, 0, 2, 19, 4, 1, 8, -1, 19, 8, 1, 4, 2, -.0006247424753382802, .1395238935947418, -.1466871947050095, 0, 2, 1, 17, 1, 3, -1, 1, 18, 1, 1, 3, -.0003294294874649495, -.2990157008171082, .0760667398571968, 0, 3, 0, 15, 6, 4, -1, 0, 15, 3, 2, 2, 3, 17, 3, 2, 2, .0012605739757418633, -.1612560003995895, .1395380049943924, 0, 2, 19, 0, 1, 18, -1, 19, 6, 1, 6, 3, -.0516670197248459, -.5314283967018127, .0407195203006268, 0, 2, 10, 2, 6, 2, -1, 12, 2, 2, 2, 3, -.0152856195345521, -.7820637822151184, .0271837692707777, 0, 2, 2, 8, 12, 2, -1, 6, 8, 4, 2, 3, .0690298229455948, -.0364270210266113, .7110251784324646, 0, 2, 16, 0, 4, 1, -1, 18, 0, 2, 1, 2, .001452274969778955, -.0968905165791512, .2166842073202133, 0, 2, 8, 4, 2, 6, -1, 8, 7, 2, 3, 2, -.0024765590205788612, .1164531037211418, -.1822797954082489, 0, 2, 14, 5, 2, 10, -1, 15, 5, 1, 10, 2, -.0015134819550439715, .1786397993564606, -.1221496984362602, 0, 2, 13, 4, 2, 2, -1, 13, 5, 2, 1, 2, -.0015099470037966967, .1808623969554901, -.1144606992602348, 0, 2, 11, 1, 3, 6, -1, 11, 3, 3, 2, 3, -.006705462001264095, .2510659992694855, -.0918714627623558, 0, 2, 6, 9, 12, 2, -1, 10, 9, 4, 2, 3, -.014075200073421, .1370750963687897, -.173335000872612, 0, 2, 9, 16, 4, 2, -1, 9, 17, 4, 1, 2, -.0022400720044970512, .4009298086166382, -.0475768782198429, 0, 2, 5, 14, 15, 4, -1, 5, 16, 15, 2, 2, .0197823699563742, -.1904035061597824, .1492341011762619, 0, 2, 18, 16, 2, 2, -1, 18, 17, 2, 1, 2, .002600287087261677, .0469717681407928, -.4330765902996063, 0, 3, 16, 18, 2, 2, -1, 16, 18, 1, 1, 2, 17, 19, 1, 1, 2, -.0005344562814570963, -.4374423027038574, .0415201894938946, 0, 2, 6, 4, 3, 8, -1, 7, 4, 1, 8, 3, -.0174665097147226, .6581817269325256, -.0344474911689758, 0, 2, 5, 9, 3, 1, -1, 6, 9, 1, 1, 3, -.00204255897551775, .3965792953968048, -.044052429497242, 0, 2, 0, 8, 1, 6, -1, 0, 10, 1, 2, 3, .0026661779265850782, .0587709583342075, -.3280636966228485, 0, 2, 11, 2, 9, 6, -1, 14, 2, 3, 6, 3, -.0559823699295521, -.5173547267913818, .0357918404042721, 0, 2, 12, 2, 6, 4, -1, 14, 2, 2, 4, 3, -.0015066330088302493, .1512386947870255, -.1252018064260483, 0, 2, 1, 7, 2, 4, -1, 1, 9, 2, 2, 2, -.0114723695442081, -.6293053030967712, .0347043313086033, 0, 2, 13, 1, 6, 4, -1, 13, 3, 6, 2, 2, .0234096292406321, -.0580633506178856, .3866822123527527, 0, 3, 4, 10, 2, 10, -1, 4, 10, 1, 5, 2, 5, 15, 1, 5, 2, -.002324372995644808, .1875409930944443, -.0983946695923805, 0, 2, 2, 16, 9, 3, -1, 5, 16, 3, 3, 3, -.0290392991155386, -.5448690056800842, .0409263409674168, 0, 2, 1, 2, 3, 9, -1, 2, 2, 1, 9, 3, -.014474649913609, -.6724839210510254, .0231288503855467, 0, 2, 19, 7, 1, 4, -1, 19, 9, 1, 2, 2, -.005208609160035849, -.4327144026756287, .0437806509435177, 0, 3, 14, 11, 6, 8, -1, 14, 11, 3, 4, 2, 17, 15, 3, 4, 2, .004938289988785982, -.1087862029671669, .1934258937835693, 0, 3, 15, 12, 4, 6, -1, 15, 12, 2, 3, 2, 17, 15, 2, 3, 2, -.004319393076002598, .2408093065023422, -.1038080006837845, 0, 3, 16, 15, 2, 2, -1, 16, 15, 1, 1, 2, 17, 16, 1, 1, 2, .0002370566944591701, -.087349072098732, .2046623975038528, 0, 3, 17, 16, 2, 2, -1, 17, 16, 1, 1, 2, 18, 17, 1, 1, 2, .0004785807977896184, .0456245802342892, -.3885467052459717, 0, 3, 17, 16, 2, 2, -1, 17, 16, 1, 1, 2, 18, 17, 1, 1, 2, -.0008534283842891455, -.550779402256012, .0358258895576, 0, 3, 2, 3, 2, 2, -1, 2, 3, 1, 1, 2, 3, 4, 1, 1, 2, 5477212107507512e-20, -.1122523993253708, .1750351935625076, 0, 2, 10, 10, 3, 3, -1, 11, 10, 1, 3, 3, -.0038445889949798584, .2452670037746429, -.0811325684189796, 0, 2, 5, 9, 7, 8, -1, 5, 13, 7, 4, 2, -.0401284582912922, -.6312270760536194, .0269726701080799, 0, 3, 7, 16, 2, 2, -1, 7, 16, 1, 1, 2, 8, 17, 1, 1, 2, -.0001788636000128463, .1985509991645813, -.1033368036150932, 0, 3, 7, 16, 2, 2, -1, 7, 16, 1, 1, 2, 8, 17, 1, 1, 2, .00017668239888735116, -.0913590118288994, .1984872072935104, 0, 2, 9, 8, 10, 3, -1, 14, 8, 5, 3, 2, .0727633833885193, .0500755794346333, -.3385263085365295, 0, 3, 6, 7, 4, 8, -1, 6, 7, 2, 4, 2, 8, 11, 2, 4, 2, .0101816300302744, -.0932299792766571, .2005959004163742, 0, 2, 1, 6, 4, 3, -1, 1, 7, 4, 1, 3, .0024409969337284565, .0646366328001022, -.2692174017429352, 0, 2, 6, 10, 6, 10, -1, 8, 10, 2, 10, 3, -.003622748889029026, .1316989064216614, -.1251484006643295, 0, 2, 4, 6, 3, 6, -1, 5, 6, 1, 6, 3, -.0013635610230267048, .1635046005249023, -.106659397482872, -1.0408929586410522, 69, 0, 3, 3, 10, 4, 4, -1, 3, 10, 2, 2, 2, 5, 12, 2, 2, 2, -.009699116460978985, .6112532019615173, -.0662253126502037, 0, 3, 3, 10, 4, 4, -1, 3, 10, 2, 2, 2, 5, 12, 2, 2, 2, -.009642653167247772, -1, .0027699959464371204, 0, 3, 3, 10, 4, 4, -1, 3, 10, 2, 2, 2, 5, 12, 2, 2, 2, -.009638186544179916, 1, -.00029904270195402205, 0, 2, 14, 8, 2, 6, -1, 15, 8, 1, 6, 2, -.004255393985658884, .2846438884735107, -.1554012000560761, 0, 3, 3, 10, 4, 4, -1, 3, 10, 2, 2, 2, 5, 12, 2, 2, 2, -.009622352197766304, -1, .0439991801977158, 0, 3, 3, 10, 4, 4, -1, 3, 10, 2, 2, 2, 5, 12, 2, 2, 2, -.009123124182224274, .8686934113502502, -.0027267890982329845, 0, 2, 12, 4, 3, 9, -1, 13, 4, 1, 9, 3, -.008624043315649033, .4535248875617981, -.0860713794827461, 0, 2, 12, 3, 1, 12, -1, 12, 7, 1, 4, 3, -.008932414464652538, .1337555944919586, -.2601251900196075, 0, 2, 2, 0, 18, 1, -1, 8, 0, 6, 1, 3, -.0142078101634979, .3207764029502869, -.0972264111042023, 0, 3, 10, 0, 10, 6, -1, 10, 0, 5, 3, 2, 15, 3, 5, 3, 2, .0259110108017921, -.1296408027410507, .2621864974498749, 0, 2, 18, 16, 2, 2, -1, 18, 17, 2, 1, 2, .00020531509653665125, -.1240428015589714, .2106295973062515, 0, 3, 3, 5, 4, 2, -1, 3, 5, 2, 1, 2, 5, 6, 2, 1, 2, -54795680625829846e-21, .1197429969906807, -.2320127934217453, 0, 2, 11, 8, 3, 3, -1, 12, 8, 1, 3, 3, .006855519954115152, -.0632761269807816, .4104425013065338, 0, 2, 11, 7, 3, 5, -1, 12, 7, 1, 5, 3, -.0122530404478312, .5488333106040955, -.0397311002016068, 0, 2, 3, 19, 15, 1, -1, 8, 19, 5, 1, 3, -.0039058770053088665, .2419098019599915, -.0970960110425949, 0, 2, 8, 13, 3, 2, -1, 8, 14, 3, 1, 2, .0027560980524867773, -.1256967931985855, .1945665031671524, 0, 3, 2, 12, 8, 4, -1, 2, 12, 4, 2, 2, 6, 14, 4, 2, 2, -.0077662160620093346, .2976570129394531, -.0968181565403938, 0, 3, 16, 16, 2, 2, -1, 16, 16, 1, 1, 2, 17, 17, 1, 1, 2, .00038997188676148653, .0621884018182755, -.4204089939594269, 0, 2, 7, 0, 3, 2, -1, 8, 0, 1, 2, 3, .0033579880837351084, .0474981404840946, -.6321688294410706, 0, 2, 6, 7, 2, 5, -1, 7, 7, 1, 5, 2, -.0167455393821001, .7109813094139099, -.0391573496162891, 0, 2, 18, 0, 2, 17, -1, 19, 0, 1, 17, 2, -.0065409899689257145, -.3504317104816437, .0706169530749321, 0, 2, 16, 16, 1, 3, -1, 16, 17, 1, 1, 3, .0003001634031534195, .091902457177639, -.2461867034435272, 0, 2, 14, 8, 3, 7, -1, 15, 8, 1, 7, 3, .0149189904332161, -.0519094504415989, .5663604140281677, 0, 3, 10, 17, 2, 2, -1, 10, 17, 1, 1, 2, 11, 18, 1, 1, 2, .00048153079114854336, .064659558236599, -.3659060895442963, 0, 2, 4, 9, 1, 3, -1, 4, 10, 1, 1, 3, -.00030211321427486837, .1792656928300858, -.1141066029667854, 0, 2, 18, 10, 2, 3, -1, 18, 11, 2, 1, 3, .0003852141962852329, .1034561991691589, -.2007246017456055, 0, 2, 12, 1, 3, 10, -1, 13, 1, 1, 10, 3, .008083713240921497, -.0660734623670578, .3028424978256226, 0, 2, 8, 12, 9, 1, -1, 11, 12, 3, 1, 3, -.0228049699217081, .5296235084533691, -.0401189997792244, 0, 3, 5, 18, 2, 2, -1, 5, 18, 1, 1, 2, 6, 19, 1, 1, 2, .00019440450705587864, .0818548202514648, -.2466336041688919, 0, 2, 19, 6, 1, 9, -1, 19, 9, 1, 3, 3, -.0128480903804302, -.3497331142425537, .0569162294268608, 0, 3, 4, 7, 2, 4, -1, 4, 7, 1, 2, 2, 5, 9, 1, 2, 2, -.001093729049898684, .2336868047714233, -.0916048064827919, 0, 2, 1, 4, 6, 14, -1, 3, 4, 2, 14, 3, .0010032650316134095, .1185218021273613, -.1846919059753418, 0, 2, 10, 5, 9, 3, -1, 13, 5, 3, 3, 3, -.0446884296834469, -.6436246037483215, .0303632691502571, 0, 2, 18, 7, 2, 6, -1, 18, 9, 2, 2, 3, .00816575437784195, .0436746589839458, -.4300208985805512, 0, 2, 5, 6, 2, 7, -1, 6, 6, 1, 7, 2, -.0117178102955222, .4178147912025452, -.0482336990535259, 0, 2, 10, 4, 6, 8, -1, 13, 4, 3, 8, 2, .0842771306633949, .053461279720068, -.379521906375885, 0, 2, 0, 8, 2, 9, -1, 0, 11, 2, 3, 3, .0142118399962783, .0449009388685226, -.4298149943351746, 0, 2, 0, 7, 5, 3, -1, 0, 8, 5, 1, 3, .001502834027633071, .0822276398539543, -.2470639944076538, 0, 2, 8, 1, 7, 2, -1, 8, 2, 7, 1, 2, .0100035797804594, -.057221669703722, .3460937142372131, 0, 2, 7, 5, 3, 5, -1, 8, 5, 1, 5, 3, -.009070632047951221, .450580894947052, -.0427953191101551, 0, 2, 19, 2, 1, 2, -1, 19, 3, 1, 1, 2, -.0003314162022434175, .1833691000938416, -.1075994968414307, 0, 2, 6, 7, 10, 11, -1, 11, 7, 5, 11, 2, .19723279774189, -.030363829806447, .6642342805862427, 0, 2, 9, 19, 6, 1, -1, 11, 19, 2, 1, 3, -.007125880103558302, -.8922504782676697, .0256699901074171, 0, 2, 3, 0, 12, 1, -1, 7, 0, 4, 1, 3, .00869213417172432, -.0707643702626228, .2821052968502045, 0, 2, 4, 1, 6, 5, -1, 6, 1, 2, 5, 3, .008926212787628174, .0710782334208488, -.3023256063461304, 0, 2, 6, 12, 12, 6, -1, 10, 12, 4, 6, 3, .0572860091924667, .0509741306304932, -.3919695019721985, 0, 2, 16, 13, 2, 3, -1, 16, 14, 2, 1, 3, .0037920880131423473, .0338419415056705, -.510162889957428, 0, 2, 7, 14, 4, 2, -1, 7, 15, 4, 1, 2, -.0014508679741993546, .3087914884090424, -.063845083117485, 0, 2, 7, 14, 2, 2, -1, 7, 15, 2, 1, 2, .00098390132188797, -.1302956938743591, .1460441052913666, 0, 3, 3, 10, 2, 4, -1, 3, 10, 1, 2, 2, 4, 12, 1, 2, 2, -.0017221809830516577, .2915700972080231, -.0685495585203171, 0, 2, 0, 3, 2, 6, -1, 0, 5, 2, 2, 3, .0109482500702143, .0343514084815979, -.4770225882530212, 0, 3, 1, 10, 2, 2, -1, 1, 10, 1, 1, 2, 2, 11, 1, 1, 2, -1717630948405713e-20, .1605526953935623, -.1169084012508392, 0, 2, 16, 4, 4, 3, -1, 16, 5, 4, 1, 3, -.005488420836627483, -.4341588914394379, .0461062416434288, 0, 3, 5, 10, 2, 4, -1, 5, 10, 1, 2, 2, 6, 12, 1, 2, 2, -.0030975250992923975, .3794333934783936, -.05686055123806, 0, 2, 5, 11, 13, 2, -1, 5, 12, 13, 1, 2, .006418208125978708, -.1585821062326431, .1233541965484619, 0, 2, 10, 2, 3, 11, -1, 11, 2, 1, 11, 3, .0118312397971749, -.0409292913973331, .458789587020874, 0, 2, 10, 2, 4, 4, -1, 10, 4, 4, 2, 2, .013540499843657, -.0537255592644215, .3505612015724182, 0, 2, 8, 8, 6, 2, -1, 10, 8, 2, 2, 3, -.002593215089291334, .1101052016019821, -.1675221025943756, 0, 2, 11, 2, 3, 3, -1, 12, 2, 1, 3, 3, .0016856270376592875, .0665743574500084, -.3083502054214478, 0, 3, 6, 18, 14, 2, -1, 6, 18, 7, 1, 2, 13, 19, 7, 1, 2, .002652469091117382, .0663184821605682, -.2786133885383606, 0, 2, 17, 7, 1, 12, -1, 17, 11, 1, 4, 3, -.007734172977507114, .1971835941076279, -.1078291982412338, 0, 2, 10, 5, 10, 3, -1, 10, 6, 10, 1, 3, .005094427149742842, .0853374898433685, -.2484700977802277, 0, 2, 6, 1, 3, 3, -1, 7, 1, 1, 3, 3, -.0029162371065467596, -.4747635126113892, .033566489815712, 0, 2, 13, 8, 3, 1, -1, 14, 8, 1, 1, 3, .0030121419113129377, -.0475753806531429, .4258680045604706, 0, 2, 10, 14, 2, 6, -1, 10, 16, 2, 2, 3, .0031694869976490736, -.1051945015788078, .1716345995664597, 0, 2, 4, 1, 12, 14, -1, 8, 1, 4, 14, 3, .2232756018638611, -.0143702095374465, .9248365163803101, 0, 2, 14, 1, 6, 14, -1, 16, 1, 2, 14, 3, -.0955850481987, -.7420663833618164, .0278189703822136, 0, 3, 3, 16, 2, 2, -1, 3, 16, 1, 1, 2, 4, 17, 1, 1, 2, 3477372956695035e-20, -.1276578009128571, .129266694188118, 0, 2, 0, 16, 2, 2, -1, 0, 17, 2, 1, 2, 7245977030834183e-20, -.1651857942342758, .1003680974245071, -1.0566600561141968, 59, 0, 3, 15, 6, 4, 6, -1, 15, 6, 2, 3, 2, 17, 9, 2, 3, 2, -.006577827036380768, .3381525874137878, -.1528190970420837, 0, 2, 12, 5, 2, 2, -1, 12, 6, 2, 1, 2, -.0010922809597104788, .2228236943483353, -.1930849999189377, 0, 2, 7, 6, 6, 13, -1, 9, 6, 2, 13, 3, -.0297595895826817, .2595987021923065, -.1540940999984741, 0, 2, 1, 9, 6, 5, -1, 3, 9, 2, 5, 3, -.0131475403904915, .1903381049633026, -.1654399931430817, 0, 2, 0, 5, 3, 4, -1, 0, 7, 3, 2, 2, -.0014396329643204808, .200717106461525, -.1233894005417824, 0, 3, 4, 1, 16, 2, -1, 4, 1, 8, 1, 2, 12, 2, 8, 1, 2, -.0035928250290453434, .2398552000522614, -.129221498966217, 0, 3, 1, 18, 4, 2, -1, 1, 18, 2, 1, 2, 3, 19, 2, 1, 2, -.0015314699849113822, -.4901489913463593, .102750301361084, 0, 2, 7, 7, 3, 4, -1, 8, 7, 1, 4, 3, -.0062372139655053616, .31214639544487, -.114056296646595, 0, 2, 3, 4, 9, 3, -1, 6, 4, 3, 3, 3, -.033364649862051, -.4952087998390198, .0513284504413605, 0, 2, 4, 6, 6, 10, -1, 6, 6, 2, 10, 3, -.0228276997804642, .3255882859230042, -.0650893077254295, 0, 2, 9, 0, 8, 10, -1, 13, 0, 4, 10, 2, -.0861990973353386, -.6764633059501648, .0269856993108988, 0, 2, 8, 0, 8, 1, -1, 12, 0, 4, 1, 2, -.002106598112732172, .2245243042707443, -.1261022984981537, 0, 3, 6, 2, 8, 16, -1, 6, 2, 4, 8, 2, 10, 10, 4, 8, 2, .0391201488673687, .1132939979434013, -.2686063051223755, 0, 3, 14, 10, 2, 10, -1, 14, 10, 1, 5, 2, 15, 15, 1, 5, 2, .0035082739777863026, -.1135995984077454, .2564977109432221, 0, 2, 12, 11, 1, 2, -1, 12, 12, 1, 1, 2, .0005928989849053323, -.1494296938180924, .164098396897316, 0, 2, 16, 0, 3, 8, -1, 17, 0, 1, 8, 3, .0007176685030572116, .0999056920409203, -.2196796983480454, 0, 2, 14, 0, 6, 10, -1, 17, 0, 3, 10, 2, -.0218036007136106, -.3171172142028809, .082889586687088, 0, 2, 16, 0, 3, 5, -1, 17, 0, 1, 5, 3, -.003296277951449156, -.3804872930049896, .0608193799853325, 0, 2, 4, 5, 11, 2, -1, 4, 6, 11, 1, 2, .0024196270387619734, -.0960130169987679, .2854058146476746, 0, 2, 1, 0, 2, 1, -1, 2, 0, 1, 1, 2, -.00044187481398694217, .2212793976068497, -.0974349081516266, 0, 2, 0, 0, 2, 3, -1, 0, 1, 2, 1, 3, .0034523929934948683, .0375531204044819, -.5796905159950256, 0, 2, 11, 6, 6, 11, -1, 13, 6, 2, 11, 3, -.0218346007168293, .295621395111084, -.0800483003258705, 0, 2, 14, 0, 3, 1, -1, 15, 0, 1, 1, 3, -.00021309500152710825, .2281450927257538, -.1011418998241425, 0, 2, 19, 7, 1, 2, -1, 19, 8, 1, 1, 2, -.0016166249988600612, -.5054119825363159, .0447645410895348, 0, 2, 17, 0, 3, 9, -1, 18, 0, 1, 9, 3, .007595960982143879, .0459865406155586, -.4119768142700195, 0, 2, 12, 7, 3, 4, -1, 13, 7, 1, 4, 3, .003860180964693427, -.0865631699562073, .2480999976396561, 0, 3, 0, 1, 14, 2, -1, 0, 1, 7, 1, 2, 7, 2, 7, 1, 2, .006062223110347986, -.0755573734641075, .2843326032161713, 0, 2, 3, 1, 3, 2, -1, 4, 1, 1, 2, 3, -.0017097420059144497, -.3529582023620606, .0584104992449284, 0, 2, 4, 0, 15, 2, -1, 9, 0, 5, 2, 3, .0165155790746212, -.0804869532585144, .2353743016719818, 0, 2, 10, 2, 6, 1, -1, 12, 2, 2, 1, 3, .004846510011702776, .041895218193531, -.4844304919242859, 0, 2, 9, 4, 6, 11, -1, 11, 4, 2, 11, 3, -.0311671700328588, .1919230967760086, -.1026815995573998, 0, 2, 2, 16, 2, 4, -1, 2, 18, 2, 2, 2, .0006189228151924908, -.210857704281807, .0938869267702103, 0, 2, 6, 17, 6, 3, -1, 8, 17, 2, 3, 3, .0119463102892041, .0390961691737175, -.6224862933158875, 0, 2, 7, 9, 6, 2, -1, 9, 9, 2, 2, 3, -.0075677200220525265, .1593683958053589, -.1225078031420708, 0, 2, 6, 8, 9, 2, -1, 9, 8, 3, 2, 3, -.0537474118173122, -.5562217831611633, .0411900095641613, 0, 3, 6, 6, 2, 10, -1, 6, 6, 1, 5, 2, 7, 11, 1, 5, 2, .0155135300010443, -.0398268811404705, .6240072846412659, 0, 2, 0, 11, 2, 3, -1, 0, 12, 2, 1, 3, .0015246650436893106, .0701386779546738, -.3078907132148743, 0, 2, 11, 15, 4, 1, -1, 13, 15, 2, 1, 2, -.0004831510013900697, .178876593708992, -.109586201608181, 0, 2, 6, 17, 1, 2, -1, 6, 18, 1, 1, 2, .0027374739293009043, .0274785906076431, -.8848956823348999, 0, 2, 0, 0, 6, 20, -1, 2, 0, 2, 20, 3, -.0657877177000046, -.4643214046955109, .0350371487438679, 0, 2, 3, 10, 2, 2, -1, 4, 10, 1, 2, 2, .0012409730115905404, -.0964792370796204, .2877922058105469, 0, 2, 4, 7, 3, 5, -1, 5, 7, 1, 5, 3, .0008139880956150591, .1151171997189522, -.1676616072654724, 0, 2, 3, 12, 6, 2, -1, 5, 12, 2, 2, 3, .0239018201828003, -.0326031893491745, .6001734733581543, 0, 2, 6, 15, 7, 4, -1, 6, 17, 7, 2, 2, .0275566000491381, -.0661373436450958, .2999447882175446, 0, 3, 17, 16, 2, 2, -1, 17, 16, 1, 1, 2, 18, 17, 1, 1, 2, -.00038070970913395286, -.3388118147850037, .0644507706165314, 0, 2, 15, 1, 3, 16, -1, 16, 1, 1, 16, 3, -.0013335429830476642, .1458866000175476, -.1321762055158615, 0, 2, 6, 16, 6, 3, -1, 8, 16, 2, 3, 3, -.009350799024105072, -.5117782950401306, .0349694713950157, 0, 2, 15, 14, 3, 2, -1, 15, 15, 3, 1, 2, .00762152299284935, .0232495293021202, -.6961941123008728, 0, 2, 12, 16, 1, 2, -1, 12, 17, 1, 1, 2, -5340786083252169e-20, .2372737973928452, -.0869107097387314, 0, 3, 0, 2, 4, 4, -1, 0, 2, 2, 2, 2, 2, 4, 2, 2, 2, -.0015332329785451293, .192284107208252, -.1042239964008331, 0, 3, 1, 1, 6, 4, -1, 1, 1, 3, 2, 2, 4, 3, 3, 2, 2, .004313589073717594, -.0962195470929146, .2560121119022369, 0, 2, 1, 18, 1, 2, -1, 1, 19, 1, 1, 2, -.000230428806389682, -.3156475126743317, .0588385984301567, 0, 2, 4, 7, 2, 3, -1, 4, 8, 2, 1, 3, -.007841182872653008, -.6634092926979065, .0245009995996952, 0, 2, 1, 0, 9, 14, -1, 1, 7, 9, 7, 2, .1710374057292938, .033831499516964, -.4561594128608704, 0, 3, 4, 9, 2, 6, -1, 4, 9, 1, 3, 2, 5, 12, 1, 3, 2, -.001601114054210484, .2157489061355591, -.0836225301027298, 0, 2, 3, 9, 4, 3, -1, 5, 9, 2, 3, 2, -.0105357803404331, .2455231994390488, -.0823844894766808, 0, 2, 0, 9, 2, 4, -1, 0, 11, 2, 2, 2, -.005835163872689009, -.4780732989311218, .0440862216055393, 0, 2, 16, 6, 3, 10, -1, 17, 6, 1, 10, 3, -.0187061093747616, -.6002402901649475, .0214100405573845, 0, 2, 16, 11, 2, 1, -1, 17, 11, 1, 1, 2, -.0009330743923783302, .2432359009981155, -.0741657167673111, -.9769343137741089, 88, 0, 2, 5, 7, 4, 4, -1, 5, 9, 4, 2, 2, .0106462296098471, -.1386138945817947, .2649407088756561, 0, 2, 10, 11, 9, 2, -1, 13, 11, 3, 2, 3, .0352982692420483, -.075821727514267, .3902106881141663, 0, 3, 15, 10, 2, 2, -1, 15, 10, 1, 1, 2, 16, 11, 1, 1, 2, .0007563838735222816, -.095521442592144, .2906199991703033, 0, 2, 10, 6, 6, 14, -1, 10, 13, 6, 7, 2, .092497706413269, -.2770423889160156, .0794747024774551, 0, 2, 14, 7, 3, 5, -1, 15, 7, 1, 5, 3, -.002934087999165058, .2298953980207443, -.0785500109195709, 0, 2, 6, 11, 12, 3, -1, 10, 11, 4, 3, 3, -.0865358486771584, .4774481058120728, -.006823122035712004, 0, 2, 17, 16, 1, 2, -1, 17, 17, 1, 1, 2, 54699288739357144e-21, -.2264260947704315, .0881921127438545, 0, 2, 8, 5, 5, 4, -1, 8, 7, 5, 2, 2, -.0365925207734108, .2735387086868286, -.0986067429184914, 0, 2, 11, 6, 4, 2, -1, 11, 7, 4, 1, 2, .0026469118893146515, -.0440839789807796, .3144528865814209, 0, 3, 3, 4, 8, 2, -1, 3, 4, 4, 1, 2, 7, 5, 4, 1, 2, -.004427181091159582, .2382272928953171, -.0867842733860016, 0, 2, 0, 8, 6, 6, -1, 2, 8, 2, 6, 3, -.005188248120248318, .1504276990890503, -.1267210990190506, 0, 2, 7, 4, 6, 2, -1, 7, 5, 6, 1, 2, .004553040023893118, -.0559450201690197, .3650163114070892, 0, 2, 7, 3, 6, 3, -1, 9, 3, 2, 3, 3, .0145624103024602, .0363977700471878, -.5355919003486633, 0, 2, 2, 17, 3, 3, -1, 2, 18, 3, 1, 3, 6867756746942177e-20, -.1747962981462479, .1106870993971825, 0, 2, 3, 10, 6, 1, -1, 5, 10, 2, 1, 3, -.005974490195512772, .3107787072658539, -.0665302276611328, 0, 2, 7, 2, 6, 2, -1, 9, 2, 2, 2, 3, -.0058691250160336494, -.3190149068832398, .063931830227375, 0, 2, 4, 11, 9, 1, -1, 7, 11, 3, 1, 3, -.0111403102055192, .2436479032039642, -.0809351801872253, 0, 2, 7, 7, 11, 12, -1, 7, 13, 11, 6, 2, -.0586435310542583, -.7608326077461243, .0308096297085285, 0, 2, 3, 2, 3, 4, -1, 4, 2, 1, 4, 3, -.0046097282320261, -.45315021276474, .0298790596425533, 0, 2, 9, 7, 9, 3, -1, 12, 7, 3, 3, 3, -.00930321030318737, .1451337933540344, -.1103316992521286, 0, 3, 15, 11, 2, 6, -1, 15, 11, 1, 3, 2, 16, 14, 1, 3, 2, .0013253629440441728, -.0976989567279816, .196464404463768, 0, 2, 0, 5, 5, 3, -1, 0, 6, 5, 1, 3, .004980076104402542, .0336480811238289, -.3979220986366272, 0, 2, 8, 1, 6, 12, -1, 10, 1, 2, 12, 3, -.007654216140508652, .090841993689537, -.1596754938364029, 0, 2, 3, 7, 15, 13, -1, 8, 7, 5, 13, 3, -.3892059028148651, -.6657109260559082, .0190288294106722, 0, 2, 0, 9, 9, 9, -1, 0, 12, 9, 3, 3, -.1001966968178749, -.5755926966667175, .0242827795445919, 0, 2, 16, 0, 3, 8, -1, 17, 0, 1, 8, 3, .0007354121189564466, .0879198014736176, -.161953404545784, 0, 2, 16, 2, 4, 2, -1, 18, 2, 2, 2, 2, -.0034802639856934547, .2606449127197266, -.0602008104324341, 0, 2, 13, 0, 6, 5, -1, 16, 0, 3, 5, 2, .008400042541325092, -.1097972989082336, .1570730954408646, 0, 2, 15, 1, 3, 2, -1, 16, 1, 1, 2, 3, .0023786011151969433, .0360582396388054, -.4727719128131867, 0, 2, 11, 8, 3, 2, -1, 12, 8, 1, 2, 3, .007383168209344149, -.0357563607394695, .4949859082698822, 0, 3, 1, 8, 2, 12, -1, 1, 8, 1, 6, 2, 2, 14, 1, 6, 2, .003211562056094408, -.1012556031346321, .1574798971414566, 0, 2, 0, 1, 6, 12, -1, 2, 1, 2, 12, 3, -.0782096683979034, -.7662708163261414, .0229658298194408, 0, 2, 19, 17, 1, 3, -1, 19, 18, 1, 1, 3, 5330398926162161e-20, -.1341435015201569, .1111491993069649, 0, 2, 11, 3, 3, 10, -1, 12, 3, 1, 10, 3, -.009641915559768677, .2506802976131439, -.0666081383824348, 0, 2, 8, 1, 9, 8, -1, 11, 1, 3, 8, 3, -.0710926726460457, -.4005681872367859, .0402977913618088, 0, 3, 18, 16, 2, 2, -1, 18, 16, 1, 1, 2, 19, 17, 1, 1, 2, .00035171560011804104, .041861180216074, -.3296119868755341, 0, 3, 18, 16, 2, 2, -1, 18, 16, 1, 1, 2, 19, 17, 1, 1, 2, -.0003345815057400614, -.2602983117103577, .0678927376866341, 0, 2, 6, 13, 2, 6, -1, 6, 15, 2, 2, 3, -.0041451421566307545, .2396769970655441, -.0720933377742767, 0, 2, 9, 14, 2, 2, -1, 9, 15, 2, 1, 2, .003175450023263693, -.0712352693080902, .241284504532814, 0, 3, 14, 10, 2, 4, -1, 14, 10, 1, 2, 2, 15, 12, 1, 2, 2, -.005518449004739523, .5032023787498474, -.0296866800636053, 0, 3, 0, 15, 2, 2, -1, 0, 15, 1, 1, 2, 1, 16, 1, 1, 2, -.00030242869979701936, .2487905025482178, -.0567585788667202, 0, 3, 6, 7, 2, 2, -1, 6, 7, 1, 1, 2, 7, 8, 1, 1, 2, -.0013125919504091144, .3174780011177063, -.0418458618223667, 0, 3, 11, 18, 2, 2, -1, 11, 18, 1, 1, 2, 12, 19, 1, 1, 2, -.00027123570907860994, -.2704207003116608, .0568289905786514, 0, 3, 0, 0, 6, 4, -1, 0, 0, 3, 2, 2, 3, 2, 3, 2, 2, -.007324177771806717, .2755667865276337, -.0542529709637165, 0, 2, 4, 1, 6, 6, -1, 6, 1, 2, 6, 3, -.0168517101556063, -.3485291004180908, .0453689992427826, 0, 2, 15, 13, 5, 4, -1, 15, 15, 5, 2, 2, .0299021005630493, .0316210798919201, -.4311437010765076, 0, 2, 7, 17, 6, 1, -1, 9, 17, 2, 1, 3, .0028902660124003887, .0380299612879753, -.3702709972858429, 0, 2, 16, 19, 4, 1, -1, 18, 19, 2, 1, 2, -.0019242949783802032, .2480027973651886, -.059333298355341, 0, 2, 16, 16, 4, 4, -1, 18, 16, 2, 4, 2, .004935414995998144, -.0830684006214142, .2204380929470062, 0, 2, 7, 8, 9, 4, -1, 10, 8, 3, 4, 3, .0820756033062935, -.0194134395569563, .6908928751945496, 0, 3, 16, 18, 2, 2, -1, 16, 18, 1, 1, 2, 17, 19, 1, 1, 2, -.0002469948958605528, -.2466056942939758, .0647764503955841, 0, 3, 2, 9, 2, 4, -1, 2, 9, 1, 2, 2, 3, 11, 1, 2, 2, -.0018365769647061825, .2883616089820862, -.0533904582262039, 0, 3, 0, 3, 8, 4, -1, 0, 3, 4, 2, 2, 4, 5, 4, 2, 2, -.004955381155014038, .1274082958698273, -.1255941987037659, 0, 2, 0, 1, 8, 1, -1, 4, 1, 4, 1, 2, -.008308662101626396, .2347811013460159, -.07167649269104, 0, 2, 0, 5, 8, 9, -1, 4, 5, 4, 9, 2, -.1087991967797279, -.2599223852157593, .0586897395551205, 0, 2, 7, 18, 6, 2, -1, 9, 18, 2, 2, 3, -.009678645059466362, -.707204282283783, .0187492594122887, 0, 2, 0, 4, 1, 12, -1, 0, 8, 1, 4, 3, -.0271368306130171, -.5838422775268555, .021684130653739, 0, 2, 19, 13, 1, 6, -1, 19, 15, 1, 2, 3, -.006538977846503258, -.5974891185760498, .0214803107082844, 0, 2, 2, 8, 6, 8, -1, 4, 8, 2, 8, 3, -.0120956301689148, .1326903998851776, -.099722720682621, 0, 2, 0, 0, 9, 17, -1, 3, 0, 3, 17, 3, -.1677609980106354, -.5665506720542908, .0321230888366699, 0, 2, 7, 9, 6, 8, -1, 9, 9, 2, 8, 3, -.0132625503465533, .1149559020996094, -.1173838973045349, 0, 2, 5, 10, 9, 4, -1, 8, 10, 3, 4, 3, .076744519174099, -.0314132310450077, .5993549227714539, 0, 2, 5, 0, 8, 3, -1, 5, 1, 8, 1, 3, .005078522954136133, -.0529119409620762, .2334239929914475, 0, 3, 16, 6, 4, 4, -1, 16, 6, 2, 2, 2, 18, 8, 2, 2, 2, .0031800279393792152, -.0777343884110451, .1765290945768356, 0, 3, 17, 4, 2, 8, -1, 17, 4, 1, 4, 2, 18, 8, 1, 4, 2, -.0017729829996824265, .1959162950515747, -.0797521993517876, 0, 2, 2, 16, 1, 3, -1, 2, 17, 1, 1, 3, -.00048560940194875, -.2880037128925324, .0490471199154854, 0, 2, 2, 16, 1, 3, -1, 2, 17, 1, 1, 3, .00036554320831783116, .0679228976368904, -.2249943017959595, 0, 2, 11, 0, 1, 3, -1, 11, 1, 1, 1, 3, -.0002693867136258632, .1658217012882233, -.0897440984845161, 0, 2, 11, 2, 9, 7, -1, 14, 2, 3, 7, 3, .0786842331290245, .0260816793888807, -.5569373965263367, 0, 2, 10, 2, 3, 6, -1, 11, 2, 1, 6, 3, -.0007377481088042259, .1403687000274658, -.1180030032992363, 0, 2, 5, 9, 15, 2, -1, 5, 10, 15, 1, 2, .0239578299224377, .0304707400500774, -.4615997970104218, 0, 2, 8, 16, 6, 2, -1, 8, 17, 6, 1, 2, -.001623908057808876, .2632707953453064, -.0567653700709343, 0, 3, 9, 16, 10, 2, -1, 9, 16, 5, 1, 2, 14, 17, 5, 1, 2, -.0009081974858418107, .1546245962381363, -.1108706966042519, 0, 3, 9, 17, 2, 2, -1, 9, 17, 1, 1, 2, 10, 18, 1, 1, 2, .0003980624896939844, .0556303709745407, -.2833195924758911, 0, 3, 10, 15, 6, 4, -1, 10, 15, 3, 2, 2, 13, 17, 3, 2, 2, .002050644950941205, -.0916048362851143, .1758553981781006, 0, 2, 4, 5, 15, 12, -1, 9, 5, 5, 12, 3, .0267425496131182, .062003031373024, -.2448700070381165, 0, 2, 11, 13, 2, 3, -1, 11, 14, 2, 1, 3, -.0021497008856385946, .2944929897785187, -.0532181486487389, 0, 2, 8, 13, 7, 3, -1, 8, 14, 7, 1, 3, .005667165853083134, -.0642982423305511, .249056801199913, 0, 2, 1, 12, 1, 2, -1, 1, 13, 1, 1, 2, 6831790233263746e-20, -.1681963056325913, .0965485796332359, 0, 3, 16, 18, 2, 2, -1, 16, 18, 1, 1, 2, 17, 19, 1, 1, 2, .0001760043960530311, .0653080120682716, -.2426788061857224, 0, 2, 1, 19, 18, 1, -1, 7, 19, 6, 1, 3, .004186160862445831, -.0979885831475258, .1805288940668106, 0, 2, 1, 17, 6, 1, -1, 4, 17, 3, 1, 2, -.0021808340679854155, .192312702536583, -.0941239297389984, 0, 2, 1, 3, 1, 12, -1, 1, 9, 1, 6, 2, .021730400621891, .0355785116553307, -.4508853852748871, 0, 2, 0, 9, 3, 6, -1, 0, 11, 3, 2, 3, -.0147802699357271, -.4392701089382172, .0317355915904045, 0, 2, 5, 4, 3, 10, -1, 6, 4, 1, 10, 3, -.0036145891062915325, .1981147974729538, -.0777014195919037, 0, 2, 6, 17, 2, 1, -1, 7, 17, 1, 1, 2, .0018892709631472826, .0199624393135309, -.7204172015190125, 0, 2, 1, 0, 6, 12, -1, 3, 0, 2, 12, 3, -.0013822480104863644, .0984669476747513, -.1488108038902283, 0, 2, 4, 7, 9, 2, -1, 7, 7, 3, 2, 3, -.0039505911991000175, .1159323006868362, -.1279197037220001, -1.012935996055603, 58, 0, 2, 6, 11, 9, 1, -1, 9, 11, 3, 1, 3, -.0193955395370722, .474747508764267, -.1172109022736549, 0, 2, 17, 10, 2, 10, -1, 17, 15, 2, 5, 2, .013118919916451, -.255521297454834, .1637880057096481, 0, 3, 4, 10, 2, 10, -1, 4, 10, 1, 5, 2, 5, 15, 1, 5, 2, -.0005160680157132447, .1945261955261231, -.17448890209198, 0, 2, 12, 3, 3, 12, -1, 13, 3, 1, 12, 3, -.0131841599941254, .441814512014389, -.0900487527251244, 0, 3, 15, 3, 4, 6, -1, 15, 3, 2, 3, 2, 17, 6, 2, 3, 2, .0034657081123441458, -.1347709000110626, .1805634051561356, 0, 2, 12, 8, 3, 3, -1, 13, 8, 1, 3, 3, .006298020016402006, -.0541649796068668, .3603338003158569, 0, 2, 4, 14, 2, 4, -1, 4, 16, 2, 2, 2, .0016879989998415112, -.1999794989824295, .1202159970998764, 0, 2, 6, 16, 1, 3, -1, 6, 17, 1, 1, 3, .00036039709812030196, .1052414029836655, -.2411606013774872, 0, 2, 1, 1, 2, 3, -1, 2, 1, 1, 3, 2, -.001527684973552823, .2813552916049957, -.0689648166298866, 0, 2, 0, 2, 4, 1, -1, 2, 2, 2, 1, 2, .00350335706025362, -.0825195834040642, .4071359038352966, 0, 2, 8, 17, 12, 3, -1, 12, 17, 4, 3, 3, -.004733716137707233, .1972700953483582, -.117101401090622, 0, 2, 9, 16, 6, 4, -1, 11, 16, 2, 4, 3, -.0115571497008204, -.5606111288070679, .0681709572672844, 0, 2, 4, 6, 3, 6, -1, 4, 9, 3, 3, 2, -.0274457205086946, .4971862137317658, -.0623801499605179, 0, 2, 6, 2, 12, 9, -1, 6, 5, 12, 3, 3, -.0528257787227631, .169212207198143, -.1309355050325394, 0, 3, 6, 0, 14, 20, -1, 6, 0, 7, 10, 2, 13, 10, 7, 10, 2, -.2984969913959503, -.6464967131614685, .0400768183171749, 0, 3, 15, 16, 2, 2, -1, 15, 16, 1, 1, 2, 16, 17, 1, 1, 2, -.00026307269581593573, .2512794137001038, -.0894948393106461, 0, 3, 15, 16, 2, 2, -1, 15, 16, 1, 1, 2, 16, 17, 1, 1, 2, .00023261709429789335, -.0868439897894859, .2383197993040085, 0, 2, 19, 8, 1, 3, -1, 19, 9, 1, 1, 3, .00023631360090803355, .1155446022748947, -.189363494515419, 0, 2, 13, 4, 1, 2, -1, 13, 5, 1, 1, 2, .0020742209162563086, -.0485948510468006, .5748599171638489, 0, 2, 0, 4, 4, 2, -1, 0, 5, 4, 1, 2, -.007030888926237822, -.5412080883979797, .0487437509000301, 0, 2, 19, 5, 1, 6, -1, 19, 7, 1, 2, 3, .00826522707939148, .0264945197850466, -.6172845959663391, 0, 2, 16, 0, 2, 1, -1, 17, 0, 1, 1, 2, .0002004276029765606, -.1176863014698029, .1633386015892029, 0, 2, 13, 1, 1, 3, -1, 13, 2, 1, 1, 3, .0016470040427520871, -.0599549189209938, .3517970144748688, 0, 2, 17, 17, 1, 3, -1, 17, 18, 1, 1, 3, -.0003564253856893629, -.344202995300293, .0649482533335686, 0, 3, 5, 4, 8, 8, -1, 5, 4, 4, 4, 2, 9, 8, 4, 4, 2, -.0309358704835176, .1997970044612885, -.0976936966180801, 0, 3, 1, 2, 2, 2, -1, 1, 2, 1, 1, 2, 2, 3, 1, 1, 2, -.0006357877282425761, -.3148139119148254, .0594250410795212, 0, 3, 0, 0, 8, 6, -1, 0, 0, 4, 3, 2, 4, 3, 4, 3, 2, -.0118621801957488, .2004369050264359, -.0894475430250168, 0, 2, 6, 3, 4, 2, -1, 6, 4, 4, 1, 2, .007150893099606037, -.0390060618519783, .5332716107368469, 0, 2, 1, 0, 3, 3, -1, 1, 1, 3, 1, 3, -.0020059191156178713, -.2846972048282623, .0707236081361771, 0, 2, 6, 1, 7, 2, -1, 6, 2, 7, 1, 2, .0036412389017641544, -.1066031977534294, .2494480013847351, 0, 2, 2, 6, 12, 6, -1, 6, 6, 4, 6, 3, -.1346742957830429, .4991008043289185, -.0403322204947472, 0, 2, 1, 16, 9, 2, -1, 4, 16, 3, 2, 3, -.002254765946418047, .1685169041156769, -.1111928001046181, 0, 2, 7, 15, 6, 4, -1, 9, 15, 2, 4, 3, .004384228959679604, .0861394926905632, -.2743177115917206, 0, 2, 6, 15, 12, 1, -1, 12, 15, 6, 1, 2, -.007336116861552, .2487521022558212, -.0959191620349884, 0, 2, 17, 17, 1, 3, -1, 17, 18, 1, 1, 3, .0006466691265814006, .0674315765500069, -.3375408053398132, 0, 3, 17, 15, 2, 2, -1, 17, 15, 1, 1, 2, 18, 16, 1, 1, 2, .0002298376930411905, -.0839030519127846, .24584099650383, 0, 2, 3, 13, 3, 3, -1, 3, 14, 3, 1, 3, .006703907158225775, .0290793292224407, -.6905593872070312, 0, 2, 10, 17, 1, 3, -1, 10, 18, 1, 1, 3, 5073488864582032e-20, -.1569671928882599, .1196542978286743, 0, 2, 4, 0, 14, 8, -1, 11, 0, 7, 8, 2, -.2033555954694748, -.6950634717941284, .0275075193494558, 0, 2, 2, 0, 12, 2, -1, 6, 0, 4, 2, 3, .009493941441178322, -.0874493718147278, .2396833002567291, 0, 2, 2, 0, 4, 3, -1, 4, 0, 2, 3, 2, -.002405524021014571, .2115096002817154, -.1314893066883087, 0, 2, 13, 1, 1, 2, -1, 13, 2, 1, 1, 2, -.00011342419747961685, .1523378938436508, -.1272590011358261, 0, 2, 7, 5, 3, 6, -1, 8, 5, 1, 6, 3, .0149922100827098, -.0341279692947865, .506240725517273, 0, 3, 18, 2, 2, 2, -1, 18, 2, 1, 1, 2, 19, 3, 1, 1, 2, .0007406820077449083, .0487647503614426, -.4022532105445862, 0, 2, 15, 1, 2, 14, -1, 16, 1, 1, 14, 2, -.004245944786816835, .2155476063489914, -.0871269926428795, 0, 3, 15, 6, 2, 2, -1, 15, 6, 1, 1, 2, 16, 7, 1, 1, 2, .0006865510949864984, -.0754187181591988, .2640590965747833, 0, 2, 3, 1, 6, 3, -1, 5, 1, 2, 3, 3, -.0167514607310295, -.6772903203964233, .0329187288880348, 0, 3, 7, 16, 2, 2, -1, 7, 16, 1, 1, 2, 8, 17, 1, 1, 2, -.00026301678735762835, .2272586971521378, -.0905348733067513, 0, 3, 5, 17, 2, 2, -1, 5, 17, 1, 1, 2, 6, 18, 1, 1, 2, .0004339861043263227, .0558943785727024, -.3559266924858093, 0, 2, 9, 10, 6, 10, -1, 11, 10, 2, 10, 3, -.0201501492410898, .1916276067495346, -.0949299708008766, 0, 2, 10, 17, 6, 3, -1, 12, 17, 2, 3, 3, -.0144521296024323, -.6851034164428711, .0254221707582474, 0, 2, 14, 5, 2, 10, -1, 14, 10, 2, 5, 2, -.0211497396230698, .3753319084644318, -.0514965802431107, 0, 2, 11, 12, 6, 2, -1, 11, 13, 6, 1, 2, .0211377702653408, .0290830805897713, -.8943036794662476, 0, 2, 8, 1, 1, 3, -1, 8, 2, 1, 1, 3, .0011524349683895707, -.0696949362754822, .2729980051517487, 0, 3, 12, 15, 2, 2, -1, 12, 15, 1, 1, 2, 13, 16, 1, 1, 2, -.00019070580310653895, .1822811961174011, -.0983670726418495, 0, 3, 6, 8, 6, 4, -1, 6, 8, 3, 2, 2, 9, 10, 3, 2, 2, -.0363496318459511, -.8369309902191162, .0250557605177164, 0, 2, 7, 5, 3, 5, -1, 8, 5, 1, 5, 3, -.009063207544386387, .4146350026130676, -.0544134490191936, 0, 2, 0, 5, 7, 3, -1, 0, 6, 7, 1, 3, -.0020535490475594997, -.1975031048059464, .1050689965486527, -.9774749279022217, 93, 0, 2, 7, 9, 6, 6, -1, 9, 9, 2, 6, 3, -.0227170195430517, .2428855001926422, -.1474552005529404, 0, 2, 5, 7, 8, 8, -1, 5, 11, 8, 4, 2, .0255059506744146, -.2855173945426941, .1083720996975899, 0, 3, 4, 9, 2, 6, -1, 4, 9, 1, 3, 2, 5, 12, 1, 3, 2, -.0026640091091394424, .2927573025226593, -.1037271022796631, 0, 2, 10, 11, 6, 1, -1, 12, 11, 2, 1, 3, -.003811528906226158, .2142689973115921, -.1381113976240158, 0, 2, 13, 6, 6, 11, -1, 15, 6, 2, 11, 3, -.0167326908558607, .2655026018619537, -.0439113304018974, 0, 3, 8, 17, 2, 2, -1, 8, 17, 1, 1, 2, 9, 18, 1, 1, 2, .0004927701083943248, .02110455930233, -.4297136068344116, 0, 2, 4, 12, 12, 1, -1, 8, 12, 4, 1, 3, -.0366911105811596, .5399242043495178, -.0436488017439842, 0, 2, 11, 17, 3, 2, -1, 11, 18, 3, 1, 2, .0012615970335900784, -.1293386965990067, .1663877069950104, 0, 2, 8, 17, 6, 1, -1, 10, 17, 2, 1, 3, -.008410685695707798, -.9469841122627258, .0214658491313457, 0, 2, 4, 1, 14, 6, -1, 4, 3, 14, 2, 3, .0649027228355408, -.0717277601361275, .2661347985267639, 0, 2, 14, 2, 2, 12, -1, 14, 8, 2, 6, 2, .0303050000220537, -.0827824920415878, .2769432067871094, 0, 2, 12, 13, 3, 2, -1, 12, 14, 3, 1, 2, .0025875340215861797, -.1296616941690445, .1775663048028946, 0, 2, 6, 1, 6, 1, -1, 8, 1, 2, 1, 3, -.00702404510229826, -.6424317955970764, .0399432107806206, 0, 2, 10, 6, 6, 1, -1, 12, 6, 2, 1, 3, -.0010099769569933414, .1417661011219025, -.1165997013449669, 0, 2, 3, 19, 2, 1, -1, 4, 19, 1, 1, 2, -4117907155887224e-20, .1568766981363297, -.1112734004855156, 0, 3, 18, 16, 2, 2, -1, 18, 16, 1, 1, 2, 19, 17, 1, 1, 2, -.0004729315114673227, -.3355455994606018, .0459777303040028, 0, 2, 16, 11, 3, 7, -1, 17, 11, 1, 7, 3, -.0017178079579025507, .1695290952920914, -.1057806983590126, 0, 2, 19, 5, 1, 6, -1, 19, 8, 1, 3, 2, -.0133331697434187, -.5825781226158142, .0309784300625324, 0, 2, 9, 8, 4, 3, -1, 9, 9, 4, 1, 3, -.0018783430568873882, .1426687985658646, -.111312597990036, 0, 3, 16, 8, 4, 4, -1, 16, 8, 2, 2, 2, 18, 10, 2, 2, 2, -.006576598156243563, .2756136059761047, -.0531003288924694, 0, 3, 2, 8, 2, 2, -1, 2, 8, 1, 1, 2, 3, 9, 1, 1, 2, -7721038127783686e-20, .1324024051427841, -.111677996814251, 0, 3, 3, 5, 6, 4, -1, 3, 5, 3, 2, 2, 6, 7, 3, 2, 2, .0219685398042202, -.0269681606441736, .5006716847419739, 0, 3, 2, 3, 8, 16, -1, 2, 3, 4, 8, 2, 6, 11, 4, 8, 2, -.027445750311017, -.240867406129837, .0604782700538635, 0, 2, 17, 17, 1, 3, -1, 17, 18, 1, 1, 3, 7830584945622832e-20, -.1333488970994949, .1012346968054771, 0, 2, 7, 2, 8, 11, -1, 11, 2, 4, 11, 2, .0701906830072403, -.0548637807369232, .2480994015932083, 0, 2, 13, 3, 6, 14, -1, 16, 3, 3, 14, 2, -.0719021335244179, -.3784669041633606, .0422109998762608, 0, 2, 0, 9, 18, 2, -1, 6, 9, 6, 2, 3, -.1078097969293594, -.3748658895492554, .0428334400057793, 0, 2, 6, 10, 14, 3, -1, 6, 11, 14, 1, 3, .0014364200178533792, .0804763585329056, -.1726378947496414, 0, 2, 10, 9, 9, 3, -1, 13, 9, 3, 3, 3, .068289190530777, -.0355957895517349, .4076131880283356, 0, 3, 3, 5, 4, 6, -1, 3, 5, 2, 3, 2, 5, 8, 2, 3, 2, -.00680371792986989, .1923379004001617, -.0823680236935616, 0, 2, 3, 7, 3, 7, -1, 4, 7, 1, 7, 3, -.0005619348958134651, .1305712014436722, -.1435514986515045, 0, 2, 2, 8, 11, 6, -1, 2, 10, 11, 2, 3, -.0582766495645046, -.3012543916702271, .0528196506202221, 0, 2, 8, 9, 6, 3, -1, 8, 10, 6, 1, 3, -.006120571866631508, .2204390019178391, -.0756917521357536, 0, 2, 3, 3, 3, 11, -1, 4, 3, 1, 11, 3, -.0135943097993732, -.3904936015605927, .0418571084737778, 0, 2, 0, 19, 6, 1, -1, 3, 19, 3, 1, 2, .0013626200379803777, -.0953634232282639, .1497032046318054, 0, 2, 18, 18, 1, 2, -1, 18, 19, 1, 1, 2, -.0001507421984570101, -.2394558042287827, .0647983327507973, 0, 3, 8, 0, 12, 6, -1, 8, 0, 6, 3, 2, 14, 3, 6, 3, 2, -.077414259314537, .5594198107719421, -.0245168805122375, 0, 2, 19, 5, 1, 3, -1, 19, 6, 1, 1, 3, .0009211787255480886, .0549288615584373, -.2793481051921845, 0, 2, 5, 8, 2, 1, -1, 6, 8, 1, 1, 2, .001025078003294766, -.0621673092246056, .249763697385788, 0, 2, 13, 11, 2, 1, -1, 14, 11, 1, 1, 2, -.000811747508123517, .2343793958425522, -.0657258108258247, 0, 2, 3, 6, 15, 13, -1, 8, 6, 5, 13, 3, .0834310203790665, .0509548000991344, -.3102098107337952, 0, 2, 4, 3, 6, 2, -1, 6, 3, 2, 2, 3, -.009201445616781712, -.3924253880977631, .0329269506037235, 0, 2, 0, 18, 1, 2, -1, 0, 19, 1, 1, 2, -.00029086650465615094, -.3103975057601929, .0497118197381496, 0, 2, 7, 8, 2, 6, -1, 8, 8, 1, 6, 2, .00775768980383873, -.0440407507121563, .3643135130405426, 0, 2, 3, 0, 6, 19, -1, 5, 0, 2, 19, 3, -.1246609017252922, -.819570779800415, .0191506408154964, 0, 2, 3, 1, 6, 5, -1, 5, 1, 2, 5, 3, .0132425501942635, .0389888398349285, -.3323068022727966, 0, 2, 17, 14, 3, 6, -1, 17, 16, 3, 2, 3, -.006677012890577316, -.357901394367218, .0404602102935314, 0, 2, 17, 13, 2, 6, -1, 18, 13, 1, 6, 2, -.0027479929849505424, .2525390088558197, -.0564278215169907, 0, 2, 17, 18, 2, 2, -1, 18, 18, 1, 2, 2, .0008265965152531862, -.07198865711689, .2278047949075699, 0, 2, 11, 14, 9, 4, -1, 14, 14, 3, 4, 3, -.0501534007489681, -.630364716053009, .027462050318718, 0, 3, 15, 8, 4, 6, -1, 15, 8, 2, 3, 2, 17, 11, 2, 3, 2, .007420314941555262, -.0666107162833214, .2778733968734741, 0, 2, 1, 16, 1, 3, -1, 1, 17, 1, 1, 3, -.0006795178051106632, -.3632706105709076, .0427954308688641, 0, 2, 7, 0, 3, 14, -1, 8, 0, 1, 14, 3, -.0019305750029161572, .1419623047113419, -.1075998023152351, 0, 2, 12, 0, 2, 1, -1, 13, 0, 1, 1, 2, -.0003813267103396356, .2159176021814346, -.0702026635408401, 0, 2, 7, 9, 6, 5, -1, 10, 9, 3, 5, 2, -.0709903463721275, .4526660144329071, -.0407504811882973, 0, 2, 15, 5, 4, 9, -1, 17, 5, 2, 9, 2, -.0533680804073811, -.6767405867576599, .0192883405834436, 0, 2, 11, 0, 6, 6, -1, 13, 0, 2, 6, 3, -.0200648494064808, -.4336543083190918, .0318532884120941, 0, 3, 16, 15, 2, 2, -1, 16, 15, 1, 1, 2, 17, 16, 1, 1, 2, .001197636011056602, -.0265598706901073, .5079718232154846, 0, 3, 16, 15, 2, 2, -1, 16, 15, 1, 1, 2, 17, 16, 1, 1, 2, -.0002269730030093342, .1801259964704514, -.0836065486073494, 0, 2, 13, 2, 2, 18, -1, 13, 11, 2, 9, 2, .0152626996859908, -.2023892998695374, .067422017455101, 0, 2, 8, 4, 8, 10, -1, 8, 9, 8, 5, 2, -.2081176936626434, .6694386005401611, -.0224521104246378, 0, 2, 8, 3, 2, 3, -1, 8, 4, 2, 1, 3, .001551436958834529, -.0751218423247337, .17326919734478, 0, 2, 11, 1, 6, 9, -1, 11, 4, 6, 3, 3, -.0529240109026432, .2499251961708069, -.0628791674971581, 0, 2, 15, 4, 5, 6, -1, 15, 6, 5, 2, 3, -.0216488502919674, -.2919428050518036, .0526144914329052, 0, 3, 12, 18, 2, 2, -1, 12, 18, 1, 1, 2, 13, 19, 1, 1, 2, -.00022905069636180997, -.2211730033159256, .0631683394312859, 0, 2, 1, 17, 1, 3, -1, 1, 18, 1, 1, 3, 5017007060814649e-20, -.1151070967316628, .1161144003272057, 0, 2, 12, 19, 2, 1, -1, 13, 19, 1, 1, 2, -.0001641606941120699, .1587152034044266, -.0826006010174751, 0, 2, 8, 10, 6, 6, -1, 10, 10, 2, 6, 3, -.0120032895356417, .1221809014678001, -.112296998500824, 0, 2, 14, 2, 6, 5, -1, 16, 2, 2, 5, 3, -.0177841000258923, -.3507278859615326, .0313419215381145, 0, 2, 9, 5, 2, 6, -1, 9, 7, 2, 2, 3, -.006345758214592934, .1307806968688965, -.1057441011071205, 0, 2, 1, 15, 2, 2, -1, 2, 15, 1, 2, 2, -.0007952324231155217, .1720467060804367, -.086001992225647, 0, 2, 18, 17, 1, 3, -1, 18, 18, 1, 1, 3, -.00031029590172693133, -.2843317091464996, .0518171191215515, 0, 2, 10, 14, 4, 6, -1, 10, 16, 4, 2, 3, -.0170537102967501, .3924242854118347, -.0401432700455189, 0, 2, 9, 7, 3, 2, -1, 10, 7, 1, 2, 3, .004650495946407318, -.031837560236454, .4123769998550415, 0, 3, 6, 9, 6, 2, -1, 6, 9, 3, 1, 2, 9, 10, 3, 1, 2, -.0103587601333857, -.5699319839477539, .0292483791708946, 0, 2, 0, 2, 1, 12, -1, 0, 6, 1, 4, 3, -.0221962407231331, -.4560528993606567, .0262859892100096, 0, 2, 4, 0, 15, 1, -1, 9, 0, 5, 1, 3, -.0070536029525101185, .1599832028150559, -.091594859957695, 0, 3, 9, 0, 8, 2, -1, 9, 0, 4, 1, 2, 13, 1, 4, 1, 2, -.0005709429970011115, -.1407632976770401, .1028741970658302, 0, 2, 12, 2, 8, 1, -1, 16, 2, 4, 1, 2, -.0022152599412947893, .1659359931945801, -.0852739885449409, 0, 2, 7, 1, 10, 6, -1, 7, 3, 10, 2, 3, -.0280848909169436, .2702234089374542, -.0558738112449646, 0, 2, 18, 6, 2, 3, -1, 18, 7, 2, 1, 3, .0021515151020139456, .0424728915095329, -.3200584948062897, 0, 3, 4, 12, 2, 2, -1, 4, 12, 1, 1, 2, 5, 13, 1, 1, 2, -.00029733829433098435, .1617716997861862, -.0851155892014503, 0, 2, 6, 6, 6, 2, -1, 8, 6, 2, 2, 3, -.0166947804391384, -.4285877048969269, .0305416099727154, 0, 2, 0, 9, 9, 6, -1, 3, 9, 3, 6, 3, .1198299005627632, -.0162772908806801, .7984678149223328, 0, 2, 17, 18, 2, 2, -1, 18, 18, 1, 2, 2, -.000354994204826653, .1593593955039978, -.0832728818058968, 0, 2, 11, 2, 6, 16, -1, 13, 2, 2, 16, 3, -.0182262696325779, .1952728033065796, -.0739398896694183, 0, 2, 2, 4, 15, 13, -1, 7, 4, 5, 13, 3, -.00040238600922748446, .0791018083691597, -.2080612927675247, 0, 2, 16, 2, 3, 10, -1, 17, 2, 1, 10, 3, .0004089206049684435, .1003663018345833, -.1512821018695831, 0, 2, 6, 10, 2, 1, -1, 7, 10, 1, 1, 2, .0009536811267025769, -.0730116665363312, .2175202071666718, 0, 2, 1, 1, 18, 16, -1, 10, 1, 9, 16, 2, .4308179914951325, -.0274506993591785, .570615828037262, 0, 2, 14, 4, 3, 15, -1, 15, 4, 1, 15, 3, .0005356483161449432, .1158754006028175, -.1279056072235107, 0, 2, 19, 13, 1, 2, -1, 19, 14, 1, 1, 2, 2443073026370257e-20, -.1681662946939468, .0804499834775925, 0, 2, 2, 6, 5, 8, -1, 2, 10, 5, 4, 2, -.0553456507623196, .4533894956111908, -.0312227793037891]);

  class SmartCroppr extends Croppr {
    constructor(element, options) {
      super(element, options, true);
      let originalInit = null;
      if (this.options.onInitialize) {
        originalInit = this.options.onInitialize;
      }
      const init = instance => {
        if (originalInit) originalInit(instance);
        if (options.smartcrop) {
          this.parseSmartOptions(options);
          this.setBestCrop(this.smartOptions, true);
        }
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
      let defaultSmartOptions = {
        face: false,
        facePreResize: 768,
        minScale: null,
        minWidth: null,
        minHeight: null,
        aspectRatio: null,
        maxAspectRatio: null,
        onSmartCropDone: null
      };
      this.smartOptions = {};
      for (var key in defaultSmartOptions) {
        let defaultValue = defaultSmartOptions[key];
        if (options.smartOptions && options.smartOptions[key]) {
          defaultValue = options.smartOptions[key];
        }
        this.smartOptions[key] = defaultValue;
      }
      if (!this.smartOptions.face) this.smartOptions.facePreResize = null;
      let tempMinRatio = options.aspectRatio ? options.aspectRatio : this.smartOptions.aspectRatio ? this.smartOptions.aspectRatio : null;
      let tempMaxRatio = options.maxAspectRatio ? options.maxAspectRatio : this.smartOptions.maxAspectRatio ? this.smartOptions.maxAspectRatio : null;
      let minRatio = tempMinRatio;
      let maxRatio = tempMaxRatio;
      if (tempMaxRatio && tempMaxRatio < tempMinRatio) {
        minRatio = tempMaxRatio;
        maxRatio = tempMinRatio;
      }
      this.smartOptions.minRatio = minRatio;
      this.smartOptions.maxRatio = maxRatio;
      return this.smartOptions;
    }
    getSizeFromRatios() {
      let {
        width,
        height
      } = this.sourceSize;
      let {
        minRatio,
        maxRatio,
        minWidth,
        minHeight,
        minScale
      } = this.smartOptions;
      let imageRatio = width / height;
      if (!minRatio && minWidth && minHeight) {
        minRatio = minWidth / minHeight;
      }
      let cropRatio = imageRatio;
      if (maxRatio) {
        if (imageRatio > maxRatio) cropRatio = maxRatio;else if (imageRatio < minRatio) cropRatio = minRatio;
      } else {
        cropRatio = minRatio;
      }
      let cropWidth = width;
      let cropHeight = cropWidth / cropRatio;
      if (cropHeight > height) {
        cropWidth = height * cropRatio;
        cropHeight = height;
      }
      if (!minScale && (minWidth || minHeight)) {
        if (!minWidth) minWidth = minHeight * cropRatio;
        if (!minHeight) minHeight = minWidth / cropRatio;
        minScale = Math.min(minWidth / width, minHeight / height);
        minScale = minScale > 1 ? 1 : minScale;
      }
      minScale = minScale !== null ? minScale > 0.5 ? minScale : 0.5 : 1.0;
      return {
        width: cropWidth * minScale,
        height: cropHeight * minScale,
        minScale: minScale
      };
    }
    setBestCrop(smartOptions, crop = true) {
      const maxDimension = smartOptions.facePreResize;
      let size = this.getSizeFromRatios();
      if (size) {
        smartOptions.minScale = size.minScale;
        smartOptions.width = size.width;
        smartOptions.height = size.height;
        const scaleImage = (img, maxDimension, callback) => {
          var width = img.naturalWidth || img.width;
          var height = img.naturalHeight || img.height;
          if (!maxDimension || width < maxDimension && height < maxDimension) return callback(img, 1);
          var scale = Math.min(maxDimension / width, maxDimension / height);
          var canvas = document.createElement('canvas');
          canvas.width = ~~(width * scale);
          canvas.height = ~~(height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          var result = document.createElement('img');
          result.onload = function () {
            callback(result, scale);
          };
          result.src = canvas.toDataURL();
        };
        const scaleImageCallback = (new_img, scale) => {
          this.launchSmartCrop(new_img, smartOptions, scale, crop);
        };
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = this.imageEl.src;
        img.onload = function () {
          scaleImage(img, maxDimension, scaleImageCallback);
        };
      } else {
        setSmartCrop();
      }
    }
    launchSmartCrop(img, smartOptions, scale = 1.0, crop = true) {
      smartOptions.width *= scale;
      smartOptions.height *= scale;
      const setSmartCrop = data => {
        if (!data) data = null;
        this.smartCropData = null;
        if (data && crop === true) {
          this.setValue(data, false, "real");
        }
      };
      const convertValuesWithScale = data => {
        return {
          x: data.x / scale,
          y: data.y / scale,
          width: data.width / scale,
          height: data.height / scale
        };
      };
      const smartCropFunc = (img, options) => {
        smartcrop.crop(img, options).then(result => {
          let smartCropData = convertValuesWithScale(result.topCrop, scale);
          setSmartCrop(smartCropData);
          if (options.onSmartCropDone) options.onSmartCropDone(smartCropData);
        });
      };
      if (smartOptions.face) {
        var tracker = new tracking.ObjectTracker('face');
        tracking.track(img, tracker);
        tracker.on('track', function (event) {
          let maxTotal = 0;
          event.data.map(function (face) {
            if (face.total > maxTotal) maxTotal = face.total;
          });
          if (maxTotal > 0) {
            smartOptions.boost = [];
            event.data.map(function (face) {
              let weight = 1.0;
              {
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
      } else smartCropFunc(img, smartOptions);
    }
    setImage(src, callback = null, smartcrop$$1 = true, smartOptions = null) {
      let smartCallback = callback;
      if (smartcrop$$1 === true) {
        let options = this.options;
        options.smartOptions = smartOptions;
        this.parseSmartOptions(options);
        smartCallback = () => {
          this.setBestCrop(this.smartOptions, true);
          if (callback) callback();
        };
      }
      super.setImage(src, smartCallback);
      return this;
    }
  }

  return SmartCroppr;

}));
