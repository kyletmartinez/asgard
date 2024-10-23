/**
 * @name Asgard
 * @version 1.1
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

    var ALL_SCRIPT_FILES = [];

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
     * Execute ExtendScript code from a given JSX file.
     * @param  {String} filePath - file path
     */
    function executeScript(filePath) {
        var file = new File(filePath);
        $.evalFile(file);
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
        searchText.onChanging = function() {
            var filter = this.text;
            populateScriptList(list, ALL_SCRIPT_FILES, filter);
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
                ALL_SCRIPT_FILES = [];
                getAllScriptFiles(folder, ALL_SCRIPT_FILES);
                populateScriptList(list, ALL_SCRIPT_FILES);
            }
        };

        var list = win.add("listbox");
        list.maximumSize.height = 500;
        list.onDoubleClick = function() {
            executeScript(list.selection.path);
        };

        var folderPath = getFolderPath();
        if (folderPath !== false) {
            var folder = new Folder(folderPath);
            getAllScriptFiles(folder, ALL_SCRIPT_FILES);
            populateScriptList(list, ALL_SCRIPT_FILES);
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