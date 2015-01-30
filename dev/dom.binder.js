/*
    view->model
*/
var $ = require('./kit');
var find = $.find,
    findAll = $.findAll;
var base = require('./base'),
    set = base.set,
    get = base.get;
var marker = require('./dom.marker'),
    parser = require('./dom.parser');

var numberPreg = /^[\d\.]+$/;

var checkAccessor = function(model){
    if(!(model in base.storage)){
        base(model, get(model));
    }
}

var checkModel = function(node){
    var allModelNode = $.findAll('['+marker.model+']', node);
    [].forEach.call(allModelNode, function(el){
        var model = el.getAttribute(marker.model);
        checkAccessor(model);
    });
}

var bindModel = function(e){
    var type = this.type, name = this.name, tagName = this.tagName;
    var model = this.getAttribute(marker.model), context = parser.context(this, this);
    var value = '', form = this.form || document.body, rs;
    //TODO 强制绑定感觉不太好...对比下性能？
    this[marker.bind] = context;

    model = $.parseProp(context, model);
    checkAccessor(model);

    if(name && tagName === 'INPUT'){
        switch (type){
            case 'checkbox' : 
                rs = findAll('[name="'+name+'"]:checked', form);
                value = [];
                rs && [].forEach.call(rs, function(el){
                    value.push(el.value);
                });
                value = value.join(',');
                break;
            case 'radio' : 
                rs = find('[name="'+name+'"]:checked', form);
                value = rs ? rs.value : '';
                break;
            default : 
                value = this.value;
                break;
        }
    }
    else{
        value = this.value;
    }
    if(!isNaN(value) && numberPreg.test(value)){
        value = +value;
    }
    set(model, value);
}

module.exports = {
    bind : function(node){
        if(!node){return this;}
        checkModel(node);
        $.evt(node)
            //TODO 绑定太简陋?
            //radio checkbox etc...
            .on('change', [
                    'input['+marker.model+']',
                    'select['+marker.model+']'
                ].join(','), 
                bindModel)
            //text etc...
            .on('input', [
                    'input['+marker.model+']',
                    'textarea['+marker.model+']'
                ].join(','),
                bindModel);
        return this;
    },
    unbind : function(){

    }
}