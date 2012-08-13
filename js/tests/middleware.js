var fs = require('fs'),
    http = require('http'),
    url = require('url'),
    path = require('path'),
    yaml = require('js-yaml'),
    configFileName = path.basename(process.cwd()) + '.yaml',
    testServer = require('csi'),
    getProxiesFromConfig = function(config) {
        var ret = {}, prop, match;
        if (!config || !config.configuration) {
            return;
        }
        config = config.configuration;
        for (prop in config) {
            if (config.hasOwnProperty(prop)) {
                match = prop.match(/^(mesh-proxy:)(.*)/);
                if (match) {
                    ret['/' + match[2].replace('-', '/')] = config[prop];
                }
            }
        }
        return ret;
    },
    readConfig = function(callback) {
        fs.readFile(configFileName, 'utf8', function(err, file) {
            if (err) {
                config = null;
            } else {
                try {
                    config = yaml.load(file);
                    proxies = getProxiesFromConfig(config);
                } catch (e) {
                    config = null;
                }
            }
            callback();
        });
    },
    log = function(req, resp, statusCode, dest) {
        testServer.log(req, resp, statusCode, req.url + ' =PROXY=> ' + dest, 'blue');
    },
    proxy = function(req, resp, pathPrefix, info) {
        var u = url.parse(info.url),
            dest = info.url.replace(/\/$/, '') + req.url,
            proxyReq = http.request({
                host: u.hostname,
                port: u.port || 80,
                path: u.path + req.url,
                method: req.method
            }, function(proxyResp) {
                proxyResp.on('data', function(chunk) {
                    resp.write(chunk, 'binary');
                }).on('end', function() {
                    resp.end();
                });
                resp.writeHead(proxyResp.statusCode, proxyResp.headers);
                log(req, resp, proxyResp.statusCode, dest);
            }).on('error', function(e) {
                testServer.serveError(req, resp, e);
            });

        req.addListener('data', function(chunk) {
            proxyReq.write(chunk, 'binary');
        }).addListener('end', function() {
            proxyReq.end();
        });

    },
    serveRequest = function(req, resp, callback) {
        var prop;
        for (prop in proxies) {
            if (proxies.hasOwnProperty(prop)) {
                if (req.url.slice(0, prop.length) === prop) {
                    proxy(req, resp, prop, proxies[prop]);
                    return;
                }
            }
        }
        callback();
    },
    config, proxies;

exports.request = function(req, resp, callback) {
    if (typeof config !== 'undefined') {
        serveRequest(req, resp, callback);
    } else {
        readConfig(function() {
            serveRequest(req, resp, callback);
        });
    }
};
