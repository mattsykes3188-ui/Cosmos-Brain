'use strict';

const fs = require('fs');
const path = require('path');

const { buildPadroesLocucaoIndex } = require('../scripts/build_padroes_locucao_index');
const {
  buildPadroesLocucaoCoverageReport
} = require('../scripts/build_padroes_locucao_coverage_report');

const rootDir = path.join(__dirname, '..');
const patternsDir = path.join(rootDir, 'data', 'biblioteca_anuncios', 'padroes_locucao');
const taxonomyDir = path.join(rootDir, 'data', 'taxonomia');
const indexPath = path.join(patternsDir, 'index.json');
const reportPath = path.join(rootDir, 'reports', 'padroes_locucao_coverage_report.md');

const seedFiles = [
  'agro_dor_padronizacao_problema_solucao.json',
  'pesca_premium_prova_visual.json',
  'esportivo_comparativo_transformacao.json',
  'corporativo_autoridade_confianca.json',
  'hospitalar_falta_padronizacao_tecnico.json'
];

const semanticTaxonomies = {
  segmento: 'segmentos.json',
  tipo_dor: 'tipos_dor.json',
  hook_type: 'tipos_hook.json',
  estrutura_narrativa: 'estruturas_narrativas.json',
  tom_emocional: 'tons_emocionais.json',
  tipo_cta: 'tipos_cta.json',
  formato_conteudo: 'formatos_conteudo.json',
  estilo_visual: 'estilos_visuais.json',
  objetivo_comercial: 'objetivos_comerciais.json'
};

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
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function loadTaxonomyIds(fileName) {
  const filePath = path.join(taxonomyDir, fileName);
  const items = readJson(filePath);
  return new Set(items.map((item) => item.id));
}

function extractTotalFromReport(report) {
  const match = report.match(/Total de padroes aprovados:\s*(\d+)/);
  return match ? Number(match[1]) : null;
}

console.log('\n[TEST 1] seed files exist');

for (const fileName of seedFiles) {
  assert(fs.existsSync(path.join(patternsDir, fileName)), `seed exists: ${fileName}`);
}

console.log('\n[TEST 2] seed payloads follow approved pattern contract');

const taxonomyIdsByField = {};
for (const [field, fileName] of Object.entries(semanticTaxonomies)) {
  taxonomyIdsByField[field] = loadTaxonomyIds(fileName);
}

for (const fileName of seedFiles) {
  const payload = readJson(path.join(patternsDir, fileName));
  const label = `seed:${fileName}`;

  assert(payload.type === 'padrao_locucao', `${label} has type padrao_locucao`);
  assert(payload.status === 'approved', `${label} has approved status`);
  assert(isNonEmptyString(payload.approvedAt), `${label} has approvedAt`);
  assert(isNonEmptyString(payload.createdAt), `${label} has createdAt`);
  assert(payload.source && payload.source.kind === 'seed_manual', `${label} has source.kind seed_manual`);

  for (const [field, ids] of Object.entries(taxonomyIdsByField)) {
    assert(isNonEmptyString(payload[field]), `${label} has semantic field ${field}`);
    assert(ids.has(payload[field]), `${label} uses official taxonomy id for ${field}: ${payload[field]}`);
  }
}

console.log('\n[TEST 3] seeds appear in approved index');

const indexResult = buildPadroesLocucaoIndex({ rootDir });
const index = readJson(indexPath);
const indexedFilenames = new Set(index.items.map((item) => item.filename));

assert(indexResult.success === true, 'index build returns success');
assert(index.total >= seedFiles.length, 'index total is at least the seed count');

for (const fileName of seedFiles) {
  assert(indexedFilenames.has(fileName), `index includes seed: ${fileName}`);
}

console.log('\n[TEST 4] coverage report reflects non-zero approved dataset');

const reportResult = buildPadroesLocucaoCoverageReport({ rootDir });
const report = fs.readFileSync(reportPath, 'utf8');
const reportTotal = extractTotalFromReport(report);

assert(reportResult.success === true, 'coverage report build returns success');
assert(fs.existsSync(reportPath), 'coverage report exists');
assert(reportTotal !== null && reportTotal > 0, 'coverage report total is greater than zero');
assert(report.includes('## Cobertura principal'), 'coverage report contains main coverage section');

console.log('\n' + '-'.repeat(48));
console.log(`Result: ${passed} passed | ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
