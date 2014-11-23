(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Accessor = function(nameNS, value){
    if(arguments.length === 1){
        if(!Accessor.storage.hasOwnProperty(nameNS)){return undefined;}
        return Accessor.storage[nameNS];
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
    this.status     = this.READY;

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
//ready > inited   
//build > setValue  
Accessor.prototype.READY = 0;
Accessor.prototype.INITED = 1;


Accessor.parseProp = function(prop, context){
    if(!prop){return context;}
    return context ? context + '.' + prop : prop;
}
Accessor.prototype.get = function(){
    return this.value;
}
Accessor.prototype.set = function(value, dirty, force){
    var self = this;
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

    if(value instanceof Array){
        //TODO 好挫！！！
        var arrayChangeLock;
        Object.observe(value, function(changes){
            if(arrayChangeLock){return;}
            arrayChangeLock = true;
            self.set(value, self.dirty, true);
        });
    }
    //TODO 其实楼上也要！mode才绑定，等实现set数组元素再说...
    else if(!config.mode && value && value.__proto__ === Object.prototype){
        for(var key in value){
            if(!value.hasOwnProperty(key)){continue;}
            childAcc = Accessor(this.parseProp(key));
            childAcc && childAcc.bindProp();
        }
    }
    return value;
}
//mode=0 defineproperty绑定对象属性用
Accessor.prototype.bindProp = function(){
    if(this.mode || !this.parent || this.parent.__proto__ !== Object.prototype){return;}
    var value = this.value, self = this;
    Object.defineProperty(this.parent, this.name, {
        set : function(value){
            return self.set(value);
        },
        get : function(){
            return self.get();
        }
    });
    this.parent[this.name] = value;
}
Accessor.prototype.parseProp = function(prop){
    if(!prop){return this.nameNS;}
    return this.nameNS ? this.nameNS + '.' + prop : prop;
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

},{"./Observer":6,"./config":7}],2:[function(require,module,exports){
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
                main.register(obj[key], base.parseProp(key));
            }
        }
        base.nameNS && main.defProp(desc, base);
        !base.mode && base.bindProp();
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

    //TODO 改输出就是麻烦...
    if(!config.mode){
        var acc = Accessor(nameNS),
            exports = acc.value;
        if(exports === null || exports === undefined){
            exports = {};
        }
        exports.__proto__ = Object.create(expApi, {'_name':{'value' : nameNS}});
        return exports;
    }
};
DataBind.root           = root;
DataBind.storage        = Accessor.storage;

DataBind.observe        = listener.add;
DataBind.unobserve      = listener.remove;
DataBind.fire           = listener.fire;

DataBind.destroy        = Accessor.destroy;

DataBind.setPropagation = function(nameNS, bool, type){
    var check = DataBind.check(nameNS);
    if(check){
        typeof bool === 'boolean' && (check.propagation = bool);
        type instanceof Array && (check.propagationType = type);
    }
    return this;
};
DataBind.init           = function(){
    new Accessor('', DataBind.root);
    DataBind.init = function(){};
    return DataBind;
}
DataBind.parseProp      = Accessor.parseProp;
DataBind.check          = function(nameNS){
    return Accessor(nameNS);
}
DataBind.checkListener  = function(nameNS, type){
    return listener.check(nameNS, type);
}
DataBind.get            = function(nameNS){
    var index, value;
    if(index = /(.*)\[(\d+)\]$/.exec(nameNS)){
        nameNS = index[1];
        index = index[2];
    }
    value = Accessor(nameNS) ? Accessor(nameNS).get() : undefined;
    if(index !== null && value instanceof Array){
        return value[index];
    }
    return value;
};
DataBind.set            = function(nameNS, value, dirty){
    Accessor(nameNS) && Accessor(nameNS).set(value, dirty);
    return value;
};
DataBind.config         = config.set;
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
DataBind.prototype.unobserve = function(propNS, func, evt){
    return DataBind.unobserve(main.parseNS(this._name, propNS), func, evt);
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
},{"./Accessor":1,"./Observer":6,"./config":7,"./kit":9}],3:[function(require,module,exports){
var DataBind = require('./DataBind');
var expression = require('./Expression');
var config = require('./config');

var $ = require('./kit');

var expPreg = /{{(.*?)}}/m;
var prefix = 'vm-';
var marker = {
	'model' : prefix + 'model',
	'list' : prefix + 'list',
	'bind' : prefix + 'bind'
}
var indexPreg = /\[(\d+)\]$/;
var nodeFuncKey = 'bindObserver';
var checkProp, checkType = 'change';
var scanQueue = [];

var vm = DataBind.root,
    set = DataBind.set,
    get = DataBind.get;

var observe = DataBind.observe,
    unobserve = DataBind.unobserve,
    fire = DataBind.fire;
//################################################################################################################
var evt = $.evt,
    find = $.find,
    findAll = $.findAll,
    contains = $.contains,
    create = $.create,
    remove = $.remove,
    unique = $.unique;
//################################################################################################################
var main = {
    /*
        绑定解析model获取事件的节点
    */
    'bindContent' : function(node){
		var evtBody = node || document.body;
		evt(evtBody)
			//radio checkbox etc...
			.on('change', [
					'input['+marker.model+']',
					'select['+marker.model+']'
				].join(','), 
				bind.model)
			//text etc...
			.on('input', [
					'input['+marker.model+']',
					'textarea['+marker.model+']'
				].join(','),
				bind.model);
	},
    /*
        解析节点
    */
	'scan' : function(node){
        if(checkProp){
            scanQueue.push(node);
            return;
        }
		checkProp = {};
		main.parseNode(node || document.body);
        var value;
        for(var key in checkProp){
            value = get(key);
            checkProp[key].forEach(function(func){
                //TODO apply?
                func(value, value);
            });
        }
        checkProp = null;
        if(scanQueue.length){
            main.scan(scanQueue.shift());
        }
	},
    'parseNode' : function(node, scope){
        //elementNode
        if(node.nodeType === 1){
        	var html = node.outerHTML;
            //节点包含{{}}
            if(!expPreg.test(html)){return;}
            //是list则放弃治疗
            if(check.list(node)){return;}
            //解析attr
            check.attr(node, html);
            //解析children
            [].forEach.call(node.childNodes, main.parseNode);
        }
        //textNode
        else if(node.nodeType === 3){
            //非空而且包含{{}}
            if(!node.textContent.trim().length || !expPreg.test(node.textContent)){return;}
            bind.text(node, node.textContent);
        }
        //其他节点管来干嘛
    },
    'addScanFunc' : function(prop, func){
        if(!checkProp[prop]){
            checkProp[prop] = [];
        }
        observe(prop, func, checkType);
        checkProp[prop].push(func);
    }
};
var check = {
    /*
        void check attribute中是否有表达式并绑定
    */
    'attr' : function(node, html){
        [].forEach.call(node.attributes, function(attributeNode){
        	if(expPreg.test(attributeNode.value)){
            	bind.attr(node, attributeNode.value, attributeNode.name);
        	}
        });
    },
    /*
        boolean check 是否为list，并绑定
    */
    'list' : function(node){
        var listProp = node.getAttribute(marker.list);
        if(listProp === null){return;}
        node.removeAttribute(marker.list);
        bind.list(node, listProp);
        return true;
    }
}
var parse = {
    /*
        Array 解析表达式中的依赖
    */
    'deps' : function(text, context){
        var deps = [];
        if(context.indexOf('[') >= 1){
            return [context.split('[')[0]];
        }
        expressions = parse.exps(text);
        expressions.forEach(function(exp){
            expression.parseDeps(exp, deps, function(dep){
                if(dep.indexOf('[') >= 1){
                    dep = dep.split('[')[0];
                }
                if(dep.slice(0, 3) === 'vm.'){return dep.slice(2, -1)}
                if(dep.slice(0, 1) === '.'){return context;}
                return context ? context + '.' + dep : dep;
            });
        });
        return unique(deps);
    },
    /*
        Array 分解出表达式部分
    */
    'exps' : function(text){
        var expressions = [], preg = new RegExp(expPreg.source, 'mg'), match;
        while(match = preg.exec(text)){
            expressions.push(match[1]);
        }
        return expressions;
    },
    /*
        String 根据表达式解析text
    */
    'text' : function(text, context){
        var extra, rs, value = get(context);
        if(rs = indexPreg.exec(context)){
            extra = {index:rs[1],name:value};
        }
        return text.replace(new RegExp(expPreg.source, 'mg'), function(t, match){
            return expression(match, value, vm, extra);
        });
    },
    //TODO cache context in node
    //TODO cascade
    /*
        String 获取节点绑定的context scope
    */
    'context' : function(node){
        if(node.getAttribute && node.getAttribute(marker.bind)){
            return node.getAttribute(marker.bind);
        }
        return node.parentNode ? parse.context(node.parentNode) : '';
    }
};
var bind = {
	'model' : function(e){
		var type = this.type, name = this.name, tagName = this.tagName.toLowerCase();
		var model = this.getAttribute(marker.model), context = parse.context(this);
		var value = '', form = this.form || document.body, rs;

        model = DataBind.parseProp(model, context);
        if(!DataBind.check(model)){
            new DataBind(model);
        }

		if(name && tagName === 'input'){
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
		set(model, value);
	},
	'list' : function(node, prop){
		var template = node.outerHTML;
        var listMark = document.createComment('list for ' + prop),
            listNodeCollection = [];
        node.parentNode.replaceChild(listMark, node);
        main.addScanFunc(prop, function(v, ov, e){
            if(!listMark.parentNode){return;}
            var list = get(prop);
            if(!(list instanceof Array)){return;}
            var content = listMark.parentNode;

            [].forEach.call(listNodeCollection, function(element){
                remove(element);
            });
            list.forEach(function(dataElement, index){
                var element = create(template);
                // var scope = Object.create(dataElement, {index:{value:index}});
                element.setAttribute(marker.bind, prop + '['+index+']');
                content.insertBefore(element, listMark);
                listNodeCollection.push(element);
                main.scan(element);
            });
        });
	},
    //node attribute
    'attr' : function(node, attrText, attrName){
        var context = parse.context(node), deps = parse.deps(attrText, context), func;
    	switch (attrName){
    		case 'checked' : 
        		var checkValue = node.value;
        		func = node.type === 'checkbox' ? 
        		function(value){
            //TODO if(!node.parentNode){}
        			node.checked = (value || '').split(',').indexOf(checkValue) >= 0;
        		} : 
        		function(value){
            //TODO if(!node.parentNode){}
        			node.checked = value === checkValue;
        		};
                break;
        	case 'value' : 
                func = function(){
            //TODO if(!node.parentNode){}
                    node.value = parse.text(attrText, context);
                }
                break;
        	default : 
                func = function(){
            //TODO if(!node.parentNode){}
                    node.setAttribute(attrName, parse.text(attrText, context));
                }
                break;
    	}
        deps.forEach(function(prop){
            main.addScanFunc(prop, func);
        });
    },
    //textNode
    'text' : function(node, textContent){
        var context = parse.context(node), deps = parse.deps(textContent, context), func;
        func = function(v, ov, e){
            //TODO if(!node.parentNode){}
            if(e && !contains(document.documentElement, node)){
                unobserve(e.nameNS, func, checkType);
                return;
            }
            node.textContent = parse.text(textContent, context);
        }
        deps.forEach(function(prop){
            main.addScanFunc(prop, func);
        });
    }
}
//################################################################################################################
DataBind.scan = main.scan;
DataBind.bindContent = main.bindContent;
//################################################################################################################
config.initDOM && window.document && window.document.addEventListener('DOMContentLoaded', function(){
    main.bindContent(document.body);
    main.scan(document.documentElement);
});



},{"./DataBind":2,"./Expression":4,"./config":7,"./kit":9}],4:[function(require,module,exports){
/*
    expression('a.b.c', {a:xxx}, vm)
    整个文件跟{{}}没关系啦
*/
var DataBind = require('./DataBind');
var $ = require('./kit');
var Filter = require('./Filter');

var scopeHolder = '$data', selfHolder = '$self';
//################################################################################################################
var log = $.log;
var get = DataBind.get;
var emptyFunc = function(){return '';};
var filterArgsSplitMark = ';';
var filter = Filter.list;
//################################################################################################################
var getValue = function(expression, scope, vm, extra){
    return parser(expression)(scope, vm, extra);
}
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
    //TODO cache
    if(!matchList && !matchCallback){return;}
    expression = getExpressionPart(expression).expression;
    var reg = /(?=\b|\.)(?!\'|\")([\w|\.]+)(?!\'|\")\b/g, expressionBody;
    //TODO 应该是把所有变量抓出来然后判空..感觉会好一点
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
var getExpressionPart = function(expressionText){
    //TODO cache
    var part = expressionText.split(/\|{1,1}/),
        exp = part.shift(),
        filterArgs = /^\s*([\w\-]+)(?:\((.+)\))?/.exec(part.join('|'));
    return {
        expression : exp.trim(),
        filterName : filterArgs && filterArgs[1].trim(),
        filterArgs : filterArgs && filterArgs[2] && filterArgs[2].split(filterArgsSplitMark)
    }
}

//################################################################################################################
var expression = function(expressionText, scope, vm, extra){
    if(typeof expressionText !== 'string' || !expressionText.trim() || expressionText[0] === '#'){return '';}
    //{{expression | filter}}
    var execData = getExpressionPart(expressionText);
    extra = extra || {};
    extra.value = scope;

    var rs = '';
    try{
        rs = getValue(execData.expression, scope, vm, extra);
    }catch(e){
        log('DataBind.expression', 'getValue: fetch error, function body :\n' + parserCache[execData.expression], e);
    }
    if(execData.filterName && filter.hasOwnProperty(execData.filterName)){
        try{
            rs = filter[execData.filterName].apply(scope, [rs, extra].concat(execData.filterArgs));
        }catch(e){
            log('DataBind.expression', 'filter:' + execData.filterName + ' error, args: "' + execData.filterArgs + '"', e);
        }
    }
    return rs;
}
//################################################################################################################
DataBind.expression = expression;
DataBind.expression.parseDeps = parseDeps;
DataBind.expression.register = Filter.register;

DataBind.expression.parserCache = parserCache;
//################################################################################################################
module.exports = expression;


},{"./DataBind":2,"./Filter":5,"./kit":9}],5:[function(require,module,exports){
var filter = {
    /*
        a,b,c | map({a:1,b:2,c:3};,) => 1,2,3
    */
    'map' : function(rs, extra, json, multiMark){
        var map = JSON.parse(json);
        if(!multiMark){
            rs = [rs];
        }
        var rsGroup = rs.split(multiMark);
        return rsGroup.map(function(rs){
            return map[rs] === undefined ? '' : map[rs];
        }).join(multiMark);
    },
    /*
        
    */
    'text-overflow' : function(rs, extra, num, holder){
        num = num || 16;
        holder = holder || '...';
        if(rs && rs.toString().length > num){
            rs = rs.slice(0, num) + holder;
        }
        return rs;
    },

    'date' : function(rs, extra, num, holder){

    }
};

module.exports = {
    list : filter,
    register : function(name, func){
        filter[name] = func;
    }
}
},{}],6:[function(require,module,exports){
var listener = {
    'topic' : {},
    'check' : function(nameNS, type, build){
        var list = listener.topic[nameNS];
        if(list && list[type]){
            return list[type];
        }
        if(!build){
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
        type = type || 'change';
        var fireBody = Accessor(nameNS);
        if(!fireBody){return;}

        listener._fireList = [];

        listener._getFireProps(nameNS, type);
        listener._fireList = unique(listener._fireList);

        var evtList, acc, ns, args;
        for(var i = 0, j = listener._fireList.length; i < j; i++){
            ns = listener._fireList[i];
            evtList = listener.check(ns, type);
            if(!evtList){continue;}
            acc = Accessor(ns);
            args = [acc.value, acc.oldValue, {
                type:type, 
                object:fireBody.parent,
                name:fireBody.name, 
                nameNS:fireBody.nameNS,
                prop:acc.name,
                propNS:acc.nameNS
            }];
            args[2] = merge(args[2], extArgs);
            evtList.forEach(function(func){
                if(typeof func !== 'function'){return;}
                func.apply(acc.parent, args);
            });
        }
        listener._fireList = null;
        return this;
    },
    '_fireList' : null,
    '_getFireProps' : function(nameNS, type){
        var acc = Accessor(nameNS);
        if(!acc){return;}
        listener._fireList.push(nameNS);
        (listener.check(nameNS, type) || []).forEach(function(dep){
            if(typeof dep === 'string'){
                var depAcc = Accessor(dep);
                depAcc.oldValue = depAcc.value;
                depAcc.value = depAcc.get();
                listener._getFireProps(dep);
            }
        });
        if(acc.parentNS !== null && acc.propagation){
            listener._getFireProps(acc.parentNS);
        }
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
var $ = require('./kit');
var merge = $.merge;
var unique = $.unique;
var Accessor = require('./Accessor');

},{"./Accessor":1,"./kit":9}],7:[function(require,module,exports){
var $ = require('./kit');
var config = {

    'debug' : 1

    ,'mode' : 0
    ,'propagation' : true
    ,'propagationType' : ['change']
    ,'initDOM' : true //DOM load的扫描

    ,set : function(cfg){
        $.merge(config, cfg, true);
    }
};

if('_DataBindConfig' in window){
    config.set(config, window._DataBindConfig);
}
module.exports = config;
},{"./kit":9}],8:[function(require,module,exports){

var name = 'DataBind';
if(name in window){return;}
window[name] = require('./DataBind').init();;
// require('./Expression');
require('./DomExtend');

},{"./DataBind":2,"./DomExtend":3}],9:[function(require,module,exports){
var $ = {};
// require('./jquery.hammer.min');

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
        var template = document.createElement('template');
        template.innerHTML = str;
        return template.content.firstChild;
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
    if(!('Zepto' in window)){
        log('kit.evt', '找不到zepto残念...到93行改事件库或者手动加载？');
        return;
    }
    var obj = typeof data === 'undefined' ?
        Zepto(element):
        Zepto(element).hammer(data);
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
var config = require('./config');
},{"./config":7}]},{},[8]);
