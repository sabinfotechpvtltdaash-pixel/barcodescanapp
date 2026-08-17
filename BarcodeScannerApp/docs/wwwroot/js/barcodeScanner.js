window.barcodeScanner = {

    scanner: null,
    dotNetReference: null,

    // =====================================================
    // SCANNER CONTROL
    // =====================================================

    isProcessing: false,

    // 5 second waiting period after every accepted scan
    scanCooldown: 5000,

    lastBarcode: null,
    lastScanTime: 0,


    // =====================================================
    // START CAMERA
    // =====================================================

    start: async function (dotNetReference) {

        this.dotNetReference = dotNetReference;

        this.isProcessing = false;
        this.lastBarcode = null;
        this.lastScanTime = 0;


        try {

            if (typeof Html5Qrcode === "undefined") {

                await this.dotNetReference.invokeMethodAsync(
                    "ScannerError",
                    "Barcode scanner library not loaded."
                );

                return;
            }


            // -------------------------------------------------
            // CLEAN OLD SCANNER
            // -------------------------------------------------

            if (this.scanner) {

                try {
                    if (this.scanner.isScanning) {
                        await this.scanner.stop();
                    }
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


            // -------------------------------------------------
            // CREATE SCANNER
            // -------------------------------------------------

            this.scanner = new Html5Qrcode(
                "barcodeCamera",
                {
                    // Use browser native BarcodeDetector
                    // whenever available
                    useBarCodeDetectorIfSupported: true,

                    // Only enable barcode formats you actually use
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
                }
            );


            // -------------------------------------------------
            // CAMERA CONFIG
            // -------------------------------------------------

            const config = {

                // Don't scan 30-60 frames/sec.
                // 5 is enough for inventory scanning.
                fps: 5,


                // IMPORTANT:
                // Your barcode is horizontal/rectangular.
                // Don't use a square scan area.
                qrbox: {
                    width: 320,
                    height: 140
                },


                aspectRatio: 16 / 9,


                disableFlip: true

            };


            // -------------------------------------------------
            // START CAMERA
            // -------------------------------------------------

            await this.scanner.start(

                {
                    facingMode: {
                        exact: "environment"
                    }
                },

                config,


                // =================================================
                // SUCCESS CALLBACK
                // =================================================

                async (decodedText, decodedResult) => {

                    await this.handleBarcode(
                        decodedText
                    );

                },


                // =================================================
                // ERROR CALLBACK
                // =================================================

                (errorMessage) => {

                    // DO NOTHING HERE.

                    // This callback fires continuously while
                    // camera is searching for a barcode.

                    // Do NOT play FAILED sound here.
                }

            );

        }
        catch (error) {

            console.error(
                "Barcode scanner start error:",
                error
            );


            await this.dotNetReference.invokeMethodAsync(
                "ScannerError",
                error?.message ||
                "Unable to start camera."
            );

        }

    },


    // =====================================================
    // HANDLE BARCODE
    // =====================================================

    handleBarcode: async function (decodedText) {

        if (!decodedText) {
            return;
        }


        // -------------------------------------------------
        // IMPORTANT LOCK
        // -------------------------------------------------

        // If one barcode is already being processed,
        // completely ignore all additional detections.

        if (this.isProcessing) {

            return;
        }


        const barcode =
            decodedText
                .trim();


        if (!barcode) {

            return;
        }


        // -------------------------------------------------
        // TIME CHECK
        // -------------------------------------------------

        const now =
            Date.now();


        // Don't accept anything during cooldown

        if (
            now - this.lastScanTime <
            this.scanCooldown
        ) {

            return;
        }


        // -------------------------------------------------
        // LOCK IMMEDIATELY
        // -------------------------------------------------

        this.isProcessing = true;


        this.lastScanTime =
            now;

        this.lastBarcode =
            barcode;


        // -------------------------------------------------
        // PAUSE DECODER
        // -------------------------------------------------

        try {

            if (
                this.scanner &&
                this.scanner.isScanning
            ) {

                // FALSE = keep camera video running
                // but stop barcode decoding

                this.scanner.pause(false);

            }

        }
        catch (error) {

            console.log(
                "Pause scanner error:",
                error
            );

        }


        // -------------------------------------------------
        // SEND TO BLAZOR
        // -------------------------------------------------

        try {

            await this.dotNetReference.invokeMethodAsync(
                "BarcodeDetected",
                barcode
            );

        }
        catch (error) {

            console.error(
                "Blazor barcode error:",
                error
            );

        }


        // -------------------------------------------------
        // WAIT 5 SECONDS
        // -------------------------------------------------

        setTimeout(
            () => {

                this.resumeScanner();

            },

            this.scanCooldown

        );

    },


    // =====================================================
    // RESUME SCANNER
    // =====================================================

    resumeScanner: function () {

        try {

            if (
                this.scanner &&
                !this.scanner.isScanning
            ) {

                // Some versions expose state through
                // pause/resume rather than isScanning.
                // Try resume directly.

                this.scanner.resume();

            }

        }
        catch (error) {

            console.log(
                "Resume scanner error:",
                error
            );

        }


        this.isProcessing =
            false;

    },


    // =====================================================
    // STOP CAMERA
    // =====================================================

    stop: async function () {

        this.isProcessing =
            true;


        try {

            if (this.scanner) {

                try {

                    if (this.scanner.isScanning) {

                        await this.scanner.stop();

                    }

                }
                catch (e) {
                }


                try {

                    this.scanner.clear();

                }
                catch (e) {
                }


                this.scanner =
                    null;

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
    // HARDWARE SCANNER
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
            1000,
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
    // SOUND
    // =====================================================

    playTone: function (
        frequency,
        duration
    ) {

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