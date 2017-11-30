/*
 * Author: Ivana, based on implementation by Koh Zi Chun
 */

(function(mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
        mod(require("../../lib/codemirror"));
    else if (typeof define == "function" && define.amd) // AMD
        define(["../../lib/codemirror"], mod);
    else // Plain browser env
        mod(CodeMirror);
})

(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("liscript", function () {

    var KEYWORD = "keyword", LIBWORD = "builtin", WORD = null,
        COMMENT = "comment", STRING = "string",
        ATOM = "atom", NUMBER = "number", BRACKET = "bracket";
    var INDENT_WORD_SKIP = 2;

    function makeKeywords(str) {
        var obj = {}, words = str.split(" ");
        for (var i = 0; i < words.length; ++i) obj[words[i]] = true;
        return obj;
    }
	
    var keywords = makeKeywords("+ - * / mod ++   > >= < <= = /= eq?   def set! get   quote typeof print trace bind-symbols   cons car cdr   cond   lambda macro macroexpand  eval eval-in");

    //var indentKeys = makeKeywords("define let letrec let* lambda");
    var indentKeys = makeKeywords("def lambda");

    //boundedSymbols
    var libwords = makeKeywords("ntimes and replicate inl match free-sym while list-ref length string? mapcar zipwith reverse macro? defmacro sort noelem unfold append cadr elem nil take abs caar foldr atom? map or foldl flatten list-from-to bool? filter concat inln span all lambda? null? \\n list? make any tolist xor chunks-of nub id defn mapa number? cddr symbol? not cadar drop");

    function stateStack(indent, type, prev) {
        // represents a state stack object
        this.indent = indent;
        this.type = type;
        this.prev = prev;
    }
    function pushStack(state, indent, type) {
        state.indentStack = new stateStack(indent, type, state.indentStack);
    }
    function popStack(state) {
        state.indentStack = state.indentStack.prev;
    }
	
    return {
        startState: function () {
            return {
                indentStack: null,
                indentation: 0,
                mode: false
                //sExprComment: false
            };
        },

        token: function (stream, state) {
            if (state.indentStack == null && stream.sol()) {
                // update indentation, but only if indentStack is empty
                state.indentation = stream.indentation();
            }

            // skip spaces
            if (stream.eatSpace()) {
                return null;
            }
            var returnType = null;

            switch(state.mode){

                case "string": // multi-line string parsing mode
                    var next, escaped = false;
                    while ((next = stream.next()) != null) {
                        if (next == "\"" && !escaped) {
                            state.mode = false;
                            break;
                        }
                        escaped = !escaped && next == "\\";
                    }
                    returnType = STRING; // continue on in liscript-string mode
                    break;

                case "comment": // multi-line comment parsing mode
                    var next;
                    while ((next = stream.next()) != null) {
                        if (next == ";") {
                            state.mode = false;
                            break;
                        }
                    }
                    returnType = COMMENT;
                    break;

                default: // default parsing mode
                    var ch = stream.next();

                    if (ch == "\"") {
                        state.mode = "string";
                        returnType = STRING;

                    } else if (ch == ";") {
                        state.mode = "comment";
                        returnType = COMMENT;

                    } else if (ch == "'") {
                        returnType = ATOM;

                    //} else if (/^[-+0-9.]/.test(ch) && isDecimalNumber(stream, true)) {
                    //    returnType = NUMBER;

                    } else if (ch == "(" || ch == "[") {
                        var keyWord = ''; var indentTemp = stream.column(), letter;
                        /**
                        Either
                        (indent-word ..
                        (non-indent-word ..
                        (;something else, bracket, etc.
                        */

                        while ((letter = stream.eat(/[^\s\(\[\;\)\]]/)) != null) {
                            keyWord += letter;
                        }

                        if (keyWord.length > 0 && indentKeys.propertyIsEnumerable(keyWord)) {
                            // indent-word
                            pushStack(state, indentTemp + INDENT_WORD_SKIP, ch);
                        } else {
                            // non-indent word
                            // we continue eating the spaces
                            stream.eatSpace();
                            if (stream.eol() || stream.peek() == ";") {
                                // nothing significant after
                                // we restart indentation 1 space after
                                pushStack(state, indentTemp + 1, ch);
                            } else {
                                // else we match
                                pushStack(state, indentTemp + stream.current().length, ch);
                            }
                        }
                        stream.backUp(stream.current().length - 1); // undo all the eating

                        //if(typeof state.sExprComment == "number") state.sExprComment++;

                        returnType = BRACKET;

                    } else if (ch == ")" || ch == "]") {
                        returnType = BRACKET;
                        if (state.indentStack != null
                            && state.indentStack.type == (ch == ")" ? "(" : "[")) {
                            popStack(state);
                        }
                    } else {
                        stream.eatWhile(/[\w_\-!$%&*+\.\/:<=>?@\^~]/);

                        if (!isNaN(stream.current())) {
                            returnType = NUMBER;
                        } else if (keywords && keywords.propertyIsEnumerable(stream.current())) {
                            returnType = KEYWORD;
                        } else if (libwords && libwords.propertyIsEnumerable(stream.current())) {
                            returnType = LIBWORD;
                        } else
                            returnType = WORD;
                    }
            }
            return returnType;
        },

        indent: function (state) {
            if (state.indentStack == null) return state.indentation;
            return state.indentStack.indent;
        },

        closeBrackets: {pairs: "()[]{}\"\""},
        lineComment: ";;"
    };
});

CodeMirror.defineMIME("text/x-liscript", "liscript");

});
