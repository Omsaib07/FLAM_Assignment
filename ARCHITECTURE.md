# Architecture & Design Decisions

This document explains the architecture of the real-time collaborative canvas, focusing on data flow, WebSocket protocol, and the global undo/redo strategy.

## 1. High-Level Architecture

The application uses a **centralized client-server model**.
* **Backend:** A Node.js server using **Express** and **Socket.io**.
* **Frontend:** Vanilla JavaScript (ES6 Modules) controlling an **HTML5 Canvas**.

The server acts as the **single source of truth** and a message broker. It maintains the master "operation history" and broadcasts drawing events from one client to all other connected clients. It does *not* perform any canvas rendering.

The client handles all rendering, user input, and UI state. It uses **client-side prediction** (drawing locally immediately) for a responsive feel, and **server-side reconciliation** (redrawing from history) to maintain a consistent state with other users.

## 2. Data Flow & WebSocket Protocol

We use a simple, event-based protocol over Socket.io.

### Data Structure: The "Operation"

The "truth" of the canvas is stored as an array of `operation` objects on the server. The primary operation is a `stroke`.

```javascript
// A single, complete stroke operation
{
  type: 'stroke',
  user: 'socket-id-of-drawer',
  color: '#RRGGBB',
  width: 5,
  mode: 'source-over', // or 'destination-out' for eraser
  path: [
    { x: 10, y: 10 },
    { x: 11, y: 12 },
    // ... all points in the stroke
  ]
}