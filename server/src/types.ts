export type Player = {
    id: number;           // 1-4
    clientId: string;     // UUID from client
    socketId?: string;    // Current socket ID (can change on reconnect)
    connected: boolean;
    lastPing: number;
    deviceName?: string;  // Device name from user agent
};

export type RoomState = {
    roomId: string;
    serverIp?: string;
    players: Player[];
    maxPlayers: number;
};
