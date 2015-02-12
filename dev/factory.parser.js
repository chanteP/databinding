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
                desc[d] = obj[config.descMark + d];
                if(delete obj[config.descMark + d]){
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
    register : function(nameNS, curNS, obj, cfg){
        var desc = func.getDesc(obj), 
            base,
            data = desc.value, 
            curCfg = curNS.indexOf(nameNS) === 0 ? cfg : {};
        base = Accessor.check(curNS) || new Accessor(curNS, data, curCfg);
        if(isSimpleObject(data)){
            for(var key in data){
                if(!data.hasOwnProperty(key)){continue;}
                func.register(nameNS, base.parseProp(key), data[key], cfg);
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

