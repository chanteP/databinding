/*
    标记
*/
var config = require('./config');
var expPreg = new RegExp(config.expHead.replace(/([\[\(\|])/g, '\\$1') + '(.*?)' + config.expFoot.replace(/([\[\(\|])/g, '\\$1'), 'm');
var prefix = config.DOMPrefix;
var marker = {
    'prefix' : prefix

    ,'exp' : expPreg //表达式的正则表达式检测
    ,'expSource' : expPreg.source
    ,'inPreg' : /^\s*([\w\.]+)\s+in\s+([\w\.]+|\[[\w\.\,\"]*\])/

    ,'model' : prefix + 'model'//v to m
    ,'list' : prefix + 'list'//list: tr in table
    ,'bind' : prefix + 'scope'//scope源

    ,'extraData' : prefix + 'extraExpData' //传给expression的额外数据

    ,'if'   : prefix + 'if'//条件判断
    ,'escape' : prefix + 'escape'//scan外

    ,'boundAttr' : prefix + 'boundAttr' //已经绑定的attr&原值
    ,'boundText' : prefix + 'boundText' //已经绑定的text&原值
    ,'boundProp' : prefix + 'boundProp' //已经绑定的props
};

module.exports = marker;