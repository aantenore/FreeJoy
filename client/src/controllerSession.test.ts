import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    JoinRetryScheduler,
    clearReconnectCapability,
    heartbeatIntervalFor,
    loadReconnectCapability,
    saveReconnectCapability
} from './controllerSession';

class MemoryStorage {
    private readonly values = new Map<string, string>();

    public getItem(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    public setItem(key: string, value: string): void {
        this.values.set(key, value);
    }

    public removeItem(key: string): void {
        this.values.delete(key);
    }
}

afterEach(() => vi.useRealTimers());

describe('controller session capabilities', () => {
    it('stores only a valid server-issued capability for the current room', () => {
        const storage = new MemoryStorage();
        const token = 'a'.repeat(43);
        expect(saveReconnectCapability('ABCDEF12', token, storage)).toBe(true);
        expect(loadReconnectCapability('ABCDEF12', storage)).toBe(token);
        expect(loadReconnectCapability('DEADBEEF', storage)).toBeUndefined();
        expect(saveReconnectCapability('ABCDEF12', 'predictable-id', storage)).toBe(false);
        clearReconnectCapability(storage);
        expect(loadReconnectCapability('ABCDEF12', storage)).toBeUndefined();
    });

    it('waits through stale cleanup and then automatically retries the busy lease', async () => {
        vi.useFakeTimers();
        let oldSocketRegistered = true;
        let joined = false;
        globalThis.setTimeout(() => {
            oldSocketRegistered = false;
        }, 30_001);
        const retry = vi.fn(() => {
            joined = !oldSocketRegistered;
        });
        const scheduler = new JoinRetryScheduler(retry);

        scheduler.schedule(32_000);
        await vi.advanceTimersByTimeAsync(30_000);
        expect(oldSocketRegistered).toBe(true);
        expect(retry).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1_999);
        expect(oldSocketRegistered).toBe(false);
        expect(joined).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        expect(retry).toHaveBeenCalledTimes(1);
        expect(joined).toBe(true);
    });

    it('derives the heartbeat from the server lease', () => {
        expect(heartbeatIntervalFor(30_000)).toBe(10_000);
        expect(heartbeatIntervalFor(6_000)).toBe(2_000);
    });

    it('honors the maximum supported server lease plus cleanup delay', async () => {
        vi.useFakeTimers();
        const retry = vi.fn();
        const scheduler = new JoinRetryScheduler(retry);

        scheduler.schedule(600_000);
        await vi.advanceTimersByTimeAsync(599_999);
        expect(retry).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
        expect(retry).toHaveBeenCalledTimes(1);
    });
});
