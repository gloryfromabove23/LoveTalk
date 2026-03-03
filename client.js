const socket = io();

let name = '';
let currentRoom = '';
let pc = null; // WebRTC PeerConnection
let localStream = null;

const nameInputDiv = document.getElementById('nameInputDiv');
const nameInput = document.getElementById('nameInput');
const nameBtn = document.getElementById('nameBtn');

const mainDiv = document.getElementById('main');
const roomsBtns = document.querySelectorAll('#rooms button');
const messages = document.getElementById('messages');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const userList = document.getElementById('userList');

const callBtn = document.getElementById('callBtn');
const hangupBtn = document.getElementById('hangupBtn');
const autoCall = document.getElementById('autoCall');

///////////////////////
// Name input
nameBtn.onclick = () => {
    const val = nameInput.value.trim();
    if(val){
        name = val;
        socket.emit('setName', name);
        nameInputDiv.style.display = 'none';
        mainDiv.style.display = 'flex';
    }
};

///////////////////////
// Join room
roomsBtns.forEach(btn=>{
    btn.onclick = () => {
        const room = btn.dataset.room;
        currentRoom = room;
        socket.emit('joinRoom', room);
        addMessage(`💖 You joined ${room}`);
    };
});

///////////////////////
// Chat messages
sendBtn.onclick = () => {
    const msg = msgInput.value.trim();
    if(msg) {
        socket.emit('chatMessage', { msg });
        msgInput.value='';
    }
};

socket.on('message', msg=>{
    addMessage(msg);
});

function addMessage(msg){
    const p = document.createElement('p');
    p.textContent = msg;
    messages.appendChild(p);
    messages.scrollTop = messages.scrollHeight;
}

///////////////////////
// Live users
socket.on('updateUsers', users=>{
    userList.innerHTML='';
    users.forEach(u=>{
        const div = document.createElement('div');
        div.className='userItem';
        div.textContent = u.name;
        userList.appendChild(div);
    });
});

///////////////////////
// Voice Call
callBtn.onclick = async () => {
    localStream = await navigator.mediaDevices.getUserMedia({ audio:true });
    pc = createPeerConnection();
    localStream.getTracks().forEach(track=>pc.addTrack(track, localStream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // send offer to all other users in room
    const usersInRoom = Array.from(document.querySelectorAll('.userItem')).map(u=>u.textContent);
    usersInRoom.forEach(u=> socket.emit('webrtc-offer', { offer, targetId: u.socketId }));
};

hangupBtn.onclick = () => {
    if(pc){
        pc.close();
        pc=null;
    }
    if(localStream){
        localStream.getTracks().forEach(t=>t.stop());
        localStream=null;
    }
};

function createPeerConnection(){
    const pc = new RTCPeerConnection();

    pc.onicecandidate = e=>{
        if(e.candidate){
            // send candidate to other peer
        }
    };

    pc.ontrack = e=>{
        const audio = document.createElement('audio');
        audio.srcObject = e.streams[0];
        audio.autoplay = true;
        document.body.appendChild(audio);
    };

    return pc;
}
