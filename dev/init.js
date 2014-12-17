/*!
    Σヾ(ﾟДﾟ)ﾉ
*/
var name = require('./config').name;
if(name in window){return;}
module.exports = window[name] = require('./DataBind').init();
require('./Expression.artTemplate');
require('./DomExtend');