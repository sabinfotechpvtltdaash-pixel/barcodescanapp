window.barcodeScanner = {

    scanner: null,
    dotNetReference: null,

    // =====================================================
    // START CAMERA
    // =====================================================

    start: async function (dotNetReference) {

        this.dotNetReference = dotNetReference;

        try {

            if (typeof Html5Qrcode === "undefined") {

                await this.dotNetReference.invokeMethodAsync(
                    "ScannerError",
                    "Barcode scanner library not loaded."
                );

                return;
            }


            // Remove old scanner

            if (this.scanner) {

                try {
                    await this.scanner.stop();
                }
                catch (e) {
                }

                this.scanner.clear();

                this.scanner = null;
            }


            this.scanner = new Html5Qrcode("barcodeCamera");


            const config = {

                fps: 10,

                qrbox: {
                    width: 300,
                    height: 120
                },

                aspectRatio: 1.7777778,

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

            };


            await this.scanner.start(

                {
                    facingMode: "environment"
                },

                config,

                async (decodedText) => {

                    if (!decodedText) {
                        return;
                    }

                    await this.dotNetReference.invokeMethodAsync(
                        "BarcodeDetected",
                        decodedText
                    );

                },

                (errorMessage) => {

                    // IMPORTANT:
                    // Don't show FAILED for every camera frame.
                    // html5-qrcode continuously reports "not found"
                    // while searching for a barcode.

                }

            );

        }
        catch (error) {

            await this.dotNetReference.invokeMethodAsync(
                "ScannerError",
                error?.message || "Unable to start camera."
            );

        }

    },


    // =====================================================
    // STOP CAMERA
    // =====================================================

    stop: async function () {

        try {

            if (this.scanner) {

                try {
                    await this.scanner.stop();
                }
                catch (e) {
                }

                try {
                    this.scanner.clear();
                }
                catch (e) {
                }

                this.scanner = null;
            }

        }
        catch (error) {

            console.log(
                "Scanner stop error:",
                error
            );

        }

    },


    // =====================================================
    // FOCUS HARDWARE INPUT
    // =====================================================

    focusHardwareInput: function () {

        const input =
            document.getElementById(
                "hardwareBarcodeInput"
            );

        if (input) {

            input.focus();

            input.select();

        }

    },


    // =====================================================
    // SUCCESS SOUND
    // =====================================================

    playSuccessSound: function () {

        this.playTone(
            900,
            120
        );

    },


    // =====================================================
    // REPEAT SOUND
    // =====================================================

    playRepeatSound: function () {

        this.playTone(
            500,
            180
        );

    },


    // =====================================================
    // FAILED SOUND
    // =====================================================

    playFailedSound: function () {

        this.playTone(
            180,
            350
        );

    },


    // =====================================================
    // SOUND ENGINE
    // =====================================================

    playTone: function (frequency, duration) {

        try {

            const AudioContext =
                window.AudioContext ||
                window.webkitAudioContext;

            if (!AudioContext) {
                return;
            }

            const audioContext =
                new AudioContext();

            const oscillator =
                audioContext.createOscillator();

            const gainNode =
                audioContext.createGain();


            oscillator.connect(
                gainNode
            );

            gainNode.connect(
                audioContext.destination
            );


            oscillator.frequency.value =
                frequency;

            oscillator.type =
                "sine";


            gainNode.gain.setValueAtTime(
                0.25,
                audioContext.currentTime
            );


            gainNode.gain.exponentialRampToValueAtTime(
                0.01,
                audioContext.currentTime +
                duration / 1000
            );


            oscillator.start();

            oscillator.stop(
                audioContext.currentTime +
                duration / 1000
            );


        }
        catch (error) {

            console.log(
                "Audio error:",
                error
            );

        }

    }

};