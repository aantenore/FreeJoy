import { IPlugin } from './IPlugin';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

export class RyujinxPlugin implements IPlugin {
    name = "Ryujinx Virtual Gamepad";
    version = "7.0.0-VGAMEPAD";
    maxPlayers = 4;
    private pythonProcess: ChildProcess | null = null;

    constructor() {
        console.log('[Ryujinx] Initializing Virtual Gamepad Plugin...');
    }

    async init(): Promise<void> {
        console.log('[Ryujinx] Starting Python VGamepad Service...');

        const pythonScript = path.join(__dirname, '../python/virtual_gamepad.py');

        // Spawn Python process
        this.pythonProcess = spawn('python', [pythonScript], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        // Log Python stderr (where vgamepad logs go)
        this.pythonProcess.stderr?.on('data', (data) => {
            console.log(`[Python] ${data.toString().trim()}`);
        });

        // Log Python stdout
        this.pythonProcess.stdout?.on('data', (data) => {
            console.log(`[Python OUT] ${data.toString().trim()}`);
        });

        this.pythonProcess.on('error', (err) => {
            console.error('[Ryujinx] Python process error:', err);
        });

        this.pythonProcess.on('exit', (code, signal) => {
            console.log(`[Ryujinx] Python process exited with code ${code}, signal ${signal}`);
            this.pythonProcess = null;
        });

        console.log('[Ryujinx] Python VGamepad Service started');
    }

    async cleanup(): Promise<void> {
        console.log('[Ryujinx] Cleaning up Python process...');
        if (this.pythonProcess) {
            this.pythonProcess.kill();
            this.pythonProcess = null;
        }
    }

    private sendCommand(cmd: object): void {
        if (!this.pythonProcess || !this.pythonProcess.stdin) {
            console.error('[Ryujinx] Python process not available');
            return;
        }

        try {
            const json = JSON.stringify(cmd) + '\n';
            this.pythonProcess.stdin.write(json);
        } catch (err) {
            console.error('[Ryujinx] Failed to send command to Python:', err);
        }
    }

    sendButtonPress(playerIndex: number, button: string, pressed: boolean): void {
        console.log(`[Ryujinx] P${playerIndex} ${button} ${pressed ? 'pressed' : 'released'}`);
        this.sendCommand({
            action: 'button',
            playerId: playerIndex,
            button: button,
            pressed: pressed
        });
    }

    sendAnalogInput(playerIndex: number, stick: 'left' | 'right', x: number, y: number): void {
        console.log(`[Ryujinx] P${playerIndex} ${stick}_stick X:${x.toFixed(2)} Y:${y.toFixed(2)}`);
        this.sendCommand({
            action: 'analog',
            playerId: playerIndex,
            stick: stick,
            x: x,
            y: y
        });
    }

    getPlayerProfile(playerIndex: number) {
        // Always return Pro Controller profile for all players
        return {
            type: 'pro'
        };
    }

    setActivePlayer(playerIndex: number): void {
        // Not needed for vgamepad approach
    }

    getActivePlayer(): number {
        return 1; // Not used
    }

    playerDisconnected(playerIndex: number): void {
        console.log(`[Ryujinx] Player ${playerIndex} disconnected, cleaning up controller`);
        this.sendCommand({
            action: 'disconnect',
            playerId: playerIndex
        });
    }
}
