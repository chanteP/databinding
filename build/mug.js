(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*
    存在collection里的每一个单元
    存了都会进行单向绑定
    DataBind.storage一览
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
};
//################################################################################################
/*
    arguments.length === 1 : 返回acc
    check ? 
        nameNS, value : 赋值
        new
*/

var Accessor = function(nameNS, value){
    if(arguments.length === 1){
        return Accessor.check(nameNS);
    }
    if(Accessor.check(nameNS)){
        storage[nameNS].set(value);
        // storage[nameNS].value = value;
        return storage[nameNS];
    }
    if(!(this instanceof Accessor)){
        return new Accessor(nameNS, value);
    }
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

    if(this.parent && config.mode){
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

    if($.isSimpleObject(value)){
        for(var key in value){
            if(!value.hasOwnProperty(key)){continue;}
            childAcc = Accessor.check(this.parseProp(key));
            childAcc && childAcc.bindProp();
        }
    }
    return value;
}
//mode=0 defineproperty绑定对象属性用
//TODO destroy释放
Accessor.prototype.bindProp = function(){
    if(this.mode || !$.isSimpleObject(this.parent)){return;}
    var self = this;
    Object.defineProperty(this.parent, this.name, {
        set : function(value){
            return self.set(value);
        },
        get : function(){
            return self.get();
        }
    });
    this.parent[this.name] = this.value;
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
            return desc.get.call(this.parent, root);
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
new Accessor('', root);
//################################################################################################
module.exports = Accessor;
config = require('./config');
listener = require('./listener');

},{"./config":3,"./kit":17,"./listener":18}],2:[function(require,module,exports){
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

},{"./config":3,"./factory":14}],3:[function(require,module,exports){
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

    ,'DOMPrefix' : 'nt-'
    ,'DOMCheck' : null //爬dom树中断判断
    ,'DOMInit' : true //DOMContentLoaded执行状况 true:既绑定model代理又scan document root节点, 'bind':只绑定model代理, 'scan':只scan root节点, false:啥都不干 

    ,'templateRender' : null //模版引擎, te(expression, data)
    ,'templateHelper' : null //模版helper注册

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
},{"./kit":17}],4:[function(require,module,exports){
/*
    view->model
*/
var $ = require('./kit');
var find = $.find,
    findAll = $.findAll;
var base = require('./base'),
    set = base.set,
    get = base.get;
var marker = require('./dom.marker'),
    parser = require('./dom.parser');

var numberPreg = /^[\d\.]+$/;

var checkAccessor = function(model){
    if(!(model in base.storage)){
        base(model, get(model));
    }
}

var checkModel = function(node){
    var allModelNode = $.findAll('['+marker.model+']', node);
    [].forEach.call(allModelNode, function(el){
        var model = el.getAttribute(marker.model);
        checkAccessor(model);
    });
}

var bindModel = function(e){
    var type = this.type, name = this.name, tagName = this.tagName;
    var model = this.getAttribute(marker.model), context = parser.context(this, this);
    var value = '', form = this.form || document.body, rs;
    //TODO 强制绑定感觉不太好...对比下性能？
    this[marker.bind] = context;

    model = $.parseProp(context, model);
    checkAccessor(model);

    if(name && tagName === 'INPUT'){
        switch (type){
            case 'checkbox' : 
                rs = findAll('[name="'+name+'"]:checked', form);
                value = [];
                rs && [].forEach.call(rs, function(el){
                    value.push(el.value);
                });
                value = value.join(',');
                break;
            case 'radio' : 
                rs = find('[name="'+name+'"]:checked', form);
                value = rs ? rs.value : '';
                break;
            default : 
                value = this.value;
                break;
        }
    }
    else{
        value = this.value;
    }
    if(!isNaN(value) && numberPreg.test(value)){
        value = +value;
    }
    set(model, value);
}

module.exports = {
    bind : function(node){
        if(!node){return this;}
        checkModel(node);
        $.evt(node)
            //TODO 绑定太简陋?
            //radio checkbox etc...
            .on('change', [
                    'input['+marker.model+']',
                    'select['+marker.model+']'
                ].join(','), 
                bindModel)
            //text etc...
            .on('input', [
                    'input['+marker.model+']',
                    'textarea['+marker.model+']'
                ].join(','),
                bindModel);
        return this;
    },
    unbind : function(){

    }
}
},{"./base":2,"./dom.marker":6,"./dom.parser":8,"./kit":17}],5:[function(require,module,exports){
/*
    dom绑定用外挂包
*/

var config = require('./config');

var api = {
    scan : require('./dom.walker').init().scan,
    bindContent : require('./dom.binder').bind
}

window.document.addEventListener('DOMContentLoaded', function(){
    var initCfg = config.DOMInit;
    if(!initCfg){return;}
    if(typeof initCfg === 'string'){
        initCfg === 'bind' && api.bindContent(document.body);
        initCfg === 'scan' && api.scan(document.documentElement);
    }
    else if(initCfg === true){
        api.bindContent(document.body);
        api.scan(document.documentElement);
    }
});

module.exports = api;

},{"./config":3,"./dom.binder":4,"./dom.walker":9}],6:[function(require,module,exports){
/*
    标记
*/
var config = require('./config');
var expPreg = new RegExp(config.expHead.replace(/([\[\(\|])/g, '\\$1') + '(.*?)' + config.expFoot.replace(/([\[\(\|])/g, '\\$1'), 'm');
var prefix = config.DOMPrefix;
var marker = {
    'prefix' : prefix

    ,'exp' : expPreg //表达式的正则表达式检测
    ,'expSource' : expPreg.source
    ,'inPreg' : /([\w\.]+)\s+in\s+([\w\.]+)/

    ,'model' : prefix + 'model'//v to m
    ,'list' : prefix + 'list'//list: tr in table
    ,'bind' : prefix + 'scope'//scope源

    ,'extraData' : prefix + 'extraExpData' //传给expression的额外数据

    ,'if'   : prefix + 'if'//条件判断
    ,'escape' : prefix + 'escape'//scan外

    ,'boundAttr' : prefix + 'boundAttr' //已经绑定的attr&原值
    ,'boundText' : prefix + 'boundText' //已经绑定的text&原值
    ,'boundProp' : prefix + 'boundProp' //已经绑定的props
};

module.exports = marker;
},{"./config":3}],7:[function(require,module,exports){
/*
    observe相关
*/
var $ = require('./kit');
var walker = require('./dom.walker'),
    parser = require('./dom.parser'),
    marker = require('./dom.marker');
var observe = walker.addBinder,
    unobserve = walker.removeBinder,
    scan = walker.scan;
var getText = parser.text;

var contains = $.contains,
    parseProp = $.parseProp,
    create = $.create;
//################################################################################################################
var checkRecycle = function(node){
    //TODO 总不能一消失就解除绑定吧
    if(!contains(document.documentElement, node)){
        for(var prop in node[marker.boundProp]){
            node[marker.boundProp][prop].forEach(function(func){
                unobserve(prop, func, checkType);
            });
        }
        return true;
    }
    return false;
}
var setBoundNode = function(node, deps, func, text, value){
    node[marker.boundAttr] = node[marker.boundAttr] || {};
    node[marker.boundProp] = node[marker.boundProp] || {};
    if(value){
        node[marker.boundAttr][text] = value;
    }
    else{
        node[marker.boundText] = text;
    }
    deps.forEach(function(dep){
        node[marker.boundProp][dep] = node[marker.boundProp][dep] || [];
        node[marker.boundProp][dep].push(func);
    });
}
var templateFunc = function(template, index, tmpProp, listProp){
    var listExpPreg = new RegExp(marker.expSource, 'mg'),
        fieldPreg = new RegExp('(?:\\s|\\b)('+tmpProp+'\\.)', 'mg');
    return template.replace(listExpPreg, function(match, exp){
        return match.replace(fieldPreg, function(match, matchContext){
            return ' ' + listProp + '['+index+'].';
        });
    });
};
//################################################################################################################
var binder = {
    //node, attribute
    attr : function(node, attrText, attrName){
        var context = parser.context(node, node),
            deps = parser.deps(attrText, context), 
            func;
        var extraData = node[marker.extraData];

        switch (attrName){
            case 'checked' : 
                func = node.type === 'checkbox' ? 
                function(value){
                    if(checkRecycle(node)){return;}
                    value = getText(attrText, context, extraData);
                    //TODO value == bool
                    node.checked = value.split(',').indexOf(node.value) >= 0;
                } : 
                function(value){
                    if(checkRecycle(node)){return;}
                    value = getText(attrText, context, extraData);
                    //TODO value == bool
                    node.checked = value === node.value;
                };
                node.removeAttribute('checked');
                break;
            case 'selected' : 
                func = function(value){
                    if(checkRecycle(node)){return;}
                    value = getText(attrText, context, extraData);
                    //TODO value == bool
                    node.selected = value === node.value;
                };
                node.removeAttribute('selected');
                break;
            case 'value' : 
                func = function(value){
                    if(checkRecycle(node)){return;}
                    value = getText(attrText, context, extraData);
                    node.setAttribute('value', value);
                    node.value = value;
                }
                break;
            case marker.prefix + 'src' : 
                func = function(){
                    if(checkRecycle(node)){return;}
                    node.src = getText(attrText, context, extraData);
                }
                node.removeAttribute(marker.prefix + 'src');
                break;
            default : 
                func = function(value){
                    if(checkRecycle(node)){return;}
                    value = getText(attrText, context, extraData);
                    if(value === '' || value === 'false' || value === 'null' || value === 'undefined'){
                        node.removeAttribute(attrName);
                    }
                    else{
                        node.setAttribute(attrName, value);
                    }
                }
                break;
        }
        setBoundNode(node, deps, func, attrName, attrText);
        observe(deps, func);
    },
    list : function(node, propGroup){
        node.removeAttribute(marker.list);
        propGroup.shift();
        var template = node.outerHTML;
        var context = parser.context(node, node);
        node[marker.bind] = context;

        var tmpProp = propGroup[0],
            listProp = propGroup[1];

        var listNS = parseProp(listProp, context);

        var listMarkEnd = document.createComment('list for ' + listProp + ' as ' + tmpProp + ' end'),
            listMarkStart = document.createComment('list for ' + listProp + ' as ' + tmpProp + ' start'),
            listNodeCollection = [];

        node.parentNode.insertBefore(listMarkStart, node);
        node.parentNode.replaceChild(listMarkEnd, node);

        observe([listNS], function(list, ov, e){
            if(!listMarkEnd.parentNode){return;}
            if(!(Array.isArray(list))){return;}
            var content = listMarkEnd.parentNode;
            //TODO 增强array功能后这里就不用全部删了再加了
            listNodeCollection.forEach(function(element){
                remove(element);
            });
            listNodeCollection.length = 0;
            list.forEach(function(dataElement, index){
                var element = create(templateFunc(template, index, tmpProp, listProp));
                element[marker.extraData] = {
                    index : index,
                    value : dataElement
                };
                content.insertBefore(element, listMarkEnd);
                listNodeCollection.push(element);
                scan(element);
            });
        });
    },
    //textNode
    text : function(node, textContent){
        var context = parser.context(node, node),
            deps = parser.deps(textContent, context),
            extraData = node[marker.extraData];

        observe(deps, function(value){
            node.textContent = getText(textContent, context, extraData);
        });
    }
}

module.exports = binder;

},{"./dom.marker":6,"./dom.parser":8,"./dom.walker":9,"./kit":17}],8:[function(require,module,exports){
/*
    各种解析
*/
var $ = require('./kit');
var config = require('./config');
var expression = require('./expression'),
    parseDeps = expression.parseDeps;
var marker = require('./dom.marker');

var base = require('./base'),
    get = base.get,
    root = base.root;

var expPreg = marker.exp,
    expSource = marker.expSource;
//################################################################################################################
var unique = $.unique;
//################################################################################################################
var parser = {
    /*
        Array 解析文本的若干个表达式中的依赖
    */
    'deps' : function(text, context){
        var deps = [];
        //TODO 卧槽忘了这里干嘛的了
        if(context.indexOf('[') >= 1){
            return [context.split('[')[0]];
        }
        var expressions = parser.exps(text);
        expressions.forEach(function(exp){
            deps.push.apply(deps, parseDeps(exp, context));
        });
        return unique(deps);
    },
    /*
        Array 分解出表达式部分
    */
    'exps' : function(text){
        var expressions = [], preg = new RegExp(expSource, 'mg'), match;
        while(match = preg.exec(text)){
            expressions.push(match[1]);
        }
        return expressions;
    },
    /*
        Object extraData
    */
    // 'extraData' : function(node){
    //     if(node[marker.extraData]){
    //         return node[marker.extraData];
    //     }
    //     return node.parentNode ? parser.extraData(node.parentNode) : undefined;
    // },
    /*
        String 根据表达式解析text
    */
    'text' : function(text, context, extra){
        var extra, rs, value = get(context);
        return text.replace(new RegExp(expSource, 'mg'), function(t, match){
            return expression(match, value, root, extra);
        });
    },
    //TODO cache context in node
    //TODO cascade
    /*
        String 获取节点绑定的context scope
        顺手吧extraData也获取了存在node的脑海里
    */
    'context' : function(node, self){
        //TODO 优化
        if(node[marker.extraData] && !self[marker.extraData]){
            self[marker.extraData] = node[marker.extraData];
        }
        if(node[marker.bind]){
            //property优先
            return node[marker.bind];
        }
        if(node.getAttribute && node.getAttribute(marker.bind)){
            return node.getAttribute(marker.bind);
        }
        return node.parentNode ? parser.context(node.parentNode, self) : '';
    }
};
module.exports = parser;

},{"./base":2,"./config":3,"./dom.marker":6,"./expression":12,"./kit":17}],9:[function(require,module,exports){
/*
    dom遍历
*/
var parseOnlyWhileScan = false;
var checkProp;
var scanQueue = [];

var config = require('./config');
var marker, observer;
var expPreg, inPreg;

var base = require('./base'),
    get = base.get,
    observe = base.observe;

var scanEngine = function(node, parseOnly){
    //boolean的情况下
    if(typeof parseOnly === 'boolean'){
        parseOnlyWhileScan = parseOnly;
    }
    //TODO data的情况下

    if(checkProp){
        scanQueue.push(node);
        return;
    }
    checkProp = {};
    node = node || document.body;

    walker(node, node);

    var value;
    for(var prop in checkProp){
        value = get(prop);
        checkProp[prop].forEach(function(func){
            //TODO apply?
            func(value, value);
            parseOnlyWhileScan || observe(prop, func);
        });
    }
    checkProp = null;
    if(scanQueue.length){
        scanEngine(scanQueue.shift());
    }
    parseOnlyWhileScan = false;
}
var walker = function(node, originNode){
    //elementNode
    if(node.nodeType === 1){
        var html = node.outerHTML;
        //外部处理
        if(check.custom(node, originNode)){return;}
        //if判断
        if(check.condition(node)){return;}
        //是list则放弃治疗
        if(check.list(node)){return;}
        //节点不包含{{}}
        if(check.html(html) && html.indexOf(marker.list) < 0){return;}
        //解析attr
        check.attr(node, html);
        //escape子节点
        if(check.escape(node)){return;}

        //解析children
        [].forEach.call(node.childNodes, function(childNode){
            walker(childNode, originNode);
        });
    }
    //textNode
    else if(node.nodeType === 3){
        check.text(node);
    }
    //其他节点管来干嘛
};

var check = {
    custom : function(node, originNode){
        // if(config.checkNode && node !== originNode && config.checkNode(node, originNode)){return;}
    },
    condition : function(node){

    },
    list : function(node){
        var listProp = node.getAttribute(marker.list);
        if(typeof listProp === 'string' && (listProp = inPreg.exec(listProp))){
            
            observer.list(node, listProp);
            return true;
        }
    },
    html : function(text){
        return !expPreg.test(text);
    },
    text : function(node){
        if(check.html(node.textContent)){return;}
        observer.text(node, node.textContent);
    },
    attr : function(node, html){
        [].forEach.call(node.attributes, function(attributeNode){
            if(expPreg.test(attributeNode.value)){
                observer.attr(node, attributeNode.value, attributeNode.name);
            }
        });
    },
    escape : function(node){

    }
}

module.exports = {
    init : function(){
        marker = require('./dom.marker');
        observer = require('./dom.observer');
        expPreg = marker.exp;
        inPreg = marker.inPreg;
        return this;
    },
    scan : scanEngine,
    addBinder : function(props, func){
        if(!checkProp){return;}
        props = [].concat(props);
        props.forEach(function(prop){
            if(!checkProp[prop]){
                checkProp[prop] = [];
            }
            checkProp[prop].push(func);
        });
    },
    removeBinder : function(){

    }
};

},{"./base":2,"./config":3,"./dom.marker":6,"./dom.observer":7}],10:[function(require,module,exports){
/*
    artTemplate extend

    提供render方法[和register]
*/
var artTemplate = require('art-template');
var filters = require('./expression.filter') || {};
var log = require('./kit').log;

for(var helperName in filters){
    if(!filters.hasOwnProperty(helperName)){continue;}
    artTemplate.helper(helperName, filters[helperName]);
}
artTemplate.onerror = function(e){
    log('Expression.artTemplate', e.message, 'warn');
}
module.exports = {
    render : function(expressionText, data){
        expressionText = '{{' + expressionText + '}}';
        rs = artTemplate.render(expressionText)(data);
        if(rs === '{Template Error}'){
            rs = '';
        }
        return rs;
    },
    register : artTemplate.helper
};

},{"./expression.filter":11,"./kit":17,"art-template":21}],11:[function(require,module,exports){
/*
    liquid式预设helper外挂包
*/
var def = function(rs, defaultValue){
    return rs === undefined ? defaultValue : rs;
}
module.exports = {
    // ###add 调试用
    debug : function(value){
        debugger
        return value;
    },
    // ###toBool 输出修正拳
    toBool : function(value){
        return !!value;
    },
    // ###toString 输出修正拳
    toString : function(value){
        if(typeof value === 'string'){
            return value;
        }
        if(value !== null && value !== undefined){
            return value.toString();
        }
        return '';
    },
    // date -时间格式化| date:'yyyy-MM-dd hh:mm:ss'
    date : function (date, format) {
        date = new Date(date);
        if(!format){
            return date.valueOf();
        }
        var map = {
            "M": date.getMonth() + 1, //月份 
            "d": date.getDate(), //日 
            "h": date.getHours(), //小时 
            "m": date.getMinutes(), //分 
            "s": date.getSeconds(), //秒 
            "q": Math.floor((date.getMonth() + 3) / 3), //季度 
            "S": date.getMilliseconds() //毫秒 
        };
        format = format.replace(/([yMdhmsqS])+/g, function(all, t){
            var v = map[t];
            if(v !== undefined){
                if(all.length > 1){
                    v = '0' + v;
                    v = v.substr(v.length-2);
                }
                return v;
            }
            else if(t === 'y'){
                return (date.getFullYear() + '').substr(4 - all.length);
            }
            return all;
        });
        return format;
    },
    // capitalize-设置输入中的某个单词*
    // downcase-将输入的字符串转换为小写*
    // upcase-将输入的字符串转换为大写
    // first-获得传入的数组的第一个元素
    // first : function(arr){
    //     return arr[0];
    // },
    // ###item:获取第n个元素,支持负数
    item : function(arr, index){
        if(index >= 0){
            return arr[index];
        }
        else{
            return arr[arr.length + index];
        }
    },
    // last-获得传入的数组的最后一个元素
    // last : function(arr){
    //     return arr[arr.length?arr.length-1:0];
    // },
    // join-用数组的分隔符连接数组中的元素
    join : function(arr, joinMark){
        return arr.join(joinMark);
    },
    // sort-数组中的元素排序
    sort : function(arr, dir){
        return arr.sort(function(a, b){return dir ? a > b : b > a;});
    },
    // map-通过指定的属性过滤数组中的元素
    map : function(arr, json){
        json = JSON.parse(json);
        if(Array.isArray(arr)){
            return arr.map(function(element){
                return json[element];
            });
        }
        else if(typeof arr === 'string'){
            return json[arr];
        }
        return arr;
    },
    // size-返回一个数组或字符串的大小
    size : function(data){
        if(typeof data === 'number'){
            return String(data.toString()).length;
        }
        if(typeof data === 'string'){
            return String(data).length;
        }
        return data.length;
    },
    // escape-转义一个字符串
    // escape_once-返回HTML的转义版本，而不会影响现有的实体转义
    // strip_html-从字符串去除HTML
    strip_html : function(str){
        // return str.replace()
        return str;
    },
    // ### json_stringify
    json_stringify : function(obj){
        return JSON.stringify(obj);
    },
    // strip_newlines -从字符串中去除所有换行符（\ n）的
    // newline_to_br-用HTML标记替换每个换行符（\ n）
    // replace-替换，例如：{{ 'foofoo' | replace:'foo','bar' }} #=> 'barbar'
    replace : function(str, match, replace){
        return str.replace(new RegExp(match, 'g'), replace);
    },
    // replace_first-替换第一个，例如： '{{barbar' | replace_first:'bar','foo' }} #=> 'foobar'
    // remove-删除，例如：{{'foobarfoobar' | remove:'foo' }} #=> 'barbar'
    // remove_first-删除第一个，例如：{{ 'barbar' | remove_first:'bar' }} #=> 'bar'
    // truncate-截取字符串到第x个字符
    // truncate : function(str, length){
    //     return str.slice(0, length);
    // },
    // slice-截取字符串第x个到第x个字符
    slice : function(str, fromIndex, toIndex){
        return str.slice(fromIndex, def(toIndex, undefined));
    },
    // truncatewords-截取字符串到第x个词
    // prepend-前置添加字符串，例如：{{ 'bar' | prepend:'foo' }} #=> 'foobar'
    prepend : function(str, appendString){
        return def(prependString, '...') + str;
    },
    // append-后置追加字符串，例如：{{'foo' | append:'bar' }} #=> 'foobar'
    append : function(str, appendString){
        return str + def(appendString, '...');
    },
    // minus-减法，例如：{{ 4 | minus:2 }} #=> 2
    minus : function(rs, num){
        return rs - num;
    },
    // plus-加法，例如：{{'1' | plus:'1' }} #=> '11', {{ 1 | plus:1 }} #=> 2
    plus : function(rs, num){
        return rs + num;
    },
    // times-乘法，例如：{{ 5 | times:4 }} #=> 20
    times : function(rs, num){
        return rs * num;
    },
    // divided_by-除法，例如：{{ 10 | divided_by:2 }} #=> 5
    divided_by : function(rs, num){
        return rs / num;
    },
    // split-通过正则表达式切分字符串为数组，例如：{{"a~b" | split:"~" }} #=> ['a','b']
    split : function(str, splitMark){
        return str.split(def(splitMark, ','));
    },
    // modulo-取模，例如：{{ 3 | modulo:2 }} #=> 1
    modulo : function(rs, num){
        return rs % num;
    }
};

},{}],12:[function(require,module,exports){
/*
    表达式解析外挂包
    expression('a.b.c', {a:xxx}, vm， extraData)
    整个文件跟{{}}没关系啦
*/
var $ = require('./kit');
var config = require('./config');

var expressionEngine = require('./expression.artTemplate'),
    engine = {
        render : config.templateRender || expressionEngine.render,
        register : config.templateHelper || expressionEngine.register
    };

var rootVar = config.rootVar,
    rootVarLen = String(rootVar).length,
    extraVar = config.extraVar;

//################################################################################################################
var merge = $.merge,
    log = $.log;
//################################################################################################################
//获取表达式中依赖的字段
var parseDeps = function(expressionText, context){
    var expression = getExpressionPart(expressionText);
    var reg = /(?=\b|\.|\[)(?!\'|\")([\w\.\[\]]+)(?!\'|\")\b/g, expressionBody;
    var match, col = [], temp;
    while(match = reg.exec(expression)){
        //TODO 数组支持
        if(match[1].indexOf('[') === 0){continue;}
        temp = match[1].indexOf('[') ? match[1].split('[')[0] : match[1];
        if(temp.slice(0, rootVarLen - 1) === rootVar + '.'){}
        else if(temp.slice(0, 1) === '.'){continue;}
        else{temp = (context ? context + '.' : '') + temp;}
        col.push(temp);
    }
    return col;
}
//分离表达式部分和helper部分
var getExpressionPart = function(expressionText){
    return expressionText.split(/\|{1,1}/)[0].trim();
}
//################################################################################################################
var expression = function(expressionText, scope, rootScope, extraData){
    if(expressionText === undefined){return '';}

    var data, root = {}, extra = {};
    root[rootVar] = rootScope;
    extra[extraVar] = extraData;
    data = merge(
        scope,
        root,
        extra
    );
    return engine.render(expressionText, data);
}
expression.register = engine.register;
expression.parseDeps = parseDeps;
//################################################################################################################
module.exports = expression;


},{"./config":3,"./expression.artTemplate":10,"./kit":17}],13:[function(require,module,exports){
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
//################################################################################################################
var parseProp = require('./kit').parseProp;
var register = parser.register,
    build = parser.build;
//################################################################################################################
var databind = function(nameNS, obj){
    //第一个参数是否namescpace
    if(typeof nameNS !== 'string'){
        obj = nameNS;
        nameNS = '';
    }
    var base = build(nameNS, obj);
    register('', base);
    this.name = this._name = nameNS;

    //TODO 强制mode0输出...
    var acc = Accessor.check(nameNS),
        exports = acc.value;
    if($.isSimpleObject(exports)){
        exports = {};
    }
    exports.__proto__ = Object.create(extendAPI, {'_name':{'value' : nameNS}});
    return exports;
}

module.exports = databind;
//define后抛出的api
var apiList = ['get', 'set', 'observe', 'unobserve', 'fire'];

apiList.forEach(function(method){
    Object.defineProperty(extendAPI, method, {
        enumerable : false,
        writable : true,
        value : (function(method){
            return function(){
                arguments[0] = parseProp(this._name, arguments[0]);
                require('./factory')[method].apply(this, arguments);
            };
        })(method)
    });
});
},{"./accessor":1,"./config":3,"./factory":14,"./factory.parser":15,"./kit":17,"./listener":18}],14:[function(require,module,exports){
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


},{"./accessor":1,"./config":3,"./factory.define":13,"./listener":18}],15:[function(require,module,exports){
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
    register : function(baseNS, obj){
        var desc = func.getDesc(obj), 
            base,
            data = desc.value;
        base = Accessor.check(baseNS) || new Accessor(baseNS, data);
        if(isSimpleObject(data)){
            for(var key in data){
                if(!data.hasOwnProperty(key)){continue;}
                func.register(base.parseProp(key), data[key]);
            }
        }
        base.setProp(desc);
        //TODO 强制mode0
        base.bindProp();
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


},{"./accessor":1,"./config":3,"./kit":17}],16:[function(require,module,exports){
/*!
    Σヾ(ﾟДﾟ)ﾉ
*/
var base = require('./base');
base.expression = require('./expression');

var dom = require('./dom');
base.scan = dom.scan;
base.bindContent = dom.bindContent;


},{"./base":2,"./dom":5,"./expression":12}],17:[function(require,module,exports){
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

},{"./config":3}],18:[function(require,module,exports){
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

},{"./accessor":1,"./kit":17}],19:[function(require,module,exports){
/*!
 * artTemplate - Template Engine
 * https://github.com/aui/artTemplate
 * Released under the MIT, BSD, and GPL Licenses
 */
 
!(function () {


/**
 * 模板引擎
 * @name    template
 * @param   {String}            模板名
 * @param   {Object, String}    数据。如果为字符串则编译并缓存编译结果
 * @return  {String, Function}  渲染好的HTML字符串或者渲染方法
 */
var template = function (filename, content) {
    return typeof content === 'string'
    ?   compile(content, {
            filename: filename
        })
    :   renderFile(filename, content);
};


template.version = '3.0.0';


/**
 * 设置全局配置
 * @name    template.config
 * @param   {String}    名称
 * @param   {Any}       值
 */
template.config = function (name, value) {
    defaults[name] = value;
};



var defaults = template.defaults = {
    openTag: '<%',    // 逻辑语法开始标签
    closeTag: '%>',   // 逻辑语法结束标签
    escape: true,     // 是否编码输出变量的 HTML 字符
    cache: true,      // 是否开启缓存（依赖 options 的 filename 字段）
    compress: false,  // 是否压缩输出
    parser: null      // 自定义语法格式器 @see: template-syntax.js
};


var cacheStore = template.cache = {};


/**
 * 渲染模板
 * @name    template.render
 * @param   {String}    模板
 * @param   {Object}    数据
 * @return  {String}    渲染好的字符串
 */
template.render = function (source, options) {
    return compile(source, options);
};


/**
 * 渲染模板(根据模板名)
 * @name    template.render
 * @param   {String}    模板名
 * @param   {Object}    数据
 * @return  {String}    渲染好的字符串
 */
var renderFile = template.renderFile = function (filename, data) {
    var fn = template.get(filename) || showDebugInfo({
        filename: filename,
        name: 'Render Error',
        message: 'Template not found'
    });
    return data ? fn(data) : fn;
};


/**
 * 获取编译缓存（可由外部重写此方法）
 * @param   {String}    模板名
 * @param   {Function}  编译好的函数
 */
template.get = function (filename) {

    var cache;
    
    if (cacheStore[filename]) {
        // 使用内存缓存
        cache = cacheStore[filename];
    } else if (typeof document === 'object') {
        // 加载模板并编译
        var elem = document.getElementById(filename);
        
        if (elem) {
            var source = (elem.value || elem.innerHTML)
            .replace(/^\s*|\s*$/g, '');
            cache = compile(source, {
                filename: filename
            });
        }
    }

    return cache;
};


var toString = function (value, type) {

    if (typeof value !== 'string') {

        type = typeof value;
        if (type === 'number') {
            value += '';
        } else if (type === 'function') {
            value = toString(value.call(value));
        } else {
            value = '';
        }
    }

    return value;

};


var escapeMap = {
    "<": "&#60;",
    ">": "&#62;",
    '"': "&#34;",
    "'": "&#39;",
    "&": "&#38;"
};


var escapeFn = function (s) {
    return escapeMap[s];
};

var escapeHTML = function (content) {
    return toString(content)
    .replace(/&(?![\w#]+;)|[<>"']/g, escapeFn);
};


var isArray = Array.isArray || function (obj) {
    return ({}).toString.call(obj) === '[object Array]';
};


var each = function (data, callback) {
    var i, len;        
    if (isArray(data)) {
        for (i = 0, len = data.length; i < len; i++) {
            callback.call(data, data[i], i, data);
        }
    } else {
        for (i in data) {
            callback.call(data, data[i], i);
        }
    }
};


var utils = template.utils = {

	$helpers: {},

    $include: renderFile,

    $string: toString,

    $escape: escapeHTML,

    $each: each
    
};/**
 * 添加模板辅助方法
 * @name    template.helper
 * @param   {String}    名称
 * @param   {Function}  方法
 */
template.helper = function (name, helper) {
    helpers[name] = helper;
};

var helpers = template.helpers = utils.$helpers;




/**
 * 模板错误事件（可由外部重写此方法）
 * @name    template.onerror
 * @event
 */
template.onerror = function (e) {
    var message = 'Template Error\n\n';
    for (var name in e) {
        message += '<' + name + '>\n' + e[name] + '\n\n';
    }
    
    if (typeof console === 'object') {
        console.error(message);
    }
};


// 模板调试器
var showDebugInfo = function (e) {

    template.onerror(e);
    
    return function () {
        return '{Template Error}';
    };
};


/**
 * 编译模板
 * 2012-6-6 @TooBug: define 方法名改为 compile，与 Node Express 保持一致
 * @name    template.compile
 * @param   {String}    模板字符串
 * @param   {Object}    编译选项
 *
 *      - openTag       {String}
 *      - closeTag      {String}
 *      - filename      {String}
 *      - escape        {Boolean}
 *      - compress      {Boolean}
 *      - debug         {Boolean}
 *      - cache         {Boolean}
 *      - parser        {Function}
 *
 * @return  {Function}  渲染方法
 */
var compile = template.compile = function (source, options) {
    
    // 合并默认配置
    options = options || {};
    for (var name in defaults) {
        if (options[name] === undefined) {
            options[name] = defaults[name];
        }
    }


    var filename = options.filename;


    try {
        
        var Render = compiler(source, options);
        
    } catch (e) {
    
        e.filename = filename || 'anonymous';
        e.name = 'Syntax Error';

        return showDebugInfo(e);
        
    }
    
    
    // 对编译结果进行一次包装

    function render (data) {
        
        try {
            
            return new Render(data, filename) + '';
            
        } catch (e) {
            
            // 运行时出错后自动开启调试模式重新编译
            if (!options.debug) {
                options.debug = true;
                return compile(source, options)(data);
            }
            
            return showDebugInfo(e)();
            
        }
        
    }
    

    render.prototype = Render.prototype;
    render.toString = function () {
        return Render.toString();
    };


    if (filename && options.cache) {
        cacheStore[filename] = render;
    }

    
    return render;

};




// 数组迭代
var forEach = utils.$each;


// 静态分析模板变量
var KEYWORDS =
    // 关键字
    'break,case,catch,continue,debugger,default,delete,do,else,false'
    + ',finally,for,function,if,in,instanceof,new,null,return,switch,this'
    + ',throw,true,try,typeof,var,void,while,with'

    // 保留字
    + ',abstract,boolean,byte,char,class,const,double,enum,export,extends'
    + ',final,float,goto,implements,import,int,interface,long,native'
    + ',package,private,protected,public,short,static,super,synchronized'
    + ',throws,transient,volatile'

    // ECMA 5 - use strict
    + ',arguments,let,yield'

    + ',undefined';

var REMOVE_RE = /\/\*[\w\W]*?\*\/|\/\/[^\n]*\n|\/\/[^\n]*$|"(?:[^"\\]|\\[\w\W])*"|'(?:[^'\\]|\\[\w\W])*'|\s*\.\s*[$\w\.]+/g;
var SPLIT_RE = /[^\w$]+/g;
var KEYWORDS_RE = new RegExp(["\\b" + KEYWORDS.replace(/,/g, '\\b|\\b') + "\\b"].join('|'), 'g');
var NUMBER_RE = /^\d[^,]*|,\d[^,]*/g;
var BOUNDARY_RE = /^,+|,+$/g;
var SPLIT2_RE = /^$|,+/;


// 获取变量
function getVariable (code) {
    return code
    .replace(REMOVE_RE, '')
    .replace(SPLIT_RE, ',')
    .replace(KEYWORDS_RE, '')
    .replace(NUMBER_RE, '')
    .replace(BOUNDARY_RE, '')
    .split(SPLIT2_RE);
};


// 字符串转义
function stringify (code) {
    return "'" + code
    // 单引号与反斜杠转义
    .replace(/('|\\)/g, '\\$1')
    // 换行符转义(windows + linux)
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n') + "'";
}


function compiler (source, options) {
    
    var debug = options.debug;
    var openTag = options.openTag;
    var closeTag = options.closeTag;
    var parser = options.parser;
    var compress = options.compress;
    var escape = options.escape;
    

    
    var line = 1;
    var uniq = {$data:1,$filename:1,$utils:1,$helpers:1,$out:1,$line:1};
    


    var isNewEngine = ''.trim;// '__proto__' in {}
    var replaces = isNewEngine
    ? ["$out='';", "$out+=", ";", "$out"]
    : ["$out=[];", "$out.push(", ");", "$out.join('')"];

    var concat = isNewEngine
        ? "$out+=text;return $out;"
        : "$out.push(text);";
          
    var print = "function(){"
    +      "var text=''.concat.apply('',arguments);"
    +       concat
    +  "}";

    var include = "function(filename,data){"
    +      "data=data||$data;"
    +      "var text=$utils.$include(filename,data,$filename);"
    +       concat
    +   "}";

    var headerCode = "'use strict';"
    + "var $utils=this,$helpers=$utils.$helpers,"
    + (debug ? "$line=0," : "");
    
    var mainCode = replaces[0];

    var footerCode = "return new String(" + replaces[3] + ");"
    
    // html与逻辑语法分离
    forEach(source.split(openTag), function (code) {
        code = code.split(closeTag);
        
        var $0 = code[0];
        var $1 = code[1];
        
        // code: [html]
        if (code.length === 1) {
            
            mainCode += html($0);
         
        // code: [logic, html]
        } else {
            
            mainCode += logic($0);
            
            if ($1) {
                mainCode += html($1);
            }
        }
        

    });
    
    var code = headerCode + mainCode + footerCode;
    
    // 调试语句
    if (debug) {
        code = "try{" + code + "}catch(e){"
        +       "throw {"
        +           "filename:$filename,"
        +           "name:'Render Error',"
        +           "message:e.message,"
        +           "line:$line,"
        +           "source:" + stringify(source)
        +           ".split(/\\n/)[$line-1].replace(/^\\s+/,'')"
        +       "};"
        + "}";
    }
    
    
    
    try {
        
        
        var Render = new Function("$data", "$filename", code);
        Render.prototype = utils;

        return Render;
        
    } catch (e) {
        e.temp = "function anonymous($data,$filename) {" + code + "}";
        throw e;
    }



    
    // 处理 HTML 语句
    function html (code) {
        
        // 记录行号
        line += code.split(/\n/).length - 1;

        // 压缩多余空白与注释
        if (compress) {
            code = code
            .replace(/\s+/g, ' ')
            .replace(/<!--[\w\W]*?-->/g, '');
        }
        
        if (code) {
            code = replaces[1] + stringify(code) + replaces[2] + "\n";
        }

        return code;
    }
    
    
    // 处理逻辑语句
    function logic (code) {

        var thisLine = line;
       
        if (parser) {
        
             // 语法转换插件钩子
            code = parser(code, options);
            
        } else if (debug) {
        
            // 记录行号
            code = code.replace(/\n/g, function () {
                line ++;
                return "$line=" + line +  ";";
            });
            
        }
        
        
        // 输出语句. 编码: <%=value%> 不编码:<%=#value%>
        // <%=#value%> 等同 v2.0.3 之前的 <%==value%>
        if (code.indexOf('=') === 0) {

            var escapeSyntax = escape && !/^=[=#]/.test(code);

            code = code.replace(/^=[=#]?|[\s;]*$/g, '');

            // 对内容编码
            if (escapeSyntax) {

                var name = code.replace(/\s*\([^\)]+\)/, '');

                // 排除 utils.* | include | print
                
                if (!utils[name] && !/^(include|print)$/.test(name)) {
                    code = "$escape(" + code + ")";
                }

            // 不编码
            } else {
                code = "$string(" + code + ")";
            }
            

            code = replaces[1] + code + replaces[2];

        }
        
        if (debug) {
            code = "$line=" + thisLine + ";" + code;
        }
        
        // 提取模板中的变量名
        forEach(getVariable(code), function (name) {
            
            // name 值可能为空，在安卓低版本浏览器下
            if (!name || uniq[name]) {
                return;
            }

            var value;

            // 声明模板变量
            // 赋值优先级:
            // [include, print] > utils > helpers > data
            if (name === 'print') {

                value = print;

            } else if (name === 'include') {
                
                value = include;
                
            } else if (utils[name]) {

                value = "$utils." + name;

            } else if (helpers[name]) {

                value = "$helpers." + name;

            } else {

                value = "$data." + name;
            }
            
            headerCode += name + "=" + value + ",";
            uniq[name] = true;
            
            
        });
        
        return code + "\n";
    }
    
    
};



// 定义模板引擎的语法


defaults.openTag = '{{';
defaults.closeTag = '}}';


var filtered = function (js, filter) {
    var parts = filter.split(':');
    var name = parts.shift();
    var args = parts.join(':') || '';

    if (args) {
        args = ', ' + args;
    }

    return '$helpers.' + name + '(' + js + args + ')';
}


defaults.parser = function (code, options) {

    // var match = code.match(/([\w\$]*)(\b.*)/);
    // var key = match[1];
    // var args = match[2];
    // var split = args.split(' ');
    // split.shift();

    code = code.replace(/^\s/, '');

    var split = code.split(' ');
    var key = split.shift();
    var args = split.join(' ');

    

    switch (key) {

        case 'if':

            code = 'if(' + args + '){';
            break;

        case 'else':
            
            if (split.shift() === 'if') {
                split = ' if(' + split.join(' ') + ')';
            } else {
                split = '';
            }

            code = '}else' + split + '{';
            break;

        case '/if':

            code = '}';
            break;

        case 'each':
            
            var object = split[0] || '$data';
            var as     = split[1] || 'as';
            var value  = split[2] || '$value';
            var index  = split[3] || '$index';
            
            var param   = value + ',' + index;
            
            if (as !== 'as') {
                object = '[]';
            }
            
            code =  '$each(' + object + ',function(' + param + '){';
            break;

        case '/each':

            code = '});';
            break;

        case 'echo':

            code = 'print(' + args + ');';
            break;

        case 'print':
        case 'include':

            code = key + '(' + split.join(',') + ');';
            break;

        default:

            // 过滤器（辅助方法）
            // {{value | filterA:'abcd' | filterB}}
            // >>> $helpers.filterB($helpers.filterA(value, 'abcd'))
            // TODO: {{ddd||aaa}} 不包含空格
            if (/^\s*\|\s*[\w\$]/.test(args)) {

                var escape = true;

                // {{#value | link}}
                if (code.indexOf('#') === 0) {
                    code = code.substr(1);
                    escape = false;
                }

                var i = 0;
                var array = code.split('|');
                var len = array.length;
                var val = array[i++];

                for (; i < len; i ++) {
                    val = filtered(val, array[i]);
                }

                code = (escape ? '=' : '=#') + val;

            // 即将弃用 {{helperName value}}
            } else if (template.helpers[key]) {
                
                code = '=#' + key + '(' + split.join(',') + ');';
            
            // 内容直接输出 {{value}}
            } else {

                code = '=' + code;
            }

            break;
    }
    
    
    return code;
};



// RequireJS && SeaJS
if (typeof define === 'function') {
    define(function() {
        return template;
    });

// NodeJS
} else if (typeof exports !== 'undefined') {
    module.exports = template;
} else {
    this.template = template;
}

})();
},{}],20:[function(require,module,exports){
var fs = require('fs');
var path = require('path');

module.exports = function (template) {

	var cacheStore = template.cache;
	var defaults = template.defaults;
	var rExtname;

	// 提供新的配置字段
	defaults.base = '';
	defaults.extname = '.html';
	defaults.encoding = 'utf-8';


	// 重写引擎编译结果获取方法
	template.get = function (filename) {
		
	    var fn;
	    
	    if (cacheStore.hasOwnProperty(filename)) {
	        // 使用内存缓存
	        fn = cacheStore[filename];
	    } else {
	        // 加载模板并编译
	        var source = readTemplate(filename);
	        if (typeof source === 'string') {
	            fn = template.compile(source, {
	                filename: filename
	            });
	        }
	    }

	    return fn;
	};

	
	function readTemplate (id) {
	    id = path.join(defaults.base, id + defaults.extname);
	    
	    if (id.indexOf(defaults.base) !== 0) {
	        // 安全限制：禁止超出模板目录之外调用文件
	        throw new Error('"' + id + '" is not in the template directory');
	    } else {
	        try {
	            return fs.readFileSync(id, defaults.encoding);
	        } catch (e) {}
	    }
	}


	// 重写模板`include``语句实现方法，转换模板为绝对路径
	template.utils.$include = function (filename, data, from) {
	    
	    from = path.dirname(from);
	    filename = path.join(from, filename);
	    
	    return template.renderFile(filename, data);
	}


	// express support
	template.__express = function (file, options, fn) {

	    if (typeof options === 'function') {
	        fn = options;
	        options = {};
	    }


		if (!rExtname) {
			// 去掉 express 传入的路径
			rExtname = new RegExp((defaults.extname + '$').replace(/\./g, '\\.'));
		}


	    file = file.replace(rExtname, '');

	    options.filename = file;
	    fn(null, template.renderFile(file, options));
	};


	return template;
}
},{"fs":22,"path":23}],21:[function(require,module,exports){
/*!
 * artTemplate[NodeJS]
 * https://github.com/aui/artTemplate
 * Released under the MIT, BSD, and GPL Licenses
 */

var node = require('./_node.js');
var template = require('../dist/template-debug.js');
module.exports = node(template);
},{"../dist/template-debug.js":19,"./_node.js":20}],22:[function(require,module,exports){

},{}],23:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":24}],24:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[16]);
