(function() {
    var root = this;

    /*Without Operational Transformation*/
    var WOOT = root.WOOT = {};

    // TODO: set site id !
    WOOT.siteId = 1;
    WOOT.counter = 0;
    WOOT.sequence = null;
    WOOT.pool = [];

    var startId = -1;
    var endId = 0;
    WOOT.supress = false;

    
    isEqualId = function(id, other){
        if (id.siteId == other.siteId && id.elemId == other.elemId) {
            return true;
        }
        return false;
    }

    compareId = function(id, other) {
        if (id.siteId == other.siteId && id.elemId == other.elemId) {
            return 0;
        
        } else if (id.siteId > other.siteId) {
            return 1;
        
        } else if (id.siteId < other.siteId) {
            return -1;
        
        } else if (id.elemId > other.elemId){
            return 1;
        }

        return -1;
    }

    WCharId = function (elemId) {

        this.siteId = WOOT.siteId;
        this.elemId = elemId;

        this.toString = function() {
            return this.siteId + "/" + this.elemId;
        };
    }
    
    WChar = function(id, value, prevId, nextId, visibility) {

        this.id = id;
        this.value = value;
        this.prevId = prevId;
        this.nextId = nextId;
        this.visibility = typeof visibility !== 'undefined' ? visibility : true;

        this.toString = function() {
            return "[" + this.id + ", " + this.value + ", " 
                    + this.prevId + ", " + this.nextId +  "]";

        }
    }

    WString = function() {

        this.elements = [];

        this.first = new WChar(new WCharId(startId), null, null, null, false);
        this.last = new WChar(new WCharId(endId), null, null, null, false);
        this.elements.push(this.first);
        this.elements.push(this.last);

        Object.defineProperty(this, "length", {
            get: function() {
                return this.elements.length;
            }
        });
        
        this.add = function(item, index) {
            this.elements.splice(index, 0, item);
        }

        this.get = function(id) {
            for (var i = 0; i < this.length; i++) {
                wchar = this.elements[i];
                // TODO: wchar.id === id;
                if (isEqualId(wchar.id, id)) {
                    return wchar;
                }
            }
            return {};
        }

        this.ithVisible = function(index) {
            if (index <= 0) {
                return this.first;

            } else if (index > this.length - 2) {
                return this.last;
            }

            var count = 0;
            var wchar;
            for (var i = 0; i < this.length; i++) {
                wchar = this.elements[i];
                if (wchar.visibility) {
                    count++;
                    if (count === index) {
                        return wchar;
                    }
                }
            }
            return this.last;
        };

        this.indexOf = function(element) {
            for (var i = 0; i < this.length; i++) {
                wchar = this.elements[i];
                if (isEqualId(wchar.id, element.id)) {
                    return i;
                }
            }
            return -1;
        };

        this.visibleUntil = function(id) {
            var nr = -1;
            for (var i = 0; i < this.length; i++) {
                wchar = this.elements[i];
                
                if (isEqualId(wchar.id, id)) {
                   nr++;
                   return nr;
                
                } else if (wchar.visibility) {
                    nr++;    
                }
            }
            return nr;
        }

        this.subsequence = function(wstart, wend) {
            if (wstart === wend) {
                return [];
            }

            var subseq = [];
            var found = false;

            for (var i = 0; i < this.length; i++) {
                wchar = this.elements[i];

                if (wchar === wstart) {
                    found = true;
                
                } else if (wchar === wend) {
                    found = false;
                    break;
                
                } else if (found) {
                    subseq.push(wchar);
                }
            }
            return subseq;
        };

        this.displayValue = function() {
            var result = "";
            for (var i = 0; i < this.length; i++) {
                wchar = this.elements[i];
                if (wchar.visibility) {
                    result += wchar.value; 
                } 
            }
            return result;
        };

        this.containsId = function(id) {
            for (var i = 0; i < this.length; i++) {
                wchar = this.elements[i];
                // TODO: wchar.id === id;
                if (isEqualId(wchar.id, id)) {
                    return true;
                }
            }
            return false;
        };

    }


    WOOT.sequence = new WString();
    

    WOOT.applyWoot = function(editorDoc, data) {

        pos = conoser.editorDoc.positionToIndex(data.range.start);
        switch (data.action) {
            case 'insertText':
                insertText(pos, data.text); 
                console.log(WOOT.sequence.displayValue());
                break;
            
            case 'removeText':
                deleteText(pos, data.text);
                console.log(WOOT.sequence.displayValue());
                break;

            case 'insertLines':
                var text = data.lines.join('\n') + '\n';
                insertText(pos, text); 
                console.log(WOOT.sequence.displayValue());
                break;

            case 'removeLines':
                var text = data.lines.join('\n') + '\n';
                deleteText(pos, text);
                break; 
                            
            default:
                throw new Error("unknown action: " + data.action);
        } 
    }

    deleteText = function(pos, text) {
        for (var i = 0; i < text.length; i++) {
            localDelete(pos, text[i]);
        }
    }

    localDelete = function(pos, char) {
        var wchar = WOOT.sequence.ithVisible(pos+1);
        wchar.visibility = false;

        console.log(WOOT.sequence.displayValue())
        broadcastOperation({
            type: 'delete',
            wchar: wchar
        });
    }

    remoteDelete = function(wchar) {


        wchar = WOOT.sequence.get(wchar.id);
        wchar.visibility = false;
    }

    insertText = function(pos, text) {
        for (var i = 0; i < text.length; i++) {
            generateInsert(pos++, text[i]);
        }
    }

    generateInsert = function(pos, char) {
        var wprev = WOOT.sequence.ithVisible(pos);
        var wnext = WOOT.sequence.ithVisible(pos + 1);

        var wchar = new WChar(new WCharId(++WOOT.counter), char, wprev.id, wnext.id);

        integrateInsert(wchar, wprev, wnext);
        broadcastOperation({
            type: 'insert',
            wchar: wchar
        });
            // new WOperation(wchar));
    }

    withoutPrecedence = function(prevId, nextId, subsequence) {
        var l = [];
        for (var i = 0 ; i < subsequence.length; i++) {
            iwchar = subsequence[i];
            var precedence = false;
            for (var j = 0; j < i; j++) {
                jwchar = subsequence[j];
                if (prevId === jwchar.id) {
                    precedence = true;
                    break;
                }
            }

            if (precedence) {
                continue;
            }

            for (var j = i + 1; j < subsequence.length; j++) {
                jwchar = subsequence[j];
                if (nextId === jwchar.id) {
                    precedence = true;
                    break;
                }
            }

            if (!precedence) {
                l.push(iwchar);
            }
        }
        return l;
    }

    integrateInsert = function(wchar, wprev, wnext) {
        
        var subsequence = WOOT.sequence.subsequence(wprev, wnext);
        
        if (subsequence.length == 0) {
            
            pos = WOOT.sequence.indexOf(wnext);
            WOOT.sequence.add(wchar, pos);

        } else {
            var noPrecedence = withoutPrecedence(wchar.prevId, wchar.nextId, subsequence);

            var i = 0;
            while (i < noPrecedence.length - 1 && compareId(noPrecedence[i].id, wchar.id) < 0) {
                i++;
            }

            var start = i > 0 ? i-1 : 0
            integrateInsert(wchar, noPrecedence[start], noPrecedence[i]);        
        }
    }

    broadcastOperation = function(op) {
        rtc.broadcastMessage(op);
        // rtc.broadcastMessage(JSON.stringify(op));
    }

    isExecutable = function(operation) {
        var type = operation.type;

        if (type === 'init') {
            return true;
        }

        else if (type === 'delete') {
            var wchar = operation.wchar;
            return WOOT.sequence.containsId(wchar.id)

        } else if (type === 'insert') {
            var wchar = operation.wchar;
            return (WOOT.sequence.containsId(wchar.prevId) && WOOT.sequence.containsId(wchar.nextId))
        }
    }
    
    WOOT.reception = function(operation) {
        console.log("Received Remote Operation", operation);
        WOOT.pool.push(operation);
        WOOT.main();
    }

    WOOT.main = function() {
        for (var i = 0; i < WOOT.pool.length; i++) {
            var op = WOOT.pool[i];
            var isExec = isExecutable(op);

            if (isExec) {
                console.log("Executing ", op);
                
                WOOT.pool.splice(i, 1);
                i--;

                var type = op.type;

                if (type === 'init') {
                    var sequence = op.sequence;
                    for (var j = 1; j < sequence.length-1; j++) {
                        WOOT.sequence.add(sequence[j], j);
                    }
                    WOOT.updateDisplay();
                }

                else if (type === 'delete') {
                    var wchar = op.wchar;
                    remoteDelete(wchar);
                    var affectedPos = WOOT.sequence.visibleUntil(wchar.id);
                    WOOT.removeFromDisplay(affectedPos);
                    
                } else if (type === 'insert') {
                    var wchar = op.wchar;
                    wprev = WOOT.sequence.get(wchar.prevId);
                    wnext = WOOT.sequence.get(wchar.nextId);
                    integrateInsert(wchar, wprev, wnext);
                    var affectedPos = WOOT.sequence.visibleUntil(wchar.id);
                    WOOT.insertDisplay(wchar.value, affectedPos);
                }
            }
        }
        // console.log(WOOT.sequence.displayValue());
    }

    WOOT.updateDisplay = function() {
        var start = conoser.editorDoc.indexToPosition(0);
        WOOT.supress = true;
        conoser.editor.getSession().insert(start, WOOT.sequence.displayValue());
        WOOT.supress = false;
    }

    WOOT.insertDisplay = function(value, position) {
        // console.log('affected visual position is: ' + position);
        var start = conoser.editorDoc.indexToPosition(position);
        WOOT.supress = true;
        conoser.editor.getSession().insert(start, value);
        WOOT.supress = false;
    }

    WOOT.removeFromDisplay = function(position) {
        // console.log('affected visual position is: ' + position);
        var start = conoser.editorDoc.indexToPosition(position);
        var end = conoser.editorDoc.indexToPosition(position+1);
        var range = conoser.Range.fromPoints(start, end);
        WOOT.supress = true;
        conoser.editor.getSession().remove(range);
        WOOT.supress = false;
    }

    WOOT.setId = function(id) {
        console.log("Setting id to", id);
        WOOT.siteId = id;
    }

}());