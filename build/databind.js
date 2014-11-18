(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Accessor = function(nameNS, value){
    if(arguments.length === 1){
        return nameNS in Accessor.storage ? Accessor.storage[nameNS] : false;
    }
    else if(nameNS in Accessor.storage){
        Accessor.storage[nameNS].value = value;
        return Accessor.storage[nameNS];
    }
    if(!(this instanceof Accessor)){
        return new Accessor(nameNS, value);
    }
    var props = nameNS.split('.'), 
        name = props.pop(),
        isTop = nameNS === '',
        parentNS = isTop ? null : props.join('.'),
        parentAcc = isTop ? null : Accessor(parentNS),
        parent = isTop ? null : parentAcc.value;

    this.name       = name;
    this.nameNS     = nameNS;
    this.parent     = parent;
    this.parentNS   = parentNS;
    this.parentAcc  = parentAcc;

    this.deps       = [];
    this.value      = value;
    this.oldValue   = value;
    this.dirty      = false;

    // this.list    = {};
    this.mode       = config.mode;

    this.children   = [];
    this.propagation = config.propagation;
    this.propagationType = [].concat(config.propagationType);

    if(!isTop){
        parentAcc.children.push(this.nameNS);
        this.parent[this.name] = this.value;
    }
    Accessor.storage[this.nameNS] = this;
}
Accessor.storage = {};
Accessor.prototype.get = function(){
    return this.value;
}
Accessor.prototype.set = function(value, dirty, force){
    this.value = value;
    this.value = this.get();

    if(this.parent){
        this.parent[this.name] = value;
    }
    //children

    dirty = this.dirty || dirty;
    if(!dirty){
        listener.fire(this.nameNS, 'set');
        (force || value !== this.oldValue) && listener.fire(this.nameNS, 'change');
    }
    this.oldValue = value;
    this.dirty = false;
    return value;
}
Accessor.destroy = Accessor.prototype.destroy = function(nameNS){
    var acc = this instanceof Accessor ? this : Accessor(nameNS);
    if(acc){
        acc.children.forEach(Accessor.destroy);
        delete acc.parent[acc.name];
        delete Accessor.storage[acc.nameNS];
    }
}
module.exports = Accessor;
var config = require('./config');
var listener = require('./Observer');

},{"./Observer":4,"./config":5}],2:[function(require,module,exports){
/*
    mode ? accessor : defineProp
    var db = new DataBind('prop1.prop2', {
        a: {
            $get: func
            $set: func
            $value: value
        }
    });
    accessor :
        db.set('a', 1);
        db.observe('a', func, 'change');
    defineProp :
        db.a = 1;
        DataBind.observe('')
    propagation : 
*/
var $ = require('./kit');
var config = require('./config');
var Accessor = require('./Accessor');
var listener = require('./Observer');

var root = {};
//################################################################################################################
var isEmptyObject = $.isEmptyObject;
var merge = $.merge;
//################################################################################################################
var main = {
    'parseNS' : function(name, propNS){
        propNS = propNS || '';
        return name + (name !== undefined && name !== '' && propNS !== '' ? '.' : '') + propNS;
    },
    //get function deps
    'parseDeps' : function(base, func){
        var code = func.toString()
            .replace(/^\s*\/\*[\s\S]*?\*\/\s*$/mg, '')
            .replace(/^\s*\/\/.*$/mg, '')
            .replace(/(this|vm)\.[\w\.]+(\(|\s*\=)/mg, '')
            .replace(/\bthis\b/g, 'vm.' + base.parentNS);

        var contextReg = /\bvm\.([\w|\.]+)\b/g;
        var deps = [], match;
        while ((match = contextReg.exec(code))) {
            if (match[1]) {
                deps.push(match[1]);
            }
        }
        base.deps = deps;
        deps.forEach(function(dep){
            listener.add(dep, base.nameNS, 'change');
        });
    },
    'descList' : ['get', 'set', 'change', 'propagation', 'dirty', 'value'],
    'getDesc' : function(obj){
        var desc = {}, check;
        if(!obj || obj.__proto__ !== Object.prototype){
            desc.value = obj;
        }
        else{
            main.descList.forEach(function(d){
                desc[d] = obj['$' + d];
                if(delete obj['$' + d]){
                    check = true;
                }
            });
            if(desc['value'] === undefined){
                desc['value'] = check && isEmptyObject(obj) ? undefined : obj;
            }
        }
        return desc;
    },
    'defProp' : function(desc, base){
        if(desc.set){
            base.set = function(value, dirty){
                value = desc.set.call(base.mode ? base : base.parent, value, base.value);
                base.__proto__.set.call(base, value, dirty);
                return value;
            }
        }
        if(desc.get){
            main.parseDeps(base, desc.get);
            base.get = function(){
                return desc.get.call(base.parent, root);
            }
        }
        if(desc.change){
            listener.add(base.nameNS, desc.change, 'change');
        }
        if(desc.dirty){
            base.dirty = !!desc.dirty;
        }
        if(desc.propagation){
            base.propagation = !!propagation;
        }
        //TODO dirty用意
        if(!base.dirty){
            base.set(base.value);
        }
    },
    'register' : function(obj, baseNS){
        var desc = main.getDesc(obj), base;
        obj = desc.value;
        base = Accessor(baseNS) || new Accessor(baseNS, obj);
        if(obj && obj.__proto__ === Object.prototype){
            for(var key in obj){
                if(!obj.hasOwnProperty(key)){continue;}
                main.register(obj[key], (base.nameNS ? base.nameNS + '.' : '') + key);
            }
        }
        base.nameNS && main.defProp(desc, base);
        if(obj instanceof Array){
            //TODO
            Object.observe(obj, function(changes){
                base.set(obj, base.dirty, true);
            });
        }
    }
}

//################################################################################################################
var expApi = {}, expApiList;
var DataBind = function(nameNS, obj, cfg){
    var ns = nameNS.split('.'), root, cur = obj;
    if(nameNS === ''){
        ns.length = 0;
        root = obj;
    }
    while(ns.length){
        root = {};
        root[ns.pop()] = cur;
        cur = root;
    }
    main.register(root, '');
    this.name = this._name = nameNS;

    if(!config.mode){
        var acc = Accessor(nameNS),
            exports = acc.value;
        exports.__proto__ = Object.create(expApi, {'_name':{'value' : nameNS}});
        return exports;
    }
};
DataBind.root           = root;
DataBind.storage        = Accessor.storage;

DataBind.observe        = listener.subscribe;
DataBind.fire           = listener.publish;
DataBind.destroy        = Accessor.destroy;
DataBind.setPropagation = function(nameNS, bool, type){
    var check = DataBind.check(nameNS);
    if(check){
        typeof bool === 'boolean' && (check.propagation = bool);
        type instanceof Array && (check.propagationType = type);
    }
    return this;
};
DataBind.check          = function(nameNS){
    return Accessor(nameNS);
}
DataBind.checkListener  = function(nameNS, type){
    return listener.check(nameNS, type);
}
DataBind.get            = function(nameNS){
    return Accessor(nameNS) ? Accessor(nameNS).get() : undefined;
};
DataBind.set            = function(nameNS, value, dirty){
    Accessor(nameNS) && Accessor(nameNS).set(value, dirty);
    return value;
};
DataBind.config         = function(cfg){
    'mode' in cfg && (config.mode = cfg.mode);
    'propagation' in cfg && (config.propagation = cfg.propagation);
}

DataBind.prototype.get  = function(propNS){
    return DataBind.get(main.parseNS(this._name, propNS));
}
DataBind.prototype.set  = function(propNS, value, dirty){
    return DataBind.set(main.parseNS(this._name, propNS), value, dirty);
}
DataBind.prototype.setPropagation = function(bool, type){
    return DataBind.setPropagation(main.parseNS(this._name, propNS), bool, type);
};
DataBind.prototype.checkListener = function(propNS, type){
    return DataBind.checkListener(main.parseNS(this._name, propNS), type);
};
DataBind.prototype.observe = function(propNS, func, evt){
    return DataBind.observe(main.parseNS(this._name, propNS), func, evt);
};
DataBind.prototype.fire = function(propNS, evt, args){
    return DataBind.fire(main.parseNS(this._name, propNS), evt, args);
};
DataBind.prototype.destroy = function(deep){
    DataBind.destroy(this._name);        
};
if('defineProperty' in Object){
    for(var api in DataBind.prototype){
        if(!DataBind.prototype.hasOwnProperty(api)){continue;}
        Object.defineProperty(expApi, api, {'enumerable':false, 'writable':true});
        expApi[api] = DataBind.prototype[api];
    }
}
module.exports = DataBind;
},{"./Accessor":1,"./Observer":4,"./config":5,"./kit":7}],3:[function(require,module,exports){
/*
    expression('a.b.c', {a:xxx}, vm)
    整个文件跟{{}}没关系啦
*/
var DataBind = require('./DataBind');
var $ = require('./kit');

var scopeHolder = '$data', selfHolder = '$self';
//################################################################################################################
var log = $.log;
var get = DataBind.get;
var emptyFunc = function(){return '';};
//################################################################################################################
var getValue = function(expression, scope, vm){
    return parser(expression)(scope, vm, scope);
}
//################################################################################################################
var filter = {
};
//################################################################################################################
var funcPropCheck = function(propText){
    return '(typeof '+propText+' === "undefined" ? "" : '+propText+')';
}
//################################################################################################################
var parserCache = {};
/*
    Function 解析表达式并构造&缓存函数体
*/
var parser = function(expression){
    if(typeof expression !== 'string'){
        log('DataBind.expression', 'expression \"' + expression + '\" is not function');
        return emptyFunc;
    }
    if(parserCache[expression]){return parserCache[expression];}
    var funcBody, funcIns;
    funcBody = parseDeps(expression, null, function(match){
        var prop;
        if(match.slice(0, 1) === '.')
            prop = selfHolder + match;
        else if(match.slice(0, 3) === 'vm.')
            prop = match;
        else
            prop = scopeHolder + '.' + match;
        return funcPropCheck(prop);
    });
    // /(^( )?(if|for|else|switch|case|break|{|}))(.*)?/g;
    try{
        funcIns = new Function(scopeHolder, 'vm', selfHolder, 'return ' + funcBody);
        return parserCache[expression] = funcIns;
    }
    catch(e){
        log('DataBind.expression', 'expression error!' + expression, e);
        return emptyFunc;
    }
}
/*
    
*/
var parseDeps = function(expression, matchList, matchCallback){
    if(!matchList && !matchCallback){return;}
    var reg = /(?=\b|\.)(?!\'|\")([\w|\.]+)(?!\'|\")\b/g, expressionBody;
    expressionBody = expression.replace(reg, function(text, match){
        if(isNaN(match)){
            var dep = matchCallback ? matchCallback(match) : match;
            matchList && matchList.push(dep);
            return dep;
        }
        return match;
    });
    return expressionBody;
}

//################################################################################################################
var expression = function(expressionText, scope, vm){
    if(typeof expressionText !== 'string' || !expressionText.trim() || expressionText[0] === '#'){return '';}
    //{{expression | filter}}
    var part = expressionText.split(/\|{1,1}/),
        exp = part.shift(),
        filterArgs = /^\s*([\w]+)\(([\w\s\,]+)\)/.exec(part.join(''));

    var rs = getValue(exp, scope, vm);
    if(filterArgs && (filterArgs[1] in filter)){
        return filter[filterArgs[1]].call(null, [rs].concat(filterArgs[2].split(',')));
    }
    return rs;
}
DataBind.expression = expression;
DataBind.expression.parseDeps = parseDeps;
DataBind.expression.parserCache = parserCache;

module.exports = expression;


},{"./DataBind":2,"./kit":7}],4:[function(require,module,exports){
var listener = {
    'topic' : {},
    'check' : function(nameNS, type, build){
        var list;
        list = listener.topic[nameNS];
        if(!build && (!list || !list[type])){
            return false;
        }
        if(!list){
            list = listener.topic[nameNS] = {};
        }
        if(!list[type]){
            list[type] = [];
        }
        return list[type];
    },
    'fire' : function(nameNS, type, extArgs){
        var evtList = listener.check(nameNS, type);
        var acc = Accessor(nameNS);
        if(!evtList || !acc){return this;}
        args = [acc.value, acc.oldValue, {
            type:type, 
            object:acc.parent,
            name:acc.name, 
            nameNS:acc.nameNS
        }];
        args[2] = merge(args[2], extArgs, {
            propNS : nameNS,
            prop : acc.name
        });
        evtList.forEach(function(func){
            if(typeof func === 'function'){
                func.apply(acc.parent, args);
            }
            else if(typeof func === 'string' && Accessor(func)){
                var depAcc = Accessor(func);
                depAcc.oldValue = depAcc.value;
                depAcc.value = depAcc.get();
                listener.fire(func, type, args[2]);
            }
        });
        if(acc.parentNS !== null && acc.propagation && acc.propagationType.indexOf(type) >= 0){
            listener.fire(acc.parentNS, type, args[2]);
        }
        return this;
    },
    'add' : function(nameNS, func, evt){
        evt = evt || 'change';
        var evtList = listener.check(nameNS, evt, true);
        if(evtList.indexOf(func) < 0){
            evtList.push(func);
        }
        return func;
    },
    'remove' : function(nameNS, func, evt){
        evt = evt || 'change';
        var evtList = listener.check(nameNS, evt), index;
        if(!evtList) return this;
        index = evtList.indexOf(func);
        if(index >= 0){
            evtList.splice(index, 1);
        }
        return this;
    }
}
module.exports = listener;
var $ = require('./kit');
var merge = $.merge;
var Accessor = require('./Accessor');

},{"./Accessor":1,"./kit":7}],5:[function(require,module,exports){
var config = {
    'mode' : 0,
    'propagation' : true,
    'propagationType' : ['change']
};

module.exports = config;
},{}],6:[function(require,module,exports){

var name = 'DataBind';
if(name in window){return;}

var DataBind = require('./DataBind'),
    Accessor = require('./Accessor');

new Accessor('', DataBind.root);

require('./Expression');
// require('./DomExtend');
window[name] = DataBind;
},{"./Accessor":1,"./DataBind":2,"./Expression":3}],7:[function(require,module,exports){
var $ = {};

$.objMerger = function(type, args){
    var hold = false, rsObj, curObj;
    if(args[args.length-1] === true){
        hold = true;
    }
    rsObj = hold ? args[0] : {};
    for(var i = +hold, j = args.length - hold; i<j; i++) {
        curObj = args[i];
        if(typeof curObj !== 'object'){continue;}
        for(var key in (type ? curObj : args[0])){
            if(!args[i].hasOwnProperty(key)){continue;}
            rsObj[key] = curObj[key];
        }
    };
    return rsObj;
};
$.parse = function(){
    return $.objMerger(0, arguments);
};
$.merge = function(){
    return $.objMerger(1, arguments);
};

//log################################################################### 
$.log = function(part, info, e){
    var type =  e instanceof Error ? 'error' :
                e == 'mark' ? 'debug' :
                e == 'warn' ? 'warn' :
                e == 'info' ? 'info' :
                'log';
    var msg = '[' + part + ']@ ' + Date.now() + ' : ' + info + (type == 'error' ? '('+(e.stack || e.message)+')' : '');
    $.debug && $.log.list.push(msg);
    $.debug && console && console[type](msg);
    return msg;
};
$.log.list = [];

$.isEmptyObject = function(obj){
    for(var key in obj){
        if(!obj.hasOwnProperty(key)){continue;}
        return false;
    }
    return true;
}




$.id        = function(id){
    return document.getElementById(id);
}
$.find      = function(selector, dom){
    return (dom || document).querySelector(selector);
}
$.findAll   = function(selector, dom){
    return (dom || document).querySelectorAll(selector);
}
$.contains  = function(root, el){
    if(root == el){return true;}
    return !!(root.compareDocumentPosition(el) & 16);
}
$.create = function(str){
    if(str[0] === '<'){
        var d = document.createElement('div');
        d.innerHTML = str;
        return d.firstChild;
    }
    else{
        return document.createElement(str);
    }
}
$.unique    = function(arr){
    for(var i = arr.length - 1; i >= 0; i--){
        for(var j = i - 1; j >= 0; j--){
            if(arr[i] === arr[j]){
                arr.splice(i, 1);
                break;
            }
        }
    }
    return arr;
}
$.remove    = function(node){
    if(node.parentNode){
        node.parentNode.removeChild(node);
    }
}
$.evt = function(element, data){
    var obj = typeof data === 'undefined' ?
        $.ext(element).hammer(data):
        $.ext(element);
    var evt = function(type, args){
        this[type].apply(this, args);
    }
    return {
        'on' : function(){
            evt.call(obj, 'on', arguments);
            return obj;
        },
        'off' : function(evt, delegate, func){
            evt.call(obj, 'off', arguments);
            evt = obj = null;
        }
    }
}
module.exports = $;
},{}]},{},[6]);
