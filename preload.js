// preload.js
// Runs in a privileged context before the renderer process loads.
// With contextIsolation: true and sandbox: true (set in main.js),
// this is the safe bridge between Node.js and the web page.
// Currently the app uses direct WebRTC/WebSocket APIs available in
// Electron's renderer, so no Node.js APIs need to be exposed here.

window.addEventListener('DOMContentLoaded', () => {
  // You can expose Node.js APIs to the renderer safely here using
  // contextBridge.exposeInMainWorld() if needed in the future.
  console.log('Preload script loaded successfully');
});
