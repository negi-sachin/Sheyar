var socket = io.connect("/");
socket.on("connect", () => {
  console.log("Server Socket connected");
});
socket.on("handshake", () => {
  console.log("Server Client Handshake");
});


const peer = new SimplePeer({
  initiator: window.location.hash === "#init" ? true : false,
});

let percentage=document.getElementById('percentage')
peer.on("signal", (signal) => {
  console.log("sending signal", signal);
  socket.emit("send signal", signal);
});

socket.on("accept signal", (signal) => {
  console.log("accepting signal", signal);
  peer.signal(signal);
});

peer.on("connect", () => {
  console.log("Peer Connected");

  const input = document.getElementById("file-input");

  // Event listener on the file input
  input.addEventListener("change", () => {
    const file = input.files[0];
    console.log("Sending", file);
    peer.send(
      JSON.stringify({
        name: file.name,
        size: file.size,
      })
    );
    // We convert the file from Blob to ArrayBuffer, since some browsers don't work with blobs
    file.arrayBuffer().then((buffer) => {
      /**
       * A chunkSize (in Bytes) is set here
       * I have it set to 16KB
       */
      const chunkSize = 16 * 1024;

      // Keep chunking, and sending the chunks to the other peer
      while (buffer.byteLength) {
        const chunk = buffer.slice(0, chunkSize);
        buffer = buffer.slice(chunkSize, buffer.byteLength);

        // Off goes the chunk!
        peer.send(chunk);
      }

      // End message to signal that all chunks have been sent
      peer.send("Done!");
    });
  });
});

let startDownload = false,
  fileInfo,
  fileChunks = [],
  totalDownloaded=0;
peer.on("data", (data) => {
  console.log("Some data is coming", data);

  if (data.toString() === "Done!") {
    console.log("Full file received");
    let add=0;
    fileChunks.forEach(chunk=>add+=chunk.byteLength)
    console.log(add);
    // Convert the file back to Blob
    const file = new Blob(fileChunks);

    console.log("Received", file);
    // Download the received file using downloadjs
    download(file, fileInfo.name);
    startDownload=false;
    totalDownloaded=0;
    fileChunks=[]
    return;
  }
  if (!startDownload) {
    fileInfo = JSON.parse(data.toString());
    console.log(fileInfo);
    startDownload = true;
    percentage.style.display="block"
  } else {
    totalDownloaded=(((fileChunks.length)*16384+data.length)/fileInfo.size)*100
  fileChunks.push(data)
  percentage.innerText=Math.round(totalDownloaded)+'%'
  console.log(totalDownloaded);
  }
});
