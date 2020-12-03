// app.js
var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = require("socket.io")(server, {
  pingTimeout: 60000,
});

app.use(express.static(__dirname + "/Client"));
app.get("/*", function (req, res, next) {
  res.sendFile(__dirname + "/Client/index.html");
});

let roomData = {},
  userData = {},
  partnerIndex = 0;

function detectPartnerIndex(mySocketId) {
  let room = userData[mySocketId];
  let myindex = roomData[room].findIndex((ele) => ele === mySocketId);
  if (myindex === 0) return 1;
  else return 0;
}

function detectRoomId(mySocketId) {
  return userData[mySocketId]
}
io.on("connection", function (client) {

  client.on("my room id", (roomID) => {

    console.log(roomID);
    if (roomData[roomID]) {
      console.log(`${roomID} id exist`);
      if (roomData[roomID].length === 1) {
        console.log(`${roomID} has one member alreday`);
        roomData[roomID].push(client.id);
        console.log("sending signal to " + roomData[roomID][0]);
        partnerIndex = 0;
        io.to(roomData[roomID][0]).emit(
          "pls send signal",
          "sent by " + roomData[roomID][1]
        );
        userData[client.id] = roomID;
      } else client.emit("excess limit crossed");
    } else {
      console.log(`${roomID} doesnt exist ,creating one`);
      roomData[roomID] = [client.id];
      console.log(roomData);
      partnerIndex = 1;
      userData[client.id] = roomID;
    }
  });

  client.on("sending signal", (signal) => {
    console.log(roomData);
    console.log(partnerIndex);
    io.to(roomData[detectRoomId(client.id)][detectPartnerIndex(client.id)]).emit(
      "accept signal",
      signal
    );
  });

  client.on("returning signal", (signal) => {
    io.to(roomData[detectRoomId(client.id)][detectPartnerIndex(client.id)]).emit(
      "accept returning signal",
      signal
    );
  });

  client.on("disconnect", () => {
    let room = userData[client.id];
    if (roomData[room]) {
      if (roomData[room].length === 2) {
        let myindex = roomData[room].findIndex((ele) => ele === client.id);
        if (myindex === 0) {
          roomData[room][0] = roomData[room][1];
        }
        roomData[room].pop();
        io.to(roomData[room][0]).emit("peer left");
        delete userData[client.id];
      } else {
        delete userData[client.id];
        delete roomData[room];

      }
      console.log("Client Disconnected", roomData, userData);
    }
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server Running");
});