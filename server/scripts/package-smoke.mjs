import { execFileSync } from 'node:child_process';

const npmEntryPoint = process.env.npm_execpath;
const executable = npmEntryPoint ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npmArguments = npmEntryPoint
    ? [npmEntryPoint, 'pack', '--dry-run', '--json', '--loglevel=silent']
    : ['pack', '--dry-run', '--json', '--loglevel=silent'];
const output = execFileSync(executable, npmArguments, {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
    shell: !npmEntryPoint && process.platform === 'win32'
});
const outputLines = output.split(/\r?\n/u);
const resultStart = outputLines.findIndex(line => line.trim() === '[');
if (resultStart < 0) throw new Error('npm pack did not return a JSON manifest');
const result = JSON.parse(outputLines.slice(resultStart).join('\n'));
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
