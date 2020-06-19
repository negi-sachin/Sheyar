//let Peer=require('simple-peer')
var socket = io.connect("/");
socket.on("connect", () => {
  console.log("Server Socket connected", socket.id);
});
let peer;
socket.on("pls send signal", () => {
  peer = new SimplePeer({
    initiator: true,
    trickle:false
  });

  peer.once("signal", (signal) => {
    console.log("sending signal", signal);
    socket.emit("sending signal", signal);
    console.log(peer);
  });
});


socket.on("accept signal", (signal) => {
  console.log("accepting signal", signal);
  peer = new SimplePeer({
    initiator: false,
    trickle:false
  });
  peer.signal(signal);
  peer.once("signal", (signal) => {
    console.log("returning signal",signal);
    socket.emit("returning signal", signal);
  });
  console.log(peer);
  execute(peer);
});

socket.on("accept returning signal", (signal) => {
  console.log("accepting returned signal",signal);
  peer.signal(signal);
  execute(peer);
});

let percentage = document.getElementById("percentage");
let message = document.querySelector(".message");
let selectedFiles = [];
let status = "files info";
let files,
  fileInfo,
  fileChunks = [],
  totalDownloaded = 0,
  filesDownloaded = 0,
  form = document.querySelector("#filesForm"),
  peerStatus=document.querySelector('.peerStatus')
  ;
  
  const input = document.getElementById("file-input");
function handleDownload(e) {
  if (e) e.preventDefault();
  console.log("Download pressed");
  let checkedBoxes = [...document.querySelectorAll('[name="fileBox"]')].filter(
    (ele) => ele.checked === true
  );
  console.log(checkedBoxes);
  checkedBoxes.forEach((box) => {
    console.log(box.value);
    selectedFiles.push(box.value);
  });
  console.log(JSON.stringify(selectedFiles));
  peer.send(JSON.stringify(selectedFiles));
  status = "file info";
  form.innerHTML = "";
}

function execute(peer) {
  peer.on("connect", () => {
    console.log("Peer Connected");

    peerStatus.innerHTML="Your Friend is Connected, Start Sharing !"
    peerStatus.style.color="green"

    // Event listener on the file input
    input.addEventListener("change", () => {
      files = input.files;
      if(files.length===0)
      return

      let filesInfo = [...files].map((file) => ({
        name: file.name,
        size: file.size,
      }));
      console.log(filesInfo);
      message.innerHTML=""
      status = "send file";
      peer.send(JSON.stringify({ filesInfo }));
    });
  });

  peer.on('error',(err)=>{
console.log("error is ",err);
peerStatus.style.color="red"
peerStatus.innerHTML="Connection Failed .Try again !"
  })

  peer.on('close', () => {
    console.log("Peer left");
    peerStatus.style.color="red"
    peerStatus.innerHTML="Your friend left !" 
  })
  peer.on("data", (data) => {
  //  console.log("Some data is coming,status:", status);

    if (data.toString() === "Done!") {
      console.log("Full file received");
      let add = 0;
      fileChunks.forEach((chunk) => (add += chunk.byteLength));
      console.log(add);
      // Convert the file back to Blob
      const file = new Blob(fileChunks);

      console.log("Received", file);

      download(file, fileInfo.name);
      filesDownloaded++;
      totalDownloaded = 0;
      fileChunks = [];
      if (filesDownloaded === selectedFiles.length) {
        status = "files info";
        filesDownloaded = 0;
        selectedFiles = [];
        input.style.display="block"
        percentage.innerText=""
      } else status = "file info";

      let div = document.createElement("div");
      div.innerText = `${fileInfo.name} has been downloaded`;
      message.appendChild(div);
      return;
    }
    if (status === "files info") {
      let info = JSON.parse(data.toString());
      console.log(info);

      info.filesInfo.forEach((file) => {
        let checkbox = document.createElement("input", {
          name: "fileBox",
          type: "checkbox",
          value: file.name,
          id: file.name,
        });
        checkbox.setAttribute("name", "fileBox");
        checkbox.setAttribute("type", "checkbox");
        checkbox.setAttribute("value", file.name);
        checkbox.setAttribute("id", file.name);

        let label = document.createElement("label");
        label.setAttribute("for", file.name);
        let text = document.createTextNode(file.name);
        label.appendChild(text);
        form.appendChild(label);
        label = document.querySelector(`[for="${file.name}"]`);
        form.insertBefore(checkbox, label);
        form.appendChild(document.createElement("br"));
        input.style.display="none"
      });
      let submitBtn = document.createElement("button");
      submitBtn.setAttribute("type", "button");
      submitBtn.appendChild(document.createTextNode("Download"));
      submitBtn.setAttribute("onclick", "handleDownload()");
      submitBtn.setAttribute('class','btn btn-block btn-dark d-block mx-auto')
      form.appendChild(submitBtn);
      message.innerHTML=""
    } else if (status === "file info") {
      console.log(data.toString());
      fileInfo = JSON.parse(data.toString());
      console.log(fileInfo);
      status = "Receive file";
      percentage.style.display = "block";
    } else if (status === "send file") {
      let selectedFiles = JSON.parse(data.toString());
      console.log(selectedFiles);
      files = [...files].filter((file) => selectedFiles.includes(file.name));
      console.log(files);
      message.innerText="Sending.."
      files.forEach((file,index) => {
        // status="file info"
        console.log("Sending", file);

        file.arrayBuffer().then((buffer) => {
          const chunkSize = 16 * 1024;

          // Keep chunking, and sending the chunks to the other peer
          while (buffer.byteLength) {
            if (buffer.byteLength === file.size)
              peer.send(
                JSON.stringify({
                  name: file.name,
                  size: file.size,
                })
              );

            const chunk = buffer.slice(0, chunkSize);
            buffer = buffer.slice(chunkSize, buffer.byteLength);

            // Off goes the chunk!
            peer.send(chunk);
          }
          // End message to signal that all chunks have been sent
          console.log("Done!");
          peer.send("Done!");
          if(index===files.length-1)
          message.innerText="SuccessFully Sent"
        });
      });
     
      status = "files info";
    } else if (status === "Receive file") {
      totalDownloaded =
        ((fileChunks.length * 16384 + data.length) / fileInfo.size) * 100;
      fileChunks.push(data);
      percentage.innerText = Math.round(totalDownloaded) + "%-"+fileInfo.name;
      //console.log(totalDownloaded);
    }
  });
}
