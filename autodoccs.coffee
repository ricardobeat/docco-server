#
# **Autodoccs** is a small webservice that generates
# [Docco](http://jashkenas.github.com/docco/) style documentation for remote
# JS files.
#
# Get the source at
# [http://github.com/ricardobeat/autodoccs](http://github.com/ricardobeat/autodoccs)
#
# Written by [Ricardo Tomasi](http://ricardo.cc/)

## Installation
# `git clone https://github.com/ricardobeat/autodoccs.git` into the
# directory of your choice, then create a `config.json` file like this:
#
#     {
#       "baseURL": "http://myremotehost.com/",
#       "cache": "cachepath/"
#     }
#
#   *(cache is optional, defaults to `cache/`)*

## Usage
#
# Start up the server with `node autodoccs.js`, then
# point your browser to `http://localhost:5005/relative/remote/path/xxx.js`,
# or go to `http://localhost:5005/` and type in your relative file path.

#
express = require 'express'
fs      = require 'fs'
request = require 'request'
cp      = require 'child_process'

# The HTTP port can be switched from command line
HTTP_PORT = +process.argv[2] or 5005

#### Helper functions
# Logs with timestamps for better debugging when writing to a log file
log = (msg) ->
    msg = "#{new Date().toJSON()} - #{msg}"
    console.log msg
    return msg

# Normalize file names for local copies
getLocalFileName = (filename) ->
    filename.replace(config.baseURL, '').replace(/[\/:_]+/g, '_')

#### Configuration
# Load configuration file `config.json`
config = JSON.parse fs.readFileSync 'config.json'

# Default path for cache and docs
config.cache ?= 'cache/'

# Warn user and fail if baseURL hasn't been defined in `config.json`
if not config?.baseURL?
    console.log 'Please define a baseURL in your config file.'
    process.exit 1
else
    console.log "Base URL: #{config.baseURL}"

# Load CSS in memory (requests for docco.css will be intercepted)
# and this will be served instead
CSS = fs.readFileSync 'resources/docco.css'

# Create cache dir if it doesn't exist
try
	fs.lstatSync 'cache'
catch e
	fs.mkdirSync config.cache, 16877
	log "Created #{config.cache} directory"

#### Server

# Create server instance from Express
app = express.createServer()

# Show an index page with some helpful information. Template is in `default.html`.
app.get '/', (req, res) ->
    hostname = "#{req.connection.remoteAddress}:#{HTTP_PORT}"
    page = fs.readFileSync 'resources/default.html'
    page = page.toString().replace('$base', config.baseURL).replace('$host', hostname)
    res.send page

#### Request handling

app.get '*', (req, res) ->
	
	# Get relative path from URL
    path = req.params.toString()
    
    # Special cases (ignore favicon, serve CSS)
    if ~path.indexOf 'favicon.ico'
        return
        
    if ~path.indexOf 'docco.css'
        res.header 'Content-Type', 'text/css'
        return res.send CSS

    # Build remote path, make sure there are no extra slashes
    path = path.toString().replace(/^\/+/, '')
    remoteFile = config.baseURL.replace(/\/*$/, '/') + path
    # Normalize filename for local cache
    localFile  = getLocalFileName(remoteFile)
    
    # Replace local copy's filename with original
    fixFileName = (contents) ->
        return contents.toString().replace new RegExp(localFile, 'g'), remoteFile.split('/').slice(-1)[0]
    
    # Try to read local file, will raise an error
    # if it doesn't exist.
    localPath = config.cache + 'docs/' + localFile.replace(/\.js$/, '.html')

    log "fetching #{remoteFile}"

    request.get remoteFile, (error, response, body) ->
        # Status code must be 2xx
        if error or Math.floor(response.statusCode/100) isnt 2
            return res.end log "Error trying to fetch #{remoteFile}"
        
        # Convert tabs to spaces
        # (tab-indented code looks terrible on browsers)
        body = body.replace /\t/g, "    "
        
        # Docco only works from local files, so we'll
        # have to save a copy first.
        fs.writeFile config.cache + localFile, body, (err) ->
            throw err if err
        
            # Generate docs from saved file
            #
            # Set current working directory to cache dir so that
            # generated files end up on `cache/docs/` and not in
            # your current dir.
            options = { cwd: "#{process.cwd()}/#{config.cache}" }
            cp.exec "../node_modules/docco/bin/docco #{localFile}", options, (err, stdout, stderr) ->
                if err
                    return res.end log "Error generating docs for #{remoteFile}"
            
                # Get path to generated html from docco's stdout
                try
                    docsPath = stdout.match(/->\s(.*)/)[1]
                catch e
                    return res.end log "Error retrieving docs for #{remoteFile}"
            
                # Read and send out documentation
                fs.readFile config.cache + docsPath, (err, data) ->
                    if err then return res.end log "Error reading docs for #{remoteFile}"
                    res.end fixFileName(data)

# Start server
app.listen HTTP_PORT
log "Service started on port #{HTTP_PORT}"

# Log and capture errors
process.on 'uncaughtException', (err) ->
    log "[ERROR] #{err.stack}"