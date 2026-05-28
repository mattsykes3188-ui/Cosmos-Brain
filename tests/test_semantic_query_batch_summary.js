'use strict';

const fs = require('fs');
const path = require('path');

const { buildPadroesLocucaoIndex } = require('../scripts/build_padroes_locucao_index');
const { runCli: runBatchReports } = require('../scripts/build_semantic_query_batch_reports');
const {
  analyzeBatchReports,
  buildSemanticQueryBatchSummary,
  listBatchMarkdownReports,
  parseTotalFound
} = require('../scripts/build_semantic_query_batch_summary');

const rootDir = path.join(__dirname, '..');
const batchDir = path.join(rootDir, 'reports', 'semantic_queries', 'batch');
const summaryPath = path.join(batchDir, 'summary.md');

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

console.log('\n[SETUP] rebuild index and batch reports');
const indexResult = buildPadroesLocucaoIndex({ rootDir });
assert(indexResult.success === true, 'approved pattern index is available');

const batchResult = runBatchReports(['--all'], { rootDir });
assert(batchResult.success === true, 'batch reports are available');

console.log('\n[TEST 1] script exists and parses reports');
assert(fs.existsSync(path.join(rootDir, 'scripts', 'build_semantic_query_batch_summary.js')), 'summary script exists');
assert(parseTotalFound('- Total encontrado: 7') === 7, 'parseTotalFound reads totals');

fs.writeFileSync(summaryPath, '# stale summary should be ignored\n', 'utf8');
const reportFiles = listBatchMarkdownReports(batchDir);
const basenames = reportFiles.map((filePath) => path.basename(filePath));

assert(reportFiles.length > 0, 'batch markdown reports are found');
assert(!basenames.includes('index.md'), 'list ignores index.md');
assert(!basenames.includes('summary.md'), 'list ignores previous summary.md');

console.log('\n[TEST 2] analysis includes empty and filled reports');
const analysis = analyzeBatchReports(reportFiles, { rootDir, batchDir });

assert(analysis.totalReports === reportFiles.length, 'analysis total matches report files');
assert(analysis.reportsWithResults > 0, 'analysis finds reports with results');
assert(analysis.emptyReports > 0, 'analysis finds empty reports');
assert(analysis.groupStats.segmentos.total > 0, 'analysis includes segmentos group');
assert(analysis.groupStats.hooks.total > 0, 'analysis includes hooks group');

console.log('\n[TEST 3] summary is generated');
const summaryResult = buildSemanticQueryBatchSummary({ rootDir });
const summary = fs.readFileSync(summaryPath, 'utf8');

assert(summaryResult.success === true, 'summary build returns success');
assert(fs.existsSync(summaryPath), 'summary.md is generated');
assert(summary.includes('# Resumo Executivo'), 'summary contains title');
assert(summary.includes('Data de'), 'summary contains generation date');
assert(summary.includes('Total de relat'), 'summary contains total reports');
assert(summary.includes('## Cobertura Geral'), 'summary contains general coverage section');
assert(summary.includes('## Cobertura por Grupo'), 'summary contains group coverage section');
assert(summary.includes('segmentos'), 'summary contains segmentos group');
assert(summary.includes('tons_emocionais'), 'summary contains tons_emocionais group');
assert(summary.includes('objetivos_comerciais'), 'summary contains objetivos_comerciais group');
assert(summary.includes('tipos_dor'), 'summary contains tipos_dor group');
assert(summary.includes('hooks'), 'summary contains hooks group');
assert(summary.includes('## Principais Lacunas'), 'summary contains gaps section');
assert(summary.includes('## Recomenda'), 'summary contains recommendations section');
assert(summary.includes('Expandir coleta') || summary.includes('Manter rotina'), 'summary contains deterministic recommendation');

console.log('\n[TEST 4] summary works with empty report set');
const tmpRoot = path.join(__dirname, '.tmp_semantic_query_batch_summary');
const tmpBatchDir = path.join(tmpRoot, 'reports', 'semantic_queries', 'batch');
const tmpIndexPath = path.join(tmpRoot, 'data', 'biblioteca_anuncios', 'padroes_locucao', 'index.json');
const tmpOutputPath = path.join(tmpBatchDir, 'summary.md');

fs.rmSync(tmpRoot, { recursive: true, force: true });
fs.mkdirSync(path.dirname(tmpIndexPath), { recursive: true });
fs.writeFileSync(tmpIndexPath, JSON.stringify({
  type: 'padroes_locucao_index',
  total: 0,
  counts: {},
  coverage: {
    segmentos: { missing: ['agro'] },
    tipos_dor: { missing: ['falta_padronizacao'] },
    hooks: { missing: ['dor_direta'] }
  },
  items: []
}, null, 2), 'utf8');

const emptySummaryResult = buildSemanticQueryBatchSummary({
  rootDir: tmpRoot,
  batchDir: tmpBatchDir,
  indexPath: tmpIndexPath,
  outputPath: tmpOutputPath
});
const emptySummary = fs.readFileSync(tmpOutputPath, 'utf8');

assert(emptySummaryResult.success === true, 'empty batch summary builds');
assert(emptySummary.includes('Total de relat'), 'empty batch summary contains total reports');
assert(emptySummary.includes('0'), 'empty batch summary preserves zero values');

fs.rmSync(tmpRoot, { recursive: true, force: true });

console.log('\n' + '-'.repeat(48));
console.log(`Result: ${passed} passed | ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
