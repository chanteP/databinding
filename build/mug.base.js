(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*
    存在collection里的每一个单元
    storage一览
*/
/*
    Accessor
        .check 获取一个acc
        nameNS[, value] 生成、赋值
*/
var $ = require('./kit');
var config;
var listener;

var root = {};
var storage = {};
//################################################################################################
var parseProp = $.parseProp,
    ArrayExtend = $.ArrayExtend;

//TODO 完善。获取function中的依赖
var parseDeps = function(base, func){
    if(typeof func !== 'function'){return;}
    var rootVar = config.rootVar;
    var code = func.toString()
        .replace(/^\s*\/\*[\s\S]*?\*\/\s*$/mg, '')
        .replace(/^\s*\/\/.*$/mg, '')
        .replace(new RegExp('(this|'+rootVar+')\\.[\\w\\.]+(\\(|\\s*\\=)', 'mg'), '')
        .replace(/\bthis\b/g, rootVar + '.' + base.parentNS);
        // .replace(/(this|vm)\.[\w\.]+(\(|\s*\=)/mg, '')
        // .replace(/\bthis\b/g, 'vm.' + base.parentNS);

    // var contextReg = /\bvm\.([\w|\.]+)\b/g;
    var contextReg = new RegExp('\\b'+rootVar+'\\.([\\w|\\.]+)\\b', 'g');
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
};
//################################################################################################
/*
    arguments.length === 1 : 返回acc
    check ? 
        nameNS, value : 赋值
        new
*/
var Accessor = function(nameNS, value, cfg){
    //单参数检查是否存在
    if(arguments.length === 1){
        return Accessor.check(nameNS);
    }
    //如果存在则修改值和配置
    if(Accessor.check(nameNS)){
        storage[nameNS].set(value);
        // storage[nameNS].value = value;
        storage[nameNS].config(cfg);
        return storage[nameNS];
    }
    //不是new出来的孩子不要
    if(!(this instanceof Accessor)){
        return new Accessor(nameNS, value, cfg);
    }
    //new一个咯
    var props = nameNS.split('.'), 
        name = props.pop(),
        isTop = nameNS === '',
        parentNS = isTop ? null : props.join('.'),
        parentAcc = isTop ? null : Accessor.check(parentNS),
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
    this.mode       = 0 && config.mode; //TODO强制开启

    this.context    = this.mode ? this : this.parent;

    this.children   = [];
    this.propagation = true || config.propagation; //TODO强制开启

    if(!isTop){
        parentAcc.children.push(this.nameNS);
        this.parent[this.name] = this.value;
    }
    storage[this.nameNS] = this;
    this.config(cfg);
}

Accessor.root = root;
Accessor.storage = storage;
Accessor.check = function(nameNS){
    if(!storage.hasOwnProperty(nameNS)){return undefined;}
    return storage[nameNS];
};

Accessor.parseProp = parseProp;
Accessor.prototype.get = function(){
    return this.value;
}
Accessor.prototype.set = function(value, dirty, force){
    var self = this;

    //TODO mode才绑定，等实现set数组元素再说...
    if(Array.isArray(value)){
        if(value !== this.value){
            this.arrayChangeLock = false;
        }
        if(!this.arrayChangeLock){
            if('observe' in Object){
                Object.observe(value, function(changes){
                    self.set(value, self.dirty, true);
                });
            }
            else{
                value.__proto__ = ArrayExtend;
                value[ArrayExtend.bindMethodName] = function(methodName){
                    self.set(value, self.dirty, true, {
                        method : methodName
                    });
                }
            }
        }
        this.arrayChangeLock = true;
    }

    this.value = value;
    this.value = this.get();

    //原始模式手动维持数值
    if(this.parent && config.mode){
        this.parent[this.name] = value;
    }

    dirty = this.dirty || dirty;
    if(!dirty){
        listener.fire(this.nameNS, 'set');
        (force || value !== this.oldValue) && listener.fire(this.nameNS, 'change');
    }
    this.oldValue = value;
    this.dirty = false;

    //TODO 性能
    this.children.forEach(function(ns){
        Accessor.check(ns).set($.isSimpleObject(value) ? value[ns.split('.').pop()] : undefined);
    });

    if($.isSimpleObject(value)){
        for(var key in value){
            if(!value.hasOwnProperty(key)){continue;}
            childAcc = Accessor.check(this.parseProp(key));
            childAcc && childAcc.bindProp();
        }
    }
    return value;
}
//修改配置
Accessor.prototype.config = function(cfg){
    if(!cfg){return;}
    if(cfg.context){this.context = cfg.context;}
}
//mode=0 defineproperty绑定对象属性用
//TODO destroy释放
Accessor.prototype.bindProp = function(obj){
    if(this.mode || !$.isSimpleObject(this.parent)){return;}
    var self = this;
    Object.defineProperty(obj || this.parent, this.name, {
        set : function(value){
            return self.set(value);
        },
        get : function(){
            return self.get();
        }
    });
    (obj || this.parent)[this.name] = this.value;
}
//生成propNS
Accessor.prototype.parseProp = function(prop){
    return parseProp(this.nameNS, prop);
}
//设置
Accessor.prototype.setProp = function(desc){
    if(desc.set){
        this.set = function(value, dirty, force){
            value = desc.set.call(this.context, value, this.value, force);
            this.__proto__.set.call(this, value, dirty, force);
            return value;
        }
    }
    if(desc.get){
        parseDeps(this, desc.get);
        this.get = function(){
            return desc.get.call(this.context, root);
        }
    }
    if(desc.change){
        listener.add(this.nameNS, desc.change, 'change');
    }
    return this;
}
Accessor.destroy = Accessor.prototype.destroy = function(nameNS){
    var acc = this instanceof Accessor ? this : Accessor.check(nameNS);
    if(acc){
        acc.children.forEach(Accessor.destroy);
        delete Accessor.storage[acc.nameNS];
    }
}
//生成根节点
new Accessor('', root);
//################################################################################################
module.exports = Accessor;
config = require('./config');
listener = require('./listener');

},{"./config":3,"./kit":7,"./listener":8}],2:[function(require,module,exports){
/*!
    Σヾ(ﾟДﾟ)ﾉ
    基础observe
*/
var config = require('./config');
var base = require('./factory');

base.config = config.set;
base._config = config;

window[config.name] = base;

module.exports = base;

},{"./config":3,"./factory":5}],3:[function(require,module,exports){
/*
    配置
        优先级：config() > _config > scriptQuery
*/
var $ = require('./kit');
var config = {

    'debug' : 1

    ,'name' : 'mug'
    ,'mode' : 0 //暂弃 0:def prop, 1:get()&set()

    ,'expHead' : '{{'
    ,'expFoot' : '}}'
    ,'descMark' : '$' //accessor标记
    ,'rootVar' : 'vm' //备用
    ,'extraVar' : '$' //备用

    ,'DOMPrefix' : 'mug-' //前缀标记
    ,'DOMCheck' : null //爬dom树中断判断
    ,'DOMBindInit' : true // view -> model
    ,'DOMScanInit' : true // view解析 auto : mutation

    ,'templateRender' : null //备用 模版引擎, te(expression, data)
    ,'templateHelper' : null //备用 模版helper注册

    ,'propagation' : true
    ,'propagationType' : ['change'] //暂弃

    ,'contextGlobal' : window 

    ,set : function(cfg){
        $.merge(config, cfg, true);
    }
};
var currentScript = document.currentScript || document.scripts[document.scripts.length - 1];
if(currentScript){
    config.set($.parseQuery(currentScript.src.split('?')[1]));
}

if('_config' in window){
    config.set(window._config);
}
module.exports = config;
},{"./kit":7}],4:[function(require,module,exports){
/*
    core(object[, config]);
    core(namespace, object[, config]);
*/
var $ = require('./kit');
var config = require('./config');
var Accessor = require('./accessor');
var listener = require('./listener');
var parser = require('./factory.parser');

var extendAPI = {};
var aiID = (new Date()).getTime();
//################################################################################################################
var parseProp = require('./kit').parseProp;
var register = parser.register,
    build = parser.build;

var getAIID = function(){
    return 'mug_static_data_' + aiID++;
}
//################################################################################################################
var core = module.exports = function(nameNS, obj, cfg){
    //还是加个new包装吧
    if(!(this instanceof core)){
        return new core(nameNS, obj, cfg);
    }
    //第一个参数是否namescpace
    if(nameNS === null){
        nameNS = getAIID();
    }
    if(typeof nameNS !== 'string'){
        cfg = obj;
        obj = nameNS;
        nameNS = '';
    }
    var base = build(nameNS, obj);
    register(nameNS, '', base, base, cfg);

    this.name = nameNS;
    this.value = Accessor.check(nameNS).value;
}

//define后抛出的api
var apiList = ['get', 'set', 'observe', 'unobserve', 'fire'];
apiList.forEach(function(method){
    core.prototype[method] = function(){
        arguments[0] = parseProp(this.name, arguments[0]);
        return require('./factory')[method].apply(this, arguments);
    };
});
},{"./accessor":1,"./config":3,"./factory":5,"./factory.parser":6,"./kit":7,"./listener":8}],5:[function(require,module,exports){
/*
    
*/

var config = require('./config');
var Accessor = require('./accessor');
var listener = require('./listener');
var define = require('./factory.define');

var lib = function(nameNS, data){
    return define(nameNS, data);
}
module.exports = lib;

lib.root = Accessor.root;
lib.storage = Accessor.storage;
lib.listener = listener.storage;

//TODO 什么鬼
lib.get = function(nameNS){
    var index, value;
    if(index = /(.*)\[(\d+)\]$/.exec(nameNS)){
        nameNS = index[1];
        index = index[2];
    }
    value = Accessor.check(nameNS) ? Accessor.check(nameNS).get() : undefined;
    if(index !== null && Array.isArray(value)){
        return value[index];
    }
    return value;
}
lib.set = function(nameNS, value, dirty){
    Accessor.check(nameNS) && Accessor.check(nameNS).set(value, dirty);
    return value;
}

lib.observe        = listener.add;
lib.unobserve      = listener.remove;
lib.fire           = listener.fire;

lib.destroy        = Accessor.destroy;


},{"./accessor":1,"./config":3,"./factory.define":4,"./listener":8}],6:[function(require,module,exports){
/*
    构造器的辅助方法
*/
var $ = require('./kit');
var config = require('./config');
var Accessor = require('./accessor');

//################################################################################################################
var isEmptyObject = $.isEmptyObject,
    isSimpleObject = $.isSimpleObject,
    parseProp = $.parseProp;
//################################################################################################################
var descList = ['get', 'set', 'change', 'propagation', 'dirty', 'value'];
var func = {
    //过滤obj中的参数项
    getDesc : function(obj){
        var desc = {}, check;
        if(!isSimpleObject(obj)){
            desc.value = obj;
        }
        else{
            descList.forEach(function(d){
                desc[d] = obj[config.descMark + d];
                if(delete obj[config.descMark + d]){
                    check = true;
                }
            });
            if(desc['value'] === undefined){
                desc['value'] = check && isEmptyObject(obj) ? undefined : obj;
            }
        }
        return desc;
    },
    //nameNS注册到acc
    //TODO 卧槽这里改得好乱
    register : function(nameNS, curNS, obj, parentObj, cfg){
        var desc = func.getDesc(obj), 
            base,
            data = desc.value,
            selfStart = curNS.indexOf(nameNS) === 0,
            curCfg = selfStart ? cfg : {};
        //if(acc.value !== data)
        base = Accessor.check(curNS) || new Accessor(curNS, data, curCfg);
        //确保注册的对象有绑定
        // selfStart && obj !== parentObj && base.bindProp(parentObj);
        if(isSimpleObject(data)){
            for(var key in data){
                if(!data.hasOwnProperty(key)){continue;}
                func.register(nameNS, base.parseProp(key), data[key], data, cfg);
            }
        }
        base.setProp(desc);
        //TODO 强制mode0
        base.bindProp(parentObj);
    },
    //build root
    build : function(nameNS, obj){
        var ns = nameNS.split('.'), 
            baseObj, 
            cur = obj;
        if(nameNS === ''){
            ns.length = 0;
            baseObj = obj;
        }
        while(ns.length){
            baseObj = {};
            baseObj[ns.pop()] = cur;
            cur = baseObj;
        }
        return baseObj;
    }
}
module.exports = func;


},{"./accessor":1,"./config":3,"./kit":7}],7:[function(require,module,exports){
var $ = {};
module.exports = $;
var config = require('./config');

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
//################################################################### 
$.parseQuery = function(str){
    //重复字段忽略...
    var rs = {}, arr = (str || '').split('&'), field;
    for(var i = arr.length - 1; i >= 0; i--){
        field = arr[i].split('=');
        rs[field[0]] = field[1];
    }
    return rs;
}
//################################################################### 
$.parseProp = function(name, propNS){
    if(typeof name !== 'string' || name === ''){return propNS;}
    if(typeof propNS !== 'string' || propNS === ''){return name;}
    return name + '.' + propNS;
},
//log################################################################### 
$.log = function(part, info, e){
    var type =  e instanceof Error ? 'error' :
                e == 'mark' ? 'debug' :
                e == 'warn' ? 'warn' :
                e == 'info' ? 'info' :
                'log';
    var msg = '[' + part + ']@ ' + Date.now() + ' : ' + info + '\n' + (type == 'error' ? '('+(e.stack || e.message)+')' : '');
    config.debug && $.log.list.push(msg);
    config.debug && console && console[type](msg);
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
$.isSimpleObject = function(obj){
    // return obj && typeof obj === 'object' && obj.__proto
    return obj && obj.toString() === '[object Object]';
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
    if(str.slice(0, 1) === '<'){
        var template = document.createElement(str.slice(0, 3) === '<tr' ? 'tbody' : 'template');
        template.innerHTML = str;
        return template.content ? template.content.firstChild : template.firstElementChild;
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
    element._eventList = element._eventList || {};
    return {
        'on' : function(evt, selector, callback, capture){
            if(!selector){
                element.addEventListener(evt, callback, capture);
            }
            else{
                var cb = function(e){
                    var target = e.target;
                    while(target && target !== element.parentNode){
                        if($.match(target, selector, element)){
                            callback.call(target, e);
                            return true;
                        }
                        target = target.parentNode;
                    }
                }
                element._eventList[selector] = element._eventList[selector] || [];
                element._eventList[selector].push({
                    cb : cb,
                    func : callback
                });
                element.addEventListener(evt, cb, capture);
            }
            return this;
        },
        'off' : function(evt, selector, callback, capture){
            if(element._eventList[selector]){
                element._eventList[selector].some(function(cache){
                    if(cache.func === callback){
                        element.removeEventListener(evt, cache.cb, capture);
                        return true;
                    }
                });
            }
            return this;
        }
    }
}
$.match = function(node, selector, context){
    context = context || document;
    return [].indexOf.call(context.querySelectorAll(selector) || [], node) >= 0;
}

$.ArrayExtend = (function(){
    var ArrayExtend = {}, 
        ArrayExtendProto = Array.prototype, 
        ArrayExtendObserveMethod = 'arrayExtOb',
        ArrayExtendMethod = 'pop, push, shift, unshift, reverse, sort, splice'.split(', ');
    Object.defineProperty(ArrayExtend, ArrayExtendObserveMethod, {
        writable : true,
        enumerable : false
    });
    ArrayExtendMethod.forEach(function(methodName){
        ArrayExtend[methodName] = function(){
            var args = [].map.call(arguments, function(arg){return arg});
            ArrayExtendProto[methodName].apply(this, args);
            this[ArrayExtendObserveMethod](methodName);
        }
    });
    ArrayExtend.bindMethodName = ArrayExtendObserveMethod;
    ArrayExtend.__proto__ = ArrayExtendProto;    
})();

},{"./config":3}],8:[function(require,module,exports){
/*
    事件相关
*/
//################################################################### 
var $ = require('./kit');
var merge = $.merge,
    unique = $.unique;

var storage = {};

var fireList = [];
var collectFireProps = function(nameNS, type){
    var acc = Accessor.check(nameNS);
    if(!acc){return;}
    fireList.push(nameNS);
    (listener.check(nameNS, type) || []).forEach(function(dep){
        //依赖
        if(typeof dep === 'string'){
            var depAcc = Accessor.check(dep);
            depAcc.oldValue = depAcc.value;
            depAcc.value = depAcc.get();
            //TODO depAcc.set(depAcc.get());
            collectFireProps(dep);
        }
    });
    if(acc.parentNS !== null && acc.propagation){
        collectFireProps(acc.parentNS);
    }
}
//################################################################### 
var listener = {
    'storage' : storage,
    'check' : function(nameNS, type, build){
        var list = storage[nameNS];
        if(list && list[type]){
            return list[type];
        }
        if(!build){
            return false;
        }
        if(!list){
            list = storage[nameNS] = {};
        }
        if(!list[type]){
            list[type] = [];
        }
        return list[type];
    },
    'fire' : function(nameNS, type, extArgs){
        type = type || 'change';
        var fireBody = Accessor.check(nameNS);
        if(!fireBody){return;}

        fireList.length = 0;

        collectFireProps(nameNS, type);
        fireList = unique(fireList);

        var evtList, acc, args;
        fireList.forEach(function(ns){
            evtList = listener.check(ns, type);
            if(!evtList){return;}
            acc = Accessor.check(ns);
            args = [acc.value, acc.oldValue, {
                type:type, 
                object:fireBody.parent,
                name:fireBody.name, 
                nameNS:fireBody.nameNS,
                prop:acc.name,
                propNS:acc.nameNS
            }];
            args[2] = merge(args[2], extArgs);
            for(var i = evtList.length - 1; i >= 0; i--){
                if(typeof evtList[i] !== 'function'){return;}
                evtList[i].apply(acc.context, args);
            }
        });
        fireList.length = 0;
        return this;
    },
    //TODO capture
    'add' : function(nameNS, func, evt, capture){
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
var Accessor = require('./accessor');

},{"./accessor":1,"./kit":7}]},{},[2]);
