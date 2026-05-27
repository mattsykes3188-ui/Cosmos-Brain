'use strict';

const fs = require('fs');
const path = require('path');

const { buildPadroesLocucaoIndex } = require('../scripts/build_padroes_locucao_index');

const testRoot = path.join(__dirname, '.tmp_padroes_locucao_index');
const patternsDir = path.join(testRoot, 'data', 'biblioteca_anuncios', 'padroes_locucao');
const taxonomyDir = path.join(testRoot, 'data', 'taxonomia');
const indexPath = path.join(patternsDir, 'index.json');

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

function reset() {
  fs.rmSync(testRoot, { recursive: true, force: true });
  fs.mkdirSync(patternsDir, { recursive: true });
  fs.mkdirSync(taxonomyDir, { recursive: true });
}

function cleanup() {
  fs.rmSync(testRoot, { recursive: true, force: true });
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

function approvedPattern(overrides = {}) {
  return {
    type: 'padrao_locucao',
    status: 'approved',
    titulo: 'Padrao aprovado teste',
    segmento: 'agro',
    tipo_dor: 'baixa_percepcao_premium',
    hook_type: 'dor_direta',
    estrutura_narrativa: 'problema_solucao',
    tom_emocional: 'confiavel',
    tipo_cta: 'chamar_whatsapp',
    objetivo_comercial: 'gerar_lead',
    approvedAt: '2026-05-26T00:00:00.000Z',
    source: {
      filename: 'unit_curada.txt'
    },
    ...overrides
  };
}

function seedTaxonomies() {
  writeJson(path.join(taxonomyDir, 'segmentos.json'), [
    { id: 'agro' },
    { id: 'corporativo' }
  ]);
  writeJson(path.join(taxonomyDir, 'tipos_dor.json'), [
    { id: 'baixa_percepcao_premium' },
    { id: 'falta_padronizacao' }
  ]);
  writeJson(path.join(taxonomyDir, 'tipos_hook.json'), [
    { id: 'dor_direta' },
    { id: 'pergunta' }
  ]);
}

reset();
seedTaxonomies();

console.log('\n[TEST 1] script exists and builds index');
assert(fs.existsSync(path.join(__dirname, '..', 'scripts', 'build_padroes_locucao_index.js')), 'build script exists');

writeJson(indexPath, { type: 'old_index_should_be_ignored' });
writeJson(path.join(patternsDir, 'approved_agro.json'), approvedPattern());
writeJson(path.join(patternsDir, 'draft_agro.json'), approvedPattern({ status: 'draft', titulo: 'Draft ignorado' }));
writeJson(path.join(patternsDir, 'wrong_type.json'), approvedPattern({ type: 'outro_tipo', titulo: 'Tipo ignorado' }));
writeJson(path.join(patternsDir, 'approved_corporativo.json'), approvedPattern({
  titulo: 'Padrao corporativo',
  segmento: 'corporativo',
  tipo_dor: 'falta_padronizacao',
  hook_type: 'pergunta',
  estrutura_narrativa: 'autoridade',
  tom_emocional: 'tecnico',
  tipo_cta: 'pedir_orcamento',
  objetivo_comercial: 'aumentar_autoridade',
  source: {
    filename: 'corporativo_curada.txt'
  }
}));

const result = buildPadroesLocucaoIndex({ rootDir: testRoot });
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

assert(result.success === true, 'build returns success');
assert(index.type === 'padroes_locucao_index', 'index has correct type');
assert(typeof index.generatedAt === 'string' && index.generatedAt.length > 0, 'index has generatedAt');
assert(typeof index.total === 'number', 'total is number');
assert(index.total === 2, 'total includes only approved padrao_locucao');
assert(index.counts && typeof index.counts === 'object', 'counts exists');
assert(Array.isArray(index.items), 'items is array');
assert(index.items.every((item) => item.filename !== 'index.json'), 'ignores index.json');
assert(index.items.every((item) => !item.filename.startsWith('draft')), 'ignores drafts');
assert(index.items.every((item) => !item.filename.startsWith('wrong_type')), 'ignores wrong type');
assert(index.counts.por_segmento.agro === 1, 'counts by segmento correctly');
assert(index.counts.por_segmento.corporativo === 1, 'counts second segmento correctly');
assert(index.counts.por_tipo_dor.baixa_percepcao_premium === 1, 'counts by tipo_dor correctly');
assert(index.counts.por_hook_type.dor_direta === 1, 'counts by hook_type correctly');
assert(Array.isArray(index.coverage.segmentos.covered), 'coverage segmentos covered is array');
assert(Array.isArray(index.coverage.segmentos.missing), 'coverage segmentos missing is array');
assert(index.coverage.segmentos.covered.includes('agro'), 'coverage marks covered segmento');
assert(index.coverage.tipos_dor.covered.includes('falta_padronizacao'), 'coverage marks covered tipo_dor');
assert(index.coverage.hooks.missing.length === 0, 'coverage hooks missing reflects fixture');

cleanup();

console.log('\n' + '-'.repeat(48));
console.log(`Result: ${passed} passed | ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
