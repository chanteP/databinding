/*
    表达式解析外挂包
    expression('a.b.c', {a:xxx}, vm)
    整个文件跟{{}}没关系啦
*/
var DataBind = require('./DataBind');
var $ = require('./kit');
var config = require('./config');

var artTemplate = window.template = require('art-template');
var filters = require('./Filter');
var merge = $.merge;

//################################################################################################################
var log = $.log;
var get = DataBind.get;
var emptyFunc = function(){return '';};
//################################################################################################################
var parseDeps = function(expressionText, context){
    var expression = getExpressionPart(expressionText);
    var reg = /(?=\b|\.|\[)(?!\'|\")([\w\.\[\]]+)(?!\'|\")\b/g, expressionBody;
    var match, col = [], temp;
    //TODO 应该是把所有变量抓出来然后判空..感觉会好一点
    while(match = reg.exec(expression)){
        if(match[1].indexOf('[') === 0){continue;}
        temp = match[1].indexOf('[') ? match[1].split('[')[0] : match[1];
        if(temp.slice(0, 3) === 'vm.'){}
        else if(temp.slice(0, 1) === '.'){continue;}
        else{temp = (context ? context + '.' : '') + temp;}
        col.push(temp);
    }
    return col;
}
var getExpressionPart = function(expressionText){
    //TODO cache
    return expressionText.split(/\|{1,1}/)[0].trim();
}
for(var helperName in filters){
    if(!filters.hasOwnProperty(helperName)){continue;}
    artTemplate.helper(helperName, filters[helperName]);
}
//################################################################################################################
var expression = function(expressionText, scope, vm, extra){
    if(expressionText === undefined){return '';}
    expressionText = '{{' + expressionText + '}}';
    return artTemplate.render(expressionText)(merge(
        scope,
        {vm:vm},
        extra
    ));
}
//################################################################################################################
DataBind.expression = expression;
DataBind.expression.parseDeps = parseDeps;
DataBind.expression.register = artTemplate.helper;

//################################################################################################################
module.exports = expression;

