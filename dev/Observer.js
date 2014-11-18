var Accessor = require('Accessor');
var listener = {
    'topic' : {},
    'check' : function(nameNS, type, build){
        var list;
        list = listener.topic[nameNS];
        if(!build && (!list || !list[type])){
            return false;
        }
        if(!list){
            list = listener.topic[nameNS] = {};
        }
        if(!list[type]){
            list[type] = [];
        }
        return list[type];
    },
    'fire' : function(nameNS, type, extArgs){
        var evtList = listener.check(nameNS, type);
        var acc = Accessor(nameNS);
        if(!evtList || !acc){return this;}
        args = [acc.value, acc.oldValue, {
            type:type, 
            object:acc.parent,
            name:acc.name, 
            nameNS:acc.nameNS
        }];
        args[2] = merge(args[2], extArgs, {
            propNS : nameNS,
            prop : acc.name
        });
        evtList.forEach(function(func){
            if(typeof func === 'function'){
                func.apply(acc.parent, args);
            }
            else if(typeof func === 'string' && Accessor(func)){
                var depAcc = Accessor(func);
                depAcc.oldValue = depAcc.value;
                depAcc.value = depAcc.get();
                listener.fire(func, type, args[2]);
            }
        });
        if(acc.parentNS !== null && acc.propagation && acc.propagationType.indexOf(type) >= 0){
            listener.fire(acc.parentNS, type, args[2]);
        }
        return this;
    },
    'add' : function(nameNS, func, evt){
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