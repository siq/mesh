var http    = require('http'),
    url     = require('url'),
    fs      = require('fs'),
    app     = http.createServer(handler),
    io      = require('socket.io')(app),
    port    = 9990, //3000,
    urls    = [
        '/push'
    ];

function push(request, response) {
    var postData = '';
    request.on('data', function (data) {
        postData += data;
        // Too much POST data, kill the connection!
        if (postData.length > 1e6) {
            request.connection.destroy();
        }
    });
    request.on('end', function () {
        // we only ever expect JSON
        var post = JSON.parse(postData);
        console.log('DEBUG: recieved post', post);
        // push data through socket
        io.emit('update', post);
    });
    response.writeHead(200);
    response.end();
}

function handler (request, response) {
    if (request.method == 'POST') {
        var filename = url.parse(request.url).pathname;
        if (urls.indexOf(filename) < 0) {
            console.log('here');
            response.writeHead(403, {'403': 'FORBIDDEN'});
            response.end('You bad man!');
            return;
        }
        push.apply(this, arguments);
    } else {
        fs.readFile(__dirname + '/index.html', function (error, data) {
            if (error) {
                response.writeHead(500);
                return response.end('Error loading index.html');
            }
            response.writeHead(200);
            response.end(data);
        });
    }
}

io.use(function (socket, accept) {
    var cookie = socket.request.headers.cookie;
    console.log('DEBUG: cookie', socket.request.headers.cookie);
    if (cookie) {
        // TODO: validate cookie
        return accept();
    }
    else {
        // return accept('No cookie transmitted.', false);
        return accept(new Error('Authentication error'));
    }
    accept(null, true);
});


io.on('connection', function (socket) {
    console.log('INFO: user connected');
    socket.on('disconnect', function(){
        console.log('INFO: user disconnected');
    });
});

app.listen(port, function(){
    console.log('INFO: listening on *:' + port);
});
