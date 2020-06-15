// app.js
var express = require('express');  
var app = express();  
var server = require('http').createServer(app);  
var io = require('socket.io')(server);

app.use(express.static(__dirname ));  
app.get('/*', function(req, res,next) {  
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(client) {
    console.log('Client connected...');
    client.on('send signal',signal=>{
        client.broadcast.emit('accept signal',signal)
    })
})


server.listen(3000,()=>{
    console.log("Server Running");
});