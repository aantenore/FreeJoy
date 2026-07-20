import assert from 'node:assert/strict';
import test from 'node:test';
import { CapabilityAuthority, loadCapabilityConfig } from '../src/authority';
import { ReconnectCapabilityAuthority } from '../src/reconnectAuthority';

test('configured host and join capabilities remain separate', () => {
    const config = loadCapabilityConfig({
        FREEJOY_HOST_TOKEN: 'host-capability-123456',
        FREEJOY_JOIN_TOKEN: 'join-capability-123456'
    });
    const authority = new CapabilityAuthority(config);

    assert.equal(authority.permitsHost(config.hostToken), true);
    assert.equal(authority.permitsHost(config.joinToken), false);
    assert.equal(authority.permitsJoin(config.joinToken), true);
    assert.equal(authority.permitsJoin(config.hostToken), false);
    assert.equal(authority.permitsJoin(undefined), false);
});

test('rotating the join capability revokes the previous QR without changing host authority', () => {
    const oldJoinToken = 'join-capability-123456';
    const rotatedJoinToken = 'rotated-controller-capability-123456';
    const authority = new CapabilityAuthority(
        {
            hostToken: 'host-capability-123456',
            joinToken: oldJoinToken
        },
        () => rotatedJoinToken
    );

    authority.rotateJoinToken();
    assert.equal(authority.permitsJoin(oldJoinToken), false);
    assert.equal(authority.permitsJoin(rotatedJoinToken), true);
    assert.equal(authority.permitsHost('host-capability-123456'), true);
});

test('reconnect capabilities are server-issued and verified by digest', () => {
    const token = 'a'.repeat(43);
    const authority = new ReconnectCapabilityAuthority(() => token);
    const issued = authority.issue();

    assert.equal(issued.token, token);
    assert.notEqual(issued.key, token);
    assert.equal(authority.permits(token, issued.key), true);
    assert.equal(authority.permits('b'.repeat(43), issued.key), false);
    assert.equal(authority.permits('predictable-id', issued.key), false);
});

test('invalid configured capabilities fail closed', () => {
    assert.throws(
        () => loadCapabilityConfig({ FREEJOY_HOST_TOKEN: 'too-short' }),
        /FREEJOY_HOST_TOKEN must contain at least 16 characters/u
    );
    assert.throws(
        () => loadCapabilityConfig({
            FREEJOY_HOST_TOKEN: 'host token with spaces 123',
            FREEJOY_JOIN_TOKEN: 'join-capability-123456'
        }),
        /FREEJOY_HOST_TOKEN must use base64url characters only/u
    );
    assert.throws(
        () => loadCapabilityConfig({
            FREEJOY_HOST_TOKEN: 'shared-capability-123456',
            FREEJOY_JOIN_TOKEN: 'shared-capability-123456'
        }),
        /must be different/u
    );
});
