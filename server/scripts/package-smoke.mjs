import { execFileSync } from 'node:child_process';

const result = JSON.parse(
    execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8'
    })
);
const files = new Set(result[0]?.files?.map(file => file.path));
for (const required of [
    'dist/server.js',
    'dist/python/virtual_gamepad.py',
    'dist/public/index.html'
]) {
    if (!files.has(required)) {
        throw new Error(`Packed FreeJoy server is missing ${required}`);
    }
}

console.log(JSON.stringify({ packageSmoke: 'pass', files: files.size }));
