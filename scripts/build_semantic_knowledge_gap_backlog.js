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

function buildSemanticKnowledgeGapBacklog(options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const indexPath = options.indexPath || path.join(rootDir, 'data', 'biblioteca_anuncios', 'padroes_locucao', 'index.json');
  const summaryPath = options.summaryPath || path.join(rootDir, 'reports', 'semantic_queries', 'batch', 'summary.md');
  const taxonomyDir = options.taxonomyDir || path.join(rootDir, 'data', 'taxonomia');
  const outputPath = options.outputPath || path.join(rootDir, 'reports', 'semantic_queries', 'knowledge_gap_backlog.md');

  if (!fs.existsSync(indexPath)) {
    throw new Error('Index de padroes de locucao nao encontrado. Rode: node scripts/build_padroes_locucao_index.js');
  }

  if (!fs.existsSync(summaryPath)) {
    throw new Error('Summary dos batch reports nao encontrado. Rode: node scripts/build_semantic_query_batch_summary.js');
  }

  const index = readJson(indexPath);
  const summary = fs.readFileSync(summaryPath, 'utf8');
  const taxonomies = loadTaxonomies(taxonomyDir);
  const backlog = buildBacklogData(index, summary, taxonomies);
  const markdown = renderKnowledgeGapBacklog(backlog);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, markdown, 'utf8');

  return {
    success: true,
    path: path.relative(rootDir, outputPath).replace(/\\/g, '/'),
    backlog,
    markdown
  };
}

function buildBacklogData(index, summary, taxonomies) {
  validateIndex(index);

  const summaryMetrics = parseSummaryMetrics(summary);
  const missingSegments = getMissing(index, 'segmentos');
  const missingPainTypes = getMissing(index, 'tipos_dor');
  const missingHooks = getMissing(index, 'hooks');
  const objectiveCounts = index.counts && index.counts.por_objetivo_comercial ? index.counts.por_objetivo_comercial : {};
  const toneCounts = index.counts && index.counts.por_tom_emocional ? index.counts.por_tom_emocional : {};
  const ctaCounts = index.counts && index.counts.por_tipo_cta ? index.counts.por_tipo_cta : {};
  const formatCounts = countItemsByField(index.items || [], 'formato_conteudo');
  const visualStyleCounts = countItemsByField(index.items || [], 'estilo_visual');
  const missingObjectives = getMissingFromCounts(taxonomies.objetivos_comerciais, objectiveCounts);
  const missingTones = getMissingFromCounts(taxonomies.tons_emocionais, toneCounts);
  const missingCtas = getMissingFromCounts(taxonomies.tipos_cta, ctaCounts);
  const missingFormats = getMissingFromCounts(taxonomies.formatos_conteudo, formatCounts);
  const missingVisualStyles = getMissingFromCounts(taxonomies.estilos_visuais, visualStyleCounts);
  const lowObjectives = getLowCoverageValues(objectiveCounts, 1);
  const lowTones = getLowCoverageValues(toneCounts, 1);
  const emptyGroupStats = Object.entries(summaryMetrics.groups)
    .sort((a, b) => b[1].empty - a[1].empty || a[0].localeCompare(b[0]));

  return {
    generatedAt: new Date().toISOString(),
    totalApprovedPatterns: index.total,
    totalBatchReports: summaryMetrics.totalBatchReports,
    totalEmptyReports: summaryMetrics.totalEmptyReports,
    highPriority: [
      ...missingSegments.map((id) => createGapItem({
        title: `Cobertura do segmento ${id}`,
        category: 'segmento',
        type: 'missing',
        gap: `nenhum padrão aprovado encontrado para ${id}`,
        impact: `baixa inteligência para campanhas do segmento ${id}`,
        action: `coletar 3 padrões reais do segmento ${id}`
      })),
      ...missingHooks.map((id) => createGapItem({
        title: `Cobertura do hook ${id}`,
        category: 'hook',
        type: 'missing',
        gap: `nenhum padrão aprovado encontrado com hook ${id}`,
        impact: `baixa variedade de aberturas e ângulos persuasivos usando ${id}`,
        action: `coletar 3 padrões reais usando o hook ${id}`
      })),
      ...missingPainTypes.map((id) => createGapItem({
        title: `Cobertura do tipo de dor ${id}`,
        category: 'tipo_dor',
        type: 'missing',
        gap: `nenhum padrão aprovado encontrado para a dor ${id}`,
        impact: `baixa capacidade de criar conteúdo para objeções ligadas a ${id}`,
        action: `coletar 3 padrões reais sobre a dor ${id}`
      }))
    ],
    mediumPriority: [
      ...missingObjectives.slice(0, 6).map((id) => createGapItem({
        title: `Cobertura do objetivo ${id}`,
        category: 'objetivo_comercial',
        type: 'missing',
        gap: `nenhum padrão aprovado encontrado para o objetivo ${id}`,
        impact: `baixa cobertura de conteúdo orientado a ${id}`,
        action: `criar 2 padrões aprovados com objetivo ${id}`
      })),
      ...missingTones.slice(0, 6).map((id) => createGapItem({
        title: `Diversidade do tom emocional ${id}`,
        category: 'tom_emocional',
        type: 'missing',
        gap: `nenhum padrão aprovado encontrado com tom ${id}`,
        impact: `baixa diversidade emocional para roteiros com tom ${id}`,
        action: `criar 2 padrões aprovados com tom emocional ${id}`
      })),
      ...missingCtas.slice(0, 4).map((id) => createGapItem({
        title: `Variedade de CTA ${id}`,
        category: 'tipo_cta',
        type: 'missing',
        gap: `nenhum padrão aprovado encontrado com CTA ${id}`,
        impact: `baixa variedade de chamadas para ação usando ${id}`,
        action: `criar 2 padrões aprovados com CTA ${id}`
      })),
      ...emptyGroupStats.slice(0, 2).map(([groupName, stats]) => createGapItem({
        title: `Grupo com relatórios vazios: ${groupName}`,
        category: 'batch_group',
        type: 'low_coverage',
        gap: `${stats.empty} relatório(s) vazio(s) no grupo ${groupName}`,
        impact: `baixa densidade de conhecimento consultável no grupo ${groupName}`,
        action: `priorizar novas coletas para reduzir relatórios vazios em ${groupName}`
      }))
    ],
    lowPriority: [
      ...missingVisualStyles.slice(0, 5).map((id) => createGapItem({
        title: `Expansão do estilo visual ${id}`,
        category: 'estilo_visual',
        type: 'expansion',
        gap: `nenhum padrão aprovado encontrado com estilo visual ${id}`,
        impact: `baixa leitura visual para criativos com estilo ${id}`,
        action: `criar 1 padrão aprovado com estilo visual ${id}`
      })),
      ...missingFormats.slice(0, 5).map((id) => createGapItem({
        title: `Refinamento do formato ${id}`,
        category: 'formato_conteudo',
        type: 'expansion',
        gap: `nenhum padrão aprovado encontrado no formato ${id}`,
        impact: `baixa referência de locução para o formato ${id}`,
        action: `criar 1 padrão aprovado no formato ${id}`
      }))
    ],
    nextSeedRecommendations: buildNextSeedRecommendations({
      missingSegments,
      missingHooks,
      missingObjectives,
      missingTones,
      lowObjectives,
      lowTones,
      taxonomies
    }),
    strategicSummary: buildStrategicSummary({
      index,
      missingSegments,
      missingPainTypes,
      missingHooks,
      missingObjectives,
      missingTones,
      summaryMetrics
    })
  };
}

function renderKnowledgeGapBacklog(backlog) {
  const lines = [
    '# Semantic Knowledge Gap Backlog',
    '',
    '## Informações Gerais',
    '',
    `- Data de geração: ${backlog.generatedAt}`,
    `- Total de padrões aprovados: ${backlog.totalApprovedPatterns}`,
    `- Total de relatórios batch: ${backlog.totalBatchReports}`,
    `- Total de relatórios vazios: ${backlog.totalEmptyReports}`,
    '',
    '## Prioridade Alta',
    '',
    renderGapItems(backlog.highPriority),
    '',
    '## Prioridade Média',
    '',
    renderGapItems(backlog.mediumPriority),
    '',
    '## Prioridade Baixa',
    '',
    renderGapItems(backlog.lowPriority),
    '',
    '## Recomendações de Próximos Seeds',
    '',
    ...backlog.nextSeedRecommendations.map((item) => `- ${item}`),
    '',
    '## Resumo Estratégico',
    '',
    ...backlog.strategicSummary.map((item) => `- ${item}`),
    '',
    '> Backlog gerado deterministicamente a partir de `summary.md`, `index.json` e taxonomias oficiais.'
  ];

  return `${lines.join('\n')}\n`;
}

function renderGapItems(items) {
  if (!items.length) {
    return 'Nenhum item identificado nesta prioridade.';
  }

  return items.map((item) => [
    `### ${item.title}`,
    `- Categoria: ${item.category}`,
    `- Tipo: ${item.type}`,
    `- Gap identificado: ${item.gap}`,
    `- Impacto esperado: ${item.impact}`,
    `- Ação recomendada: ${item.action}`
  ].join('\n')).join('\n\n');
}

function buildNextSeedRecommendations(context) {
  const segments = pickTargets(context.missingSegments, context.taxonomies.segmentos, 3);
  const hooks = pickTargets(context.missingHooks, context.taxonomies.hooks, 3);
  const objectives = pickTargets(
    context.missingObjectives.length ? context.missingObjectives : context.lowObjectives,
    context.taxonomies.objetivos_comerciais,
    3
  );
  const tones = pickTargets(
    context.missingTones.length ? context.missingTones : context.lowTones,
    context.taxonomies.tons_emocionais,
    3
  );
  const recommendations = [];

  for (let index = 0; index < 3; index++) {
    recommendations.push(
      `Criar seed \`${segments[index]}\` com hook \`${hooks[index]}\`, objetivo \`${objectives[index]}\` e tom emocional \`${tones[index]}\`.`
    );
  }

  return recommendations;
}

function buildStrategicSummary(context) {
  const lines = [];

  if (context.index.total <= 5) {
    lines.push('O Cosmos possui cobertura inicial validada, mas ainda opera com baixa profundidade de padrões aprovados.');
  } else {
    lines.push('O Cosmos já possui base aprovada para leitura semântica, mas ainda deve equilibrar cobertura por categoria.');
  }

  if (context.missingSegments.length > 0) {
    lines.push('A expansão prioritária deve focar segmentos sem padrões aprovados.');
  }

  if (context.missingHooks.length > 0 || context.missingPainTypes.length > 0) {
    lines.push('A diversidade de hooks e tipos de dor ainda é o principal gargalo semântico.');
  }

  if (context.missingObjectives.length > 0 || context.missingTones.length > 0) {
    lines.push('Objetivos comerciais e tons emocionais devem ser ampliados para melhorar variedade estratégica.');
  }

  if (context.summaryMetrics.totalEmptyReports > context.summaryMetrics.reportsWithResults) {
    lines.push('Há mais relatórios vazios do que relatórios com resultados, indicando prioridade clara para coleta orientada por lacunas.');
  }

  return lines;
}

function parseSummaryMetrics(summary) {
  return {
    totalBatchReports: parseNumber(summary, /Total de .*batch encontrados:\s*(\d+)/),
    reportsWithResults: parseNumber(summary, /Relat.*com resultados:\s*(\d+)/),
    totalEmptyReports: parseNumber(summary, /Relat.*vazios:\s*(\d+)/),
    groups: parseGroupTable(summary)
  };
}

function parseNumber(text, pattern) {
  const match = text.match(pattern);
  return match ? Number(match[1]) : 0;
}

function parseGroupTable(summary) {
  const groups = {};
  const lines = summary.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^\|\s*([a-z_]+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|$/);

    if (!match || match[1] === 'Grupo') {
      continue;
    }

    groups[match[1]] = {
      total: Number(match[2]),
      withResults: Number(match[3]),
      empty: Number(match[4])
    };
  }

  return groups;
}

function loadTaxonomies(taxonomyDir) {
  const taxonomies = {};

  for (const [name, fileName] of Object.entries(TAXONOMY_FILES)) {
    const filePath = path.join(taxonomyDir, fileName);
    const items = readJson(filePath);
    taxonomies[name] = items.map((item) => item.id).filter(Boolean).sort();
  }

  return taxonomies;
}

function createGapItem({ title, category, type, gap, impact, action }) {
  return {
    title,
    category,
    type,
    gap,
    impact,
    action
  };
}

function getMissing(index, key) {
  return index.coverage && index.coverage[key] && Array.isArray(index.coverage[key].missing)
    ? index.coverage[key].missing
    : [];
}

function getMissingFromCounts(officialIds = [], counts = {}) {
  return officialIds.filter((id) => !counts[id]);
}

function getLowCoverageValues(counts = {}, threshold = 1) {
  return Object.entries(counts)
    .filter(([, value]) => value <= threshold)
    .map(([key]) => key)
    .sort();
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

function pickTargets(primary = [], fallback = [], total = 3) {
  const combined = [...primary, ...fallback];
  const unique = [...new Set(combined)].filter(Boolean);

  while (unique.length < total && fallback.length > 0) {
    unique.push(fallback[unique.length % fallback.length]);
  }

  return unique.slice(0, total);
}

function validateIndex(index) {
  if (!index || index.type !== 'padroes_locucao_index' || typeof index.total !== 'number') {
    throw new Error('Index de padroes de locucao invalido.');
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

if (require.main === module) {
  try {
    const result = buildSemanticKnowledgeGapBacklog();
    console.log(`OK semantic knowledge gap backlog: ${result.path}`);
  } catch (error) {
    console.error(`Erro: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  TAXONOMY_FILES,
  buildBacklogData,
  buildNextSeedRecommendations,
  buildSemanticKnowledgeGapBacklog,
  loadTaxonomies,
  parseSummaryMetrics,
  renderKnowledgeGapBacklog
};
