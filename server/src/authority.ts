import { randomBytes, timingSafeEqual } from 'crypto';

export type CapabilityConfig = {
    hostToken: string;
    joinToken: string;
};

const MINIMUM_CONFIGURED_TOKEN_LENGTH = 16;

export function loadCapabilityConfig(
    environment: NodeJS.ProcessEnv = process.env
): CapabilityConfig {
    return {
        hostToken: readOrCreateToken('FREEJOY_HOST_TOKEN', environment),
        joinToken: readOrCreateToken('FREEJOY_JOIN_TOKEN', environment)
    };
}

function readOrCreateToken(name: string, environment: NodeJS.ProcessEnv): string {
    const configured = environment[name]?.trim();
    if (!configured) return randomBytes(32).toString('base64url');
    if (configured.length < MINIMUM_CONFIGURED_TOKEN_LENGTH) {
        throw new Error(`${name} must contain at least ${MINIMUM_CONFIGURED_TOKEN_LENGTH} characters`);
    }
    return configured;
}

export class CapabilityAuthority {
    constructor(private readonly capabilities: CapabilityConfig) { }

    public permitsHost(candidate: unknown): boolean {
        return secureTokenEqual(candidate, this.capabilities.hostToken);
    }

    public permitsJoin(candidate: unknown): boolean {
        return secureTokenEqual(candidate, this.capabilities.joinToken);
    }
}

function secureTokenEqual(candidate: unknown, expected: string): boolean {
    if (typeof candidate !== 'string') return false;
    const actualBytes = Buffer.from(candidate);
    const expectedBytes = Buffer.from(expected);
    return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

