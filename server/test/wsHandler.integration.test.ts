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
const CLIENT_ID = `pro-${'a'.repeat(32)}`;
const OTHER_CLIENT_ID = `pro-${'b'.repeat(32)}`;

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

async function createHarness(
    maximumInputEventsPerSecond = 120,
    now: () => number = Date.now,
    staleTimeoutMs = 30_000
): Promise<Harness> {
    const http = createServer();
    const io = new SocketServer(http);
    const room = new RoomManager(4, { roomId: 'ABCDEF12', serverIp: '127.0.0.1', now });
    const plugin = new FakePlugin();
    const authority = new CapabilityAuthority({ hostToken: HOST_TOKEN, joinToken: JOIN_TOKEN });
    const handler = new WSHandler(io, room, plugin, authority, {
        cleanupIntervalMs: 60_000,
        staleTimeoutMs,
        maximumInputEventsPerSecond,
        now
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
        player.emit('join', { roomId: 'DEADBEEF', clientId: CLIENT_ID, deviceName: 'Phone' });
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
        player.emit('join', { roomId: 'ABCDEF12', clientId: CLIENT_ID, deviceName: 'Phone' });
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

        const rejoin = await connect(harness, 'player', JOIN_TOKEN);
        const denied = waitForEvent<{ code: string }>(rejoin, 'operation_error');
        rejoin.emit('join', { roomId: 'ABCDEF12', clientId: CLIENT_ID });
        assert.equal((await denied).code, 'JOIN_DENIED');

        harness.handler.shutdown();
        assert.deepEqual(harness.plugin.released, [1]);
    } finally {
        await closeHarness(harness);
    }
});

test('a second socket cannot take over a live controller identity', async () => {
    const harness = await createHarness();
    try {
        const owner = await connect(harness, 'player', JOIN_TOKEN);
        const ownerJoined = waitForEvent(owner, 'joined');
        owner.emit('join', { roomId: 'ABCDEF12', clientId: CLIENT_ID });
        await ownerJoined;

        const contender = await connect(harness, 'player', JOIN_TOKEN);
        const denied = waitForEvent<{ code: string }>(contender, 'operation_error');
        contender.emit('join', { roomId: 'ABCDEF12', clientId: CLIENT_ID });
        assert.equal((await denied).code, 'IDENTITY_BUSY');

        owner.emit('input', { btn: 'A', state: 1 });
        await waitUntil(() => harness.plugin.buttons.length === 1);
        contender.emit('input', { btn: 'B', state: 1 });
        await new Promise(resolve => setTimeout(resolve, 50));
        assert.deepEqual(harness.plugin.buttons, [
            { player: 1, button: 'A', pressed: true }
        ]);

        owner.disconnect();
        await waitUntil(() => harness.plugin.released.length === 1);
        const contenderJoined = waitForEvent<{ playerId: number }>(contender, 'joined');
        contender.emit('join', { roomId: 'ABCDEF12', clientId: CLIENT_ID });
        assert.equal((await contenderJoined).playerId, 1);
        contender.emit('input', { btn: 'B', state: 1 });
        await waitUntil(() => harness.plugin.buttons.length === 2);
        assert.deepEqual(harness.plugin.buttons[1], {
            player: 1,
            button: 'B',
            pressed: true
        });
    } finally {
        await closeHarness(harness);
    }
});

test('disconnect, stale cleanup, reconnect, and shutdown preserve one release per activation', async () => {
    const harness = await createHarness();
    try {
        const first = await connect(harness, 'player', JOIN_TOKEN);
        const firstJoined = waitForEvent(first, 'joined');
        first.emit('join', { roomId: 'ABCDEF12', clientId: CLIENT_ID });
        await firstJoined;
        first.disconnect();
        await waitUntil(() => harness.plugin.released.length === 1);

        harness.handler.cleanupStalePlayers();
        assert.deepEqual(harness.plugin.released, [1]);

        const second = await connect(harness, 'player', JOIN_TOKEN);
        const secondJoined = waitForEvent(second, 'joined');
        second.emit('join', { roomId: 'ABCDEF12', clientId: CLIENT_ID });
        await secondJoined;
        harness.handler.shutdown();

        assert.deepEqual(harness.plugin.initialized, [1, 1]);
        assert.deepEqual(harness.plugin.released, [1, 1]);
    } finally {
        await closeHarness(harness);
    }
});

test('an expired connected controller lease is released and disconnected', async () => {
    let now = 1_000;
    const harness = await createHarness(120, () => now, 30_000);
    try {
        const player = await connect(harness, 'player', JOIN_TOKEN);
        const joined = waitForEvent(player, 'joined');
        player.emit('join', { roomId: 'ABCDEF12', clientId: CLIENT_ID });
        await joined;

        const expired = waitForEvent<{ code: string }>(player, 'operation_error');
        const disconnected = waitForEvent(player, 'disconnect');
        now += 30_001;
        harness.handler.cleanupStalePlayers();

        assert.equal((await expired).code, 'STALE_SESSION');
        await disconnected;
        assert.deepEqual(harness.plugin.released, [1]);
        assert.deepEqual(harness.room.getPlayersList(), []);
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
        player.emit('join', { roomId: 'ABCDEF12', clientId: OTHER_CLIENT_ID, deviceName: 'Phone' });
        await joined;

        const playersList = waitForEvent(host, 'players_list');
        host.emit('get_players');
        const serialized = JSON.stringify(await playersList);
        assert.equal(serialized.includes(OTHER_CLIENT_ID), false);
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

test('exceeding the input ceiling releases and disconnects the controller', async () => {
    const harness = await createHarness(1);
    try {
        const player = await connect(harness, 'player', JOIN_TOKEN);
        const joined = waitForEvent(player, 'joined');
        player.emit('join', { roomId: 'ABCDEF12', clientId: CLIENT_ID });
        await joined;

        const rejected = waitForEvent<{ code: string }>(player, 'operation_error');
        const disconnected = waitForEvent(player, 'disconnect');
        player.emit('input', { btn: 'A', state: 1 });
        player.emit('input', { btn: 'A', state: 0 });
        assert.equal((await rejected).code, 'RATE_LIMITED');
        await disconnected;
        await waitUntil(() => harness.plugin.released.length === 1);
        assert.deepEqual(harness.plugin.buttons, [
            { player: 1, button: 'A', pressed: true }
        ]);
        assert.deepEqual(harness.plugin.released, [1]);
        assert.deepEqual(harness.room.getPlayersList(), []);

        const rejoin = await connect(harness, 'player', JOIN_TOKEN);
        const rejoined = waitForEvent<{ playerId: number }>(rejoin, 'joined');
        rejoin.emit('join', { roomId: 'ABCDEF12', clientId: CLIENT_ID });
        assert.equal((await rejoined).playerId, 1);
    } finally {
        await closeHarness(harness);
    }
});

test('the per-controller input ceiling survives a voluntary reconnect', async () => {
    const harness = await createHarness(1);
    try {
        const first = await connect(harness, 'player', JOIN_TOKEN);
        const firstJoined = waitForEvent(first, 'joined');
        first.emit('join', { roomId: 'ABCDEF12', clientId: CLIENT_ID });
        await firstJoined;
        first.emit('input', { btn: 'A', state: 1 });
        await waitUntil(() => harness.plugin.buttons.length === 1);
        first.disconnect();
        await waitUntil(() => harness.plugin.released.length === 1);

        const second = await connect(harness, 'player', JOIN_TOKEN);
        const secondJoined = waitForEvent(second, 'joined');
        second.emit('join', { roomId: 'ABCDEF12', clientId: CLIENT_ID });
        await secondJoined;

        const rejected = waitForEvent<{ code: string }>(second, 'operation_error');
        const disconnected = waitForEvent(second, 'disconnect');
        second.emit('input', { btn: 'A', state: 0 });
        assert.equal((await rejected).code, 'RATE_LIMITED');
        await disconnected;
        await waitUntil(() => harness.plugin.released.length === 2);
        assert.deepEqual(harness.plugin.buttons, [
            { player: 1, button: 'A', pressed: true }
        ]);
        assert.deepEqual(harness.room.getPlayersList(), []);
    } finally {
        await closeHarness(harness);
    }
});
