// node --test con un glob reparte los archivos entre varios procesos a la vez
// (--test-concurrency solo limita la concurrencia DENTRO de un archivo), y eso
// satura el pool de conexiones de Postgres cuando hay ~20 suites de integración.
// Aquí se fuerza una a una, en serie de verdad.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const testDir = new URL('../src/test/', import.meta.url);

const files = readdirSync(testDir)
    .filter((f) => f.endsWith('.int.ts'))
    .sort();

let failed = false;

for (const file of files) {
    console.log(`\n--- ${file} ---`);

    const result = spawnSync(
        process.execPath,
        ['--import', 'tsx', '--test', '--test-concurrency=1', `src/test/${file}`],
        { stdio: 'inherit', env: process.env },
    );

    if (result.status !== 0) failed = true;
}

process.exit(failed ? 1 : 0);
