import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const base = new URL('../', import.meta.url);
const hashes = JSON.parse(await fs.readFile(new URL('original-sha256.json', base), 'utf8'));
for (const [name, expected] of Object.entries(hashes)) {
  test(`Original bytes unchanged: ${name}`, async () => {
    const actual = crypto.createHash('sha256').update(await fs.readFile(new URL(`original/${name}`, base))).digest('hex');
    assert.equal(actual, expected);
  });
}
test('Original folder contains exactly the four supplied files', async () => {
  assert.deepEqual((await fs.readdir(new URL('original/', base))).sort(), Object.keys(hashes).sort());
});
