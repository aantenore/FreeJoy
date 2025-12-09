import { IPlugin } from './IPlugin';
import * as fs from 'fs';
import * as path from 'path';
import { fork, ChildProcess } from 'child_process';

// --- ROBOTJS MAPPING (Ryujinx Key Name -> RobotJS Key) ---
const RYUJINX_TO_ROBOTJS: Record<string, string> = {
    'A': 'a', 'B': 'b', 'C': 'c', 'D': 'd', 'E': 'e', 'F': 'f', 'G': 'g', 'H': 'h', 'I': 'i', 'J': 'j', 'K': 'k', 'L': 'l', 'M': 'm',
    'N': 'n', 'O': 'o', 'P': 'p', 'Q': 'q', 'R': 'r', 'S': 's', 'T': 't', 'U': 'u', 'V': 'v', 'W': 'w', 'X': 'x', 'Y': 'y', 'Z': 'z',
    'Number0': '0', 'Number1': '1', 'Number2': '2', 'Number3': '3', 'Number4': '4',
    'Number5': '5', 'Number6': '6', 'Number7': '7', 'Number8': '8', 'Number9': '9',
    'F1': 'f1', 'F2': 'f2', 'F3': 'f3', 'F4': 'f4', 'F5': 'f5', 'F6': 'f6', 'F7': 'f7', 'F8': 'f8', 'F9': 'f9', 'F10': 'f10', 'F11': 'f11', 'F12': 'f12',
    'Keypad0': 'numpad_0', 'Keypad1': 'numpad_1', 'Keypad2': 'numpad_2', 'Keypad3': 'numpad_3', 'Keypad4': 'numpad_4',
    'Keypad5': 'numpad_5', 'Keypad6': 'numpad_6', 'Keypad7': 'numpad_7', 'Keypad8': 'numpad_8', 'Keypad9': 'numpad_9',
    'KeypadDivide': 'numpad_divide', 'KeypadMultiply': 'numpad_multiply', 'KeypadSubtract': 'numpad_subtract', 'KeypadAdd': 'numpad_add',
    'KeypadEnter': 'numpad_enter', 'KeypadDecimal': 'numpad_decimal',
    'Up': 'up', 'Down': 'down', 'Left': 'left', 'Right': 'right',
    'Enter': 'enter', 'Space': 'space', 'Tab': 'tab', 'Backspace': 'backspace', 'Escape': 'escape', 'CapsLock': 'capslock',
    'ShiftLeft': 'shift', 'ShiftRight': 'shift', 'ControlLeft': 'control', 'AltLeft': 'alt',
    'Home': 'home', 'End': 'end', 'PageUp': 'pageup', 'PageDown': 'pagedown', 'Insert': 'insert', 'Delete': 'delete',
    'Minus': '-', 'Plus': '=', 'Equal': '=',
    'BracketLeft': '[', 'BracketRight': ']',
    'Backslash': '\\', 'Semicolon': ';', 'Quote': "'",
    'Comma': ',', 'Period': '.', 'Slash': '/', 'Backquote': '`'
};

// --- LOGICAL BUTTONS (Client -> JSON Path) ---
const CLIENT_TO_CONFIG_PATH: Record<string, string[]> = {
    'Up': ['left_joycon_stick', 'stick_up'],
    'Down': ['left_joycon_stick', 'stick_down'],
    'Left': ['left_joycon_stick', 'stick_left'],
    'Right': ['left_joycon_stick', 'stick_right'],
    'L3': ['left_joycon_stick', 'stick_button'],
    'RS_Up': ['right_joycon_stick', 'stick_up'],
    'RS_Down': ['right_joycon_stick', 'stick_down'],
    'RS_Left': ['right_joycon_stick', 'stick_left'],
    'RS_Right': ['right_joycon_stick', 'stick_right'],
    'R3': ['right_joycon_stick', 'stick_button'],
    'DPadUp': ['left_joycon', 'dpad_up'],
    'DPadDown': ['left_joycon', 'dpad_down'],
    'DPadLeft': ['left_joycon', 'dpad_left'],
    'DPadRight': ['left_joycon', 'dpad_right'],
    'A': ['right_joycon', 'button_a'],
    'B': ['right_joycon', 'button_b'],
    'X': ['right_joycon', 'button_x'],
    'Y': ['right_joycon', 'button_y'],
    'L': ['left_joycon', 'button_l'],
    'ZL': ['left_joycon', 'button_zl'],
    'R': ['right_joycon', 'button_r'],
    'ZR': ['right_joycon', 'button_zr'],
    'Minus': ['left_joycon', 'button_minus'],
    'Plus': ['right_joycon', 'button_plus'],
    'SL': ['left_joycon', 'button_sl'],
    'SR': ['left_joycon', 'button_sr']
};

export class RyujinxPlugin implements IPlugin {
    name = "Ryujinx Keyboard (Multi-Process Lazy)";
    version = "6.1.0-LAZY";
    maxPlayers = 4;
    private currentPlayer = 1;
    private profiles: Record<number, any> = {};
    private mappings: Record<number, Record<string, string>> = {};
    private workers: Record<number, ChildProcess> = {};

    constructor() {
        console.log('[Ryujinx] Initializing StatefulWorker Plugin...');
        this.loadProfiles();
        this.parseMappings();
    }

    private loadProfiles() {
        const configDir = path.join(process.cwd(), 'configs');
        if (!fs.existsSync(configDir)) return;

        const files = fs.readdirSync(configDir).filter(f => f.match(/^ryujinx_profile_p\d+\.json$/));
        for (const file of files) {
            const match = file.match(/p(\d+)/);
            if (!match) continue;
            const playerId = parseInt(match[1]);
            const content = fs.readFileSync(path.join(configDir, file), 'utf-8');
            this.profiles[playerId] = JSON.parse(content);
        }
    }

    private parseMappings() {
        for (const [playerStr, profile] of Object.entries(this.profiles)) {
            const playerId = parseInt(playerStr);
            const map: Record<string, string> = {};
            for (const [clientBtn, cfgPath] of Object.entries(CLIENT_TO_CONFIG_PATH)) {
                let node: any = profile;
                for (const key of cfgPath) node = node?.[key];
                if (node && node !== 'Unbound') map[clientBtn] = RYUJINX_TO_ROBOTJS[node] || node;
            }
            this.mappings[playerId] = map;
        }
    }

    private getOrSpawnWorker(playerId: number) {
        if (this.workers[playerId]) return this.workers[playerId];
        const workerPath = path.join(__dirname, 'statefulWorker.js');
        this.workers[playerId] = fork(workerPath);
        return this.workers[playerId];
    }

    sendButtonPress(playerIndex: number, button: string, pressed: boolean) {
        const mapping = this.mappings[playerIndex];
        const worker = this.getOrSpawnWorker(playerIndex);
        if (!mapping || !worker) return;
        const key = mapping[button];
        if (key) worker.send({ buttons: pressed ? [key] : [] });
    }

    sendAnalogInput(playerIndex: number, stick: 'left' | 'right', x: number, y: number) {
        const profile = this.profiles[playerIndex];
        const worker = this.getOrSpawnWorker(playerIndex);
        if (!profile || !worker) return;
        const stickMap = stick === 'left' ? profile.left_joycon_stick : profile.right_joycon_stick;
        if (!stickMap) return;

        const xMap = { negKey: stickMap.stick_left ? RYUJINX_TO_ROBOTJS[stickMap.stick_left] : null, posKey: stickMap.stick_right ? RYUJINX_TO_ROBOTJS[stickMap.stick_right] : null };
        const yMap = { negKey: stickMap.stick_up ? RYUJINX_TO_ROBOTJS[stickMap.stick_up] : null, posKey: stickMap.stick_down ? RYUJINX_TO_ROBOTJS[stickMap.stick_down] : null };

        worker.send({ axes: { x, y }, axisMapping: { x: xMap, y: yMap }, buttons: [] });
    }

    setActivePlayer(playerIndex: number) { this.currentPlayer = playerIndex; }
    getActivePlayer(): number { return this.currentPlayer; }
}
