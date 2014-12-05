var $ = require('./kit');
var config = {

    'debug' : 1

    ,'name' : 'DataBind'
    ,'mode' : 0

    ,'DOMPrefix' : 'vm-'
    ,'propagation' : true
    ,'propagationType' : ['change']
    ,'initDOM' : false //DOM load的扫描, 1:bind 2|true bind+scan

    ,set : function(cfg){
        $.merge(config, cfg, true);
    }
};

if('_DataBindConfig' in window){
    config.set(window._DataBindConfig);
}
module.exports = config;