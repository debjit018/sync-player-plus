console.log("Renderer.js initialized");

// DOM Elements
const elements = {
  video: document.getElementById('player'),
  filePicker: document.getElementById('filePicker'),
  connectBtn: document.getElementById('connectBtn'),
  chatLog: document.getElementById('chatLog'),
  chatInput: document.getElementById('chatInput'),
  sendBtn: document.getElementById('sendBtn'),
  connectionStatus: document.getElementById('connectionStatus'),
  fileStatus: document.getElementById('fileStatus'),
  roomIdInput: document.getElementById('roomIdInput'),
  confirmRoomBtn: document.getElementById('confirmRoomBtn'),
  roomInput: document.getElementById('roomInput'),
  playerContainer: document.getElementById('playerContainer'),
  controls: document.getElementById('controls'),
  statusBar: document.getElementById('statusBar') // Added this line to fix the status bar error
};

// Application State
const state = {
  peerConnection: null,
  dataChannel: null,
  signalingSocket: null,
  isInitiator: false,
  roomId: null,
  currentFile: null,
  syncInterval: null,
  isConnected: false
};

// Configuration
const CONFIG = {
  ICE_SERVERS: [{ urls: 'stun:stun.l.google.com:19302' }],
  SYNC_INTERVAL: 3000,
  SYNC_THRESHOLD: 0.5,
  DRIFT_THRESHOLD: 0.4,
  CHUNK_SIZE: 1024 * 1024
};

// Initialize UI
function initUI() {
  elements.playerContainer.style.display = 'none';
  elements.controls.style.display = 'none';
  setupEventListeners();
  updateStatus("Please enter a room ID to begin");
}

// Set up all event listeners
function setupEventListeners() {
  elements.confirmRoomBtn.addEventListener('click', handleRoomConnection);
  elements.roomIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleRoomConnection();
  });
  
  elements.filePicker.addEventListener('change', handleFileSelect);
  elements.connectBtn.addEventListener('click', handlePeerConnection);
  elements.sendBtn.addEventListener('click', sendChatMessage);
  elements.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChatMessage();
  });
  
  elements.video.addEventListener('play', () => sendSyncAction('play'));
  elements.video.addEventListener('pause', () => sendSyncAction('pause'));
  elements.video.addEventListener('seeked', () => sendSyncAction('seek', elements.video.currentTime));
}

// Handle room connection
function handleRoomConnection() {
  state.roomId = elements.roomIdInput.value.trim();
  
  if (!state.roomId) {
    showError("Please enter a room ID");
    return;
  }
  
  if (!/^[a-zA-Z0-9-]{3,20}$/.test(state.roomId)) {
    showError("Room ID must be 3-20 characters (letters, numbers, hyphens)");
    return;
  }
  
  elements.roomInput.style.display = 'none';
  elements.playerContainer.style.display = 'block';
  elements.controls.style.display = 'flex';
  updateStatus(`Ready to connect to room: ${state.roomId}`);
  elements.connectBtn.disabled = false;
}

// Handle file selection
async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file || !file.type.includes('video')) {
    showError("Please select a video file");
    return;
  }

  state.currentFile = file;
  try {
    const videoURL = URL.createObjectURL(file);
    elements.video.src = videoURL;
    await elements.video.play().catch(e => {
      console.warn("Autoplay prevented:", e);
      updateStatus("Click the video to play");
    });
    
    const checksum = await hashPartialFile(file);
    elements.video.dataset.checksum = checksum;
    updateStatus(`Loaded: ${file.name}`);
    elements.fileStatus.textContent = file.name;
    
    if (state.dataChannel?.readyState === "open") {
      sendDataChannelMessage({ action: 'checksum', value: checksum });
    }
  } catch (error) {
    console.error("File processing error:", error);
    showError("Error loading file");
  }
}

// Handle peer connection
async function handlePeerConnection() {
  if (!state.roomId) {
    showError("Please enter a room ID first");
    return;
  }

  if (state.isConnected) {
    updateStatus("Already connected");
    return;
  }

  try {
    state.signalingSocket = new WebSocket('ws://localhost:3000');
    updateStatus("Connecting to signaling server...");
    elements.connectBtn.disabled = true;

    state.signalingSocket.onopen = () => {
      state.signalingSocket.send(JSON.stringify({ 
        type: 'join', 
        room: state.roomId 
      }));
      state.isInitiator = true;
      setupWebRTC();
      updateStatus(`Connected to room: ${state.roomId}`);
      elements.connectionStatus.textContent = "Connected";
      elements.connectBtn.textContent = "Connected";
      elements.connectBtn.classList.add('connected');
      state.isConnected = true;
    };

    state.signalingSocket.onmessage = (e) => {
  console.log("Raw WebSocket message:", e.data);
  handleSignalingMessage(e);
};
    state.signalingSocket.onerror = (e) => {
      showError("Connection error");
      cleanupConnection();
    };
    state.signalingSocket.onclose = () => {
      showError("Disconnected");
      cleanupConnection();
    };
  } catch (error) {
    console.error("Connection error:", error);
    showError("Connection failed");
    cleanupConnection();
  }
}

// WebRTC setup
async function setupWebRTC() {
  try {
    state.peerConnection = new RTCPeerConnection({
      iceServers: CONFIG.ICE_SERVERS
    });

    state.peerConnection.onicecandidate = (e) => {
      if (e.candidate && state.signalingSocket?.readyState === WebSocket.OPEN) {
        state.signalingSocket.send(JSON.stringify({ ice: e.candidate }));
      }
    };

    state.peerConnection.ondatachannel = (event) => {
      state.dataChannel = event.channel;
      setupDataChannel();
      updateStatus("Peer connected");
    };

    if (state.isInitiator) {
      state.dataChannel = state.peerConnection.createDataChannel("sync");
      setupDataChannel();
      
      const offer = await state.peerConnection.createOffer();
      await state.peerConnection.setLocalDescription(offer);
      state.signalingSocket.send(JSON.stringify({ offer }));
    }
  } catch (error) {
    console.error("WebRTC setup failed:", error);
    showError("Connection failed");
    cleanupConnection();
  }
}

// Data channel setup
function setupDataChannel() {
  if (!state.dataChannel) return;

  state.dataChannel.onopen = () => {
    updateStatus("Data channel ready");
    if (state.isInitiator) {
      startSyncInterval();
    }
    if (elements.video.dataset.checksum) {
      sendDataChannelMessage({ action: 'checksum', value: elements.video.dataset.checksum });
    }
  };

  state.dataChannel.onmessage = handleDataMessage;
  state.dataChannel.onerror = (e) => console.error("Data channel error:", e);
  state.dataChannel.onclose = () => {
    updateStatus("Data channel closed");
    clearSyncInterval();
  };
}

// Message handlers
async function handleSignalingMessage(event) {
  try {
    // Handle both string and Blob data
    const msg = typeof event.data === 'string' 
      ? JSON.parse(event.data) 
      : JSON.parse(await event.data.text());
    
    console.log("Received signaling message:", msg);

    if (msg.offer) {
      state.isInitiator = false;
      await setupWebRTC();
      await state.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.offer));
      const answer = await state.peerConnection.createAnswer();
      await state.peerConnection.setLocalDescription(answer);
      state.signalingSocket.send(JSON.stringify({ answer }));
    } else if (msg.answer) {
      await state.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.answer));
    } else if (msg.ice) {
      await state.peerConnection.addIceCandidate(new RTCIceCandidate(msg.ice));
    }
  } catch (error) {
    console.error("Error handling signaling message:", error);
  }
}

function handleDataMessage(event) {
  try {
    const data = JSON.parse(event.data);
    console.log("Sync action:", data.action, "Time:", data.time?.toFixed(2));

    if (data.action === 'play') elements.video.play();
    if (data.action === 'pause') elements.video.pause();

    if (data.action === 'seek') {
      const diff = Math.abs(elements.video.currentTime - data.time);
      if (diff > CONFIG.SYNC_THRESHOLD) {
        elements.video.currentTime = data.time;
      }
    }

    if (data.action === 'sync') {
      const drift = Math.abs(elements.video.currentTime - data.time);
      console.log(`Drift: ${drift.toFixed(2)}s`);
      if (drift > CONFIG.DRIFT_THRESHOLD && !elements.video.seeking) {
        elements.video.currentTime = data.time;
      }
    }

    if (data.action === 'checksum') {
      handleChecksumVerification(data.value);
    }

    if (data.action === 'chat') {
      addChatMessage(data.message, false);
    }
  } catch (error) {
    console.error("Error handling data message:", error);
  }
}

// Helper functions
function startSyncInterval() {
  if (state.syncInterval) clearInterval(state.syncInterval);
  state.syncInterval = setInterval(() => {
    if (elements.video.readyState >= 2 && !elements.video.seeking && state.dataChannel?.readyState === "open") {
      sendDataChannelMessage({
        action: "sync",
        time: elements.video.currentTime
      });
    }
  }, CONFIG.SYNC_INTERVAL);
}

function clearSyncInterval() {
  if (state.syncInterval) {
    clearInterval(state.syncInterval);
    state.syncInterval = null;
  }
}

function sendDataChannelMessage(message) {
  if (state.dataChannel?.readyState === "open") {
    try {
      state.dataChannel.send(JSON.stringify(message));
    } catch (error) {
      console.error("Error sending data channel message:", error);
    }
  }
}

function sendSyncAction(action, time) {
  sendDataChannelMessage({ action, time });
}

function sendChatMessage() {
  const message = elements.chatInput.value.trim();
  if (message && state.dataChannel?.readyState === 'open') {
    sendDataChannelMessage({ action: 'chat', message });
    addChatMessage(message, true);
    elements.chatInput.value = '';
  }
}

async function hashPartialFile(file) {
  const chunkSize = CONFIG.CHUNK_SIZE;
  const firstChunk = file.slice(0, Math.min(chunkSize, file.size));
  const lastChunk = file.slice(Math.max(0, file.size - chunkSize), file.size);

  const getBytes = async (blob) => new Uint8Array(await blob.arrayBuffer());
  const [firstBytes, lastBytes] = await Promise.all([
    getBytes(firstChunk),
    getBytes(lastChunk)
  ]);

  const combined = new Uint8Array(firstBytes.length + lastBytes.length);
  combined.set(firstBytes);
  combined.set(lastBytes, firstBytes.length);

  const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function handleChecksumVerification(remoteChecksum) {
  const localChecksum = elements.video.dataset.checksum;
  
  if (!localChecksum) {
    console.warn("Local checksum not available");
    return;
  }

  if (localChecksum === remoteChecksum) {
    console.log("Files match");
    updateStatus("Files verified - sync ready");
  } else {
    console.warn("Checksum mismatch");
    updateStatus("Warning: Files don't match");
  }
}

function addChatMessage(message, isLocal = false) {
  const msgElement = document.createElement('div');
  msgElement.classList.add('chat-message', isLocal ? 'local-message' : 'remote-message');
  msgElement.textContent = (isLocal ? 'You: ' : 'Friend: ') + message;
  elements.chatLog.appendChild(msgElement);
  elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
}

function updateStatus(message, isError = false) {
  if (elements.statusBar && elements.statusBar.children.length > 0) {
    elements.statusBar.children[0].textContent = message;
    elements.statusBar.children[0].style.color = isError ? 'var(--error-color)' : 'var(--text-primary)';
  }
  console.log(isError ? "Error: " + message : "Status: " + message);
}

function showError(message) {
  const errorElement = document.createElement('div');
  errorElement.className = 'error-message';
  errorElement.textContent = message;
  errorElement.style.color = 'var(--error-color)';
  errorElement.style.marginTop = '8px';
  errorElement.style.textAlign = 'center';
  
  const existingError = document.querySelector('.error-message');
  if (existingError) existingError.remove();
  
  elements.roomInput.appendChild(errorElement);
}

function cleanupConnection() {
  clearSyncInterval();
  
  if (state.signalingSocket) {
    state.signalingSocket.close();
    state.signalingSocket = null;
  }
  
  if (state.peerConnection) {
    state.peerConnection.close();
    state.peerConnection = null;
  }
  
  state.dataChannel = null;
  state.isInitiator = false;
  state.isConnected = false;
  
  elements.connectBtn.disabled = false;
  elements.connectBtn.textContent = "Connect to Friend";
  elements.connectBtn.classList.remove('connected');
  elements.connectionStatus.textContent = "Disconnected";
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  initUI();
});