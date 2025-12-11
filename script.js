const socket = io();

// Screens
const mainMenu = document.getElementById('main-menu');
const lobbyScreen = document.getElementById('lobby-screen');
const drawingScreen = document.getElementById('drawing-screen');

// UI Elements
const createBtns = document.querySelectorAll('.create-btn');
const joinBtn = document.getElementById('join-btn');
const usernameInput = document.getElementById('username-input');
const roomCodeInput = document.getElementById('room-code-input');
const roomCodeDisplay = document.getElementById('room-code-display');
const copyCodeBtn = document.getElementById('copy-code-btn');
const playerCount = document.getElementById('player-count');
const errorMsg = document.getElementById('menu-error');

// Game UI
const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');
// const colorOptions = document.querySelectorAll('.color-option'); // Moved below
const clearBtn = document.getElementById('clear-btn');
const eraserBtn = document.getElementById('eraser-btn');
const topBar = document.getElementById('top-bar');
// const spectatorOverlay = document.getElementById('spectator-overlay'); // Removed
const myTurnBtn = document.getElementById('my-turn-btn');

// New Toolbar Elements
const currentColorBtn = document.getElementById('current-color-btn');
const colorPalette = document.getElementById('color-palette');
const brushSizeInput = document.getElementById('brush-size');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');
// Re-select color options as they are in new container
const colorOptions = document.querySelectorAll('.color-option');
const toolsContainer = document.getElementById('drawing-tools');

// Modal Elements
const turnModal = document.getElementById('turn-modal');
const acceptTurnBtn = document.getElementById('accept-turn-btn');
const rejectTurnBtn = document.getElementById('reject-turn-btn');
const gameRoomCode = document.getElementById('game-room-code');
const playersListContainer = document.getElementById('players-list');

// State
let isDrawing = false;
let isMyTurn = false;
let currentColor = '#000000';
let currentLineWidth = 5;
let lastX = 0;
let myRoomId = null;
let currentPlayers = []; // Store players list
let strokeHistory = []; // Array of {type, color, width, path: [{x, y}, ...]}
let redoStack = [];
let currentPath = []; // Temp storage for current stroke path

// --- Event Listeners: Main Menu ---

createBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        if (!username) {
            errorMsg.textContent = "Please enter your name first!";
            return;
        }
        const players = btn.dataset.players;
        socket.emit('create_room', { players, username });
    });
});

joinBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (!username) {
        errorMsg.textContent = "Please enter your name first!";
        return;
    }
    const code = roomCodeInput.value.trim();

    if (code.length === 6) {
        socket.emit('join_room', { code, username });
    } else {
        errorMsg.textContent = "Please enter a valid 6-digit code";
    }
});

copyCodeBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(roomCodeDisplay.textContent).then(() => {
        copyCodeBtn.textContent = "Copied!";
        setTimeout(() => copyCodeBtn.textContent = "Copy", 2000);
    });
});

// --- Socket Events ---

socket.on('room_created', (roomId) => {
    myRoomId = roomId;
    showScreen(lobbyScreen);
    roomCodeDisplay.textContent = roomId;
    playerCount.textContent = "Waiting for players...";
});

socket.on('joined_room', (roomId) => {
    myRoomId = roomId;
    showScreen(lobbyScreen);
    roomCodeDisplay.textContent = roomId;
    playerCount.textContent = "Connected! Waiting for host...";
});

socket.on('error', (msg) => {
    errorMsg.textContent = msg;
});

socket.on('game_started', (data) => {
    showScreen(drawingScreen);
    resizeCanvas();
    updateRole(data.drawerId);

    // Update game info
    gameRoomCode.textContent = myRoomId;
    renderPlayerList(data.players, data.drawerId);
});

socket.on('game_state', (data) => {
    showScreen(drawingScreen);
    resizeCanvas();
    updateRole(data.drawerId);

    // Update game info
    gameRoomCode.textContent = myRoomId;
    renderPlayerList(data.players, data.drawerId);
});

// --- Role Management ---

// --- Role Management ---

function updateRole(drawerId) {
    if (socket.id === drawerId) {
        // I am the drawer
        isMyTurn = true;
        // spectatorOverlay.classList.remove('active'); // Removed overlay
        topBar.style.pointerEvents = 'auto';

        // Show drawing tools, hide "My Turn" button
        if (toolsContainer) toolsContainer.style.display = 'flex';
        myTurnBtn.style.display = 'none';

        // alert("Your Turn to Draw!"); // Removed alert
    } else {
        // I am a spectator
        isMyTurn = false;
        // spectatorOverlay.classList.add('active'); // Removed overlay
        // topBar.style.pointerEvents = 'none'; // Don't disable all events, we need the button!

        // Hide drawing tools, show "My Turn" button
        if (toolsContainer) toolsContainer.style.display = 'none';
        myTurnBtn.style.display = 'inline-block';
    }
}

function renderPlayerList(players, currentDrawerId) {
    if (!players) return;
    currentPlayers = players; // Update global state
    playersListContainer.innerHTML = ''; // Clear list
    players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.classList.add('player-item');
        if (player.id === currentDrawerId) {
            playerItem.classList.add('drawer');
        }

        const nameSpan = document.createElement('span');
        nameSpan.textContent = player.name;

        const brushIcon = document.createElement('div');
        brushIcon.classList.add('brush-icon');

        playerItem.appendChild(nameSpan);
        playerItem.appendChild(brushIcon);
        playersListContainer.appendChild(playerItem);
    });
}

// --- Turn Management ---

myTurnBtn.addEventListener('click', () => {
    socket.emit('request_turn');
    myTurnBtn.textContent = "Request Sent...";
    myTurnBtn.disabled = true;
});

socket.on('turn_requested', (data) => {
    if (isMyTurn) {
        turnModal.classList.add('active');
        // Retrieve name from data, fallback to "Friend" if missing
        const requesterName = data.requesterName || "Friend";
        turnModal.querySelector('p').textContent = `${requesterName} wants to draw!`;

        // Handle response
        const handleAccept = () => {
            socket.emit('turn_response', { requesterId: data.requesterId, accepted: true });
            turnModal.classList.remove('active');
            cleanup();
        };

        const handleReject = () => {
            socket.emit('turn_response', { requesterId: data.requesterId, accepted: false });
            turnModal.classList.remove('active');
            cleanup();
        };

        const cleanup = () => {
            acceptTurnBtn.removeEventListener('click', handleAccept);
            rejectTurnBtn.removeEventListener('click', handleReject);
        };

        acceptTurnBtn.addEventListener('click', handleAccept);
        rejectTurnBtn.addEventListener('click', handleReject);
    }
});

socket.on('turn_change', (data) => {
    updateRole(data.drawerId);
    // Reset button state if previously disabled
    myTurnBtn.textContent = "My Turn!";
    myTurnBtn.disabled = false;

    // Update player list visuals (we might not have the full list here, but we can assume list unchanged)
    // Actually, we need to update the indicators. The simplest way relies on finding the elements.
    // Or we could request state update, but better to just toggle classes if we can.
    // However, recreating is safest if we had the list. 
    // Since we don't receive the list in turn_change, we can iterate DOM elements.
    // BUT we don't have IDs on elements. Let's rely on finding by text? No, names can be diff.
    // Best: Server should probably just send the list again or we store it locally.
    // Quick fix: Update styles based on "drawerId" comparison if we stored players?
    // Let's modify render loop or just re-request state? 
    // Actually, let's just highlight the new drawer based on the logic we can infer?
    // Wait, the client doesn't persist the players list variable globally.
    // I should fix that. I'll make `currentPlayers` a global.

    if (currentPlayers) {
        renderPlayerList(currentPlayers, data.drawerId);
    }
});

socket.on('turn_rejected', (data) => {
    const rejectorName = data.rejectorName || "The drawer";
    showToast(`${rejectorName} rejected you`);

    // Cooldown
    const COOLDOWN_TIME = 25;
    let remainingTime = COOLDOWN_TIME;

    myTurnBtn.disabled = true;
    myTurnBtn.textContent = `Wait ${remainingTime}s`;

    const interval = setInterval(() => {
        remainingTime--;
        if (remainingTime > 0) {
            myTurnBtn.textContent = `Wait ${remainingTime}s`;
        } else {
            clearInterval(interval);
            myTurnBtn.textContent = "My Turn!";
            myTurnBtn.disabled = false;
        }
    }, 1000);
});

function showToast(message) {
    const toast = document.getElementById("notification-toast");
    toast.textContent = message;
    toast.classList.remove("hidden");

    setTimeout(() => {
        toast.classList.add("hidden");
    }, 2000);
}

// --- Drawing Logic ---

// Canvas Setup
function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight - topBar.clientHeight;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = currentLineWidth;
    ctx.strokeStyle = currentColor;
}

window.addEventListener('resize', resizeCanvas);

// --- Drawing Tools Logic ---

// Size Slider
brushSizeInput.addEventListener('input', (e) => {
    currentLineWidth = e.target.value;
    ctx.lineWidth = currentLineWidth; // Fix: Update context immediately
});

// Color Picker Toggle
currentColorBtn.style.backgroundColor = currentColor; // Init bg
currentColorBtn.addEventListener('click', () => {
    if (!isMyTurn) return;
    colorPalette.classList.toggle('hidden');
});

// Color Selection
colorOptions.forEach(option => {
    option.addEventListener('click', (e) => {
        if (!isMyTurn) return; // Should be blocked by UI but safety check
        e.stopPropagation(); // Prevent closing immediately if bubbled? No, usually fine.

        const color = option.dataset.color;

        // Handle White (Eraser logic via color, or just color)
        // If color is white, effectively eraser if we assume white bg.
        // But user has separate eraser button. 
        // Let's just treat standard color selection.

        currentColor = color;
        currentColorBtn.style.backgroundColor = color;
        colorPalette.classList.add('hidden'); // Close palette

        // Reset Eraser style
        eraserBtn.classList.remove('active');

        updateContext();
    });
});

// Close palette if clicked outside
document.addEventListener('click', (e) => {
    if (!currentColorBtn.contains(e.target) && !colorPalette.contains(e.target)) {
        colorPalette.classList.add('hidden');
    }
});

// Eraser
eraserBtn.addEventListener('click', () => {
    if (!isMyTurn) return;
    currentColor = '#FFFFFF';
    currentLineWidth = 20; // Default eraser size, but slider overrides next movement?
    // Let's set slider to 20?
    brushSizeInput.value = 20;

    // Highlight eraser
    eraserBtn.classList.add('active');
    updateContext();
});

function updateContext() {
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentLineWidth;
}

clearBtn.addEventListener('click', () => {
    if (!isMyTurn) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokeHistory = []; // Clear history
    redoStack = [];
    socket.emit('clear');
});

// Undo
undoBtn.addEventListener('click', () => {
    if (!isMyTurn || strokeHistory.length === 0) return;

    // Pop last stroke
    const lastStroke = strokeHistory.pop();
    redoStack.push(lastStroke);

    // Redraw
    redrawCanvas();
});

// Redo
redoBtn.addEventListener('click', () => {
    if (!isMyTurn || redoStack.length === 0) return;

    // Pop from redo
    const stroke = redoStack.pop();
    strokeHistory.push(stroke);

    // Redraw
    redrawCanvas();
});

function redrawCanvas() {
    // 1. Clear Local
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Clear Remote (Still good to send clear signal first to be safe, though sync overrides)
    // socket.emit('clear'); // Optional if sync covers it, but keeps state clean. Let's keep it or just reliance on sync.
    // Actually, sync replaces the whole image so clear isn't strictly needed on remote if we send full image.
    // But let's keep it simple.

    // 3. Replay History Locally
    strokeHistory.forEach(stroke => {
        drawStrokeLocally(stroke);
    });

    // 4. Sync Final State to Network (Fix for "wipe" glitch)
    const imageData = canvas.toDataURL();
    socket.emit('sync_screen', { image: imageData });
}

function drawStrokeLocally(stroke) {
    if (stroke.path.length < 1) return;

    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(stroke.path[0].x, stroke.path[0].y);
    for (let i = 1; i < stroke.path.length; i++) {
        ctx.lineTo(stroke.path[i].x, stroke.path[i].y);
    }
    ctx.stroke();
}

// Input Handling
function getCoordinates(e) {
    if (e.touches && e.touches[0]) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.touches[0].clientX - rect.left,
            y: e.touches[0].clientY - rect.top
        };
    }
    return {
        x: e.offsetX,
        y: e.offsetY
    };
}

function startDrawing(e) {
    if (!isMyTurn) return;
    isDrawing = true;
    const coords = getCoordinates(e);
    lastX = coords.x;
    lastY = coords.y;

    // Start Recording
    currentPath = [{ x: coords.x, y: coords.y }];
    redoStack = []; // Clear redo on new action

    socket.emit('draw', {
        type: 'start',
        x: coords.x,
        y: coords.y,
        color: currentColor,
        width: currentLineWidth,
        w: canvas.width,
        h: canvas.height
    });
}

function draw(e) {
    if (!isDrawing || !isMyTurn) return;
    e.preventDefault();

    const coords = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    // Record
    // Store only if moved significance? No, straight lines are fine.
    currentPath.push({ x: coords.x, y: coords.y });

    socket.emit('draw', {
        type: 'drag',
        x: coords.x,
        y: coords.y,
        prevX: lastX,
        prevY: lastY
    });

    lastX = coords.x;
    lastY = coords.y;
}

function stopDrawing() {
    if (isDrawing && isMyTurn) {
        socket.emit('draw', { type: 'end' });

        // Save Stroke
        if (currentPath.length > 0) {
            strokeHistory.push({
                color: currentColor,
                width: currentLineWidth,
                path: currentPath
            });
        }
    }
    isDrawing = false;
    currentPath = [];
    ctx.beginPath();
}

// Socket Drawing Events
socket.on('draw', (data) => {
    if (isMyTurn) return; // Ignore if I am drawing (shouldn't happen)

    if (data.type === 'start') {
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.width;
        lastX = data.x;
        lastY = data.y;
    } else if (data.type === 'drag') {
        ctx.beginPath();
        // Use received distinct previous coordinates if available, else fallback
        const pX = data.prevX !== undefined ? data.prevX : lastX;
        const pY = data.prevY !== undefined ? data.prevY : lastY;

        ctx.moveTo(pX, pY);
        ctx.lineTo(data.x, data.y);
        ctx.stroke();

        lastX = data.x;
        lastY = data.y;
    } else if (data.type === 'end') {
        ctx.beginPath();
    }
});

socket.on('clear', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

socket.on('sync_screen', (data) => {
    if (isMyTurn) return;
    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    };
    img.src = data.image; // Assume data contains { image: base64 } or just data if sent directly, let's allow object
});

// Listeners
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchmove', draw);
canvas.addEventListener('touchend', stopDrawing);

// Helper
function showScreen(screen) {
    [mainMenu, lobbyScreen, drawingScreen].forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}
