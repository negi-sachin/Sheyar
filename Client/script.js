var socket = io.connect("/");
socket.on("connect", () => {
  // console.log("Server Socket connected", socket.id);
});
let peer;
socket.on("pls send signal", (data) => {
  //console.log(data);
  peer = new SimplePeer({
    initiator: true,
    trickle: false,
  });

  peer.once("signal", (signal) => {
    //console.log("sending signal", signal);
    socket.emit("sending signal", signal);
  });
  peerStatus.style.color = "yellow";
  peerStatus.innerHTML = "&#07;&nbsp;Someone is Connecting .Please Wait!";
});

socket.on("accept signal", (signal) => {
  //console.log("accepting signal", signal);
  peer = new SimplePeer({
    initiator: false,
    trickle: false,
  });
  peer.signal(signal);
  peer.once("signal", (signal) => {
    // console.log("returning signal", signal);
    socket.emit("returning signal", signal);
  });
  peerStatus.style.color = "yellow";
  peerStatus.innerHTML = "&#07;&nbsp;Someone is Connecting .Please Wait!";
  execute(peer);
});

socket.on("accept returning signal", (signal) => {
  // console.log("accepting returned signal", signal);
  peer.signal(signal);
  execute(peer);
});

socket.on("peer left", () => {
  //console.log("Peer left");
  peerStatus.style.color = "red";
  peerStatus.innerHTML = "Your friend left !";
});
socket.on("excess limit crossed", () => {
  document.getElementById("firstPart").style.display = "block";
  document.getElementById("secondPart").style.display = "none";
  setTimeout(() => {
    alert("This Room is full.Please Try Another Room");
  }, 10);
});

let percentage = document.getElementById("percentage"),
  message = document.getElementById("message"),
  downloadedFiles = document.getElementById("downloadedFiles"),
  selectedFiles = [],
  status = "files info",
  files,
  fileInfo,
  fileChunks = [],
  totalDownloaded = 0,
  filesDownloaded = 0,
  form = document.querySelector("#filesForm"),
  roomID,
  peerStatus = document.querySelector(".peerStatus"),
  chunkSize = 16 * 1024,
  input = document.getElementById("file-input");

function handleRoomId(e) {
  if (e) e.preventDefault();

  roomID = document.getElementById("roomID").value;
  if (!roomID) {
    alert("Room ID is required");
    return;
  }
  document.getElementById("firstPart").style.display = "none";
  document.getElementById("secondPart").style.display = "block";
  document.getElementById("showRoomID").innerText = roomID;

  socket.emit("my room id", roomID);
}

let joinForm = document.getElementById("joinForm");
joinForm.addEventListener("submit", handleRoomId);

function handleDownload(e) {
  if (e) e.preventDefault();
  let checkedBoxes = [...document.querySelectorAll('[name="fileBox"]')].filter(
    (ele) => ele.checked === true
  );
  checkedBoxes.forEach((box) => {
    selectedFiles.push(box.value);
  });
  //console.log(JSON.stringify(selectedFiles));
  peer.send(JSON.stringify(selectedFiles));
  status = "file info";
  form.innerHTML = "";
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function clearMessages() {
  //clearing downloaded files status messages
  let divs = [...document.querySelectorAll("#downloadedFiles div")];
  while (divs.length) {
    //console.log(divs);
    downloadedFiles.removeChild(divs[divs.length - 1]);
    divs.pop();
  }
  downloadedFiles.style.display = "none";

  //clearing messages
  message.innerHTML = "";
}
function execute() {
  peer.on("connect", () => {
    // console.log("Peer Connected");
    peerStatus.innerHTML =
      "&#08; &nbsp;Your Friend is Connected, Start Sharing !";
    peerStatus.style.color = "green";

    document.querySelector('label[for="file-input"]').style.visibility =
      "visible";
    document.querySelector('label[for="file-input"]').style.display = "block";
    clearMessages();
    message.setAttribute("class", "text-center text-info");
    message.style.fontSize = "unset";

    // Event listener on the file input
    input.addEventListener("change", () => {
      files = input.files;
      if (files.length === 0) return;
      clearMessages();
      message.innerText = "Please Wait...";
      let filesInfo = [...files].map((file) => ({
        name: file.name,
        size: file.size,
      }));
      // console.log(filesInfo);
      status = "send file";
      peer.send(JSON.stringify({ filesInfo }));
    });
  });

  peer.on("error", (err) => {
    console.log("error is ", err);
    peerStatus.style.color = "red";
    peerStatus.innerHTML = "Connection Failed .Try again !";
  });

  peer.on("close", () => {
    //console.log("Peer left");
    peerStatus.style.color = "red";
    peerStatus.innerHTML = "Your friend left !";
    clearMessages();
    document.querySelector('label[for="file-input"]').style.visibility =
      "hidden";
    form.innerHTML = "";
  });
  
  peer.on("data", (data) => {
    handlePeerData(data)
    });
}

function handlePeerData(data){
  if (data.toString() === "Done!") {
    // console.log("Full file received");
    let add = 0;
    fileChunks.forEach((chunk) => (add += chunk.byteLength));
    const file = new Blob(fileChunks);
    download(file, fileInfo.name);
    filesDownloaded++;
    totalDownloaded = 0;
    fileChunks = [];
    if (filesDownloaded === selectedFiles.length) {
      status = "files info";
      filesDownloaded = 0;
      selectedFiles = [];
      document.querySelector('label[for="file-input"]').style.display =
        "block";
      percentage.innerText = "";
    } else status = "file info";

    if (downloadedFiles.style.display === "none")
      downloadedFiles.style.display = "block";
    let div = document.createElement("div");
    div.setAttribute("class", "mx-1");
    div.innerText = `${fileInfo.name.slice(0, 25)}(${formatBytes(
      fileInfo.size
    )})`;
    downloadedFiles.appendChild(div);
    return;
  }
  if (status === "files info") {
    let info = JSON.parse(data.toString());
    document.querySelector('label[for="file-input"]').style.display = "none";
    //console.log(info);
    form.innerHTML = "";
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
      checkbox.setAttribute("checked", true);

      let label = document.createElement("label");
      label.setAttribute("for", file.name);
      let text = document.createTextNode(
        file.name + " (" + formatBytes(file.size) + ")"
      );
      label.appendChild(text);
      form.appendChild(label);
      label = document.querySelector(`[for="${file.name}"]`);
      form.insertBefore(checkbox, label);
      form.appendChild(document.createElement("br"));
    });
    let submitBtn = document.createElement("button");
    submitBtn.setAttribute("type", "button");
    submitBtn.appendChild(document.createTextNode("Download"));
    submitBtn.setAttribute("onclick", "handleDownload()");
    submitBtn.setAttribute(
      "class",
      "btn btn-block btn-dark d-block mx-auto mt-3"
    );
    form.appendChild(submitBtn);
    clearMessages();
  } else if (status === "file info") {
    fileInfo = JSON.parse(data.toString());
    status = "Receive file";
    percentage.style.display = "block";
  } else if (status === "send file") {
    let selectedFiles = JSON.parse(data.toString());
    //console.log(selectedFiles);
    files = [...files].filter((file) => selectedFiles.includes(file.name));
    message.innerText = "Sending..";
    files.forEach((file, index) => {
    
      //console.log("Sending", file);

      let reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = () => {
        let buffer = reader.result;
        //console.log("file loaded", buffer);

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
          peer.send(chunk);
        }
        // console.log("Done!");
        peer.send("Done!");
        if (index === files.length - 1)
          message.innerText = "SuccessFully Sent";
      };
      reader.onerror = () => {
        console.log("File loader error", reader.error);
        alert("Something went Wrong");
      };
    });

    status = "files info";
  } else if (status === "Receive file") {
    totalDownloaded =
      ((fileChunks.length * 16384 + data.length) / fileInfo.size) * 100;
    fileChunks.push(data);
    percentage.innerText =
      Math.round(totalDownloaded) +
      "%-" +
      fileInfo.name +
      " (" +
      formatBytes(fileInfo.size) +
      ")";
  }

}
window.onunload = () => {
  //console.log("peer Left");
  peer.destroy();
};
