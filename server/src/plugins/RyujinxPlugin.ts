import { IPlugin } from './IPlugin';

// Keyboard mappings for 4 players
// Layout: D-Pad (LEFT side) | Action Buttons (RIGHT side)
const PLAYER_MAPPINGS: Record<number, Record<string, string>> = {
    1: { // Player 1 - WASD cluster
        // Action Buttons (RIGHT - IJKL area)
        'A': 'l',      // Right
        'B': 'k',      // Down  
        'X': 'i',      // Up
        'Y': 'j',      // Left
        'L': 'u',      // Top left
        'R': 'o',      // Top right
        'ZL': '7',
        'ZR': '8',
        'Start': 'enter',
        'Select': 'shift',
        // D-Pad (LEFT - WASD)
        'Up': 'w',
        'Down': 's',
        'Left': 'a',
        'Right': 'd'
    },
    2: { // Player 2 - Numpad + arrows
        // Action Buttons (RIGHT - Numpad)
        'A': 'numpad_6',
        'B': 'numpad_2',
        'X': 'numpad_8',
        'Y': 'numpad_4',
        'L': 'numpad_7',
        'R': 'numpad_9',
        'ZL': 'numpad_divide',
        'ZR': 'numpad_multiply',
        'Start': 'numpad_enter',
        'Select': 'numpad_subtract',
        // D-Pad (LEFT - Arrow keys)
        'Up': 'up',
        'Down': 'down',
        'Left': 'left',
        'Right': 'right'
    },
    3: { // Player 3 - TFGH cluster
        // Action Buttons (RIGHT)
        'A': 'p',
        'B': 'semicolon',
        'X': 'quote',
        'Y': 'l',
        'L': 'open_bracket',
        'R': 'close_bracket',
        'ZL': '9',
        'ZR': '0',
        'Start': 'backspace',
        'Select': 'backslash',
        // D-Pad (LEFT - TFGH)
        'Up': 't',
        'Down': 'g',
        'Left': 'f',
        'Right': 'h'
    },
    4: { // Player 4 - YGHJ cluster  
        // Action Buttons (RIGHT)
        'A': 'period',
        'B': 'comma',
        'X': 'm',
        'Y': 'n',
        'L': 'minus',
        'R': 'equal',
        'ZL': '5',
        'ZR': '6',
        'Start': 'tab',
        'Select': 'capslock',
        // D-Pad (LEFT - YGHJ)
        'Up': 'y',
        'Down': 'b',
        'Left': 'v',
        'Right': 'n'
    }
};

export class RyujinxPlugin implements IPlugin {
    name = "Ryujinx Keyboard (4 Players)";
    version = "2.0.0";
    private robot: any;

    async init(): Promise<void> {
        try {
            this.robot = require('robotjs');
            const size = this.robot.getScreenSize();
            console.log(`[Ryujinx] Ready. Screen: ${size.width}x${size.height}`);
            console.log(`[Ryujinx] 4-Player keyboard mapping enabled`);
        } catch (e) {
            console.error("[Ryujinx] Warning: robotjs not found. Keyboard input disabled.");
            this.robot = {
                keyToggle: (key: string, state: string) => {
                    console.log(`[Mock-Robot] P${this.currentPlayer || '?'} Key ${key} ${state}`);
                },
                getScreenSize: () => ({ width: 0, height: 0 })
            };
        }
    }

    private currentPlayer: number = 0;

    async cleanup(): Promise<void> {
        console.log("[Ryujinx] Cleanup");
    }

    sendButtonPress(playerIndex: number, button: string, pressed: boolean): void {
        this.currentPlayer = playerIndex;

        // Get mapping for this player
        const mapping = PLAYER_MAPPINGS[playerIndex];
        if (!mapping) {
            console.warn(`[Ryujinx] No mapping for player ${playerIndex}`);
            return;
        }

        const key = mapping[button];
        if (key && this.robot) {
            try {
                this.robot.keyToggle(key, pressed ? 'down' : 'up');
            } catch (err) {
                // Ignore errors
            }
        }
    }

    sendAnalogInput(playerIndex: number, stick: 'left' | 'right', x: number, y: number): void {
        // Not implemented
    }
}

