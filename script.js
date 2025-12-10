const socket = io();

// Screens
const mainMenu = document.getElementById('main-menu');
const lobbyScreen = document.getElementById('lobby-screen');
const drawingScreen = document.getElementById('drawing-screen');

// UI Elements
const createBtns = document.querySelectorAll('.create-btn');
const joinBtn = document.getElementById('join-btn');
const roomCodeInput = document.getElementById('room-code-input');
const roomCodeDisplay = document.getElementById('room-code-display');
const copyCodeBtn = document.getElementById('copy-code-btn');
const playerCount = document.getElementById('player-count');
const errorMsg = document.getElementById('menu-error');

// Game UI
const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');
const colorOptions = document.querySelectorAll('.color-option');
const clearBtn = document.getElementById('clear-btn');
const eraserBtn = document.getElementById('eraser-btn');
const topBar = document.getElementById('top-bar');
const spectatorOverlay = document.getElementById('spectator-overlay');
const myTurnBtn = document.getElementById('my-turn-btn');

// Modal Elements
const turnModal = document.getElementById('turn-modal');
const acceptTurnBtn = document.getElementById('accept-turn-btn');
const rejectTurnBtn = document.getElementById('reject-turn-btn');

// State
let isDrawing = false;
let isMyTurn = false;
let currentColor = '#000000';
let currentLineWidth = 5;
let lastX = 0;
let lastY = 0;
let myRoomId = null;

// --- Event Listeners: Main Menu ---

createBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const players = btn.dataset.players;
        socket.emit('create_room', players);
    });
});

joinBtn.addEventListener('click', () => {
    const code = roomCodeInput.value.trim();
    if (code.length === 6) {
        socket.emit('join_room', code);
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
});

socket.on('game_state', (data) => {
    showScreen(drawingScreen);
    resizeCanvas();
    updateRole(data.drawerId);
});

// --- Role Management ---

function updateRole(drawerId) {
    if (socket.id === drawerId) {
        // I am the drawer
        isMyTurn = true;
        spectatorOverlay.classList.remove('active');
        topBar.style.pointerEvents = 'auto';
        alert("Your Turn to Draw!");
    } else {
        // I am a spectator
        isMyTurn = false;
        spectatorOverlay.classList.add('active');
        topBar.style.pointerEvents = 'none'; // Disable tools for spectator
    }
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
});

socket.on('turn_rejected', () => {
    alert("Your turn request was rejected.");
    myTurnBtn.textContent = "My Turn!";
    myTurnBtn.disabled = false;
});

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

// Color Selection
colorOptions.forEach(option => {
    option.addEventListener('click', () => {
        if (!isMyTurn) return;

        colorOptions.forEach(opt => opt.classList.remove('selected'));
        eraserBtn.style.border = 'none';

        option.classList.add('selected');
        currentColor = option.dataset.color;
        currentLineWidth = 5;

        updateContext();
    });
});

function updateContext() {
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentLineWidth;
}

eraserBtn.addEventListener('click', () => {
    if (!isMyTurn) return;
    colorOptions.forEach(opt => opt.classList.remove('selected'));
    eraserBtn.style.border = '2px solid #333';
    currentColor = '#FFFFFF';
    currentLineWidth = 20;
    updateContext();
});

clearBtn.addEventListener('click', () => {
    if (!isMyTurn) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clear');
});

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

    socket.emit('draw', {
        type: 'start',
        x: coords.x,
        y: coords.y,
        color: currentColor,
        width: currentLineWidth,
        w: canvas.width, // Send canvas dimensions to normalize relative scaling if needed (skipping for now)
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
    }
    isDrawing = false;
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
