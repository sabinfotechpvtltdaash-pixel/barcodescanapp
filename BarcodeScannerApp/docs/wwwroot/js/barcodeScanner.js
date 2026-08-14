let scanner = null;

let candidateBarcode = "";
let matchingReads = 0;
let lastReadTime = 0;
let lastAcceptedBarcode = "";

window.barcodeScanner = {
    start: async function (dotNetHelper) {
        try {
            if (scanner) {
                await window.barcodeScanner.stop();
            }

            scanner = new Html5Qrcode("barcodeCamera", {
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.CODE_93,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.ITF,
                    Html5QrcodeSupportedFormats.CODABAR
                ]
            });

            await scanner.start(
                { facingMode: "environment" },
                {
                    fps: 12,
                    qrbox: { width: 340, height: 150 },
                    aspectRatio: 1.7778,
                    disableFlip: false
                },
                async (decodedText) => {
                    const now = Date.now();

                    // Don't accept the same physical barcode repeatedly.
                    if (decodedText === lastAcceptedBarcode) {
                        return;
                    }

                    // The same value must be read three consecutive times.
                    if (
                        decodedText === candidateBarcode &&
                        now - lastReadTime < 800
                    ) {
                        matchingReads++;
                    } else {
                        candidateBarcode = decodedText;
                        matchingReads = 1;
                    }

                    lastReadTime = now;

                    if (matchingReads >= 3) {
                        lastAcceptedBarcode = decodedText;
                        candidateBarcode = "";
                        matchingReads = 0;

                        await dotNetHelper.invokeMethodAsync(
                            "BarcodeDetected",
                            decodedText
                        );
                    }
                },
                () => {
                    // Normal while camera is searching.
                }
            );
        } catch (error) {
            await dotNetHelper.invokeMethodAsync(
                "ScannerError",
                error?.message || "Unable to start camera"
            );
        }
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
    },

    focusHardwareInput: function () {
        document.getElementById("hardwareBarcodeInput")?.focus();
    }
};