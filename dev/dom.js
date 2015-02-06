/*
    dom绑定用外挂包
*/

var config = require('./config');

var api = {
    scan : require('./dom.walker').init().scan,
    bindContent : require('./dom.binder').bind
}

//TODO readystate检测
window.document.addEventListener('DOMContentLoaded', function(){
    var initCfg = config.DOMInit;
    if(!initCfg){return;}
    if(typeof initCfg === 'string'){
        initCfg === 'bind' && api.bindContent(document.body);
        initCfg === 'scan' && api.scan(document.documentElement);
    }
    else if(initCfg === true){
        api.bindContent(document.body);
        api.scan(document.documentElement);
    }
});

module.exports = api;
