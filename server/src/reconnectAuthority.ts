import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const RECONNECT_CAPABILITY_PATTERN = /^[A-Za-z0-9_-]{43}$/u;

export type IssuedReconnectCapability = {
    token: string;
    key: string;
};

export class ReconnectCapabilityAuthority {
    constructor(
        private readonly createToken: () => string = () => randomBytes(32).toString('base64url')
    ) { }

    public issue(): IssuedReconnectCapability {
        const token = this.createToken();
        const key = this.keyFor(token);
        if (!key) {
            throw new Error('Reconnect capability generators must return 32-byte base64url tokens');
        }
        return { token, key };
    }

    public permits(candidate: unknown, expectedKey: string): boolean {
        const actualKey = this.keyFor(candidate);
        if (!actualKey) return false;
        const actualBytes = Buffer.from(actualKey);
        const expectedBytes = Buffer.from(expectedKey);
        return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
    }

    private keyFor(candidate: unknown): string | undefined {
        if (typeof candidate !== 'string' || !RECONNECT_CAPABILITY_PATTERN.test(candidate)) {
            return undefined;
        }
        return createHash('sha256').update(candidate).digest('base64url');
    }
}
