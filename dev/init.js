/*!
    Σヾ(ﾟДﾟ)ﾉ
*/
//基础watch
var base = require('./base');

//expression表达式解析extend
base.expression = require('./expression');

//dom双向绑定extend
var dom = require('./dom');
base.scan = dom.scan;
base.bindContent = dom.bindContent;

