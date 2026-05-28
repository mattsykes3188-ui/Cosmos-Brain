'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { buildPadroesLocucaoIndex } = require('../scripts/build_padroes_locucao_index');
const {
  buildBatchSemanticQueryReports,
  getBatchReportGroups,
  queryApprovedPatterns,
  saveBatchSemanticQueryReports
} = require('../core/semanticQuery');
const {
  parseArgs
} = require('../scripts/build_semantic_query_batch_reports');

const rootDir = path.join(__dirname, '..');
const batchDir = path.join(rootDir, 'reports', 'semantic_queries', 'batch');

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

console.log('\n[TEST 1] batch groups');
assert(fs.existsSync(path.join(rootDir, 'scripts', 'build_semantic_query_batch_reports.js')), 'batch script exists');

const requiredGroups = [
  'segmentos',
  'tons_emocionais',
  'objetivos_comerciais',
  'tipos_dor',
  'hooks'
];
const groups = getBatchReportGroups();

for (const groupName of requiredGroups) {
  assert(groups.includes(groupName), `batch group exists: ${groupName}`);
}

assert(groups.length === requiredGroups.length, 'batch groups have expected size');
assertThrows(
  () => buildBatchSemanticQueryReports('grupo_invalido', { rootDir }),
  'rejects invalid group',
  'Grupo invalido'
);

console.log('\n[TEST 2] build batch reports in memory');
const segmentosReports = buildBatchSemanticQueryReports('segmentos', { rootDir });

assert(Array.isArray(segmentosReports), 'buildBatchSemanticQueryReports returns an array');
assert(segmentosReports.length >= 10, 'segmentos batch creates one report per taxonomy value');
assert(segmentosReports.some((report) => report.value === 'agro' && report.total >= 1), 'segmentos batch includes covered agro report');
assert(segmentosReports.some((report) => report.total === 0), 'segmentos batch includes zero-result reports');
assert(segmentosReports.every((report) => report.report.includes('# Relat')), 'each batch item contains markdown report');

console.log('\n[TEST 3] save batch reports');
const savedSegmentos = saveBatchSemanticQueryReports('segmentos', { rootDir });

assert(savedSegmentos.success === true, 'saveBatchSemanticQueryReports returns success');
assert(savedSegmentos.total === segmentosReports.length, 'saved report count matches built report count');
assert(savedSegmentos.reports.every((report) => report.path.startsWith('reports/semantic_queries/batch/segmentos/')), 'reports saved in batch group folder');

const agroReport = path.join(batchDir, 'segmentos', 'semantic_query_segmento_agro.md');
const comitivaReport = path.join(batchDir, 'segmentos', 'semantic_query_segmento_comitiva.md');

assert(fs.existsSync(agroReport), 'covered batch report file exists');
assert(fs.existsSync(comitivaReport), 'zero-result batch report file exists');
assert(fs.readFileSync(comitivaReport, 'utf8').includes('Total encontrado: 0'), 'zero-result report preserves total 0');

console.log('\n[TEST 4] CLI batch behavior');
const parsedGroup = parseArgs(['--group', 'segmentos']);
assert(parsedGroup.groupName === 'segmentos' && parsedGroup.all === false, 'CLI parses --group');

const parsedAll = parseArgs(['--all']);
assert(parsedAll.all === true && parsedAll.groupName === null, 'CLI parses --all');

assertThrows(
  () => parseArgs(['--all', '--group', 'segmentos']),
  'CLI rejects --all with --group',
  'nao ambos'
);

const groupRun = spawnSync(process.execPath, [
  path.join(rootDir, 'scripts', 'build_semantic_query_batch_reports.js'),
  '--group',
  'segmentos'
], {
  cwd: rootDir,
  encoding: 'utf8'
});

assert(groupRun.status === 0, '--group segmentos works');
assert(groupRun.stdout.includes('OK semantic query batch reports'), '--group prints success');

const allRun = spawnSync(process.execPath, [
  path.join(rootDir, 'scripts', 'build_semantic_query_batch_reports.js'),
  '--all'
], {
  cwd: rootDir,
  encoding: 'utf8'
});

const batchIndexPath = path.join(batchDir, 'index.md');

assert(allRun.status === 0, '--all works');
assert(allRun.stdout.includes('Batch index:'), '--all prints batch index path');
assert(fs.existsSync(batchIndexPath), 'batch index.md is generated');

const batchIndex = fs.readFileSync(batchIndexPath, 'utf8');
assert(batchIndex.includes('# Índice de Relatórios Semânticos em Lote'), 'batch index contains title');
assert(batchIndex.includes('segmentos'), 'batch index lists segmentos group');
assert(batchIndex.includes('hooks'), 'batch index lists hooks group');

console.log('\n[TEST 5] individual query remains intact');
const individual = queryApprovedPatterns({ segmento: 'agro' }, { rootDir });

assert(individual.success === true, 'individual query still succeeds');
assert(individual.total >= 1, 'individual query still returns seed');

console.log('\n' + '-'.repeat(48));
console.log(`Result: ${passed} passed | ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
