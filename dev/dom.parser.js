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

var expPreg = new RegExp(config.expHead.replace(/([\[\(\|])/g, '\\$1') + '(.*?)' + 
                config.expFoot.replace(/([\[\(\|])/g, '\\$1'), 'm'),
    expSource = expPreg.source;
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
