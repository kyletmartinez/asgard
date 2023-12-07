(function(thisObj) {

    var ALL_SCRIPT_FILES = null;

    function getFolderPath() {
        var folderPath = null;
        if (app.settings.haveSetting("Asgard", "Folder") === true) {
            folderPath = app.settings.getSetting("Asgard", "Folder");
        }
        return folderPath;
    }

    function setFolderPath(folderPath) {
        app.settings.saveSetting("Asgard", "Folder", folderPath);
        app.preferences.saveToDisk();
    }

    function getAllScriptFiles(folderPath) {
        var folder = new Folder(folderPath);
        var allFiles = folder.getFiles();
        var numAllFiles = allFiles.length;
        var files = [];
        for (var i = 0; i < numAllFiles; i++) {
            var file = allFiles[i];
            if (file.displayName !== ".DS_Store") {
                var name = file.displayName.replace(".jsx", "");
                var path = file.fsName;
                files.push({
                    "name": name,
                    "path": path
                });
            }
        }
        return files.sort(function(a, b) {
            return (a.name < b.name) ? -1 : 1
        })
    }

    function populateScriptList(listbox, files, filter) {
        listbox.removeAll();
        var numFiles = files.length;
        for (var i = 0; i < numFiles; i++) {
            var file = files[i];
            if (filter !== undefined) {
                if (file.name.toLowerCase().includes(filter) == true) {
                    var listItem = listbox.add("item", file.name);
                    listItem.path = file.path;
                }
            } else {
                var listItem = listbox.add("item", file.name);
                listItem.path = file.path;
            }
        }
    }

    function executeScript(filePath) {
        var file = new File(filePath);
        file.open("r");
        eval(file.read());
        file.close();
    }

    function buildUI(thisObj) {
        var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Asgard", undefined, {
            resizeable: true
        });
        win.alignChildren = ["fill", "top"];
        win.spacing = 5;
        win.margins = 0;

        var group = win.add("group");
        group.spacing = 2;
        group.margins = 0;

        var searchText = group.add("edittext", undefined, "");
        searchText.preferredSize.width = 218;
        searchText.onChanging = function() {
            var filter = this.text.toLowerCase();
            populateScriptList(list, ALL_SCRIPT_FILES, filter);
        }

        var clearButton = group.add("button", undefined, "x");
        clearButton.maximumSize.height = 24;
        clearButton.maximumSize.width = 24;
        clearButton.onClick = function() {
            searchText.text = "";
            populateScriptList(list, ALL_SCRIPT_FILES);
        }

        var settingsButton = group.add("button", undefined, "s");
        settingsButton.maximumSize.height = 24;
        settingsButton.maximumSize.width = 24;
        settingsButton.onClick = function() {
            var folder = Folder.selectDialog();
            if (folder !== null) {
                setFolderPath(folder.fsName);
                ALL_SCRIPT_FILES = getAllScriptFiles(folder.fsName);
                populateScriptList(list, ALL_SCRIPT_FILES);
            }
        }

        var list = win.add("listbox", undefined, undefined);
        list.maximumSize.height = 500;
        list.onDoubleClick = function() {
            executeScript(list.selection.path);
        }

        var folderPath = getFolderPath();
        if (folderPath !== null) {
            ALL_SCRIPT_FILES = getAllScriptFiles(folderPath);
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