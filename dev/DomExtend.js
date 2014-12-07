/*
    dom绑定用外挂包
    TODO list
    -scope啊啊啊啊啊dom里怎么堆scope啊啊啊
*/
var DataBind = require('./DataBind');
var expression = require('./Expression');
var config = require('./config');
// require('./Zepto.min');

var $ = require('./kit');

var expPreg = new RegExp(config.expHead + '(.*?)' + config.expFoot, 'm');
var prefix = config.DOMPrefix || 'vm-';
var marker = {
    'model' : prefix + 'model',
    'list' : prefix + 'list',
    'bind' : prefix + 'bind',
    'escape' : prefix + 'escape',
    'toggle' : prefix + 'toggle'
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

var parseOnlyWhileScan = false;


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
        dom to data
    */
    'bindContent' : function(node){
        var evtBody = node || document.body;
        evt(evtBody)
            //TODO 绑定太简陋?
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
        dom绑定解析&纯模版化解析
    */
    'scan' : function(node, parseOnly){
        if(parseOnly){
            parseOnlyWhileScan = parseOnly;
        }
        if(checkProp){
            scanQueue.push(node);
            return;
        }
        checkProp = {};
        main.parseNode(node || document.body);
        var value;
        for(var prop in checkProp){
            value = get(prop);
            checkProp[prop].forEach(function(func){
                //TODO apply?
                func(value, value);
                parseOnlyWhileScan || observe(prop, func, checkType);
            });

        }
        checkProp = null;
        if(scanQueue.length){
            main.scan(scanQueue.shift());
        }
        parseOnlyWhileScan = false;
    },
    /*
        TODO 堆scope
    */
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

            if(node.getAttribute(marker.escape)){return;}

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
        //TODO WTF?
        if(listProp.indexOf(' in ') >= 0){
            listProp = listProp.split(' in ')[1];
        }
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
        if(node[marker.bind]){
            return node[marker.bind];
        }
        if(node.getAttribute && node.getAttribute(marker.bind)){
            return node.getAttribute(marker.bind);
        }
        return node.parentNode ? parse.context(node.parentNode) : '';
    }
};
//data to dom
var bind = {
    'model' : function(e){
        var type = this.type, name = this.name, tagName = this.tagName.toLowerCase();
        var model = this.getAttribute(marker.model), context = parse.context(this);
        var value = '', form = this.form || document.body, rs;
        this[marker.bind] = context;

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
        var context = parse.context(node);
        node[marker.bind] = context;

        prop = (context ? context + '.' + prop : prop);
        var listMark = document.createComment('list for ' + prop),
            listNodeCollection = [];
        node.parentNode.replaceChild(listMark, node);
        main.addScanFunc(prop, function(v, ov, e){
            if(!listMark.parentNode){return;}
            var list = get(prop);
            if(!(list instanceof Array)){return;}
            var content = listMark.parentNode;
            //TODO 增强array功能后这里就不用全部删了再加了
            [].forEach.call(listNodeCollection, function(element){
                remove(element);
            });
            list.forEach(function(dataElement, index){
                var element = create(template);
                // var scope = Object.create(dataElement, {index:{value:index}});
                // element.setAttribute(marker.bind, prop + '['+index+']');
                element[marker.bind] = prop + '['+index+']';
                content.insertBefore(element, listMark);
                listNodeCollection.push(element);
                main.scan(element);
            });
        });
    },
    //node attribute
    'attr' : function(node, attrText, attrName){
        var context = parse.context(node), deps = parse.deps(attrText, context), func;
        node[marker.bind] = context;

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
            case 'selected' : 
                var checkValue = node.value;
                func = function(value){
            //TODO if(!node.parentNode){}
                    node.selected = value === checkValue;
                };
                break;
            case 'value' : 
                func = function(){
            //TODO if(!node.parentNode){}
                    node.value = parse.text(attrText, context);
                }
                break;
            case 'data-src' : 
                func = function(){
            //TODO if(!node.parentNode){}
                    node.src = parse.text(attrText, context);
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
        node[marker.bind] = context;
        var exchangeNode = node;
        func = function(v, ov, e){
            if(e && !contains(document.documentElement, node)){
                unobserve(e.nameNS, func, checkType);
                return;
            }
            if(v instanceof Node){exchangeNode = bind.element(exchangeNode, v);}
            else if(ov instanceof Node){exchangeNode = bind.element(exchangeNode, node);}
            node.textContent = parse.text(textContent, context);
        }
        deps.forEach(function(prop){
            main.addScanFunc(prop, func);
        });
    },
    'element' : function(oldElement, newElement){
        if(!oldElement.parentNode){return oldElement;}
        oldElement.parentNode.replaceChild(newElement, oldElement);
        DataBind.scan(newElement);
        return newElement;
    }
}
//################################################################################################################
DataBind.scan = main.scan;
DataBind.bindContent = main.bindContent;
//################################################################################################################
window.document.addEventListener('DOMContentLoaded', function(){
    if(!config.initDOM){return;}
    main.bindContent(document.body);
    if(config.initDOM !== 1) main.scan(document.documentElement);
});


