(function() {
  var CSS, HTTP_PORT, app, config, cp, express, fs, getLocalFileName, log, request, _ref;
  express = require('express');
  fs = require('fs');
  request = require('request');
  cp = require('child_process');
  HTTP_PORT = +process.argv[1] || 5005;
  log = function(msg) {
    msg = "" + (new Date().toJSON()) + " - " + msg;
    console.log(msg);
    return msg;
  };
  getLocalFileName = function(filename) {
    return filename.replace(config.baseURL, '').replace(/[\/:_]+/g, '_');
  };
  config = JSON.parse(fs.readFileSync('config.json'));
    if ((_ref = config.cache) != null) {
    _ref;
  } else {
    config.cache = 'cache/';
  };
  if (!((config != null ? config.baseURL : void 0) != null)) {
    console.log('Please define a baseURL in your config file.');
    process.exit(1);
  } else {
    console.log("Base URL: " + config.baseURL);
  }
  CSS = fs.readFileSync('resources/docco.css');
  app = express.createServer();
  app.get('/', function(req, res) {
    var hostname, index;
    hostname = "" + req.connection.remoteAddress + ":" + HTTP_PORT;
    index = fs.readFileSync;
    index = new Function("return " + index)();
    return res.send(index);
  });
  app.get('*', function(req, res) {
    var getRemote, localFile, localPath, path, remoteFile;
    path = req.params.toString();
    if (~path.indexOf('favicon.ico')) {
      return;
    }
    if (~path.indexOf('docco.css')) {
      res.header('Content-Type', 'text/css');
      return res.send(CSS);
    }
    path = path.toString().replace(/^\/+/, '');
    remoteFile = config.baseURL.replace(/\/*$/, '/') + path;
    localFile = getLocalFileName(remoteFile);
    localPath = config.cache + 'docs/' + localFile.replace(/\.js$/, '.html');
    fs.readFile(localPath, function(err, contents) {
      if (err) {
        return getRemote();
      } else {
        return res.end(contents);
      }
    });
    return getRemote = function() {
      log("fetching " + remoteFile);
      return request.get(remoteFile, function(error, response, body) {
        if (error || Math.floor(response.statusCode / 100) !== 2) {
          return res.end(log("Error trying to fetch " + remoteFile));
        }
        body = body.replace(/\t/g, "    ");
        return fs.writeFile(config.cache + localFile, body, function(err) {
          var options;
          if (err) {
            throw err;
          }
          options = {
            cwd: "" + (process.cwd()) + "/" + config.cache
          };
          return cp.exec("docco " + localFile, options, function(err, stdout, stderr) {
            var docsPath;
            if (err) {
              return res.end(log("Error generating docs for " + remoteFile));
            }
            try {
              docsPath = stdout.match(/->\s(.*)/)[1];
            } catch (e) {
              return res.end(log("Error retrieving docs for " + remoteFile));
            }
            return fs.readFile(config.cache + docsPath, function(err, data) {
              if (err) {
                return res.end(log("Error reading docs for " + remoteFile));
              }
              return res.end(data);
            });
          });
        });
      });
    };
  });
  app.listen(HTTP_PORT);
  log("Service started on port " + HTTP_PORT);
  process.on('uncaughtException', function(err) {
    return log("[ERROR] " + err.stack);
  });
}).call(this);
