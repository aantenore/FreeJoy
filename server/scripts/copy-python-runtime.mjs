import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const serverRoot = resolve(import.meta.dirname, '..');
const source = resolve(serverRoot, 'src', 'python');
const destination = resolve(serverRoot, 'dist', 'python');

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
