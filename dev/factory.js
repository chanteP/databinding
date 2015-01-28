/*
    
*/

var config = require('./config');
var Accessor = require('./accessor');
var listener = require('./listener');
var define = require('./factory.define');

var lib = function(nameNS, data){
    return define(nameNS, data);
}
module.exports = lib;

lib.root = Accessor.root;
lib.storage = Accessor.storage;
lib.listener = listener.storage;
lib.config = config.set;
lib._config = config;

lib.get = function(nameNS){
    var index, value;
    if(index = /(.*)\[(\d+)\]$/.exec(nameNS)){
        nameNS = index[1];
        index = index[2];
    }
    value = Accessor.check(nameNS) ? Accessor.check(nameNS).get() : undefined;
    if(index !== null && Array.isArray(value)){
        return value[index];
    }
    return value;
}
lib.set = function(nameNS, value, dirty){
    Accessor.check(nameNS) && Accessor.check(nameNS).set(value, dirty);
    return value;
}

lib.observe        = listener.add;
lib.unobserve      = listener.remove;
lib.fire           = listener.fire;

lib.destroy        = Accessor.destroy;

