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
var aiID = (new Date()).getTime();
//################################################################################################################
var parseProp = require('./kit').parseProp;
var register = parser.register,
    build = parser.build;

var getAIID = function(){
    return '$TmpData_' + aiID++;
}
//################################################################################################################
var core = module.exports = function(nameNS, obj, cfg){
    //还是加个new包装吧
    if(!(this instanceof core)){
        return new core(nameNS, obj, cfg);
    }
    //第一个参数是否namescpace
    if(nameNS === null){
        nameNS = getAIID();
    }
    if(typeof nameNS !== 'string'){
        cfg = obj;
        obj = nameNS;
        nameNS = '';
    }
    var base = build(nameNS, obj);
    register(nameNS, '', base, base, cfg);

    this.name = nameNS;
    this.value = Accessor.check(nameNS).value;
}

//define后抛出的api
var apiList = ['get', 'set', 'observe', 'unobserve', 'fire'];
apiList.forEach(function(method){
    core.prototype[method] = function(){
        arguments[0] = parseProp(this.name, arguments[0]);
        return require('./factory')[method].apply(this, arguments);
    };
});