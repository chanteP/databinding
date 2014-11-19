
var name = 'DataBind';
if(name in window){return;}

var DataBind = require('./DataBind'),
    Accessor = require('./Accessor');

new Accessor('', DataBind.root);

// require('./Expression');
require('./DomExtend');
window[name] = DataBind;