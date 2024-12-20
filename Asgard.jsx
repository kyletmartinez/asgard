/**
 * @name Asgard
 * @version 1.2.1
 * @author Kyle Martinez <www.kyle-martinez.com>
 *
 * @description A 3rd-party script launcher for After Effects.
 *
 * Click the "X" button to clear the search box and repopulate the list.
 * Click the "S" button to open the settings window.
 *
 * SETTINGS WINDOW:
 *
 * Click the "Set New Folder" button to set a new folder location to load scripts.
 * Click the "Reset Favorites" to remove all recorded click usage.
 * Set your favorite text or emoji to represent commonly clicked scripts.
 *
 * @license This script is provided "as is," without warranty of any kind, expressed or implied. In
 * no event shall the author be held liable for any damages arising in any way from the use of this
 * script.
 *
 * In other words, I'm just trying to help make life as an animator easier
 * "A rising tide lifts all boats." - John F. Kennedy, 1963
 */

(function(thisObj) {

    var Script = {"CLICKS": {}, "FILES": {}, "ICON": "🎉"};

    /**********************************************************************************************
     * GET AND SET AFTER EFFECTS SETTINGS *********************************************************
     **********************************************************************************************/

    /**
     * Get a setting from the After Effects preferences file.
     * @param  {String} keyName    - name of setting
     * @param  {String} keyDefault - default value of setting (if not previously saved)
     * @return {String}            - value of setting
     */
    function getAfterEffectsSettings(keyName, keyDefault) {
        var keyValue = keyDefault;
        if (app.settings.haveSetting("Asgard", keyName) === true) {
            keyValue = app.settings.getSetting("Asgard", keyName);
        }
        return keyValue;
    }

    /**
     * Save a setting to the After Effects preferences file.
     * @param {String} keyName  - name of setting
     * @param {String} keyValue - value of setting
     */
    function setAfterEffectsSetting(keyName, keyValue) {
        app.settings.saveSetting("Asgard", keyName, keyValue);
        app.preferences.saveToDisk();
    }

    /**********************************************************************************************
     * GET SCRIPT FILES FROM FILE SYSTEM **********************************************************
     **********************************************************************************************/

    /**
     * Recursively get all JSX files from a folder and any subfolders. Return an array of file
     * objects containing a name and path property.
     * @param  {Folder} folder - current folder
     * @param  {Array}  files  - array of file objects
     * @return {Array}         - array of file objects
     */
    function getAllScriptFiles(folder, files) {
        var items = folder.getFiles();
        var numItems = items.length;
        for (var i = 0; i < numItems; i++) {
            var item = items[i];
            if (item instanceof Folder) {
                getAllScriptFiles(item, files);
            } else {
                var name = item.displayName;
                if (name.match(/\.jsx$/g)) {
                    files.push({
                        "name": name.replace(".jsx", ""),
                        "path": item.fsName
                    });
                }
            }
        }
        return files;
    }

    /**
     * Get all JSX files from a folder. Return an unsorted array of file objects containing a name
     * and path property.
     * @param  {String} folderPath - folder path
     * @return {Array}             - array of file objects
     */
    function getScriptFiles(folderPath) {
        var folder = new Folder(folderPath);
        var files = getAllScriptFiles(folder, []);
        return files;
    }

    /**********************************************************************************************
     * GET AND SET DATABASE JSON FILE *************************************************************
     **********************************************************************************************/

    /**
     * Get the database folder.
     * @return {Folder} - database folder
     */
    function getDatabaseFolder() {
        var folder = new Folder(Folder.userData.fsName + "/Asgard");
        if (folder.exists === false) {
            folder.create();
        }
        return folder;
    }

    /**
     * Save the database object to the local JSON file.
     */
    function setClickDatabase() {
        var folder = getDatabaseFolder();
        var file = new File(folder.fsName + "/db.json");
        file.open("w");
        file.write(JSON.stringify(Script.CLICKS, undefined, 4));
        file.close();
    }

    /**
     * Get the database from the local JSON file.
     * @return {Object} - database object
     */
    function getClickDatabase() {
        var database = {};
        var folder = getDatabaseFolder();
        var file = new File(folder.fsName + "/db.json");
        if (file.exists === true) {
            file.open("r");
            database = JSON.parse(file.read());
            file.close();
        }
        return (database || {});
    }

    /**
     * Update the number of clicks the current script has saved.
     * @param {String} name - current script name
     */
    function setClicks(name) {
        Script.CLICKS[name] = (Script.CLICKS[name] || 0) + 1;
        setClickDatabase();
    }

    /**
     * Get the number of clicks the current script has saved.
     * @param  {String} name - current script name
     * @return {Int}         - number of clicks
     */
    function getClicks(name) {
        return (Script.CLICKS[name] || 0);
    }

    /**
     * Get the minimum click value to add to favorites. This is calculated by finding the lowest
     * click amount within the top percentage of all clicks.
     * @param  {Float} percentage - top percentage of clicks to look at
     * @return {Int}              - minimum click clount
     */
    function getMinimumClicks(percentage) {
        var clickArray = [];
        for (key in Script.CLICKS) {
            if (Script.CLICKS.hasOwnProperty(key) === true) {
                clickArray.push(Script.CLICKS[key]);
            }
        }
        clickArray.sort(function(a, b) {
            return b - a;
        });
        return clickArray[Math.floor(clickArray.length * percentage)];
    }

    /**
     * Merge the script list and database into a single object containing both favorite and standard
     * script types.
     * @param  {Array} files - array of file objects
     * @return {Object}      - object of file objects
     */
    function mergeScriptFiles(files) {
        var scriptList = {"favorite": [], "standard": []};
        var minClicks = getMinimumClicks(0.25);
        var numFiles = files.length;
        for (var i = 0; i < numFiles; i++) {
            var file = files[i];
            if (getClicks(file.name) >= minClicks) {
                scriptList.favorite.push(file);
            } else {
                scriptList.standard.push(file);
            }
        }
        scriptList.favorite.sort(function(a, b) {
            return (a.name < b.name) ? -1 : 1;
        });
        scriptList.standard.sort(function(a, b) {
            return (a.name < b.name) ? -1 : 1;
        });
        return scriptList;
    }

    /**********************************************************************************************
     * POPULATE LISTBOX UI ************************************************************************
     **********************************************************************************************/

    /**
     * Add a script to the current listbox.
     * @param {Listbox} listbox    - current listbox
     * @param {Object}  file       - current file object
     * @param {Boolean} isFavorite - if file is favorite
     */
    function addListItem(listbox, file, isFavorite) {
        var name = (isFavorite) ? Script.ICON + " " + file.name : file.name;
        var listItem = listbox.add("item", name);
        listItem.fileName = file.name;
        listItem.filePath = file.path;
    }

    /**
     * Check to see if the file name contains a subset of characters.
     * @param  {Object} file   - current file object
     * @param  {String} filter - character(s) filter
     * @return {Boolean}       - file name includes
     */
    function fileNameIncludes(file, filter) {
        return (file.name.toLowerCase().includes(filter.toLowerCase()));
    }

    /**
     * Add all scripts to the current listbox that match an optional filter.
     * @param {Listbox} listbox    - current listbox
     * @param {Array}   files      - array of file objects
     * @param {Boolean} isFavorite - if file is favorite
     * @param {String}  filter     - character(s) filter
     */
    function addListItems(listbox, files, isFavorite, filter) {
        var numFiles = files.length;
        for (var i = 0; i < numFiles; i++) {
            var file = files[i];
            if (filter === undefined || fileNameIncludes(file, filter)) {
                addListItem(listbox, file, isFavorite);
            }
        }
    }

    /**
     * Remove all scripts in the current listbox and rebuild the list with all scripts that match an
     * optional filter.
     * @param  {Listbox} listbox - current listbox
     * @param  {String}  filter  - character(s) filter
     */
    function populateListbox(listbox, filter) {
        listbox.removeAll();
        addListItems(listbox, Script.FILES.favorite, true, filter);
        addListItems(listbox, Script.FILES.standard, false, filter);
    }

    /**********************************************************************************************
     * SETTINGS USER INTERFACE ********************************************************************
     **********************************************************************************************/

    function openSettings(listbox) {
        var win = new Window("dialog", "Settings");
        win.alignChildren = ["fill", "fill"];

        var setFolderButton = win.add("button", undefined, "Set New Folder");
        setFolderButton.onClick = function() {
            var folder = Folder.selectDialog();
            if (folder !== null) {
                setAfterEffectsSetting("Folder", folder.fsName);
                refreshUserInterface(listbox);
            }
        };

        var resetFavoritesButton = win.add("button", undefined, "Reset Favorites");
        resetFavoritesButton.onClick = function() {
            Script.CLICKS = {};
            setClickDatabase();
            refreshUserInterface(listbox);
        };

        var group = win.add("group");

        var favoritesIconLabel = group.add("statictext", undefined, "Favorites Icon:");
        favoritesIconLabel.preferredSize.width = 70;

        var favoritesIconEditText = group.add('edittext {justify: "center"}');
        favoritesIconEditText.text = Script.ICON;
        favoritesIconEditText.preferredSize.width = 70;

        var okButton = win.add("button", undefined, "Ok");
        okButton.onClick = function() {
            Script.ICON = favoritesIconEditText.text;
            setAfterEffectsSetting("Icon", Script.ICON);
            refreshUserInterface(listbox);
            win.close();
        };

        win.show();
    }

    /**********************************************************************************************
     * PANEL USER INTERFACE ***********************************************************************
     **********************************************************************************************/

    /**
     * Aquire the necessary script data and click data to populate the script listbox.
     * @param  {Listbox} listbox - current listbox
     */
    function refreshUserInterface(listbox) {
        var folderPath = getAfterEffectsSettings("Folder", false);
        if (folderPath !== false) {
            var files = getScriptFiles(folderPath);
            Script.CLICKS = getClickDatabase();
            Script.FILES = mergeScriptFiles(files);
            populateListbox(listbox);
        }
    }

    /**
     * Build the UI for this script.
     * @param  {Panel|Window} thisObj - the script panel
     */
    function buildUserInterface(thisObj) {
        var win = null;
        if (thisObj instanceof Panel) {
            win = thisObj;
        } else {
            win = new Window("palette", "Asgard", undefined, {resizeable: true});
        }

        win.alignChildren = ["left", "top"];
        win.margins = 0;
        win.spacing = 5;

        var group = win.add("group");
        group.alignChildren = ["right", "fill"];
        group.alignment = "fill";
        group.margins = 0;
        group.spacing = 5;

        var searchText = group.add("edittext");
        searchText.alignment = ["fill","fill"];
        searchText.previousText = "";
        searchText.onChanging = function() {
            var filter = this.text;
            if (filter !== this.previousText) {
                this.previousText = filter;
                populateListbox(listbox, filter);
            }
        };

        var clearButton = group.add("button", undefined, "x");
        clearButton.minimumSize = [24, 24];
        clearButton.maximumSize = [24, 24];
        clearButton.onClick = function() {
            searchText.text = "";
            searchText.previousText = "";
            populateListbox(listbox);
        };

        var settingsButton = group.add("button", undefined, "s");
        settingsButton.text = "s";
        settingsButton.minimumSize = [24, 24];
        settingsButton.maximumSize = [24, 24];
        settingsButton.onClick = function() {
            openSettings(listbox);
        };

        var listbox = win.add("listbox");
        listbox.alignment = ["fill", "fill"];
        listbox.onDoubleClick = function() {
            setClicks(listbox.selection.fileName);
            $.evalFile(File(listbox.selection.filePath));
        };

        Script.ICON = getAfterEffectsSettings("Icon", Script.ICON);
        refreshUserInterface(listbox);

        win.onResizing = win.onResize = function() {
            this.layout.resize();
        };

        if (win instanceof Window) {
            win.center();
            win.show();
        } else {
            win.layout.layout(true);
            win.layout.resize();
        }
    }

    buildUserInterface(thisObj);

})(this);