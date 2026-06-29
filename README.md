# SyncPlayer+

A WebRTC-based desktop application for synchronized video playback and real-time chat with friends.

![SyncPlayer+](https://img.shields.io/badge/Version-1.0.0-blue.svg)
![Electron](https://img.shields.io/badge/Built%20with-Electron-47848F.svg)
![WebRTC](https://img.shields.io/badge/Powered%20by-WebRTC-333333.svg)

## ✨ Features

- **Synchronized Video Playplay**: Watch videos in perfect sync with friends
- **Real-time Chat**: Communicate while watching together
- **P2P Connection**: Direct peer-to-peer connection using WebRTC
- **File Verification**: Automatic checksum verification to ensure everyone has the same video
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Simple Room System**: Easy connection with room IDs

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/debjit018/SyncPlayer-plus.git
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

To build the application for your platform:

```bash
# Build for current platform
npm run dist

# Build without distribution (development)
npm run pack
```

## 📖 How to Use

1. **Start the Signaling Server** (in a separate terminal):
```bash
node signaling-server.js
```

2. **Launch the Application**:
```bash
npm start
```

3. **Connect with Friends**:
   - Enter the same Room ID as your friend
   - Click "Connect to Friend"
   - Select a video file to play
   - Enjoy synchronized playback and chat!

## 🏗️ Project Structure

```
SyncPlayer-plus/
├── main.js                 # Electron main process
├── renderer.js            # Electron renderer process (UI logic)
├── signaling-server.js    # WebSocket signaling server
├── index.html             # Application UI
├── package.json           # Dependencies and scripts
└── README.md              # This file
```

## 🔧 Technical Details

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Desktop Framework**: Electron
- **Networking**: WebRTC for P2P connections, WebSockets for signaling
- **Video**: HTML5 Video element with custom synchronization
- **Security**: File checksum verification, secure WebRTC connections

## 🌐 Network Architecture

```
Client A ↔ Signaling Server (WebSocket) ↔ Client B
       ↕                           ↕
WebRTC Data Channel (Direct P2P Connection)
```

The application uses a central signaling server to establish connections, but all video synchronization and chat happens through direct peer-to-peer connections.

## 🛠️ Development

### Running in Development Mode

```bash
npm start
```

This will launch the Electron application with developer tools enabled.

### Modifying the Code

- `main.js` - Electron main process (window management, app lifecycle)
- `renderer.js` - UI logic and WebRTC implementation
- `signaling-server.js` - WebSocket server for connection signaling
- `index.html` - User interface layout

## 📦 Building for Distribution

To create distributable packages:

```bash
# Build for all platforms
npm run dist

# Build for specific platform (see package.json for options)
npm run dist -- --win
npm run dist -- --mac
npm run dist -- --linux
```

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

- Requires a signaling server to be running for connections
- All users must have the same video file for proper synchronization
- NAT traversal may require additional STUN/TURN servers in some network configurations

## 🐛 Troubleshooting

**Connection Issues**: 
- Ensure the signaling server is running on port 3000
- Check your firewall settings

**Video Sync Problems**:
- Make sure all users have the exact same video file
- Check network latency

**Build Issues**:
- Ensure you have the correct build tools installed for your platform

---

**Enjoy watching videos together with SyncPlayer+! 🎥✨**
