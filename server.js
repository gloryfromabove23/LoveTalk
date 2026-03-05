const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// CHANGED: Look in the current folder instead of 'public'
app.use(express.static(__dirname));

let users = {}; 

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Matches the frontend "setName" call
    socket.on('setName', (name) => {
        users[socket.id] = { name, room: "Main Lounge" }; // Default room
        socket.join("Main Lounge");
        
        // Send updated list to everyone
        io.emit('updateUsers', Object.values(users));
        console.log(`${name} joined the lounge`);
    });

    socket.on('chatMessage', (data) => {
        const user = users[socket.id];
        if(user){
            // Send message to everyone in the room
            io.to(user.room).emit('message', `${user.name}: ${data.msg}`);
        }
    });

    // WebRTC Signaling for Calls
    socket.on('webrtc-offer', ({ offer, targetId }) => {
        io.to(targetId).emit('incoming-call', {
            offer,
            from: socket.id,
            name: users[socket.id]?.name || "Someone"
        });
    });

    socket.on('call-accepted', ({ targetId, answer }) => {
        io.to(targetId).emit('webrtc-answer', {
            answer,
            from: socket.id
        });
    });

    socket.on('disconnect', () => {
        if (users[socket.id]) {
            console.log(`${users[socket.id].name} left`);
            delete users[socket.id];
            io.emit('updateUsers', Object.values(users));
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`LoveTalk running on http://localhost:${PORT}`));
