'use strict';

const fs = require('fs');
const path = require('path');

const {
  RAW_TRANSCRIPTIONS_DIR,
  gerarNomeCurado,
  lerTranscricaoBruta,
  listarTranscricoesBrutas,
  salvarTranscricaoCurada
} = require('../tools/video-intelligence/server');

const curatedDir = path.join(__dirname, '..', 'tools', 'video-intelligence', 'transcricoes_curadas');
const rawFixtureName = 'unit_curation_raw.txt';
const curatedFixtureName = 'unit_curation_raw_curada.txt';
const rawFixturePath = path.join(RAW_TRANSCRIPTIONS_DIR, rawFixtureName);
const curatedFixturePath = path.join(curatedDir, curatedFixtureName);

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

function assertThrows(fn, label) {
  try {
    fn();
    assert(false, label);
  } catch (_) {
    assert(true, label);
  }
}

function setup() {
  cleanup();
  fs.mkdirSync(RAW_TRANSCRIPTIONS_DIR, { recursive: true });
  fs.mkdirSync(curatedDir, { recursive: true });
  fs.writeFileSync(rawFixturePath, 'Texto bruto para curadoria manual.', 'utf8');
}

function cleanup() {
  fs.rmSync(rawFixturePath, { force: true });
  fs.rmSync(curatedFixturePath, { force: true });
}

setup();

console.log('\n[TEST 1] curation helpers exist');
assert(typeof listarTranscricoesBrutas === 'function', 'listarTranscricoesBrutas exists');
assert(typeof lerTranscricaoBruta === 'function', 'lerTranscricaoBruta exists');
assert(typeof salvarTranscricaoCurada === 'function', 'salvarTranscricaoCurada exists');
assert(typeof gerarNomeCurado === 'function', 'gerarNomeCurado exists');

console.log('\n[TEST 2] curated filename is generated safely');
assert(gerarNomeCurado('exemplo_transcricao_bruta.txt') === 'exemplo_transcricao_bruta_curada.txt', 'adds _curada suffix');
assertThrows(() => gerarNomeCurado('video.mp4'), 'blocks non txt filename');
assertThrows(() => gerarNomeCurado('../arquivo.txt'), 'blocks path traversal');
assertThrows(() => gerarNomeCurado('pasta/arquivo.txt'), 'blocks nested path');

console.log('\n[TEST 3] raw transcripts are listed and read from raw folder');
const files = listarTranscricoesBrutas();
assert(files.includes(rawFixtureName), 'raw fixture appears in list');
assert(lerTranscricaoBruta(rawFixtureName) === 'Texto bruto para curadoria manual.', 'reads raw transcript content');
assertThrows(() => lerTranscricaoBruta('../arquivo.txt'), 'read blocks traversal');

console.log('\n[TEST 4] curated transcript is saved in curated folder only');
const result = salvarTranscricaoCurada(rawFixtureName, 'Texto curado e preparado para analise futura.');
assert(result.filename === curatedFixtureName, 'returns curated filename');
assert(result.path === `transcricoes_curadas/${curatedFixtureName}`, 'returns curated relative path');
assert(fs.existsSync(curatedFixturePath), 'curated file exists');
assert(!fs.existsSync(path.join(RAW_TRANSCRIPTIONS_DIR, curatedFixtureName)), 'does not save curated file in raw folder');
assert(fs.readFileSync(curatedFixturePath, 'utf8') === 'Texto curado e preparado para analise futura.', 'preserves saved content');

cleanup();

console.log('\n' + '-'.repeat(48));
console.log(`Result: ${passed} passed | ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
