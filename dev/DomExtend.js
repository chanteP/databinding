var DataBind = require('./DataBind');
var listener = require('./Observer');
var expression = require('./Expression');
var config = require('./config');

var $ = require('./kit');

var expPreg = /{{([^}]+)}}/m, listPreg = /([\w\.]+)\sin\s([\w\.]+)/;
var prefix = 'vm-';
var marker = {
	'model' : prefix + 'model',
	'list' : prefix + 'list',
	'bind' : prefix + 'bind'
}
var nodeFuncKey = 'bindObserver';
var checkProp, checkType = 'change';
var vm = DataBind.root;
//################################################################################################################
var evt = $.evt,
    find = $.find,
    findAll = $.findAll,
    contains = $.contains,
    unique = $.unique;
//################################################################################################################
var main = {
    /*
        绑定解析model获取事件的节点
    */
    'bindContent' : function(node){
		var evtBody = node || document.body;
		func.evt(evtBody)
			//radio checkbox etc...
			.on('change', [
					'input['+marker.model+']',
					'select['+marker.model+']'
				].join(','), 
				bind.model)
			//text etc...
			.on('input', [
					'input['+marker.model+']',
					'textarea['+marker.model+']'
				].join(','),
				bind.model);
	},
    /*
        解析节点
    */
	'scan' : function(node){
		checkProp = [];
		main.parseNode(node || document.body);
		while(checkProp.length){
			listener.fire(checkProp.pop(), checkType);
		}
	},
    'parseNode' : function(node){
        //elementNode
        if(node.nodeType === 1){
        	var html = node.outerHTML;
            //节点包含{{}}
            if(!expPreg.test(html)){return;}
            //是list则放弃治疗
            if(check.list(node)){return;}
            //解析attr
            check.attr(node, html);
            //解析children
            [].forEach.call(node.childNodes, main.parseNode);
        }
        //textNode
        else if(node.nodeType === 3){
            //非空而且包含{{}}
            if(!node.textContent.trim().length || !expPreg.test(node.textContent)){return;}
            bind.observe('text', node, node.textContent);
        }
        //其他节点管来干嘛
    }
};
var check = {
    /*
        void check attribute中是否有表达式并绑定
    */
    'attr' : function(node, html){
        [].forEach.call(node.attributes, function(attributeNode){
        	if(expPreg.test(attributeNode.value)){
            	bind.observe('attr', node, attributeNode.value, attributeNode.name);
        	}
        });
    },
    /*
        boolean check 是否为list，并绑定
    */
    'list' : function(node){
        var listProp = node.getAttribute(marker.list);
        if(listProp && listPreg.test(listProp)){
            bind.list(node);
            return true;
        }
    }
}
var parse = {
    /*
        Array 解析表达式中的依赖
    */
    'deps' : function(text, context, expressions){
        var deps = [];
        expressions = expressions || main.parse.exps(text);
        expressions.forEach(function(expression){
            main.expression.parseDeps(expression, deps, function(dep){
                if(dep.slice(0, 2) === 'vm.'){return dep.slice(2, -1)}
                else{return context ? context + '.' + dep : dep;}
            });
        });
        return func.unique(deps);
    },
    /*
        Array 分解出表达式部分
    */
    'exps' : function(text){
        var expressions = [], preg = /{{([^}]*)}}/mg, match;
        while(match = preg.exec(text)){
            expressions.push(match[1]);
        }
        return expressions;
    },
    /*
        String 根据表达式解析text
    */
    'text' : function(text, context){
        return text.replace(/{{([^}]*)}}/mg, function(t, match){
            return DataBind.expression(match, context, vm);
        });
    },
    //TODO cache context in node
    //TODO cascade
    /*
        String 获取节点绑定的context
    */
    'context' : function(node){
        if(node.getAttribute && node.getAttribute(marker.bind)){
            return node.getAttribute(marker.bind);
        }
        return node.parentNode ? main.parse.context(node.parentNode) : '';
    }
};
var bind = {
	'model' : function(e){
		var type = this.type, name = this.name, tagName = this.tagName.toLowerCase();
		var model = this.getAttribute(marker.model), context = main.parse.context(this);
		var value = '', form = this.form || document.body, rs;
		if(name && tagName === 'input'){
			switch (type){
				case 'checkbox' : 
					rs = $.findAll('[name="'+name+'"]:checked', form);
					value = [];
					rs && [].forEach.call(rs, function(el){
						value.push(el.value);
					});
					value = value.join(',');
					break;
				case 'radio' : 
					rs = $.find('[name="'+name+'"]:checked', form);
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
		DataBind.set((context ? context + '.' : '') + model, value);
	},
	'list' : function(node){
		// var html = node.outerHTML;
		// for(var data in list){

		// }
	},
    //model to view
	'observe' : function(type, node, text, extData){
        var context = main.parse.context(node), deps = main.parse.deps(text, context), func;
		func = main.bind[type](node, text, context, extData);
        func.node = node;
        deps.forEach(function(prop){
            DataBind.observe(prop, func, checkType);
        });
        checkProp.splice.apply(checkProp, [-1, 0].concat(deps.pop()));
	},
	'checked' : function(node, text, context, extData){
		var checkValue = extData.checkValue, split = extData.split;
		return function(value){
			if(split){
				var rs = value.split(',');
			}
		}
	},
    'attr' : function(node, text, context, attr){
    	switch (attr){
    		case 'checked' : 
        		var checkValue = node.value;
        		return node.type === 'checkbox' ? 
        		function(value){
        			node.checked = (value || '').split(',').indexOf(checkValue) >= 0;
        		} : 
        		function(value){
        			node.checked = value === checkValue;
        		};
        	case 'value' : 
                return function(){
                    node.value = main.parse.text(text, context);
                }
        	default : 
                return function(){
                    node.setAttribute(attr, main.parse.text(text, context));
                }
    	}
    },
    'text' : function(node, text, context){
        return function(){
            node.textContent = main.parse.text(text, context);
        }
    }
}
//################################################################################################################
DataBind.scan = main.scan;
DataBind.bindContent = main.bindContent;
config.initDOM && window.document && window.document.addEventListener('DOMContentLoaded', function(){
    main.bindContent(document.body);
    main.scan(document.documentElement);
});


