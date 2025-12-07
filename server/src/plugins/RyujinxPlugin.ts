import { IPlugin } from './IPlugin';
import * as fs from 'fs';
import * as path from 'path';

// --- ROBOTJS MAPPING (Ryujinx Key Name -> RobotJS Key) ---
// @hurdlegroup/robotjs uses these key names
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
    name = "Ryujinx Keyboard (robotjs)";
    version = "5.1.0";
    maxPlayers = 4;
    private robot: any;
    private currentPlayer: number = 1;

    private profiles: Record<number, any> = {};
    private mappings: Record<number, Record<string, string>> = {};

    constructor() {
        console.log('[Ryujinx] Initializing robotjs plugin...');
        try {
            this.robot = require('@hurdlegroup/robotjs');
            console.log('[Ryujinx] ✓ @hurdlegroup/robotjs loaded');
        } catch (err) {
            console.error('[Ryujinx] ✗ Failed to load @hurdlegroup/robotjs:', err);
        }
        this.loadProfilesFromJSON();
        this.parseMappings();
        console.log('[Ryujinx] Loaded profiles for players:', Object.keys(this.profiles).join(', '));
    }

    async init(): Promise<void> {
        console.log('[Ryujinx] Plugin initialized');
    }

    async cleanup(): Promise<void> {
        console.log('[Ryujinx] Plugin cleanup');
    }

    // Load profiles from JSON files in configs/ directory
    private loadProfilesFromJSON() {
        const configDir = path.join(process.cwd(), 'configs');

        if (!fs.existsSync(configDir)) {
            console.error('[Ryujinx] Config directory not found:', configDir);
            return;
        }

        // Load all ryujinx_profile_p*.json files
        const files = fs.readdirSync(configDir).filter(f => f.match(/^ryujinx_profile_p\d+\.json$/));

        for (const file of files) {
            const match = file.match(/ryujinx_profile_p(\d+)\.json/);
            if (!match) continue;

            const playerId = parseInt(match[1]); // p1.json -> Player 1
            const filePath = path.join(configDir, file);

            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const profile = JSON.parse(content);
                this.profiles[playerId] = profile;
                console.log(`[Ryujinx] ✓ Loaded ${file} for Player ${playerId}`);
            } catch (err) {
                console.error(`[Ryujinx] ✗ Failed to load ${file}:`, err);
            }
        }

        if (Object.keys(this.profiles).length === 0) {
            console.warn('[Ryujinx] No profiles loaded! Creating empty mappings.');
        }
    }

    // Parse profiles into mappings (Client Button -> robotjs key)
    private parseMappings() {
        for (const [playerIdStr, profile] of Object.entries(this.profiles)) {
            const playerId = parseInt(playerIdStr);
            const playerMap: Record<string, string> = {};

            // Auto-detect JoyCon type if not explicit
            const isRightJoyCo = profile.controller_type === 'JoyconRight' || (!profile.controller_type && playerId % 2 === 0);

            for (const [clientBtn, configPath] of Object.entries(CLIENT_TO_CONFIG_PATH)) {

                // Dynamic path override for SL/SR on Right Joy-Cons
                let effectivePath = configPath;
                if (isRightJoyCo && (clientBtn === 'SL' || clientBtn === 'SR')) {
                    effectivePath = ['right_joycon', clientBtn === 'SL' ? 'button_sl' : 'button_sr'];
                }

                let node: any = profile;
                for (const key of effectivePath) {
                    if (node) node = node[key];
                }

                if (node && typeof node === 'string' && node !== 'Unbound') {
                    const robotKey = RYUJINX_TO_ROBOTJS[node];
                    if (robotKey) {
                        playerMap[clientBtn] = robotKey;
                    } else {
                        console.warn(`[Ryujinx] Unknown key: ${node} for ${clientBtn}`);
                    }
                }
            }
            this.mappings[playerId] = playerMap;
            console.log(`[Ryujinx] P${playerId} mappings:`, Object.keys(playerMap).length, 'buttons');
        }
    }

    sendButtonPress(playerIndex: number, button: string, pressed: boolean): void {
        this.currentPlayer = playerIndex;
        const mapping = this.mappings[playerIndex];
        if (!mapping) {
            console.warn(`[Ryujinx] No mapping for Player ${playerIndex}`);
            return;
        }

        const key = mapping[button];
        if (key && this.robot) {
            try {
                console.log(`[Ryujinx] P${playerIndex} ${button} → '${key}' (${pressed ? 'DOWN' : 'UP'})`);
                this.robot.keyToggle(key, pressed ? 'down' : 'up');
            } catch (err) {
                console.error(`[Ryujinx] Error with key '${key}':`, err);
            }
        } else if (!key) {
            console.warn(`[Ryujinx] P${playerIndex} ${button} → UNMAPPED`);
        }
    }

    // State tracking for analog-to-digital (prevents spamming keyToggle)
    private analogState: Record<number, Record<string, boolean>> = {};

    sendAnalogInput(playerIndex: number, stick: 'left' | 'right', x: number, y: number): void {
        const threshold = 0.5;
        this.currentPlayer = playerIndex;

        if (!this.analogState[playerIndex]) this.analogState[playerIndex] = {};

        const profile = this.profiles[playerIndex];
        if (!profile) {
            console.warn(`[Ryujinx] No profile for Player ${playerIndex} analog`);
            return;
        }

        const stickMap = stick === 'left' ? profile.left_joycon_stick : profile.right_joycon_stick;
        if (!stickMap) return;

        const directions = [
            { axis: y, neg: 'stick_up', pos: 'stick_down', stateKey: `${stick}_y` },
            { axis: x, neg: 'stick_left', pos: 'stick_right', stateKey: `${stick}_x` }
        ];

        for (const dir of directions) {
            const ryujinxKey = dir.axis < -threshold ? stickMap[dir.neg] : (dir.axis > threshold ? stickMap[dir.pos] : null);
            const robotKey = ryujinxKey && ryujinxKey !== 'Unbound' ? RYUJINX_TO_ROBOTJS[ryujinxKey] : null;
            const wasActive = this.analogState[playerIndex][dir.stateKey];

            if (robotKey && this.robot) {
                if (!wasActive) {
                    try { this.robot.keyToggle(robotKey, 'down'); } catch (e) { }
                    this.analogState[playerIndex][dir.stateKey] = true;
                }
            } else if (wasActive) {
                // Release previous key
                const prevKey = dir.axis < 0 ? stickMap[dir.neg] : stickMap[dir.pos];
                const prevRobotKey = prevKey ? RYUJINX_TO_ROBOTJS[prevKey] : null;
                if (prevRobotKey && this.robot) {
                    try { this.robot.keyToggle(prevRobotKey, 'up'); } catch (e) { }
                }
                this.analogState[playerIndex][dir.stateKey] = false;
            }
        }
    }

    getPlayerProfile(playerIndex: number) {
        const profile = this.profiles[playerIndex];
        if (!profile) return null;
        const controllerType = profile.controller_type || (playerIndex % 2 === 1 ? 'JoyconLeft' : 'JoyconRight');
        return {
            type: controllerType === 'JoyconLeft' ? 'left_joycon' : 'right_joycon'
        };
    }

    setActivePlayer(playerIndex: number): void {
        this.currentPlayer = playerIndex;
    }

    getActivePlayer(): number {
        return this.currentPlayer;
    }
}
