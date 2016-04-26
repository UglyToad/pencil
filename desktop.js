module.exports = function () {
    var spawn = require("child_process").spawn;
    var fontCommandRegistry = {
                                "xfce": [{command: "xfconf-query", params: ["-c", "xsettings",  "-p", "/Gtk/FontName"]}],
                                "mate": [{command: "dconf", params: ["read", "/org/mate/desktop/interface/font-name"]}],
                                "cinamon": [{command: "dconf", params: ["read", "/org/cinnamon/desktop/interface/font-name"]},
                                            {command: "gsettings", params: ["get", "org.cinnamon.desktop.interface", "font-name"]}],
                                "gnome": [{command: "gsettings", params: ["get", "org.gnome.desktop.interface", "font-name"]}],
                            }
    var fontNameReader = function(registry, callback, index) {
        var child = spawn(registry.command, registry.params);
        var tmp = "";
        child.stdout.on("data", function(chunk) {
            tmp += chunk.toString();
        });
        child.stdout.on("close", function() {
            callback(tmp, index);
        });
    };
    var fontProcessor = function(fontName, callback) {
        console.log("Process font name ", fontName);
        var family = "sans-serif";
        var weight = 400;
        var style = "normal";
        var size = "1em";

        if (fontName.match(/^'(.+)'$/)) fontName = RegExp.$1;

        if (fontName.match(/^(.+) ([0-9]+)$/)) {
            size = RegExp.$2 + "pt";
            fontName = RegExp.$1.trim();

            if (fontName.match(/^(.+) Italic$/i)) {
                style = "italic";
                fontName = RegExp.$1.trim();
            }

            if (fontName.match(/^(.+) (([a-z]+\-)?(thin|light|bold|black|heavy))$/i)) {
                var styleName = RegExp.$4.toLowerCase();
                if (styleName == "thin") weight = "100";
                if (styleName == "light") weight = "300";
                if (styleName == "bold") weight = "700";
                if (styleName == "black" || styleName == "heavy") weight = "900";
                fontName = RegExp.$1.trim();
            }

            family = fontName;
        }

        callback({
            family: family,
            weight: weight,
            style: style,
            size: size
        });
    };

    var platformHandlers = {
        linux: function (callback) {
            var d = process.env.DESKTOP_SESSION;
            var fontRegistry = fontCommandRegistry[d];
            if (!fontRegistry) {
                console.error("Coud not found font command registry for ", d);
                callback({
                    family: "sans-serif",
                    weight: 400,
                    style: "normal",
                    size: "1em"
                });
            } else {
                var fontNames = [];
                var processFontName = function(finish) {

                    if (finish && fontNames.length == 0) {
                        callback({
                            family: family,
                            weight: weight,
                            style: style,
                            size: size
                        });
                        return;
                    }

                    var fontName = fontNames[0];
                    fontProcessor(fontName, callback);

                }

                for (var i = 0; i < fontRegistry.length; i++) {
                    var registry = fontRegistry[i];
                    fontNameReader(registry, function(fontName, index) {
                        console.log("fontName " + fontName);
                        if (fontName != null && fontName.length > 0) {
                            fontNames.push(fontName);
                        }
                        processFontName(index == fontRegistry.length -1);
                    }, i);
                }
            }
        },
        /*window: function(callback) {
            var Key = require('windows-registry').Key,
	        var windef = require('windows-registry').windef;
            var key = new Key(windef.HKEY.HKEY_CLASSES_ROOT, '.txt', windef.KEY_ACCESS.KEY_ALL_ACCESS);
            var value = key.getValue('font');
        },*/
        darwin: function (callback) {
            callback({
                family: "Helvetica Neue",
                weight: "400",
                style: "normal",
                size: "10pt"
            });
        }
    }

    function getDesktopFontConfig(callback) {
        var platform = process.platform;
        var handler = platformHandlers[platform];
        if (!handler) {
            callback({
                family: "sans-serif",
                weight: "400",
                style: "normal",
                size: "12pt"
            });
            return;
        }

        handler(callback);
    }


    return {
        getDesktopFontConfig: getDesktopFontConfig
    }
}();