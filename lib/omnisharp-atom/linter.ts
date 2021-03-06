var linterPath = atom.packages.resolvePackagePath("linter");
var Linter = { Linter: <typeof Linter.Linter>require(`${linterPath}/lib/linter`) };
import Omni = require('../omni-sharp-server/omni');
import _ = require('lodash');
var Range = require('atom').Range;

interface LinterError {
    message: string;
    line: number; // startline.
    range: any; // LinterRange([startline,startch],[endline,endch]);
    level: string; // 'error' | 'warning'
    linter: string; // linter name
}

class LinterCSharp extends Linter.Linter {

    static linterName: string = "C#";
    static syntax: string = "source.cs";
    static regex: string = "";

    constructor(public editor : Atom.TextEditor) {
        super(editor);
        this.editor = editor;
    }

    getWordAt(str: string, pos: number) {

        var wordLocation = {
            start: pos,
            end: pos
        }

        if (str === undefined) {
            return wordLocation;
        }

        while (pos < str.length && /\W/.test(str[pos])) {
            ++pos;
        }

        var left = str.slice(0, pos + 1).search(/\W(?!.*\W)/);
        var right = str.slice(pos).search(/(\W|$)/);

        wordLocation.start = left + 1;
        wordLocation.end = wordLocation.start + right;

        return wordLocation;
    }

    public lintFile(filePath: string, callback): any {
        if (!Omni.turnedOnAndReady) {
            return;
        }

        Omni.client.codecheckPromise(Omni.makeRequest(this.editor))
            .then(data => {

            var errors = _.map(data.QuickFixes, (error: OmniSharp.Models.DiagnosticLocation): LinterError => {
                var line = error.Line - 1;
                var column = error.Column - 1;
                var text = this.editor.lineTextForBufferRow(line);
                var wordLocation = this.getWordAt(text, column);
                var level = error.LogLevel.toLowerCase();

                if (level === "hidden") {
                    level = "info"
                }

                return {
                    message: error.Text,
                    line: line + 1,
                    col: column,
                    level: level,
                    range: new Range([line, wordLocation.start], [line, wordLocation.end]),
                    linter: "C#"
                }
            });

            return callback(errors)

        });
    }
}

export = LinterCSharp;
