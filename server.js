const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static(__dirname));

// --- Game Constants & Data ---
const WORDS = [
    "Apple", "Banana", "Car", "Dog", "Elephant", "Fish", "Guitar", "House", "Ice Cream",
    "Jacket", "Kite", "Lion", "Moon", "Nose", "Octopus", "Pizza", "Queen", "Rainbow",
    "Sun", "Tree", "Umbrella", "Violin", "Watch", "X-ray", "Yo-yo", "Zebra",
    "Airplane", "Ball", "Cat", "Drum", "Egg", "Flower", "Ghost", "Hat", "Igloo",
    "Jellyfish", "Key", "Lamp", "Mouse", "Nest", "Owl", "Pen", "Robot", "Snake",
    "Train", "Unicorn", "Volcano", "Whale", "Yacht", "Zip"
];

const GAME_SETTINGS = {
    MAX_ROUNDS: 3,
    TIME_CHOOSING: 10,
    TIME_DRAWING: 60,
    TIME_INTERMISSION: 5
};

// --- Room State Management ---
const rooms = {};

function generateRoomId() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function getRandomWords(count = 3) {
    const shuffled = WORDS.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// --- Game Logic Classes ---

// --- Game Logic Classes ---

class GameRoom {
    constructor(id, maxPlayers, hostName, hostId, maxRounds = 5, isPublic = false) {
        this.id = id;
        this.maxPlayers = maxPlayers;
        this.maxRounds = maxRounds;
        this.isPublic = isPublic;
        this.players = []; // Array of { id, name, score, avatar, guessed }
        this.addPlayer(hostId, hostName);

        // Game State
        this.state = 'LOBBY';
        this.round = 1;
        this.drawerIndex = 0;
        this.currentWord = "";
        this.timer = null;
        this.timeLeft = 0;
        this.canvasState = [];
    }

    addPlayer(id, name) {
        this.players.push({
            id,
            name,
            score: 0,
            guessed: false
        });
    }

    removePlayer(id) {
        const index = this.players.findIndex(p => p.id === id);
        if (index !== -1) {
            this.players.splice(index, 1);
            if (index < this.drawerIndex) {
                this.drawerIndex--;
            }
        }
        return this.players.length === 0;
    }

    broadcast(event, data) {
        io.to(this.id).emit(event, data);
    }

    broadcastPlayerList() {
        this.broadcast("update_players", {
            players: this.players,
            drawerId: this.getDrawer()?.id,
            state: this.state
        });
    }

    getDrawer() {
        if (this.players.length === 0) return null;
        return this.players[this.drawerIndex % this.players.length];
    }

    nextTurn() {
        this.drawerIndex = (this.drawerIndex + 1) % this.players.length;
        if (this.drawerIndex === 0) {
            this.round++;
        }
    }

    startGame() {
        if (this.players.length < 2) return;
        this.round = 1;
        this.drawerIndex = 0;
        this.canvasState = [];
        this.startChoosingPhase();
    }

    startChoosingPhase() {
        if (this.round > this.maxRounds) {
            this.endGame();
            return;
        }

        this.state = 'CHOOSING';
        this.currentWord = "";
        this.resetGuesses();
        this.canvasState = [];
        this.broadcast("clear_canvas");

        const drawer = this.getDrawer();
        const words = getRandomWords(3);

        this.broadcast("state_update", {
            state: 'CHOOSING',
            round: this.round,
            drawerId: drawer.id,
            drawerName: drawer.name,
            timeLeft: GAME_SETTINGS.TIME_CHOOSING
        });

        io.to(drawer.id).emit("choose_word", words);

        this.startTimer(GAME_SETTINGS.TIME_CHOOSING, () => {
            if (this.state === 'CHOOSING') {
                this.startDrawingPhase(words[0]);
            }
        });
    }

    startDrawingPhase(word) {
        this.state = 'DRAWING';
        this.currentWord = word;
        this.timeLeft = GAME_SETTINGS.TIME_DRAWING;

        const masked = word.split('').map(c => c === ' ' ? ' ' : '_').join('');

        this.broadcast("state_update", {
            state: 'DRAWING',
            wordLength: word.length,
            maskedWord: masked,
            timeLeft: this.timeLeft,
            drawerId: this.getDrawer().id,
            drawerName: this.getDrawer().name
        });

        const drawer = this.getDrawer();
        io.to(drawer.id).emit("your_word", word);

        this.startTimer(GAME_SETTINGS.TIME_DRAWING, () => {
            this.endTurn();
        });
    }

    endTurn() {
        this.state = 'INTERMISSION';
        this.broadcast("state_update", {
            state: 'INTERMISSION',
            word: this.currentWord,
            drawerName: this.getDrawer()?.name || "Unknown",
            timeLeft: GAME_SETTINGS.TIME_INTERMISSION
        });

        this.startTimer(GAME_SETTINGS.TIME_INTERMISSION, () => {
            if (this.players.length < 2) {
                this.state = 'LOBBY';
                this.broadcast("state_update", { state: 'LOBBY' });
                return;
            }
            this.nextTurn();
            this.startChoosingPhase();
        });
    }

    endGame() {
        this.state = 'GAME_OVER';
        const sorted = [...this.players].sort((a, b) => b.score - a.score);
        this.broadcast("game_over", sorted);

        setTimeout(() => {
            if (this.players.length > 0) {
                this.state = 'LOBBY';
                this.players.forEach(p => { p.score = 0; p.guessed = false; });
                this.broadcast("reset_lobby");
                this.broadcastPlayerList();
            }
        }, 10000);
    }

    resetGuesses() {
        this.players.forEach(p => p.guessed = false);
    }

    startTimer(seconds, onComplete) {
        if (this.timer) clearInterval(this.timer);
        this.timeLeft = seconds;

        this.timer = setInterval(() => {
            this.timeLeft--;
            io.to(this.id).emit("timer_update", this.timeLeft);

            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                if (onComplete) onComplete();
            }
        }, 1000);
    }

    handleGuess(playerId, text) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || this.state !== 'DRAWING') return false;

        if (player.id === this.getDrawer().id) return false;
        if (player.guessed) return false;

        const guess = text.trim().toLowerCase();
        const answer = this.currentWord.toLowerCase();

        if (guess === answer) {
            player.guessed = true;
            const score = Math.max(100, Math.ceil((this.timeLeft / GAME_SETTINGS.TIME_DRAWING) * 500));
            player.score += score;

            const drawer = this.players.find(p => p.id === this.getDrawer().id);
            if (drawer) drawer.score += 50;

            this.broadcast("player_correct", {
                playerId: player.id,
                name: player.name,
                scoreOffset: score
            });

            this.broadcastPlayerList();

            const guessers = this.players.filter(p => p.id !== this.getDrawer().id);
            if (guessers.every(p => p.guessed)) {
                clearInterval(this.timer);
                this.endTurn();
            }

            return true;
        } else {
            if (this.levenshtein(guess, answer) <= 2 && answer.length > 4) {
                io.to(playerId).emit("close_guess", text);
            }
            return false;
        }
    }

    levenshtein(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
        for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) == a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                }
            }
        }
        return matrix[b.length][a.length];
    }
}

// --- Socket Connection ---

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_room', ({ players, username, rounds, isPublic }) => {
        const roomId = generateRoomId();
        const room = new GameRoom(roomId, parseInt(players), username, socket.id, parseInt(rounds) || 5, isPublic);
        rooms[roomId] = room;

        socket.join(roomId);
        socket.emit('room_created', roomId);
        room.broadcastPlayerList();
    });

    socket.on('quick_join', ({ username }) => {
        // Find public room with space
        const availableRoom = Object.values(rooms).find(r => r.isPublic && r.players.length < r.maxPlayers);

        if (availableRoom) {
            joinRoomLogic(socket, availableRoom, username);
        } else {
            socket.emit('error', 'No public rooms available. Create one!');
        }
    });

    socket.on('join_room', ({ code, username }) => {
        const room = rooms[code];
        if (room) {
            // Allow join if room not full, even if game started
            if (room.players.length < room.maxPlayers) {
                const isLateJoin = room.state !== 'LOBBY';

                room.addPlayer(socket.id, username);
                socket.join(code);

                socket.emit('joined_room', code);
                room.broadcastPlayerList();

                // If joining mid-game, Update state for this user
                if (isLateJoin) {
                    // Send basic game info
                    let masked = "";
                    if (room.currentWord) {
                        masked = room.currentWord.split('').map(c => c === ' ' ? ' ' : '_').join('');
                    }

                    socket.emit("state_update", {
                        state: room.state,
                        round: room.round,
                        drawerId: room.getDrawer()?.id,
                        drawerName: room.getDrawer()?.name,
                        timeLeft: room.timeLeft,
                        maskWords: masked,
                        wordLength: room.currentWord.length
                    });

                    // Send canvas history
                    if (room.canvasState.length > 0) {
                        // We are not saving canvasState yet in draw event, lets fix that next?
                        // Actually, for now, just letting them see new strokes is fine, 
                        // but ideally we replay.
                    }
                }

                // If in lobby and now we have enough players/admin wants, they can start
            } else {
                socket.emit('error', 'Room is full');
            }
        } else {
            socket.emit('error', 'Invalid Room Code');
        }
    });

    function joinRoomLogic(socket, room, username) {
        if (room.players.length < room.maxPlayers) {
            const isLateJoin = room.state !== 'LOBBY';

            room.addPlayer(socket.id, username);
            socket.join(room.id);

            socket.emit('joined_room', room.id);
            room.broadcastPlayerList();

            // Auto-start public rooms when 2nd player joins
            if (room.isPublic && room.state === 'LOBBY' && room.players.length === 2) {
                room.startGame();
            }

            if (isLateJoin) {
                let masked = "";
                if (room.currentWord) {
                    masked = room.currentWord.split('').map(c => c === ' ' ? ' ' : '_').join('');
                }

                socket.emit("state_update", {
                    state: room.state,
                    round: room.round,
                    drawerId: room.getDrawer()?.id,
                    drawerName: room.getDrawer()?.name,
                    timeLeft: room.timeLeft,
                    maskWords: masked,
                    wordLength: room.currentWord ? room.currentWord.length : 0
                });
            }
        } else {
            socket.emit('error', 'Room is full');
        }
    }

    socket.on('word_selected', (word) => {
        const room = getRoom(socket);
        if (room && room.getDrawer().id === socket.id && room.state === 'CHOOSING') {
            room.startDrawingPhase(word);
        }
    });

    socket.on('start_game', () => {
        const room = getRoom(socket);
        if (room && room.state === 'LOBBY' && room.players.length >= 2) {
            room.startGame();
        }
    });

    socket.on('draw', (data) => {
        const room = getRoom(socket);
        if (room && room.state === 'DRAWING' && room.getDrawer().id === socket.id) {
            socket.to(room.id).emit('draw', data);
        }
    });

    socket.on('clear', () => {
        const room = getRoom(socket);
        if (room && room.state === 'DRAWING' && room.getDrawer().id === socket.id) {
            socket.to(room.id).emit('clear');
        }
    });

    socket.on('send_message', (text) => {
        const room = getRoom(socket);
        if (!room) return;

        const isCorrect = room.handleGuess(socket.id, text);

        if (!isCorrect) {
            const player = room.players.find(p => p.id === socket.id);
            io.to(room.id).emit('chat_message', {
                name: player ? player.name : "Unknown",
                text: text,
                type: 'regular'
            });
        }
    });

    socket.on('disconnect', () => {
        const room = getRoom(socket);
        if (room) {
            const wasDrawer = (room.getDrawer() && room.getDrawer().id === socket.id);
            const isEmpty = room.removePlayer(socket.id);

            if (isEmpty) {
                if (room.timer) clearInterval(room.timer);
                delete rooms[room.id];
            } else {
                if (room.state !== 'LOBBY') {
                    if (room.players.length < 2) {
                        if (room.timer) clearInterval(room.timer);
                        room.state = 'LOBBY';
                        room.broadcast("state_update", { state: 'LOBBY' });
                    } else if (wasDrawer) {
                        if (room.timer) clearInterval(room.timer);
                        room.endTurn();
                    }
                }
                room.broadcastPlayerList();
            }
        }
    });

    function getRoom(socket) {
        return Object.values(rooms).find(r => r.players.some(p => p.id === socket.id));
    }
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
