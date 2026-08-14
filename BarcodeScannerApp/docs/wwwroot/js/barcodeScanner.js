let scanner = null;

let candidateBarcode = "";
let matchingReads = 0;
let lastReadTime = 0;
let lastAcceptedBarcode = "";

window.barcodeScanner = {
    start: async function (dotNetHelper) {
        scanner = new Html5Qrcode("barcodeVideo", {
            formatsToSupport: [
                Html5QrcodeSupportedFormats.CODE_128
            ]
        });

        await scanner.start(
            { facingMode: "environment" },
            {
                fps: 12,
                qrbox: { width: 350, height: 140 },
                aspectRatio: 1.7778,
                disableFlip: true
            },
            (decodedText) => {
                const now = Date.now();

                // Already accepted this item. Don't add it repeatedly.
                if (decodedText === lastAcceptedBarcode) {
                    return;
                }

                // Require the same number three times within 750 milliseconds.
                if (
                    decodedText === candidateBarcode &&
                    now - lastReadTime < 750
                ) {
                    matchingReads++;
                } else {
                    candidateBarcode = decodedText;
                    matchingReads = 1;
                }

                lastReadTime = now;

                // Accept only after three matching reads.
                if (matchingReads >= 3) {
                    lastAcceptedBarcode = decodedText;
                    candidateBarcode = "";
                    matchingReads = 0;

                    dotNetHelper.invokeMethodAsync(
                        "BarcodeDetected",
                        decodedText
                    );
                }
            },
            () => {
                // Normal while searching for a barcode.
            }
        );
    },

    stop: async function () {
        if (scanner) {
            try {
                await scanner.stop();
                await scanner.clear();
            } catch {
            }

            scanner = null;
        }

        candidateBarcode = "";
        matchingReads = 0;
        lastAcceptedBarcode = "";
    }
};