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
    // --- ANIMALS (Common & Easy) ---
    "Ant", "Bat", "Bear", "Bee", "Bird", "Bunny", "Camel", "Cat", "Cow", "Crab", "Deer", "Dog",
    "Duck", "Eagle", "Fish", "Fly", "Fox", "Frog", "Goat", "Goose", "Horse", "Lion", "Llama",
    "Mouse", "Owl", "Pig", "Pug", "Rat", "Seal", "Shark", "Sheep", "Snail", "Snake", "Spider",
    "Swan", "Tiger", "Toad", "Turtle", "Wasp", "Whale", "Wolf", "Worm", "Zebra",

    // --- FOOD (Tasty & Simple) ---
    "Apple", "Bagel", "Banana", "Bread", "Burger", "Cake", "Candy", "Cheese", "Cherry",
    "Chips", "Cookie", "Corn", "Donut", "Egg", "Fries", "Grape", "Honey", "Ice Cream",
    "Lemon", "Lime", "Mango", "Meat", "Melon", "Milk", "Nut", "Onion", "Orange", "Peach",
    "Pear", "Pie", "Pizza", "Potato", "Rice", "Salad", "Salt", "Soup", "Steak", "Sushi",
    "Taco", "Toast", "Water",

    // --- OBJECTS (Drawable & Everyday) ---
    "Alarm", "Anchor", "Arrow", "Axe", "Ball", "Balloon", "Basket", "Bed", "Bell", "Belt",
    "Bench", "Bike", "Boat", "Bomb", "Book", "Bowl", "Box", "Brick", "Broom", "Brush",
    "Bulb", "Bus", "Cage", "Camera", "Candle", "Car", "Card", "Chair", "Clock", "Cloud",
    "Comb", "Cone", "Cup", "Desk", "Dice", "Door", "Dress", "Drum", "Fan", "Fence",
    "Flag", "Flower", "Fork", "Fridge", "Gate", "Gear", "Ghost", "Gift", "Glass",
    "Glove", "Glue", "Gold", "Grass", "Guitar", "Gun", "Hammer", "Hat", "Heart",
    "Home", "Hook", "House", "Jar", "Jewel", "Key", "Kite", "Knife", "Lamp", "Leaf",
    "Light", "Lock", "Log", "Map", "Mask", "Moon", "Mop", "Mug", "Nail", "Net",
    "Note", "Oven", "Pan", "Paper", "Pen", "Phone", "Piano", "Pipe", "Plane", "Plate",
    "Plug", "Pool", "Pot", "Purse", "Radio", "Rain", "Ring", "Robot", "Rock", "Rocket",
    "Roof", "Rope", "Rug", "Ruler", "Safe", "Saw", "Scale", "Screw", "Seat", "Shell",
    "Ship", "Shirt", "Shoe", "Shop", "Sign", "Sink", "Skull", "Slide", "Smoke", "Soap",
    "Sock", "Sofa", "Spoon", "Star", "Step", "Stick", "Stone", "Stool", "Sun", "Sword",
    "Table", "Tank", "Tape", "Tent", "Tie", "Tire", "Toast", "Tool", "Tooth", "Torch",
    "Toy", "Train", "Trash", "Tree", "Truck", "Tube", "Van", "Vase", "Wall", "Wand",
    "Watch", "Water", "Web", "Well", "Wheel", "Whip", "Window", "Wing", "Wire", "Wood",
    "Wool", "Yo-yo",

    // --- BODY PARTS ---
    "Arm", "Back", "Beard", "Brain", "Chin", "Ear", "Eye", "Face", "Foot", "Hair",
    "Hand", "Head", "Knee", "Leg", "Lip", "Mouth", "Neck", "Nose", "Palm", "Skin",
    "Skull", "Teeth", "Thumb", "Toe", "Tongue",

    // --- CLOTHES ---
    "Belt", "Boot", "Cap", "Coat", "Dress", "Glove", "Hat", "Hood", "Mask", "Pants",
    "Ring", "Scarf", "Shirt", "Shoe", "Skirt", "Sock", "Suit", "Tie", "Vest",

    // --- NATURE & WEATHER ---
    "Ash", "Beach", "Bush", "Cave", "City", "Cliff", "Cloud", "Cold", "Day", "Dirt",
    "Dust", "Earth", "Fire", "Fog", "Hail", "Heat", "Hill", "Hot", "Ice", "Lake",
    "Lava", "Leaf", "Light", "Mars", "Moon", "Mud", "Night", "Park", "Path", "Peak",
    "Pond", "Rain", "River", "Road", "Rock", "Root", "Rose", "Sand", "Sea", "Seed",
    "Sky", "Snow", "Soil", "Star", "Storm", "Sun", "Tree", "Wave", "Wind", "Wood",

    // --- PEOPLE & ROLES ---
    "Actor", "Angel", "Artist", "Baby", "Baker", "Boss", "Boy", "Chef", "Child",
    "Clown", "Cook", "Cop", "Dad", "Devil", "Doctor", "Driver", "Elf", "Girl",
    "Ghost", "Guard", "Hero", "Judge", "King", "Maid", "Man", "Mom", "Monk",
    "Ninja", "Nurse", "Pilot", "Poet", "Pope", "Priest", "Queen", "Robot",
    "Santa", "Scout", "Spy", "Thief", "Twin", "Witch", "Woman",

    // --- VERBS / ACTIONS ---
    "Bark", "Bend", "Bite", "Blow", "Boil", "Burn", "Buy", "Call", "Chew",
    "Chop", "Clap", "Cook", "Cry", "Cut", "Dance", "Dig", "Dive", "Draw",
    "Drink", "Drive", "Drop", "Eat", "Fall", "Feed", "Fight", "Fly", "Give",
    "Glue", "Grow", "Hang", "Hear", "Hide", "Hit", "Hop", "Hug", "Hunt",
    "Jump", "Kick", "Kiss", "Laugh", "Lick", "Lift", "Listen", "Look", "Love",
    "Melt", "Mix", "Open", "Paint", "Pay", "Pet", "Pick", "Play", "Pray",
    "Pull", "Push", "Race", "Read", "Ride", "Ring", "Roll", "Row", "Run",
    "Sail", "Saw", "See", "Sew", "Shake", "Shop", "Show", "Sing", "Sit",
    "Ski", "Sleep", "Slide", "Smell", "Smile", "Smoke", "Speak", "Spell",
    "Spit", "Stand", "Stop", "Swim", "Talk", "Taste", "Teach", "Tear",
    "Text", "Think", "Throw", "Tie", "Touch", "Type", "Wait", "Walk",
    "Wash", "Watch", "Wave", "Weep", "Win", "Wink", "Wipe", "Work", "Write",
    "Yawn", "Yell"
];

const GAME_SETTINGS = {
    MAX_ROUNDS: 3,
    TIME_CHOOSING: 10,
    TIME_DRAWING: 60,
    TIME_INTERMISSION: 5
};

// --- Room State Management ---
const rooms = {};
const LOBBY_ROOM = 'lobby'; // Socket room for users in main menu

function generateRoomId() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function getRandomWords(count = 3) {
    const shuffled = WORDS.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function getPublicRooms() {
    return Object.values(rooms)
        .filter(r => r.isPublic && r.state !== 'GAME_OVER') // Optional: Filter out ended games if needed
        .map(r => ({
            id: r.id,
            hostName: r.players[0]?.name || "Unknown",
            playerCount: r.players.length,
            maxPlayers: r.maxPlayers,
            state: r.state
        }));
}

function broadcastPublicRooms() {
    const publicRooms = getPublicRooms();
    io.to(LOBBY_ROOM).emit('public_rooms_update', publicRooms);
}

// --- Game Logic Classes ---

// --- Game Logic Classes ---

class GameRoom {
    constructor(id, maxPlayers, hostName, hostId, maxRounds = 5, drawingTime = 60, isPublic = false, hintsEnabled = true) {
        this.id = id;
        this.maxPlayers = maxPlayers;
        this.maxRounds = maxRounds;
        this.drawingTime = drawingTime;
        this.isPublic = isPublic;
        this.hintsEnabled = hintsEnabled;
        this.hintsEnabled = hintsEnabled;
        this.players = []; // Array of { id (socketId), userId, name, score, avatar, guessed, disconnected, disconnectTimer }
        this.addPlayer(hostId, hostName, null); // userId will be set later or passed in
        this.usedWords = new Set(); // Track used words
        this.revealedIndices = new Set(); // Track revealed letters of current word

        // Game State
        this.state = 'LOBBY';
        this.round = 1;
        this.drawerIndex = 0;
        this.currentWord = "";
        this.timer = null;
        this.timeLeft = 0;
        this.canvasState = [];
    }


    addPlayer(id, name, userId) {
        // Check if player with userId already exists (rejoining)
        const existingPlayer = this.players.find(p => p.userId && p.userId === userId);
        if (existingPlayer) {
            existingPlayer.id = id; // Update socket ID
            existingPlayer.disconnected = false;
            if (existingPlayer.disconnectTimer) {
                clearTimeout(existingPlayer.disconnectTimer);
                existingPlayer.disconnectTimer = null;
            }
            return existingPlayer;
        }

        const newPlayer = {
            id,
            userId, // Persistent ID
            name,
            score: 0,
            guessed: false,
            disconnected: false
        };
        this.players.push(newPlayer);
        return newPlayer;
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
        const safePlayers = this.players.map(p => ({
            id: p.id,
            userId: p.userId,
            name: p.name,
            score: p.score,
            guessed: p.guessed,
            disconnected: p.disconnected
        }));
        this.broadcast("update_players", {
            players: safePlayers,
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
        this.usedWords.clear(); // Clear used words on new game
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
        this.broadcast("clear");

        const drawer = this.getDrawer();

        // Select unique words
        let availableWords = WORDS.filter(w => !this.usedWords.has(w));
        if (availableWords.length < 3) {
            this.usedWords.clear(); // Reset if we run out
            availableWords = [...WORDS];
        }

        // Shuffle and pick 3
        const words = availableWords.sort(() => 0.5 - Math.random()).slice(0, 3);

        // Mark as used so they don't appear again immediately (or just the chosen one? 
        // For now, let's mark all offered to ensure high variety)
        words.forEach(w => this.usedWords.add(w));

        this.broadcast("state_update", {
            state: 'CHOOSING',
            round: this.round,
            drawerId: drawer.id,
            drawerName: drawer.name,
            timeLeft: GAME_SETTINGS.TIME_CHOOSING
        });

        // FIX: Broadcast player list to update pencil icon immediately
        this.broadcastPlayerList();

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
        this.timeLeft = this.drawingTime;
        this.revealedIndices.clear(); // Reset hints

        const masked = this.getMaskedWord();

        this.broadcast("state_update", {
            state: 'DRAWING',
            wordLength: word.length,
            maskedWord: masked,
            timeLeft: this.timeLeft,
            drawerId: this.getDrawer().id,
            drawerName: this.getDrawer().name
        });

        // Play bell sound for everyone
        this.broadcast("play_sound", { sound: "bell" });

        const drawer = this.getDrawer();
        io.to(drawer.id).emit("your_word", word);

        this.startTimer(this.drawingTime, () => {
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

        // Play reveal sound
        this.broadcast("play_sound", { sound: "reveal" });

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
        const sorted = [...this.players]
            .sort((a, b) => b.score - a.score)
            .map(p => ({
                id: p.id,
                name: p.name,
                score: p.score
            }));
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

    getMaskedWord() {
        return this.currentWord.split('').map((char, index) => {
            if (char === ' ') return ' ';
            if (this.revealedIndices.has(index)) return char;
            return '_';
        }).join('');
    }

    handleTick() {
        if (this.state === 'DRAWING' && this.currentWord.length > 3 && this.hintsEnabled) {
            if (this.timeLeft === 25 || this.timeLeft === 10) {
                this.revealLetter();
            }
        }
    }

    revealLetter() {
        const unrevealed = [];
        for (let i = 0; i < this.currentWord.length; i++) {
            if (this.currentWord[i] !== ' ' && !this.revealedIndices.has(i)) {
                unrevealed.push(i);
            }
        }

        if (unrevealed.length > 0) {
            // Pick random
            const idx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
            this.revealedIndices.add(idx);

            this.broadcast("state_update", {
                state: 'DRAWING',
                maskedWord: this.getMaskedWord(),
                drawerId: this.getDrawer().id,
                drawerName: this.getDrawer().name
            });
        }
    }

    resetGuesses() {
        this.players.forEach(p => p.guessed = false);
    }

    startTimer(seconds, onComplete) {
        if (this.timer) clearInterval(this.timer);
        this.timeLeft = seconds;

        this.timer = setInterval(() => {
            this.timeLeft--;

            this.handleTick(); // Check for hints

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
            const score = Math.max(100, Math.ceil((this.timeLeft / this.drawingTime) * 500));
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

    // Join lobby by default to receive public room updates
    socket.join(LOBBY_ROOM);
    // Send initial list
    socket.emit('public_rooms_update', getPublicRooms());

    socket.on('get_public_rooms', () => {
        socket.emit('public_rooms_update', getPublicRooms());
    });

    socket.on('create_room', ({ hostName, maxPlayers, rounds, drawTime, isPublic, hintsEnabled }) => {
        try {
            console.log('[DEBUG] create_room request:', { hostName, maxPlayers, rounds, drawTime, isPublic, hintsEnabled });
            const roomId = generateRoomId();
            console.log('[DEBUG] Generated Room ID:', roomId);

            // Strict server-side clamping: Fixed 10 players, Max 10 rounds
            const safePlayers = 10;
            const safeRounds = Math.min(10, Math.max(1, parseInt(rounds) || 5));

            const room = new GameRoom(
                roomId,
                safePlayers,
                hostName,
                socket.id,
                safeRounds,
                parseInt(drawTime) || 60,
                isPublic,
                hintsEnabled
            );

            // Update host's userId
            const host = room.players[0];
            if (host) host.userId = socket.handshake.query.userId || arguments[0].userId;
            console.log('[DEBUG] Room object created');

            rooms[roomId] = room;
            console.log('[DEBUG] Room added to global store');

            // Leave lobby when creating room
            socket.leave(LOBBY_ROOM);

            socket.join(roomId);
            socket.emit('room_created', roomId);
            room.broadcastPlayerList();
            console.log('[DEBUG] Room creation successful');

            if (isPublic) broadcastPublicRooms();

        } catch (error) {
            console.error('[CRITICAL ERROR] in create_room:', error);
            socket.emit('error', 'Server error creating room');
        }
    });

    socket.on('quick_join', ({ username, userId, excludeRoomId }) => {
        // Find public room with space, excluding the room the user is currently in (or just left)
        const availableRoom = Object.values(rooms).find(r =>
            r.isPublic &&
            r.players.length < r.maxPlayers &&
            r.id !== excludeRoomId
        );

        if (availableRoom) {
            joinRoomLogic(socket, availableRoom, username, userId);
        } else {
            socket.emit('error', 'NO_PUBLIC_ROOMS');
        }
    });

    socket.on('join_room', ({ code, username, userId }) => {
        const room = rooms[code];
        if (room) {
            joinRoomLogic(socket, room, username, userId);
        } else {
            socket.emit('error', 'Invalid Room Code');
        }
    });

    // Alias for explicit rejoins
    socket.on('rejoin_game', ({ code, userId }) => {
        const room = rooms[code];
        if (room) {
            joinRoomLogic(socket, room, room.players.find(p => p.userId === userId)?.name || "Player", userId);
        } else {
            socket.emit('error', 'Room Invalid'); // Client will redirect to menu
        }
    });

    function joinRoomLogic(socket, room, username, userId) {
        if (room.players.length < room.maxPlayers || room.players.some(p => p.userId === userId)) {
            const isLateJoin = room.state !== 'LOBBY';

            // Leave lobby when joining room
            socket.leave(LOBBY_ROOM);

            room.addPlayer(socket.id, username, userId);
            socket.join(room.id);

            socket.emit('joined_room', room.id);
            room.broadcastPlayerList();

            if (room.isPublic) broadcastPublicRooms();

            // Auto-start public rooms when 2nd player joins
            if (room.isPublic && room.state === 'LOBBY' && room.players.length === 2) {
                room.startGame();
            }

            if (isLateJoin) {
                console.log(`[DEBUG] Player ${username} joined late. CanvasState size: ${room.canvasState ? room.canvasState.length : 'undefined'}`);
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

                // Send canvas history
                if (room.canvasState && room.canvasState.length > 0) {
                    console.log(`[DEBUG] Sending history to ${username}: ${room.canvasState.length} items`); // DEBUG
                    socket.emit('canvas_history', room.canvasState);
                }
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
            if (Array.isArray(data)) {
                // Handle batched data
                room.canvasState.push(...data);
                // console.log(`[DEBUG] Saved batch of ${data.length}. Total: ${room.canvasState.length}`);
                socket.to(room.id).emit('draw', data);
            } else {
                // Handle single legacy data
                room.canvasState.push({ type: 'draw', ...data });
                // console.log(`[DEBUG] Saved draw stroke. Total: ${room.canvasState.length}`);
                socket.to(room.id).emit('draw', data);
            }
        }
    });

    socket.on('clear', () => {
        const room = getRoom(socket);
        if (room && room.state === 'DRAWING' && room.getDrawer().id === socket.id) {
            room.canvasState = [];
            socket.to(room.id).emit('clear');
        }
    });

    // --- Voice Chat Signaling ---
    socket.on('voice_signal', (data) => {
        // data: { targetId, signal }
        // Relay the signal to the specific target player
        io.to(data.targetId).emit('voice_signal', {
            senderId: socket.id,
            signal: data.signal
        });
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

    socket.on('undo', () => {
        const room = getRoom(socket);
        if (room && room.getDrawer().id === socket.id && room.state === 'DRAWING') {
            if (!room.canvasState || room.canvasState.length === 0) return;

            let removeIndex = -1;
            for (let i = room.canvasState.length - 1; i >= 0; i--) {
                if (room.canvasState[i].type === 'start' || room.canvasState[i].type === 'fill') {
                    removeIndex = i;
                    break;
                }
            }

            if (removeIndex !== -1) {
                room.canvasState.splice(removeIndex);
                if (room.canvasState.length === 0) {
                    socket.to(room.id).emit('clear');
                } else {
                    socket.to(room.id).emit('canvas_history', room.canvasState);
                }
            }
        }
    });



    socket.on('leave_room', () => {
        const room = getRoom(socket);
        if (room) {
            const isEmpty = room.removePlayer(socket.id);
            socket.leave(room.id);

            // Re-join lobby
            socket.join(LOBBY_ROOM);
            socket.emit('public_rooms_update', getPublicRooms());

            if (isEmpty) {
                if (room.timer) clearInterval(room.timer);
                delete rooms[room.id];
                if (room.isPublic) broadcastPublicRooms();
            } else {
                room.broadcastPlayerList();
                if (room.isPublic) broadcastPublicRooms();
            }
        }
    });

    socket.on('disconnect', () => {
        const room = getRoom(socket);
        if (room) {
            const player = room.players.find(p => p.id === socket.id);
            if (!player) return;

            // Grace period logic
            console.log(`[DEBUG] Player ${player.name} disconnected. Starting grace period (10s).`);
            player.disconnected = true;

            player.disconnectTimer = setTimeout(() => {
                if (player.disconnected && rooms[room.id]) { // Check if room still exists
                    console.log(`[DEBUG] Grace period over. Removing player ${player.name}.`);

                    const wasDrawer = (room.getDrawer() && room.getDrawer().id === socket.id);
                    // Actually, room.getDrawer() returns the player object. 
                    // Since specific player object is same ref, we can check validity.

                    const isEmpty = room.removePlayer(socket.id);
                    // Wait, if they reconnected, socketID changed. 
                    // But if they reconnected, `disconnected` would be false and timer cleared.
                    // So if we are here, they haven't reconnected. Socked ID in player obj matches the one that disconnected.

                    if (isEmpty) {
                        if (room.timer) clearInterval(room.timer);
                        delete rooms[room.id];
                        if (room.isPublic) broadcastPublicRooms();
                    } else {
                        // Handle game flow interruption
                        const stateBefore = room.state;
                        // Determine if they were the drawer using the index (since getDrawer relies on index)
                        // This logic is tricky if removePlayer shifts index. removePlayer handles that.

                        if (stateBefore !== 'LOBBY') {
                            if (room.players.length < 2) {
                                if (room.timer) clearInterval(room.timer);
                                // Close the room so no one else can join
                                delete rooms[room.id];
                                console.log(`[DEBUG] Room ${room.id} closed due to lack of players.`);
                                room.broadcast("game_ended_no_players"); // Notify remaining player
                                if (room.isPublic) broadcastPublicRooms();
                            } else if (wasDrawer) {
                                // Logic reuse: The socket that disconnected was the drawer.
                                // If they are gone now, we skip.
                                if (room.timer) clearInterval(room.timer);
                                room.endTurn();
                            }
                        }
                        room.broadcastPlayerList();
                        if (room.isPublic) broadcastPublicRooms();
                    }
                }
            }, 10000); // 10 seconds grace period

            // Optional: Broadcast "Player X disconnected, waiting..." so others know
        }
    });

    function getRoom(socket) {
        return Object.values(rooms).find(r => r.players.some(p => p.id === socket.id));
    }
});

// --- External Word Fetching ---
async function fetchNewWords() {
    try {
        console.log("[INFO] Fetching new words from internet...");
        // Fetch 50 random nouns
        const response = await fetch('https://random-word-form.herokuapp.com/random/noun?count=50');
        if (response.ok) {
            const newWords = await response.json();
            let addedCount = 0;
            newWords.forEach(word => {
                // Capitalize first letter
                const cleanWord = word.charAt(0).toUpperCase() + word.slice(1);
                // Add if not exists and reasonable length (STRICTER: max 8 chars for simplicity)
                if (!WORDS.includes(cleanWord) && cleanWord.length <= 8) {
                    WORDS.push(cleanWord);
                    addedCount++;
                }
            });
            console.log(`[INFO] Added ${addedCount} new words from internet. Total words: ${WORDS.length}`);
        } else {
            console.warn("[WARN] Failed to fetch words:", response.statusText);
        }
    } catch (err) {
        console.error("[ERROR] Could not fetch words:", err.message);
    }
}

// Fetch words on startup
fetchNewWords();

const PORT = process.env.PORT || 8000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
