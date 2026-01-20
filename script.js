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
    },
    reconnecting: document.getElementById('reconnecting-overlay'),
    status: {
        overlay: document.getElementById('status-overlay'),
        title: document.getElementById('status-title'),
        msg: document.getElementById('status-message'),
        btn: document.getElementById('status-ok-btn')
    },
    emptyRoom: {
        overlay: document.getElementById('empty-room-overlay'),
        homeBtn: document.getElementById('empty-home-btn'),
        joinBtn: document.getElementById('empty-join-btn')
    }
};

const tools = {
    colorBtn: document.getElementById('current-color-btn'),
    palette: document.getElementById('color-palette'),
    size: document.getElementById('brush-size'),
    eraser: document.getElementById('eraser-btn'),
    fill: document.getElementById('fill-btn'),
    clear: document.getElementById('clear-btn'),
    undo: document.getElementById('undo-btn'),
    options: document.querySelectorAll('.color-option')
};

const ctx = ui.canvas.getContext('2d');

// --- State ---
let myId = null;
let userId = sessionStorage.getItem('userId');
if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('userId', userId);
}
let isDrawer = false;
let isDrawing = false;
let canDraw = false;
let currentPos = { x: 0, y: 0 };
let currentSettings = {
    color: '#000000',
    size: 5,
    isEraser: false
};
let storedWord = ""; // Store secret word for drawer
let disconnectTimer = null;
// Overlay removed as per user request


// --- Initialization ---
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Fix: Initialize color button with default color (black)
    tools.colorBtn.style.backgroundColor = currentSettings.color;

    // Menu Events
    // Creation Overlay Logic
    const createRoomBtn = document.getElementById('create-room-btn');
    const creationOverlay = document.getElementById('creation-overlay');
    const cancelCreationBtn = document.getElementById('cancel-creation-btn');
    const createPublicBtn = document.getElementById('create-public-btn');
    const createPrivateBtn = document.getElementById('create-private-btn');

    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', () => {
            if (!ui.menu.username.value.trim()) {
                showError("Please enter your name!");
                return;
            }
            creationOverlay.classList.remove('hidden');
        });
    }

    if (cancelCreationBtn) {
        cancelCreationBtn.addEventListener('click', () => {
            creationOverlay.classList.add('hidden');
        });
    }

    function doCreateRoom(isPublic) {
        const username = ui.menu.username.value.trim();
        const rounds = parseInt(document.getElementById('rounds-input').value);
        const maxPlayers = parseInt(document.getElementById('players-input').value);
        const drawTime = parseInt(document.getElementById('time-input').value);
        const hintsEnabled = document.getElementById('hint-toggle').value === 'true';

        if (!username) {
            showError("Please enter your name!");
            return;
        }

        socket.emit('create_room', {
            hostName: username,
            rounds,
            maxPlayers,
            drawTime,
            isPublic,
            hintsEnabled,
            userId // Send persistent ID
        });

        creationOverlay.classList.add('hidden');
    }

    if (createPublicBtn) createPublicBtn.addEventListener('click', () => doCreateRoom(true));
    if (createPrivateBtn) createPrivateBtn.addEventListener('click', () => doCreateRoom(false));

    // Quick Join Logic
    const quickJoinBtn = document.getElementById('quick-join-btn');
    if (quickJoinBtn) {
        quickJoinBtn.addEventListener('click', () => {
            const username = ui.menu.username.value.trim();
            if (!username) {
                showError("Please enter your name first!");
                return;
            }

            // Show Finding Screen
            const findingOverlay = document.getElementById('finding-room-overlay');
            const statusText = document.getElementById('finding-status');
            findingOverlay.classList.remove('hidden');

            // Countdown
            let seconds = 5;
            statusText.textContent = `Please wait... ${seconds}`;

            const interval = setInterval(() => {
                seconds--;
                statusText.textContent = `Please wait... ${seconds}`;
                if (seconds <= 0) {
                    clearInterval(interval);
                    findingOverlay.classList.add('hidden');
                    socket.emit('quick_join', { username, userId });
                }
            }, 1000);
        });
    }

    ui.menu.joinBtn.addEventListener('click', () => {
        const username = ui.menu.username.value.trim();
        const code = ui.menu.codeInput.value.trim();
        if (username && code) {
            socket.emit('join_room', { code, username, userId });
        } else {
            showError("Enter name and room code!");
        }
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
                ui.chatInput.blur(); // Dismiss keyboard on mobile
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

    tools.fill.addEventListener('click', () => {
        if (!canDraw) return;

        const color = '#000000'; // Hardcoded black as requested

        // Optimistic update
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height);

        const drawData = {
            type: 'fill',
            color: color
        };

        receivedHistory.push(drawData);
        socket.emit('draw', drawData);
    });

    tools.undo.addEventListener('click', () => {
        if (canDraw) {
            // Optimistic Client-Side Undo
            if (receivedHistory.length > 0) {
                let removeIndex = -1;
                // Find the last 'start' or 'fill' event locally
                for (let i = receivedHistory.length - 1; i >= 0; i--) {
                    if (receivedHistory[i].type === 'start' || receivedHistory[i].type === 'fill') {
                        removeIndex = i;
                        break;
                    }
                }

                if (removeIndex !== -1) {
                    receivedHistory.splice(removeIndex); // Remove the stroke locally
                    ctx.clearRect(0, 0, ui.canvas.width, ui.canvas.height); // Clear canvas
                    replayHistory(); // Redraw remaining history
                }
            }
            // Send to server to sync state for others and persistent storage
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

    // Status Overlay Logic
    ui.status.btn.addEventListener('click', () => {
        ui.status.overlay.classList.add('hidden');
        if (shouldRedirectToMenu === true || shouldRedirectToMenu === 'menu') {
            shouldRedirectToMenu = false;
            showScreen('menu');
        } else if (shouldRedirectToMenu === 'reload') {
            shouldRedirectToMenu = false;
            location.reload();
        }
    });

    // Empty Room Logic
    ui.emptyRoom.homeBtn.addEventListener('click', () => location.reload());
    ui.emptyRoom.joinBtn.addEventListener('click', () => {
        ui.emptyRoom.overlay.classList.add('hidden');
        // Trigger generic "Finding Room" logic, but we need to ensure we leave current room first
        // Since server already moved us to LOBBY, we might still be in room data. 
        // Best approach: Reload page with a query param or just simple reload then auto-click?
        // Simpler: Just emit quick_join again with userId.
        const name = ui.menu.username.value || "Player";

        // Show Finding Overlay
        const findingOverlay = document.getElementById('finding-room-overlay');
        const statusText = document.getElementById('finding-status');
        findingOverlay.classList.remove('hidden');
        statusText.textContent = "Finding a new game...";

        // Timeout to simulate search/wait
        setTimeout(() => {
            // Pass current room ID (from code display) to exclude it from search
            const currentRoomId = ui.lobby.code.innerText;
            socket.emit('quick_join', { username: name, userId, excludeRoomId: currentRoomId });
            findingOverlay.classList.add('hidden');
        }, 2000);
    });
}

let shouldRedirectToMenu = false;

function showStatus(title, message, redirect = false, btnText = "OK") {
    ui.status.title.textContent = title;
    ui.status.msg.textContent = message;
    ui.status.btn.textContent = btnText;
    ui.status.overlay.classList.remove('hidden');
    shouldRedirectToMenu = redirect;
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
    // Hide reconnecting overlay immediately
    ui.reconnecting.classList.add('hidden');

    myId = socket.id;
    console.log("Connected", myId, "User ID:", userId);

    // Clear disconnect timer if it helps
    if (disconnectTimer) {
        clearTimeout(disconnectTimer);
        disconnectTimer = null;
    }


    // Try to rejoin if we have a room code and were disconnected
    // Note: Since we don't persist room code in sessionStorage currently, 
    // rejoining after full page reload isn't fully automatic unless we add that.
    // However, this handles socket reconnects (brief internet loss) where page doesn't reload.
    // Actually, for socket reconnects, the server might have kept us if within grace period,
    // but the socket ID changed. We need to tell server "It's me, userId".

    // If we are on a game screen or lobby, we should attempt to rejoin.
    // But sending 'join_room' blindly might not be right if we don't have the code handy 
    // (unless we store it in a variable).
    // Let's rely on the fact that if we just reconnected, we might want to send a "re-identify" packet.
    // Or simpler: The server sees a new connection. 
    // If the user was in a room, they might need to send "I'm back".

    // Strategy: If we have an active room code in UI, try rejoining with it.
    const currentCode = ui.lobby.code.innerText;
    const currentName = ui.menu.username.value || "Player"; // Might be lost on reload if not saved

    if (currentCode && (screens.lobby.classList.contains('active') || screens.game.classList.contains('active'))) {
        console.log("Attempting to rejoin room:", currentCode);
        socket.emit('join_room', { code: currentCode, username: currentName, userId });
    }
});

socket.on('room_created', (id) => {
    ui.lobby.code.textContent = id;
    showScreen('lobby');
});

socket.on('joined_room', (id) => {
    ui.lobby.code.textContent = id;
    showScreen('lobby');
});

socket.on('error', (msg) => {
    // Hide overlays if any (e.g. finding room)
    document.getElementById('finding-room-overlay').classList.add('hidden');
    ui.reconnecting.classList.add('hidden');

    if (msg === 'Room Invalid' || msg === 'Room is full') {
        showStatus("Error", msg, true); // Redirect to menu
    } else if (msg === 'NO_PUBLIC_ROOMS') {
        showStatus("Notice", "No public room is available right now.", 'reload', "Return Home");
    } else {
        showError(msg);
    }
});

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
    // console.log(`[DEBUG] Received history: ${history.length} items`);
    receivedHistory = history;
    // Fix for Undo Blink: Clear canvas locally before replaying the new history
    ctx.clearRect(0, 0, ui.canvas.width, ui.canvas.height);
    replayHistory();
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

        if (data.drawerId) {
            canDraw = (myId === data.drawerId); // Only drawer can draw
        }
        ui.tools.classList.toggle('disabled', !canDraw);

        if (canDraw) {
            // Use stored word if data.word is missing (e.g. during hint updates)
            if (data.word) storedWord = data.word; // Update if provided
            ui.word.textContent = `DRAW THIS: ${storedWord || "???"}`;
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
    storedWord = word;
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

    // Auto-refresh REMOVED.
    // setTimeout(() => {
    //     location.reload();
    // }, 5000);

    document.getElementById('return-home-btn').onclick = () => location.reload();
});

socket.on('play_sound', (data) => {
    if (data.sound === 'bell') {
        const audio = new Audio('bell.mp3');
        audio.play().catch(e => console.log("Audio play failed:", e));

        // Stop after 3 seconds
        setTimeout(() => {
            audio.pause();
            audio.currentTime = 0;
        }, 3000);
    } else if (data.sound === 'reveal') {
        const audio = new Audio('reveal.mp3');
        audio.play().catch(e => console.log("Audio play failed:", e));
    }
});

socket.on('game_ended_no_players', () => {
    ui.emptyRoom.overlay.classList.remove('hidden');
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

    const drawData = {
        type: 'start',
        x: x / ui.canvas.width,
        y: y / ui.canvas.height,
        color: currentSettings.color,
        size: currentSettings.size,
        isEraser: currentSettings.isEraser,
        w: ui.canvas.width,
        h: ui.canvas.height
    };

    receivedHistory.push(drawData); // Save to local history immediately needed for resize/redraw
    socket.emit('draw', drawData);
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

    const drawData = {
        type: 'drag',
        x: x / ui.canvas.width,
        y: y / ui.canvas.height,
        prevX: currentPos.x / ui.canvas.width,
        prevY: currentPos.y / ui.canvas.height, // Send prev to avoid gaps
        color: currentSettings.color,
        size: currentSettings.size,
        isEraser: currentSettings.isEraser
    };

    receivedHistory.push(drawData); // Save to local history immediately needed for resize/redraw

    socket.emit('draw', drawData);

    currentPos = { x, y };
}

function endDraw() {
    isDrawing = false;
}

function drawRemote(data) {
    // data: { x, y, prevX, prevY, color, size, isEraser, type }
    // Convert normalized coordinates back to local canvas size
    const x = data.x * ui.canvas.width;
    const y = data.y * ui.canvas.height;

    if (data.type === 'start') {
        drawDot(x, y, data.color, data.size, data.isEraser);
    } else if (data.type === 'fill') {
        ctx.fillStyle = data.color || '#000000';
        ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height);
    } else {
        const prevX = data.prevX * ui.canvas.width;
        const prevY = data.prevY * ui.canvas.height;
        drawRec({ x, y, prevX, prevY, color: data.color, size: data.size, isEraser: data.isEraser });
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
