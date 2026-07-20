import assert from 'node:assert/strict';
import { createServer, Server as HttpServer } from 'node:http';
import test from 'node:test';
import { AddressInfo } from 'node:net';
import { Server as SocketServer } from 'socket.io';
import { io as createSocket, Socket } from 'socket.io-client';
import { CapabilityAuthority } from '../src/authority';
import { IPlugin } from '../src/plugins/IPlugin';
import { RoomManager } from '../src/roomManager';
import { WSHandler } from '../src/wsHandler';

const HOST_TOKEN = 'host-capability-123456';
const JOIN_TOKEN = 'join-capability-123456';

class FakePlugin implements IPlugin {
    public readonly name = 'Fake';
    public readonly version = '1';
    public readonly maxPlayers = 4;
    public readonly initialized: number[] = [];
    public readonly released: number[] = [];
    public readonly buttons: Array<{ player: number; button: string; pressed: boolean }> = [];
    public readonly analog: Array<{ player: number; stick: string; x: number; y: number }> = [];

    async init(): Promise<void> { }
    async cleanup(): Promise<void> { }
    initPlayer(playerIndex: number): void { this.initialized.push(playerIndex); }
    releasePlayer(playerIndex: number): void { this.released.push(playerIndex); }
    sendButtonPress(player: number, button: string, pressed: boolean): void {
        this.buttons.push({ player, button, pressed });
    }
    sendAnalogInput(player: number, stick: 'left' | 'right', x: number, y: number): void {
        this.analog.push({ player, stick, x, y });
    }
}

type Harness = {
    room: RoomManager;
    plugin: FakePlugin;
    handler: WSHandler;
    io: SocketServer;
    http: HttpServer;
    url: string;
    sockets: Socket[];
};

async function createHarness(maximumInputEventsPerSecond = 120): Promise<Harness> {
    const http = createServer();
    const io = new SocketServer(http);
    const room = new RoomManager(4, { roomId: 'ABCDEF12', serverIp: '127.0.0.1' });
    const plugin = new FakePlugin();
    const authority = new CapabilityAuthority({ hostToken: HOST_TOKEN, joinToken: JOIN_TOKEN });
    const handler = new WSHandler(io, room, plugin, authority, {
        cleanupIntervalMs: 60_000,
        maximumInputEventsPerSecond
    });
    handler.init();
    await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
    const port = (http.address() as AddressInfo).port;
    return { room, plugin, handler, io, http, url: `http://127.0.0.1:${port}`, sockets: [] };
}

async function connect(harness: Harness, role: 'host' | 'player', token: string): Promise<Socket> {
    const socket = createSocket(harness.url, {
        auth: { role, token },
        forceNew: true,
        reconnection: false,
        transports: ['websocket']
    });
    harness.sockets.push(socket);
    await waitForEvent(socket, 'connect');
    return socket;
}

async function closeHarness(harness: Harness): Promise<void> {
    for (const socket of harness.sockets) socket.disconnect();
    harness.handler.shutdown();
    await new Promise<void>(resolve => harness.io.close(() => resolve()));
    if (harness.http.listening) {
        await new Promise<void>(resolve => harness.http.close(() => resolve()));
    }
}

function waitForEvent<T = unknown>(socket: Socket, event: string, timeoutMs = 2_000): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeoutMs);
        socket.once(event, (payload: T) => {
            clearTimeout(timer);
            resolve(payload);
        });
    });
}

function waitUntil(predicate: () => boolean, timeoutMs = 2_000): Promise<void> {
    const started = Date.now();
    return new Promise((resolve, reject) => {
        const check = () => {
            if (predicate()) return resolve();
            if (Date.now() - started >= timeoutMs) return reject(new Error('Condition timed out'));
            setTimeout(check, 10);
        };
        check();
    });
}

test('wrong room identifiers fail without disclosing the active room', async () => {
    const harness = await createHarness();
    try {
        const player = await connect(harness, 'player', JOIN_TOKEN);
        const rejected = waitForEvent<{ code: string; message: string }>(player, 'operation_error');
        player.emit('join', { roomId: 'DEADBEEF', clientId: 'pro-123', deviceName: 'Phone' });
        const error = await rejected;

        assert.equal(error.code, 'ROOM_CLOSED');
        assert.equal(JSON.stringify(error).includes(harness.room.roomId), false);
        assert.deepEqual(harness.room.getPlayersList(), []);
    } finally {
        await closeHarness(harness);
    }
});

test('only the host can remove a player and controller release is exactly once', async () => {
    const harness = await createHarness();
    try {
        const host = await connect(harness, 'host', HOST_TOKEN);
        const player = await connect(harness, 'player', JOIN_TOKEN);
        const joined = waitForEvent<{ playerId: number }>(player, 'joined');
        player.emit('join', { roomId: 'ABCDEF12', clientId: 'pro-123', deviceName: 'Phone' });
        assert.equal((await joined).playerId, 1);
        assert.deepEqual(harness.plugin.initialized, [1]);

        const forbidden = waitForEvent<{ code: string }>(player, 'operation_error');
        player.emit('kick_player', { playerId: 1 });
        assert.equal((await forbidden).code, 'HOST_AUTH_REQUIRED');
        assert.equal(harness.room.getPlayersList().length, 1);

        const kicked = waitForEvent(player, 'kicked');
        host.emit('kick_player', { playerId: 1 });
        await kicked;
        await waitUntil(() => harness.plugin.released.length === 1);
        harness.handler.shutdown();
        assert.deepEqual(harness.plugin.released, [1]);
    } finally {
        await closeHarness(harness);
    }
});

test('disconnect, stale cleanup, reconnect, and shutdown preserve one release per activation', async () => {
    const harness = await createHarness();
    try {
        const first = await connect(harness, 'player', JOIN_TOKEN);
        const firstJoined = waitForEvent(first, 'joined');
        first.emit('join', { roomId: 'ABCDEF12', clientId: 'pro-123' });
        await firstJoined;
        first.disconnect();
        await waitUntil(() => harness.plugin.released.length === 1);

        harness.handler.cleanupStalePlayers();
        assert.deepEqual(harness.plugin.released, [1]);

        const second = await connect(harness, 'player', JOIN_TOKEN);
        const secondJoined = waitForEvent(second, 'joined');
        second.emit('join', { roomId: 'ABCDEF12', clientId: 'pro-123' });
        await secondJoined;
        harness.handler.shutdown();

        assert.deepEqual(harness.plugin.initialized, [1, 1]);
        assert.deepEqual(harness.plugin.released, [1, 1]);
    } finally {
        await closeHarness(harness);
    }
});

test('public state is redacted and valid analog input is clamped before the plugin', async () => {
    const harness = await createHarness();
    try {
        const host = await connect(harness, 'host', HOST_TOKEN);
        const player = await connect(harness, 'player', JOIN_TOKEN);
        const joined = waitForEvent(player, 'joined');
        player.emit('join', { roomId: 'ABCDEF12', clientId: 'private-client', deviceName: 'Phone' });
        await joined;

        const playersList = waitForEvent(host, 'players_list');
        host.emit('get_players');
        const serialized = JSON.stringify(await playersList);
        assert.equal(serialized.includes('private-client'), false);
        assert.equal(serialized.includes(player.id ?? ''), false);

        player.emit('analog', { stick: 'left', x: 12, y: -12 });
        await waitUntil(() => harness.plugin.analog.length === 1);
        assert.deepEqual(harness.plugin.analog[0], {
            player: 1,
            stick: 'left',
            x: 1,
            y: -1
        });
    } finally {
        await closeHarness(harness);
    }
});

test('the per-socket input ceiling drops events beyond the configured window', async () => {
    const harness = await createHarness(2);
    try {
        const player = await connect(harness, 'player', JOIN_TOKEN);
        const joined = waitForEvent(player, 'joined');
        player.emit('join', { roomId: 'ABCDEF12', clientId: 'pro-123' });
        await joined;

        player.emit('input', { btn: 'A', state: 1 });
        player.emit('input', { btn: 'A', state: 0 });
        player.emit('input', { btn: 'B', state: 1 });
        await waitUntil(() => harness.plugin.buttons.length === 2);
        await new Promise(resolve => setTimeout(resolve, 50));
        assert.equal(harness.plugin.buttons.length, 2);
    } finally {
        await closeHarness(harness);
    }
});
