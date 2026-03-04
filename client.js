document.addEventListener('DOMContentLoaded', () => {
    const heartElement = document.getElementById('heartEmoji');
    const socket = io();

    let name = '';
    let pc = null;
    let localStream = null;
    let incomingOffer = null;
    let callerSocketId = null;

    const nameInputDiv = document.getElementById('nameInputDiv');
    const nameInput = document.getElementById('nameInput');
    const nameBtn = document.getElementById('nameBtn');
    const mainDiv = document.getElementById('main');

    const messages = document.getElementById('messages');
    const msgInput = document.getElementById('msgInput');
    const sendBtn = document.getElementById('sendBtn');
    const userList = document.getElementById('userList');

    const randomCallBtn = document.getElementById('newChat'); // use newChat button for random call
    const autoCallChk = document.getElementById('autoCall');

    const incomingPopup = document.getElementById('incomingCallPopup');
    const callerName = document.getElementById('callerName');
    const acceptCallBtn = document.getElementById('acceptCall');
    const declineCallBtn = document.getElementById('declineCall');
    const callingStatus = document.getElementById('callingStatus');

    // ------------------- Join -------------------
    nameBtn.onclick = () => {
        const val = nameInput.value.trim();
        if(val){
            name = val;
            socket.emit('setName', name);
            nameInputDiv.style.display = 'none';
            mainDiv.style.display = 'flex';
        }
    };

    // ------------------- Chat -------------------
    sendBtn.onclick = () => {
        const msg = msgInput.value.trim();
        if(msg){
            socket.emit('chatMessage', { msg });
            msgInput.value = '';
        }
    };

    socket.on('message', msg => addMessage(msg));
    function addMessage(msg){
        const p = document.createElement('p');
        p.textContent = msg;
        messages.appendChild(p);
        messages.scrollTop = messages.scrollHeight;
    }

    // ------------------- Live Users -------------------
    socket.on('updateUsers', users => {
        userList.innerHTML = '';
        users.forEach(u => {
            if(u.socketId === socket.id) return;
            const wrapper = document.createElement('div');
            wrapper.className = 'userItem ' + (u.online ? 'online':'');
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

    // ------------------- Random Call -------------------
    randomCallBtn.onclick = () => {
        socket.emit('random-call-request');
        callingStatus.style.display = 'block';
    };

    socket.on('random-call-target', targetSocketId => {
        if(targetSocketId && targetSocketId !== socket.id){
            startCall(targetSocketId);
        } else {
            callingStatus.style.display = 'none';
            alert('No available users right now.');
        }
    });

    // ------------------- Voice Call -------------------
    async function startCall(targetSocketId){
        try{
            localStream = await navigator.mediaDevices.getUserMedia({ audio:true });
            startVoiceDetection(localStream);

            pc = createPeerConnection();

            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit('webrtc-offer', { offer, targetId: targetSocketId });
        } catch(e){
            console.error('Error starting call', e);
            alert('Failed to start call. Check your microphone permissions.');
        }
    }

    // ------------------- Hangup -------------------
    function endCall(){
        if(pc){ pc.close(); pc=null; }
        if(localStream){ localStream.getTracks().forEach(t => t.stop()); localStream=null; }
        stopVoiceDetection();
        callingStatus.style.display = 'none';
    }

    // ------------------- Incoming Call -------------------
    socket.on('incoming-call', ({ offer, from, name }) => {
        incomingOffer = offer;
        callerSocketId = from;
        callerName.textContent = `📞 ${name} is calling...`;
        incomingPopup.style.display = 'block';
    });

    acceptCallBtn.onclick = async () => {
        incomingPopup.style.display = 'none';
        try{
            localStream = await navigator.mediaDevices.getUserMedia({ audio:true });
            startVoiceDetection(localStream);

            pc = createPeerConnection();
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

            await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('call-accepted', { targetId: callerSocketId, answer });
        } catch(e){
            console.error('Error accepting call', e);
        }
    };

    declineCallBtn.onclick = () => {
        incomingPopup.style.display = 'none';
        socket.emit('call-declined', { targetId: callerSocketId });
    };

    socket.on('call-declined', () => {
        endCall();
        alert('Call declined');
    });

    socket.on('webrtc-answer', async ({ answer }) => {
        endCallingStatus();
        if(pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    function endCallingStatus(){
        callingStatus.style.display = 'none';
    }

    // ------------------- WebRTC Peer -------------------
    function createPeerConnection(){
        const pc = new RTCPeerConnection();

        pc.onicecandidate = e => {
            if(e.candidate){
                socket.emit('ice-candidate', { candidate:e.candidate, targetId:callerSocketId });
            }
        };

        pc.ontrack = e => {
            let audio = document.getElementById('remoteAudio');
            if(!audio){
                audio = document.createElement('audio');
                audio.id = 'remoteAudio';
                audio.autoplay = true;
                document.body.appendChild(audio);
            }
            audio.srcObject = e.streams[0];
        };

        return pc;
    }

    socket.on('ice-candidate', ({ candidate }) => {
        if(pc) pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    // ------------------- Voice Activity Detection -------------------
    let audioContext=null, analyser=null, microphone=null, dataArray=null, animationFrameId=null;
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
            const avg = dataArray.reduce((a,b)=>a+b)/dataArray.length;
            if(avg>15){
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
