const socket = io();

// --- Elements ---
const screens = {
    menu: document.getElementById('main-menu'),
    lobby: document.getElementById('lobby-screen'),
    game: document.getElementById('drawing-screen')
};

const ui = {
    timer: document.getElementById('timer'),
    word: document.getElementById('word-display'),
    round: document.getElementById('round-info'),
    playerList: document.getElementById('players-sidebar'),
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    canvas: document.getElementById('drawing-canvas'),
    tools: document.getElementById('drawing-tools'),
    overlays: {
        word: document.getElementById('word-selection-overlay'),
        wordOptions: document.getElementById('word-options'),
        gameOver: document.getElementById('game-over-overlay'),
        podium: document.getElementById('podium')
    },
    menu: {
        username: document.getElementById('username-input'),
        createBtns: document.querySelectorAll('.create-btn'),
        joinBtn: document.getElementById('join-btn'),
        codeInput: document.getElementById('room-code-input'),
        error: document.getElementById('menu-error')
    },
    lobby: {
        code: document.getElementById('room-code-display'),
        copy: document.getElementById('copy-code-btn'),
        players: document.getElementById('lobby-player-list'),
        count: document.getElementById('player-count'),
        startBtn: document.getElementById('start-game-btn')
    }
};

const tools = {
    colorBtn: document.getElementById('current-color-btn'),
    palette: document.getElementById('color-palette'),
    size: document.getElementById('brush-size'),
    eraser: document.getElementById('eraser-btn'),
    clear: document.getElementById('clear-btn'),
    undo: document.getElementById('undo-btn'),
    options: document.querySelectorAll('.color-option')
};

const ctx = ui.canvas.getContext('2d');

// --- State ---
let myId = null;
let isDrawer = false;
let isDrawing = false;
let canDraw = false;
let currentPos = { x: 0, y: 0 };
let currentSettings = {
    color: '#000000',
    size: 5,
    isEraser: false
};

// --- Initialization ---
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Menu Events
    // Menu Events
    const createBtn = document.getElementById('create-room-btn');
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            const name = ui.menu.username.value.trim();
            const rounds = document.getElementById('rounds-input').value;
            const maxPlayers = document.getElementById('players-input').value;
            const time = document.getElementById('time-input').value;
            const type = document.getElementById('room-type').value;

            if (!name) return showError("Enter a name!");

            socket.emit('create_room', {
                players: Math.min(10, parseInt(maxPlayers) || 8),
                username: name,
                rounds: Math.min(10, parseInt(rounds) || 5),
                drawingTime: parseInt(time) || 60,
                isPublic: (type === 'public')
            });
        });
    }

    const quickJoinBtn = document.getElementById('quick-join-btn');
    if (quickJoinBtn) {
        quickJoinBtn.addEventListener('click', () => {
            const name = ui.menu.username.value.trim();
            if (!name) return showError("Enter a name!");
            socket.emit('quick_join', { username: name });
        });
    }

    ui.menu.joinBtn.addEventListener('click', () => {
        const name = ui.menu.username.value.trim();
        const code = ui.menu.codeInput.value.trim();
        if (!name) return showError("Enter a name!");
        if (!code) return showError("Enter a code!");
        socket.emit('join_room', { code, username: name });
    });

    ui.lobby.copy.addEventListener('click', () => {
        navigator.clipboard.writeText(ui.lobby.code.innerText);
    });

    ui.lobby.startBtn.addEventListener('click', () => {
        socket.emit('start_game');
    });

    // Chat Events
    ui.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const text = ui.chatInput.value.trim();
            if (text) {
                socket.emit('send_message', text);
                ui.chatInput.value = '';
            }
        }
    });

    // Drawing Events
    ui.canvas.addEventListener('mousedown', startDraw);
    ui.canvas.addEventListener('mousemove', draw);
    ui.canvas.addEventListener('mouseup', endDraw);
    ui.canvas.addEventListener('mouseout', endDraw);

    // Touch Support
    ui.canvas.addEventListener('touchstart', startDraw, { passive: false });
    ui.canvas.addEventListener('touchmove', draw, { passive: false });
    ui.canvas.addEventListener('touchend', endDraw);

    // Tools
    tools.size.addEventListener('input', (e) => currentSettings.size = e.target.value);

    tools.colorBtn.addEventListener('click', () => tools.palette.classList.toggle('hidden'));

    tools.options.forEach(opt => {
        opt.addEventListener('click', () => {
            setColor(opt.dataset.color);
            tools.palette.classList.add('hidden');
        });
    });

    tools.eraser.addEventListener('click', () => {
        currentSettings.isEraser = !currentSettings.isEraser;
        tools.eraser.classList.toggle('active', currentSettings.isEraser);
    });

    tools.undo.addEventListener('click', () => {
        if (canDraw) {
            socket.emit('undo');
        }
    });

    tools.clear.addEventListener('click', () => {
        if (canDraw) {
            ctx.clearRect(0, 0, ui.canvas.width, ui.canvas.height);
            socket.emit('clear');
        }
    });

    // Handle Resize Logic safer
    setTimeout(resizeCanvas, 500);
}

let lastWidth = 0;
let lastHeight = 0;

function resizeCanvas() {
    // Only resize if game screen is active
    if (screens.game.classList.contains('active')) {
        const parent = ui.canvas.parentElement;
        if (parent.clientWidth && parent.clientHeight) {

            const newWidth = parent.clientWidth;
            const newHeight = parent.clientHeight;

            // Mobile Keyboard Detection Strategy:
            // If width is roughly the same (tolerance for scrollbar changes), but height significantly decreases,
            // it's likely the virtual keyboard opening. We should IGNORE this resize event to prevent canvas clearing.
            // Exception: If lastWidth was 0 (first load), we must resize.

            if (lastWidth > 0 && Math.abs(newWidth - lastWidth) < 50 && newHeight < lastHeight * 0.8) {
                console.log("[DEBUG] Ignored resize: Likely mobile keyboard open.");
                return;
            }

            // Only resize if dimensions actually changed
            if (ui.canvas.width !== newWidth || ui.canvas.height !== newHeight) {
                ui.canvas.width = newWidth;
                ui.canvas.height = newHeight;

                lastWidth = newWidth;
                lastHeight = newHeight;

                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // Re-apply current drawing settings
                ctx.strokeStyle = currentSettings.isEraser ? '#ffffff' : currentSettings.color;
                ctx.lineWidth = currentSettings.size;

                // Replay history if exists, as resize clears canvas
                if (typeof replayHistory === 'function') {
                    replayHistory();
                }
            }
        }
    }
}

function showError(msg) {
    ui.menu.error.textContent = msg;
}

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');

    // Toggle body background for game screen
    if (screenName === 'game') {
        document.body.classList.add('game-active');
        setTimeout(resizeCanvas, 100);
    } else {
        document.body.classList.remove('game-active');
    }
}

// --- Socket Events ---

socket.on('connect', () => {
    myId = socket.id;
    console.log("Connected", myId);
});

socket.on('room_created', (id) => {
    ui.lobby.code.textContent = id;
    showScreen('lobby');
});

socket.on('joined_room', (id) => {
    ui.lobby.code.textContent = id;
    showScreen('lobby');
});

socket.on('error', (msg) => showError(msg));

socket.on('update_players', (data) => {
    // data.players = list of players
    // data.drawerId = current drawer
    // data.state = game state

    renderPlayers(data.players, data.drawerId, data.state);

    // Check if game started
    if (data.state !== 'LOBBY' && !screens.game.classList.contains('active')) {
        showScreen('game');
    }
});

// Store history locally
let receivedHistory = [];

function replayHistory() {
    if (!receivedHistory.length) return;

    receivedHistory.forEach(action => {
        drawRemote(action);
    });
}

socket.on('canvas_history', (history) => {
    console.log(`[DEBUG] Received history: ${history.length} items`); // DEBUG
    receivedHistory = history;
    replayHistory();
    // Failsafe: Replay again after UI settles
    setTimeout(replayHistory, 500);
});

socket.on('state_update', (data) => {
    // data: { state, round, drawerId, drawerName, timeLeft, word, maskedWord }

    // Ensure we are on the game screen if game is running
    if (data.state !== 'LOBBY' && !screens.game.classList.contains('active')) {
        showScreen('game');
    }

    // Update Timer
    if (data.timeLeft) updateTimer(data.timeLeft);

    // Update State UI
    if (data.state === 'CHOOSING') {
        ui.word.textContent = `${data.drawerName} is choosing...`;
        canDraw = false;
        ui.tools.classList.add('disabled');
        ui.overlays.word.classList.add('hidden'); // Ensure hidden for guessers
    }
    else if (data.state === 'DRAWING') {
        // Ensure overlay is gone (e.g. if auto-selected)
        ui.overlays.word.classList.add('hidden');

        canDraw = (myId === data.drawerId); // Only drawer can draw
        ui.tools.classList.toggle('disabled', !canDraw);

        if (canDraw) {
            ui.word.textContent = `DRAW THIS: ${data.word || "???"}`; // Should be sent via 'your_word' usually
        } else {
            ui.word.textContent = data.maskWords || data.maskedWord || "_ _ _";
        }
    }
    else if (data.state === 'INTERMISSION') {
        ui.word.textContent = `The word was: ${data.word}`;
        canDraw = false;
        ui.overlays.word.classList.add('hidden');
    }

    if (data.round) ui.round.textContent = `Round ${data.round}`;
});

socket.on('choose_word', (words) => {
    // I am the drawer, show modal
    const container = ui.overlays.wordOptions;
    container.innerHTML = '';

    words.forEach(word => {
        const btn = document.createElement('button');
        btn.textContent = word;
        btn.className = 'word-option-btn';
        btn.onclick = () => {
            socket.emit('word_selected', word);
            ui.overlays.word.classList.add('hidden');
        };
        container.appendChild(btn);
    });

    ui.overlays.word.classList.remove('hidden');
});

socket.on('your_word', (word) => {
    ui.word.textContent = `Word: ${word}`;
});

socket.on('timer_update', (time) => {
    updateTimer(time);
});

socket.on('draw', (data) => {
    receivedHistory.push(data); // FIX: Store stroke for replay
    drawRemote(data);
});

socket.on('clear', () => {
    receivedHistory = []; // FIX: Clear history locally
    ctx.clearRect(0, 0, ui.canvas.width, ui.canvas.height);
});

socket.on('chat_message', (data) => {
    addChatMessage(data.name, data.text, data.type);
});

socket.on('player_correct', (data) => {
    addChatMessage(data.name, "guessed the word!", "correct");
});

socket.on('close_guess', (guess) => {
    addChatMessage("System", `'${guess}' is close!`, "system");
});

socket.on('game_over', (players) => {
    ui.overlays.gameOver.classList.remove('hidden');
    const podium = ui.overlays.podium;
    podium.innerHTML = '';

    players.forEach((p, i) => {
        const div = document.createElement('div');
        div.textContent = `#${i + 1} ${p.name} - ${p.score}`;
        div.style.fontSize = i === 0 ? '1.5rem' : '1rem';
        div.style.fontWeight = i === 0 ? 'bold' : 'normal';
        podium.appendChild(div);
    });

    // Auto-refresh after 5 seconds
    setTimeout(() => {
        location.reload();
    }, 5000);

    document.getElementById('return-home-btn').onclick = () => location.reload();
});


// --- Helpers ---

function updateTimer(time) {
    ui.timer.textContent = time;
}

function renderPlayers(players, drawerId, state) {
    // 1. Render in Game Sidebar
    ui.playerList.innerHTML = '';

    // Sort by score for ranking display (copy to not mutate original order for drawer logic if that relies on index)
    // Actually drawerIndex relies on original order. So we must map to new array or handle carefuly.
    // The visual list should be sorted, but currently drawerIndex logic in server is index based.
    // The server sends `players`, and `drawerIndex` is index in that array.
    // If we sort visually, we don't break logic as long as we don't change the underlying data structures for logic?
    // Wait, the client doesn't hold logic state for turns. It just renders.

    // Let's create a visual sorted list
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

    sortedPlayers.forEach((p, index) => {
        const el = document.createElement('div');
        el.className = 'player-card';
        if (p.id === drawerId) el.classList.add('active-drawer');
        if (p.guessed) el.classList.add('guessed');

        const rank = index + 1;

        el.innerHTML = `
            <div class="player-rank">#${rank}</div>
            <div class="player-details" style="flex: 1; min-width: 0; text-align: left; padding-left: 10px;">
                <div class="name-row" style="display: flex; align-items: center; gap: 5px;">
                    <div class="player-name">${p.name} ${myId === p.id ? '(You)' : ''}</div>
                    <div class="drawer-icon">✏️</div>
                </div>
                <div class="player-score" style="font-size: 0.8rem; color: #666;">Points: ${p.score}</div>
            </div>
        `;
        ui.playerList.appendChild(el);
    });

    // 2. Render in Lobby (if applicable)
    if (state === 'LOBBY') {
        ui.lobby.players.innerHTML = '';
        players.forEach(p => {
            const pad = document.createElement('div');
            pad.className = 'lobby-player-item';
            pad.textContent = p.name;
            ui.lobby.players.appendChild(pad);
        });

        // Update count text if needed
        ui.lobby.count.textContent = `Players: ${players.length} / ${screens.menu.querySelector('.create-btn[data-players="' + players.length + '"]')?.dataset?.players || "waiting"}`;

        // Actually, serverside sends players list, we need to know maxPlayers too if we want to show ratio "1/2" correctly
        // But for now, just showing "PlayersConnected: X" is fine.
        ui.lobby.count.textContent = `Players Connected: ${players.length}`;

        // Show Start Button if I am the host (first player?) and players >= 2
        // We assume first player in list is host for simplicity, or we can check via ID if server sent hostId
        // Server sends players array. Usually p[0] is host.
        const amHost = players[0].id === myId;
        if (amHost && players.length >= 2) {
            ui.lobby.startBtn.classList.remove('hidden');
        } else {
            ui.lobby.startBtn.classList.add('hidden');
        }
    }
}

function addChatMessage(name, text, type) {
    const div = document.createElement('div');
    div.className = 'chat-msg';
    if (type === 'correct') div.classList.add('msg-correct');
    if (type === 'system') div.classList.add('msg-system');

    const b = document.createElement('b');
    b.textContent = name ? `${name}: ` : '';

    const span = document.createElement('span');
    span.textContent = text;

    div.appendChild(b);
    div.appendChild(span);

    ui.chatMessages.appendChild(div);
    ui.chatMessages.scrollTop = ui.chatMessages.scrollHeight;
}

function setColor(hex) {
    currentSettings.color = hex;
    currentSettings.isEraser = false;
    tools.eraser.classList.remove('active');
    tools.colorBtn.style.backgroundColor = hex;
}

// --- Drawing Logic ---

function startDraw(e) {
    console.log("startDraw called. CanDraw:", canDraw);
    if (!canDraw) return;
    if (e.cancelable) e.preventDefault();

    // Safety check for dimensions
    if (ui.canvas.width === 0 || ui.canvas.height === 0) {
        console.warn("Canvas dimensions 0, resizing...");
        resizeCanvas();
    }

    isDrawing = true;
    const { x, y } = getPos(e);
    console.log("Pos:", x, y);
    currentPos = { x, y };

    // Draw dot using arc for better visibility
    drawDot(x, y, currentSettings.color, currentSettings.size, currentSettings.isEraser);

    socket.emit('draw', {
        type: 'start',
        x, y,
        color: currentSettings.color,
        size: currentSettings.size,
        isEraser: currentSettings.isEraser,
        w: ui.canvas.width,
        h: ui.canvas.height
    });
}

function drawDot(x, y, color, size, isEraser) {
    ctx.beginPath();
    ctx.fillStyle = isEraser ? '#ffffff' : color;
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
}

function draw(e) {
    if (!isDrawing || !canDraw) return;
    if (e.cancelable) e.preventDefault();

    const { x, y } = getPos(e);

    drawRec({ x, y, prevX: currentPos.x, prevY: currentPos.y, color: currentSettings.color, size: currentSettings.size, isEraser: currentSettings.isEraser });

    socket.emit('draw', {
        type: 'drag',
        x, y,
        prevX: currentPos.x,
        prevY: currentPos.y, // Send prev to avoid gaps
        color: currentSettings.color,
        size: currentSettings.size,
        isEraser: currentSettings.isEraser
    });

    currentPos = { x, y };
}

function endDraw() {
    isDrawing = false;
}

function drawRemote(data) {
    // data: { x, y, prevX, prevY, color, size, isEraser, type }
    if (data.type === 'start') {
        drawDot(data.x, data.y, data.color, data.size, data.isEraser);
    } else {
        drawRec(data);
    }
}

function drawRec(data) {
    ctx.beginPath();
    ctx.strokeStyle = data.isEraser ? '#ffffff' : data.color;
    ctx.lineWidth = data.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(data.prevX, data.prevY);
    ctx.lineTo(data.x, data.y);
    ctx.stroke();
    // Context closed path removed - was causing issues with points
}



function getPos(e) {
    const rect = ui.canvas.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    // DEBUG LOG
    console.log(`Event: ${e.type}, X: ${clientX}, Y: ${clientY}, CanvasRect: ${rect.left},${rect.top}`);

    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

// Start
init();
