var DataBind = require('./DataBind');
var expression = require('./Expression');

;(function(window, DataBind, $){
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
    var func = {
        'evt' : $.evt,
        'find' : $.find, 
        'findAll' : $.findAll,
        'contains' : $.contains,
        'unique' : $.unique,
        'isList' : function(node){
        	var listProp = node.getAttribute(marker.list);
            if(listProp && listPreg.test(listProp)){return true;}
        }
    }
    var main = {
        'expression' : DataBind.expression,
        'bindDocument' : function(node){
			var evtBody = node || document.body, allModel;
			func.evt(evtBody)
				//radio checkbox etc...
				.on('change', [
						'input['+marker.model+']',
						'select['+marker.model+']'
					].join(','), 
					main.bind.model)
				//text etc...
				.on('input', [
						'input['+marker.model+']',
						'textarea['+marker.model+']'
					].join(','),
					main.bind.model);
			main.scan(document.documentElement);
		},
		'scan' : function(node){
			checkProp = [];
			main.parseNode(node || document.body);
			while(checkProp.length){
				DataBind.fire(checkProp.pop(), checkType);
			}
		},
        'parseNode' : function(node){
            if(node.nodeType === 1){
            	var html = node.outerHTML;
                if(!expPreg.test(html)){return;}
                if(func.isList(node)){
                	main.bind.list(node);
                	return;
                }
                //tag scan
                main.checkAttr(node, html);
                //model
                [].forEach.call(node.childNodes, function(el){
                    main.parseNode(el);
                });
            }
            else if(node.nodeType === 3){
                if(!node.nodeValue.trim().length || !expPreg.test(node.nodeValue)){return;}
                main.bind.observe('text', node, node.nodeValue);
            }
        },
        'checkAttr' : function(node, html){
            [].forEach.call(node.attributes, function(attributeNode){
            	if(expPreg.test(attributeNode.value)){
                	main.bind.observe('attr', node, attributeNode.value, attributeNode.name);
            	}
            });
        },
        //node parser
        'parse' : {
        	//TODO unique
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
            'exps' : function(text){
                var expressions = [], preg = /{{([^}]*)}}/mg, match;
                while(match = preg.exec(text)){
                    expressions.push(match[1]);
                }
                return expressions;
            },
            'text' : function(text, context){
                return text.replace(/{{([^}]*)}}/mg, function(t, match){
                    return DataBind.expression(match, context, vm);
                });
            },
            //TODO cache context in node
            //TODO cascade
            'context' : function(node){
                if(node.getAttribute && node.getAttribute(marker.bind)){
                    return node.getAttribute(marker.bind);
                }
                return node.parentNode ? main.parse.context(node.parentNode) : '';
            }
        },
        'bind' : {
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
                    node.nodeValue = main.parse.text(text, context);
                }
            }
        }
    }
    //################################################################################################################
    DataBind.scan = main.scan;
    DataBind.domInit = main.bindDocument;
	DataBind.config.initDOM && window.document && window.document.addEventListener('DOMContentLoaded', main.bindDocument);

    //################################################################################################################
})(window, window.DataBind, window.NPWEB_Core);

