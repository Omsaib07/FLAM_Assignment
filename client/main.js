// client/main.js
import { CanvasApp } from './canvas.js';
import { WebSocketClient } from './websocket.js';

// --- Global App State ---
const appState = {
  color: '#000000',
  width: 5,
  mode: 'source-over' // 'source-over' = brush, 'destination-out' = eraser
};

// --- DOM Elements ---
const canvasEl = document.getElementById('drawing-canvas');
const colorInput = document.getElementById('color');
const widthInput = document.getElementById('width');
const widthValue = document.getElementById('width-value');
const brushBtn = document.getElementById('brush');
const eraserBtn = document.getElementById('eraser');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');
const userListEl = document.getElementById('users');
const cursorOverlay = document.getElementById('cursor-overlay');

// --- Initialization ---
const canvasApp = new CanvasApp(canvasEl);
const wsClient = new WebSocketClient('ws://localhost:3000'); // Use ws://, Socket.io handles upgrade

// Set initial tool as active
brushBtn.classList.add('active');

// --- Event Listeners ---

// Tool Selection
colorInput.addEventListener('input', (e) => {
  appState.color = e.target.value;
});

widthInput.addEventListener('input', (e) => {
  appState.width = e.target.value;
  widthValue.textContent = e.target.value;
});

brushBtn.addEventListener('click', () => {
  appState.mode = 'source-over';
  brushBtn.classList.add('active');
  eraserBtn.classList.remove('active');
});

eraserBtn.addEventListener('click', () => {
  appState.mode = 'destination-out';
  eraserBtn.classList.add('active');
  brushBtn.classList.remove('active');
});

// Canvas Drawing Events
canvasEl.addEventListener('mousedown', (e) => {
  const point = canvasApp.getCanvasCoordinates(e.clientX, e.clientY);
  const strokeData = { ...appState, point };
  
  canvasApp.startDrawing(strokeData); // Local drawing
  wsClient.startStroke(strokeData);   // Send to server
});

canvasEl.addEventListener('mousemove', (e) => {
  const point = canvasApp.getCanvasCoordinates(e.clientX, e.clientY);

  if (canvasApp.isDrawing) {
    canvasApp.draw(point);    // Local drawing
    wsClient.drawStroke(point); // Send to server
  }
  
  // Send cursor position
  wsClient.moveCursor(point);
});

canvasEl.addEventListener('mouseup', () => {
  if (canvasApp.isDrawing) {
    canvasApp.stopDrawing();    // Local
    wsClient.endStroke();       // Send to server
  }
});

canvasEl.addEventListener('mouseout', () => {
  if (canvasApp.isDrawing) {
    canvasApp.stopDrawing();    // Local
    wsClient.endStroke();       // Send to server
  }
});

// Undo/Redo
undoBtn.addEventListener('click', () => wsClient.requestUndo());
redoBtn.addEventListener('click', () => wsClient.requestRedo());


// --- WebSocket Event Handlers ---
wsClient.onConnect(() => {
  console.log('Connected to server!');
});

wsClient.onInitialState((history) => {
  console.log('Received initial canvas state');
  canvasApp.redrawFromHistory(history);
});

wsClient.onUserListUpdate((users) => {
  console.log('User list updated', users);
  userListEl.innerHTML = ''; // Clear list
  users.forEach(user => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="user-color-swatch" style="background-color: ${user.color}"></span>
      ${user.id.substring(0, 6)} ${user.id === wsClient.socket.id ? '(You)' : ''}
    `;
    userListEl.appendChild(li);
  });
});

wsClient.onStrokeStarted((data) => {
  canvasApp.startRemoteDrawing(data.user, data);
});

wsClient.onStrokeDrawn((data) => {
  canvasApp.drawRemote(data.user, data.point);
});

wsClient.onGlobalRedraw((history) => {
  console.log('Received global redraw command');
  canvasApp.redrawFromHistory(history);
});

wsClient.onCursorMoved((data) => {
  let cursorEl = document.getElementById(`cursor-${data.id}`);
  if (!cursorEl) {
    const user = wsClient.users[data.id];
    cursorEl = document.createElement('div');
    cursorEl.id = `cursor-${data.id}`;
    cursorEl.className = 'user-cursor';
    
    const labelEl = document.createElement('div');
    labelEl.className = 'user-cursor-label';
    labelEl.textContent = data.id.substring(0, 6);
    labelEl.style.backgroundColor = user ? user.color : '#888';
    
    cursorEl.appendChild(labelEl);
    cursorOverlay.appendChild(cursorEl);
  }
  
  // Position the cursor relative to the canvas
  const canvasRect = canvasEl.getBoundingClientRect();
  cursorEl.style.transform = `translate(${canvasRect.left + data.x}px, ${canvasRect.top + data.y}px)`;
});

wsClient.onUserDisconnected((id) => {
  const cursorEl = document.getElementById(`cursor-${id}`);
  if (cursorEl) {
    cursorEl.remove();
  }
});

// Handle window resizing
window.addEventListener('resize', () => canvasApp.resizeCanvas());
canvasApp.resizeCanvas(); // Initial size