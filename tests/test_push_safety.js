'use strict';

const fs = require('fs');
const path = require('path');

const { runPrePushValidation } = require('../scripts/pre_push_validation');

const testRoot = path.join(__dirname, '.tmp_push_safety');
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

function validGancho(overrides = {}) {
  return {
    id: 'gancho_valido_001',
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

function resetFixture() {
  fs.rmSync(testRoot, { recursive: true, force: true });

  const dirs = [
    'data/ganchos',
    'data/tendencias',
    'data/chamadas_acao',
    'data/biblioteca_anuncios',
    'data/estrategia_mateus',
    'schemas'
  ];

  for (const dir of dirs) {
    fs.mkdirSync(path.join(testRoot, dir), { recursive: true });
  }

  writeJson('data/ganchos/gancho_valido_001.json', validGancho());
  writeJson('data/ganchos/index.json', ['gancho_valido_001.json']);
  writeJson('data/tendencias/index.json', []);
  writeJson('data/chamadas_acao/index.json', []);
  writeJson('data/biblioteca_anuncios/index.json', []);
  writeJson('data/estrategia_mateus/index.json', []);
  writeJson('schemas/gancho.schema.json', { name: 'gancho' });
}

function writeJson(relativePath, data) {
  const filePath = path.join(testRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function writeText(relativePath, text) {
  const filePath = path.join(testRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, 'utf8');
}

function logExists(root = testRoot) {
  return fs.existsSync(path.join(root, 'logs', 'push_safety', `push_validation_${today}.json`));
}

function readLog(root = testRoot) {
  return JSON.parse(fs.readFileSync(path.join(root, 'logs', 'push_safety', `push_validation_${today}.json`), 'utf8'));
}

console.log('\n[TEST 1] pre push validation passes on valid fixture');

resetFixture();
const validReport = runPrePushValidation({ rootDir: testRoot, runTests: false });
assert(validReport.success === true, 'valid fixture passes');
assert(validReport.validations_passed === true, 'validations pass');
assert(validReport.checked_files > 0, 'checks files');
assert(logExists(), 'creates push safety log');
assert(readLog().some((entry) => entry.success === true), 'log records success');

console.log('\n[TEST 2] detects broken manifest and missing file');

resetFixture();
writeJson('data/ganchos/index.json', ['gancho_valido_001.json', 'arquivo_inexistente.json']);
const missingReport = runPrePushValidation({ rootDir: testRoot, runTests: false });
assert(missingReport.success === false, 'broken manifest blocks push');
assert(missingReport.errors.some((error) => String(error.message).includes('does not exist') || String(error.message).includes('missing file')), 'reports missing file');
assert(readLog().some((entry) => entry.success === false), 'log records manifest failure');

console.log('\n[TEST 3] detects invalid JSON');

resetFixture();
writeText('data/ganchos/json_quebrado.json', '{ "type": "gancho", ');
writeJson('data/ganchos/index.json', ['gancho_valido_001.json', 'json_quebrado.json']);
const jsonReport = runPrePushValidation({ rootDir: testRoot, runTests: false });
assert(jsonReport.success === false, 'invalid JSON blocks push');
assert(jsonReport.errors.some((error) => String(error.message).includes('Invalid JSON')), 'reports invalid JSON');

console.log('\n[TEST 4] detects invalid type');

resetFixture();
writeJson('data/ganchos/tipo_invalido.json', validGancho({
  id: 'tipo_invalido',
  type: 'tipo_invalido',
  text: 'Texto valido com tipo invalido para bloquear o push.'
}));
writeJson('data/ganchos/index.json', ['gancho_valido_001.json', 'tipo_invalido.json']);
const typeReport = runPrePushValidation({ rootDir: testRoot, runTests: false });
assert(typeReport.success === false, 'invalid type blocks push');
assert(typeReport.errors.some((error) => String(error.message).includes('Invalid type') || String(error.message).includes('Unsupported type')), 'reports invalid type');

console.log('\n[TEST 5] detects duplicate ids');

resetFixture();
writeJson('data/ganchos/gancho_duplicado.json', validGancho({
  text: 'Texto diferente para isolar a duplicidade de id.',
  context: 'Contexto diferente para isolar a duplicidade de id.'
}));
writeJson('data/ganchos/index.json', ['gancho_valido_001.json', 'gancho_duplicado.json']);
const duplicateReport = runPrePushValidation({ rootDir: testRoot, runTests: false });
assert(duplicateReport.success === false, 'duplicate id blocks push');
assert(duplicateReport.errors.some((error) => String(error.message).includes('Duplicate id')), 'reports duplicate id');

console.log('\n' + '-'.repeat(48));
console.log(`Result: ${passed} passed | ${failed} failed`);

fs.rmSync(testRoot, { recursive: true, force: true });

if (failed > 0) {
  process.exit(1);
}
