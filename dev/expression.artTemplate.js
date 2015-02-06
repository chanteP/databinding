/*
    artTemplate extend

    提供render方法[和register]
*/
var artTemplate = require('art-template');
var filters = require('./expression.filter') || {};
var log = require('./kit').log;

for(var helperName in filters){
    if(!filters.hasOwnProperty(helperName)){continue;}
    artTemplate.helper(helperName, filters[helperName]);
}
artTemplate.onerror = function(e){
    log('Expression.artTemplate', e.message, 'warn');
}
module.exports = {
    render : function(expressionText, data){
        expressionText = '{{' + expressionText + '}}';
        rs = artTemplate.render(expressionText)(data);
        if(rs === '{Template Error}'){
            rs = '';
        }
        return rs;
    },
    register : artTemplate.helper
};
