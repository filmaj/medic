var http = require('http');

// TODO: Read config file
// - get write location
// - get server port

http.createServer(function (req, res) {
  if (req.method.toLowerCase() == 'post') {
    if (req.url == 'results') {
      // TODO: extract HTTP POST data
      // TODO: write out POST data as xml file to jenkins
      // workspace
      res.writeHead(200, "OK", {'Content-Type': 'text/html'});
      res.end('<html><head><title>k</title></head><body><h1>thx dude</h1></body></html>');
    } else {
      res.writeHead(404, "Not found", {'Content-Type': 'text/html'});
      res.end('<html><head><title>404 - Not found</title></head><body><h1>Not found.</h1></body></html>');
      console.log("[404] " + req.method + " to " + req.url);
    }
  }
}).listen(8080);
