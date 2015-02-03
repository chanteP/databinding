/*
    事件相关
*/
//################################################################### 
var $ = require('./kit');
var merge = $.merge,
    unique = $.unique;

var storage = {};

var fireList = [];
var collectFireProps = function(nameNS, type){
    var acc = Accessor.check(nameNS);
    if(!acc){return;}
    fireList.push(nameNS);
    (listener.check(nameNS, type) || []).forEach(function(dep){
        //依赖
        if(typeof dep === 'string'){
            var depAcc = Accessor.check(dep);
            depAcc.oldValue = depAcc.value;
            depAcc.value = depAcc.get();
            //TODO depAcc.set(depAcc.get());
            collectFireProps(dep);
        }
    });
    if(acc.parentNS !== null && acc.propagation){
        collectFireProps(acc.parentNS);
    }
}
//################################################################### 
var listener = {
    'storage' : storage,
    'check' : function(nameNS, type, build){
        var list = storage[nameNS];
        if(list && list[type]){
            return list[type];
        }
        if(!build){
            return false;
        }
        if(!list){
            list = storage[nameNS] = {};
        }
        if(!list[type]){
            list[type] = [];
        }
        return list[type];
    },
    'fire' : function(nameNS, type, extArgs){
        type = type || 'change';
        var fireBody = Accessor.check(nameNS);
        if(!fireBody){return;}

        fireList.length = 0;

        collectFireProps(nameNS, type);
        fireList = unique(fireList);

        var evtList, acc, args;
        fireList.forEach(function(ns){
            evtList = listener.check(ns, type);
            if(!evtList){return;}
            acc = Accessor.check(ns);
            args = [acc.value, acc.oldValue, {
                type:type, 
                object:fireBody.parent,
                name:fireBody.name, 
                nameNS:fireBody.nameNS,
                prop:acc.name,
                propNS:acc.nameNS
            }];
            args[2] = merge(args[2], extArgs);
            for(var i = evtList.length - 1; i >= 0; i--){
                if(typeof evtList[i] !== 'function'){return;}
                evtList[i].apply(acc.context, args);
            }
        });
        fireList.length = 0;
        return this;
    },
    //TODO capture
    'add' : function(nameNS, func, evt, capture){
        evt = evt || 'change';
        var evtList = listener.check(nameNS, evt, true);
        if(evtList.indexOf(func) < 0){
            evtList.push(func);
        }
        return func;
    },
    'remove' : function(nameNS, func, evt){
        evt = evt || 'change';
        var evtList = listener.check(nameNS, evt), index;
        if(!evtList) return this;
        index = evtList.indexOf(func);
        if(index >= 0){
            evtList.splice(index, 1);
        }
        return this;
    }
}
module.exports = listener;
var Accessor = require('./accessor');
