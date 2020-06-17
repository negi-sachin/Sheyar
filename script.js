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

let percentage = document.getElementById("percentage");
let message=document.querySelector('.message')

peer.on("signal", (signal) => {
  console.log("sending signal", signal);
  socket.emit("send signal", signal);
});

socket.on("accept signal", (signal) => {
  console.log("accepting signal", signal);
  peer.signal(signal);
});
let selectedFiles=[];
let status = "files info"
function handleDownload(e){
  if(e)
  e.preventDefault();
  console.log("Download pressed");
  let checkedBoxes=[...document.querySelectorAll('[name="fileBox"]')].filter(ele=>ele.checked===true)
  console.log(checkedBoxes);
  checkedBoxes.forEach(box=>{console.log(box.value)
  selectedFiles.push(box.value)
  })
  peer.send(JSON.stringify(selectedFiles))
  status="file info"
  form.innerHTML=""
}
let files;
peer.on("connect", () => {
  console.log("Peer Connected");

  const input = document.getElementById("file-input");

  // Event listener on the file input
  input.addEventListener("change", () => {
    files = input.files;
    let filesInfo = [...files].map((file) => ({
      name: file.name,
      size: file.size,
    }));
    console.log(filesInfo);
    status="send file"
    peer.send(JSON.stringify({filesInfo}));

  });
});

  let fileInfo,
  fileChunks = [],
  totalDownloaded = 0,
  form=document.querySelector('#filesForm')
  filesDownloaded=0;
peer.on("data", (data) => {
  console.log("Some data is coming,status:",status );

  if (data.toString() === "Done!") {
    console.log("Full file received");
    let add = 0;
    fileChunks.forEach((chunk) => (add += chunk.byteLength));
    console.log(add);
    // Convert the file back to Blob
    const file = new Blob(fileChunks);

    console.log("Received", file);
    
    //download(file, fileInfo.name);
    filesDownloaded++;
    totalDownloaded = 0;
    fileChunks = [];
    if(filesDownloaded===selectedFiles.length){
      status ="files info";
      filesDownloaded=0;
      selectedFiles=[];
    }
    else status="file info" 

    let div=document.createElement('div')
    div.innerText=`${fileInfo.name} has been downloaded`
    message.appendChild(div)
    return;
  }
  if (status === "files info") {
    let info = JSON.parse(data.toString());
    console.log(info);
    info.filesInfo.forEach(file=>{
      let checkbox=document.createElement('input',{name:'fileBox',type:'checkbox',value:file.name,id:file.name})
      checkbox.setAttribute('name','fileBox')
      checkbox.setAttribute('type','checkbox')
      checkbox.setAttribute('value',file.name)
      checkbox.setAttribute('id',file.name)

      let label=document.createElement('label')
      label.setAttribute("for",file.name)
      let text=document.createTextNode(file.name);
      label.appendChild(text) 
      form.appendChild(label)
      label=document.querySelector(`[for="${file.name}"]`);
      form.insertBefore(checkbox,label)
      form.appendChild(document.createElement('br'))
     
    })
    let submitBtn=document.createElement('button')
    submitBtn.setAttribute('type','button')
    submitBtn.appendChild(document.createTextNode("Download"))
    submitBtn.setAttribute('onclick',"handleDownload()")
    form.appendChild(submitBtn)

  } else if (status === "file info") {
    console.log(data.toString());
    fileInfo = JSON.parse(data.toString());
    console.log(fileInfo);
    status = "Receive file";
    percentage.style.display = "block";
  } else if (status === "send file") {
    let selectedFiles=JSON.parse(data.toString())
    console.log(selectedFiles);
    files=[...files].filter(file=>selectedFiles.includes(file.name))
    console.log(files);
    files.forEach(file=>{
     // status="file info"
      console.log("Sending", file);
      
     
      file.arrayBuffer().then((buffer) => {
        const chunkSize = 16 * 1024;
  
        // Keep chunking, and sending the chunks to the other peer
        while (buffer.byteLength) {
          if(buffer.byteLength===file.size)
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
      });
    })
    status = "files info"
  } else if (status === "Receive file") {
    totalDownloaded =
      ((fileChunks.length * 16384 + data.length) / fileInfo.size) * 100;
    fileChunks.push(data);
    percentage.innerText = Math.round(totalDownloaded) + "%";
    console.log(totalDownloaded);
  }
});
