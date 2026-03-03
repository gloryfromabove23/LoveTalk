const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let users = {}; // { socketId: { name, room } }

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Set user info
    socket.on('setName', (name) => {
        users[socket.id] = { name, room: null };
        io.emit('updateUsers', Object.values(users));
    });

    // Join room
    socket.on('joinRoom', (room) => {
        if (users[socket.id]) {
            const prevRoom = users[socket.id].room;
            if(prevRoom) socket.leave(prevRoom);

            users[socket.id].room = room;
            socket.join(room);
            io.to(room).emit('message', `💖 ${users[socket.id].name} joined ${room}`);
            io.emit('updateUsers',
               Object.entries(users).map(([id, data]) => ({
                 socketId: id,
                 name: data.name,
                 room: data.room
             }))
);
        }
    });

    // Text chat
    socket.on('chatMessage', ({ msg }) => {
        const user = users[socket.id];
        if(user && user.room){
            io.to(user.room).emit('message', `${user.name}: ${msg}`);
        }
    });

    // WebRTC signaling
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

socket.on('call-declined', ({ targetId }) => {
    io.to(targetId).emit('call-declined');
});

    // Disconnect
    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('updateUsers',
  Object.entries(users).map(([id, data]) => ({
    socketId: id,
    name: data.name,
    room: data.room
  }))
);
        console.log('User disconnected:', socket.id);
    });
});

server.listen(3000, () => console.log('LoveTalk running on http://localhost:3000'));
