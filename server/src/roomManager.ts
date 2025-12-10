import { v4 as uuidv4 } from 'uuid';
import { Player, RoomState } from './types';
import { networkInterfaces } from 'os';

export class RoomManager {
    public readonly roomId: string;
    private players: Map<number, Player> = new Map(); // Slot ID (1-4) -> Player
    private MAX_PLAYERS: number;
    private cachedServerIp: string; // Cache IP for performance
    private kickedClients: Set<string> = new Set(); // Track kicked clientIds

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

    public join(clientId: string, socketId: string, deviceName?: string): Player | null {
        // Prevent kicked players from rejoining
        if (this.kickedClients.has(clientId)) {
            console.log(`[Room] Blocked kicked client ${clientId} from rejoining`);
            return null;
        }

        // 1. Check if I already have ANY slot (Reconnect)
        for (const [slot, player] of this.players.entries()) {
            if (player.clientId === clientId) {
                player.socketId = socketId;
                player.connected = true;
                player.lastPing = Date.now();
                if (deviceName) player.deviceName = deviceName;
                console.log(`[Room] Player ${slot} Reconnected`);
                return player;
            }
        }

        // 2. Assign first free slot (Auto-assignment)
        for (let i = 1; i <= this.MAX_PLAYERS; i++) {
            if (!this.players.has(i)) {
                const newPlayer: Player = {
                    id: i,
                    clientId,
                    socketId,
                    connected: true,
                    lastPing: Date.now(),
                    deviceName
                };
                this.players.set(i, newPlayer);
                console.log(`[Room] Player ${i} Joined (Auto-Assigned)${deviceName ? ` - ${deviceName}` : ''}`);
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

    public getPlayersList(): Array<{ playerId: number; connected: boolean; deviceName?: string }> {
        return Array.from(this.players.values()).map(p => ({
            playerId: p.id,
            connected: p.connected,
            deviceName: p.deviceName
        }));
    }

    public kickPlayer(playerId: number): Player | null {
        const player = this.players.get(playerId);
        if (player) {
            this.players.delete(playerId);
            this.kickedClients.add(player.clientId); // Prevent rejoin
            console.log(`[Room] Player ${playerId} kicked (clientId: ${player.clientId})`);
            return player;
        }
        return null;
    }

    public reset(): Player[] {
        // Get all current players before clearing
        const allPlayers = Array.from(this.players.values());

        // Clear everything
        this.players.clear();
        this.kickedClients.clear();

        console.log(`[Room] Room reset - ${allPlayers.length} players removed`);
        return allPlayers;
    }
}
