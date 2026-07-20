import { access, cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const serverRoot = resolve(import.meta.dirname, '..');

async function replaceDirectory(source, destination, missingMessage) {
    try {
        await access(source);
    } catch {
        throw new Error(missingMessage);
    }
    await rm(destination, { recursive: true, force: true });
    await mkdir(destination, { recursive: true });
    await cp(source, destination, { recursive: true });
}

await replaceDirectory(
    resolve(serverRoot, 'src', 'python'),
    resolve(serverRoot, 'dist', 'python'),
    'The Python runtime source is missing.'
);
await replaceDirectory(
    resolve(serverRoot, '..', 'client', 'dist_build'),
    resolve(serverRoot, 'dist', 'public'),
    'The FreeJoy client is not built. Run `npm run build` in the client directory first.'
);
