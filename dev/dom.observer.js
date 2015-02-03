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
