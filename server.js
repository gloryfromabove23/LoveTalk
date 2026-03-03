const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('joinRoom', (room) => {
        socket.join(room);
        console.log(`${socket.id} joined room ${room}`);
        socket.to(room).emit('message', '💖 A new user joined the chat!');
    });

    socket.on('chatMessage', ({ room, msg }) => {
        io.to(room).emit('message', msg);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(3000, () => {
    console.log('LoveTalk server running on http://localhost:3000');
});
