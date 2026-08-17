window.barcodeScanner = {

    scanner: null,
    dotNetReference: null,

    // =====================================================
    // SETTINGS
    // =====================================================

    cooldownTime: 3000,       // 3 seconds
    lostBarcodeTime: 700,     // barcode must disappear
    isProcessing: false,

    lastBarcode: null,

    barcodeVisible: false,
    lastSeenTime: 0,

    readyForNewBarcode: true,

    cooldownTimer: null,
    lostTimer: null,


    // =====================================================
    // START CAMERA
    // =====================================================

    start: async function (dotNetReference) {

        this.dotNetReference = dotNetReference;

        this.isProcessing = false;

        this.lastBarcode = null;

        this.barcodeVisible = false;

        this.lastSeenTime = 0;

        this.readyForNewBarcode = true;


        try {

            // -------------------------------------------------
            // REMOVE OLD SCANNER
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
            // CHECK LIBRARY
            // -------------------------------------------------

            if (typeof Html5Qrcode === "undefined") {

                await this.dotNetReference.invokeMethodAsync(
                    "ScannerError",
                    "Barcode scanner library is not loaded."
                );

                return;
            }


            // -------------------------------------------------
            // CREATE SCANNER
            // -------------------------------------------------

            this.scanner = new Html5Qrcode(
                "barcodeCamera",
                {
                    useBarCodeDetectorIfSupported: true,

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

                // 5 frames/sec is enough for inventory scanning
                fps: 5,

                // Your labels have horizontal 1D barcodes
                qrbox: {
                    width: 320,
                    height: 110
                },

                aspectRatio: 16 / 9,

                disableFlip: true
            };


            // -------------------------------------------------
            // START CAMERA
            // -------------------------------------------------

            await this.scanner.start(

                {
                    facingMode: "environment"
                },

                config,


                // =================================================
                // BARCODE FOUND
                // =================================================

                async (decodedText) => {

                    await this.handleDetection(
                        decodedText
                    );

                },


                // =================================================
                // BARCODE NOT FOUND
                // =================================================

                (errorMessage) => {

                    this.handleBarcodeLost();

                }

            );

        }
        catch (error) {

            console.error(
                "Scanner start error:",
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
    // BARCODE DETECTED
    // =====================================================

    handleDetection: async function (decodedText) {

        if (!decodedText) {
            return;
        }


        const barcode =
            decodedText.trim();


        if (!barcode) {
            return;
        }


        // Barcode is currently visible

        this.barcodeVisible = true;

        this.lastSeenTime = Date.now();


        // -------------------------------------------------
        // CANCEL "BARCODE LOST" TIMER
        // -------------------------------------------------

        if (this.lostTimer) {

            clearTimeout(
                this.lostTimer
            );

            this.lostTimer = null;
        }


        // -------------------------------------------------
        // CAMERA IS IN 3 SECOND COOLDOWN
        // -------------------------------------------------

        if (this.isProcessing) {

            return;
        }


        // -------------------------------------------------
        // SAME PHYSICAL BARCODE STILL IN CAMERA
        // -------------------------------------------------

        if (
            this.lastBarcode === barcode &&
            !this.readyForNewBarcode
        ) {

            // IMPORTANT:
            //
            // Do NOT scan again.
            //
            // Do NOT play repeat sound again.
            //
            // The user is probably still holding
            // the same physical barcode.

            return;
        }


        // -------------------------------------------------
        // READY FOR NEW BARCODE
        // -------------------------------------------------

        if (!this.readyForNewBarcode) {

            return;
        }


        // -------------------------------------------------
        // LOCK IMMEDIATELY
        // -------------------------------------------------

        this.isProcessing = true;

        this.readyForNewBarcode = false;

        this.lastBarcode = barcode;


        // -------------------------------------------------
        // PAUSE DECODER
        // -------------------------------------------------

        try {

            if (this.scanner) {

                this.scanner.pause(false);

            }

        }
        catch (error) {

            console.log(
                "Pause error:",
                error
            );

        }


        // -------------------------------------------------
        // SEND BARCODE TO BLAZOR
        // -------------------------------------------------

        try {

            await this.dotNetReference.invokeMethodAsync(
                "BarcodeDetected",
                barcode
            );

        }
        catch (error) {

            console.error(
                "Blazor barcode callback error:",
                error
            );

        }


        // -------------------------------------------------
        // 3 SECOND COOLDOWN
        // -------------------------------------------------

        this.cooldownTimer =
            setTimeout(

                () => {

                    this.finishCooldown();

                },

                this.cooldownTime

            );

    },


    // =====================================================
    // AFTER 3 SECOND COOLDOWN
    // =====================================================

    finishCooldown: function () {

        this.isProcessing = false;


        try {

            if (this.scanner) {

                this.scanner.resume();

            }

        }
        catch (error) {

            console.log(
                "Resume error:",
                error
            );

        }


        // -------------------------------------------------
        // IMPORTANT
        //
        // DO NOT immediately make it ready.
        //
        // We need the previous barcode to disappear.
        // -------------------------------------------------

        if (!this.barcodeVisible) {

            this.readyForNewBarcode = true;

            this.lastBarcode = null;

        }

    },


    // =====================================================
    // BARCODE LOST
    // =====================================================

    handleBarcodeLost: function () {

        this.barcodeVisible = false;


        // -------------------------------------------------
        // If we are still in cooldown, don't do anything.
        // -------------------------------------------------

        if (this.isProcessing) {
            return;
        }


        // -------------------------------------------------
        // Wait a little to make sure barcode is actually gone
        // -------------------------------------------------

        if (this.lostTimer) {
            return;
        }


        this.lostTimer =
            setTimeout(

                () => {

                    this.lostTimer = null;


                    if (!this.barcodeVisible) {

                        this.readyForNewBarcode = true;

                        this.lastBarcode = null;

                    }

                },

                this.lostBarcodeTime

            );

    },


    // =====================================================
    // STOP CAMERA
    // =====================================================

    stop: async function () {

        this.isProcessing = true;

        this.readyForNewBarcode = false;


        if (this.cooldownTimer) {

            clearTimeout(
                this.cooldownTimer
            );

            this.cooldownTimer = null;
        }


        if (this.lostTimer) {

            clearTimeout(
                this.lostTimer
            );

            this.lostTimer = null;
        }


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
    // SOUND ENGINE
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