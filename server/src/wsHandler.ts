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

            socket.on('join', (data: { roomId: string, clientId?: string }) => {
                // Use client IP as persistent identifier (works across Safari/PWA on iOS)
                // UPDATE: Prefer UUID if sent
                const { roomId, clientId } = data;
                const finalClientId = clientId || socket.handshake.address;

                console.log(`[WS] Join attempt from ${finalClientId} (${socket.id}) for room ${roomId}`);

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

                const player = this.room.join(finalClientId, socket.id);
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
                socket.emit('joined', {
                    playerId: player.id,
                    roomId: this.room.roomId,
                    profile: profile
                });
                this.broadcastState();
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
