// COPYRIGHT PAUL NIEUWELAAR AND TOM HYDE 2014 ALL RIGHTS RESERVED
// TOUCH THE SHAPE SOURCE CODE DEFAULT.JS

var TTS = TTS || {};

TTS._totalTime = 500;
TTS._timeLeft = 500;
TTS._timeStart = null;
TTS._mode = 1;
TTS._currentShape = null;
TTS._currentColour = null;
TTS._gameOver = true;
TTS._score = 0;
TTS._bestScoreHard = 0; // TTS: Classic
TTS._bestScoreEasy = 0; // TTS: Easy
TTS._bestScoreTimeTrial = 0; // TTS: Time Trial
TTS._bestScoreNormal = 0; // Casual
TTS._bestScoreColour = 0; // TTC: Classic
TTS._bestScoreColourEasy = 0; // TTC: Easy
TTS._bestScoreColourTimeTrial = 0; // TTC: Time Trial
TTS._totalTimePlayed = 0;
TTS._totalShapesTouched = 0;
TTS._soundEnabled = true;
//TTS._colourModeUnlocked = false;
//TTS._timeTrialUnlocked = false;
//TTS._kidsModeUnlocked = false;
TTS._adsDisabled = false;
TTS._appSettings;

TTS.initialise = function () {
    TTS._bestScoreHard = TTS.getAppSetting("_bestScoreHard", 0);
    TTS._bestScoreEasy = TTS.getAppSetting("_bestScoreEasy", 0);
    TTS._bestScoreTimeTrial = TTS.getAppSetting("_bestScoreTimeTrial", 0);
    TTS._bestScoreNormal = TTS.getAppSetting("_bestScoreNormal", 0);
    TTS._bestScoreColour = TTS.getAppSetting("_bestScoreColour", 0);
    TTS._bestScoreColourEasy = TTS.getAppSetting("_bestScoreColourEasy", 0);
    TTS._bestScoreColourTimeTrial = TTS.getAppSetting("_bestScoreColourTimeTrial", 0);

    TTS._totalTimePlayed = TTS.getAppSetting("_totalTimePlayed", 0);
    TTS._totalShapesTouched = TTS.getAppSetting("_totalShapesTouched", 0);

    TTS._soundEnabled = TTS.getAppSetting("_soundEnabled", true);
    //TTS._colourModeUnlocked = TTS.getAppSetting("_colourModeUnlocked", false);
    //TTS._timeTrialUnlocked = TTS.getAppSetting("_timeTrialUnlocked", false);
    //TTS._kidsModeUnlocked = TTS.getAppSetting("_kidsModeUnlocked", false);
    //TTS._adsDisabled = TTS.getAppSetting("_adsDisabled", false);
    TTS.setAppSetting("_adsDisabled", true); // TODO: remove this once ads exist

    // Unlock modes only if purchased or reached the unlock level, and remove ads if purchased
    //if (TTS._colourModeUnlocked || TTS._bestScoreHard >= 100) { TTS.unlockColourMode(); }
    //if (TTS._timeTrialUnlocked || TTS._bestScoreHard >= 50) { TTS.unlockTimeTrialMode(); }
    //if (TTS._kidsModeUnlocked || TTS._bestScoreHard >= 10) { TTS.unlockKidsMode(); }
    if (TTS._adsDisabled) { TTS.unlockAds(); }

    // Enable or disable sound from saved settings
    TTS.updateSoundButton();

    TTS.handleBackButton();

    // Windows API sharing
    if (typeof (Windows) !== "undefined") {
        Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView().addEventListener("datarequested", TTS.windowsShareRequest);
    }

    if (!TTS._adsDisabled) {
        // Windows API Ads
        if (typeof (Windows) !== "undefined" && typeof (Windows.Phone) !== "undefined") {
            TTS.createWindowsAd();
        }
    }

    TTS.preloadShapes();
}

TTS.createWindowsAd = function () {
    return; //disabled for v1.0 coz ima nice guy

    // Create the HTML
    var adWrapper = TTS.elem("AD-WRAPPER");
    adWrapper.innerHTML = "<div id=\"AD\" class=\"ad\" data-win-control=\"MicrosoftNSJS.Advertising.AdControl\"></div>";
    adWrapper.classList.add("ad-windows"); // set the ad size for windows

    // Attach the ad stuff
    var adDiv = document.getElementById("AD");
    var myAdControl = new MicrosoftNSJS.Advertising.AdControl(adDiv,
        {
            applicationId: "d25517cb-12d4-4699-8bdc-52040c712cab",
            adUnitId: "10042998"
        });
    myAdControl.isAutoRefreshEnabled = false;
    myAdControl.latitude = 40.47;
    myAdControl.longitude = 73.58;
    myAdControl.onErrorOccurred = function (a, b) { };
    myAdControl.onAdRefreshed = function () { };
    myAdControl.onEngagedChanged = function () { };


    // Windows Test ID's
    //applicationId: "d25517cb-12d4-4699-8bdc-52040c712cab",
    //adUnitId: "10042998"

    // Windows ID's
    //applicationId: "bb3a0278-2a83-4c46-900a-03518ac8a10d",
    //adUnitId: "10808926"

    // Windows Phone ID's
    //applicationId: "7d1793b0-2b41-4292-ba6d-f20ee1a175d1",
    //adUnitId: "10808925"
}

// Windows API handle back button navigation on phone (leaving e.handled false closes the app)
TTS.handleBackButton = function () {
    if (typeof (Windows) !== "undefined" && typeof (Windows.Phone) !== "undefined") {
        var hardwareButtons = Windows.Phone.UI.Input.HardwareButtons;
        hardwareButtons.onbackpressed = function (e) {
            if (!e.handled) {
                if (!TTS.elem("GAMEOVERSCREEN").classList.contains("hide")) {
                    TTS.start();
                    e.handled = true;
                }
                else if (!TTS.elem("PLAYSCREEN").classList.contains("hide") ||
                    !TTS.elem("HELPSCREEN").classList.contains("hide")) {
                    TTS.goHome();
                    e.handled = true;
                }
            }
        };
    }
        // Implement Android
    else {

    }
}

TTS.share = function () {
    // Windows/Windows Phone API Share
    if (typeof (Windows) !== "undefined") {
        Windows.ApplicationModel.DataTransfer.DataTransferManager.showShareUI();
    }
        // Implement Android/iOS sharing
    else {
        window.open("https://facebook.com");
    }
}

TTS.windowsShareRequest = function (e) {
    var url = "";
    var device = "";

    // Windows Phone
    if (typeof (Windows.Phone) !== "undefined") {
        url = "http://www.windowsphone.com/en-us/store/app/touch-the-shape/74abce30-e9a9-4e78-9a78-46731f8d4cc0";
        device = "Windows Phone 8.1";
    }
        // Windows Store
    else {
        url = "http://apps.microsoft.com/windows/en-us/app/touch-the-shape/00489b74-0a3a-429a-b60b-6afc608ba7de";
        device = "Windows 8.1";
    }

    // Windows API Share
    var request = e.request;

    request.data.properties.title = "I just scored " + TTS._score + " on " + TTS.getMode() + " mode @ Touch The Shape for " + device + "!";
    request.data.properties.description = "Touch the Shape for " + device;

    request.data.setWebLink(new Windows.Foundation.Uri(url));
}

// Get a value from the apps saved data
TTS.getAppSetting = function (key, defaultValue) {
    var value = defaultValue;

    if (!TTS._appSettings) {
        TTS.loadSettings();
    }

    if (TTS._appSettings[key] !== undefined) {
        value = TTS._appSettings[key];
    }

    // Windows API reference
    if (typeof (Windows) !== "undefined") {
        var appSettings = Windows.Storage.ApplicationData.current.localSettings.values;
        if (appSettings.hasKey(key)) {
            value = appSettings[key];
        }
    }

    return value;
}

// Set a value to the apps saved data (specify to overwrite existing values or not)
TTS.setAppSetting = function (key, value) {
    if (!TTS._appSettings) {
        TTS.loadSettings();
    }

    TTS._appSettings[key] = value;
    TTS.saveSettings();

    // Windows API reference
    if (typeof (Windows) !== "undefined") {
        var appSettings = Windows.Storage.ApplicationData.current.localSettings.values;
        appSettings[key] = value;
    }
}

TTS.loadSettings = function () {
    var settings = localStorage["touchTheShape"];
    if (settings) {
        TTS._appSettings = JSON.parse(settings);
    }
    else {
        TTS._appSettings = {};
    }
}

TTS.saveSettings = function () {
    localStorage["touchTheShape"] = JSON.stringify(TTS._appSettings);
}

TTS.playSound = function (id) {
    if (TTS._soundEnabled) {
        var sound = TTS.elem(id);
        sound.pause();
        if (sound.currentTime != 0) { sound.currentTime = 0; }
        sound.play();
    }
}

TTS.goHome = function () {
    TTS._gameOver = true;

    // Show the home screen
    TTS.elem("HOMESCREEN").classList.remove("hide");
    TTS.elem("PLAYSCREEN").classList.add("hide");
    TTS.elem("GAMEOVERSCREEN").classList.add("hide");
    TTS.elem("HELPSCREEN").classList.add("hide");

    TTS.elem("AD-WRAPPER").classList.remove("hide");

    // Hide the home button
    TTS.elem("HOME").classList.add("invisible");
}

TTS.toggleSound = function () {
    // Invert the result
    TTS._soundEnabled = !TTS._soundEnabled;

    // Update the app setting
    TTS.setAppSetting("_soundEnabled", TTS._soundEnabled);

    TTS.updateSoundButton();
}

TTS.openHelp = function () {
    TTS._gameOver = true;

    // Show the help screen, hide the others
    TTS.elem("HELPSCREEN").classList.remove("hide");
    TTS.elem("HOMESCREEN").classList.add("hide");
    TTS.elem("PLAYSCREEN").classList.add("hide");
    TTS.elem("GAMEOVERSCREEN").classList.add("hide");

    TTS.elem("AD-WRAPPER").classList.add("hide");

    // Hide the home button
    TTS.elem("HOME").classList.remove("invisible");

    if (TTS._adsDisabled) {
        TTS.elem("DISABLEADSWRAPPER").classList.add("hide");
    }

    TTS.elem("HELPSHAPEHS").innerHTML = TTS._bestScoreHard;
    TTS.elem("HELPSHAPEEASYHS").innerHTML = TTS._bestScoreEasy;
    TTS.elem("HELPTIMETRIALHS").innerHTML = TTS._bestScoreTimeTrial;
    TTS.elem("HELPCASUALHS").innerHTML = TTS._bestScoreNormal;
    TTS.elem("HELPCOLOURHS").innerHTML = TTS._bestScoreColour;
    TTS.elem("HELPCOLOUREASYHS").innerHTML = TTS._bestScoreColourEasy;
    TTS.elem("HELPCOLOURTIMETRAILHS").innerHTML = TTS._bestScoreColourTimeTrial;

    // Stats
    TTS.elem("TOTALTIME").innerHTML = TTS.formatTimePeriod(TTS._totalTimePlayed);
    TTS.elem("TOTALTOUCHES").innerHTML = TTS.formatNumberWithCommas(TTS._totalShapesTouched);
    TTS.elem("REACTIONTIME").innerHTML = Math.floor((TTS._totalTimePlayed / TTS._totalShapesTouched) | 0) + "ms";
}

TTS.formatNumberWithCommas = function (x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

TTS.formatTimePeriod = function (value) {
    var time = "0ms";

    var x = value;
    var millis = Math.floor(x % 1000) + "ms";
    x /= 1000;
    var seconds = Math.floor(x % 60) + "s";
    x /= 60;
    var minutes = Math.floor(x % 60) + "m";
    x /= 60;
    var hours = Math.floor(x % 24) + "h";
    x /= 24;
    var days = Math.floor(x) + "d";

    // Less than a second = display: 450ms
    if (value < 1000) { time = millis; }
        // Less than a minute = display: 45s 340ms
    else if (value < 60 * 1000) { time = seconds + " " + millis; }
        // Less than an hour = display: 45m 23s
    else if (value < 60 * 60 * 1000) { time = minutes + " " + seconds; }
        // Less than a day = display: 14h 18m
    else if (value < 24 * 60 * 60 * 1000) { time = hours + " " + minutes; }
        // Less than 10 days = display: 6d 11h 15m
    else if (value < 10 * 24 * 60 * 60 * 1000) { time = days + " " + hours + " " + minutes; }
        // More than 10 days = display: 15d 6h
    else { time = days + " " + hours; }

    return time;
}

TTS.expandHelpNode = function (element) {
    var isExpanded = element.classList.contains("help-node-expanded");

    // If the node is currently expanded, collapse it (all others should be collapsed)
    if (isExpanded) {
        element.classList.remove("help-node-expanded");
    }
    else {
        // Collapse any/all existing nodes
        var expandedNodes = document.getElementsByClassName("help-node-expanded");
        if (expandedNodes.length > 0) {
            for (var i = expandedNodes.length - 1; i >= 0; i--) {
                expandedNodes[i].classList.remove("help-node-expanded");
            }
        }

        // Expand the current node
        element.classList.add("help-node-expanded");
    }
}

TTS.updateSoundButton = function () {
    // Add or remove the disabled class to the button
    var soundButton = TTS.elem("SOUND");
    if (TTS._soundEnabled) {
        soundButton.classList.remove("sound-disabled");
    }
    else {
        soundButton.classList.add("sound-disabled");
    }
}

// 1 = TTS: Classic, 2 = Casual, 3 = Kids (inactive), 4 = TTS: Time Trial, 5 = TTC: Classic, 
// 6 = Practice (inactive), 7 = TTS: Easy, 8 = TTC: Easy, 9 = TTC: Time Trial
TTS.start = function (mode) {
    if (mode !== undefined && [1, 2, 3, 4, 5, 6, 7, 8, 9].indexOf(mode) != -1) {
        TTS._mode = mode;
    }

    //// Make sure the selected mode has been unlocked
    //if (TTS._mode == 5 && !TTS._colourModeUnlocked) {
    //    // Colour Mode selected but not unlocked
    //    TTS.displayUnlockMessage(TTS._mode);
    //}
    //else if (TTS._mode == 4 && !TTS._timeTrialUnlocked) {
    //    // Time Trial Mode selected but not unlocked
    //    TTS.displayUnlockMessage(TTS._mode);
    //}
    //else if (TTS._mode == 3 && !TTS._kidsModeUnlocked) {
    //    // Kids Mode selected but not unlocked
    //    TTS.displayUnlockMessage(TTS._mode);
    //}
    //else {
    // Mode is unlocked

    // Reset the score
    TTS.elem("SCORE").innerHTML = "0";
    TTS._score = 0;

    // Reset the timer
    TTS.resetTimer();

    // Select a random shape and colour to start with
    TTS.setShape();

    // Show the play screen
    TTS.elem("HOMESCREEN").classList.add("hide");
    TTS.elem("PLAYSCREEN").classList.remove("hide");
    TTS.elem("GAMEOVERSCREEN").classList.add("hide");
    TTS.elem("AD-WRAPPER").classList.add("hide");

    // Show the home button
    TTS.elem("HOME").classList.remove("invisible");

    var helperMessage = "";
    if (TTS._mode == 1 || TTS._mode == 7) { // Touch The Shape: Classic/Easy
        helperMessage = "Touch the matching shape below before the time runs out";
    }
    else if (TTS._mode == 4) { // Touch The Shape: Time Trial
        helperMessage = "Touch as many matching shapes before the time runs out";
    }
    else if (TTS._mode == 5 || TTS._mode == 8) { // Touch The Color: Classic/Easy
        helperMessage = "Touch the matching color below before the time runs out";
    }
    else if (TTS._mode == 9) { // Touch The Color: Time Trial
        helperMessage = "Touch as many matching colors before the time runs out";
    }
    else if (TTS._mode == 2) { // Casual
        helperMessage = "Touch the matching shape, or the color, before the time runs out";
    }

    // Show the helper
    var helper = TTS.elem("HELPER");
    helper.innerHTML = helperMessage;
    helper.classList.remove("invisible");

    // Hide play stats for Practice mode
    if (TTS._mode == 6) {
        document.getElementsByClassName("play-stats")[0].classList.add("invisible");
    }
    else {
        document.getElementsByClassName("play-stats")[0].classList.remove("invisible");
    }
    //}
}

// This is called if a disabled mode is selected
TTS.displayUnlockMessage = function (mode) {
    TTS.prompt("Disable Ads", "", "Now", "Later", TTS.displayUnlockPurchase, function () { });
}

TTS.displayUnlockPurchase = function () {
    // Implement in-app purchase, then unlock everything once completed transaction

    TTS.unlockEverything();
}


TTS.unlockEverything = function () {
    TTS.unlockAds();
    //TTS.unlockTimeTrialMode();
    //TTS.unlockColourMode();
    //TTS.unlockKidsMode();

    TTS.elem("DISABLEADSWRAPPER").classList.add("hide");
}

TTS.unlockAds = function () {
    if (!TTS._adsDisabled) {
        TTS._adsDisabled = true;
        TTS.setAppSetting("_adsDisabled", TTS._adsDisabled);
    }
    TTS.elem("AD-WRAPPER").innerHTML = "";
}

TTS.unlockTimeTrialMode = function () {
    if (!TTS._timeTrialUnlocked) {
        TTS._timeTrialUnlocked = true;
        TTS.setAppSetting("_timeTrialUnlocked", TTS._timeTrialUnlocked);
    }
    TTS.elem("TIMETRIALMODE").classList.remove("disabled");
}

TTS.unlockColourMode = function () {
    if (!TTS._colourModeUnlocked) {
        TTS._colourModeUnlocked = true;
        TTS.setAppSetting("_colourModeUnlocked", TTS._colourModeUnlocked);
    }
    TTS.elem("COLOURMODE").classList.remove("disabled");
}

TTS.unlockKidsMode = function () {
    if (!TTS._kidsModeUnlocked) {
        TTS._kidsModeUnlocked = true;
        TTS.setAppSetting("_kidsModeUnlocked", TTS._kidsModeUnlocked);
    }
    TTS.elem("KIDSMODE").classList.remove("disabled");
}

TTS.prompt = function (messageLine1, messageLine2, button1, button2, button1Callback, button2Callback) {
    if (typeof (Windows) !== "undefined") {
        // Create the message dialog and set its content
        var msg = new Windows.UI.Popups.MessageDialog(messageLine2, messageLine1);

        // Add commands and set their command handlers
        msg.commands.append(new Windows.UI.Popups.UICommand(button1, button1Callback));
        msg.commands.append(new Windows.UI.Popups.UICommand(button2, button2Callback));

        // Set the command that will be invoked by default
        msg.defaultCommandIndex = 0;

        // Set the command to be invoked when escape is pressed
        msg.cancelCommandIndex = 1;

        msg.showAsync().done();
    }
        // Implement Android and iOS
    else {
        if (confirm(messageLine1 + " " + messageLine2)) {
            button1Callback && button1Callback();
        }
        else {
            button2Callback && button2Callback();
        }
    }
}

// Helper method to get element by ID
TTS.elem = function (id) {
    return document.getElementById(id);
}

TTS.resetTimer = function () {
    var time = 650; // 0.65 seconds

    switch (TTS._mode) {
        case 1: time = 650; break; // Touch The Shape: Classic
        case 7: time = 800; break; // Touch The Shape: Easy
        case 4: time = 60000; break; // Touch The Shape: Time Trial
        case 5: time = 650; break; // Touch The Colour: Classic
        case 8: time = 800; break; // Touch The Colour: Easy
        case 9: time = 60000; break; // Touch The Colour: Time Trial
        case 2: time = 800; break; // Casual
            //case 3: time = 2000; break; // Touch The Shape (Kids)
            //case 6: time = 0; break; // Practice (no limit)
    }

    // Update the global timeLeft var and the user clock
    TTS._timeLeft = time;
    TTS._totalTime = time;
    TTS._timeStart = new Date();
    TTS.updateClock();
}

TTS.setShape = function () {
    TTS._currentShape = TTS.selectRandomShape();
    TTS._currentColour = TTS.selectRandomColour();

    // Show the first 5 shapes as the correct colour, unless it's 'Casual' or 'Kids' mode then show all correctly
    if (TTS._score < 5 || TTS._mode == 2 || TTS._mode == 3) {
        TTS._currentColour = TTS.getMatchingColour(TTS._currentShape);
    }

    var current = document.getElementsByClassName("current-shape");
    if (current.length > 0) {
        current[0].classList.add("hide");
        current[0].classList.remove("current-shape");
    }

    var newShape = document.getElementById((TTS._currentColour + TTS._currentShape).toUpperCase());
    newShape.classList.add("current-shape");
    newShape.classList.remove("hide");

    // Reset opacity
    TTS.updateShapeOpacity();
}

TTS.selectRandomColour = function () {
    var num = TTS.getRandomInt(4);

    switch (num) {
        case 1: return "red";
        case 2: return "blue";
        case 3: return "yellow";
        case 4: return "green";
    }
}

TTS._previousShapeIndex = 0;
TTS.selectRandomShape = function () {
    var num = TTS._previousShapeIndex;

    // Prevent the same shape showing twice in a row (avoids confusion)
    while (num == TTS._previousShapeIndex)
    {
        num = TTS.getRandomInt(4);
    }

    TTS._previousShapeIndex = num;

    switch (num) {
        case 1: return "star";
        case 2: return "triangle";
        case 3: return "circle";
        case 4: return "square";
    }
}

// Returns a random whole number from 1 to the max (including the max)
TTS.getRandomInt = function (max) {
    return Math.floor(Math.random() * max) + 1;
}

// This is called when one of the 4 shape buttons are pressed
TTS.selectShape = function (shape) {
    var isFirstMove = TTS._gameOver;
    TTS._gameOver = false;

    if (isFirstMove) {
        // Only start the timer once the first move is made
        TTS.startTimer();

        // Hide the helper once moved
        TTS.elem("HELPER").classList.add("invisible");
    }

    if (TTS.isValidMove(shape)) {
        // For Time Trial modes decrement the score if the shapes/colors don't match, all other modes increment
        if ((TTS._mode == 4 && shape != TTS._currentShape) || (TTS._mode == 9 && TTS.getMatchingColour(shape) != TTS._currentColour)) {
            // Incorrect on time trial
            TTS.playSound("GAMEOVERSOUND");
            if (TTS._score > 0) {
                // Don't allow negative score
                TTS._score--;
            }
        }
        else {
            // Correct on time trial and other modes
            TTS.playSound("CORRECTSOUND");
            TTS._score++

            // Increment the stats as long as it's not time trial (gets done at the end)
            if (TTS._mode != 4 && TTS._mode != 9) {
                TTS._totalShapesTouched++;
                TTS._totalTimePlayed += TTS._totalTime - TTS._timeLeft;
            }
        }

        // Update the visible score
        TTS.elem("SCORE").innerHTML = TTS._score;

        // Select a new shape
        TTS.setShape();

        // Reset the timer after each move unless it's Time Trial
        if ((TTS._mode != 4 && TTS._mode != 9) || isFirstMove) {
            // Reset the timer
            TTS.resetTimer();

            // Reset opacity
            TTS.updateShapeOpacity();
        }
    }
    else {
        if (isFirstMove) { TTS.resetTimer(); }
        TTS.gameOver();
    }
}

TTS.isValidMove = function (shape) {
    // Time Trial modes cannot fail (they only decrement) - 6: Practice mode never loses
    if (TTS._mode == 4 || TTS._mode == 9 || TTS._mode == 6) { return true; }

    // Shape Classic, Easy, Casual, or Kids (casual has same shape and color so can check color or shape)
    if (TTS._mode == 1 || TTS._mode == 7 || TTS._mode == 2 || TTS._mode == 3) {
        if (shape == TTS._currentShape) { return true; }
    }

    // Color Classic, and Color Easy
    if (TTS._mode == 5 || TTS._mode == 8) {
        if (TTS.getMatchingColour(shape) == TTS._currentColour) { return true; }
    }

    return false;
}

// Get the colour associated with the shape button being touched
TTS.getMatchingColour = function (shape) {
    switch (shape) {
        case "circle": return "blue";
        case "triangle": return "red";
        case "square": return "yellow";
        case "star": return "green";
    }
}

// Formats the timeLeft nicely for the user
TTS.updateClock = function () {
    var millis = TTS._timeLeft % 1000;
    if (millis < 10) { millis = "00" + millis; }
    else if (millis < 100) { millis = "0" + millis; }

    TTS.elem("TIME").innerHTML = Math.floor(TTS._timeLeft / 1000) + "." + millis;
}

TTS.startTimer = function () {
    if (!TTS._gameOver && TTS._mode != 6) { // Not Practice
        setTimeout(function () {
            // Decrement the time
            TTS._timeLeft = TTS._totalTime - (new Date() - TTS._timeStart);

            // Display 0 if it's less than 0
            if (TTS._timeLeft < 0) { TTS._timeLeft = 0 }

            // Update the time the user sees
            TTS.updateClock();

            if (TTS._mode != 4 && TTS._mode != 9) { // Don't fade the shapes on Time Trial
                // Fade out the shape slowly
                TTS.updateShapeOpacity();
            }

            // If time's up, game over, otherwise, keep looping
            if (TTS._timeLeft <= 0) {
                TTS.gameOver();

            }
            else {
                TTS.startTimer();
            }
        }, 16);
    }
}

// Fade out the active shape (starts slow and speeds up)
TTS.updateShapeOpacity = function () {
    var overlap = 150; // Time at the end where the shape is completely invisible

    var totalTime = TTS._totalTime - overlap;
    var timeLeft = TTS._timeLeft - overlap;
    if (timeLeft < 0) { timeLeft = 0; }

    var timeRemainingFraction = (totalTime - timeLeft) / totalTime; // 1=Invisible, 0=Visible
    var opacity = 1 - (timeRemainingFraction * timeRemainingFraction);

    // Time Trial or Practice has full opacity
    if (TTS._mode == 4 || TTS._mode == 9 || TTS._mode == 6) { opacity = 1; }

    TTS.setCurrentShapeOpacity(opacity);
}

// 0=Invisible, 1=Visible
TTS.setCurrentShapeOpacity = function (opacity) {
    document.getElementsByClassName("current-shape")[0].style.opacity = opacity;
}

TTS.gameOver = function () {
    // In case both gameOvers fire at the same time
    if (TTS._gameOver) { return; }

    TTS.playSound("GAMEOVERSOUND");

    TTS._gameOver = true;
    TTS.elem("GAMEOVERSCREEN").classList.remove("hide");
    //TTS.elem("PLAYSCREEN").classList.add("hide");
    TTS.elem("AD-WRAPPER").classList.add("hide");

    setTimeout(function () {
        TTS.setCurrentShapeOpacity(1); // Make the current shape visible
    }, 20);

    TTS.elem("ENDSCORE").innerHTML = TTS._score;

    // Checks if this score is the best for the mode, and updates the 'best score' global var
    var newBestScore = TTS.getIsBestScore();

    TTS.elem("LEVEL").innerHTML = TTS.getMode();

    if (newBestScore) {
        TTS.elem("NEWBESTSCORE").classList.remove("hide");
    }
    else {
        TTS.elem("NEWBESTSCORE").classList.add("hide");
    }

    // Update stats for time trial modes
    if (TTS._mode == 4 || TTS._mode == 9) {
        if (TTS._score > 0) { TTS._totalShapesTouched += TTS._score; }
        TTS._totalTimePlayed += TTS._totalTime - TTS._timeLeft;
    }
    else {
        // Increment just the time for non-time trial modes
        TTS._totalTimePlayed += TTS._totalTime - TTS._timeLeft;
    }

    TTS.setAppSetting("_totalShapesTouched", TTS._totalShapesTouched);
    TTS.setAppSetting("_totalTimePlayed", TTS._totalTimePlayed);
}

TTS.getIsBestScore = function () {
    var newBestScore = false;

    if (TTS._mode === 1) { // Touch The Shape: Original
        if (TTS._score > TTS._bestScoreHard) {
            TTS._bestScoreHard = TTS._score;
            newBestScore = true;

            // Unlock modes if the unlock level is reached
            //if (TTS._bestScoreHard >= 100) { TTS.unlockColourMode(); }
            //if (TTS._bestScoreHard >= 50) { TTS.unlockTimeTrialMode(); }
            //if (TTS._bestScoreHard >= 10) { TTS.unlockKidsMode(); }
        }
        TTS.setAppSetting("_bestScoreHard", TTS._bestScoreHard, true);
        TTS.elem("BESTSCORE").innerHTML = TTS._bestScoreHard;
    }
    else if (TTS._mode === 7) { // Touch The Shape: Easy
        if (TTS._score > TTS._bestScoreEasy) {
            TTS._bestScoreEasy = TTS._score;
            newBestScore = true;
        }
        TTS.setAppSetting("_bestScoreEasy", TTS._bestScoreEasy, true);
        TTS.elem("BESTSCORE").innerHTML = TTS._bestScoreEasy;
    }
    else if (TTS._mode === 4) { // Touch The Shape: Time Trial
        if (TTS._score > TTS._bestScoreTimeTrial) {
            TTS._bestScoreTimeTrial = TTS._score;
            newBestScore = true;
        }
        TTS.setAppSetting("_bestScoreTimeTrial", TTS._bestScoreTimeTrial, true);
        TTS.elem("BESTSCORE").innerHTML = TTS._bestScoreTimeTrial;
    }
    else if (TTS._mode === 5) { // Touch The Color: Original
        if (TTS._score > TTS._bestScoreColour) {
            TTS._bestScoreColour = TTS._score;
            newBestScore = true;
        }
        TTS.setAppSetting("_bestScoreColour", TTS._bestScoreColour, true);
        TTS.elem("BESTSCORE").innerHTML = TTS._bestScoreColour;
    }
    else if (TTS._mode === 8) { // Touch The Color: Easy
        if (TTS._score > TTS._bestScoreColourEasy) {
            TTS._bestScoreColourEasy = TTS._score;
            newBestScore = true;
        }
        TTS.setAppSetting("_bestScoreColourEasy", TTS._bestScoreColourEasy, true);
        TTS.elem("BESTSCORE").innerHTML = TTS._bestScoreColourEasy;
    }
    else if (TTS._mode === 9) { // Touch The Color: Time Trial
        if (TTS._score > TTS._bestScoreColourTimeTrial) {
            TTS._bestScoreColourTimeTrial = TTS._score;
            newBestScore = true;
        }
        TTS.setAppSetting("_bestScoreColourTimeTrial", TTS._bestScoreColourTimeTrial, true);
        TTS.elem("BESTSCORE").innerHTML = TTS._bestScoreColourTimeTrial;
    }
    else if (TTS._mode === 2) { // Casual
        if (TTS._score > TTS._bestScoreNormal) {
            TTS._bestScoreNormal = TTS._score;
            newBestScore = true;
        }
        TTS.setAppSetting("_bestScoreNormal", TTS._bestScoreNormal, true);
        TTS.elem("BESTSCORE").innerHTML = TTS._bestScoreNormal;
    }
    //else if (TTS._mode === 3) { // Practice
    //    if (TTS._score > TTS._bestScoreEasy) {
    //        TTS._bestScoreEasy = TTS._score;
    //        newBestScore = true;
    //    }
    //    TTS.setAppSetting("_bestScoreEasy", TTS._bestScoreEasy, true);
    //    TTS.elem("BESTSCORE").innerHTML = TTS._bestScoreEasy;
    //}

    return newBestScore;
}

// Returns the display name of the mode for the end stats and sharing
TTS.getMode = function () {
    switch (TTS._mode) {
        case 1: return "Shape: Original";
        case 7: return "Shape: Easy";
        case 4: return "Shape: Time Trial";
        case 2: return "Casual";
        case 5: return "Color: Original";
        case 8: return "Color: Easy";
        case 9: return "Color: Time Trial";
            //case 3: return "Kids";
            //case 6: return "Practice";
    }
}

TTS._images = [];
TTS.preloadImgs = function (imgs) {
    for (var i = 0; i < imgs.length; i++) {
        TTS._images[i] = new Image();
        TTS._images[i].src = imgs[i];
    }
}
TTS.preloadShapes = function () {
    TTS.preloadImgs([
        "images/circle-blue.png",
        "images/circle-green.png",
        "images/circle-red.png",
        "images/circle-yellow.png",
        "images/square-blue.png",
        "images/square-green.png",
        "images/square-red.png",
        "images/square-yellow.png",
        "images/star-blue.png",
        "images/star-green.png",
        "images/star-red.png",
        "images/star-yellow.png",
        "images/triangle-blue.png",
        "images/triangle-green.png",
        "images/triangle-red.png",
        "images/triangle-yellow.png",
    ]);
}