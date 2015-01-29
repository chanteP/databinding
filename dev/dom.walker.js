/*
    dom遍历
*/
var parseOnlyWhileScan = false;
var checkProp;
var scanQueue = [];

var config = require('./config');
var marker, observer;
var expPreg;

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
        engine(scanQueue.shift());
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
        if(typeof listProp === 'string' && (listProp = marker.inPreg.exec(listProp))){
            node.removeAttribute(marker.list);
            listProp.shift();
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
