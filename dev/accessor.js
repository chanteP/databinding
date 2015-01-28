/*
    存在collection里的每一个单元
    存了都会进行单向绑定
    DataBind.storage一览
*/
/*
    Accessor
        .check 获取一个acc
        nameNS[, value] 生成、赋值
*/
var $ = require('./kit');
var config;
var listener;

var root = {};
var storage = {};
//################################################################################################
var parseProp = $.parseProp,
    ArrayExtend = $.ArrayExtend;
//TODO 完善。获取function中的依赖
var parseDeps = function(base, func){
    if(typeof func !== 'function'){return;}
    var code = func.toString()
        .replace(/^\s*\/\*[\s\S]*?\*\/\s*$/mg, '')
        .replace(/^\s*\/\/.*$/mg, '')
        .replace(/(this|vm)\.[\w\.]+(\(|\s*\=)/mg, '')
        .replace(/\bthis\b/g, 'vm.' + base.parentNS);

    var contextReg = /\bvm\.([\w|\.]+)\b/g;
    var deps = [], match;
    while ((match = contextReg.exec(code))) {
        if (match[1]) {
            deps.push(match[1]);
        }
    }
    base.deps = deps;
    deps.forEach(function(dep){
        listener.add(dep, base.nameNS, 'change');
    });
};
//################################################################################################
/*
    arguments.length === 1 : 返回acc
    check ? 
        nameNS, value : 赋值
        new
*/

var Accessor = function(nameNS, value){
    if(arguments.length === 1){
        return Accessor.check(nameNS);
    }
    if(Accessor.check(nameNS)){
        storage[nameNS].value = value;
        return storage[nameNS];
    }
    if(!(this instanceof Accessor)){
        return new Accessor(nameNS, value);
    }
    var props = nameNS.split('.'), 
        name = props.pop(),
        isTop = nameNS === '',
        parentNS = isTop ? null : props.join('.'),
        parentAcc = isTop ? null : Accessor.check(parentNS),
        parent = isTop ? null : parentAcc.value;

    this.name       = name;
    this.nameNS     = nameNS;
    this.parent     = parent;
    this.parentNS   = parentNS;
    this.parentAcc  = parentAcc;

    this.deps       = [];
    this.value      = value;
    this.oldValue   = value;
    this.dirty      = false;

    // this.list    = {};
    this.mode       = 0 && config.mode; //TODO强制开启

    this.context    = this.mode ? this : this.parent;

    this.children   = [];
    this.propagation = true || config.propagation; //TODO强制开启

    if(!isTop){
        parentAcc.children.push(this.nameNS);
        this.parent[this.name] = this.value;
    }
    storage[this.nameNS] = this;
}

Accessor.root = root;
Accessor.storage = storage;
Accessor.check = function(nameNS){
    if(!storage.hasOwnProperty(nameNS)){return undefined;}
    return storage[nameNS];
};

Accessor.parseProp = parseProp;
Accessor.prototype.get = function(){
    return this.value;
}
Accessor.prototype.set = function(value, dirty, force){
    var self = this;

    //TODO mode才绑定，等实现set数组元素再说...
    if(Array.isArray(value)){
        if(value !== this.value){
            this.arrayChangeLock = false;
        }
        if(!this.arrayChangeLock){
            if('observe' in Object){
                Object.observe(value, function(changes){
                    self.set(value, self.dirty, true);
                });
            }
            else{
                value.__proto__ = ArrayExtend;
                value[ArrayExtend.bindMethodName] = function(methodName){
                    self.set(value, self.dirty, true, {
                        method : methodName
                    });
                }
            }
        }
        this.arrayChangeLock = true;
    }


    this.value = value;
    this.value = this.get();

    if(this.parent && config.mode){
        this.parent[this.name] = value;
    }
    //children
    dirty = this.dirty || dirty;
    if(!dirty){
        listener.fire(this.nameNS, 'set');
        (force || value !== this.oldValue) && listener.fire(this.nameNS, 'change');
    }
    this.oldValue = value;
    this.dirty = false;

    if($.isSimpleObject(value)){
        for(var key in value){
            if(!value.hasOwnProperty(key)){continue;}
            childAcc = Accessor.check(this.parseProp(key));
            childAcc && childAcc.bindProp();
        }
    }
    return value;
}
//mode=0 defineproperty绑定对象属性用
//TODO destroy释放
Accessor.prototype.bindProp = function(){
    if(this.mode || !$.isSimpleObject(this.parent)){return;}
    var self = this;
    Object.defineProperty(this.parent, this.name, {
        set : function(value){
            return self.set(value);
        },
        get : function(){
            return self.get();
        }
    });
    this.parent[this.name] = this.value;
}
//生成propNS
Accessor.prototype.parseProp = function(prop){
    return parseProp(this.nameNS, prop);
}
//设置
Accessor.prototype.setProp = function(desc){
    if(desc.set){
        this.set = function(value, dirty, force){
            value = desc.set.call(this.context, value, this.value, force);
            this.__proto__.set.call(this, value, dirty, force);
            return value;
        }
    }
    if(desc.get){
        parseDeps(this, desc.get);
        this.get = function(){
            return desc.get.call(this.parent, root);
        }
    }
    if(desc.change){
        listener.add(this.nameNS, desc.change, 'change');
    }
    return this;
}
Accessor.destroy = Accessor.prototype.destroy = function(nameNS){
    var acc = this instanceof Accessor ? this : Accessor.check(nameNS);
    if(acc){
        acc.children.forEach(Accessor.destroy);
        delete Accessor.storage[acc.nameNS];
    }
}
new Accessor('', root);
//################################################################################################
module.exports = Accessor;
config = require('./config');
listener = require('./listener');
