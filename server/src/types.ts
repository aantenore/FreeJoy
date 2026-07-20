export type Player = {
    id: number;           // 1-4
    reconnectKey: string; // SHA-256 key for a server-issued reconnect capability
    socketId?: string;    // Current socket ID (can change on reconnect)
    connected: boolean;
    lastPing: number;
    deviceName?: string;  // Device name from user agent
};

export type PublicPlayer = {
    playerId: number;
    connected: boolean;
    deviceName?: string;
};

export type PublicRoomState = {
    players: PublicPlayer[];
    maxPlayers: number;
};

export type HostRoomState = PublicRoomState & {
    roomId: string;
    serverIp: string;
    joinUrl: string;
};
