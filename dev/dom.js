/*
    dom绑定用外挂包
*/

module.exports = {
    scan : require('./dom.walker').init().scan,
    bindContent : function(node){}
}

