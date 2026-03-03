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

    users
      .filter(u => u.room === currentRoom) // only show same room
      .forEach(u=>{
        if(u.socketId === socket.id) return; // don't show yourself

        const wrapper = document.createElement('div');
        wrapper.className='userItem';

        const nameDiv = document.createElement('div');
        nameDiv.textContent = u.name;
        nameDiv.style.cursor = "pointer";

        const actionBar = document.createElement('div');
        actionBar.style.display='none';
        actionBar.style.marginTop='5px';

        const callUserBtn = document.createElement('button');
        callUserBtn.textContent='📞 Call';
        callUserBtn.onclick = ()=> startCall(u.socketId);

        const friendBtn = document.createElement('button');
        friendBtn.textContent='🤝 Friend';
        friendBtn.onclick = ()=> alert(`Friend request sent to ${u.name}`);

        actionBar.appendChild(callUserBtn);
        actionBar.appendChild(friendBtn);

        nameDiv.onclick = ()=>{
            actionBar.style.display =
              actionBar.style.display==='none' ? 'block':'none';
        };

        wrapper.appendChild(nameDiv);
        wrapper.appendChild(actionBar);

        userList.appendChild(wrapper);
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
