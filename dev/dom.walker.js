/*
    dom遍历
*/
var parseOnlyWhileScan = false;
var checkProp;
var scanQueue = [];

var config = require('./config');

var base = require('base'),
    get = base.get,
    observe = base.observe;

var engine = function(node, parseOnly){
    if(parseOnly){
        parseOnlyWhileScan = parseOnly;
    }
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
        // if(config.checkNode && node !== originNode && config.checkNode(node, originNode)){return;}
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
        [].forEach.call(node.childNodes, walker);
    }
    //textNode
    else if(node.nodeType === 3){
        //非空而且包含{{}}
        if(!node.textContent.trim().length || !expPreg.test(node.textContent)){return;}
        bind.text(node, node.textContent);
    }
    //其他节点管来干嘛
},

module.exports = engine;
