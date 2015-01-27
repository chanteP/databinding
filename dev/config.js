var $ = require('./kit');
var config = {

    'debug' : 1

    ,'name' : 'note'
    ,'mode' : 0 //0:def prop, 1:get()&set()

    ,'descMark' : '$'
    ,'expHead' : '{{'
    ,'expFoot' : '}}'

    ,'rootVar' : 'vm' //备用
    ,'DOMPrefix' : 'nt-'
    ,'checkNode' : null //爬dom树中断判断

    ,'propagation' : true
    ,'propagationType' : ['change'] //暂弃
    ,'initDOM' : true //DOMContentLoaded执行状况 true:既绑定model代理又scan document root节点, 'bind':只绑定model代理, 'scan':只scan root节点, false:啥都不干 

    ,'contextGlobal' : window 

    ,set : function(cfg){
        $.merge(config, cfg, true);
    }
};

if('_config' in window){
    config.set(window._config);
}
module.exports = config;