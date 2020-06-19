// app.js
var express = require('express');  
var app = express();  
var server = require('http').createServer(app);  
var io = require('socket.io')(server);

app.use(express.static(__dirname ));  
app.get('/*', function(req, res,next) {  
    res.sendFile(__dirname + '/index.html');
});

let totalClients=0;
io.on('connection', function(client) {
    totalClients++
    if(totalClients>=3){
        totalClients--
        client.emit('excess limit crossed')
        return
    }
    console.log('Client connected...',client.id);
    console.log("Total:",totalClients);
    if(totalClients>1)
    client.broadcast.emit('pls send signal')

    client.on('sending signal',signal=>{
        client.broadcast.emit('accept signal',signal)
    })

    client.on('returning signal',signal=>{
        client.broadcast.emit('accept returning signal',signal)
    })

    client.on('disconnect',()=>{
        totalClients--;
        console.log('Client Disconnected',totalClients);
        client.broadcast.emit('peer left')
    })
})


server.listen(process.env.PORT||3000,()=>{
    console.log("Server Running");
});