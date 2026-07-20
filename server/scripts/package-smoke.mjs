import { execFileSync } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const serverRoot = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(serverRoot, '..');
const npmEntryPoint = process.env.npm_execpath;
const npmExecutable = npmEntryPoint
    ? process.execPath
    : process.platform === 'win32'
        ? 'npm.cmd'
        : 'npm';
const npmPrefix = npmEntryPoint ? [npmEntryPoint] : [];
const workspace = await mkdtemp(join(tmpdir(), 'freejoy-package-smoke-'));
const packDirectory = join(workspace, 'packed');
const installDirectory = join(workspace, 'installed');

function runNpm(arguments_, cwd) {
    return execFileSync(npmExecutable, [...npmPrefix, ...arguments_], {
        cwd,
        encoding: 'utf8',
        shell: !npmEntryPoint && process.platform === 'win32'
    });
}

function parsePackManifest(output) {
    const outputLines = output.split(/\r?\n/u);
    const resultStart = outputLines.findIndex(line => line.trim() === '[');
    if (resultStart < 0) throw new Error('npm pack did not return a JSON manifest');
    return JSON.parse(outputLines.slice(resultStart).join('\n'));
}

try {
    await mkdir(packDirectory, { recursive: true });
    await mkdir(installDirectory, { recursive: true });
    await writeFile(
        join(installDirectory, 'package.json'),
        JSON.stringify({ name: 'freejoy-installed-smoke', private: true }),
        'utf8'
    );

    const manifest = parsePackManifest(runNpm([
        'pack',
        '--json',
        '--loglevel=silent',
        '--pack-destination',
        packDirectory
    ], packageRoot));
    const filename = manifest[0]?.filename;
    if (typeof filename !== 'string') throw new Error('npm pack did not report a tarball name');
    const tarball = join(packDirectory, filename);

    runNpm([
        'install',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        tarball
    ], installDirectory);

    const installedRoot = join(installDirectory, 'node_modules', 'freejoy-server');
    const requiredFiles = [
        'dist/server.js',
        'dist/python/virtual_gamepad.py',
        'dist/public/index.html'
    ];
    for (const required of requiredFiles) await access(join(installedRoot, required));

    const index = await readFile(join(installedRoot, 'dist', 'public', 'index.html'), 'utf8');
    if (!index.includes('<div id="root"></div>')) {
        throw new Error('The installed FreeJoy package contains an invalid client entry point');
    }

    const runtime = await import(pathToFileURL(join(installedRoot, 'dist', 'server.js')).href);
    if (typeof runtime.bootstrap !== 'function') {
        throw new Error('The installed FreeJoy package does not expose its server runtime');
    }

    console.log(JSON.stringify({
        packageSmoke: 'pass',
        installed: true,
        files: manifest[0]?.files?.length ?? 0
    }));
} finally {
    await rm(workspace, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 100
    });
}
