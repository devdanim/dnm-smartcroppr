
var start = new Date();

var smartCropCallback = function(data) {
    var end = new Date();
    var seconds = (end - start) / 1000;
    console.log("crop done in " + seconds + " seconds", data); 
}

var croppr = new SmartCroppr("#cropper", {
    returnMode: "real",
    responsive: true,
    aspectRatio: 1,
    maxAspectRatio: 0.5,
    preview: "#cropPreview",
    smartcrop: true,
    debug: true,
    smartOptions: {
        face: false,
        preResize: 768,
        minWidth: 500,
        minHeight: 500,
        onSmartCropDone: data => { 
            smartCropCallback(data)
        }
    },
    onInitialize: (instance, mediaNode) => console.log(instance, mediaNode),
    onCropEnd: data => { console.log("END:", data) },
    onCropStart: data => {},
    onCropMove: data => {}
});

var setImageBtn = document.getElementsByClassName("setImage");

for(var i=0; i < setImageBtn.length; i++) {
    setImageBtn[i].addEventListener("click", function() {
        start = new Date();
        var src = this.getAttribute("data-img");
        var imgSrc = this.getAttribute("data-img");
        var videoSrc = this.getAttribute("data-video");
        croppr[imgSrc ? 'setImage' : 'setVideo'](imgSrc || videoSrc, (instance, mediaNode) => console.log(instance, mediaNode), true, {
            face: false,
            minScale: 1,
            minWidth: 500,
            minHeight: 500,
            onSmartCropDone: data => {
                smartCropCallback(data)
            }
        });
    })
}
