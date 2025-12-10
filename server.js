const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path');

app.use(express.static(__dirname));

const rooms = {};

function generateRoomId() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Create Room
    socket.on('create_room', (maxPlayers) => {
        const roomId = generateRoomId();
        rooms[roomId] = {
            id: roomId,
            maxPlayers: maxPlayers,
            players: [socket.id],
            drawerIndex: 0,
            gameStarted: false,
            turnRequest: null // { requester: socketId }
        };
        socket.join(roomId);
        socket.emit('room_created', roomId);
        console.log(`Room ${roomId} created by ${socket.id}`);
    });

    // Join Room
    socket.on('join_room', (roomId) => {
        const room = rooms[roomId];
        if (room) {
            if (room.players.length < room.maxPlayers) {
                room.players.push(socket.id);
                socket.join(roomId);

                // Notify everyone in room except sender (though sender needs to know too)
                // Actually, let's just confirm to sender
                socket.emit('joined_room', roomId);

                // If room is full, start game
                if (room.players.length >= 2 && !room.gameStarted) {
                    startGame(roomId);
                } else if (room.gameStarted) {
                    // Rejoining or late joining? simpler to just spectate
                    // Send current state
                    socket.emit('game_state', {
                        isDrawer: false,
                        drawerId: room.players[room.drawerIndex]
                    });
                }
            } else {
                socket.emit('error', 'Room is full');
            }
        } else {
            socket.emit('error', 'Invalid Room Code');
        }
    });

    function startGame(roomId) {
        const room = rooms[roomId];
        room.gameStarted = true;
        // Pick random drawer
        room.drawerIndex = Math.floor(Math.random() * room.players.length);
        const drawerId = room.players[room.drawerIndex];

        io.to(roomId).emit('game_started', {
            drawerId: drawerId
        });

        console.log(`Game started in ${roomId}, drawer: ${drawerId}`);
    }

    // Drawing Event
    socket.on('draw', (data) => {
        // data contains { x, y, type: 'start'|'drag'|'end', color, width }
        // Broadcast to others in the room
        const room = Object.values(rooms).find(r => r.players.includes(socket.id));
        if (room) {
            // Only allow current drawer to draw
            if (socket.id === room.players[room.drawerIndex]) {
                socket.to(room.id).emit('draw', data);
            }
        }
    });

    // Clear Event
    socket.on('clear', () => {
        const room = Object.values(rooms).find(r => r.players.includes(socket.id));
        if (room && socket.id === room.players[room.drawerIndex]) {
            socket.to(room.id).emit('clear');
        }
    });

    // Request Turn
    socket.on('request_turn', () => {
        const room = Object.values(rooms).find(r => r.players.includes(socket.id));
        if (room) {
            const drawerId = room.players[room.drawerIndex];
            // Notify drawer that this user wants a turn
            io.to(drawerId).emit('turn_requested', { requesterId: socket.id });
        }
    });

    // Turn Response
    socket.on('turn_response', (data) => {
        const { requesterId, accepted } = data;
        const room = Object.values(rooms).find(r => r.players.includes(socket.id));
        if (room && socket.id === room.players[room.drawerIndex]) {
            if (accepted) {
                // Find index of requester
                const newDrawerIndex = room.players.indexOf(requesterId);
                if (newDrawerIndex !== -1) {
                    room.drawerIndex = newDrawerIndex;
                    io.to(room.id).emit('turn_change', { drawerId: requesterId });
                }
            } else {
                // Notify requester it was rejected
                io.to(requesterId).emit('turn_rejected');
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Handle cleanup, maybe end game or remove player
        for (const roomId in rooms) {
            const room = rooms[roomId];
            const index = room.players.indexOf(socket.id);
            if (index !== -1) {
                room.players.splice(index, 1);
                // If room empty, delete
                if (room.players.length === 0) {
                    delete rooms[roomId];
                } else {
                    // If drawer left, pick new one or end?
                    if (index === room.drawerIndex) {
                        // Simple logic: reset game or pick next
                        startGame(roomId);
                    }
                }
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
