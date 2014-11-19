var DataBind = require('./DataBind');
var listener = require('./Observer');
var expression = require('./Expression');
var config = require('./config');

var $ = require('./kit');

var expPreg = /{{([^}]+)}}/m;
var prefix = 'vm-';
var marker = {
	'model' : prefix + 'model',
	'list' : prefix + 'list',
	'bind' : prefix + 'bind'
}
var nodeFuncKey = 'bindObserver';
var checkProp, checkType = 'change';

var vm = DataBind.root,
    set = DataBind.set,
    get = DataBind.get;

var observe = listener.add,
    fire = listener.fire;
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
		evt(evtBody)
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
			fire(checkProp.pop(), checkType);
		}
	},
    'parseNode' : function(node, scope){
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
            bind.text(node, node.textContent);
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
            	bind.attr(node, attributeNode.value, attributeNode.name);
        	}
        });
    },
    /*
        boolean check 是否为list，并绑定
    */
    'list' : function(node){
        var listProp = node.getAttribute(marker.list);
        if(listProp !== null){
            bind.list(node, listProp);
            return true;
        }
    }
}
var parse = {
    /*
        Array 解析表达式中的依赖
    */
    'deps' : function(text, context){
        var deps = [];
        expressions = parse.exps(text);
        expressions.forEach(function(exp){
            expression.parseDeps(exp, deps, function(dep){
                if(dep.slice(0, 3) === 'vm.'){return dep.slice(2, -1)}
                if(dep.slice(0, 1) === '.'){return context;}
                return context ? context + '.' + dep : dep;
            });
        });
        return unique(deps);
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
            return expression(match, get(context), vm);
        });
    },
    //TODO cache context in node
    //TODO cascade
    /*
        String 获取节点绑定的context scope
    */
    'context' : function(node){
        if(node.getAttribute && node.getAttribute(marker.bind)){
            return node.getAttribute(marker.bind);
        }
        return node.parentNode ? parse.context(node.parentNode) : '';
    }
};
var bind = {
	'model' : function(e){
		var type = this.type, name = this.name, tagName = this.tagName.toLowerCase();
		var model = this.getAttribute(marker.model), context = parse.context(this);
		var value = '', form = this.form || document.body, rs;
		if(name && tagName === 'input'){
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
		set((context ? context + '.' : '') + model, value);
	},
	'list' : function(node, prop){
		var template = node.outerHTML;
        var listMark = document.createComment('list for ' + prop),
            listNodeCollection = [];
        node.parentNode.replaceChild(node, listMark);
        observe(prop, function(){
            if(!listMark.parentNode){return;}
            var list = get(prop);
            if(!(list instanceof Array)){return;}
            list.forEach(function(el){

            });
        });
		// for(var data in list){

		// }
	},
    //node attribute
    'attr' : function(node, attrText, attrName){
        var context = parse.context(node), deps = parse.deps(attrText, context), func;
    	switch (attrName){
    		case 'checked' : 
        		var checkValue = node.value;
        		func = node.type === 'checkbox' ? 
        		function(value){
            //TODO if(!node.parentNode){}
        			node.checked = (value || '').split(',').indexOf(checkValue) >= 0;
        		} : 
        		function(value){
            //TODO if(!node.parentNode){}
        			node.checked = value === checkValue;
        		};
        	case 'value' : 
                func = function(){
            //TODO if(!node.parentNode){}
                    node.value = parse.text(attrText, context);
                }
        	default : 
                func = function(){
            //TODO if(!node.parentNode){}
                    node.setAttribute(attrName, parse.text(attrText, context));
                }
    	}
        deps.forEach(function(prop){
            observe(prop, func, checkType);
            checkProp.push(prop);
        });
    },
    //textNode
    'text' : function(node, textContent){
        var context = parse.context(node), deps = parse.deps(textContent, context), func;
        func = function(){
            //TODO if(!node.parentNode){}
            node.textContent = parse.text(textContent, context);
        }
        deps.forEach(function(prop){
            observe(prop, func, checkType);
            checkProp.push(prop);
        });
        // checkProp.splice.apply(checkProp, [-1, 0].concat(deps.pop()));
    }
}
//################################################################################################################
DataBind.scan = main.scan;
DataBind.bindContent = main.bindContent;
config.initDOM && window.document && window.document.addEventListener('DOMContentLoaded', function(){
    main.bindContent(document.body);
    main.scan(document.documentElement);
});


