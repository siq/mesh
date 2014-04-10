// var http = require('http'),
//     fs = require('fs'),
//     // NEVER use a Sync function except at start-up!
//     index = fs.readFileSync(__dirname + '/index.html');

// // Send index.html to all requests
// var app = http.createServer(function(req, res) {
//     res.writeHead(200, {'Content-Type': 'text/html'});
//     res.end(index);
// });

// // Socket.io server listens to our app
// var io = require('socket.io').listen(app);

// // Send current time to all connected clients
// function sendTime() {
//     io.sockets.emit('time', { time: new Date().toJSON() });
// }

// // Send current time every 10 secs
// setInterval(sendTime, 10000);

// // Emit welcome message on connection
// io.sockets.on('connection', function(socket) {
//     socket.emit('welcome', { message: 'Welcome!' });

//     socket.on('i am client', console.log);
// });

// app.listen(3000);

var app = require('http').createServer(handler),
    io = require('socket.io').listen(app),
    fs = require('fs'),
    test_model = {
      name: 'a test model',
      id: 1
    };

app.listen(3000);

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

// 0.9.x authorization method for incoming socket connection
// io.configure(function (){
//     io.set('authorization', function (handshakeData, accept) {
//         var cookie = handshakeData.headers.cookie;
//         // console.log('DEBUG: authorization', handshakeData);
//         console.log('DEBUG: cookie', handshakeData.headers.cookie);
//         if (cookie) {
//             // TODO: validate cookie
//         }
//         else {
//             return accept('No cookie transmitted.', false);
//         }
//         accept(null, true);
//     });
// });

// 1.0.0-pre authorization method for incoming socket connection
io.use(function (socket, accept) {
    var cookie = socket.request.headers.cookie;
    // console.log('DEBUG: authorization', handshakeData);
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


io.sockets.on('connection', function (socket) {
  // socket.emit('news', { hello: 'world' });
  // socket.on('my other event', function (data) {
  //   console.log('server', data);
  // });
  setInterval(function() {
    console.log('emit update/change');
    // socket.emit('update', 'infoset', 'model', {status: true});
    // socket.emit('change', 'infoset', 'model', {status: true});
    socket.emit('update', 'infoset', test_model, {status: true});
    socket.emit('change', 'infoset', test_model, {status: true});
  }, 5000);
});