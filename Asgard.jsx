/**
 * @name Asgard
 * @version 1.2
 * @author Kyle Martinez <www.kyle-martinez.com>
 *
 * @description A 3rd-party script launcher for After Effects.
 *
 * Click the "F" button (folder button) to select a folder for JSX scripts. The folder path will be
 * stored in the After Effects preferences for future use.
 *
 * Search with the search box or scroll to a script you would like to use and double click it to run
 * the script.
 *
 * Click the "X" button (clear button) to clear the search box and repopulate the list.
 *
 * @license This script is provided "as is," without warranty of any kind, expressed or implied. In
 * no event shall the author be held liable for any damages arising in any way from the use of this
 * script.
 *
 * In other words, I'm just trying to help make life as an animator easier
 * "A rising tide lifts all boats." - John F. Kennedy, 1963
 */

(function(thisObj) {

    var SCRIPT_DATABASE = {};
    var SCRIPT_FILES = [];

    /**
     * Get a folder path from After Effects settings.
     * @return {String|Boolean} - folder path
     */
    function getFolderPath() {
        var folderPath = false;
        if (app.settings.haveSetting("Asgard", "Folder") === true) {
            folderPath = app.settings.getSetting("Asgard", "Folder");
        }
        return folderPath;
    }

    /**
     * Save a folder path to After Effects settings.
     * @param {String} folderPath - folder path
     */
    function setFolderPath(folderPath) {
        app.settings.saveSetting("Asgard", "Folder", folderPath);
        app.preferences.saveToDisk();
    }

    /**
     * Populate an aphabetically-sorted array of JSX files by recursively searching within a
     * directory and all subdirectories. Files are represented by objects with a name and a path
     * property.
     * @param  {Folder} folder - current folder
     * @param  {Array} files   - array of files
     * @return {Array}         - array of files
     */
    function getAllScriptFiles(folder, files) {
        var contents = folder.getFiles();
        var numContents = contents.length;
        for (var c = 0; c < numContents; c++) {
            var content = contents[c];
            if (content instanceof Folder) {
                getAllScriptFiles(content, files);
            } else {
                if (content.displayName.match(/\.jsx$/g)) {
                    var name = content.displayName.replace(".jsx", "");
                    var path = content.fsName;
                    files.push({
                        "name": name,
                        "path": path
                    });
                }
            }
        }
        return files.sort(function(a, b) {
            return (a.name < b.name) ? -1 : 1;
        });
    }

    /**
     * Check if a file name includes a given set of characters.
     * @param  {File} file     - current file
     * @param  {String} filter - string of characters
     * @return {Boolean}       - if string contains set of characters
     */
    function fileIncludes(file, filter) {
        return (file.name.toLowerCase().includes(filter.toLowerCase()));
    }

    /**
     * Add all file names to a listbox with optional filter.
     * @param  {listbox} listbox - list box
     * @param  {Array} files     - array of files
     * @param  {String} filter   - otional character set
     */
    function populateScriptList(listbox, files, filter) {
        listbox.removeAll();
        var listItem = null;
        var numFiles = files.length;
        for (var i = 0; i < numFiles; i++) {
            var file = files[i];
            if (filter === undefined || fileIncludes(file, filter)) {
                listItem = listbox.add("item", file.name);
                listItem.path = file.path;
            }
        }
    }

    /**
     * Get the database folder at ~/Library/Application Support/Asgard. If the
     * folder doesn't already exist then make it.
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
     * Save the database as a JSON file within the database folder.
     */
    function setDatabase() {
        var folder = getDatabaseFolder();
        var file = new File(folder.fsName + "/db.json");
        file.open("w");
        file.write(JSON.stringify(SCRIPT_DATABASE, undefined, 4));
        file.close();
    }

    /**
     * Get the database from the JSON file within the database folder. If the
     * file doesn't exist then make it.
     * @return {Object} - database
     */
    function getDatabase() {
        var database = {};
        var folder = getDatabaseFolder();
        var file = new File(folder.fsName + "/db.json");
        if (file.exists === true) {
            file.open("r");
            database = JSON.parse(file.read());
            file.close();
        }
        return database;
    }

    /**
     * Record the click usage of a script in the database.
     * @param  {String} fileName - script file name
     */
    function recordScript(fileName) {
        SCRIPT_DATABASE[fileName] = (SCRIPT_DATABASE[fileName] || 0) + 1;
        setDatabase();
    }

    /**
     * Execute ExtendScript code from a given JSX file.
     * @param  {String} filePath - file path
     */
    function executeScript(filePath) {
        $.evalFile(File(filePath));
    }

    /**
     * Build the UI for this script.
     * @param  {Panel|Window} thisObj - the script panel
     */
    function buildUI(thisObj) {
        var win = null;
        if (thisObj instanceof Panel) {
            win = thisObj;
        } else {
            win = new Window("palette", "Asgard", undefined, {resizeable: true});
        }

        win.alignChildren = ["fill", "top"];
        win.spacing = 5;
        win.margins = 0;

        var group = win.add("group");
        group.spacing = 2;
        group.margins = 0;

        var searchText = group.add("edittext");
        searchText.preferredSize.width = 218;
        searchText.previousText = "";
        searchText.onChanging = function() {
            var filter = this.text;
            if (filter !== this.previousText) {
                this.previousText = filter;
                populateScriptList(list, SCRIPT_FILES, filter);
            }
        };

        var clearButton = group.add("button");
        clearButton.text = "x";
        clearButton.maximumSize.height = 24;
        clearButton.maximumSize.width = 24;
        clearButton.onClick = function() {
            searchText.text = "";
            populateScriptList(list, ALL_SCRIPT_FILES);
        };

        var folderButton = group.add("button");
        folderButton.text = "f";
        folderButton.maximumSize.height = 24;
        folderButton.maximumSize.width = 24;
        folderButton.onClick = function() {
            var folder = Folder.selectDialog();
            if (folder !== null) {
                setFolderPath(folder.fsName);
                SCRIPT_FILES = getAllScriptFiles(folder, []);
                populateScriptList(list, SCRIPT_FILES);
            }
        };

        var list = win.add("listbox");
        list.maximumSize.height = 500;
        list.onDoubleClick = function() {
            recordScript(list.selection.fileName);
            executeScript(list.selection.filePath);
        };

        var folderPath = getFolderPath();
        if (folderPath !== false) {
            var folder = new Folder(folderPath);
            SCRIPT_DATABASE = getDatabase();
            SCRIPT_FILES = getAllScriptFiles(folder, []);
            populateScriptList(list, SCRIPT_FILES);
        }

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

    buildUI(thisObj);

})(this);