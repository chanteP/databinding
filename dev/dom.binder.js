/*
    observe相关
*/
var walker = require('./dom.walker'),
    parser = require('./dom.parser'),
    marker = require('./dom.marker');
var observe = walker.addBinder,
    scan = walker.scan;
var getText = parser.text;
//################################################################################################################
var checkRecycle = function(node){
    return false;
}
var setBoundNode = function(node, deps, func, text, value){
    // node[marker.boundAttr] = node[marker.boundAttr] || {};
    // node[marker.boundProp] = node[marker.boundProp] || {};

    // if(value){
    //     node[marker.boundAttr][text] = value;
    // }
    // else{
    //     node[marker.boundText] = text;
    // }
    // deps.forEach(function(dep){
    //     node[marker.boundProp][dep] = node[marker.boundProp][dep] || [];
    //     node[marker.boundProp][dep].push(func);
    // });
}
//################################################################################################################
var binder = {
    //node, attribute
    attr : function(node, attrText, attrName){
        var context = parser.context(node, node),
            deps = parse.deps(attrText, context), 
            func;
        var extraData = node[marker.extraData];

        switch (attrName){
            case 'checked' : 
                func = node.type === 'checkbox' ? 
                function(value){
                    if(checkRecycle(node)){return;}
                    //TODO value == bool
                    node.checked = (value || '').split(',').indexOf(node.value) >= 0;
                } : 
                function(value){
                    if(checkRecycle(node)){return;}
                    //TODO value == bool
                    node.checked = value === node.value;
                };
                node.removeAttribute('checked');
                break;
            case 'selected' : 
                func = function(value){
                    if(checkRecycle(node)){return;}
                    //TODO value == bool
                    node.selected = value === node.value;
                };
                node.removeAttribute('selected');
                break;
            case 'value' : 
                func = function(value){
                    if(checkRecycle(node)){return;}
                    // value = getText(attrText, context, extraData);
                    node.setAttribute('value', value);
                    node.value = value;
                }
                break;
            case 'data-src' : 
                func = function(){
                    if(checkRecycle(node)){return;}
                    // node.src = getText(attrText, context, extraData);
                }
                break;
            default : 
                func = function(){
                    if(checkRecycle(node)){return;}
                    // value = getText(attrText, context, extraData);
                    if(value === '' || value === 'false' || value === 'null' || value === 'undefined'){
                        node.removeAttribute(attrName);
                    }
                    else{
                        node.setAttribute(attrName, value);
                    }
                }
                break;
        }
        // subFunc.initBoundNode(node, deps, func, attrName, attrText);

        observe(deps, func);
    },
    list : function(node, propGroup){
        // var template = node.outerHTML;
        // var context = parse.context(node, node);
        // node[marker.bind] = context;

        // var writeProp = propGroup[0],
        //     useProp = propGroup[1];

        // var prop = DataBind.parseProp(useProp, context);

        // //TODO 备用标注
        // var listMarkEnd = document.createComment('list for ' + useProp + ' as ' + writeProp + ' end'),
        // // var listMarkEnd = document.createElement('script'),
        //     listMarkStart = document.createComment('list for ' + useProp + ' as ' + writeProp + 'start'),
        //     listNodeCollection = [];

        // node.parentNode.insertBefore(listMarkStart, node);
        // node.parentNode.replaceChild(listMarkEnd, node);

        // observe([prop], function(v, ov, e){
        //     if(!listMarkEnd.parentNode){return;}
        //     var list = get(prop);
        //     if(!(Array.isArray(list))){return;}
        //     var content = listMarkEnd.parentNode;
        //     //TODO 增强array功能后这里就不用全部删了再加了
        //     listNodeCollection.forEach(function(element){
        //         remove(element);
        //     });
        //     listNodeCollection.length = 0;
        //     list.forEach(function(dataElement, index){
        //         var element = create(subFunc.templateFunc(template, index, writeProp, useProp));
        //         element[marker.extraData] = {
        //             index : index,
        //             value : dataElement
        //         };
        //         content.insertBefore(element, listMarkEnd);
        //         listNodeCollection.push(element);
        //         main.scan(element);
        //     });
        // });
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
