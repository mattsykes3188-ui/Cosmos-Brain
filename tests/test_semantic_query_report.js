'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { buildPadroesLocucaoIndex } = require('../scripts/build_padroes_locucao_index');
const {
  buildSemanticQueryReport,
  generateSemanticQueryReportFilename,
  queryApprovedPatterns,
  saveSemanticQueryReport
} = require('../core/semanticQuery');

const rootDir = path.join(__dirname, '..');
const reportDir = path.join(rootDir, 'reports', 'semantic_queries');

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

console.log('\n[TEST 1] report filename is safe');
const filename = generateSemanticQueryReportFilename({
  segmento: 'agro',
  tom_emocional: 'confiavel'
});

assert(filename === 'semantic_query_segmento_agro__tom_emocional_confiavel.md', 'generates deterministic safe filename');
assert(!filename.includes('..') && !filename.includes('/') && !filename.includes('\\'), 'filename has no traversal tokens');

assertThrows(
  () => generateSemanticQueryReportFilename({ segmento: '../agro' }),
  'rejects path traversal value',
  'Valor inseguro'
);
assertThrows(
  () => generateSemanticQueryReportFilename({ campo_inventado: 'agro' }),
  'rejects unknown report filter',
  'Filtro desconhecido'
);

console.log('\n[TEST 2] markdown report content with results');
const agroResult = queryApprovedPatterns({ segmento: 'agro' }, { rootDir });
const agroReport = buildSemanticQueryReport({ segmento: 'agro' }, agroResult);

assert(agroReport.includes('# Relatório de Consulta Semântica'), 'report contains title');
assert(agroReport.includes('## Filtros aplicados'), 'report contains filters section');
assert(agroReport.includes('- segmento: agro'), 'report includes applied filter');
assert(agroReport.includes('- Total encontrado: 1'), 'report includes total found');
assert(agroReport.includes('## Resultados'), 'report contains results section');
assert(agroReport.includes('### Agro - dor de padronizacao com problema e solucao'), 'report includes result title');
assert(agroReport.includes('- Arquivo: agro_dor_padronizacao_problema_solucao.json'), 'report includes result filename');
assert(agroReport.includes('- Formato: reel'), 'report includes format');
assert(agroReport.includes('- Estilo visual: fabrica_real'), 'report includes visual style');
assert(agroReport.includes('- Source:'), 'report includes source line');

console.log('\n[TEST 3] markdown report content with zero results');
const emptyResult = queryApprovedPatterns({ segmento: 'comitiva' }, { rootDir });
const emptyReport = buildSemanticQueryReport({ segmento: 'comitiva' }, emptyResult);

assert(emptyResult.total === 0, 'fixture query returns total 0');
assert(emptyReport.includes('- Total encontrado: 0'), 'empty report includes total 0');
assert(
  emptyReport.includes('Nenhum padrão encontrado para os filtros aplicados.'),
  'empty report includes no-result message'
);

console.log('\n[TEST 4] save report to reports/semantic_queries');
const saved = saveSemanticQueryReport({ segmento: 'agro' }, agroResult, { rootDir });
const savedPath = path.join(rootDir, saved.path);

assert(saved.success === true, 'saveSemanticQueryReport returns success');
assert(saved.path.startsWith('reports/semantic_queries/'), 'report is saved in semantic query report folder');
assert(fs.existsSync(savedPath), 'saved markdown report exists');
assert(fs.readFileSync(savedPath, 'utf8').includes('- segmento: agro'), 'saved report preserves content');

console.log('\n[TEST 5] CLI report behavior');
const cliNoReport = spawnSync(process.execPath, [
  path.join(rootDir, 'scripts', 'query_padroes_locucao.js'),
  '--segmento',
  'agro'
], {
  cwd: rootDir,
  encoding: 'utf8'
});

assert(cliNoReport.status === 0, 'CLI without --report still succeeds');
assert(cliNoReport.stdout.includes('"total": 1'), 'CLI without --report still prints JSON');
assert(!cliNoReport.stdout.includes('Relatorio salvo em'), 'CLI without --report does not save markdown report');

const cliReport = spawnSync(process.execPath, [
  path.join(rootDir, 'scripts', 'query_padroes_locucao.js'),
  '--segmento',
  'hospitalar',
  '--tom_emocional',
  'tecnico',
  '--report'
], {
  cwd: rootDir,
  encoding: 'utf8'
});
const expectedReportPath = path.join(
  reportDir,
  'semantic_query_segmento_hospitalar__tom_emocional_tecnico.md'
);

assert(cliReport.status === 0, 'CLI with --report succeeds');
assert(cliReport.stdout.includes('Relatorio salvo em:'), 'CLI with --report prints report path');
assert(fs.existsSync(expectedReportPath), 'CLI with --report creates markdown file');

console.log('\n' + '-'.repeat(48));
console.log(`Result: ${passed} passed | ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
