'use strict';

const fs = require('fs');
const path = require('path');

const {
  CURATED_TRANSCRIPTIONS_DIR,
  PATTERNS_DIR,
  carregarTaxonomia,
  gerarNomePadraoLocucao,
  lerTranscricaoCurada,
  listarTaxonomiasDisponiveis,
  listarTranscricoesCuradas,
  salvarPadraoLocucao,
  validarValorTaxonomia
} = require('../tools/video-intelligence/server');

const curatedFixtureName = 'unit_manual_pattern_curada.txt';
const patternFixtureName = 'unit_manual_pattern_curada_padrao_locucao.json';
const curatedFixturePath = path.join(CURATED_TRANSCRIPTIONS_DIR, curatedFixtureName);
const patternFixturePath = path.join(PATTERNS_DIR, patternFixtureName);

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
  fs.mkdirSync(CURATED_TRANSCRIPTIONS_DIR, { recursive: true });
  fs.mkdirSync(PATTERNS_DIR, { recursive: true });
  fs.writeFileSync(curatedFixturePath, 'Texto curado para extracao manual de padrao.', 'utf8');
}

function cleanup() {
  fs.rmSync(curatedFixturePath, { force: true });
  fs.rmSync(patternFixturePath, { force: true });
}

function validPayload(overrides = {}) {
  return {
    sourceFilename: curatedFixtureName,
    titulo: 'Padrao manual de teste',
    segmento: 'agro',
    tipo_dor: 'baixa_percepcao_premium',
    hook_type: 'dor_direta',
    estrutura_narrativa: 'problema_solucao',
    tom_emocional: 'confiavel',
    tipo_cta: 'chamar_whatsapp',
    formato_conteudo: 'reel',
    estilo_visual: 'fabrica_real',
    objetivo_comercial: 'gerar_lead',
    observacoes: 'Padrao extraido manualmente em teste.',
    ...overrides
  };
}

setup();

console.log('\n[TEST 1] curated transcripts are listed and read safely');
assert(listarTranscricoesCuradas().includes(curatedFixtureName), 'listarTranscricoesCuradas includes fixture');
assert(lerTranscricaoCurada(curatedFixtureName) === 'Texto curado para extracao manual de padrao.', 'lerTranscricaoCurada reads fixture');
assertThrows(() => lerTranscricaoCurada('../arquivo.txt'), 'lerTranscricaoCurada blocks path traversal');

console.log('\n[TEST 2] pattern filename is generated safely');
assert(gerarNomePadraoLocucao(curatedFixtureName) === patternFixtureName, 'gerarNomePadraoLocucao adds suffix');
assertThrows(() => gerarNomePadraoLocucao('video.mp4'), 'gerarNomePadraoLocucao blocks non txt');
assertThrows(() => gerarNomePadraoLocucao('../curada.txt'), 'gerarNomePadraoLocucao blocks traversal');

console.log('\n[TEST 3] taxonomies load from data/taxonomia');
const taxonomias = listarTaxonomiasDisponiveis();
assert(Array.isArray(taxonomias.segmentos) && taxonomias.segmentos.length > 0, 'segmentos taxonomy is loaded');
assert(Array.isArray(carregarTaxonomia('tipos_dor')), 'carregarTaxonomia returns array');
assert(validarValorTaxonomia('segmentos', 'agro') === true, 'validarValorTaxonomia accepts existing id');
assert(validarValorTaxonomia('segmentos', 'id_inexistente') === false, 'validarValorTaxonomia rejects missing id');

console.log('\n[TEST 4] save local padrao_locucao draft');
const result = salvarPadraoLocucao(validPayload());
const saved = JSON.parse(fs.readFileSync(patternFixturePath, 'utf8'));

assert(result.filename === patternFixtureName, 'returns pattern filename');
assert(result.path === `padroes_locucao/${patternFixtureName}`, 'returns local pattern path');
assert(fs.existsSync(patternFixturePath), 'pattern file exists in padroes_locucao');
assert(saved.type === 'padrao_locucao', 'saved payload has type padrao_locucao');
assert(saved.source.kind === 'transcricao_curada', 'saved payload has source.kind transcricao_curada');
assert(saved.source.filename === curatedFixtureName, 'saved payload keeps source filename');
assert(saved.status === 'draft', 'saved payload status is draft');
assert(saved.segmento === 'agro', 'saved payload keeps taxonomy value');

console.log('\n[TEST 5] invalid payloads are rejected');
assertThrows(() => salvarPadraoLocucao(validPayload({ titulo: '' })), 'rejects missing titulo');
assertThrows(() => salvarPadraoLocucao(validPayload({ segmento: 'nao_existe' })), 'rejects invalid taxonomy value');
assertThrows(() => salvarPadraoLocucao(validPayload({ sourceFilename: '../arquivo.txt' })), 'rejects traversal source filename');

cleanup();

console.log('\n' + '-'.repeat(48));
console.log(`Result: ${passed} passed | ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
