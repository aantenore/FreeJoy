import { v4 as uuidv4 } from 'uuid';
import { Player, RoomState } from './types';
import { networkInterfaces } from 'os';

export class RoomManager {
    public readonly roomId: string;
    private players: Map<number, Player> = new Map(); // Slot ID (1-4) -> Player
    private MAX_PLAYERS: number;
    private cachedServerIp: string; // Cache IP for performance

    constructor(maxPlayers: number = 4) {
        this.roomId = uuidv4().split('-')[0].toUpperCase();
        this.MAX_PLAYERS = maxPlayers;
        this.cachedServerIp = this.detectLocalIP(); // Cache IP at startup
        console.log(`[Room] Ephemeral Room Created: ${this.roomId}`);
        console.log(`[Room] Server IP: ${this.cachedServerIp}`);
        console.log(`[Room] Max Players: ${this.MAX_PLAYERS}`);
    }

    public validateRoom(id: string): boolean {
        const isValid = this.roomId === id;
        if (!isValid) {
            console.log(`[Room] Validation Failed: Received '${id}' vs Expected '${this.roomId}'`);
        }
        return isValid;
    }

    public isFull(): boolean {
        return this.players.size >= this.MAX_PLAYERS;
    }

    public join(clientId: string, socketId: string, requestedSlot?: number): Player | null {
        // 1. Specific Slot Request (QR Code Scan / PWA Preference)
        if (requestedSlot && requestedSlot >= 1 && requestedSlot <= this.MAX_PLAYERS) {
            const existing = this.players.get(requestedSlot);
            if (existing) {
                // If occupied by ME -> Reconnect
                if (existing.clientId === clientId) {
                    existing.socketId = socketId;
                    existing.connected = true;
                    existing.lastPing = Date.now();
                    console.log(`[Room] Player ${requestedSlot} Reconnected (Specific Slot)`);
                    return existing;
                } else {
                    // Occupied by someone else. Fallback.
                    console.log(`[Room] Slot ${requestedSlot} occupied. Falling back to auto-assign.`);
                }
            } else {
                // Free Slot -> Take it
                // CRITICAL: Remove specific client from ANY other slots first to prevent duplicates
                for (const [slot, p] of this.players.entries()) {
                    if (p.clientId === clientId) {
                        console.log(`[Room] Moving Client ${clientId} from Slot ${slot} to ${requestedSlot}`);
                        this.players.delete(slot);
                    }
                }

                const newPlayer: Player = { id: requestedSlot, clientId, socketId, connected: true, lastPing: Date.now() };
                this.players.set(requestedSlot, newPlayer);
                console.log(`[Room] Player ${requestedSlot} Joined (Specific Slot)`);
                return newPlayer;
            }
        }

        // 2. Check if I already have ANY slot (Reconnect general)
        // ... keeps existing slot if I have one
        // First check if I already have ANY slot
        for (const [slot, player] of this.players.entries()) {
            if (player.clientId === clientId) {
                player.socketId = socketId;
                player.connected = true;
                player.lastPing = Date.now();
                return player;
            }
        }

        // 3. Assign first free slot
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
                console.log(`[Room] Player ${i} Joined (Auto-Assign)`);
                return newPlayer;
            }
        }

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
    private detectLocalIP(): string {
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
            serverIp: this.cachedServerIp, // Use cached IP for performance
            players: Array.from(this.players.values()),
            maxPlayers: this.MAX_PLAYERS
        };
    }
}
