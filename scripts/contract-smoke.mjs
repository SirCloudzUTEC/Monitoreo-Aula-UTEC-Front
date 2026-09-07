import assert from 'node:assert/strict';

const base = process.env.UTEC_BASE_URL || 'http://127.0.0.1:3101';
const response = await fetch(`${base}/api/mediciones?aula=L-419`);
assert.equal(response.status, 200, 'SYS-09.2 measurement API must be available');
const body = await response.json();
const measurements = Array.isArray(body) ? body : body.mediciones;
assert.ok(Array.isArray(measurements) && measurements.length > 0, 'Measurements must not be empty');
for (const measurement of measurements) {
  assert.deepEqual(Object.keys(measurement).sort(), ['ts', 'aula', 'nodo', 'magnitud', 'valor', 'unidad'].sort());
  assert.equal(measurement.aula, 'L-419');
  assert.match(measurement.ts, /-05:00$/);
}
console.log(`PASS SYS-09.2: ${measurements.length} measurements with the exact six fields`);
