/*!
    Σヾ(ﾟДﾟ)ﾉ
*/
var name = require('./config').name;
if(name in window){return;}
window[name] = require('./DataBind').init();
// require('./Expression');
require('./DomExtend');
