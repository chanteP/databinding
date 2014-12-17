/*
    表达式解析外挂包
    expression('a.b.c', {a:xxx}, vm)
    整个文件跟{{}}没关系啦
*/
var DataBind = require('./DataBind');
var $ = require('./kit');
var config = require('./config');
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
        log('DataBind.expression', 'expression \"' + expression + '\" is not a function');
        return emptyFunc;
    }
    if(parserCache[expression]){return parserCache[expression];}
    var funcBody, funcIns;
    funcBody = buildFunctionBody(expression);
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
    解析expression内用到的字段（不计array）
*/
var parseDeps = function(expressionText, context){
    var expression = getExpressionPart(expressionText).expression;
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
/*
    构造解析函数
*/
var buildFunctionBody = function(expression){
    var reg = /(?=\b|\.)(?!\'|\")([\w\.\[\]]+)(?!\'|\")\b/g, expressionBody;
    var match, col = [], temp;
    //TODO 应该是把所有变量抓出来然后判空..感觉会好一点
    return '(' + expression.replace(reg, function(match, data){
        var prop;
        if(data.slice(0, 1) === '.')
            prop = selfHolder + data;
        else if(data.slice(0, 3) === 'vm.')
            prop = data;
        else
            prop = scopeHolder + '.' + data;
        return prop;
    }) + ');';
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
    if(rs === undefined){
        rs = '';
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

