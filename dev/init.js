
var name = 'DataBind';
if(name in window){return;}
window[name] = require('./DataBind').init();;
// require('./Expression');
require('./DomExtend');
