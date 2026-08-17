window.barcodeScanner = {

    scanner: null,
    dotNetReference: null,

    // =====================================================
    // SETTINGS
    // =====================================================

    // User wants continuous scanning
    // but 3 seconds between accepted scans
    cooldownTime: 3000,

    // How many times the SAME decoded value must appear
    // before we trust it
    requiredConfirmations: 3,

    // Time window in which confirmations are collected
    confirmationWindow: 1200,

    // =====================================================
    // STATE
    // =====================================================

    isProcessing: false,

    lastAcceptedBarcode: null,

    candidateBarcode: null,

    candidateCount: 0,

    candidateStartTime: 0,

    confirmationTimer: null,

    cooldownTimer: null,


    // =====================================================
    // START CAMERA
    // =====================================================

    start: async function (dotNetReference) {

        this.dotNetReference =
            dotNetReference;


        this.resetState();


        try {

            // ---------------------------------------------
            // CHECK LIBRARY
            // ---------------------------------------------

            if (
                typeof Html5Qrcode ===
                "undefined"
            ) {

                await this.dotNetReference
                    .invokeMethodAsync(
                        "ScannerError",
                        "Barcode scanner library is not loaded."
                    );

                return;
            }


            // ---------------------------------------------
            // REMOVE OLD SCANNER
            // ---------------------------------------------

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


            // ---------------------------------------------
            // CREATE SCANNER
            // ---------------------------------------------

            this.scanner =
                new Html5Qrcode(
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


            // ---------------------------------------------
            // CAMERA CONFIG
            // ---------------------------------------------

            const config = {

                // Scan 5 times per second
                fps: 5,

                // IMPORTANT:
                // Only one barcode should be inside this box

                qrbox: {
                    width: 320,
                    height: 100
                },

                aspectRatio: 16 / 9,

                disableFlip: true

            };


            // ---------------------------------------------
            // START
            // ---------------------------------------------

            await this.scanner.start(

                {
                    facingMode: "environment"
                },

                config,


                // =========================================
                // SUCCESS CALLBACK
                // =========================================

                async (decodedText) => {

                    await this.processDetection(
                        decodedText
                    );

                },


                // =========================================
                // ERROR CALLBACK
                // =========================================

                (errorMessage) => {

                    // IMPORTANT:
                    //
                    // DO NOT call FAILED here.
                    //
                    // This callback happens constantly
                    // while the camera is looking for a barcode.

                }

            );

        }
        catch (error) {

            console.error(
                "Scanner start error:",
                error
            );


            await this.dotNetReference
                .invokeMethodAsync(
                    "ScannerError",
                    error?.message ||
                    "Unable to start camera."
                );

        }

    },


    // =====================================================
    // PROCESS EVERY DETECTION
    // =====================================================

    processDetection: async function (
        decodedText
    ) {

        if (!decodedText) {
            return;
        }


        const barcode =
            decodedText.trim();


        if (!barcode) {
            return;
        }


        // =================================================
        // IF CURRENTLY PROCESSING
        // =================================================

        if (this.isProcessing) {

            return;

        }


        // =================================================
        // SAME AS CURRENT CANDIDATE
        // =================================================

        if (
            this.candidateBarcode ===
            barcode
        ) {

            this.candidateCount++;


            // ---------------------------------------------
            // ENOUGH CONFIRMATIONS
            // ---------------------------------------------

            if (
                this.candidateCount >=
                this.requiredConfirmations
            ) {

                await this.acceptBarcode(
                    barcode
                );

            }


            return;
        }


        // =================================================
        // DIFFERENT RESULT
        // =================================================

        // Example:
        //
        // First:
        // 37000123
        //
        // Second:
        // 37000129
        //
        // Third:
        // 37000121
        //
        // This means the camera is not confident.
        //
        // Start confirmation again.

        this.candidateBarcode =
            barcode;

        this.candidateCount = 1;

        this.candidateStartTime =
            Date.now();


        // ---------------------------------------------
        // CANCEL OLD TIMER
        // ---------------------------------------------

        if (this.confirmationTimer) {

            clearTimeout(
                this.confirmationTimer
            );

        }


        // ---------------------------------------------
        // RESET CANDIDATE AFTER WINDOW
        // ---------------------------------------------

        this.confirmationTimer =
            setTimeout(

                () => {

                    this.candidateBarcode =
                        null;

                    this.candidateCount =
                        0;

                },

                this.confirmationWindow

            );

    },


    // =====================================================
    // ACCEPT CONFIRMED BARCODE
    // =====================================================

    acceptBarcode: async function (
        barcode
    ) {

        // ---------------------------------------------
        // LOCK
        // ---------------------------------------------

        this.isProcessing = true;


        // ---------------------------------------------
        // CLEAR CANDIDATE
        // ---------------------------------------------

        this.candidateBarcode =
            null;

        this.candidateCount =
            0;


        if (this.confirmationTimer) {

            clearTimeout(
                this.confirmationTimer
            );

            this.confirmationTimer =
                null;

        }


        // ---------------------------------------------
        // REMEMBER LAST ACCEPTED
        // ---------------------------------------------

        this.lastAcceptedBarcode =
            barcode;


        // ---------------------------------------------
        // PAUSE DECODING
        // ---------------------------------------------

        try {

            if (this.scanner) {

                this.scanner.pause(
                    false
                );

            }

        }
        catch (error) {

            console.log(
                "Scanner pause error:",
                error
            );

        }


        // ---------------------------------------------
        // SEND TO BLAZOR
        // ---------------------------------------------

        try {

            await this.dotNetReference
                .invokeMethodAsync(
                    "BarcodeDetected",
                    barcode
                );

        }
        catch (error) {

            console.error(
                "Barcode callback error:",
                error
            );

        }


        // ---------------------------------------------
        // WAIT 3 SECONDS
        // ---------------------------------------------

        this.cooldownTimer =
            setTimeout(

                () => {

                    this.resumeScanner();

                },

                this.cooldownTime

            );

    },


    // =====================================================
    // RESUME AFTER 3 SECONDS
    // =====================================================

    resumeScanner: function () {

        try {

            if (this.scanner) {

                this.scanner.resume();

            }

        }
        catch (error) {

            console.log(
                "Scanner resume error:",
                error
            );

        }


        // ---------------------------------------------
        // READY FOR NEW CONFIRMATION
        // ---------------------------------------------

        this.isProcessing =
            false;


        this.candidateBarcode =
            null;

        this.candidateCount =
            0;


        this.candidateStartTime =
            0;

    },


    // =====================================================
    // RESET
    // =====================================================

    resetState: function () {

        this.isProcessing =
            false;

        this.lastAcceptedBarcode =
            null;

        this.candidateBarcode =
            null;

        this.candidateCount =
            0;

        this.candidateStartTime =
            0;


        if (this.confirmationTimer) {

            clearTimeout(
                this.confirmationTimer
            );

            this.confirmationTimer =
                null;

        }


        if (this.cooldownTimer) {

            clearTimeout(
                this.cooldownTimer
            );

            this.cooldownTimer =
                null;

        }

    },


    // =====================================================
    // STOP
    // =====================================================

    stop: async function () {

        this.resetState();

        this.isProcessing =
            true;


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
    // HARDWARE INPUT
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