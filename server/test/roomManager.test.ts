import assert from 'node:assert/strict';
import test from 'node:test';
import { ReconnectCapabilityAuthority } from '../src/reconnectAuthority';
import { RoomManager } from '../src/roomManager';

const FIRST_TOKEN = 'a'.repeat(43);
const SECOND_TOKEN = 'b'.repeat(43);

function createRoom(now: () => number = Date.now): RoomManager {
    const tokens = [FIRST_TOKEN, SECOND_TOKEN];
    return new RoomManager(4, {
        roomId: 'ABCDEF12',
        serverIp: '127.0.0.1',
        now,
        reconnectAuthority: new ReconnectCapabilityAuthority(() => {
            const token = tokens.shift();
            if (!token) throw new Error('Test reconnect capabilities exhausted');
            return token;
        })
    });
}

test('public room state never exposes reconnect capabilities or socket identifiers', () => {
    const room = createRoom();
    const session = room.createSession('socket-secret', 'Phone');
    assert.ok(session);

    const serialized = JSON.stringify(room.getPublicState());
    assert.equal(serialized.includes(session.reconnectToken), false);
    assert.equal(serialized.includes(session.player.reconnectKey), false);
    assert.equal(serialized.includes('socket-secret'), false);
    assert.deepEqual(room.getPlayersList(), [
        { playerId: 1, connected: true, deviceName: 'Phone' }
    ]);
});

test('disconnect starts the full grace period even after a long-running session', () => {
    let now = 1_000;
    const room = createRoom(() => now);
    const session = room.createSession('socket-1');
    assert.ok(session);

    now += 120_000;
    assert.equal(room.disconnect('socket-1')?.id, 1);
    assert.equal(room.disconnect('socket-1'), undefined);
    room.handlePing('socket-1');
    assert.equal(room.getPlayersList()[0]?.connected, false);
    assert.deepEqual(room.cleanupStale(30_000), { expired: [], removed: [] });

    now += 30_001;
    assert.deepEqual(room.cleanupStale(30_000).removed.map(player => player.id), [1]);
});

test('only the server-issued capability can reconnect and a live owner cannot be taken over', () => {
    const room = createRoom();
    const session = room.createSession('socket-1');
    assert.ok(session);

    assert.deepEqual(room.reconnect(SECOND_TOKEN, 'socket-2'), { status: 'expired' });
    const busy = room.reconnect(session.reconnectToken, 'socket-2');
    assert.equal(busy.status, 'busy');
    assert.equal(room.getPlayerBySocket('socket-1')?.id, 1);

    room.disconnect('socket-1');
    const reconnected = room.reconnect(session.reconnectToken, 'socket-2');
    assert.equal(reconnected.status, 'joined');
    assert.equal(room.getPlayerBySocket('socket-2')?.id, 1);
});

test('kick revokes the reconnect capability', () => {
    const room = createRoom();
    const session = room.createSession('socket-1');
    assert.ok(session);

    assert.equal(room.kickPlayer(1)?.id, 1);
    assert.equal(room.permitsReconnect(session.reconnectToken), false);
    assert.deepEqual(room.reconnect(session.reconnectToken, 'socket-2'), { status: 'expired' });
});

test('a live stale lease is neutralized before its reconnect record is purged', () => {
    let now = 1_000;
    const room = createRoom(() => now);
    const session = room.createSession('socket-1');
    assert.ok(session);

    now += 30_001;
    const expired = room.cleanupStale(30_000);
    assert.deepEqual(expired.expired.map(player => player.id), [1]);
    assert.deepEqual(expired.removed, []);
    assert.equal(room.getPlayersList()[0]?.connected, false);

    const reconnected = room.reconnect(session.reconnectToken, 'socket-2');
    assert.equal(reconnected.status, 'joined');
    room.disconnect('socket-2');
    now += 30_001;
    assert.deepEqual(room.cleanupStale(30_000).removed.map(player => player.id), [1]);
});
