let controls = null;
let lastValue = "";

window.barcodeScanner = {
    start: async function (dotNetHelper) {
        const video = document.getElementById("barcodeVideo");
        const reader = new ZXingBrowser.BrowserMultiFormatReader();

        controls = await reader.decodeFromConstraints(
            {
                audio: false,
                video: {
                    facingMode: { ideal: "environment" }
                }
            },
            video,
            (result) => {
                if (result) {
                    const value = result.getText();

                    if (value !== lastValue) {
                        lastValue = value;
                        dotNetHelper.invokeMethodAsync("BarcodeDetected", value);
                    }
                }
            });
    },

    stop: function () {
        if (controls) {
            controls.stop();
            controls = null;
        }

        lastValue = "";
    }
};