import { IPlugin } from './IPlugin';
import fs from 'fs';
import path from 'path';

// --- ROBOTJS MAPPING (Ryujinx Key Name -> RobotJS Key) ---
const RYUJINX_TO_ROBOTJS: Record<string, string> = {
    'A': 'a', 'B': 'b', 'C': 'c', 'D': 'd', 'E': 'e', 'F': 'f', 'G': 'g', 'H': 'h', 'I': 'i', 'J': 'j', 'K': 'k', 'L': 'l', 'M': 'm',
    'N': 'n', 'O': 'o', 'P': 'p', 'Q': 'q', 'R': 'r', 'S': 's', 'T': 't', 'U': 'u', 'V': 'v', 'W': 'w', 'X': 'x', 'Y': 'y', 'Z': 'z',
    'Number0': '0', 'Number1': '1', 'Number2': '2', 'Number3': '3', 'Number4': '4', 'Number5': '5', 'Number6': '6', 'Number7': '7', 'Number8': '8', 'Number9': '9',
    'F1': 'f1', 'F2': 'f2', 'F3': 'f3', 'F4': 'f4', 'F5': 'f5', 'F6': 'f6', 'F7': 'f7', 'F8': 'f8', 'F9': 'f9', 'F10': 'f10', 'F11': 'f11', 'F12': 'f12',
    'Keypad0': 'numpad_0', 'Keypad1': 'numpad_1', 'Keypad2': 'numpad_2', 'Keypad3': 'numpad_3', 'Keypad4': 'numpad_4',
    'Keypad5': 'numpad_5', 'Keypad6': 'numpad_6', 'Keypad7': 'numpad_7', 'Keypad8': 'numpad_8', 'Keypad9': 'numpad_9',
    'KeypadDivide': 'numpad_divide', 'KeypadMultiply': 'numpad_multiply', 'KeypadSubtract': 'numpad_subtract', 'KeypadAdd': 'numpad_add',
    'KeypadEnter': 'numpad_enter', 'KeypadDecimal': 'numpad_decimal',
    'Up': 'up', 'Down': 'down', 'Left': 'left', 'Right': 'right',
    'Enter': 'enter', 'Space': 'space', 'Tab': 'tab', 'Backspace': 'backspace', 'Escape': 'escape', 'CapsLock': 'capslock',
    'ShiftLeft': 'shift', 'ShiftRight': 'shift', 'ControlLeft': 'control', 'AltLeft': 'alt',
    'Home': 'home', 'End': 'end', 'PageUp': 'pageup', 'PageDown': 'pagedown', 'Insert': 'insert', 'Delete': 'delete',
    'Minus': 'minus', 'Plus': 'equal', 'Equal': 'equal',
    'BracketLeft': 'open_bracket', 'BracketRight': 'close_bracket',
    'Backslash': 'backslash', 'Semicolon': 'semicolon', 'Quote': 'quote',
    'Comma': 'comma', 'Period': 'period', 'Slash': 'slash', 'Backquote': '`'
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
    'Plus': ['right_joycon', 'button_plus']
};

export class RyujinxPlugin implements IPlugin {
    name = "Ryujinx Keyboard (Embedded)";
    version = "4.0.0";
    maxPlayers = 4;
    private robot: any;
    private currentPlayer: number = 0;

    // --- EMBEDDED CONFIGS (Source of Truth) ---
    private profiles: Record<number, any> = {
        1: {
            "left_joycon_stick": { "stick_up": "W", "stick_down": "S", "stick_left": "A", "stick_right": "D", "stick_button": "F" },
            "right_joycon_stick": { "stick_up": "I", "stick_down": "K", "stick_left": "J", "stick_right": "L", "stick_button": "H" },
            "left_joycon": { "button_minus": "Minus", "button_l": "E", "button_zl": "Q", "button_sl": "Unbound", "button_sr": "Unbound", "dpad_up": "Up", "dpad_down": "Down", "dpad_left": "Left", "dpad_right": "Right" },
            "right_joycon": { "button_plus": "Plus", "button_r": "U", "button_zr": "O", "button_sl": "Unbound", "button_sr": "Unbound", "button_x": "C", "button_b": "X", "button_y": "V", "button_a": "Z" },
            "version": 1, "backend": "WindowKeyboard", "id": "0", "name": "FreeJoy Player 1", "controller_type": "ProController", "player_index": "Player1"
        },
        2: {
            "left_joycon_stick": { "stick_up": "Keypad8", "stick_down": "Keypad2", "stick_left": "Keypad4", "stick_right": "Keypad6", "stick_button": "Keypad5" },
            "right_joycon_stick": { "stick_up": "Home", "stick_down": "End", "stick_left": "Delete", "stick_right": "PageDown", "stick_button": "Insert" },
            "left_joycon": { "button_minus": "KeypadSubtract", "button_l": "Keypad7", "button_zl": "KeypadDecimal", "button_sl": "Unbound", "button_sr": "Unbound", "dpad_up": "KeypadDivide", "dpad_down": "Number0", "dpad_left": "Keypad9", "dpad_right": "Keypad3" },
            "right_joycon": { "button_plus": "KeypadEnter", "button_r": "KeypadMultiply", "button_zr": "KeypadAdd", "button_sl": "Unbound", "button_sr": "Unbound", "button_x": "Up", "button_b": "Down", "button_y": "Left", "button_a": "Right" },
            "version": 1, "backend": "WindowKeyboard", "id": "1", "name": "FreeJoy Player 2", "controller_type": "ProController", "player_index": "Player2"
        },
        3: {
            "left_joycon_stick": { "stick_up": "F1", "stick_down": "F2", "stick_left": "F3", "stick_right": "F4", "stick_button": "F5" },
            "right_joycon_stick": { "stick_up": "F6", "stick_down": "F7", "stick_left": "F8", "stick_right": "F9", "stick_button": "F10" },
            "left_joycon": { "button_minus": "F11", "button_l": "BracketLeft", "button_zl": "Backslash", "button_sl": "Unbound", "button_sr": "Unbound", "dpad_up": "Number9", "dpad_down": "Number0", "dpad_left": "Number8", "dpad_right": "Minus" },
            "right_joycon": { "button_plus": "F12", "button_r": "BracketRight", "button_zr": "Quote", "button_sl": "Unbound", "button_sr": "Unbound", "button_x": "Semicolon", "button_b": "Period", "button_y": "Comma", "button_a": "Slash" },
            "version": 1, "backend": "WindowKeyboard", "id": "2", "name": "FreeJoy Player 3", "controller_type": "ProController", "player_index": "Player3"
        },
        4: {
            "left_joycon_stick": { "stick_up": "Number1", "stick_down": "Number2", "stick_left": "Number3", "stick_right": "Number4", "stick_button": "Number5" },
            "right_joycon_stick": { "stick_up": "Number6", "stick_down": "Number7", "stick_left": "Backquote", "stick_right": "Tab", "stick_button": "CapsLock" },
            "left_joycon": { "button_minus": "Backspace", "button_l": "B", "button_zl": "N", "button_sl": "Unbound", "button_sr": "Unbound", "dpad_up": "T", "dpad_down": "G", "dpad_left": "R", "dpad_right": "Y" },
            "right_joycon": { "button_plus": "Space", "button_r": "M", "button_zr": "P", "button_sl": "Unbound", "button_sr": "Unbound", "button_x": "PageUp", "button_b": "PageDown", "button_y": "End", "button_a": "Home" },
            "version": 1, "backend": "WindowKeyboard", "id": "3", "name": "FreeJoy Player 4", "controller_type": "ProController", "player_index": "Player4"
        }
    };

    // Runtime cache for fast lookup: [PlayerId][Button] -> RobotKey
    private mappings: Record<number, Record<string, string>> = {};

    async init(): Promise<void> {
        // 1. Initialize RobotJS
        try {
            this.robot = require('@hurdlegroup/robotjs');
            const _ = this.robot.getScreenSize();
        } catch (e) {
            console.error('[Ryujinx] @hurdlegroup/robotjs not found – keyboard input disabled.');
            this.robot = null;
        }

        // 2. Export Configs to Disk (Ensure Consistency)
        this.exportConfigs();

        // 3. Parse internal configs for Input Mapping
        this.parseMappings();
    }

    async cleanup(): Promise<void> {
        console.log('[Ryujinx] Cleanup');
    }

    // Write embedded profiles to server/configs/ to prevent drift
    private exportConfigs() {
        const configDir = path.join(process.cwd(), 'configs');
        if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

        for (const [id, profile] of Object.entries(this.profiles)) {
            const file = path.join(configDir, `ryujinx_profile_p${id}.json`);
            // Only write if changed? Or always overwrite to enforce truth?
            // Overwriting ensures the plugin is always the boss.
            fs.writeFileSync(file, JSON.stringify(profile, null, 2));
            console.log(`[Ryujinx] Exported P${id} config.`);
        }
    }

    private parseMappings() {
        for (const [idStr, profile] of Object.entries(this.profiles)) {
            const playerId = parseInt(idStr);
            const playerMap: Record<string, string> = {};

            for (const [clientBtn, jsonPath] of Object.entries(CLIENT_TO_CONFIG_PATH)) {
                let node = profile;
                for (const key of jsonPath) {
                    if (node) node = node[key];
                }

                if (node && typeof node === 'string' && node !== 'Unbound') {
                    const robotKey = RYUJINX_TO_ROBOTJS[node];
                    if (robotKey) {
                        playerMap[clientBtn] = robotKey;
                    }
                }
            }
            this.mappings[playerId] = playerMap;
        }
    }

    sendButtonPress(playerIndex: number, button: string, pressed: boolean): void {
        this.currentPlayer = playerIndex;
        const mapping = this.mappings[playerIndex];
        if (!mapping) return;

        const key = mapping[button];
        if (key && this.robot) {
            try {
                this.robot.keyToggle(key, pressed ? 'down' : 'up');
            } catch (err) { }
        }
    }

    sendAnalogInput(playerIndex: number, stick: 'left' | 'right', x: number, y: number): void {
        // Placeholder
    }
}
