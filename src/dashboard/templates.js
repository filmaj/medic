var fs   = require('fs'),
    path = require('path');

// cached string of html
var html = fs.readFileSync(path.join(__dirname, 'templates', 'index.html'), 'utf-8');

module.exports = {
    html:function() { return html; }
};
