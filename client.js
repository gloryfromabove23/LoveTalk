const socket = io();

const loginDiv = document.getElementById('loginDiv');
const mainDiv = document.getElementById('mainDiv');
const nameInput = document.getElementById('nameInput');
const picInput = document.getElementById('picInput');
const loginBtn = document.getElementById('loginBtn');

const profilePic = document.getElementById('profilePic');
const usernameDiv = document.getElementById('username');

loginBtn.onclick = async () => {
    const name = nameInput.value.trim();
    if(!name) return;

    let picPath = '';
    if(picInput.files[0]){
        const formData = new FormData();
        formData.append('picture', picInput.files[0]);
        const res = await fetch('/upload', { method:'POST', body:formData });
        const data = await res.json();
        picPath = data.filePath;
    }

    profilePic.src = picPath;
    usernameDiv.textContent = name;

    socket.emit('createUser', { name, picture: picPath });

    loginDiv.style.display = 'none';
    mainDiv.style.display = 'flex';
};

// Voice glow (prototype using random values)
const voiceGlow = document.getElementById('voiceGlow');
voiceGlow.width = 250;
voiceGlow.height = 250;
const ctx = voiceGlow.getContext('2d');

function drawGlow(){
    ctx.clearRect(0,0,voiceGlow.width,voiceGlow.height);
    ctx.beginPath();
    ctx.arc(125,125,120,0,Math.PI*2);
    const intensity = Math.random()*5 + 5; // placeholder for mic level
    ctx.shadowBlur = intensity*10;
    ctx.shadowColor = '#ff69b4';
    ctx.strokeStyle = '#ff69b4';
    ctx.lineWidth = 5;
    ctx.stroke();
    requestAnimationFrame(drawGlow);
}
drawGlow();

// Heart reaction
const heartBtn = document.getElementById('heartBtn');
heartBtn.onclick = () => {
    const heart = document.createElement('div');
    heart.textContent = '💗';
    heart.style.position='absolute';
    heart.style.left='50%';
    heart.style.top='50%';
    heart.style.transform='translate(-50%,-50%)';
    heart.style.fontSize='24px';
    heart.style.animation='floatHeart 2s ease-out';
    document.body.appendChild(heart);
    setTimeout(()=>heart.remove(),2000);
};

const style = document.createElement('style');
style.innerHTML = `
@keyframes floatHeart {
    0% { transform: translate(-50%,-50%) scale(1); opacity:1; }
    100% { transform: translate(-50%,-150%) scale(2); opacity:0; }
}`;
document.head.appendChild(style);
