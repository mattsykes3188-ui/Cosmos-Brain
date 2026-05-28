'use strict';

const fs = require('fs');
const path = require('path');

const { buildPadroesLocucaoIndex } = require('../scripts/build_padroes_locucao_index');
const {
  formatQueryResult,
  getAllowedSemanticFilters,
  loadApprovedPatternIndex,
  queryApprovedPatterns,
  validateSemanticFilter
} = require('../core/semanticQuery');
const { parseArgs } = require('../scripts/query_padroes_locucao');

const rootDir = path.join(__dirname, '..');

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

function assertThrows(fn, label, expectedMessage) {
  try {
    fn();
    console.log(`  FAIL ${label}`);
    failed++;
  } catch (error) {
    const matches = expectedMessage ? error.message.includes(expectedMessage) : true;
    if (matches) {
      console.log(`  OK ${label}`);
      passed++;
    } else {
      console.log(`  FAIL ${label}: ${error.message}`);
      failed++;
    }
  }
}

console.log('\n[SETUP] rebuild approved pattern index');
const buildResult = buildPadroesLocucaoIndex({ rootDir });
assert(buildResult.success === true, 'approved pattern index is available');

console.log('\n[TEST 1] semantic query module exists and exposes filters');
assert(fs.existsSync(path.join(rootDir, 'core', 'semanticQuery.js')), 'core/semanticQuery.js exists');

const expectedFilters = [
  'segmento',
  'tipo_dor',
  'hook_type',
  'estrutura_narrativa',
  'tom_emocional',
  'tipo_cta',
  'objetivo_comercial',
  'formato_conteudo',
  'estilo_visual'
];
const allowedFilters = getAllowedSemanticFilters();

for (const filter of expectedFilters) {
  assert(allowedFilters.includes(filter), `allowed filter exists: ${filter}`);
}

assert(allowedFilters.length === expectedFilters.length, 'allowed filters list has expected size');

console.log('\n[TEST 2] filter validation');
assert(validateSemanticFilter('segmento', 'agro', { rootDir }).success === true, 'accepts valid filter value');
assert(validateSemanticFilter('segmento', 'nao_existe', { rootDir }).success === false, 'rejects value outside taxonomy');
assert(validateSemanticFilter('campo_inventado', 'agro', { rootDir }).success === false, 'rejects unknown filter');
assert(validateSemanticFilter('segmento', '../agro', { rootDir }).success === false, 'rejects unsafe value');

console.log('\n[TEST 3] structured queries');
const agroResult = queryApprovedPatterns({ segmento: 'agro' }, { rootDir });
assert(agroResult.total >= 1, 'query by segmento agro returns at least one seed');
assert(agroResult.items.every((item) => item.segmento === 'agro'), 'agro query returns only agro items');

const hospitalarTecnicoResult = queryApprovedPatterns({
  segmento: 'hospitalar',
  tom_emocional: 'tecnico'
}, { rootDir });
assert(hospitalarTecnicoResult.total >= 1, 'query by hospitalar + tecnico returns at least one seed');
assert(
  hospitalarTecnicoResult.items.every((item) => item.segmento === 'hospitalar' && item.tom_emocional === 'tecnico'),
  'combined query returns matching items'
);

const noResult = queryApprovedPatterns({ segmento: 'comitiva' }, { rootDir });
assert(noResult.total === 0, 'valid query with no match returns total 0');
assert(Array.isArray(noResult.items) && noResult.items.length === 0, 'valid query with no match returns empty items');

assertThrows(
  () => queryApprovedPatterns({ segmento: 'nao_existe' }, { rootDir }),
  'query rejects semantic value outside taxonomy',
  'Valor nao encontrado'
);
assertThrows(
  () => queryApprovedPatterns({ filtro_errado: 'agro' }, { rootDir }),
  'query rejects unknown filter',
  'Filtro desconhecido'
);

console.log('\n[TEST 4] stable formatting and index loading');
const loaded = loadApprovedPatternIndex({ rootDir });
assert(loaded.index.type === 'padroes_locucao_index', 'loadApprovedPatternIndex loads approved index');

const formatted = formatQueryResult(agroResult);
assert(formatted.success === true, 'formatQueryResult preserves success');
assert(typeof formatted.total === 'number', 'formatQueryResult exposes total');
assert(Array.isArray(formatted.items), 'formatQueryResult exposes items array');
assert(formatted.items[0] && Object.prototype.hasOwnProperty.call(formatted.items[0], 'filename'), 'formatted item has filename');
assert(Object.prototype.hasOwnProperty.call(formatted.items[0], 'formato_conteudo'), 'formatted item has formato_conteudo');
assert(Object.prototype.hasOwnProperty.call(formatted.items[0], 'estilo_visual'), 'formatted item has estilo_visual');

console.log('\n[TEST 5] CLI contract');
assert(fs.existsSync(path.join(rootDir, 'scripts', 'query_padroes_locucao.js')), 'CLI script exists');

const parsed = parseArgs(['--segmento', 'agro', '--tom_emocional', 'confiavel', '--save']);
assert(parsed.save === true, 'CLI parses save flag');
assert(parsed.filters.segmento === 'agro', 'CLI parses segmento filter');
assert(parsed.filters.tom_emocional === 'confiavel', 'CLI parses tom_emocional filter');

assertThrows(
  () => parseArgs(['--campo_inventado', 'agro']),
  'CLI rejects unknown filter',
  'Filtro desconhecido'
);
assertThrows(
  () => parseArgs(['--segmento']),
  'CLI rejects filter without value',
  'Filtro sem valor'
);

console.log('\n' + '-'.repeat(48));
console.log(`Result: ${passed} passed | ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
