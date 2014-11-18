/**
	试作型core ver 0.7.0  /  neetproject@web ver 5.5
	@140106
	自用的web框架前端part，保留register作为扩展组件用
*/
;(function(window, name, config){
    var corename = 'NPWEB_Core';
	if(corename in window){return;}
	var $ = {};

    $.config = config;

	$.ext 	= window.Zepto;
    $.loader = window.seajs;
    // $.template = window.Handlebars;
    
	$.debug = config.debug;
	//base func###################################################################
    $.objMerger = function(type, args){
        var hold = false, rsObj, curObj;
        if(args[args.length-1] === true){
            hold = true;
        }
        rsObj = hold ? args[0] : {};
        for(var i = +hold, j = args.length - hold; i<j; i++) {
            curObj = args[i];
            if(typeof curObj !== 'object'){continue;}
            for(var key in (type ? curObj : args[0])){
                if(!args[i].hasOwnProperty(key)){continue;}
                rsObj[key] = curObj[key];
            }
        };
        return rsObj;
    };
	$.parse = function(){
        return $.objMerger(0, arguments);
    };
    $.merge = function(){
        return $.objMerger(1, arguments);
    };
	//register###################################################################
	$.register = function(route, func, base){
        var path, dist, rs;
        path = base || $;
        dist = route.split('.');
        while(dist.length > 1){
            rs = dist.shift();
            if(!(rs in path)){
                path[rs] = {};
            }
            path = path[rs];
        }
        if(dist[0] in path){return;}
        path[dist[0]] = 
            typeof func === 'function' ?
                func.bind($):
                func;
    }
	//log################################################################### 
	$.log = function(part, info, e){
		var type = 	e instanceof Error ? 'error' :
					e == 'mark' ? 'debug' :
					e == 'warn' ? 'warn' :
					e == 'info' ? 'info' :
					'log';
		var msg = '[' + part + ']@ ' + Date.now() + ' : ' + info + (type == 'error' ? '('+(e.stack || e.message)+')' : '');
		$.debug && $.log.list.push(msg);
		$.debug && console && console[type](msg);
		return msg;
	};
	$.log.list = [];
	
	window[corename] = window[name] = $;
})(window, '$', window.config || {});
