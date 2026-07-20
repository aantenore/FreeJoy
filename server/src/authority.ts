import { randomBytes, timingSafeEqual } from 'crypto';

export type CapabilityConfig = {
    hostToken: string;
    joinToken: string;
};

export type CapabilityTokenFactory = () => string;

const MINIMUM_CONFIGURED_TOKEN_LENGTH = 16;
const CONFIGURED_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/u;

export function loadCapabilityConfig(
    environment: NodeJS.ProcessEnv = process.env
): CapabilityConfig {
    const capabilities = {
        hostToken: readOrCreateToken('FREEJOY_HOST_TOKEN', environment),
        joinToken: readOrCreateToken('FREEJOY_JOIN_TOKEN', environment)
    };
    if (secureTokenEqual(capabilities.hostToken, capabilities.joinToken)) {
        throw new Error('FREEJOY_HOST_TOKEN and FREEJOY_JOIN_TOKEN must be different');
    }
    return capabilities;
}

function readOrCreateToken(name: string, environment: NodeJS.ProcessEnv): string {
    const configured = environment[name]?.trim();
    if (!configured) return randomBytes(32).toString('base64url');
    if (configured.length < MINIMUM_CONFIGURED_TOKEN_LENGTH) {
        throw new Error(`${name} must contain at least ${MINIMUM_CONFIGURED_TOKEN_LENGTH} characters`);
    }
    if (!CONFIGURED_TOKEN_PATTERN.test(configured)) {
        throw new Error(`${name} must use base64url characters only`);
    }
    return configured;
}

export class CapabilityAuthority {
    private readonly hostToken: string;
    private joinToken: string;

    constructor(
        capabilities: CapabilityConfig,
        private readonly createToken: CapabilityTokenFactory = () => randomBytes(32).toString('base64url')
    ) {
        this.hostToken = capabilities.hostToken;
        this.joinToken = capabilities.joinToken;
    }

    public permitsHost(candidate: unknown): boolean {
        return secureTokenEqual(candidate, this.hostToken);
    }

    public permitsJoin(candidate: unknown): boolean {
        return secureTokenEqual(candidate, this.joinToken);
    }

    public getJoinToken(): string {
        return this.joinToken;
    }

    public rotateJoinToken(): void {
        for (let attempt = 0; attempt < 10; attempt += 1) {
            const candidate = this.createToken();
            if (
                candidate.length >= MINIMUM_CONFIGURED_TOKEN_LENGTH &&
                CONFIGURED_TOKEN_PATTERN.test(candidate) &&
                !secureTokenEqual(candidate, this.hostToken) &&
                !secureTokenEqual(candidate, this.joinToken)
            ) {
                this.joinToken = candidate;
                return;
            }
        }
        throw new Error('Unable to rotate the controller join capability safely');
    }
}

function secureTokenEqual(candidate: unknown, expected: string): boolean {
    if (typeof candidate !== 'string') return false;
    const actualBytes = Buffer.from(candidate);
    const expectedBytes = Buffer.from(expected);
    return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}
