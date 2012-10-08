var fs = require('fs'),
    http = require('http'),
    url = require('url'),
    path = require('path'),
    yaml = require('js-yaml'),
    configFileName = path.basename(process.cwd()) + '.unittest.yaml',
    testServer = require('csi'),
    getProxiesFromConfig = function(config) {
        var prop, match;
        proxies = proxies || {};
        meshconf = meshconf || {};
        if (!config || !config.configuration) {
            return;
        }
        config = config.configuration;
        for (prop in config) {
            if (config.hasOwnProperty(prop)) {
                match = prop.match(/^(mesh-proxy:)(.*)/);
                if (match) {
                    proxies['/' + match[2].replace('-', '/')] = config[prop];
                    config[prop].prefix = config[prop].path + '/' + match[2].replace(/-[\d\.]+$/, '');
                    meshconf[match[2]] = config[prop].path;
                }
            }
        }
    },
    readConfig = function(callback) {
        fs.readFile(configFileName, 'utf8', function(err, file) {
            if (err) {
                config = null;
            } else {
                try {
                    config = yaml.load(file);
                    getProxiesFromConfig(config);
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
            destPath = path.join(u.path, req.url.replace(new RegExp('^'+info.path), '')),
            dest = 'http://' + u.hostname + ':' + (u.port || 80) + destPath,
            proxyReq = http.request({
                host: u.hostname,
                port: u.port || 80,
                path: destPath,
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
                log(req, resp, 600, dest);
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
        if (/meshconf/.test(req.url)) {
            resp.writeHead(200, {
                'cache-control': 'no-cache, must-revalidate',
                'content-type': 'application/javascript'
            });
            resp.write(meshconfTemplate.replace('%s', JSON.stringify(meshconf)));
            resp.end();
            return;
        }
        for (prop in proxies) {
            if (proxies.hasOwnProperty(prop)) {
                if (req.url.slice(0, proxies[prop].prefix.length) === proxies[prop].prefix) {
                    proxy(req, resp, prop, proxies[prop]);
                    return;
                }
            }
        }
        callback();
    },
    meshconfTemplate = "define([], {\nbundles: %s\n});",
    config, proxies, meshconf;

exports.request = function(req, resp, callback) {
    if (typeof config !== 'undefined') {
        serveRequest(req, resp, callback);
    } else {
        readConfig(function() {
            serveRequest(req, resp, callback);
        });
    }
};
