/*
    observe相关
*/
var walker, parser, marker;
var observe, scan;

var binder = {
    attr : function(){

    },
    list : function(){

    },
    text : function(node, text){
        var context = parser.context(node, node),
            deps = parser.deps(text, context);

        observe(deps, function(value){
            
        });
    }
}

module.exports = binder;
walker = require('./dom.walker');
parser = require('./dom.parser');
marker = require('./dom.marker');
observe = walker.addBinder;
scan = walker.scan;
