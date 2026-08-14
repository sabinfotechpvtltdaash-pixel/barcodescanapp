let scanner = null;
let lastValue = "";

window.barcodeScanner = {
    start: async function (dotNetHelper) {
        const formats = [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.CODABAR
        ];

        scanner = new Html5Qrcode("barcodeVideo", {
            formatsToSupport: formats
        });

        await scanner.start(
            { facingMode: "environment" },
            {
                fps: 15,
                qrbox: { width: 350, height: 140 },
                aspectRatio: 1.7778,
                disableFlip: true
            },
            (decodedText) => {
                if (decodedText !== lastValue) {
                    lastValue = decodedText;
                    dotNetHelper.invokeMethodAsync("BarcodeDetected", decodedText);
                }
            },
            () => {
                // Scan failure is normal while camera searches for a barcode.
            }
        );
    },

    stop: async function () {
        if (scanner) {
            try {
                await scanner.stop();
                await scanner.clear();
            } catch {
                // Scanner may already be stopped.
            }

            scanner = null;
        }

        lastValue = "";
    }
};