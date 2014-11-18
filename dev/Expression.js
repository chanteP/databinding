/*
    expression('a.b.c', {a:xxx}, vm)
    整个文件跟{{}}没关系啦
*/
var DataBind = require('./DataBind');
var $ = require('./kit');

var scopeHolder = '$data', selfHolder = '$self';
//################################################################################################################
var log = $.log;
var get = DataBind.get;
var emptyFunc = function(){return '';};
//################################################################################################################
var getValue = function(expression, scope, vm){
    return parser(expression)(scope, vm, scope);
}
//################################################################################################################
var filter = {
};
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
        log('DataBind.expression', 'expression \"' + expression + '\" is not function');
        return emptyFunc;
    }
    if(parserCache[expression]){return parserCache[expression];}
    var funcBody, funcIns;
    funcBody = parseDeps(expression, null, function(match){
        var prop;
        if(match.slice(0, 1) === '.')
            prop = selfHolder + match;
        else if(match.slice(0, 3) === 'vm.')
            prop = match;
        else
            prop = scopeHolder + '.' + match;
        return funcPropCheck(prop);
    });
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
    
*/
var parseDeps = function(expression, matchList, matchCallback){
    if(!matchList && !matchCallback){return;}
    var reg = /(?=\b|\.)(?!\'|\")([\w|\.]+)(?!\'|\")\b/g, expressionBody;
    expressionBody = expression.replace(reg, function(text, match){
        if(isNaN(match)){
            var dep = matchCallback ? matchCallback(match) : match;
            matchList && matchList.push(dep);
            return dep;
        }
        return match;
    });
    return expressionBody;
}

//################################################################################################################
var expression = function(expressionText, scope, vm){
    if(typeof expressionText !== 'string' || !expressionText.trim() || expressionText[0] === '#'){return '';}
    //{{expression | filter}}
    var part = expressionText.split(/\|{1,1}/),
        exp = part.shift(),
        filterArgs = /^\s*([\w]+)\(([\w\s\,]+)\)/.exec(part.join(''));

    var rs = getValue(exp, scope, vm);
    if(filterArgs && (filterArgs[1] in filter)){
        return filter[filterArgs[1]].call(null, [rs].concat(filterArgs[2].split(',')));
    }
    return rs;
}
DataBind.expression = expression;
DataBind.expression.parseDeps = parseDeps;
DataBind.expression.parserCache = parserCache;

module.exports = expression;

