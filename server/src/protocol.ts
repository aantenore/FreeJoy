export const SUPPORTED_BUTTONS = [
    'A',
    'B',
    'X',
    'Y',
    'L',
    'R',
    'ZL',
    'ZR',
    'Plus',
    'Minus',
    'L3',
    'R3',
    'DPadUp',
    'DPadDown',
    'DPadLeft',
    'DPadRight',
    'SL',
    'SR'
] as const;

export type SupportedButton = typeof SUPPORTED_BUTTONS[number];

export type JoinRequest = {
    roomId: string;
    clientId: string;
    deviceName?: string;
};

export type ButtonRequest = {
    btn: SupportedButton;
    state: 0 | 1;
};

export type AnalogRequest = {
    stick: 'left' | 'right';
    x: number;
    y: number;
};

export type OperationError = {
    code: string;
    message: string;
};

const BUTTON_SET = new Set<string>(SUPPORTED_BUTTONS);
const CLIENT_ID_PATTERN = /^pro-[a-f0-9]{32}$/u;
const ROOM_ID_PATTERN = /^[A-F0-9]{8}$/u;
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/gu;

export function parseJoinRequest(value: unknown): JoinRequest | undefined {
    if (!isRecord(value)) return undefined;
    const roomId = typeof value.roomId === 'string' ? value.roomId.trim().toUpperCase() : '';
    const clientId = typeof value.clientId === 'string' ? value.clientId.trim() : '';
    if (!ROOM_ID_PATTERN.test(roomId) || !CLIENT_ID_PATTERN.test(clientId)) return undefined;

    const deviceName = sanitizeDeviceName(value.deviceName);
    if (value.deviceName !== undefined && deviceName === undefined) return undefined;
    return deviceName ? { roomId, clientId, deviceName } : { roomId, clientId };
}

export function parseButtonRequest(value: unknown): ButtonRequest | undefined {
    if (!isRecord(value)) return undefined;
    if (typeof value.btn !== 'string' || !BUTTON_SET.has(value.btn)) return undefined;
    if (value.state !== 0 && value.state !== 1) return undefined;
    return { btn: value.btn as SupportedButton, state: value.state };
}

export function parseAnalogRequest(value: unknown): AnalogRequest | undefined {
    if (!isRecord(value)) return undefined;
    if (value.stick !== 'left' && value.stick !== 'right') return undefined;
    if (!isFiniteNumber(value.x) || !isFiniteNumber(value.y)) return undefined;
    return {
        stick: value.stick,
        x: clampAxis(value.x),
        y: clampAxis(value.y)
    };
}

export function parsePlayerId(value: unknown, maximum: number): number | undefined {
    if (!isRecord(value) || !Number.isInteger(value.playerId)) return undefined;
    const playerId = value.playerId as number;
    return playerId >= 1 && playerId <= maximum ? playerId : undefined;
}

export class FixedWindowRateLimiter {
    private windowStartedAt?: number;
    private count = 0;

    constructor(
        private readonly maximumEvents: number,
        private readonly windowMs: number = 1_000,
        private readonly now: () => number = Date.now
    ) {
        if (!Number.isInteger(maximumEvents) || maximumEvents < 1) {
            throw new Error('maximumEvents must be a positive integer');
        }
    }

    public allow(): boolean {
        const current = this.now();
        if (this.windowStartedAt === undefined || current - this.windowStartedAt >= this.windowMs) {
            this.windowStartedAt = current;
            this.count = 0;
        }
        this.count += 1;
        return this.count <= this.maximumEvents;
    }
}

function sanitizeDeviceName(value: unknown): string | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== 'string') return undefined;
    const sanitized = value.replace(CONTROL_CHARACTERS, '').trim();
    if (sanitized.length < 1 || sanitized.length > 80) return undefined;
    return sanitized;
}

function clampAxis(value: number): number {
    return Math.max(-1, Math.min(1, value));
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
