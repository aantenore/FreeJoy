import assert from 'node:assert/strict';
import test from 'node:test';
import { RoomManager } from '../src/roomManager';

const CLIENT_ID = `pro-${'a'.repeat(32)}`;

test('public room state never exposes client or socket identifiers', () => {
    const room = new RoomManager(4, { roomId: 'ABCDEF12', serverIp: '127.0.0.1' });
    room.join(CLIENT_ID, 'socket-secret', 'Phone');

    const serialized = JSON.stringify(room.getPublicState());
    assert.equal(serialized.includes(CLIENT_ID), false);
    assert.equal(serialized.includes('socket-secret'), false);
    assert.deepEqual(room.getPlayersList(), [
        { playerId: 1, connected: true, deviceName: 'Phone' }
    ]);
});

test('disconnect and stale cleanup return the exact player lifecycle', () => {
    let now = 1_000;
    const room = new RoomManager(4, {
        roomId: 'ABCDEF12',
        serverIp: '127.0.0.1',
        now: () => now
    });
    const joined = room.join(CLIENT_ID, 'socket-1');
    assert.ok(joined);
    assert.equal(room.disconnect('socket-1')?.id, 1);

    now += 30_001;
    assert.deepEqual(room.cleanupStale(30_000).map(player => player.id), [1]);
    assert.deepEqual(room.cleanupStale(30_000), []);
});

test('a live player cannot be taken over and a kicked identity cannot rejoin', () => {
    const room = new RoomManager(4, { roomId: 'ABCDEF12', serverIp: '127.0.0.1' });
    assert.ok(room.join(CLIENT_ID, 'socket-1'));
    assert.equal(room.join(CLIENT_ID, 'socket-2'), null);

    room.disconnect('socket-1');
    assert.equal(room.join(CLIENT_ID, 'socket-2')?.id, 1);
    assert.equal(room.kickPlayer(1)?.id, 1);
    assert.equal(room.join(CLIENT_ID, 'socket-3'), null);
});

test('removing a player releases the slot without adding a host ban', () => {
    const room = new RoomManager(4, { roomId: 'ABCDEF12', serverIp: '127.0.0.1' });
    assert.ok(room.join(CLIENT_ID, 'socket-1'));
    assert.equal(room.removePlayer(1)?.id, 1);
    assert.equal(room.join(CLIENT_ID, 'socket-2')?.id, 1);
});

test('a connected controller with an expired lease is stale', () => {
    let now = 1_000;
    const room = new RoomManager(4, {
        roomId: 'ABCDEF12',
        serverIp: '127.0.0.1',
        now: () => now
    });
    assert.ok(room.join(CLIENT_ID, 'socket-1'));
    now += 30_001;
    assert.deepEqual(room.cleanupStale(30_000).map(player => player.id), [1]);
});
