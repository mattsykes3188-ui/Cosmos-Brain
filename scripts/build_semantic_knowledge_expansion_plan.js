'use strict';

const fs = require('fs');
const path = require('path');

const TAXONOMY_FILES = {
  segmentos: 'segmentos.json',
  tipos_dor: 'tipos_dor.json',
  hooks: 'tipos_hook.json',
  tons_emocionais: 'tons_emocionais.json',
  objetivos_comerciais: 'objetivos_comerciais.json',
  tipos_cta: 'tipos_cta.json',
  formatos_conteudo: 'formatos_conteudo.json',
  estilos_visuais: 'estilos_visuais.json'
};

const COVERAGE_GOALS = {
  patternsPerSegment: 3,
  hooksPerSegment: 2,
  painTypesPerSegment: 2,
  emotionalTonesPerSegment: 2
};

function buildSemanticKnowledgeExpansionPlan(options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const backlogPath = options.backlogPath || path.join(rootDir, 'reports', 'semantic_queries', 'knowledge_gap_backlog.md');
  const summaryPath = options.summaryPath || path.join(rootDir, 'reports', 'semantic_queries', 'batch', 'summary.md');
  const indexPath = options.indexPath || path.join(rootDir, 'data', 'biblioteca_anuncios', 'padroes_locucao', 'index.json');
  const taxonomyDir = options.taxonomyDir || path.join(rootDir, 'data', 'taxonomia');
  const outputPath = options.outputPath || path.join(rootDir, 'reports', 'semantic_queries', 'knowledge_expansion_plan.md');

  assertFileExists(backlogPath, 'Backlog de lacunas nao encontrado. Rode: node scripts/build_semantic_knowledge_gap_backlog.js');
  assertFileExists(summaryPath, 'Summary dos batch reports nao encontrado. Rode: node scripts/build_semantic_query_batch_summary.js');
  assertFileExists(indexPath, 'Index de padroes de locucao nao encontrado. Rode: node scripts/build_padroes_locucao_index.js');

  const sources = {
    backlog: fs.readFileSync(backlogPath, 'utf8'),
    summary: fs.readFileSync(summaryPath, 'utf8'),
    index: readJson(indexPath),
    taxonomies: loadTaxonomies(taxonomyDir)
  };
  const plan = buildExpansionPlanData(sources);
  const markdown = renderExpansionPlan(plan);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, markdown, 'utf8');

  return {
    success: true,
    path: path.relative(rootDir, outputPath).replace(/\\/g, '/'),
    plan,
    markdown
  };
}

function buildExpansionPlanData({ backlog, summary, index, taxonomies }) {
  validateIndex(index);

  const backlogGapCount = countBacklogItems(backlog);
  const summaryMetrics = parseSummaryMetrics(summary);
  const missingSegments = getMissing(index, 'segmentos');
  const missingHooks = getMissing(index, 'hooks');
  const missingPainTypes = getMissing(index, 'tipos_dor');
  const objectiveCounts = index.counts && index.counts.por_objetivo_comercial ? index.counts.por_objetivo_comercial : {};
  const toneCounts = index.counts && index.counts.por_tom_emocional ? index.counts.por_tom_emocional : {};
  const ctaCounts = index.counts && index.counts.por_tipo_cta ? index.counts.por_tipo_cta : {};
  const formatCounts = countItemsByField(index.items || [], 'formato_conteudo');
  const visualStyleCounts = countItemsByField(index.items || [], 'estilo_visual');

  return {
    generatedAt: new Date().toISOString(),
    totalApprovedPatterns: index.total,
    totalBatchReports: summaryMetrics.totalBatchReports,
    totalGaps: backlogGapCount,
    strategicObjective: 'Expandir a cobertura semântica do Cosmos Brain para reduzir lacunas de segmentos, hooks e dores ainda pouco representados.',
    goals: COVERAGE_GOALS,
    highPriority: buildHighPriority({
      missingSegments,
      missingHooks,
      missingPainTypes,
      counts: index.counts || {}
    }),
    mediumPriority: buildMediumPriority({
      taxonomies,
      objectiveCounts,
      toneCounts,
      ctaCounts,
      formatCounts
    }),
    lowPriority: buildLowPriority({
      taxonomies,
      visualStyleCounts,
      formatCounts
    }),
    nextSeeds: buildNextSeedSuggestions({
      taxonomies,
      missingSegments,
      missingHooks,
      missingPainTypes,
      objectiveCounts,
      ctaCounts
    }),
    expansionOrder: [
      'segmentos sem cobertura',
      'hooks sem cobertura',
      'tipos_dor sem cobertura',
      'diversidade emocional',
      'formatos e estilos visuais'
    ],
    executiveSummary: buildExecutiveSummary({
      index,
      missingSegments,
      missingHooks,
      missingPainTypes,
      summaryMetrics
    })
  };
}

function buildHighPriority({ missingSegments, missingHooks, missingPainTypes, counts }) {
  return [
    ...missingSegments.map((id) => ({
      title: `Segmento ${id}`,
      currentCoverage: 0,
      minimumGoal: `${COVERAGE_GOALS.patternsPerSegment} padrões`,
      recommendation: `criar ${COVERAGE_GOALS.patternsPerSegment} padrões aprovados iniciais para ${id}`
    })),
    ...missingHooks.map((id) => ({
      title: `Hook ${id}`,
      currentCoverage: counts.por_hook_type && counts.por_hook_type[id] ? counts.por_hook_type[id] : 0,
      minimumGoal: `${COVERAGE_GOALS.hooksPerSegment} ocorrências por segmento relevante`,
      recommendation: `criar padrões corporativos e hospitalares usando ${id}`
    })),
    ...missingPainTypes.map((id) => ({
      title: `Tipo de dor ${id}`,
      currentCoverage: counts.por_tipo_dor && counts.por_tipo_dor[id] ? counts.por_tipo_dor[id] : 0,
      minimumGoal: `${COVERAGE_GOALS.painTypesPerSegment} ocorrências por segmento relevante`,
      recommendation: `criar padrões iniciais abordando ${id}`
    }))
  ];
}

function buildMediumPriority({ taxonomies, objectiveCounts, toneCounts, ctaCounts, formatCounts }) {
  const missingObjectives = getMissingFromCounts(taxonomies.objetivos_comerciais, objectiveCounts);
  const missingTones = getMissingFromCounts(taxonomies.tons_emocionais, toneCounts);
  const missingCtas = getMissingFromCounts(taxonomies.tipos_cta, ctaCounts);
  const missingFormats = getMissingFromCounts(taxonomies.formatos_conteudo, formatCounts);

  return [
    ...missingTones.slice(0, 5).map((id) => ({
      title: `Diversidade emocional ${id}`,
      currentCoverage: 0,
      minimumGoal: `${COVERAGE_GOALS.emotionalTonesPerSegment} tons por segmento`,
      recommendation: `criar padrões com tom emocional ${id}`
    })),
    ...missingObjectives.slice(0, 5).map((id) => ({
      title: `Objetivo comercial ${id}`,
      currentCoverage: 0,
      minimumGoal: '2 padrões aprovados',
      recommendation: `criar padrões orientados a ${id}`
    })),
    ...missingCtas.slice(0, 4).map((id) => ({
      title: `CTA ${id}`,
      currentCoverage: 0,
      minimumGoal: '2 ocorrências aprovadas',
      recommendation: `criar padrões com CTA ${id}`
    })),
    ...missingFormats.slice(0, 3).map((id) => ({
      title: `Formato ${id}`,
      currentCoverage: 0,
      minimumGoal: '1 padrão aprovado',
      recommendation: `criar padrão no formato ${id}`
    }))
  ];
}

function buildLowPriority({ taxonomies, visualStyleCounts, formatCounts }) {
  const missingVisualStyles = getMissingFromCounts(taxonomies.estilos_visuais, visualStyleCounts);
  const lowFormats = getMissingFromCounts(taxonomies.formatos_conteudo, formatCounts);

  return [
    ...missingVisualStyles.slice(0, 6).map((id) => ({
      title: `Refinamento visual ${id}`,
      currentCoverage: 0,
      minimumGoal: '1 padrão aprovado',
      recommendation: `testar combinação com estilo visual ${id}`
    })),
    ...lowFormats.slice(0, 4).map((id) => ({
      title: `Ampliação do formato ${id}`,
      currentCoverage: 0,
      minimumGoal: '1 padrão aprovado',
      recommendation: `mapear locução adequada para ${id}`
    }))
  ];
}

function buildNextSeedSuggestions({ taxonomies, missingSegments, missingHooks, missingPainTypes, objectiveCounts, ctaCounts }) {
  const segments = cycleTargets(missingSegments, taxonomies.segmentos);
  const hooks = cycleTargets(missingHooks, taxonomies.hooks);
  const painTypes = cycleTargets(missingPainTypes, taxonomies.tipos_dor);
  const objectives = cycleTargets(getMissingFromCounts(taxonomies.objetivos_comerciais, objectiveCounts), taxonomies.objetivos_comerciais);
  const ctas = cycleTargets(getMissingFromCounts(taxonomies.tipos_cta, ctaCounts), taxonomies.tipos_cta);
  const suggestions = [];

  for (let index = 0; index < 10; index++) {
    const segmento = segments[index % segments.length];
    const hook = hooks[index % hooks.length];
    const tipoDor = painTypes[index % painTypes.length];
    const objetivo = objectives[index % objectives.length];
    const cta = ctas[index % ctas.length];

    suggestions.push({
      segmento,
      hook,
      tipo_dor: tipoDor,
      objetivo,
      cta,
      observacao: `criar seed inicial para ${segmento} cobrindo ${tipoDor} com hook ${hook}`
    });
  }

  return suggestions;
}

function renderExpansionPlan(plan) {
  const lines = [
    '# Knowledge Expansion Plan',
    '',
    '## Informações Gerais',
    '',
    `- Data de geração: ${plan.generatedAt}`,
    `- Total de padrões aprovados: ${plan.totalApprovedPatterns}`,
    `- Total de relatórios batch: ${plan.totalBatchReports}`,
    `- Total de gaps identificados: ${plan.totalGaps}`,
    '',
    '## Objetivo Estratégico',
    '',
    plan.strategicObjective,
    '',
    '## Metas de Cobertura',
    '',
    `- mínimo ${plan.goals.patternsPerSegment} padrões por segmento`,
    `- mínimo ${plan.goals.hooksPerSegment} hooks por segmento`,
    `- mínimo ${plan.goals.painTypesPerSegment} tipos de dor por segmento`,
    `- mínimo ${plan.goals.emotionalTonesPerSegment} tons emocionais por segmento`,
    '',
    '## Prioridades de Expansão',
    '',
    '### Prioridade Alta',
    '',
    renderPriorityItems(plan.highPriority),
    '',
    '### Prioridade Média',
    '',
    renderPriorityItems(plan.mediumPriority),
    '',
    '### Prioridade Baixa',
    '',
    renderPriorityItems(plan.lowPriority),
    '',
    '## Próximos Seeds Recomendados',
    '',
    ...plan.nextSeeds.map(renderSeedSuggestion),
    '',
    '## Ordem Recomendada de Expansão',
    '',
    ...plan.expansionOrder.map((item, index) => `${index + 1}. ${item}`),
    '',
    '## Resumo Executivo',
    '',
    ...plan.executiveSummary.map((line) => `- ${line}`),
    '',
    '> Plano gerado deterministicamente a partir do backlog, summary, index e taxonomias oficiais.'
  ];

  return `${lines.join('\n')}\n`;
}

function renderPriorityItems(items) {
  if (!items.length) {
    return 'Nenhum item identificado nesta prioridade.';
  }

  return items.map((item) => [
    `#### ${item.title}`,
    `- Cobertura atual: ${item.currentCoverage}`,
    `- Meta mínima: ${item.minimumGoal}`,
    `- Recomendação: ${item.recommendation}`
  ].join('\n')).join('\n\n');
}

function renderSeedSuggestion(seed) {
  return [
    `- segmento: \`${seed.segmento}\``,
    `  hook: \`${seed.hook}\``,
    `  tipo_dor: \`${seed.tipo_dor}\``,
    `  objetivo: \`${seed.objetivo}\``,
    `  CTA: \`${seed.cta}\``,
    `  observação: ${seed.observacao}`
  ].join('\n');
}

function buildExecutiveSummary({ index, missingSegments, missingHooks, missingPainTypes, summaryMetrics }) {
  const lines = [];

  if (index.total <= 5) {
    lines.push('O Cosmos já possui uma fundação semântica funcional, mas ainda apresenta baixa densidade de padrões aprovados.');
  } else {
    lines.push('O Cosmos possui base semântica em expansão e precisa equilibrar cobertura entre categorias.');
  }

  if (missingSegments.length > 0) {
    lines.push('A expansão inicial deve focar cobertura mínima dos segmentos sem padrões aprovados antes de aprofundar variações internas.');
  }

  if (missingHooks.length > 0 || missingPainTypes.length > 0) {
    lines.push('Hooks e tipos de dor sem cobertura devem orientar a próxima rodada de coleta e seeds.');
  }

  if (summaryMetrics.totalEmptyReports > 0) {
    lines.push('Relatórios vazios indicam onde o Brain ainda não possui inteligência suficiente para consulta estratégica.');
  }

  return lines;
}

function countBacklogItems(backlog) {
  const matches = backlog.match(/^###\s+/gm);
  return matches ? matches.length : 0;
}

function parseSummaryMetrics(summary) {
  return {
    totalBatchReports: parseNumber(summary, /Total de .*batch encontrados:\s*(\d+)/),
    totalEmptyReports: parseNumber(summary, /Relat.*vazios:\s*(\d+)/)
  };
}

function parseNumber(text, pattern) {
  const match = text.match(pattern);
  return match ? Number(match[1]) : 0;
}

function loadTaxonomies(taxonomyDir) {
  const taxonomies = {};

  for (const [name, fileName] of Object.entries(TAXONOMY_FILES)) {
    const items = readJson(path.join(taxonomyDir, fileName));
    taxonomies[name] = items.map((item) => item.id).filter(Boolean).sort();
  }

  return taxonomies;
}

function getMissing(index, key) {
  return index.coverage && index.coverage[key] && Array.isArray(index.coverage[key].missing)
    ? index.coverage[key].missing
    : [];
}

function getMissingFromCounts(officialIds = [], counts = {}) {
  return officialIds.filter((id) => !counts[id]);
}

function countItemsByField(items, field) {
  const counts = {};

  for (const item of items) {
    if (item[field]) {
      counts[item[field]] = (counts[item[field]] || 0) + 1;
    }
  }

  return counts;
}

function cycleTargets(primary = [], fallback = []) {
  const values = [...new Set([...primary, ...fallback])].filter(Boolean);
  return values.length ? values : ['sem_valor'];
}

function validateIndex(index) {
  if (!index || index.type !== 'padroes_locucao_index' || typeof index.total !== 'number') {
    throw new Error('Index de padroes de locucao invalido.');
  }
}

function assertFileExists(filePath, message) {
  if (!fs.existsSync(filePath)) {
    throw new Error(message);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

if (require.main === module) {
  try {
    const result = buildSemanticKnowledgeExpansionPlan();
    console.log(`OK semantic knowledge expansion plan: ${result.path}`);
  } catch (error) {
    console.error(`Erro: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  COVERAGE_GOALS,
  TAXONOMY_FILES,
  buildExpansionPlanData,
  buildNextSeedSuggestions,
  buildSemanticKnowledgeExpansionPlan,
  loadTaxonomies,
  parseSummaryMetrics,
  renderExpansionPlan
};
