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

    var data, root = {};
    root[rootVar] = rootScope;
    data = merge(
        scope,
        root,
        extraData
    );
    return engine.render(expressionText, data);
}
expression.register = engine.register;
expression.parseDeps = parseDeps;
//################################################################################################################
module.exports = expression;

