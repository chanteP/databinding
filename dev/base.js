/*!
    Σヾ(ﾟДﾟ)ﾉ
    基础observe
*/
var config = require('./config');
var base = require('./factory');

base.config = config.set;
base._config = config;

window[config.name] = base;

module.exports = base;
