import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const npmEntryPoint = process.env.npm_execpath;
const executable = npmEntryPoint ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm';
const packDirectory = await mkdtemp(join(tmpdir(), 'freejoy-package-smoke-'));
const npmArguments = npmEntryPoint
    ? [npmEntryPoint, 'pack', '--json', '--loglevel=silent', '--pack-destination', packDirectory]
    : ['pack', '--json', '--loglevel=silent', '--pack-destination', packDirectory];
let result;
try {
    const output = execFileSync(executable, npmArguments, {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8',
        shell: !npmEntryPoint && process.platform === 'win32'
    });
    const outputLines = output.split(/\r?\n/u);
    const resultStart = outputLines.findIndex(line => line.trim() === '[');
    if (resultStart < 0) throw new Error('npm pack did not return a JSON manifest');
    result = JSON.parse(outputLines.slice(resultStart).join('\n'));
} finally {
    await rm(packDirectory, { recursive: true, force: true });
}
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
