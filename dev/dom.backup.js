/*
    dom绑定用外挂包

    好长。。。该拆分了
*/
var DataBind = require('./factory');
var expression = DataBind.expression;
// var expression = require('./Expression');
// var expression = require('./Expression.artTemplate.js');
var config = require('./config');

var $ = require('./kit');

//exp /{{(.*)}}/
var expPreg = new RegExp(config.expHead.replace(/([\[\(\|])/g, '\\$1') + '(.*?)' + config.expFoot.replace(/([\[\(\|])/g, '\\$1'), 'm');
var prefix = config.DOMPrefix;
var marker = {
    'model' : prefix + 'model'//v to m
    ,'list' : prefix + 'list'//list: tr in table
    ,'bind' : prefix + 'bind'//scope源
    ,'if'   : prefix + 'if'//条件判断
    ,'escape' : prefix + 'escape'//scan外
    ,'toggle' : prefix + 'toggle'
    ,'extraData' : prefix + 'extraExpData' //传给expression的额外数据
    ,'boundAttr' : prefix + 'boundAttr' //已经绑定的attr&原值
    ,'boundText' : prefix + 'boundText' //已经绑定的text&原值
    ,'boundProp' : prefix + 'boundProp' //已经绑定的props
}
var listPreg = /([\w\.]+)\s+in\s+([\w\.]+)/,
    numberPreg = /^[\d\.]+$/;
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
        main.parseNode(node || document.body, node || document.body);
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
    'parseNode' : function(node, originNode){
        //elementNode
        if(node.nodeType === 1){
            var html = node.outerHTML;

            //外部处理
            if(config.checkNode && node !== originNode && config.checkNode(node, originNode)){return;}
            //if判断
            if(check.condition(node)){return;}
            //是list则放弃治疗
            if(check.list(node)){return;}
            //节点包含{{}}
            if(!expPreg.test(html) && html.indexOf(marker.list) < 0){return;}
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
    'addScanFunc' : function(props, func){
        props.forEach(function(prop){
            if(!checkProp[prop]){
                checkProp[prop] = [];
            }
            checkProp[prop].push(func);
        });
    },
    'checkRecycle' : function(node){
        if(!contains(document.documentElement, node)){
            for(var prop in node[marker.boundProp]){
                node[marker.boundProp][prop].forEach(function(func){
                    unobserve(prop, func, checkType);
                });
            }
            return true;
        }
    }
};
var subFunc = {
    //list: tr to table 替换
    templateFunc : function(template, index, writeProp, useProp){
        var listExpPreg = new RegExp(expPreg.source, 'mg'),
            fieldPreg = new RegExp('(?:\\s|\\b)('+writeProp+'\\.)', 'mg');
        return template.replace(listExpPreg, function(match, exp){
            return match.replace(fieldPreg, function(match, matchContext){
                return ' ' + useProp + '['+index+'].';
            });
        });
    },
    initBoundNode : function(node, deps, func, text, value){
        node[marker.boundAttr] = node[marker.boundAttr] || {};
        // node[marker.boundText] = textContent;
        node[marker.boundProp] = node[marker.boundProp] || {};

        //isAttr
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
}
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
        var listProp;
        listProp = node.getAttribute(marker.list);
        if(typeof listProp === 'string' && (listProp = listPreg.exec(listProp))){
            node.removeAttribute(marker.list);
            listProp.shift();
            bind.list(node, listProp);
            return true;
        }
    },
    /*
        boolean check 是否为if条件节点，并绑定
    */
    'condition' : function(node){
        var ifProp;
        ifProp = node.getAttribute(marker.if);
        if(typeof ifProp === 'string'){
            node.removeAttribute(marker.if);
            bind.condition(node, ifProp);
            return true;
        }
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
            deps.splice(deps.length, 0, expression.parseDeps(exp, context));
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
        Object extraData
    */
    // 'extraData' : function(node){
    //     if(node[marker.extraData]){
    //         return node[marker.extraData];
    //     }
    //     return node.parentNode ? parse.extraData(node.parentNode) : undefined;
    // },
    /*
        String 根据表达式解析text
    */
    'text' : function(text, context, extra){
        var extra, rs, value = get(context);
        return text.replace(new RegExp(expPreg.source, 'mg'), function(t, match){
            return expression(match, value, vm, extra);
        });
    },
    //TODO cache context in node
    //TODO cascade
    /*
        String 获取节点绑定的context scope
    */
    'context' : function(node, self){
        //优化，
        if(node[marker.extraData] && !self[marker.extraData]){
            self[marker.extraData] = node[marker.extraData];
        }
        if(node[marker.bind]){
            return node[marker.bind];
        }
        if(node.getAttribute && node.getAttribute(marker.bind)){
            return node.getAttribute(marker.bind);
        }
        return node.parentNode ? parse.context(node.parentNode, self) : '';
    }
};
//data to dom
var bind = {
    'model' : function(e){
        var type = this.type, name = this.name, tagName = this.tagName.toLowerCase();
        var model = this.getAttribute(marker.model), context = parse.context(this, this);
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
        if(!isNaN(value) && numberPreg.test(value)){
            value = +value;
        }
        set(model, value);
    },
    'condition' : function(node, conditionProp){
        var conditionMark = document.createComment('condition for ' + conditionProp);
        var context = parse.context(node, node);
        deps = parse.deps(conditionProp, context);
        main.addScanFunc(deps, function(v, ov, e){
            //TODO recycle
            if(!node.parentNode && !conditionMark.parentNode){
                return;
            }
            var value = parse.text(conditionProp, context);
            if(value && !node.parentNode){
                conditionMark.parentNode.replaceChild(node, conditionMark);
            }
            else if(!value && !conditionMark.parentNode){
                node.parentNode.replaceChild(conditionMark, node);
            }
        });
    },
    'list' : function(node, propGroup){
        var template = node.outerHTML;
        var context = parse.context(node, node);
        node[marker.bind] = context;

        var writeProp = propGroup[0],
            useProp = propGroup[1];

        var prop = DataBind.parseProp(useProp, context);

        //TODO 备用标注
        var listMarkEnd = document.createComment('list for ' + useProp + ' as ' + writeProp + ' end'),
        // var listMarkEnd = document.createElement('script'),
            listMarkStart = document.createComment('list for ' + useProp + ' as ' + writeProp + 'start'),
            listNodeCollection = [];

        node.parentNode.insertBefore(listMarkStart, node);
        node.parentNode.replaceChild(listMarkEnd, node);

        main.addScanFunc([prop], function(v, ov, e){
            if(!listMarkEnd.parentNode){return;}
            var list = get(prop);
            if(!(Array.isArray(list))){return;}
            var content = listMarkEnd.parentNode;
            //TODO 增强array功能后这里就不用全部删了再加了
            listNodeCollection.forEach(function(element){
                remove(element);
            });
            listNodeCollection.length = 0;
            list.forEach(function(dataElement, index){
                var element = create(subFunc.templateFunc(template, index, writeProp, useProp));
                element[marker.extraData] = {
                    index : index,
                    value : dataElement
                };
                content.insertBefore(element, listMarkEnd);
                listNodeCollection.push(element);
                main.scan(element);
            });
        });
    },
    //node attribute
    'attr' : function(node, attrText, attrName){
        var context = parse.context(node, node), deps = parse.deps(attrText, context), func;
        var extraData = node[marker.extraData];

        switch (attrName){
            case 'checked' : 
                func = node.type === 'checkbox' ? 
                function(value){
                    if(main.checkRecycle(node)){return;}
                    if(value === 'true' || value === 'false'){
                        node.checked = value === 'true' ? true : false;
                        return;
                    }
                    node.checked = (value || '').split(',').indexOf(node.value) >= 0;
                } : 
                function(value){
                    if(main.checkRecycle(node)){return;}
                    if(value === 'true' || value === 'false'){
                        node.checked = value === 'true' ? true : false;
                        return;
                    }
                    node.checked = value === node.value;
                };
                node.removeAttribute('checked');
                break;
            case 'selected' : 
                func = function(value){
                    if(main.checkRecycle(node)){return;}
                    if(value === 'true' || value === 'false'){
                        node.checked = value === 'true' ? true : false;
                        return;
                    }
                    node.selected = value === node.value;
                };
                node.removeAttribute('selected');
                break;
            case 'value' : 
                func = function(value){
                    if(main.checkRecycle(node)){return;}
                    value = parse.text(attrText, context, extraData);
                    node.setAttribute('value', value);
                    node.value = value;
                }
                break;
            case 'data-src' : 
                func = function(){
                    if(main.checkRecycle(node)){return;}
                    node.src = parse.text(attrText, context, extraData);
                }
                break;
            default : 
                func = function(){
                    if(main.checkRecycle(node)){return;}
                    value = parse.text(attrText, context, extraData);
                    if(value === '' || value === 'false' || value === 'null' || value === 'undefined'){
                        node.removeAttribute(attrName);
                    }
                    else{
                        node.setAttribute(attrName, value);
                    }
                }
                break;
        }
        subFunc.initBoundNode(node, deps, func, attrName, attrText);

        main.addScanFunc(deps, func);
    },
    //textNode
    'text' : function(node, textContent){
        var context = parse.context(node, node), deps = parse.deps(textContent, context), func;
        // node[marker.bind] = context;
        var exchangeNode = node;
        // var extraData = parse.extraData(node);
        var extraData = node[marker.extraData];

        func = function(v, ov, e){
            if(main.checkRecycle(node)){return;}
            node.textContent = parse.text(textContent, context, extraData);
        }
        subFunc.initBoundNode(node, deps, func, textContent);

        main.addScanFunc(deps, func);
    }
};
//################################################################################################################
DataBind.scan = main.scan;
DataBind.bindContent = main.bindContent;
//################################################################################################################
window.document.addEventListener('DOMContentLoaded', function(){
    if(!config.initDOM){return;}
    if(typeof config.initDOM === 'string'){
        config.initDOM === 'bind' && main.bindContent(document.body);
        config.initDOM === 'scan' && main.scan(document.documentElement);
    }else{
        main.bindContent(document.body);
        main.scan(document.documentElement);
    }
});


