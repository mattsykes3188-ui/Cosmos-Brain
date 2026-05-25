'use strict';

const fs = require('fs');
const path = require('path');

const { saveBrainItem } = require('../core/writer');

const testRoot = path.join(__dirname, '.tmp_writer');
const today = new Date().toISOString().slice(0, 10);

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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resetTestRoot() {
  fs.rmSync(testRoot, { recursive: true, force: true });
  fs.mkdirSync(testRoot, { recursive: true });
}

resetTestRoot();

console.log('\n[TEST 1] save valid hook');

const validHook = {
  type: 'hook',
  product: 'polo',
  objective: 'vender',
  style: 'premium',
  strength: 5,
  text: 'Sua polo nao precisa parecer uniforme comum.',
  context: 'Usar em videos premium de venda para polos personalizadas.',
  source_type: 'test'
};

const result = saveBrainItem(validHook, { rootDir: testRoot });
const indexPath = path.join(testRoot, 'data', 'hooks', 'index.json');
const logPath = path.join(testRoot, 'logs', `log_${today}.json`);

console.log('  Result:', result);
assert(result.success === true, 'returns success=true');
assert(typeof result.id === 'string' && result.id.startsWith('hook_'), 'generates hook id');
assert(fs.existsSync(result.path), 'saves JSON file');
assert(fs.existsSync(indexPath), 'creates/updates hooks index.json');
assert(readJson(indexPath).includes(`${result.id}.json`), 'index.json lists saved file');
assert(fs.existsSync(logPath), 'creates log file');
assert(readJson(logPath).some((entry) => entry.id === result.id && entry.success === true), 'log includes success entry');

const savedItem = readJson(result.path);
assert(savedItem.fingerprint && typeof savedItem.fingerprint === 'string', 'saves fingerprint');
assert(savedItem.created_at && typeof savedItem.created_at === 'string', 'saves created_at');

console.log('\n[TEST 2] reject invalid hook');

const filesBeforeInvalidSave = fs.readdirSync(path.join(testRoot, 'data', 'hooks')).filter((file) => file.endsWith('.json'));
const invalidResult = saveBrainItem({
  type: 'hook',
  text: 'Item sem campos obrigatorios.'
}, { rootDir: testRoot });
const filesAfterInvalidSave = fs.readdirSync(path.join(testRoot, 'data', 'hooks')).filter((file) => file.endsWith('.json'));
const logs = readJson(logPath);

console.log('  Result:', invalidResult);
assert(invalidResult.success === false, 'returns success=false');
assert(Array.isArray(invalidResult.errors) && invalidResult.errors.length > 0, 'returns validation errors');
assert(filesAfterInvalidSave.length === filesBeforeInvalidSave.length, 'does not save a new data file');
assert(logs.some((entry) => entry.success === false && entry.message === 'Validation failed.'), 'log includes validation failure');

console.log('\n' + '-'.repeat(48));
console.log(`Result: ${passed} passed | ${failed} failed`);

fs.rmSync(testRoot, { recursive: true, force: true });

if (failed > 0) {
  process.exit(1);
}
