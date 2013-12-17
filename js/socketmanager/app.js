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

var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')

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

io.sockets.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log('server', data);
  });
  setInterval(function() {
    console.log('emit infoset update');
    socket.emit('update', 'infoset', 'model', {status: true});
    socket.emit('change', 'infoset', 'model', {status: true});
  }, 5000);
});