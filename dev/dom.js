/*
    dom绑定用外挂包
*/

var config = require('./config');

var api = {
    scan : require('./dom.walker').init().scan,
    bindContent : require('./dom.binder').bind
}

window.document.addEventListener('DOMContentLoaded', function(){
    if(!config.initDOM){return;}
    if(typeof config.initDOM === 'string'){
        config.initDOM === 'bind' && api.bindContent(document.body);
        config.initDOM === 'scan' && api.scan(document.documentElement);
    }
    else if(config.initDOM === true){
        api.bindContent(document.body);
        api.scan(document.documentElement);
    }
});

module.exports = api;
