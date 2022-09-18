/// <summary>
/// Build a maze using the edit tools, then save and play on the maze.
/// While playing, you are only able to see 1 space either side.
/// Collect all the goals to win.
/// 
/// Developer Note: Each wall in the maze also occupies a space in the table. This means an 8x8 maze will actually build a 17x17 table
/// </summary>

var Maze = Maze || {};

// '.' = Wall, '\n' = Line break, ' ' = Valid space, 'x' = Start, '*' = Goal
Maze._layout = "";
Maze._savedLayout = "";

Maze._mazeName = null;
Maze._savedMazeName = null;

Maze._gameOver = false;

Maze._isEditMode = false;

Maze._startGoalsEnabled = true;

Maze._startTime;
Maze._timeMS;

Maze._undoHistory = [];

Maze._size = "8x8"; // default maze dimensions

var _appSettings = { mazes: [] };

// On load event to set defaults
Maze.initialise = function () {
    Maze.loadSettings();
    Maze.toggleAppBar();
    document.getElementById("UNLOCKGOALS").style.display = "none";
    document.getElementById("MAZENAME_EDIT").style.display = "none";
    Maze.loadSavedMazes();
    Maze.registerSwipeEvents();
    Maze.startOnEnter();
    Maze.initImportEvent();
}

Maze.loadSettings = function () {
    var settings = localStorage["drawTheMaze"];
    if (settings) {
        _appSettings = JSON.parse(settings);
    }
}

Maze.saveSettings = function () {
    localStorage["drawTheMaze"] = JSON.stringify(_appSettings);
}

// Under Settings -> Options, this will delete all saved mazes and reset to the default mazes
Maze.flushSaved = function (confirmed) {
    if (!confirmed) {
        confirm("This will delete all saved mazes.", null, Maze.flushSavedCallback);
        return;
    }

    _appSettings.mazes = [];

    Maze.saveSettings();

    Maze.loadSavedMazes();
}

Maze.flushSavedCallback = function (confirmed) {
    if (confirmed) {
        Maze.flushSaved(true);
    }
}

// When the application loads, or after a save/delete, clear the list of mazes and reload to the selected maze
Maze.loadSavedMazes = async function (selectedName) {
    // Load default mazes for first use
    if (_appSettings.mazes.length == 0) { Maze.setDefaultMazes(); }

    // Get all saved mazes
    var mazePicker = document.getElementById("SELECTMAZE");

    // Remove all options before reloading
    mazePicker.innerHTML = null;

    // Load each saved maze
    for (var i = 0; i < _appSettings.mazes.length; i++) {
            var composite = _appSettings.mazes[i];

            if (composite) {
                var name = composite["Name"];
                var time = composite["FastestTime"];
                var layout = composite["Layout"];

                // Populate list
                var option = document.createElement("OPTION");
                option.value = i;
                option.innerHTML = name;
                option.classList.add("custom");
                //todo: do something with fastest time

                mazePicker.appendChild(option);
            }
    }

    // Reset the loaded maze and current name
    Maze._savedMazeName = null;
    Maze._mazeName = null;

    // If there's 1 or more mazes to select, default to the first one
    if (mazePicker.options.length > 0) {
        var value = null;

        // Set the selected maze to the last viewed if applicable (otherwise first)
        if (selectedName != null) {
            value = Maze.getMazeValueByName(selectedName);
        }

        if (value == null) { value = mazePicker.options[0].value; }

        // Order the mazes alphabetically - disabled as causes index issues
        //Maze.sortSelect(mazePicker);

        // Select the right maze
        mazePicker.value = value;
        Maze.selectSavedMaze(value, null, true);
    }
    else {
        // If no mazes, Create an 8x8 blank maze
        await Maze.new(true);

        // Set the global maze layout to the empty maze
        Maze._layout = Maze.getLayout();

        // Load edit screen since not valid to play
        Maze.toggleMode(true);
    }
}

// Sort the maze picker in alphabetical order
Maze.sortSelect = function (selElem) {
    var tmpAry = new Array();
    for (var i = 0; i < selElem.options.length; i++) {
        tmpAry[i] = new Array();
        tmpAry[i][0] = selElem.options[i].text;
        tmpAry[i][1] = selElem.options[i].value;
    }
    tmpAry.sort(function (a, b) {
        // Sort only by the name
        return a[0] > b[0] ? 1 : -1;
    });
    while (selElem.options.length > 0) {
        selElem.options[0] = null;
    }
    for (var i = 0; i < tmpAry.length; i++) {
        var op = new Option(tmpAry[i][0], tmpAry[i][1]);
        selElem.options[i] = op;
    }
}

// Creates a new maze, 8x8, with no name yet
Maze.new = async function (skipPrompt) {
    // If the current maze is different to the saved maze (layout or name) prompt to save
    if (!skipPrompt && (Maze.getLayout() != Maze._savedLayout || Maze._savedMazeName != Maze._mazeName)) {
        await confirmCustomCancel("Do you want to save your current changes?", null, Maze.newCallback, null, "Save", "Discard");
        return;
    }

    // Reset the loaded and current maze name
    Maze._savedMazeName = null;
    Maze._mazeName = null;

    // Clear the maze picker
    var mazePicker = document.getElementById("SELECTMAZE");
    mazePicker.value = null;

    // Create an 8x8 blank maze
    Maze.resize(Maze._size, true, false);
}

Maze.newCallback = async function (confirmed) {
    if (confirmed === true) {
        // Save the current maze, and tell the save event to create a new maze afterwards
        await Maze.save(document.getElementById("SELECTMAZE").selectedIndex, true); // TODO??
    }
    else if (confirmed === false) {
        // They chose to discard, so check if the maze was ever saved
        var mazePicker = document.getElementById("SELECTMAZE");
        var selectedOption = mazePicker.options[mazePicker.selectedIndex];
        if (selectedOption != null) {
            // If the maze isn't saved, remove it
            if (!_appSettings.mazes[selectedOption.value]) {
                mazePicker.options.remove(mazePicker.selectedIndex);
            }
        }

        await Maze.new(true);
    }
}

// Gets the picklist value of a maze by its maze name
Maze.getMazeValueByName = function (name) {
    var mazePicker = document.getElementById("SELECTMAZE");

    for (var i = 0; i < mazePicker.options.length; i++) {
        if (mazePicker.options[i].innerHTML == name) {
            return mazePicker.options[i].value;
        }
    }

    return null;
}

// When the application is first run (or reset through settings > options), inject a few default mazes
Maze.setDefaultMazes = function () {
    var name;
    var layout;

    // Easy (8x8)
    name = "1. Easy (8x8)";
    layout = ".................\n.           .   .\n. ... ..... . ...\n. . . .     .   .\n... . . . ... . .\n.     . .     . .\n. . ... ... ... .\n. .         .   .\n. ... ..... .....\n.     .   .*    .\n... ... . ... . .\n.   .   .     . .\n..... ... ... . .\n.   . .   .   . .\n. . . . ... ... .\n.*.   . .x  .   .\n.................";
    Maze.saveMaze(name, name, null, layout, true, true);

    // Medium (12x12)
    name = "2. Medium (12x12)";
    layout = ".........................\n.x    .   .     .   .  *.\n. ... . . . ... . . . ...\n. . .   . .   .   . .   .\n. . ..... ... ..... ... .\n.   .     .       .   . .\n... . ... . . ... . . . .\n. . .   .   .   .   .   .\n. . ... ....... ..... ...\n.       .   .   .   . . .\n....... ... . . . . . . .\n.   .       . .   .     .\n. . . ... ... . ... .....\n. .   .   .   . .   .   .\n. ..... ... ....... . . .\n.     .     . .       . .\n..... ... . . . ..... . .\n.   . .   .   .     .   .\n. . . . ..... ... . .....\n. .     .   .   . .     .\n....... ... . . ... .....\n.   .     .   . .   .   .\n. . . ... . ... . . . . .\n.*.   .     .   . .   .*.\n.........................";
    Maze.saveMaze(name, name, null, layout, true, true);

    // Hard (18x18)
    name = "3. Hard (18x18)";
    layout = ".....................................\n.   .       . . .*  .   .     .     .\n. . ......... . ... . ... . ... ... .\n.   .   . . . . .     .   . .    *. .\n. ... . . . . . ..... . ... ....... .\n. . .   . . . . .   .   .   .     . .\n. . . . . . . . . . ... ..... . ... .\n. . . . .   . . . . .   .     .     .\n... ........... ... . ....... ..... .\n.               .     .     .   .   .\n..................... . . . ... . ...\n.     .     .   .     . . . .   .   .\n... . . . ..... . ....... . ... ... .\n.   .   .   .     .*.     .     .   .\n. ... . ... . ..... . . ..... ... ...\n.   . .   .   .     . .       .     .\n... . ....... . ..... ..... . . ... .\n. .         .   .x.   .     . . . . .\n. . ..... . . ... . . . ....... . ...\n.     .   .     .   .       .   .   .\n..... ..... ... ....... ... . . . . .\n. .   . .     . .   . .   . . .   . .\n. . ... ......... . . ... . . .......\n.   .   .     .   .   . . . .   .   .\n... . ..... ......... . . ..... . . .\n. .     .       .   .   .   . .   . .\n. . ... . ..... . . ... ... . . ... .\n.   .       .     .     .   .   .   .\n... ......... ... ... ....... ... . .\n.   .  *.     . . .   .       .   . .\n. ... ... ..... . . ... . ... ... . .\n.     .   .       .     .   .   . . .\n..... . ... ... ... ....... ... ... .\n.     . .   .     .   .     .   .   .\n. ..... . ..... . . . . . ... . ... .\n.   .     .     .   .   . .   .     .\n.....................................";
    Maze.saveMaze(name, name, null, layout, true, true);

    // Insane (30x30)
    name = "4. Insane (30x30)";
    layout = ".............................................................\n.   .   .       .       .     .         .   .   .   .       .\n. . . ..... ... . ... . . . . ... ..... . . . ... . . ..... .\n. .       .   .   .   .   . .   . .   . . .       .       . .\n. ....... ... ..... ....... ... . . ... . ....... ... . ... .\n.       .                 .   .   . .   . .   .       . .   .\n... ... ... ..... ....... . . . ... . ... . . . ......... ...\n.   .     .     .     .   . . .   .   .     .   .       .   .\n. ... . . ..... ..... . . ... ... ... . . ..... . ..... ... .\n.   . . .     .   .   . .           .   .     . . .   .   . .\n... ... ... ......... . ... ... . . ..... ... . . . ..... . .\n.   . . .   .       .       .   . .             .       .   .\n. ... . . . ... ... ..... ... . . ... . ... . ..... ... ... .\n.     .   .     .   .         .   .   . .   . .     .       .\n..... . ... ... . ... ..... ..... . ... ..... . ..... .......\n. .   .       . .   .   .   . .   . .     .   .           . .\n. . . ..... . . . . ... . ... . ... . ... . ..... ... ... . .\n.   . .   . .     .   .         .     . . . .   .   . .     .\n..... . . ... ....... ... . ..... ..... . . . . ... . .......\n.     . .   . .       .   . . .   .   .     . .   .   . .   .\n. ... ..... . . ............. . . ... ... ... ... . . . ... .\n.   .   .   .     .   .     .   .     .   .   .   . .       .\n... . ... ... ... . . . ... ....... ... . . ... ..... . .....\n.   .   . .   . . . .     .   .   .     . .     .     . .   .\n. . ... . . ... . . ..... . ... . ............. . . ... . . .\n. .   .   .     . .   .         . .   .   .       .       . .\n. ... ... . ... . ... ........... . ..... . ... . ....... . .\n.     .   .   .   . .     .       .       . .   .     .   . .\n..... . ... . ... . ..... . . ... . . ....... ... ... .......\n.   .   .   .       .   .   .   .   . . .         .         .\n... ....... ..... ... . ..... ....... . . ... . ....... . . .\n.         . .   . .   . .     .     . .   .   .     .   . . .\n. ... ... . . . . ... ... ....... . . ... . ....... . . . ...\n.   .   .   . .   .       .       .   . .   .   .     .     .\n... ... ......... . ... ... ..... ... . . ... . . ... ... . .\n. . .       .   . .   .   .   . .   .   .     .   .   .   . .\n. . ... ... ... ..... ....... . . ... ... ... ...............\n.     .   . .   .   . .       .   .   .   .                 .\n... . ... ... ... ... . ........... ... ... ... . ... . . ...\n.   .   . .   .       .     .       . .       . .   . . .   .\n. ..... . . ......... ... ... . ... . ..... . . . ... . . ...\n. .     . . .   .   .   . .   .   .   .   . . . .   . . .   .\n. ..... . . ... . . ... . . ... . ..... . ... . ... ... ... .\n.   .     .   . . .     .   .   .     . . .   .             .\n... . . ..... . ... ....... ... ..... . . ... ..... ..... ...\n.   . . .   .         .   . .   .   .   .   .               .\n. . ..... . ... ... ... . . . ... ... ..... ............... .\n. .     . . . . .   .   . . . . .   . .   .   .     .     . .\n. ..... . ... ... ..... ... . . ... ..... . ... ... . . ... .\n. .   . .   .     .   .     .   .     .         . .   . .   .\n... ... ... ... ... . . ..... ... . . . ..... . . . ... . ...\n.       .   .       .     .       . . .     . .   . . . .   .\n. ....... ... . ......... . . ..... . ... . ... ... . ..... .\n.   . .       .     .   .   . .     .   . .     .     .   . .\n... . . ... ......... ....... . . ..... ..... . ... ... . . .\n.   .   .           .   . .     . .   .   .   .   .   . . . .\n. ... . ....... ... ... . ..... ... . ... . ... . ... . . . .\n.*.   .       .   .   .   .   .     . .   . .   . .     . . .\n... ... ... . . . ... ... . . . ..... . . . . ... . . ... . .\n.x      .   .   .   .     . .     .   . .     .   . .       .\n.............................................................";
    Maze.saveMaze(name, name, null, layout, true, true);

    // Draw The Maze
    name = "5. Draw The Maze";
    layout = ".........................................................\n.x.   .     .   .     .   .     .       .       .   .   .\n. ... ... . . ... . . ... . . ... . ... ... . ..... ... .\n.     .     .     .     .     .   .   .   .   .       . .\n... ... . ... ... ... . ... . . . ... . . . . ... ... . .\n. .             .                                 . .   .\n. . ... . . . . . . . . . . . . . . . . . . . . . . . ...\n.   .                                               .   .\n... . . ....... . ....... . . ..... . ... ... ... . ... .\n.       .     .   .     .     .   .   . . . . . .       .\n. ... . . ... ... . ... ... ... . ... . . . . . . . . . .\n. .     . . .   . . . .   . .   .   . . . . . . .       .\n. . . . . . ... . . . ... . . ..... . . . . . . . . . ...\n.   .   . .   . . . .   . . . .   . . . . . . . .     . .\n..... . . . . . . . ..... . . ..... . . . . . . . . . . .\n.       . .   . . .       . .       . . . . . . .       .\n. . . . . . . . . . ... ... . ..... . . . . . . . . ... .\n. .     . .   . . . . . .   . .   . . . . . . . .     . .\n... . . . . ... . . . . ... . . . . . . ... ... . . . . .\n.       . . .   . . . .   . . .   . . .         .       .\n. ... . . ... ... . . ... . . . . . . ... ... ... . . ...\n.   .   .     .   . .   . . . .   . .   . . . .       . .\n. . . . ....... . ... . ... ... . ... . ... ... . . . . .\n. .                                               .     .\n. ... . . . . . . ....... ... ... ..... . . . . ... ... .\n.   . .           .     . . . . . .   .               . .\n. . . ... . . . . ... ... . . . . . ... . . . . . . . ...\n.     .   .         . .   . . . . . .           . .     .\n..... . . ... . . . . . . . ... . . ... . . . ... ..... .\n.   .   .           . .   .     . .   .             .   .\n. . ... . . ... . . . . . . ... . . ... . . ... ..... ...\n. .     .   .       . .   . . . . . .         .   .   . .\n... ..... ... . . . . . . . . . . . ... . . . ... . . . .\n.                   . .   . . . . .   .             .   .\n. . ... . . . . . . ... . ... ... ..... . . . . . . ... .\n. .   .                                                 .\n. ... . . ... ... . . ..... . ......... ......... . . ...\n.         . . . .     .   .   .       . .       .     . .\n. . . . ... ... ... ... . ... ....... . . ....... . . . .\n.   .   .         . .   .   .       . . . .             .\n..... . . ... ... . . ..... . . . ... . . . . . . . ... .\n.       . . . . . . . .   . .     .   . . .           . .\n. . . . . . . . . . . ..... . . ... ... . ....... . .....\n. .     . . . . . . .       .   .   .   .       .       .\n. ... . . . . . . . . ..... . ... ... . . ....... . . . .\n.       . . . . . . . .   . . .   .     . .             .\n... . . . . . . . . . . . . . . ... . . . . . . . . . ...\n.       . . . . . . . .   . . . .       . .           . .\n. ... . . . . . . . . . . . . . ....... . ....... . . . .\n.   .   . . . . . . . .   . . .       . .       .       .\n... . . ... ... ... ... . ... ......... ......... . .....\n. .                                                     .\n. ..... . . . . . . . . . ... . ... . . . . . . . ... ...\n.         .     .     .     .     .   .   .   .     . . .\n..... ... ....... . ... ... . ... . ... . ... ... ... . .\n.     .       .   . .   .   .   .       .   .     .    *.\n.........................................................";
    Maze.saveMaze(name, name, null, layout, true, true);
}

// Save a maze to roaming settings
Maze.saveMaze = async function (id, name, time, layout, canOverride, skipPrompt, selectedOptionName, isCreateNew) {
    var index = Maze.getSavedIndex(id);

    if (!canOverride && index != _appSettings.mazes.length) {
        await confirmCustom("Maze already exists", "A maze with the name '" + name + "' already exists. Would you like to overwrite it?", Maze.saveMazeExistsCallback, [id, name, time, layout, selectedOptionName, isCreateNew], "Overwrite", "Cancel");
        return;
    }

    //if (!skipPrompt && index == _appSettings.mazes.length) {
    //    confirm("This will create a new maze.", null, Maze.saveMazeCallback, [id, name, time, layout, selectedOptionName, isCreateNew]);
    //    return;
    //}

    var composite = {};
    composite["Name"] = name;
    composite["FastestTime"] = time;
    composite["Layout"] = layout;

    _appSettings.mazes[index] = composite;

    Maze._savedMazeName = selectedOptionName;
    Maze._mazeName = selectedOptionName;
    Maze._layout = layout;

    Maze.saveSettings();

    // Reload the saved mazes (required for save as new)
    Maze.loadSavedMazes(selectedOptionName);

    // Because async doesnt return a response to the Maze.newCallback function, have to do this hacky
    if (isCreateNew) {
        await Maze.new(true);
    }
}

Maze.saveMazeCallback = async function (confirmed, params) {
    if (confirmed) {
        await Maze.saveMaze(params[0], params[1], params[2], params[3], true, true, params[4], params[5]);
    }
}

Maze.saveMazeExistsCallback = async function (confirmed, params) {
    if (confirmed) {
        await Maze.saveMaze(params[0], params[1], params[2], params[3], true, true, params[4], params[5]);
    }
    else {
        await Maze.changeMazeTitle();
    }
}

// Gets the 0-based index of a saved maze by its maze name
Maze.getSavedIndex = function (name) {
    for (var i = 0; i < _appSettings.mazes.length; i++) {
        if (_appSettings.mazes[i] && _appSettings.mazes[i]["Name"] == name) {
            return i;
        }
    }

    return _appSettings.mazes.length;
}

// On click of 'Start!' in play mode - starts or pauses the game
Maze.startOrPauseButton = function (startButton) {
    if (!startButton) { startButton = document.getElementById("START"); }
    var label = startButton.innerHTML;

    Maze.startOrPause(label);
}

Maze.startOrPause = function (label) {
    var startButton = document.getElementById("START");
    var startAppBar = document.getElementById("STARTAPPBAR");
    var pauseAppBar = document.getElementById("PAUSEAPPBAR");
    var resumeAppBar = document.getElementById("RESUMEAPPBAR");

    if (label == "Start!" || label == "Resume") {
        if (label == "Start!") {
            // Render the maze again for repeated play
            Maze.render(Maze._layout, false, true);

            // If the game hasnt started yet, set the start time to now
            Maze._startTime = new Date();

            // Attach the key down events for keyboard movement
            window.onkeydown = Maze.keyPress;
        }
        else {
            // If the game has been paused, recalculate the start time to simulate a 'pause'
            Maze._startTime = new Date() - Maze._timeMS;
        }

        Maze._gameOver = false;
        Maze.startClock();

        startButton.innerHTML = "Pause";
        startButton.classList.add("pause");
        startAppBar.style.display = "none";
        resumeAppBar.style.display = "none";
        pauseAppBar.style.display = "";
    }
    else if (label == "Pause") {
        Maze._gameOver = true;
        Maze._timeMS = new Date() - Maze._startTime;

        startButton.innerHTML = "Resume";
        startButton.classList.remove("pause");
        startAppBar.style.display = "none";
        resumeAppBar.style.display = "";
        pauseAppBar.style.display = "none";
    }

}

// Create the small 3x3 maze used for the play mode
Maze.renderPlayMaze = function () {
    var table = document.getElementById("PLAYMAZE");
    table.innerHTML = "";

    // There can only be one occupied space
    var occupied = document.getElementsByClassName("occupied")[0];
    var id = occupied.id.split("-");
    var x = parseInt(id[0]);
    var y = parseInt(id[1]);

    // Create 5 rows (2 either side of the occupied cell)
    for (var i = x - 2; i <= x + 2; i++) {
        var row = document.createElement("TR");

        // Create 5 cols (2 either side of the occupied cell)
        for (var j = y - 2; j <= y + 2; j++) {
            var cell = document.createElement("TD");
            cell.onselectstart = function () { return false; }

            var existingCell = document.getElementById(i + "-" + j);
            if (existingCell != null) {
                cell.className = existingCell.classList;

                // Add inline click-to-move with arrow indicators whether it's a valid move
                if (i == x - 2 && j == y && !document.getElementById((x - 1) + "-" + y).classList.contains("wall")) {
                    cell.innerHTML = "^";
                    cell.onclick = function () {
                        Maze.moveUp();
                    }
                }
                else if (i == x && j == y - 2 && !document.getElementById(x + "-" + (y - 1)).classList.contains("wall")) {
                    cell.innerHTML = "<";
                    cell.onclick = function () {
                        Maze.moveLeft();
                    }
                }
                else if (i == x && j == y + 2 && !document.getElementById(x + "-" + (y + 1)).classList.contains("wall")) {
                    cell.innerHTML = ">";
                    cell.onclick = function () {
                        Maze.moveRight();
                    }
                }
                else if (i == x + 2 && j == y && !document.getElementById((x + 1) + "-" + y).classList.contains("wall")) {
                    cell.innerHTML = "v";
                    cell.onclick = function () {
                        Maze.moveDown();
                    }
                }
            }
            else {
                // These are outside the maze layout, but need to be included when on the edges
                if (j % 2 == 0) {
                    cell.classList.add("wallColumn");
                }
                if (i % 2 == 0) {
                    cell.classList.add("wallRow");
                }
            }

            row.appendChild(cell);
        }

        table.appendChild(row);
    }
}

// Clears the layout in edit mode and rebuilds a blank 8x8 grid
Maze.edit_clearAll = function () {
    //confirm("This will erase the current maze and rebuild a blank grid.", null, Maze.edit_clearAllCallback);

    Maze.edit_clearAllCallback(true);
}

Maze.edit_clearAllCallback = function (confirmed) {
    if (confirmed) {
        // Generate a blank maze
        Maze.resize(Maze._size, true, true);
    }
}

// In edit mode, when clicking a wall, remove the wall, and vice versa
Maze.edit_toggleWall = function (cell) {
    // Track undo history before changing
    Maze.recordChange();

    var isWall = cell.classList.contains("wall");

    if (isWall) {
        cell.classList.remove("wall");
        cell.classList.add("space");
    }
    else {
        cell.classList.add("wall");
        cell.classList.remove("space");
    }
}

// In edit mode, when clicking a space, determine whether to add a start, goal, or empty space
Maze.edit_toggleStartOrGoal = function (cell) {
    if (Maze._isEditMode && Maze._startGoalsEnabled) {
        // Track undo history before changing
        Maze.recordChange();

        var isStart = cell.classList.contains("start");
        var isGoal = cell.classList.contains("goal");

        if (isStart) {
            // If the cell is currently a start, remove to make empty space
            cell.classList.remove("start");
        }

        else if (isGoal) {
            // If the cell is currently a goal, remove to make empty space
            cell.classList.remove("goal");
        }
        else {
            // If the cell is currently empty, check if there is already a start
            if (Maze.getLayout().indexOf("x") == -1) {
                // If there is no start, make this cell a start
                cell.classList.add("start");
            }
            else {
                // If there is already a start, make this cell a goal
                cell.classList.add("goal");
            }
        }
    }
}

// Load the selected maze
Maze.render = function (layout, isEditMode, skipUndo) {
    // Make sure the layout is valid before rendering
    if (!Maze.isValidLayout(layout, isEditMode)) {
        return false;
    }

    var table = document.getElementById("EDITMAZE");

    // Reset a few things
    Maze._gameOver = true;
    window.onkeydown = null;
    table.innerHTML = "";
    document.getElementById("TIMER").innerHTML = "00:00.000";
    document.getElementById("GOALS").innerHTML = layout.split("*").length - 1;
    document.getElementById("START").innerHTML = "Start!";
    document.getElementById("START").classList.remove("pause");
    document.getElementById("STARTAPPBAR").style.display = "";
    document.getElementById("RESUMEAPPBAR").style.display = "none";
    document.getElementById("PAUSEAPPBAR").style.display = "none";
    if (!skipUndo) { Maze._undoHistory = []; } // Reset undo history unless performing an undo
    Maze.enableOrDisableUndo();

    var rows = layout.split('\n');

    // Used to work out cell size
    var isWallRow = true;

    // Process each Row
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];

        var tableRow = document.createElement("TR");

        // Used to work out cell size
        var isWallColumn = true;

        // Process each cell in the row
        for (var j = 0; j < row.length; j++) {
            var cell = row[j];

            var tableCell = document.createElement("TD");
            tableCell.id = i + "-" + j; // row-column

            // Attach the classes to the cell
            if (isWallColumn) { tableCell.classList.add("wallColumn"); }
            if (isWallRow) { tableCell.classList.add("wallRow"); }
            if (isWallRow && isWallColumn) { tableCell.classList.add("wallPost"); }

            var isSpace = true; // True for anything but a wall
            switch (cell) {
                case " ":
                    tableCell.classList.add("space");
                    break;
                case "x":
                    tableCell.classList.add("space");
                    tableCell.classList.add("start");
                    if (!isEditMode) { tableCell.classList.add("occupied"); }
                    break;
                case "*":
                    tableCell.classList.add("space");
                    tableCell.classList.add("goal");
                    break;
                default:
                    tableCell.classList.add("wall");
                    isSpace = false;
            }

            // Attach onclick events to cells for editing (excluding outside walls)
            if (isEditMode && i != 0 && i != rows.length - 1 && j != 0 && j != row.length - 1) {
                if (isWallRow != isWallColumn) {
                    // If it is a wall or a col (but not both) attach the onclick event
                    tableCell.onclick = function () {
                        Maze.edit_toggleWall(this);
                    };
                }
                else if (isSpace && !isWallRow && !isWallColumn) {
                    // If it's a space and not a wall attach the onclick event
                    tableCell.onclick = function () {
                        Maze.edit_toggleStartOrGoal(this);
                    };
                }
            }

            tableRow.appendChild(tableCell);
            isWallColumn = !isWallColumn;
        }

        table.appendChild(tableRow);
        isWallRow = !isWallRow;
    }

    Maze.showFullMaze(isEditMode);

    if (!isEditMode) {
        // Render the play maze after editing or loading
        Maze.renderPlayMaze();
    }

    // Set the static width of the maze so it doesn't get squashed to window size
    var wrapper = document.getElementById("EDITMAZEWRAPPER");
    wrapper.style.width = ((rows[0].length - 1) / 2) * 50 + 10 + "px";
    wrapper.style.height = ((rows.length - 1) / 2) * 50 + 10 + "px";

    // Set the new Size of the maze
    var width = rows[0].length;
    var height = rows.length;
    Maze._size = (width - 1) / 2 + "x" + (height - 1) / 2;

    return true;
}

// Show the full maze (edit mode or end of game) or the 3x3 play maze
Maze.showFullMaze = function (show) {
    document.getElementById("PLAYMAZE").style.display = show ? "none" : "";
    document.getElementById("EDITCANVAS").style.display = show ? "" : "none";
}

// Movement by keyboard keys
Maze.keyPress = function (e, ignoreWalls) {
    e = e || window.event;

    var key = e.keyCode;

    // Stop page scrolling
    if ([37, 38, 39, 40].indexOf(key) > -1) {
        e.preventDefault();
    }

    if (key == 37 || key == 65) { // Left or 'A'
        Maze.moveLeft(ignoreWalls);
    }
    else if (key == 38 || key == 87) { // Up or 'W'
        Maze.moveUp(ignoreWalls);
    }
    else if (key == 39 || key == 68) { // Right or 'D'
        Maze.moveRight(ignoreWalls);
    }
    else if (key == 40 || key == 83) { // Down or 'S'
        Maze.moveDown(ignoreWalls);
    }
}

Maze.moveLeft = function (ignoreWalls) {
    Maze.move(0, -1, ignoreWalls);
}

Maze.moveRight = function (ignoreWalls) {
    Maze.move(0, 1, ignoreWalls);
}

Maze.moveUp = function (ignoreWalls) {
    Maze.move(-1, 0, ignoreWalls);
}

Maze.moveDown = function (ignoreWalls) {
    Maze.move(1, 0, ignoreWalls);
}

// An in-game movement - row/col movement determines direction (neg = up/left)
Maze.move = function (rowMovement, colMovement, ignoreWalls) {
    if (Maze._gameOver) { return; }

    // Get the current occupied cell
    var occupied = document.getElementsByClassName("occupied")[0];
    var id = occupied.id.split("-");
    var row = parseInt(id[0]);
    var col = parseInt(id[1]);

    // Get the 'gate' or wall between the current cell and the cell trying to move to
    var gateId = (row + rowMovement) + "-" + (col + colMovement);
    var gate = document.getElementById(gateId);

    // If there is no cell (edge of maze) or it is a wall, do not move
    if (gate != null && (!gate.classList.contains("wall") || ignoreWalls)) {
        var newSpaceId = (row + (2 * rowMovement)) + "-" + (col + (2 * colMovement));
        var newSpace = document.getElementById(newSpaceId);

        // Make sure the new cell exists
        if (newSpace != null) {

            // Move to the new cell
            occupied.classList.remove("occupied");
            newSpace.classList.add("occupied");

            if (newSpace.classList.contains("goal")) {
                // Allows for multiple goals (must pass every goal)
                newSpace.classList.remove("goal");
                newSpace.classList.add("goalDisabled");

                var goals = Maze.getLayout().split("*").length - 1; // Excludes the playmaze goals
                document.getElementById("GOALS").innerHTML = goals;

                if (goals == 0) {
                    Maze._gameOver = true;

                    alert("You win!", null, Maze.gameOver);
                }
            }

            // Refresh the play maze with the movement
            Maze.renderPlayMaze();
        }
    }
}

// When all goals are collected
Maze.gameOver = function () {
    // Show the whole maze at the end
    Maze.showFullMaze(true);

    // Reset the Start button
    document.getElementById("START").innerHTML = "Start!";
    document.getElementById("START").classList.remove("pause");
    document.getElementById("STARTAPPBAR").style.display = "";
    document.getElementById("RESUMEAPPBAR").style.display = "none";
    document.getElementById("PAUSEAPPBAR").style.display = "none";
}

// In play mode, this recursive function will power the game clock
Maze.startClock = function () {
    if (!Maze._gameOver) {
        var milliseconds = new Date() - Maze._startTime;

        var millis = milliseconds % 1000;
        if (millis < 10) { millis = "00" + millis; }
        else if (millis < 100) { millis = "0" + millis; }

        var seconds = Math.floor((milliseconds / 1000) % 60);
        if (seconds < 10) { seconds = "0" + seconds; }

        var minutes = Math.floor(milliseconds / 1000 / 60);
        if (minutes < 10) { minutes = "0" + minutes; }

        document.getElementById("TIMER").innerHTML = minutes + ":" + seconds + "." + millis;

        setTimeout(function () {
            Maze.startClock();
        }, 33);
    }
}

// Delete the current maze (saved or not)
Maze.delete = async function (skipConfirm) {
    var savedMaze = Maze._savedMazeName;

    if (savedMaze != null) {
        var index = Maze.getSavedIndex(savedMaze);
        if (index != _appSettings.mazes.length) {
            if (!skipConfirm) {
                await confirmCustom("This will permanently delete '" + savedMaze + "'.", null, Maze.deleteCallback, null, "Delete", "Cancel");
                return;
            }

            // Remove the deleted maze from settings
            _appSettings.mazes[index] = undefined; // Cant do .remove() for looping reasons

            Maze.saveSettings();

            // Reload the saved mazes
            Maze.loadSavedMazes();
            return;
        }
    }

    if (!skipConfirm) {
        await confirmCustom("This will delete the unsaved maze.", null, Maze.deleteCallback, null, "Delete", "Cancel");
        return;
    }

    // Reload the saved mazes - the unsaved mazes will be deleted
    Maze.loadSavedMazes();
}

Maze.deleteCallback = function (confirmed) {
    if (confirmed) {
        Maze.delete(true);
    }
}

// Save and update the current maze
Maze.save = async function (previousOptionIndex, isCreateNew) {
    var savedName = Maze._savedMazeName;

    // If there is no saved maze being edited, need to save new
    if (savedName == null) {
        await Maze.saveAsNew(previousOptionIndex, isCreateNew);
        return;
    }

    // If in playmode, cant get layout from maze because it gets modified during play
    var layout = Maze._isEditMode ? Maze.getLayout() : Maze._layout;

    // We have a previous option for when switching mazes without saving, otherwise the 2 are the same
    var select = document.getElementById("SELECTMAZE");
    var selectedOption = select.options[select.selectedIndex];
    var previousOption = previousOptionIndex != null ? select.options[previousOptionIndex] : selectedOption;

    // Validate the maze
    if (!Maze.isValidLayout(layout, false)) {
        select.value = previousOption.value;
        return;
    }

    var name = previousOption.innerHTML;
    var time = 0; //todo: get this from somewhere

    await Maze.saveMaze(savedName, name, time, layout, true, false, selectedOption.innerHTML, isCreateNew);
}

// Save the current maze as a new maze
Maze.saveAsNew = async function (previousOptionIndex, isCreateNew) {
    // If in playmode, cant get layout from maze because it gets modified during play
    var layout = Maze._isEditMode ? Maze.getLayout() : Maze._layout;

    var select = document.getElementById("SELECTMAZE");
    var selectedOption = select.options[select.selectedIndex];
    var previousOption = previousOptionIndex != null ? select.options[previousOptionIndex] : selectedOption;

    // Validate the maze
    if (!Maze.isValidLayout(layout, false)) {
        select.value = previousOption.value;
        return;
    }

    // Prompt for name, and then save
    var confirmed = await prompt("Enter a unique name for the new maze", null, previousOption ? previousOption.innerHTML : null, null, null, "Save", "Cancel");
    Maze.saveAsNewCallback(confirmed, [select, previousOption.value, layout, isCreateNew]);
}

Maze.saveAsNewCallback = async function (confirmed, params) {
    if (!confirmed) {
        // Set the mazePicker to the previousOptionIndex
        params[0].value = params[1];
    }
    else {
        // Get the new name from the alert
        var name = document.getElementById("ALERTINPUT").value;

        if (name == null || name == "") {
            await alert("You must enter a name", null, Maze.saveAsNewCallBack2, [params[1], params[3]]);
            return;
        }

        await Maze.saveMaze(name, name, null, params[2], false, false, name, params[3]);
    }
}

Maze.saveAsNewCallBack2 = async function (confirmed, params) {
    await Maze.saveAsNew(params[0], params[1]);
}

// Updates the saved layout with the current rendered maze if it is valid
Maze.updateLayout = function (requireConfirm) {
    var newLayout = Maze.getLayout();
    var currentLayout = Maze._layout;

    if (newLayout != null && newLayout != "" && currentLayout != newLayout) {
        // Make sure it's valid before saving. Basically check there is a valid number of starts/goals
        if (!Maze.isValidLayout(newLayout, false)) { return false; }
    }

    Maze._layout = newLayout;
    return true;
}

// Gets the string layout of the current rendered maze
Maze.getLayout = function () {
    var layout = "";

    var table = document.getElementById("EDITMAZE");

    var rows = table.childNodes;
    for (var i = 0; i < rows.length; i++) {
        var cells = rows[i].childNodes;
        for (var j = 0; j < cells.length; j++) {
            var cell = cells[j];

            if (cell.classList.contains("wall")) {
                layout += ".";
            }
            else if (cell.classList.contains("start")) {
                layout += "x";
            }
            else if (cell.classList.contains("goal")) {
                layout += "*";
            }
            else if (cell.classList.contains("space")) {
                layout += " ";
            }
        }

        // Add a line break '\n' if it's not the last row
        if (i != rows.length - 1) { layout += "\n"; }
    }

    return layout;
}

// Switches between play and edit mode
Maze.toggleMode = function (isEditMode) {
    if (isEditMode) {
        // Load the edit maze
        if (!Maze.render(Maze._layout, true, true)) { return; }
        Maze._gameOver = true;
    }
    else {
        // Update the edited layout before playing
        if (!Maze.updateLayout()) { return; }
        if (!Maze.render(Maze._layout, false, true)) { return; };
    }

    // Update the global var with the new value
    Maze._isEditMode = isEditMode;

    // Switch menus
    document.getElementById("PLAYMENU").style.display = isEditMode ? "none" : "";
    document.getElementById("CHEATS").style.display = isEditMode ? "none" : "";

    Maze.toggleAppBar();
}

Maze.toggleAppBar = function () {
    var isEditMode = Maze._isEditMode;

    var appBarPlayButtons = document.getElementsByClassName("appBarPlay");
    var appBarEditButtons = document.getElementsByClassName("appBarEdit");

    for (var i = 0; i < appBarPlayButtons.length; i++) {
        if (isEditMode) {
            appBarPlayButtons[i].classList.add("hide");
        }
        else {
            appBarPlayButtons[i].classList.remove("hide");
        }
    }
    for (var i = 0; i < appBarEditButtons.length; i++) {
        if (isEditMode) {
            appBarEditButtons[i].classList.remove("hide");
        }
        else {
            appBarEditButtons[i].classList.add("hide");
        }
    }
}

// When the resize button is clicked pop a prompt
Maze.resizeAction = async function () {
    var confirmed = await prompt("Enter the new dimensions of the maze", "width x height, no larger than 30x30", Maze._size, null, null, "OK", "Cancel");

    if (confirmed) {
        var input = document.getElementById("ALERTINPUT").value;

        await Maze.resize(input, false, true);
    }
}

// Resize the current maze by either expanding or cropping the existing maze - closes outside walls
Maze.resize = async function (size, clearAll, skipUndo) {
    var isValid = false;

    if (size != null) {
        var split = size.toLowerCase().split("x");
        if (split.length == 2) {
            var width = split[0];
            var height = split[1];

            if (!isNaN(width) && !isNaN(height)) {
                width = parseInt(width);
                height = parseInt(height);

                // Make sure the size isnt bigger than 30x30 or smaller than 2 play squares
                if (height > 0 && width > 0 && height <= 30 && width <= 30 && height + width > 2) {
                    isValid = true;

                    var layout = clearAll ? "" : Maze.getLayout();
                    var rows = layout.split("\n");

                    var oldWidth = rows[0].length;
                    var oldHeight = rows.length;

                    if (layout == null || layout == "") {
                        oldWidth = 0;
                        oldHeight = 0;
                        rows = new Array();
                    }

                    // Get the actual dimentions including walls
                    var newWidth = (width * 2) + 1;
                    var newHeight = (height * 2) + 1;

                    // Handle Rows
                    if (oldHeight > newHeight) {
                        // If there are less rows now, slice them
                        rows = rows.slice(0, newHeight);

                        // Make the last row all walls
                        rows[newHeight - 1] = rows[newHeight - 1].replace(/[sf ]/g, ".");
                    }
                    else if (oldHeight < newHeight) {
                        // If there are more rows now, create a new row for each missing line

                        // Since joining, need to add an extra 1 to the array
                        var spaceRow = "." + new Array(newWidth - 1).join(" ") + ".";
                        var wallRow = "." + new Array(width + 1).join(" .");
                        var outterRow = new Array(newWidth + 1).join(".");

                        // Open the previous outside wall
                        if (oldHeight > 0) { rows[oldHeight - 1] = wallRow; }

                        // Loop through the remaining lines
                        for (var i = oldHeight + 1; i < newHeight; i++) {
                            if (oldHeight == 0 && i == 1) {
                                // If first row, all dots
                                rows.push(outterRow);
                            }
                            else {
                                // Determine whether to use odd or event row
                                var isWallRow = (i) % 2 == 1;
                                rows.push(isWallRow ? wallRow : spaceRow);
                            }
                        }

                        // Handle last row all dots.
                        rows.push(outterRow);
                    }

                    // Handle Cols
                    for (var j = 0; j < newHeight; j++) {
                        var row = rows[j];
                        if (row.length > newWidth) {
                            // chop the row and add a wall to the end
                            rows[j] = row.substring(0, newWidth - 1) + ".";
                        }
                        else if (row.length < newWidth) {
                            var difference = newWidth - row.length;

                            if (j == 0 || (j == newHeight - 1)) {
                                // If first or last row, all dots
                                rows[j] += new Array(difference + 1).join(".");
                            }
                            else if ((oldHeight + j) % 2 == 1) {
                                // Odd row
                                rows[j] = row.substring(0, row.length - 1) + "." + new Array((difference / 2) + 1).join(" .");
                            }
                            else {
                                // Even row
                                rows[j] = row.substring(0, row.length - 1) + " " + new Array(difference).join(" ") + ".";
                            }
                        }
                    }

                    var newLayout = rows.join("\n");

                    // Track undo history before changing
                    Maze.recordChange();

                    // Update the maze with the new layout, dont delete undo history if clearAll or is actual resize
                    Maze.render(newLayout, true, skipUndo);
                }
            }
        }
    }

    if (!isValid) {
        await alert("Invalid size", "Maximum = 30x30, Minimum = 1x2");
        await Maze.resizeAction();
    }
}

// Forces the maze into full-layout, and allows for inline editing (cannot save changes)
Maze.easterEgg_inlineEdit = function () {
    if (!Maze._isEditMode && !Maze._gameOver) {
        Maze.showFullMaze(true);

        var cells = document.getElementsByTagName("TD");
        for (var i = 0; i < cells.length; i++) {
            var cell = cells[i];

            var isWallColumn = cell.classList.contains("wallColumn");
            var isWallRow = cell.classList.contains("wallRow");

            if (isWallRow != isWallColumn) {
                // If it is a wall or a col (but not both) attach the onclick event
                cell.onclick = function () {
                    Maze.edit_toggleWall(this);
                };
            }
        }
    }
}

// Restart the game clock
Maze.easterEgg_resetTimer = function () {
    if (!Maze._isEditMode && !Maze._gameOver) {
        Maze._startTime = new Date();
    }
}

// Display the full maze during a game - touch movement not supported
Maze.easterEgg_showFullMaze = function () {
    if (!Maze._isEditMode && !Maze._gameOver) {
        Maze.showFullMaze(true);
    }
}

// Allows keyboard users to walk through walls
Maze.easterEgg_walkThroughWalls = function () {
    if (!Maze._isEditMode && !Maze._gameOver) {
        window.onkeydown = function () { Maze.keyPress(this.event, true); }
    }
}

//Maze.easterEgg_enableCustomize = function () {
//    var editElements = document.getElementsByClassName("edit");
//    var count = editElements.length;
//    for (var i = count - 1; i >= 0; i--) {
//        editElements[i].classList.remove("edit");
//    }
//}

// Makes the maze invisible, but the walls still exist
Maze.easterEgg_invisibleWalls = function () {
    if (!Maze._isEditMode && !Maze._gameOver) {
        var wallCells = document.getElementsByClassName("wall");
        for (var i = 0; i < wallCells.length; i++) {
            wallCells[i].classList.add("space");
        }
    }
}

// Checks if the provided maze layout meets the validation requirements
Maze.isValidLayout = function (layout, isEditMode) {
    // If there is not exactly 1 start, and not at least 1 goal, throw error
    if (!isEditMode && ((layout.indexOf("x") == -1 || layout.indexOf("x") != layout.lastIndexOf("x"))
        || layout.indexOf("*") == -1)) {

        alert("You must have 1 start and at least 1 goal.");
        return false;
    }

    var rows = layout.split('\n');

    // If there is an even number of rows, throw error (includes barriers)
    if (rows.length < 1 || rows.length % 2 == 0) {
        alert("Invalid number of rows.");
        return false;
    }

    // If there is an even number of columns, throw error (includes barriers)
    var numOfCols = rows[0].length;
    if (numOfCols < 1 || numOfCols % 2 == 0) {
        alert("Invalid number of columns.");
        return false;
    }

    // Used to work out cell position
    var isWallRow = true;

    // Process each Row
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];

        // Ensure all rows are the same length
        if (row.length != numOfCols) {
            alert("Not all rows are the same length.");
            return false;
        }

        // Used to work out cell position
        var isWallColumn = true;

        // Process each cell in the row
        for (var j = 0; j < row.length; j++) {
            var cell = row[j]; // Get the correct cell

            // If any of the outside panels are not walls, throw error
            if ((i == 0 || i == rows.length - 1 || j == 0 || j == numOfCols - 1)
                && cell != ".") {

                alert("The outside walls must not have any gaps.");
                return false;
            }

            // If a wall is in a space cell, or a space is on a corner/post cell, or a start or goal is on a wall or post - throw error
            if ((cell == "." && !isWallColumn && !isWallRow)
                || (cell == " " && isWallColumn && isWallRow)
                || ((cell == "x" || cell == "*") && (isWallColumn || isWallRow))) {

                alert("Invalid layout.");
                return false;
            }
            isWallColumn = !isWallColumn;
        }
        isWallRow = !isWallRow;
    }

    return true;
}

Maze.selectSavedMaze = async function (optionValue, previousOptionIndex, skipPrompt) { //todo: do something with fastest time, store somehow for presets
    // If in play mode and the maze is changed, use the _layout to avoid saving cheats
    var currentLayout = Maze._isEditMode ? Maze.getLayout() : Maze._layout;

    // If the current maze is different to the saved maze (layout or name) prompt to save
    if (!skipPrompt && (currentLayout != Maze._savedLayout || Maze._savedMazeName != Maze._mazeName)) {
        var confirmed = await confirmCustomCancel("Do you want to save your current changes?", null, null, null, "Save", "Discard");
        await Maze.selectSavedMazeCallback(confirmed, [optionValue, previousOptionIndex]);
        return;
    }

        var composite = _appSettings.mazes[optionValue];
        if (composite) {
            var name = composite["Name"];
            var layout = composite["Layout"];

            if (layout != null && layout != "") {
                Maze._layout = layout;
                Maze._savedLayout = layout;
                Maze.render(layout, Maze._isEditMode, false);

                // Save the current maze for processing later
                Maze._savedMazeName = name;
                Maze._mazeName = name;
            }
        }
}

Maze.selectSavedMazeCallback = async function (confirmed, params) {
    var mazePicker = document.getElementById("SELECTMAZE");

    if (confirmed) {
        // Save the maze
        await Maze.save(params[1]);
    }
    else if (confirmed === false) {
        // They chose to discard, so reload saved mazes which will delete unsaved layouts or maze names
        Maze.loadSavedMazes(mazePicker.options[mazePicker.selectedIndex].innerHTML);
    }
    else if (confirmed === null) {
        // Cancelled - reset the maze selection
        mazePicker.selectedIndex = params[1];
        return;
    }
}

// Toggle the appbar lock/unlock button
Maze.edit_lockStartGoals = function (lock) {
    document.getElementById("UNLOCKGOALS").style.display = lock ? "" : "none";
    document.getElementById("LOCKGOALS").style.display = lock ? "none" : "";

    Maze._startGoalsEnabled = !lock;
}

// Simulate a standard browser 'alert' dialog with Ok option
async function alert(message, info, callback, additionalParams) {
    return await Maze.prompt(message, info, false, null, "OK", null, null, callback, additionalParams);

    //var md = (new Windows.UI.Popups.MessageDialog(info != null ? info : "", message)).showAsync();

    //if (callback != null) {
    //    md.then(function () { callback(additionalParams); });
    //}
    //else {
    //    md.done();
    //}
}

// Simulate a standard browser 'confirm' dialog with Ok and Cancel options
async function confirm(message, info, callback, additionalParams) {
    return await confirmCustom(message, info, callback, additionalParams, "OK", "Cancel");
}

// Confirm dialog with custom true/false options
async function confirmCustom(message, info, callback, additionalParams, trueOption, falseOption) {
    return await Maze.prompt(message, info, false, null, trueOption, falseOption, null, callback, additionalParams);

    //var md = new Windows.UI.Popups.MessageDialog(info != null ? info : "", message);
    //md.commands.append(new Windows.UI.Popups.UICommand(trueOption));
    //md.commands.append(new Windows.UI.Popups.UICommand(falseOption));

    //md.showAsync().then(function (command) { callback(command.label == trueOption, additionalParams); });
}

// Confirm dialog with custom true/false options, plus an additional 'cancel' option
async function confirmCustomCancel(message, info, callback, additionalParams, trueOption, falseOption) {
    return await Maze.prompt(message, info, false, null, trueOption, falseOption, "Cancel", callback, additionalParams);

    //var md = new Windows.UI.Popups.MessageDialog(info != null ? info : "", message);
    //md.commands.append(new Windows.UI.Popups.UICommand(trueOption));
    //md.commands.append(new Windows.UI.Popups.UICommand(falseOption));
    //md.commands.append(new Windows.UI.Popups.UICommand("Cancel"));

    //md.showAsync().then(function (command) { callback(command.label == trueOption ? true : command.label == falseOption ? false : null, additionalParams); });
}

async function prompt(message, info, defaultInput, callback, additionalParams, trueOption, falseOption) {
    return await Maze.prompt(message, info, true, defaultInput, trueOption, falseOption, null, callback, additionalParams);
}

// Performs a custom alert, confirm, or prompt since win8 doesn't let you do prompts ootb
Maze.prompt = async function (message, info, inputEnabled, defaultInput, trueOption, falseOption, cancelOption, callbackFunction, params) {
    var selection = await Maze.popup(message, info, inputEnabled, defaultInput, trueOption, falseOption, cancelOption);
    if (callbackFunction) { callbackFunction(selection, params); }
    return selection;

    var alertContainer = document.getElementById("ALERTCONTAINER");
    var trueButton = document.getElementById("ALERTTRUE");
    var falseButton = document.getElementById("ALERTFALSE");
    var cancelButton = document.getElementById("ALERTCANCEL");
    var messageContainer = document.getElementById("ALERTMESSAGE");
    var infoContainer = document.getElementById("ALERTINFO");
    var input = document.getElementById("ALERTINPUT");

    // Display the alert container and disable the appBar
    alertContainer.classList.remove("hide");
    appBar.disabled = true;

    // Set focus to first button
    trueButton.focus();

    // Update the message and info if required
    messageContainer.innerHTML = message;
    infoContainer.innerHTML = info;
    infoContainer.style.display = info ? "" : "none";

    // Display the input if required, and set focus
    input.style.display = inputEnabled ? "" : "none";
    if (inputEnabled) { input.focus(); }
    input.value = defaultInput;

    // Only display the buttons if required
    trueButton.style.display = trueOption ? "" : "none";
    falseButton.style.display = falseOption ? "" : "none";
    cancelButton.style.display = cancelOption ? "" : "none";

    // Set the custom labels on the buttons, and set the callback functions
    if (trueOption) {
        trueButton.value = trueOption;
        trueButton.onclick = function () { Maze.promptCallback(true, params, callbackFunction); }
    }
    if (falseOption) {
        falseButton.value = falseOption;
        falseButton.onclick = function () { Maze.promptCallback(false, params, callbackFunction); }
    }
    if (cancelOption) {
        cancelButton.value = cancelOption;
        cancelButton.onclick = function () { Maze.promptCallback(null, params, callbackFunction); }
    }

    // Disable enter to start and movement
    window.onkeyup = null;
    window.onkeydown = null;
}

Maze.promptCallback = function (selection, params, callbackFunction) {
    // Hide the alert container and enable the appbar
    var alertContainer = document.getElementById("ALERTCONTAINER");
    alertContainer.classList.add("hide");
    appBar.disabled = false;

    // Enable enter to start and movement again - timeout so that the onkeypress events fire first
    setTimeout(function () {
        Maze.startOnEnter();
        window.onkeydown = Maze.keyPress;
    }, 100);

    if (callbackFunction) {
        callbackFunction(selection, params);
    }
}

//
Maze.popup = function (message, info, inputEnabled, defaultInput, trueOption, falseOption, cancelOption) {
  return new Promise(resolve => {

    var alertContainer = document.getElementById("ALERTCONTAINER");
    var trueButton = document.getElementById("ALERTTRUE");
    var falseButton = document.getElementById("ALERTFALSE");
    var cancelButton = document.getElementById("ALERTCANCEL");
    var messageContainer = document.getElementById("ALERTMESSAGE");
    var infoContainer = document.getElementById("ALERTINFO");
    var input = document.getElementById("ALERTINPUT");

    // Display the alert container and disable the appBar
    alertContainer.classList.remove("hide");
    appBar.disabled = true;

    // Set focus to first button
    trueButton.focus();

    // Update the message and info if required
    messageContainer.innerHTML = message;
    infoContainer.innerHTML = info;
    infoContainer.style.display = info ? "" : "none";

    // Display the input if required, and set focus
    input.style.display = inputEnabled ? "" : "none";
    if (inputEnabled) { input.focus(); }
    input.value = defaultInput ?? "";

    // Only display the buttons if required
    trueButton.style.display = trueOption ? "" : "none";
    falseButton.style.display = falseOption ? "" : "none";
    cancelButton.style.display = cancelOption ? "" : "none";

    // Set the custom labels on the buttons, and set the callback functions
    if (trueOption) {
        trueButton.value = trueOption;
        trueButton.onclick = function () { Maze.popupCallback(resolve, true); }
    }
    if (falseOption) {
        falseButton.value = falseOption;
        falseButton.onclick = function () { Maze.popupCallback(resolve, false); }
    }
    if (cancelOption) {
        cancelButton.value = cancelOption;
        cancelButton.onclick = function () { Maze.popupCallback(resolve, null); }
    }

    // Disable enter to start and movement
    window.onkeyup = null;
    window.onkeydown = null;

  });
}

Maze.popupCallback = function (resolve, selection) {
    // Hide the alert container and enable the appbar
    var alertContainer = document.getElementById("ALERTCONTAINER");
    alertContainer.classList.add("hide");
    appBar.disabled = false;

    // Enable enter to start and movement again - timeout so that the onkeypress events fire first
    setTimeout(function () {
        Maze.startOnEnter();
        window.onkeydown = Maze.keyPress;
    }, 100);

    resolve(selection);
}

// When saving as new, allows you to press enter inside the input field to save
Maze.closeAlertOnEnter = function (e, input) {
    e = e || window.event;

    if (e.keyCode == 13) { // Enter
        var confirmButton = document.getElementById("ALERTTRUE");
        confirmButton.click();

        if (input) { input.blur(); }
    }
}

// After changing the title free-text field, update the option and display the picker again
Maze.changeMazeTitle_blur = function (editMazeName) {
    var mazeSelect = document.getElementById("SELECTMAZE");

    editMazeName.style.display = "none";
    mazeSelect.style.display = "";

    var newName = editMazeName.value;
    if (newName != null && newName.trim() != "") {
        newName = newName.trim();
        var selectedOption = mazeSelect.options[mazeSelect.selectedIndex];
        if (!selectedOption || selectedOption.innerHTML != newName) {
            // If there's no selected item (eg New) add a new temp option
            if (!selectedOption) {
                selectedOption = document.createElement("OPTION");
                selectedOption.value = _appSettings.mazes.length;
                mazeSelect.appendChild(selectedOption);
            }

            // Update the new name on the option
            selectedOption.innerHTML = newName;
            mazeSelect.value = selectedOption.value;

            // Update the global maze name for save validation
            Maze._mazeName = newName;
        }
    }
}

// Select 'Rename' from app bar, which displays the free-text box and hides the picker
Maze.changeMazeTitle = function () {
    var editMazeName = document.getElementById("MAZENAME_EDIT");
    var mazeSelect = document.getElementById("SELECTMAZE");

    mazeSelect.style.display = "none";
    editMazeName.style.display = "";
    editMazeName.focus();
    editMazeName.value = mazeSelect.selectedIndex >= 0 ? mazeSelect.options[mazeSelect.selectedIndex].innerHTML : "";
}

// Resize in edit mode - enter to accept new size
Maze.blurOnEnter = function (e, element) {
    e = e || window.event;

    if (e.keyCode == 13) { // Enter
        element.blur();
    }
}

// Allow for swipe movement in playmaze (swipe oposite direction)
Maze.registerSwipeEvents = function () {
    var maze = Hammer(document.getElementById("PLAYMAZE"));

    maze.on("swipeleft", function () { Maze.moveRight(); });
    maze.on("swiperight", function () { Maze.moveLeft(); });
    maze.on("swipeup", function () { Maze.moveDown(); });
    maze.on("swipedown", function () { Maze.moveUp(); });
}

// When you hit "enter" in play mode, press the Start/Pause/Unpause button
Maze.startOnEnter = function () {
    // Needs to be keyup to avoid conflicts with the 'keydown' to move events
    window.onkeyup = function (e) {
        e = e || window.event;

        if (!Maze._isEditMode && e.keyCode == 13) { // Enter
            Maze.startOrPauseButton();
        }
    };
}

// When the undo button is clicked in edit mode, revert to the previous change
Maze.edit_undo = function () {
    var history = Maze._mazeHistory;

    if (history.length > 0) {
        // Render the last change
        var lastIndex = history.length - 1;
        var lastLayout = history[lastIndex];

        // Remove the last item from the history, as it's now the current value
        history.splice(lastIndex, 1);
        Maze._mazeHistory = history;

        // Render the last layout
        Maze.render(lastLayout, true, true);
    }
}

// When any changes are made to the maze layout, track the history for undoing
Maze.recordChange = function () {
    var history = Maze._undoHistory;

    // Update the history with the current change
    var oldLayout = Maze.getLayout();
    if (oldLayout != "") {
        history.push(oldLayout);

        // If the history gets too big, delete the oldest
        if (history.length > 10) {
            history.splice(0, 1);
        }

        // Update the global history
        Maze._mazeHistory = history;

        // Disable or Enable the undo button depending on if there is history
        Maze.enableOrDisableUndo();
    }
}

Maze.enableOrDisableUndo = function () {
    document.getElementById("UNDO").disabled = Maze._undoHistory.length <= 0;
}

Maze.initImportEvent = function() {
    document.getElementById('import').addEventListener('change', Maze.importMazeSelected, false);
}

Maze.importMaze = async function () {
    // If in play mode and the maze is changed, use the _layout to avoid saving cheats
    var currentLayout = Maze._isEditMode ? Maze.getLayout() : Maze._layout;

    // If the current maze is different to the saved maze (layout or name) prompt to save
    if (currentLayout != Maze._savedLayout || Maze._savedMazeName != Maze._mazeName) {
        var confirmed = await confirmCustomCancel("Do you want to save your current changes?", null, null, null, "Save", "Discard");

        if (confirmed === null) { return; } // Cancel

        if (confirmed === true) {
            if(!Maze.isValidLayout(currentLayout, false)) { return; }

            // Save the maze if valid
            await Maze.save();
        }
    }

    document.querySelector("#import").click();
}

Maze.importMazeSelected = function (evt) {
    let files = evt.target.files; // FileList object

    // use the 1st file from the list
    let f = files[0];
    let name = f.name;

    let ext = name.lastIndexOf(".");
    if (ext >= 0) {
        name = name.substring(0, ext);
    }

    let reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = function(e) {
        var layout = e.target.result;
        layout = layout.replace(/\r\n/g, "\n");

        if (Maze.isValidLayout(layout)) {
            Maze.saveMaze(name, name, null, layout, false, false, name);
        }

        evt.target.value = null;
    };

    // Read in the image file as a data URL.
    reader.readAsText(f);
}

Maze.exportMaze = function () {
    var layout = Maze.getLayout();

    var fileName = Maze._mazeName + ".maze";

    Maze.downloadFile(fileName, layout);
}

Maze.downloadFile = function (name, content) {
  var a = document.getElementById("export");
  var file = new Blob([content], {type: "text/plain"});
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
}