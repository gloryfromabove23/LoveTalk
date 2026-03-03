// client.js
document.addEventListener('DOMContentLoaded', () => {

    // ------------------- DOM Elements -------------------
    const heartElement = document.getElementById('heartLogo');
    const socket = io();

    let name = '';
    let currentRoom = '';
    let pc = null;
    let localStream = null;
    let incomingOffer = null;
    let callerSocketId = null;

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

    const incomingPopup = document.getElementById('incomingCallPopup');
    const callerName = document.getElementById('callerName');
    const acceptCallBtn = document.getElementById('acceptCall');
    const declineCallBtn = document.getElementById('declineCall');
    const callingStatus = document.getElementById('callingStatus');

    // ------------------- Join Button -------------------
    nameBtn.onclick = () => {
        const val = nameInput.value.trim();
        if(val){
            name = val;
            socket.emit('setName', name);
            nameInputDiv.style.display = 'none';
            mainDiv.style.display = 'flex';
        }
    };

    // ------------------- Rooms -------------------
    roomsBtns.forEach(btn => {
        btn.onclick = () => {
            const room = btn.dataset.room;
            currentRoom = room;
            socket.emit('joinRoom', room);
            addMessage(`💖 You joined ${room}`);
        };
    });

    // ------------------- Chat -------------------
    sendBtn.onclick = () => {
        const msg = msgInput.value.trim();
        if(msg){
            socket.emit('chatMessage', { msg });
            msgInput.value = '';
        }
    };

    socket.on('message', msg => {
        addMessage(msg);
    });

    function addMessage(msg){
        const p = document.createElement('p');
        p.textContent = msg;
        messages.appendChild(p);
        messages.scrollTop = messages.scrollHeight;
    }

    // ------------------- Live Users -------------------
    socket.on('updateUsers', users => {
        userList.innerHTML = '';
        users
          .filter(u => u.room === currentRoom)
          .forEach(u => {
            if(u.socketId === socket.id) return; // skip yourself

            const wrapper = document.createElement('div');
            wrapper.className = 'userItem';

            const nameDiv = document.createElement('div');
            nameDiv.textContent = u.name;
            nameDiv.style.cursor = 'pointer';

            const actionBar = document.createElement('div');
            actionBar.style.display = 'none';
            actionBar.style.marginTop = '5px';

            const callUserBtn = document.createElement('button');
            callUserBtn.textContent = '📞 Call';
            callUserBtn.onclick = () => startCall(u.socketId);

            const friendBtn = document.createElement('button');
            friendBtn.textContent = '🤝 Friend';
            friendBtn.onclick = () => alert(`Friend request sent to ${u.name}`);

            actionBar.appendChild(callUserBtn);
            actionBar.appendChild(friendBtn);

            nameDiv.onclick = () => {
                actionBar.style.display = actionBar.style.display === 'none' ? 'block' : 'none';
            };

            wrapper.appendChild(nameDiv);
            wrapper.appendChild(actionBar);

            userList.appendChild(wrapper);
        });
    });

    // ------------------- Voice Call -------------------
    async function startCall(targetSocketId){
        callingStatus.style.display = 'block';

        localStream = await navigator.mediaDevices.getUserMedia({ audio:true });
        startVoiceDetection(localStream);

        pc = createPeerConnection();

        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('webrtc-offer', { offer, targetId: targetSocketId });
    }

    hangupBtn.onclick = () => {
        if(pc){
            pc.close();
            pc = null;
        }
        if(localStream){
            localStream.getTracks().forEach(t => t.stop());
            localStream = null;
        }
        stopVoiceDetection();
        callingStatus.style.display = 'none';
    };

    // ------------------- Incoming Call -------------------
    socket.on('incoming-call', ({ offer, from, name }) => {
        incomingOffer = offer;
        callerSocketId = from;
        callerName.textContent = `📞 ${name} is calling...`;
        incomingPopup.style.display = 'block';
    });

    acceptCallBtn.onclick = async () => {
        incomingPopup.style.display = 'none';

        localStream = await navigator.mediaDevices.getUserMedia({ audio:true });
        startVoiceDetection(localStream);

        pc = createPeerConnection();
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

        await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('call-accepted', { targetId: callerSocketId, answer });
    };

    declineCallBtn.onclick = () => {
        incomingPopup.style.display = 'none';
        socket.emit('call-declined', { targetId: callerSocketId });
    };

    socket.on('call-declined', () => {
        callingStatus.style.display = 'none';
        alert('Call declined');
    });

    socket.on('webrtc-answer', async ({ answer }) => {
        callingStatus.style.display = 'none';
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // ------------------- WebRTC Peer -------------------
    function createPeerConnection(){
        const pc = new RTCPeerConnection();

        pc.onicecandidate = e => {
            if(e.candidate){
                // TODO: send ICE candidate via socket
            }
        };

        pc.ontrack = e => {
            const audio = document.createElement('audio');
            audio.srcObject = e.streams[0];
            audio.autoplay = true;
            document.body.appendChild(audio);
        };

        return pc;
    }

    // ------------------- Voice Activity Detection -------------------
    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let dataArray = null;
    let animationFrameId = null;

    function startVoiceDetection(stream){
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        analyser.fftSize = 512;

        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        function detect(){
            analyser.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((a,b) => a+b, 0) / dataArray.length;

            if(avg > 15){
                heartElement.classList.add('bouncing');
            } else {
                heartElement.classList.remove('bouncing');
            }

            animationFrameId = requestAnimationFrame(detect);
        }

        detect();
    }

    function stopVoiceDetection(){
        if(animationFrameId) cancelAnimationFrame(animationFrameId);
        if(audioContext) audioContext.close();
        heartElement.classList.remove('bouncing');
    }

});
