import assert from 'node:assert/strict';
import test from 'node:test';
import { RoomManager } from '../src/roomManager';

test('public room state never exposes client or socket identifiers', () => {
    const room = new RoomManager(4, { roomId: 'ABCDEF12', serverIp: '127.0.0.1' });
    room.join('pro-123', 'socket-secret', 'Phone');

    const serialized = JSON.stringify(room.getPublicState());
    assert.equal(serialized.includes('pro-123'), false);
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
    const joined = room.join('pro-123', 'socket-1');
    assert.ok(joined);
    assert.equal(room.disconnect('socket-1')?.id, 1);

    now += 30_001;
    assert.deepEqual(room.cleanupStale(30_000).map(player => player.id), [1]);
    assert.deepEqual(room.cleanupStale(30_000), []);
});

