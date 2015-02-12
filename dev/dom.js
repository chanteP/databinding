/*
    dom绑定用外挂包
*/

var config = require('./config');

var api = {
    scan : require('./dom.walker').init().scan,
    bindContent : require('./dom.binder').bind
}

var bindFunc = function(){
    config.DOMBindInit && api.bindContent(document.body);
    config.DOMScanInit && api.scan(document.documentElement);
    if(config.DOMScanInit === 'auto'){
        //TODO mutation
    }
};
if(document.readyState === 'complete'){
    bindFunc();
}
else{
    window.document.addEventListener('DOMContentLoaded', bindFunc);
}

module.exports = api;
