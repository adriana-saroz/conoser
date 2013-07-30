(function() {
    var root = this;
    var conoser = root.conoser = {};
    // var conoser.editor = ace.edit("editor");
    var editor = conoser.editor = ace.edit("editor");
    // Range = require("ace/range").Range

    editor.setTheme("ace/theme/ambiance");
    editor.getSession().setMode("ace/mode/javascript");
    editor.setValue("");

    var editorDoc = conoser.editorDoc = editor.getSession().getDocument();
    editorDoc.setNewLineMode('unix');

    var Range = conoser.Range = ace.require("ace/range").Range;

    editListener = function(change) {
        if (!WOOT.supress) {
            WOOT.applyWoot(editorDoc, change.data);
        }
    }
        
    $("#language-dropdown .dropdown-menu a").on("click", function(event){
        var selectedLanguage = $(event.target).attr("language");
        var selectedId = $(event.target).attr("language-id");
        conoser.updateSyntax(selectedId, selectedLanguage);
        rtc.broadcastMessage({
            type: 'syntax',
            language_id: selectedId,
            language_name: selectedLanguage
        });
    });

    $("#join #login-action").on("click", function(event){
        var room = $('#join #room')[0].value;
        var username = $('#join #username')[0].value;

        if (username.length > 0) {
            $('#join #username-error')[0].style.visibility = 'hidden';
            $('#join #room')[0].value = "";
            $('#join #username')[0].value = "";
            rtc.connect(room, username);

        } else {
            $('#join #username-error')[0].style.visibility = 'visible';
            return false;
        }
    });

    conoser.updateSyntax = function(id, language) {
        $("#selected-language").attr('language-id', id);
        $("#selected-language").attr('language', language);
        $("#selected-language span").text(language);
        editor.getSession().setMode("ace/mode/" + id);
    }

    window.onload = function start() {
        $('#join-modal').modal();
        editor.getSession().on('change', editListener);
        // setInterval(WOOT.main, 100);
    }

}());
