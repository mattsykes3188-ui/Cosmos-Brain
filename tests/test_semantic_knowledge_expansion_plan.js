'use strict';

const fs = require('fs');
const path = require('path');

const { buildPadroesLocucaoIndex } = require('../scripts/build_padroes_locucao_index');
const { runCli: runBatchReports } = require('../scripts/build_semantic_query_batch_reports');
const { buildSemanticQueryBatchSummary } = require('../scripts/build_semantic_query_batch_summary');
const { buildSemanticKnowledgeGapBacklog } = require('../scripts/build_semantic_knowledge_gap_backlog');
const {
  buildExpansionPlanData,
  buildSemanticKnowledgeExpansionPlan,
  loadTaxonomies
} = require('../scripts/build_semantic_knowledge_expansion_plan');

const rootDir = path.join(__dirname, '..');
const taxonomyDir = path.join(rootDir, 'data', 'taxonomia');
const planPath = path.join(rootDir, 'reports', 'semantic_queries', 'knowledge_expansion_plan.md');

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

function extractSeedIds(markdown) {
  const section = markdown.split('## Próximos Seeds Recomendados')[1].split('## Ordem Recomendada de Expansão')[0];
  const ids = [];
  const pattern = /`([a-z0-9_]+)`/g;
  let match;

  while ((match = pattern.exec(section)) !== null) {
    ids.push(match[1]);
  }

  return ids;
}

function countSeedSuggestions(markdown) {
  const section = markdown.split('## Próximos Seeds Recomendados')[1].split('## Ordem Recomendada de Expansão')[0];
  return (section.match(/^- segmento:/gm) || []).length;
}

console.log('\n[SETUP] rebuild semantic planning sources');
assert(buildPadroesLocucaoIndex({ rootDir }).success === true, 'approved index is available');
assert(runBatchReports(['--all'], { rootDir }).success === true, 'batch reports are available');
assert(buildSemanticQueryBatchSummary({ rootDir }).success === true, 'batch summary is available');
assert(buildSemanticKnowledgeGapBacklog({ rootDir }).success === true, 'knowledge gap backlog is available');

console.log('\n[TEST 1] script exists');
assert(fs.existsSync(path.join(rootDir, 'scripts', 'build_semantic_knowledge_expansion_plan.js')), 'expansion plan script exists');

console.log('\n[TEST 2] plan data works with partial coverage');
const index = readJson(path.join(rootDir, 'data', 'biblioteca_anuncios', 'padroes_locucao', 'index.json'));
const backlog = fs.readFileSync(path.join(rootDir, 'reports', 'semantic_queries', 'knowledge_gap_backlog.md'), 'utf8');
const summary = fs.readFileSync(path.join(rootDir, 'reports', 'semantic_queries', 'batch', 'summary.md'), 'utf8');
const taxonomies = loadTaxonomies(taxonomyDir);
const planData = buildExpansionPlanData({ backlog, summary, index, taxonomies });

assert(planData.totalApprovedPatterns === index.total, 'plan data keeps approved pattern total');
assert(planData.totalGaps > 0, 'plan data finds backlog gaps');
assert(planData.highPriority.length > 0, 'plan data has high priority items');
assert(planData.mediumPriority.length > 0, 'plan data has medium priority items');
assert(planData.lowPriority.length > 0, 'plan data has low priority items');
assert(planData.nextSeeds.length >= 10, 'plan data creates at least 10 seed suggestions');

console.log('\n[TEST 3] markdown plan is generated');
const result = buildSemanticKnowledgeExpansionPlan({ rootDir });
const plan = fs.readFileSync(planPath, 'utf8');

assert(result.success === true, 'plan build returns success');
assert(fs.existsSync(planPath), 'knowledge_expansion_plan.md is generated');
assert(plan.includes('# Knowledge Expansion Plan'), 'plan contains title');
assert(plan.includes('## Informações Gerais'), 'plan contains general info');
assert(plan.includes('## Objetivo Estratégico'), 'plan contains strategic objective');
assert(plan.includes('## Metas de Cobertura'), 'plan contains goals');
assert(plan.includes('mínimo 3 padrões por segmento'), 'plan contains fixed minimum segment goal');
assert(plan.includes('## Prioridades de Expansão'), 'plan contains priorities');
assert(plan.includes('### Prioridade Alta'), 'plan contains high priority');
assert(plan.includes('### Prioridade Média'), 'plan contains medium priority');
assert(plan.includes('### Prioridade Baixa'), 'plan contains low priority');
assert(plan.includes('## Próximos Seeds Recomendados'), 'plan contains next seeds section');
assert(plan.includes('## Ordem Recomendada de Expansão'), 'plan contains expansion order');
assert(plan.includes('## Resumo Executivo'), 'plan contains executive summary');
assert(countSeedSuggestions(plan) >= 10, 'plan renders at least 10 seed recommendations');

console.log('\n[TEST 4] seed suggestions use only official taxonomy ids');
const officialIds = new Set(Object.values(taxonomies).flat());
const seedIds = extractSeedIds(plan);

assert(seedIds.length >= 50, 'seed section contains structured ids');
assert(seedIds.every((id) => officialIds.has(id)), 'all seed ids exist in official taxonomies');

console.log('\n[TEST 5] low coverage fixture still produces a plan');
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
const lowBacklog = [
  '### Cobertura do segmento promocional',
  '### Cobertura do hook bastidor',
  '### Cobertura do tipo de dor cliente_indeciso'
].join('\n');
const lowSummary = [
  '- Total de relatórios batch encontrados: 3',
  '- Total de relatórios vazios: 2'
].join('\n');
const lowPlan = buildExpansionPlanData({
  backlog: lowBacklog,
  summary: lowSummary,
  index: lowIndex,
  taxonomies
});

assert(lowPlan.totalApprovedPatterns === 1, 'low fixture keeps total approved patterns');
assert(lowPlan.nextSeeds.length >= 10, 'low fixture creates at least 10 seed suggestions');
assert(lowPlan.executiveSummary.some((line) => line.includes('baixa densidade')), 'low fixture creates low-density executive summary');

console.log('\n' + '-'.repeat(48));
console.log(`Result: ${passed} passed | ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
