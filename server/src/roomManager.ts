import { v4 as uuidv4 } from 'uuid';
import { Player, RoomState } from './types';
import { networkInterfaces } from 'os';

export class RoomManager {
    public readonly roomId: string;
    private players: Map<number, Player> = new Map(); // Slot ID (1-4) -> Player
    private readonly MAX_PLAYERS = 4;

    constructor() {
        this.roomId = uuidv4().split('-')[0].toUpperCase();
        console.log(`[Room] Ephemeral Room Created: ${this.roomId}`);
    }

    public validateRoom(id: string): boolean {
        const isValid = this.roomId === id;
        if (!isValid) {
            console.log(`[Room] Validation Failed: Received '${id}' vs Expected '${this.roomId}'`);
        }
        return isValid;
    }

    public join(clientId: string, socketId: string): Player | null {
        // 1. Check if this client is already assigned a slot (Reconnect)
        for (const [slot, player] of this.players.entries()) {
            if (player.clientId === clientId) {
                player.socketId = socketId;
                player.connected = true;
                player.lastPing = Date.now();
                console.log(`[Room] Player ${slot} Reconnected (Client: ${clientId.slice(0, 4)})`);
                return player;
            }
        }

        // 2. Assign new slot
        for (let i = 1; i <= this.MAX_PLAYERS; i++) {
            if (!this.players.has(i)) {
                const newPlayer: Player = {
                    id: i,
                    clientId,
                    socketId,
                    connected: true,
                    lastPing: Date.now()
                };
                this.players.set(i, newPlayer);
                console.log(`[Room] Player ${i} Joined (Client: ${clientId.slice(0, 4)})`);
                return newPlayer;
            }
        }

        // 3. Room full
        return null;
    }

    public disconnect(socketId: string): void {
        for (const player of this.players.values()) {
            if (player.socketId === socketId) {
                player.connected = false;
                console.log(`[Room] Player ${player.id} Disconnected`);
            }
        }
    }

    public handlePing(socketId: string) {
        for (const player of this.players.values()) {
            if (player.socketId === socketId) {
                player.lastPing = Date.now();
                player.connected = true; // Implicitly connected if pinging
            }
        }
    }

    public cleanupStale(timeoutMs: number = 30000): void {
        const now = Date.now();
        for (const [slot, player] of this.players.entries()) {
            if (!player.connected && (now - player.lastPing > timeoutMs)) {
                console.log(`[Room] purging stale player ${slot}`);
                this.players.delete(slot);
            }
        }
    }

    public getPlayerBySocket(socketId: string): Player | undefined {
        for (const player of this.players.values()) {
            if (player.socketId === socketId) return player;
        }
        return undefined;
    }

    // Helper to get Local IP with Wi-Fi priority
    private getLocalIP(): string {
        // Allow manual override via environment variable
        if (process.env.PUBLIC_HOST) {
            return process.env.PUBLIC_HOST;
        }

        const nets = networkInterfaces();

        // First pass: Look for Wi-Fi interfaces specifically
        for (const name of Object.keys(nets)) {
            const nameLower = name.toLowerCase();
            // Check for common Wi-Fi interface names
            if (nameLower.includes('wi-fi') ||
                nameLower.includes('wifi') ||
                nameLower.includes('wlan') ||
                nameLower.includes('wireless') ||
                nameLower.startsWith('wl')) {

                const iface = nets[name];
                if (iface) {
                    for (const net of iface) {
                        if (net.family === 'IPv4' && !net.internal) {
                            console.log(`[Room] Using Wi-Fi IP: ${net.address} (${name})`);
                            return net.address;
                        }
                    }
                }
            }
        }

        // Second pass: Fallback to any external IPv4
        for (const name of Object.keys(nets)) {
            const iface = nets[name];
            if (iface) {
                for (const net of iface) {
                    if (net.family === 'IPv4' && !net.internal) {
                        console.log(`[Room] Using fallback IP: ${net.address} (${name})`);
                        return net.address;
                    }
                }
            }
        }

        return '127.0.0.1';
    }

    public getState(): RoomState {
        return {
            roomId: this.roomId,
            serverIp: this.getLocalIP(),
            players: Array.from(this.players.values())
        };
    }
}
