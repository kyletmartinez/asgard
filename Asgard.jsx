/**
 * @name Asgard
 * @version 1.2.1
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

    var GLOBAL_CLICK_DATABASE = {};
    var GLOBAL_SCRIPT_FILES = {};

    /**********************************************************************************************
     * GET ND SET FOLDER PATH IN AFTER EFFECTS SETTINGS *******************************************
     **********************************************************************************************/

    /**
     * Get a folder path from the After Effects settings.
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
     * Save a folder path in the After Effects settings.
     * @param {String} folderPath - folder path
     */
    function setFolderPath(folderPath) {
        app.settings.saveSetting("Asgard", "Folder", folderPath);
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
                    files.push({"name": name.replace(".jsx", ""), "path": item.fsName});
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
        file.write(JSON.stringify(GLOBAL_CLICK_DATABASE, undefined, 4));
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
        GLOBAL_CLICK_DATABASE[name] = (GLOBAL_CLICK_DATABASE[name] || 0) + 1;
        setClickDatabase();
    }

    /**
     * Get the number of clicks the current script has saved.
     * @param  {String} name - current script name
     * @return {Int}         - number of clicks
     */
    function getClicks(name) {
        return (GLOBAL_CLICK_DATABASE[name] || 0);
    }

    /**
     * Merge the script list and database into a single object containing both favorite and standard
     * script types.
     * @param  {Array} files - array of file objects
     * @return {Object}      - object of file objects
     */
    function mergeScriptFiles(files) {
        var scriptList = {"favorite": [], "standard": []};
        var numFiles = files.length;
        for (var i = 0; i < numFiles; i++) {
            var file = files[i];
            if (getClicks(file.name) >= 5) {
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
     * @param {Listbox} listbox - current listbox
     * @param {Object}  file    - current file object
     * @param {Boolean} useStar - if file indicates "favorite"
     */
    function addListItem(listbox, file, useStar) {
        var name = (useStar) ? "★ " + file.name : file.name;
        var listItem = listbox.add("item", name);
        listItem.fileName = file.name;
        listItem.filePath = file.path;
    }

    /**
     * Check to see if the file name contains a subset of characters.
     * @param  {Object} file   - current file object
     * @param  {String} filter - character filter
     * @return {Boolean}       - file name includes
     */
    function fileNameIncludes(file, filter) {
        return (file.name.toLowerCase().includes(filter.toLowerCase()));
    }

    /**
     * Add all scripts to the current listbox that match an optional filter.
     * @param {Listbox} listbox - current listbox
     * @param {Array}   files   - array of file objects
     * @param {Boolean} useStar - if list indicates "favorites"
     * @param {String}  filter  - character filter (optional)
     */
    function addListItems(listbox, files, useStar, filter) {
        var numFiles = files.length;
        for (var i = 0; i < numFiles; i++) {
            var file = files[i];
            if (filter === undefined || fileNameIncludes(file, filter)) {
                addListItem(listbox, file, useStar);
            }
        }
    }

    /**
     * Remove all scripts in the current listbox and rebuild the list with all scripts that match an
     * optional filter.
     * @param  {Listbox} listbox - current listbox
     * @param  {String}  filter  - character filter (optional)
     */
    function populateListbox(listbox, filter) {
        listbox.removeAll();
        addListItems(listbox, GLOBAL_SCRIPT_FILES.favorite, true, filter);
        addListItems(listbox, GLOBAL_SCRIPT_FILES.standard, false, filter);
    }

    /**********************************************************************************************
     * USER INTERFACE *****************************************************************************
     **********************************************************************************************/

    /**
     * Aquire the necessary script data and click data to populate the script listbox.
     * @param  {Listbox} listbox - current listbox
     */
    function refreshUserInterface(listbox) {
        var folderPath = getFolderPath();
        if (folderPath !== false) {
            var files = getScriptFiles(folderPath);
            GLOBAL_CLICK_DATABASE = getClickDatabase();
            GLOBAL_SCRIPT_FILES = mergeScriptFiles(files);
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
                populateListbox(listbox, filter);
            }
        };

        var clearButton = group.add("button");
        clearButton.text = "x";
        clearButton.maximumSize.height = 24;
        clearButton.maximumSize.width = 24;
        clearButton.onClick = function() {
            searchText.text = "";
            searchText.previousText = "";
            populateListbox(listbox, filter);
        };

        var folderButton = group.add("button");
        folderButton.text = "f";
        folderButton.maximumSize.height = 24;
        folderButton.maximumSize.width = 24;
        folderButton.onClick = function() {
            var folder = Folder.selectDialog();
            if (folder !== null) {
                setFolderPath(folder.fsName);
                refreshUserInterface(listbox);
            }
        };

        var listbox = win.add("listbox");
        listbox.maximumSize.height = 500;
        listbox.onDoubleClick = function() {
            setClicks(listbox.selection.fileName);
            $.evalFile(File(listbox.selection.filePath));
        };

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