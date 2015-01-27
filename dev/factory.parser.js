/*
    构造器的辅助方法
*/
var $ = require('./kit');
var config = require('./config');
var Accessor = require('./accessor');

//################################################################################################################
var isEmptyObject = $.isEmptyObject,
    isSimpleObject = $.isSimpleObject,
    parseProp = $.parseProp;
//################################################################################################################
var descList = ['get', 'set', 'change', 'propagation', 'dirty', 'value'];
var func = {
    //过滤obj中的参数项
    getDesc : function(obj){
        var desc = {}, check;
        if(!isSimpleObject(obj)){
            desc.value = obj;
        }
        else{
            descList.forEach(function(d){
                desc[d] = obj['$' + d];
                if(delete obj['$' + d]){
                    check = true;
                }
            });
            if(desc['value'] === undefined){
                desc['value'] = check && isEmptyObject(obj) ? undefined : obj;
            }
        }
        return desc;
    },
    //nameNS注册到acc
    register : function(baseNS, obj){
        var desc = func.getDesc(obj), 
            base,
            data = desc.value;
        base = Accessor.check(baseNS) || new Accessor(baseNS, data);
        if(isSimpleObject(data)){
            for(var key in data){
                if(!data.hasOwnProperty(key)){continue;}
                func.register(base.parseProp(key), data[key]);
            }
        }
        base.setProp(desc);
        //TODO 强制mode0
        base.bindProp();
    },
    //build root
    build : function(nameNS, obj){
        var ns = nameNS.split('.'), 
            baseObj, 
            cur = obj;
        if(nameNS === ''){
            ns.length = 0;
            baseObj = obj;
        }
        while(ns.length){
            baseObj = {};
            baseObj[ns.pop()] = cur;
            cur = baseObj;
        }
        return baseObj;
    }
}
module.exports = func;

