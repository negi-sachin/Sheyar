var socket=io.connect('/')
socket.on('connect',()=>{
    console.log("Server Socket connected");
})
socket.on('handshake',()=>{
    console.log("Server Client Handshake");
})


const peer = new SimplePeer({ initiator: window.location.hash==='#init'?true:false });

peer.on('signal',signal=>{
    console.log("sending signal",signal);
    socket.emit('send signal',signal)
})

socket.on('accept signal',signal=>{
    console.log("accepting signal",signal);
    peer.signal(signal)
})

peer.on('connect',()=>{
    console.log("Peer Connected");

    const input = document.getElementById('file-input');

  // Event listener on the file input
  input.addEventListener('change', () => {
    const file = input.files[0];
    console.log('Sending', file)

    // We convert the file from Blob to ArrayBuffer, since some browsers don't work with blobs
    file.arrayBuffer()
    .then(buffer => {
      // Off goes the file!
      console.log("sending file");
      peer.send(buffer);
    });

  });

})

peer.on('data', data => {
    console.log("Some data is coming");
    // Convert the file back to Blob
    const file = new Blob([ data ]);
  
    console.log('Received', file);
    // Download the received file using downloadjs
    download(file, 'test');
  });

