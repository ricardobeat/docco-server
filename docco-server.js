(function() {
  var CSS, app, config, cp, express, fs, getLocalFileName, log, program, request;

  fs = require('fs');

  cp = require('child_process');

  express = require('express');

  request = require('request');

  program = require('commander');

  config = require('config.json');

  program.option('-p, --port <port>', 'Port to listen [5005]', Number, 5005).option('-u, --base-url <url>', 'Source-code base URL', String, config.baseURL).option('-c, --cache-path <path>', 'Path for file cache [./cache]', 'cache').parse(process.argv);

  program.cache = "" + (program.cache.replace(/\/+$/g, '')) + "/";

  if (!(program.baseURL != null)) {
    console.log("Base URL parameter is required. See -h for details.");
    process.exit();
  }

  log = function(msg) {
    msg = "" + (new Date().toJSON()) + " - " + msg;
    console.log(msg);
    return msg;
  };

  getLocalFileName = function(filename) {
    return filename.replace(config.baseURL, '').replace(/[\/:_]+/g, '_');
  };

  CSS = fs.readFileSync('resources/docco.css');

  try {
    fs.lstatSync('cache');
  } catch (e) {
    fs.mkdirSync(config.cache, 16877);
    log("Created " + config.cache + " directory");
  }

  app = express.createServer();

  app.get('/', function(req, res) {
    var hostname, page;
    hostname = "" + req.connection.remoteAddress + ":" + HTTP_PORT;
    page = fs.readFileSync('resources/default.html');
    page = page.toString().replace('$base', config.baseURL).replace('$host', hostname);
    return res.send(page);
  });

  app.get('*', function(req, res) {
    var fixFileName, localFile, localPath, path, remoteFile;
    path = req.params.toString();
    if (~path.indexOf('favicon.ico')) return;
    if (~path.indexOf('docco.css')) {
      res.header('Content-Type', 'text/css');
      return res.send(CSS);
    }
    path = path.toString().replace(/^\/+/, '');
    remoteFile = config.baseURL.replace(/\/*$/, '/') + path;
    localFile = getLocalFileName(remoteFile);
    fixFileName = function(contents) {
      return contents.toString().replace(new RegExp(localFile, 'g'), remoteFile.split('/').slice(-1)[0]);
    };
    localPath = config.cache + 'docs/' + localFile.replace(/\.js$/, '.html');
    log("fetching " + remoteFile);
    return request.get(remoteFile, function(error, response, body) {
      if (error || Math.floor(response.statusCode / 100) !== 2) {
        return res.end(log("Error trying to fetch " + remoteFile));
      }
      body = body.replace(/\t/g, "    ");
      return fs.writeFile(config.cache + localFile, body, function(err) {
        var options;
        if (err) throw err;
        options = {
          cwd: "" + (process.cwd()) + "/" + config.cache
        };
        return cp.exec("../node_modules/docco/bin/docco " + localFile, options, function(err, stdout, stderr) {
          var docsPath;
          if (err) return res.end(log("Error generating docs for " + remoteFile));
          try {
            docsPath = stdout.match(/->\s(.*)/)[1];
          } catch (e) {
            return res.end(log("Error retrieving docs for " + remoteFile));
          }
          return fs.readFile(config.cache + docsPath, function(err, data) {
            if (err) return res.end(log("Error reading docs for " + remoteFile));
            return res.end(fixFileName(data));
          });
        });
      });
    });
  });

  app.listen(HTTP_PORT);

  log("Service started on port " + HTTP_PORT);

  process.on('uncaughtException', function(err) {
    return log("[ERROR] " + err.stack);
  });

}).call(this);
