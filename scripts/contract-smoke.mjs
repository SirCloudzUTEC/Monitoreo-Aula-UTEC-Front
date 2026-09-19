// Smoke test of the SYS-09.2 measurement contract against the real backend.
// Requires a running backend and an account with `ver_datos_autorizados`:
//   UTEC_API_BASE_URL=http://localhost:8080 UTEC_EMAIL=... UTEC_PASSWORD=... node scripts/contract-smoke.mjs
import assert from 'node:assert/strict';

const base = process.env.UTEC_API_BASE_URL || 'http://localhost:8080';
const { UTEC_EMAIL: email, UTEC_PASSWORD: password } = process.env;
assert.ok(email && password, 'Define UTEC_EMAIL y UTEC_PASSWORD');

const login = await fetch(`${base}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Client': 'web' },
  body: JSON.stringify({ email, password }),
});
assert.equal(login.status, 200, 'login must succeed');
const { accessToken } = await login.json();

const response = await fetch(`${base}/api/aulas/L-419/mediciones/actuales`, {
  headers: { Authorization: `Bearer ${accessToken}`, 'X-Client': 'web' },
});
assert.equal(response.status, 200, 'SYS-09.2 measurement API must be available');
const measurements = await response.json();
assert.ok(Array.isArray(measurements) && measurements.length > 0, 'Measurements must not be empty');
for (const measurement of measurements) {
  assert.deepEqual(Object.keys(measurement).sort(), ['ts', 'aula', 'nodo', 'magnitud', 'valor', 'unidad'].sort());
  assert.equal(measurement.aula, 'L-419');
  assert.match(measurement.ts, /-05:00$/);
}
console.log(`PASS SYS-09.2: ${measurements.length} measurements with the exact six fields`);
