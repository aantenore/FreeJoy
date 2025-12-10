import { Server, Socket } from 'socket.io';
import { RoomManager } from './roomManager';
import { IPlugin } from './plugins/IPlugin';

export class WSHandler {
    constructor(
        private io: Server,
        private room: RoomManager,
        private plugin: IPlugin
    ) { }

    public init() {
        this.io.on('connection', (socket: Socket) => {
            console.log(`[WS] New Connection: ${socket.id} from ${socket.handshake.address}`);

            socket.on('join', (data: { roomId: string, clientId?: string, deviceName?: string }) => {
                // Use client IP as persistent identifier (works across Safari/PWA on iOS)
                // UPDATE: Prefer UUID if sent
                const { roomId, clientId, deviceName } = data;
                const finalClientId = clientId || socket.handshake.address;
                const finalDeviceName = deviceName || socket.handshake.headers['user-agent'] || 'Unknown Device';

                console.log(`[WS] Join attempt from ${finalClientId} (${socket.id}) for room ${roomId}`);
                console.log(`[WS] Device Name: "${finalDeviceName}"`);

                // Validate Room ID (Ephemeral Check)
                if (!this.room.validateRoom(data.roomId)) {
                    // REQUIREMENT: Redirect "lost" clients to the active room IF it has space
                    if (!this.room.isFull()) {
                        console.log(`[WS] Client ${clientId} sent wrong Room ID. Redirecting to ${this.room.roomId}`);
                        socket.emit('room_redirect', { newRoomId: this.room.roomId });
                        return;
                    }

                    socket.emit('error', { code: 'ROOM_CLOSED', message: 'Room does not exist or has expired.' });
                    return;
                }

                const player = this.room.join(finalClientId, socket.id, finalDeviceName);
                if (!player) {
                    if (this.room.isFull()) {
                        socket.emit('error', { code: 'ROOM_FULL', message: 'Room is full.' });
                    } else {
                        socket.emit('error', { code: 'ROOM_FULL', message: 'No free slots.' });
                    }
                    return;
                }

                // Success
                const profile = this.plugin.getProfile ? this.plugin.getProfile(player.id) : null;

                // Initialize virtual controller immediately
                if (this.plugin.initPlayer) {
                    this.plugin.initPlayer(player.id);
                }

                socket.emit('joined', {
                    playerId: player.id,
                    roomId: this.room.roomId,
                    profile: profile
                });
                this.broadcastState();
                this.broadcastPlayerList(); // Notify all about new player
            });

            // Get connected players list
            socket.on('get_players', () => {
                socket.emit('players_list', this.room.getPlayersList());
            });

            // Kick a player
            socket.on('kick_player', (data: { playerId: number }) => {
                const kicked = this.room.kickPlayer(data.playerId);
                if (kicked) {
                    // Only try to disconnect if player is still connected
                    if (kicked.connected && kicked.socketId) {
                        this.io.to(kicked.socketId).emit('kicked', { reason: 'Host kicked you' });
                        const kickedSocket = this.io.sockets.sockets.get(kicked.socketId);
                        if (kickedSocket) kickedSocket.disconnect(true);
                    }
                    this.broadcastPlayerList();
                }
            });

            // Reset room (disconnect all, clear banned list)
            socket.on('reset_room', () => {
                console.log('[WS] Room reset requested');
                const allPlayers = this.room.reset();

                // Disconnect all connected players
                allPlayers.forEach(player => {
                    if (player.connected && player.socketId) {
                        this.io.to(player.socketId).emit('kicked', { reason: 'Room was reset by host' });
                        const playerSocket = this.io.sockets.sockets.get(player.socketId);
                        if (playerSocket) playerSocket.disconnect(true);
                    }
                });

                this.broadcastPlayerList();
                socket.emit('room_reset_complete');
            });

            socket.on('input', (data: { btn: string; state: 0 | 1 }) => {
                const player = this.room.getPlayerBySocket(socket.id);
                if (!player) return;

                // Bridge to Plugin
                console.log(`[Input] P${player.id} ${data.btn} ${data.state}`);
                this.plugin.sendButtonPress(player.id, data.btn, data.state === 1);
            });

            // Analog Stick Input
            socket.on('analog', (data: { stick: 'left' | 'right'; x: number; y: number }) => {
                const player = this.room.getPlayerBySocket(socket.id);
                if (!player) return;

                // Bridge to Plugin
                console.log(`[Analog] P${player.id} ${data.stick} X:${data.x.toFixed(2)} Y:${data.y.toFixed(2)}`);
                this.plugin.sendAnalogInput(player.id, data.stick, data.x, data.y);
            });

            socket.on('ping', () => {
                this.room.handlePing(socket.id);
                socket.emit('pong');
            });

            socket.on('disconnect', () => {
                this.room.disconnect(socket.id);
                this.broadcastState();
                this.broadcastPlayerList(); // Update player list on disconnect
            });
        });

        // Periodic State Broadcast & Cleanup
        setInterval(() => {
            this.room.cleanupStale();
            this.broadcastState();
        }, 2000);
    }

    private broadcastState() {
        this.io.emit('room_state', this.room.getState());
    }

    private broadcastPlayerList() {
        this.io.emit('players_list', this.room.getPlayersList());
    }
}
