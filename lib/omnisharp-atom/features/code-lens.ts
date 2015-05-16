import _ = require('lodash');
import spacePenViews = require('atom-space-pen-views')
var $ = spacePenViews.jQuery;
import Omni = require('../../omni-sharp-server/omni');
import omnisharp = require("omnisharp-client");
import OmniSharpAtom = require('../omnisharp-atom');

class CodeLens {
  constructor(private atomSharper: typeof OmniSharpAtom) {
    this.atomSharper = atomSharper;
  }

  public activate() {

    this.atomSharper.onEditor((editor: Atom.TextEditor) => {
      editor.getBuffer().onDidStopChanging(() => this.updateCodeLens(editor));
      editor.getBuffer().onDidSave(() => this.updateCodeLens(editor));
      editor.getBuffer().onDidDelete(() => this.updateCodeLens(editor));
      editor.getBuffer().onDidReload(() => this.updateCodeLens(editor));

      editor.onDidChangeScrollTop((top) => {
        var editorView = $(atom.views.getView(editor));
        var line = $(".codelens", this.getFromShadowDom(editorView, ".scroll-view"));

        line.css("top", top + "px");

      });
    });

    Omni.registerConfiguration(client => {
      client.state.subscribe(state => {
        if (state === omnisharp.DriverState.Connected)
          this.updateCodeLens(null);
      });
    });

  }

  public updateCodeLens(editor: Atom.TextEditor) {
    var self = this; // yay for scoping, I always forget in typescript, what this does, big arrow should bind this to the class instance, right?
    if (editor == undefined || Omni.client === undefined || Omni.client.currentState !== omnisharp.DriverState.Connected) return;

    var lineHeight = "+=" + editor.getLineHeightInPixels() + "px";
    var editorView = $(atom.views.getView(editor));

    _.debounce(() => {
      var request = <OmniSharp.Models.FormatRangeRequest>Omni.makeRequest(editor);
      Omni.client.currentfilemembersasflatPromise(request)
        .then((fileMembers) => {
          _.forEach(fileMembers, function(fileMember: OmniSharp.Models.QuickFix) {
            console.log(fileMember);

            var req = <OmniSharp.Models.FindUsagesRequest>{
              Column: fileMember.Column + 1,
              FileName: request.FileName,
              Line: fileMember.Line,
            };
            //go get the count of the usages
            Omni.client.findusagesPromise(req)
              .then((findUsagesResponse) => {

                var line = $(`[data-screen-row = '${req.Line}']`, self.getFromShadowDom(editorView, ".scroll-view"));
                var references = $(`<div class="codelens" style = "position: absolute; top: ${parseInt(line.css("top"), 10) || 0}px;" > ${findUsagesResponse.QuickFixes.length } References </div>`);
                references
                  .insertBefore(line)
                  .nextAll()
                  .each((idx, item) => {
                    var jqitem = $(item);
                    if (!jqitem.is(".codelens")) {
                      $(item).animate({ Top: lineHeight }, 0);
                    }
                  });
              });
          });
        });
    }, 500)();
  }

  private getFromShadowDom(element: JQuery, selector: string): JQuery {
    var el = element[0];
    var found = (<any> el).rootElement.querySelectorAll(selector);
    return $(found[0]);
  }
}

export = CodeLens;
