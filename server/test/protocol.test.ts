import assert from 'node:assert/strict';
import test from 'node:test';
import {
    FixedWindowRateLimiter,
    parseAnalogRequest,
    parseButtonRequest,
    parseJoinRequest,
    parsePlayerId
} from '../src/protocol';

test('join validation normalizes bounded identifiers without accepting control characters', () => {
    assert.deepEqual(
        parseJoinRequest({ roomId: 'abcdef12', deviceName: '  Phone\n' }),
        { roomId: 'ABCDEF12', deviceName: 'Phone' }
    );
    assert.equal(parseJoinRequest({ roomId: 'not-a-room' }), undefined);
    assert.equal(parseJoinRequest({ roomId: 'ABCDEF12', clientId: 'legacy-id' }), undefined);
});
test('controller payloads are strict and analog axes are clamped', () => {
    assert.deepEqual(parseButtonRequest({ btn: 'A', state: 1 }), { btn: 'A', state: 1 });
    assert.equal(parseButtonRequest({ btn: 'Power', state: 1 }), undefined);
    assert.equal(parseButtonRequest({ btn: 'A', state: true }), undefined);
    assert.deepEqual(
        parseAnalogRequest({ stick: 'left', x: 2.5, y: -7 }),
        { stick: 'left', x: 1, y: -1 }
    );
    assert.equal(parseAnalogRequest({ stick: 'left', x: Number.NaN, y: 0 }), undefined);
    assert.equal(parsePlayerId({ playerId: 4 }, 4), 4);
    assert.equal(parsePlayerId({ playerId: 5 }, 4), undefined);
});

test('the input rate limiter resets only after its configured window', () => {
    let now = 1_000;
    const limiter = new FixedWindowRateLimiter(2, 1_000, () => now);
    assert.equal(limiter.allow(), true);
    assert.equal(limiter.allow(), true);
    assert.equal(limiter.allow(), false);
    now += 1_000;
    assert.equal(limiter.allow(), true);
});
