'use strict';

const fs = require('fs');
const path = require('path');

const {
  PATTERNS_DIR,
  gerarNomePromovido,
  lerPadraoLocucaoDraft,
  listarPadroesLocucaoDraft,
  promoverPadraoLocucao,
  validarPadraoLocucaoContraTaxonomia,
  validarPadraoLocucaoSchema
} = require('../tools/video-intelligence/server');

const approvedDir = path.join(__dirname, '..', 'data', 'biblioteca_anuncios', 'padroes_locucao');
const draftName = 'unit_review_pattern.json';
const draftPath = path.join(PATTERNS_DIR, draftName);
const approvedPath = path.join(approvedDir, draftName);

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

function validDraft(overrides = {}) {
  return {
    type: 'padrao_locucao',
    source: {
      kind: 'transcricao_curada',
      filename: 'unit_review_curada.txt',
      path: 'tools/video-intelligence/transcricoes_curadas/unit_review_curada.txt'
    },
    titulo: 'Padrao para revisao',
    segmento: 'agro',
    tipo_dor: 'baixa_percepcao_premium',
    hook_type: 'dor_direta',
    estrutura_narrativa: 'problema_solucao',
    tom_emocional: 'confiavel',
    tipo_cta: 'chamar_whatsapp',
    formato_conteudo: 'reel',
    estilo_visual: 'fabrica_real',
    objetivo_comercial: 'gerar_lead',
    observacoes: 'Draft local para teste de promocao.',
    createdAt: '2026-05-26T00:00:00.000Z',
    status: 'draft',
    ...overrides
  };
}

function setup() {
  cleanup();
  fs.mkdirSync(PATTERNS_DIR, { recursive: true });
  fs.mkdirSync(approvedDir, { recursive: true });
  fs.writeFileSync(draftPath, JSON.stringify(validDraft(), null, 2), 'utf8');
}

function cleanup() {
  fs.rmSync(draftPath, { force: true });
  fs.rmSync(approvedPath, { force: true });
  for (const file of fs.readdirSync(approvedDir).filter((name) => name.startsWith('unit_review_pattern_'))) {
    fs.rmSync(path.join(approvedDir, file), { force: true });
  }
}

setup();

console.log('\n[TEST 1] draft listing and safe read');
assert(listarPadroesLocucaoDraft().includes(draftName), 'listarPadroesLocucaoDraft includes draft');
assert(lerPadraoLocucaoDraft(draftName).type === 'padrao_locucao', 'lerPadraoLocucaoDraft reads JSON');
assertThrows(() => lerPadraoLocucaoDraft('../arquivo.json'), 'blocks path traversal');
assertThrows(() => lerPadraoLocucaoDraft('arquivo.txt'), 'accepts only json');

console.log('\n[TEST 2] schema and taxonomy validation');
assert(validarPadraoLocucaoSchema(validDraft()) === true, 'valid schema passes');
assert(validarPadraoLocucaoContraTaxonomia(validDraft()) === true, 'valid taxonomy passes');
assertThrows(() => validarPadraoLocucaoSchema(validDraft({ type: 'outro' })), 'rejects invalid type');
assertThrows(() => validarPadraoLocucaoContraTaxonomia(validDraft({ segmento: 'inexistente' })), 'rejects invalid taxonomy value');

console.log('\n[TEST 3] promotion writes approved copy');
assert(gerarNomePromovido(draftName) === draftName, 'promoted name keeps original when free');
const result = promoverPadraoLocucao(draftName);
const promoted = JSON.parse(fs.readFileSync(approvedPath, 'utf8'));

assert(result.promotedFilename === draftName, 'returns promoted filename');
assert(result.destination === `data/biblioteca_anuncios/padroes_locucao/${draftName}`, 'returns data destination');
assert(fs.existsSync(approvedPath), 'approved file is created');
assert(fs.existsSync(draftPath), 'draft is not deleted');
assert(promoted.type === 'padrao_locucao', 'promoted keeps type');
assert(promoted.status === 'approved', 'promoted status approved');
assert(typeof promoted.approvedAt === 'string' && promoted.approvedAt.length > 0, 'promoted has approvedAt');
assert(promoted.promotedFrom === `tools/video-intelligence/padroes_locucao/${draftName}`, 'promoted has promotedFrom');
assert(promoted.source.filename === 'unit_review_curada.txt', 'promoted preserves source');
assert(promoted.createdAt === '2026-05-26T00:00:00.000Z', 'promoted preserves createdAt');

console.log('\n[TEST 4] duplicate destination gets safe suffix');
const secondName = gerarNomePromovido(draftName);
assert(secondName === 'unit_review_pattern_2.json', 'duplicate promoted name gets suffix');

console.log('\n[TEST 5] invalid draft is rejected');
fs.writeFileSync(draftPath, JSON.stringify(validDraft({ tipo_dor: 'nao_existe' }), null, 2), 'utf8');
assertThrows(() => promoverPadraoLocucao(draftName), 'promotion rejects invalid semantic value');

cleanup();

console.log('\n' + '-'.repeat(48));
console.log(`Result: ${passed} passed | ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
