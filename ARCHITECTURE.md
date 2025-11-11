# Architecture & Design Decisions

This document explains the architecture of the real-time collaborative canvas, focusing on the room system, data flow, and undo/redo strategy.

## 1. High-Level Architecture

The application uses a **centralized client-server model** with state isolated into **rooms**.
* **Backend:** A Node.js server using **Express** and **Socket.io**.
* **Frontend:** Vanilla JavaScript (ES6 Modules) controlling an **HTML5 Canvas**.

The server acts as the **single source of truth** and a message broker. It maintains a separate state (drawing history, user list) for each active "room."

## 2. ✨ Key Feature: Room System

This is the core of the architecture. We do *not* use a global state.

1.  **Server-Side:**
    * A global `rooms = {}` object holds the state for all active rooms.
    * `rooms['room-name'] = { operationHistory: [], redoStack: [], activeUsers: {}, ... }`
    * A helper function `getRoomState(roomName)` creates a new, empty state object for a room if one doesn't exist.
2.  **Client-Side:**
    * The client reads the `window.location.pathname` to determine the room name (e.g., `/my-room` -> `"my-room"`).
    * Upon connecting, the *first thing* the client does is emit a `'join-room'` event with this `roomName`.
3.  **Event Handling:**
    * On the server, all other event listeners (`start-stroke`, `request-undo`, etc.) are *nested inside* the `'join-room'` listener.
    * This "binds" that socket's actions to the `roomState` it just joined.
    * All broadcasts are no longer global (`io.emit`) but are targeted to the specific room: `io.to(roomName).emit(...)`.

## 3. Data Flow & WebSocket Protocol

All communication is namespaced to the room the client has joined.

### Data Structure: The "Operation"

The "truth" of a room's canvas is stored as an array of `operation` objects on the server (in `roomState.operationHistory`).

```javascript
// A single, complete stroke operation
{
  type: 'stroke',
  user: 'socket-id-of-drawer',
  color: '#RRGGBB',
  width: 5,
  mode: 'source-over', // or 'destination-out'
  path: [ { x: 10, y: 10 }, { x: 11, y: 12 }, ... ]
}