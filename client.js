const socket = io();

const joinBtn = document.getElementById('joinBtn');
const roomInput = document.getElementById('roomInput');
const chatArea = document.getElementById('chatArea');
const messages = document.getElementById('messages');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');

let currentRoom = '';

joinBtn.addEventListener('click', () => {
    const room = roomInput.value.trim();
    if(room) {
        currentRoom = room;
        socket.emit('joinRoom', room);
        chatArea.style.display = 'block';
        joinBtn.disabled = true;
        roomInput.disabled = true;
    }
});

sendBtn.addEventListener('click', () => {
    const msg = msgInput.value.trim();
    if(msg && currentRoom) {
        socket.emit('chatMessage', { room: currentRoom, msg: `💌 ${msg}` });
        msgInput.value = '';
    }
});

socket.on('message', (msg) => {
    const p = document.createElement('p');
    p.textContent = msg;
    messages.appendChild(p);
    messages.scrollTop = messages.scrollHeight;
});
