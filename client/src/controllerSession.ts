const STORAGE_KEY = 'freejoy:reconnect-capability';
const RECONNECT_CAPABILITY_PATTERN = /^[A-Za-z0-9_-]{43}$/u;
const MINIMUM_RETRY_DELAY_MS = 100;
const MAXIMUM_RETRY_DELAY_MS = 600_000;

export type SessionStoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type StoredReconnectCapability = {
    roomId: string;
    token: string;
};

type TimerPort = {
    setTimeout(callback: () => void, delayMs: number): ReturnType<typeof setTimeout>;
    clearTimeout(handle: ReturnType<typeof setTimeout>): void;
};

const defaultTimerPort: TimerPort = {
    setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
    clearTimeout: handle => globalThis.clearTimeout(handle)
};

export class JoinRetryScheduler {
    private timer?: ReturnType<typeof setTimeout>;

    constructor(
        private readonly retry: () => void,
        private readonly timers: TimerPort = defaultTimerPort
    ) { }

    public schedule(retryAfterMs: unknown): void {
        this.cancel();
        this.timer = this.timers.setTimeout(() => {
            this.timer = undefined;
            this.retry();
        }, normalizeRetryAfterMs(retryAfterMs));
    }

    public cancel(): void {
        if (this.timer === undefined) return;
        this.timers.clearTimeout(this.timer);
        this.timer = undefined;
    }
}

export function loadReconnectCapability(
    roomId: string,
    storage: SessionStoragePort = window.localStorage
): string | undefined {
    const serialized = storage.getItem(STORAGE_KEY);
    if (!serialized) return undefined;
    try {
        const value = JSON.parse(serialized) as Partial<StoredReconnectCapability>;
        if (
            value.roomId === roomId &&
            typeof value.token === 'string' &&
            RECONNECT_CAPABILITY_PATTERN.test(value.token)
        ) {
            return value.token;
        }
    } catch {
        // Invalid or legacy state is deliberately discarded below.
    }
    storage.removeItem(STORAGE_KEY);
    return undefined;
}

export function saveReconnectCapability(
    roomId: string,
    token: string,
    storage: SessionStoragePort = window.localStorage
): boolean {
    if (!RECONNECT_CAPABILITY_PATTERN.test(token)) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify({ roomId, token }));
    return true;
}

export function clearReconnectCapability(
    storage: SessionStoragePort = window.localStorage
): void {
    storage.removeItem(STORAGE_KEY);
}

export function heartbeatIntervalFor(leaseMs: unknown): number {
    if (typeof leaseMs !== 'number' || !Number.isFinite(leaseMs) || leaseMs < 3_000) {
        return 10_000;
    }
    return Math.max(1_000, Math.floor(leaseMs / 3));
}

function normalizeRetryAfterMs(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 1_000;
    return Math.min(
        MAXIMUM_RETRY_DELAY_MS,
        Math.max(MINIMUM_RETRY_DELAY_MS, Math.ceil(value))
    );
}
