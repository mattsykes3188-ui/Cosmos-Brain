'use strict';

const fs = require('fs');
const path = require('path');

const { buildPadroesLocucaoIndex } = require('../scripts/build_padroes_locucao_index');
const { runCli: runBatchReports } = require('../scripts/build_semantic_query_batch_reports');
const { buildSemanticQueryBatchSummary } = require('../scripts/build_semantic_query_batch_summary');
const {
  buildBacklogData,
  buildSemanticKnowledgeGapBacklog,
  loadTaxonomies,
  parseSummaryMetrics
} = require('../scripts/build_semantic_knowledge_gap_backlog');

const rootDir = path.join(__dirname, '..');
const backlogPath = path.join(rootDir, 'reports', 'semantic_queries', 'knowledge_gap_backlog.md');
const taxonomyDir = path.join(rootDir, 'data', 'taxonomia');

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

function extractRecommendationIds(markdown) {
  const section = markdown.split('## Recomendações de Próximos Seeds')[1].split('## Resumo Estratégico')[0];
  const ids = [];
  const pattern = /`([a-z0-9_]+)`/g;
  let match;

  while ((match = pattern.exec(section)) !== null) {
    ids.push(match[1]);
  }

  return ids;
}

console.log('\n[SETUP] rebuild semantic report sources');
assert(buildPadroesLocucaoIndex({ rootDir }).success === true, 'approved index is available');
assert(runBatchReports(['--all'], { rootDir }).success === true, 'batch reports are available');
assert(buildSemanticQueryBatchSummary({ rootDir }).success === true, 'batch summary is available');

console.log('\n[TEST 1] script exists and parses summary');
assert(fs.existsSync(path.join(rootDir, 'scripts', 'build_semantic_knowledge_gap_backlog.js')), 'backlog script exists');

const summary = fs.readFileSync(path.join(rootDir, 'reports', 'semantic_queries', 'batch', 'summary.md'), 'utf8');
const metrics = parseSummaryMetrics(summary);

assert(metrics.totalBatchReports > 0, 'summary metrics include total batch reports');
assert(metrics.totalEmptyReports > 0, 'summary metrics include empty reports');
assert(metrics.groups.segmentos && metrics.groups.segmentos.total > 0, 'summary metrics include group stats');

console.log('\n[TEST 2] backlog data uses real gaps');
const index = readJson(path.join(rootDir, 'data', 'biblioteca_anuncios', 'padroes_locucao', 'index.json'));
const taxonomies = loadTaxonomies(taxonomyDir);
const backlogData = buildBacklogData(index, summary, taxonomies);

assert(backlogData.totalApprovedPatterns >= 1, 'fixture has approved patterns available');
assert(backlogData.highPriority.length > 0, 'backlog has high priority items');
assert(backlogData.highPriority.some((item) => item.title.includes('promocional')), 'backlog includes real missing segment');
assert(backlogData.highPriority.some((item) => item.title.includes('bastidor')), 'backlog includes real missing hook');
assert(backlogData.mediumPriority.length > 0, 'backlog has medium priority items');
assert(backlogData.lowPriority.length > 0, 'backlog has low priority items');
assert(backlogData.nextSeedRecommendations.length > 0, 'backlog has next seed recommendations');
assert(backlogData.strategicSummary.length > 0, 'backlog has strategic summary');

console.log('\n[TEST 3] backlog markdown is generated');
const result = buildSemanticKnowledgeGapBacklog({ rootDir });
const backlog = fs.readFileSync(backlogPath, 'utf8');

assert(result.success === true, 'backlog build returns success');
assert(fs.existsSync(backlogPath), 'knowledge_gap_backlog.md is generated');
assert(backlog.includes('# Semantic Knowledge Gap Backlog'), 'backlog contains title');
assert(backlog.includes('## Informações Gerais'), 'backlog contains general info');
assert(backlog.includes('## Prioridade Alta'), 'backlog contains high priority');
assert(backlog.includes('## Prioridade Média'), 'backlog contains medium priority');
assert(backlog.includes('## Prioridade Baixa'), 'backlog contains low priority');
assert(backlog.includes('## Recomendações de Próximos Seeds'), 'backlog contains seed recommendations');
assert(backlog.includes('## Resumo Estratégico'), 'backlog contains strategic summary');
assert(backlog.includes('Categoria:'), 'backlog contains item category fields');
assert(backlog.includes('Ação recomendada:'), 'backlog contains recommended actions');

console.log('\n[TEST 4] next seed recommendations use only official taxonomy ids');
const officialIds = new Set(Object.values(taxonomies).flat());
const recommendationIds = extractRecommendationIds(backlog);

assert(recommendationIds.length > 0, 'recommendation ids are present');
assert(recommendationIds.every((id) => officialIds.has(id)), 'all recommendation ids exist in official taxonomies');

console.log('\n[TEST 5] backlog works with a low-total fixture');
const lowIndex = {
  type: 'padroes_locucao_index',
  total: 1,
  counts: {
    por_segmento: { agro: 1 },
    por_tipo_dor: { falta_padronizacao: 1 },
    por_hook_type: { dor_direta: 1 },
    por_tom_emocional: { confiavel: 1 },
    por_objetivo_comercial: { gerar_lead: 1 },
    por_tipo_cta: { chamar_whatsapp: 1 }
  },
  coverage: {
    segmentos: { missing: ['promocional'] },
    tipos_dor: { missing: ['cliente_indeciso'] },
    hooks: { missing: ['bastidor'] }
  },
  items: [
    {
      formato_conteudo: 'reel',
      estilo_visual: 'fabrica_real'
    }
  ]
};
const lowSummary = [
  '- Total de relatórios batch encontrados: 3',
  '- Relatórios com resultados: 1',
  '- Relatórios vazios: 2',
  '| segmentos | 1 | 1 | 0 |',
  '| hooks | 1 | 0 | 1 |'
].join('\n');
const lowBacklog = buildBacklogData(lowIndex, lowSummary, taxonomies);

assert(lowBacklog.totalApprovedPatterns === 1, 'low fixture preserves total approved patterns');
assert(lowBacklog.highPriority.length >= 3, 'low fixture creates high priority gaps');
assert(lowBacklog.strategicSummary.some((line) => line.includes('baixa profundidade')), 'low fixture creates low-depth summary');

console.log('\n' + '-'.repeat(48));
console.log(`Result: ${passed} passed | ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
