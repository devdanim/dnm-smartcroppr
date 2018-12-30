var croppr = new SmartCroppr("#cropper", {
    returnMode: "real",
    responsive: true,
    aspectRatio: 0.5,
    maxAspectRatio: 1,
    preview: "#cropPreview",
    smartcrop: true,
    onSmartCropDone: smartCropData => { console.log(smartCropData) },
    onInitialize: instance => {},
    onCropEnd: data => {},
    onCropStart: (data) => {},
    onCropMove: data => {}
});

var setImageBtn = document.getElementsByClassName("setImage");

for(var i=0; i < setImageBtn.length; i++) {
    setImageBtn[i].addEventListener("click", function() {
        var callback = function() {
            console.log("New image loaded : " + src)
        };
        var src = this.getAttribute("data-img");
        croppr.setImage(src, callback, true);
    })
}
