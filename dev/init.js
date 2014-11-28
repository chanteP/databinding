
var name = require('./config').name;
if(name in window){return;}
module.exports = window[name] = require('./DataBind').init();
// require('./Expression');
require('./DomExtend');
