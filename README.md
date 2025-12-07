# FreeJoy 2.0 🎮✨

Transform your smartphone into a **premium wireless gamepad** for Ryujinx emulator. Features dual analog sticks, L3/R3 support, neon UI, and a technical CLI launcher for automated setup.

> *Why buy when you can DIY?*

---

## 📸 Visual Showcase

<table>
<tr>
<td width="33%" align="center">
<img src="docs/gamepad.png" width="100%" alt="Mobile Gamepad"/><br/>
<b>🎮 Wireless Controller</b><br/>
<sub>Dual Sticks • L3/R3 Support • Force Landscape</sub>
</td>
</tr>
<tr>
<td width="50%" align="center">
<img src="docs/host_qr.png" width="100%" alt="QR Code Host"/><br/>
<b>📱 Instant Connection</b><br/>
<sub>Scan QR code • Zero config • 4 Player Support</sub>
</td>
</tr>
</table>

## ✨ Key Features
-   **Dual Analog Sticks**: Full left and right stick support. **Tap the center of the stick** to activate L3/R3.
-   **4-Player Ready**: Disjoint key mappings for 4 inputs on a single PC.
-   **Plugin-Driven Configs**: The server's `RyujinxPlugin` is the **single source of truth**. It automatically generates and updates the JSON config files in `server/configs/` to ensure your emulator inputs are always perfectly synced with the code.
-   **PowerShell Launcher**: `Launcher.ps1` handles dependencies, SSL certificates, and server startup.
-   **Smart Network**: Auto-detects server IP for proper QR code generation.

---

## 🚀 Quick Start

### 1. Start the Launcher
Double-click `Launcher.bat` in the root folder.

### 2. Setup (First Time)
Select option `[1] Setup` using your arrow keys.
-   Installs Node.js dependencies for Server and Client.
-   Builds the React Client.
-   **Generates SSL certificates** (`key.pem`, `cert.pem`) automatically.

### 3. Start Server
Select option `[2] Start Server`.
-   The server will launch on `https://localhost:3001`.
-   It will **automatically write the configuration files** to `server/configs/`.
-   Scan the QR code with your phone(s).

### 4. Configure Ryujinx
Navigate to `server/configs/`. You will find 4 JSON files (`ryujinx_profile_p1.json`, etc.).
**Load these profiles in Ryujinx** (Options > Settings > Input) to map your controller instantly.

---

## 🏗️ Architecture & Tech Stack

### Frontend (Client)
-   **Framework**: React 18 + Vite
-   **Input**: Virtual separate inputs for Left Stick, Right Stick, D-Pad, and Buttons.
-   **UX**: Optimized for Landscape usage with haptic feedback.

### Backend (Server)
-   **Runtime**: Node.js + TypeScript
-   **Input Simulation**: Uses `@hurdlegroup/robotjs` to send low-level keyboard events.
-   **Config Management**: The plugin contains the "master" definition of all inputs and enforces them by writing to disk on startup.

### CLI Launcher
-   **Language**: PowerShell (wrapped in Batch)
-   **Function**: Lightweight lifecycle management. The `.bat` file ensures easy execution without worrying about PowerShell execution policies.

---

## 📱 Troubleshooting
-   **Device can't connect?** Ensure devices are on the same Wi-Fi. Check Firewall settings.
-   **Launcher doesn't open?** Try right-clicking `Launcher.bat` -> "Run as Administrator" if permission errors occur.
-   **Buttons don't update?** Clear your mobile browser cache if you recently updated the server.

---

## ⚖️ Legal Disclaimer

This software is provided for **educational and personal use only**. It is designed to work with the Ryujinx emulator for legitimate purposes, such as playing legally owned game backups.

**Important Notes:**
- This tool does not contain, distribute, or facilitate piracy of any copyrighted content.
- Users are responsible for ensuring they own legal copies of any games they play.
- The author is not responsible for any illegal or unauthorized use of this software.
- Use of this software must comply with all applicable laws and regulations in your jurisdiction.

By using this software, you agree to use it only for lawful purposes.

---

## 📄 License
MIT

## 🤖 Built with Antigravity

This entire project was crafted with the assistance of **Antigravity** - Google DeepMind's agentic AI coding assistant. From the neon-themed UI to the native C# launcher (RIP), from the draggable analog sticks to the 4-player keyboard mappings, every line of code was a collaborative dance between human creativity and AI precision.

> *"Any sufficiently advanced AI is indistinguishable from a very caffeinated developer at 3 AM."*  
> — Arthur C. Clarke (probably)

Special thanks to Antigravity for:
- 🎨 Making the Joy-Con aesthetics actually look premium
- 🐛 Debugging PowerShell scripts that shall not be named
- 🎮 Remembering that D-Pads go on the LEFT side of controllers
- 📱 Teaching me that Wi-Fi interfaces have many names (wlan, wl, wi-fi, wireless...)
- ✨ And for never judging my "just one more feature" requests

*P.S. - If this README seems suspiciously well-organized, that's because an AI wrote it. If you find bugs, that's all me.* 😄

---

## 👨‍💻 Author

**Antonio Antenore**  
Computer Engineer
