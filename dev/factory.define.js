/*
    core(object[, config]);
    core(namespace, object[, config]);
*/
var $ = require('./kit');
var config = require('./config');
var Accessor = require('./accessor');
var listener = require('./listener');
var parser = require('./factory.parser');

var extendAPI = {};
//################################################################################################################
var parseProp = require('./kit').parseProp;
var register = parser.register,
    build = parser.build;
//################################################################################################################
var databind = function(nameNS, obj){
    //第一个参数是否namescpace
    if(typeof nameNS !== 'string'){
        obj = nameNS;
        nameNS = '';
    }
    var base = build(nameNS, obj);
    register('', base);
    this.name = this._name = nameNS;

    //TODO 强制mode0输出...
    var acc = Accessor.check(nameNS),
        exports = acc.value;
    if($.isSimpleObject(exports)){
        exports = {};
    }
    exports.__proto__ = Object.create(extendAPI, {'_name':{'value' : nameNS}});
    return exports;
}

module.exports = databind;
//define后抛出的api
var apiList = ['get', 'set', 'observe', 'unobserve', 'fire'];

apiList.forEach(function(method){
    Object.defineProperty(extendAPI, method, {
        enumerable : false,
        writable : true,
        value : (function(method){
            return function(){
                arguments[0] = parseProp(this._name, arguments[0]);
                require('./factory')[method].apply(this, arguments);
            };
        })(method)
    });
});