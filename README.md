# SyncPlayer+

A WebRTC-based desktop application for synchronized video playback and real-time chat with friends.

![SyncPlayer+](https://img.shields.io/badge/Version-1.0.0-blue.svg)
![Electron](https://img.shields.io/badge/Built%20with-Electron-47848F.svg)
![WebRTC](https://img.shields.io/badge/Powered%20by-WebRTC-333333.svg)

## ✨ Features

- **Synchronized Video Playback**: Watch videos in perfect sync with friends
- **Real-time Chat**: Communicate while watching together
- **P2P Connection**: Direct peer-to-peer connection using WebRTC
- **File Verification**: Automatic checksum verification to ensure everyone has the same video
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Simple Room System**: Easy connection with room IDs
- **Cloud Signaling**: Pre-configured to connect through a live, always-on signaling server — no need to run anything locally to use the app

## 🚀 Getting Started

### Prerequisites

- Node.js v16 or higher (v18 LTS recommended)
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/debjit018/sync-player-plus.git
cd SyncPlayer-plus
```

2. Install dependencies:
```bash
npm install
```

3. Start the application:
```bash
npm start
```

### Building from Source

To build a distributable desktop app for your platform:

```bash
# Build for current platform
npm run dist

# Build for a specific platform
npm run dist -- --win
npm run dist -- --mac    # must be built on macOS
npm run dist -- --linux

# Build without packaging into an installer (development)
npm run pack
```

Output files are placed in the `dist/` folder (e.g. `SyncPlayer+.AppImage`, `.exe`).

## 📖 How to Use

1. **Launch the app** (either via `npm start` or by running the built binary)
2. **Enter a Room ID** — share the same Room ID with your friend
3. **Click "Connect to Friend"** — the app connects to the signaling server automatically and waits for your friend to join
4. **Select a video file** — choose the exact same video file as your friend (MP4/H.264 recommended; MKV/HEVC may not render in Electron's default Chromium build)
5. **Enjoy synchronized playback and chat!**

> **Note:** Both participants need the same video file locally — only playback position, play/pause state, and chat messages are sent over the connection. The video itself is never uploaded or transmitted.

## 🏗️ Project Structure

```
SyncPlayer-plus/
├── main.js                 # Electron main process
├── preload.js              # Secure bridge between main and renderer process
├── renderer.js              # Electron renderer process (UI logic, WebRTC)
├── signaling-server.js      # WebSocket signaling server
├── index.html                # Application UI
├── package.json              # Dependencies and build config
├── .gitignore                 # Excludes node_modules/ and dist/ from git
└── README.md                  # This file
```

## 🔧 Technical Details

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Desktop Framework**: Electron (context isolation + sandbox enabled)
- **Networking**: WebRTC for P2P connections, WebSockets for signaling
- **Video**: HTML5 Video element with custom synchronization
- **Security**: File checksum verification (SHA-256), secure WebRTC connections, sandboxed renderer process

## 🌐 Network Architecture

```
Client A ↔ Signaling Server (WebSocket, hosted on Railway) ↔ Client B
       ↕                                                  ↕
         WebRTC Data Channel (Direct P2P Connection)
```

The signaling server's only job is matchmaking: it relays the WebRTC handshake (offer / answer / ICE candidates) between two clients in the same room. Once the peer-to-peer connection is established, all video synchronization and chat happens **directly between the two computers** — no video or chat data ever passes through the server.

The first client to join a room is assigned the **initiator** role and creates the WebRTC offer; the second client is the **receiver** and responds with an answer. This is coordinated automatically by the signaling server.

## ☁️ Signaling Server Deployment

The signaling server (`signaling-server.js`) is deployed separately from the desktop app, since it needs to run continuously and be reachable over the public internet.

This project is currently configured to use a server hosted on [Railway](https://railway.app) (free tier). If you want to deploy your own instance:

1. Push this repository to GitHub
2. Create a new project on Railway and connect your GitHub repo
3. Set the start command to:
   ```bash
   node signaling-server.js
   ```
4. Under **Settings → Networking**, generate a public domain
5. Update the `SIGNALING_URL` constant near the top of `renderer.js` with your new `wss://` URL
6. Rebuild the app with `npm run dist`

### Running the signaling server locally (for development)

```bash
node signaling-server.js
```
The server listens on `process.env.PORT` if set, otherwise defaults to port 3000.

## 🛠️ Development

### Running in Development Mode

```bash
npm start
```

This launches the Electron app with developer tools enabled automatically.

### Testing Two Clients Locally

Open two separate terminals and run `npm start` in each — this launches two independent app windows that can join the same room, simulating two different users.

### Modifying the Code

- `main.js` — Electron main process (window management, app lifecycle)
- `preload.js` — Security bridge between Node.js and the renderer (required by `contextIsolation`)
- `renderer.js` — UI logic and WebRTC implementation
- `signaling-server.js` — WebSocket server for connection signaling
- `index.html` — User interface layout

## 📦 Building for Distribution

```bash
# Build for all platforms (where supported)
npm run dist

# Build for a specific platform
npm run dist -- --win
npm run dist -- --mac
npm run dist -- --linux
```

Share the resulting file from `dist/` (e.g. via GitHub Releases) — recipients just download and run it. No Node.js, npm, or manual server setup required on their end.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Known Limitations

- Both users must have the same video file locally for proper synchronization
- MKV files using HEVC/x265 encoding may not render video (audio-only) in Electron's bundled Chromium — MP4 (H.264) is recommended for best compatibility
- NAT traversal may require additional STUN/TURN servers in some restrictive network configurations (only a public STUN server is configured by default)
- The free tier of the signaling host may have usage limits; for heavy or production use, consider a paid tier or self-hosting

## 🐛 Troubleshooting

**Connection Issues**:
- Confirm the signaling server is reachable by visiting its URL directly in a browser (should return `OK`)
- Check your firewall settings if running the signaling server locally
- Confirm `SIGNALING_URL` in `renderer.js` matches your deployed server's `wss://` address

**Video Not Displaying (audio plays, no picture)**:
- Convert the video to MP4 (H.264) using a tool like HandBrake or `ffmpeg`
- Avoid HEVC/x265-encoded MKV files

**Video Sync Problems**:
- Make sure all users have the exact same video file
- Check network latency between peers

**Build Issues**:
- Run `rm -rf node_modules package-lock.json && npm install` for a clean dependency reinstall
- Ensure Node.js v16+ is installed (`node --version`)
- Ensure you have the correct build tools installed for your target platform

---

**Enjoy watching videos together with SyncPlayer+! 🎥✨**
