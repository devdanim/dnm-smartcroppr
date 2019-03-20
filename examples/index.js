
var start = new Date();

var smartCropCallback = function(data) {
    var end = new Date();
    var seconds = (end - start) / 1000;
    console.log("crop done in " + seconds + " seconds", data); 
}

var croppr = new SmartCroppr("#cropper", {
    returnMode: "real",
    responsive: true,
    //aspectRatio: 1,
    //maxAspectRatio: 1.5,
    preview: "#cropPreview",
    smartcrop: true,
    debug: true,
    smartOptions: {
        face: true,
        facePreResize: 768,
        minWidth: 500,
        minHeight: 500,
        onSmartCropDone: data => { 
            smartCropCallback(data)
        }
    },
    onInitialize: instance => {},
    onCropEnd: data => { console.log("END:", data) },
    onCropStart: data => {},
    onCropMove: data => {}
});

var setImageBtn = document.getElementsByClassName("setImage");

for(var i=0; i < setImageBtn.length; i++) {
    setImageBtn[i].addEventListener("click", function() {
        start = new Date();
        var callback = function() {
            croppr.resizeTo(100, 100, [0,0], true, "%");
        };
        var src = this.getAttribute("data-img");
        croppr.setImage(src, callback, true, {
            face: true,
            //minScale: 0.5,
            minWidth: 500,
            minHeight: 500,
            onSmartCropDone: data => { 
                smartCropCallback(data)
            }
        });
    })
}
