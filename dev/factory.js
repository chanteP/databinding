/*
    抛给外面用的
    obj = core(ns, data, cfg)
        data -> observed + apis
        obj -> apis
*/

var config = require('./config');
var Accessor = require('./accessor');
var listener = require('./listener');
var define = require('./factory.define');

var core = function(nameNS, data){
    return define(nameNS, data);
}
module.exports = core;

core.root = Accessor.root;
core.storage = Accessor.storage;
core.listener = listener.storage;

//TODO 什么鬼
core.get = function(nameNS){
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
core.set = function(nameNS, value, dirty){
    Accessor.check(nameNS) && Accessor.check(nameNS).set(value, dirty);
    return value;
}

core.observe        = listener.add;
core.unobserve      = listener.remove;
core.fire           = listener.fire;

core.destroy        = Accessor.destroy;

