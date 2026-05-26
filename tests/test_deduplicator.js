'use strict';

const fs = require('fs');
const path = require('path');

const { findDuplicateBrainItem } = require('../core/deduplicator');
const { createFingerprint } = require('../core/hash');

const testRoot = path.join(__dirname, '.tmp_deduplicator');
const ganchosDir = path.join(testRoot, 'data', 'ganchos');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  OK ${label}`);
    passed++;
  } else {
    console.log(`  FAIL ${label}`);
    failed++;
  }
}

function item(overrides = {}) {
  return {
    id: 'gancho_existing',
    type: 'gancho',
    product: 'polo',
    objective: 'vender',
    style: 'premium',
    strength: 5,
    text: 'Sua polo nao precisa parecer uniforme comum.',
    context: 'Usar em videos premium de venda para polos personalizadas.',
    source_type: 'test',
    ...overrides
  };
}

fs.rmSync(testRoot, { recursive: true, force: true });
fs.mkdirSync(ganchosDir, { recursive: true });

const existing = item();
fs.writeFileSync(
  path.join(ganchosDir, 'gancho_existing.json'),
  JSON.stringify({ ...existing, fingerprint: createFingerprint(existing) }, null, 2),
  'utf8'
);

console.log('\n[TEST 1] detects duplicate by fingerprint');

const duplicate = findDuplicateBrainItem(item({ id: 'gancho_new' }), ganchosDir);
assert(duplicate.duplicate === true, 'duplicate is detected');
assert(duplicate.match.id === 'gancho_existing', 'returns matching id');

console.log('\n[TEST 2] allows different text');

const unique = findDuplicateBrainItem(item({
  id: 'gancho_unique',
  text: 'Outro gancho premium para vender polos personalizadas.'
}), ganchosDir);
assert(unique.duplicate === false, 'different fingerprint is not duplicate');

console.log('\n[TEST 3] handles missing folder');

const missingFolder = findDuplicateBrainItem(item(), path.join(testRoot, 'data', 'missing'));
assert(missingFolder.duplicate === false, 'missing folder has no duplicate');

console.log('\n' + '-'.repeat(48));
console.log(`Result: ${passed} passed | ${failed} failed`);

fs.rmSync(testRoot, { recursive: true, force: true });

if (failed > 0) {
  process.exit(1);
}
