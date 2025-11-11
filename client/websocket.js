// client/websocket.js

/**
 * Manages all WebSocket communication using Socket.io.
 * This class acts as a clean interface, separating socket logic
 * from the main application logic in main.js.
 */
export class WebSocketClient {
  constructor(url) {
    // Connect to the Socket.io server at the given URL
    this.socket = io(url); 
    // A local cache to store user data (like colors)
    this.users = {}; 

    // --- Generic Handlers ---
    // These handlers run immediately to manage the local 'users' cache.

    // When the user list is updated, rebuild our local cache.
    this.socket.on('user-list-update', (users) => {
      this.users = {}; // Clear the old cache
      users.forEach(u => this.users[u.id] = u); // Rebuild it
    });

    // When a user disconnects, remove them from the cache.
    this.socket.on('user-disconnected', (id) => {
      delete this.users[id];
      // Also call the specific callback set in main.js (for removing the cursor)
      if (this.onUserDisconnectedCallback) {
        this.onUserDisconnectedCallback(id); 
      }
    });
  }

  // --- Emitters (Client -> Server) ---
  // These functions *send* messages to the server.

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
  // These functions allow main.js to *register callbacks* for
  // specific messages *received* from the server.

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
  
  // This just saves the callback function for the generic handler above to use.
  onUserDisconnected(callback) {
    this.onUserDisconnectedCallback = callback; 
  }
}