'use strict';

const fs = require('fs');
const path = require('path');

const {
  buildPadroesLocucaoCoverageReport
} = require('../scripts/build_padroes_locucao_coverage_report');

const testRoot = path.join(__dirname, '.tmp_padroes_locucao_coverage_report');
const indexPath = path.join(testRoot, 'data', 'biblioteca_anuncios', 'padroes_locucao', 'index.json');
const reportPath = path.join(testRoot, 'reports', 'padroes_locucao_coverage_report.md');

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
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
}

function cleanup() {
  fs.rmSync(testRoot, { recursive: true, force: true });
}

function writeIndex(total = 0) {
  const index = {
    type: 'padroes_locucao_index',
    generatedAt: '2026-05-26T00:00:00.000Z',
    total,
    counts: {
      por_segmento: total > 0 ? { agro: 1 } : {},
      por_tipo_dor: total > 0 ? { baixa_percepcao_premium: 1 } : {},
      por_hook_type: total > 0 ? { dor_direta: 1 } : {},
      por_estrutura_narrativa: total > 0 ? { problema_solucao: 1 } : {},
      por_tom_emocional: total > 0 ? { confiavel: 1 } : {},
      por_tipo_cta: total > 0 ? { chamar_whatsapp: 1 } : {},
      por_objetivo_comercial: total > 0 ? { gerar_lead: 1 } : {}
    },
    coverage: {
      segmentos: {
        covered: total > 0 ? ['agro'] : [],
        missing: ['corporativo']
      },
      tipos_dor: {
        covered: total > 0 ? ['baixa_percepcao_premium'] : [],
        missing: ['falta_padronizacao']
      },
      hooks: {
        covered: total > 0 ? ['dor_direta'] : [],
        missing: ['pergunta']
      }
    },
    items: []
  };

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
}

reset();

console.log('\n[TEST 1] script exists');
assert(fs.existsSync(path.join(__dirname, '..', 'scripts', 'build_padroes_locucao_coverage_report.js')), 'coverage report script exists');

console.log('\n[TEST 2] report works with total 0');
writeIndex(0);
const resultZero = buildPadroesLocucaoCoverageReport({ rootDir: testRoot });
const reportZero = fs.readFileSync(reportPath, 'utf8');

assert(resultZero.success === true, 'report build returns success');
assert(fs.existsSync(reportPath), 'report is generated in reports folder');
assert(reportZero.includes('# Relatorio de Cobertura - Padroes de Locucao'), 'report contains title');
assert(reportZero.includes('Total de padroes aprovados: 0'), 'report contains total 0');
assert(reportZero.includes('Data de geracao:'), 'report contains generation date');
assert(reportZero.includes('## Resumo executivo'), 'report contains executive summary');
assert(reportZero.includes('Ainda nao ha padroes de locucao aprovados'), 'report explains zero state');
assert(reportZero.includes('## Lacunas'), 'report contains gaps section');
assert(reportZero.includes('- corporativo'), 'report lists missing segment');

console.log('\n[TEST 3] report works with total > 0');
writeIndex(1);
buildPadroesLocucaoCoverageReport({ rootDir: testRoot });
const reportOne = fs.readFileSync(reportPath, 'utf8');

assert(reportOne.includes('Total de padroes aprovados: 1'), 'report contains non-zero total');
assert(reportOne.includes('Top segmentos cobertos'), 'report contains top segmentos');
assert(reportOne.includes('- agro: 1'), 'report contains counted segmento');
assert(reportOne.includes('Hooks sem padroes'), 'report contains hook gaps');

cleanup();

console.log('\n' + '-'.repeat(48));
console.log(`Result: ${passed} passed | ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
