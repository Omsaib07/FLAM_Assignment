// client/websocket.js
export class WebSocketClient {
  constructor(url) {
    this.socket = io(url); // Assumes Socket.io client is loaded
    this.users = {}; // Local cache of users

    // Generic handler for user disconnect
    this.socket.on('user-list-update', (users) => {
      this.users = {};
      users.forEach(u => this.users[u.id] = u);
    });

    this.socket.on('user-disconnected', (id) => {
      delete this.users[id];
      if (this.onUserDisconnectedCallback) {
        this.onUserDisconnectedCallback(id);
      }
    });
  }

  // --- Emitters (Client -> Server) ---

  startStroke(data) {
    this.socket.emit('start-stroke', data);
  }
  
  drawStroke(point) {
    this.socket.emit('draw-stroke', { point });
  }

  endStroke() {
    this.socket.emit('end-stroke');
  }

  requestUndo() {
    this.socket.emit('request-undo');
  }
  
  requestRedo() {
    this.socket.emit('request-redo');
  }

  moveCursor(point) {
    this.socket.emit('cursor-move', point);
  }

  // --- Listeners (Server -> Client) ---

  onConnect(callback) {
    this.socket.on('connect', callback);
  }
  
  onInitialState(callback) {
    this.socket.on('initial-canvas-state', callback);
  }

  onUserListUpdate(callback) {
    this.socket.on('user-list-update', callback);
  }

  onStrokeStarted(callback) {
    this.socket.on('stroke-started', callback);
  }

  onStrokeDrawn(callback) {
    this.socket.on('stroke-drawn', callback);
  }

  onGlobalRedraw(callback) {
    this.socket.on('global-redraw', callback);
  }
  
  onCursorMoved(callback) {
    this.socket.on('cursor-moved', callback);
  }
  
  onUserDisconnected(callback) {
    this.onUserDisconnectedCallback = callback;
  }
}