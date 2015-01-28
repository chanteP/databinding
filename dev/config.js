/*
    配置
        优先级：config() > _config > scriptQuery
*/
var $ = require('./kit');
var config = {

    'debug' : 1

    ,'name' : 'note'
    ,'mode' : 0 //0:def prop, 1:get()&set()

    ,'descMark' : '$'
    ,'expHead' : '{{'
    ,'expFoot' : '}}'
    ,'rootVar' : 'vm' //备用
    ,'extraVar' : '$' //备用

    ,'DOMPrefix' : 'nt-'
    ,'DOMCheck' : null //爬dom树中断判断

    ,'templateRender' : null //模版引擎, te(expression, data)
    ,'templateHelper' : null //模版helper注册

    ,'propagation' : true
    ,'propagationType' : ['change'] //暂弃
    ,'initDOM' : true //DOMContentLoaded执行状况 true:既绑定model代理又scan document root节点, 'bind':只绑定model代理, 'scan':只scan root节点, false:啥都不干 

    ,'contextGlobal' : window 

    ,set : function(cfg){
        $.merge(config, cfg, true);
    }
};
var currentScript = document.currentScript || document.scripts[document.scripts.length - 1];
if(currentScript){
    config.set($.parseQuery(currentScript.src.split('?')[1]));
}

if('_config' in window){
    config.set(window._config);
}
module.exports = config;