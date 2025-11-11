# Real-Time Collaborative Canvas

A multi-user, room-based drawing application built with Node.js, Socket.io, and Vanilla JavaScript (HTML5 Canvas).

## 🚀 Live Demo

**The live application is deployed on Render:**

[**https://drawing-app-vr4u.onrender.com**](https://drawing-app-vr4u.onrender.com)

To use the room feature, simply add a room name to the URL. For example:

* `.../room1`
* `.../a-cool-drawing-space`

*(Note: The server is on Render's free tier, so it may take 30-60 seconds to "wake up" if it's been idle.)*

---

## 🧪 How to Test

### 1. Multi-Room Feature

1.  Open `.../my-first-room` in your browser.
2.  Open `.../a-second-room` in a different (or incognito) browser window.
3.  Draw in **Room 1**. You will see your drawing and cursor.
4.  Observe **Room 2**. It will remain empty. The rooms are successfully isolated.

### 2. Multi-User Feature (In the Same Room)

1.  Open `.../our-shared-room` in your browser.
2.  Open `.../our-shared-room` on your phone or in another incognito window.
3.  You will now see **two users** in the "Online Users" list in both windows.
4.  Draw in one window. The drawing will appear instantly in the other.
5.  Click "Undo" or "Redo" in either window. The action will be global and sync across both clients.

---

## ✨ Key Features

* **Real-Time Sync:** Uses WebSockets (Socket.io) to broadcast drawing data instantly.
* **Isolated Rooms:** All state (drawings, users, history) is namespaced by room, defined by the URL path.
* **Mobile Touch Support:** Full drawing support for mobile and tablet devices.
* **Global Undo/Redo:** A server-authoritative history stack allows any user in a room to undo/redo actions for everyone.
* **Live Cursors:** See where other users in your room are pointing in real-time.
* **Dynamic Toolbar:**
    * Custom, resizable cursor that visually changes from a brush to an eraser.
    * Color picker, stroke width slider, and active tool states.
* **Hybrid Input Lock:** Prevents screen-scribbling bugs on hybrid devices by "locking" the input to either mouse *or* touch for the duration of a single stroke.
* **Responsive UI:** The toolbar and user list adapt to different screen sizes, including split-screen.

---

## 🛠️ Local Setup & Running

1.  **Clone the repository:**
    ```bash
    git clone [your-github-repo-link]
    cd collaborative-canvas
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run the server:**
    ```bash
    npm start
    ```
4.  **Open the application:**
    Open `http://localhost:3000` in your browser. You can test rooms by visiting `http://localhost:3000/room1`, etc.

