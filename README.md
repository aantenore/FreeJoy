# FreeJoy - Universal Wireless Gamepad

FreeJoy is a full-stack controller solution that turns any database of mobile devices into low-latency gamepads for PC emulators. It features a Node.js/Socket.IO backend using `robotjs` for input emulation and a React frontend for the controller UI.

![Preview](docs/preview.png)

## ⚡ Main Features

*   **Zero-Config Connection**: Scan a QR code to connect instantly.
*   **Persistent Sessions**: Auto-reconnect logic restores player slots if the browser refreshes or device sleeps.
*   **JSON-Driven Mappings**: Input configurations are defined in `server/configs/*.json` and enforced at runtime.
*   **Smart Layouts**: 
    *   **Single Unit Mode**: Automatically detects Player 1/3 (Left Unit) and Player 2/4 (Right Unit).
    *   **Landscape Lock**: Enforces landscape orientation for maximum playability.
    *   **Safe Area Handling**: Optimized for notched phones and tablets.
*   **Native Integration**: Uses low-level keyboard hooks via `@hurdlegroup/robotjs` for near-zero latency.

## 🛠️ Architecture & Integration

FreeJoy is built on a modular plugin architecture designed to bridge web inputs with desktop applications.

### Current Integration (Keyboard Emulation)
Currently, the system uses the **PC Emulator Plugin** (`RyujinxPlugin.ts`) which acts as a "Virtual Keyboard".
1.  **Mobile Client** sends input events via WebSocket (e.g., "Player 1 pressed A").
2.  **Server** receives the event and routes it to the active plugin.
3.  **Plugin** maps the logical input to a physical keyboard key using `robotjs` (e.g., "A" -> key "x").
4.  **Target Application** (Emulator) detects the keystroke as if it were a physical keyboard press.

This approach ensures compatibility with *any* application that accepts keyboard input, while the JSON profile system (`server/configs/`) keeps the mappings synchronized between the server and the emulator.

## 🔮 Roadmap & Future Development

We have big plans to expand FreeJoy beyond a local Wi-Fi controller:

*   **WAN / Internet Play**: A future "Base Internet" version will allow remote connections, enabling multiplayer gaming across different networks.
*   **Dedicated Input Entities**: We plan to move beyond keyboard emulation to create dedicated virtual HID devices (Human Interface Devices) for each player. This will allow the OS to see 4 distinct controllers instead of one shared keyboard.
*   **Multi-Plugin Support**: New plugins to support other emulators (e.g., Dolphin, Yuzu forks) and native PC games directly.

## 🚀 Installation & Setup

### Method 1: The Launcher (Recommended)
The project includes a `Launcher.bat` (wrapper for `Launcher.ps1`) that handles the entire lifecycle:

1.  Run `Launcher.bat` as Administrator.
2.  Select **[1] Setup**:
    *   Installs `npm` dependencies for server and client.
    *   Builds the React client to `server/public`.
    *   **Firewall Rules**: Automatically allows inbound traffic on port 3000/3001.
3.  Select **[2] Start Server** to run the application.

### Method 2: Manual Setup
If you prefer the command line:
```bash
# 1. Install Server Deps
cd server && npm install
# 2. Install Client Deps & Build
cd ../client && npm install && npm run build
# 3. Start Server
cd ../server && npm start
```

## 🎮 Emulator Configuration

FreeJoy emulates a keyboard. You must map the keys in your emulator to match the server's configuration.

1.  **Locate Profiles**: Go to `server/configs/`. You will see `profile_p1.json` through `p4.json`.
2.  **Load in Emulator**:
    *   Open Emulator Settings > Input.
    *   Select **Player 1**.
    *   Emulate via: **Handheld** or **Standard Controller**.
    *   Map the keys as defined in `profile_p1.json`.
    *   *Repeat for Players 2-4.*

**Default Mapping Strategy:**
To support 4 players on one keyboard without conflicts, we use specific key clusters:
*   **P1 (Left Unit)**: WASD area + Q/E (Shoulders)
*   **P2 (Right Unit)**: TFGH area + Y/V (Shoulders) [Numpad mapping also supported]
*   **P3/P4**: Uses remaining keyboard zones (IJKL, Numpad).

## 📱 Mobile Usage

1.  Open the host page (`http://localhost:3000`) on your PC.
2.  Scan the QR code for your specific slot (P1, P2, P3, P4).
3.  **iOS Users**: Tap "Share" -> "Add to Home Screen" to launch as a PWA.
4.  **Troubleshooting**:
    *   **"Player Joined (Auto-Assign)"**: This connects you to your last known slot. If you want a different slot, clear browser data.
    *   **Vibration**: Requires a user interaction (tap) to enable on iOS first.

## 📄 License
MIT License - Free for personal and educational use.

---

## 🤖 Built with Antigravity

This entire project was crafted with the assistance of **Antigravity** - Google DeepMind's agentic AI coding assistant. From the neon-themed UI to the native C# launcher (RIP), from the draggable analog sticks to the 4-player keyboard mappings, every line of code was a collaborative dance between human creativity and AI precision.

> *"Any sufficiently advanced AI is indistinguishable from a very caffeinated developer at 3 AM."*  
> — Arthur C. Clarke (probably)

Special thanks to Antigravity for:
- 🎨 Making the Controller aesthetics actually look premium
- 🐛 Debugging PowerShell scripts that shall not be named
- 🎮 Remembering that D-Pads go on the LEFT side of controllers
- 📱 Teaching me that Wi-Fi interfaces have many names (wlan, wl, wi-fi, wireless...)
- ✨ And for never judging my "just one more feature" requests

*P.S. - If this README seems suspiciously well-organized, that's because an AI wrote it. If you find bugs, that's all me.* 😄

---

## 👨‍💻 Author

**Antonio Antenore**  
Computer Engineer
