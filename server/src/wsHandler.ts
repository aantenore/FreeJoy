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

            socket.on('join', (data: { roomId: string }) => {
                // Use client IP as persistent identifier (works across Safari/PWA on iOS)
                const clientIp = socket.handshake.address;
                const clientId = clientIp; // IP as unique identifier

                console.log(`[WS] Join attempt from ${clientId} (${socket.id}) for room ${data.roomId}`);

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

                const player = this.room.join(clientId, socket.id);
                if (!player) {
                    socket.emit('error', { code: 'ROOM_FULL', message: 'Room is full.' });
                    return;
                }

                // Success
                socket.emit('joined', { playerId: player.id, roomId: this.room.roomId });
                this.broadcastState();
            });

            socket.on('input', (data: { btn: string; state: 0 | 1 }) => {
                const player = this.room.getPlayerBySocket(socket.id);
                if (!player) return;

                // Bridge to Plugin
                console.log(`[Input] P${player.id} ${data.btn} ${data.state}`);
                this.plugin.sendButtonPress(player.id, data.btn, data.state === 1);
            });

            socket.on('ping', () => {
                this.room.handlePing(socket.id);
                socket.emit('pong');
            });

            socket.on('disconnect', () => {
                this.room.disconnect(socket.id);
                this.broadcastState();
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
}
