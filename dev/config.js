var $ = require('./kit');
var config = {

    'debug' : 1

    ,'name' : 'DataBind'
    ,'mode' : 0 //0:def prop, 1:get()&set()

    ,'expHead' : '{{'
    ,'expFoot' : '}}'

    ,'rootVar' : 'vm' //备用
    ,'DOMPrefix' : 'vm-'
    ,'propagation' : true
    ,'propagationType' : ['change'] //暂弃
    ,'initDOM' : false //DOM load的扫描, 1:bind 2|true bind+scan

    ,'contextGlobal' : window 

    ,set : function(cfg){
        $.merge(config, cfg, true);
    }
};

if(('_DataBindConfig' in window) || ('_config' in window)){
    config.set(window._DataBindConfig || window._config);
}
module.exports = config;