import { Server, Socket } from 'socket.io';
import { CapabilityAuthority } from './authority';
import { RoomManager } from './roomManager';
import { IPlugin } from './plugins/IPlugin';
import {
    FixedWindowRateLimiter,
    OperationError,
    parseAnalogRequest,
    parseButtonRequest,
    parseJoinRequest,
    parsePlayerId
} from './protocol';

export type WSHandlerOptions = {
    cleanupIntervalMs?: number;
    staleTimeoutMs?: number;
    maximumInputEventsPerSecond?: number;
    now?: () => number;
};

const HOST_SOCKET_ROOM = 'freejoy:authorized-hosts';

export class WSHandler {
    private readonly activePlayers = new Set<number>();
    private readonly inputLimiters = new Map<
        string,
        { limiter: FixedWindowRateLimiter; lastSeenAt: number }
    >();
    private readonly cleanupIntervalMs: number;
    private readonly staleTimeoutMs: number;
    private readonly maximumInputEventsPerSecond: number;
    private readonly now: () => number;
    private cleanupTimer?: NodeJS.Timeout;

    constructor(
        private readonly io: Server,
        private readonly room: RoomManager,
        private readonly plugin: IPlugin,
        private readonly authority: CapabilityAuthority,
        options: WSHandlerOptions = {}
    ) {
        this.cleanupIntervalMs = options.cleanupIntervalMs ?? 2_000;
        this.staleTimeoutMs = options.staleTimeoutMs ?? 30_000;
        this.maximumInputEventsPerSecond = options.maximumInputEventsPerSecond ?? 120;
        this.now = options.now ?? Date.now;
    }

    public init(): void {
        this.io.on('connection', (socket: Socket) => {
            const role = socket.handshake.auth?.role;
            const token = socket.handshake.auth?.token;
            console.log(`[WS] New ${String(role)} connection: ${socket.id}`);

            if (role === 'host' && this.authority.permitsHost(token)) {
                socket.join(HOST_SOCKET_ROOM);
                this.registerHostHandlers(socket);
                socket.emit('room_state', this.room.getPublicState());
                socket.emit('players_list', this.room.getPlayersList());
                return;
            }

            if (role === 'player' && this.authority.permitsJoin(token)) {
                this.registerPlayerHandlers(socket);
                return;
            }

            this.rejectConnection(socket);
        });

        this.cleanupTimer = setInterval(() => this.cleanupStalePlayers(), this.cleanupIntervalMs);
        this.cleanupTimer.unref();
    }

    public cleanupStalePlayers(): void {
        for (const player of this.room.cleanupStale(this.staleTimeoutMs)) {
            this.releasePlayer(player.id);
            this.inputLimiters.delete(player.clientId);
            if (player.socketId) {
                const socket = this.io.sockets.sockets.get(player.socketId);
                if (socket) {
                    this.emitError(
                        socket,
                        'STALE_SESSION',
                        'The controller lease expired and was released.'
                    );
                    setImmediate(() => socket.disconnect(true));
                }
            }
        }
        this.pruneInputLimiters();
        this.broadcastState();
        this.broadcastPlayerList();
    }

    public shutdown(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
        for (const player of this.room.getPlayers()) {
            this.releasePlayer(player.id);
        }
        this.inputLimiters.clear();
    }

    private registerHostHandlers(socket: Socket): void {
        socket.on('get_players', () => {
            socket.emit('players_list', this.room.getPlayersList());
        });

        socket.on('kick_player', (data: unknown) => {
            const playerId = parsePlayerId(data, this.room.getMaximumPlayers());
            if (playerId === undefined) {
                this.emitError(socket, 'INVALID_PLAYER', 'The requested player slot is invalid.');
                return;
            }

            const kicked = this.room.kickPlayer(playerId);
            if (kicked) {
                this.releasePlayer(kicked.id);
                this.inputLimiters.delete(kicked.clientId);
                if (kicked.connected && kicked.socketId) {
                    this.io.to(kicked.socketId).emit('kicked', { reason: 'Host kicked you' });
                    this.io.sockets.sockets.get(kicked.socketId)?.disconnect(true);
                }
            }
            this.broadcastState();
            this.broadcastPlayerList();
        });

        socket.on('reset_room', () => {
            console.log('[WS] Authorized room reset requested');
            const allPlayers = this.room.reset();
            this.inputLimiters.clear();
            for (const player of allPlayers) {
                this.releasePlayer(player.id);
                if (player.connected && player.socketId) {
                    this.io.to(player.socketId).emit('kicked', { reason: 'Room was reset by host' });
                    this.io.sockets.sockets.get(player.socketId)?.disconnect(true);
                }
            }
            this.broadcastState();
            this.broadcastPlayerList();
            socket.emit('room_reset_complete');
        });
    }

    private registerPlayerHandlers(socket: Socket): void {
        let inputRevoked = false;

        const permitsInput = (): boolean => {
            if (inputRevoked) return false;
            const player = this.room.getPlayerBySocket(socket.id);
            if (!player) return false;
            if (this.inputLimiterFor(player.clientId).allow()) return true;

            inputRevoked = true;
            const removed = this.room.removePlayer(player.id);
            if (removed) this.releasePlayer(removed.id);
            this.emitError(
                socket,
                'RATE_LIMITED',
                'The controller input ceiling was exceeded and the controller was released.'
            );
            this.broadcastState();
            this.broadcastPlayerList();
            setImmediate(() => socket.disconnect(true));
            return false;
        };

        const rejectHostOperation = () => {
            this.emitError(socket, 'HOST_AUTH_REQUIRED', 'This operation requires the host capability.');
        };
        socket.on('get_players', rejectHostOperation);
        socket.on('kick_player', rejectHostOperation);
        socket.on('reset_room', rejectHostOperation);

        socket.on('join', (data: unknown) => {
            if (this.room.getPlayerBySocket(socket.id)) {
                this.emitError(socket, 'ALREADY_JOINED', 'This connection already owns a player slot.');
                return;
            }

            const request = parseJoinRequest(data);
            if (!request) {
                this.emitError(socket, 'INVALID_JOIN', 'The join request is invalid.');
                return;
            }
            if (!this.room.validateRoom(request.roomId)) {
                this.emitError(socket, 'ROOM_CLOSED', 'Room does not exist or has expired.');
                return;
            }

            const joinBlockReason = this.room.getJoinBlockReason(request.clientId);
            if (joinBlockReason) {
                const errorByReason = {
                    kicked: ['JOIN_DENIED', 'The player could not join this room.'],
                    identity_busy: [
                        'IDENTITY_BUSY',
                        'The previous controller connection is still closing. Retry shortly.'
                    ],
                    full: ['ROOM_FULL', 'The player could not join this room.']
                } as const;
                const [code, message] = errorByReason[joinBlockReason];
                this.emitError(socket, code, message);
                return;
            }

            const player = this.room.join(request.clientId, socket.id, request.deviceName);
            if (!player) {
                const code = this.room.isFull() ? 'ROOM_FULL' : 'JOIN_DENIED';
                this.emitError(socket, code, 'The player could not join this room.');
                return;
            }

            this.activatePlayer(player.id);
            const profile = this.plugin.getProfile ? this.plugin.getProfile(player.id) : null;
            socket.emit('joined', {
                playerId: player.id,
                roomId: this.room.roomId,
                profile
            });
            this.broadcastState();
            this.broadcastPlayerList();
        });

        socket.on('input', (data: unknown) => {
            if (!permitsInput()) return;
            const request = parseButtonRequest(data);
            if (!request) {
                this.emitError(socket, 'INVALID_INPUT', 'The controller input is invalid.');
                return;
            }
            const player = this.room.getPlayerBySocket(socket.id);
            if (!player) return;
            this.room.handlePing(socket.id);
            this.plugin.sendButtonPress(player.id, request.btn, request.state === 1);
        });

        socket.on('analog', (data: unknown) => {
            if (!permitsInput()) return;
            const request = parseAnalogRequest(data);
            if (!request) {
                this.emitError(socket, 'INVALID_INPUT', 'The controller input is invalid.');
                return;
            }
            const player = this.room.getPlayerBySocket(socket.id);
            if (!player) return;
            this.room.handlePing(socket.id);
            this.plugin.sendAnalogInput(player.id, request.stick, request.x, request.y);
        });

        socket.on('ping', () => {
            this.room.handlePing(socket.id);
            socket.emit('pong');
        });

        socket.on('disconnect', () => {
            const player = this.room.disconnect(socket.id);
            if (player) this.releasePlayer(player.id);
            this.broadcastState();
            this.broadcastPlayerList();
        });
    }

    private activatePlayer(playerId: number): void {
        if (this.activePlayers.has(playerId)) return;
        this.plugin.initPlayer(playerId);
        this.activePlayers.add(playerId);
    }

    private inputLimiterFor(clientId: string): FixedWindowRateLimiter {
        const existing = this.inputLimiters.get(clientId);
        if (existing) {
            existing.lastSeenAt = this.now();
            return existing.limiter;
        }

        const limiter = new FixedWindowRateLimiter(
            this.maximumInputEventsPerSecond,
            1_000,
            this.now
        );
        this.inputLimiters.set(clientId, { limiter, lastSeenAt: this.now() });
        return limiter;
    }

    private pruneInputLimiters(): void {
        const expiresBefore = this.now() - Math.max(2_000, this.staleTimeoutMs);
        for (const [clientId, state] of this.inputLimiters.entries()) {
            if (state.lastSeenAt < expiresBefore) this.inputLimiters.delete(clientId);
        }
    }

    private releasePlayer(playerId: number): void {
        if (!this.activePlayers.delete(playerId)) return;
        this.plugin.releasePlayer(playerId);
    }

    private rejectConnection(socket: Socket): void {
        this.emitError(socket, 'AUTH_REQUIRED', 'A valid FreeJoy capability is required.');
        setImmediate(() => socket.disconnect(true));
    }

    private emitError(socket: Socket, code: string, message: string): void {
        const payload: OperationError = { code, message };
        socket.emit('operation_error', payload);
    }

    private broadcastState(): void {
        this.io.to(HOST_SOCKET_ROOM).emit('room_state', this.room.getPublicState());
    }

    private broadcastPlayerList(): void {
        this.io.to(HOST_SOCKET_ROOM).emit('players_list', this.room.getPlayersList());
    }
}
