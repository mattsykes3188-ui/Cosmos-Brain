'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_GROUPS = [
  'segmentos',
  'tons_emocionais',
  'objetivos_comerciais',
  'tipos_dor',
  'hooks'
];

function buildSemanticQueryBatchSummary(options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const batchDir = options.batchDir || path.join(rootDir, 'reports', 'semantic_queries', 'batch');
  const indexPath = options.indexPath || path.join(rootDir, 'data', 'biblioteca_anuncios', 'padroes_locucao', 'index.json');
  const outputPath = options.outputPath || path.join(batchDir, 'summary.md');

  if (!fs.existsSync(indexPath)) {
    throw new Error('Index de padroes de locucao nao encontrado. Rode: node scripts/build_padroes_locucao_index.js');
  }

  const index = readJson(indexPath);
  validateApprovedIndex(index);

  const reportFiles = listBatchMarkdownReports(batchDir);
  const analysis = analyzeBatchReports(reportFiles, { rootDir, batchDir });
  const summary = renderBatchSummary({
    analysis,
    index,
    generatedAt: new Date().toISOString()
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, summary, 'utf8');

  return {
    success: true,
    path: path.relative(rootDir, outputPath).replace(/\\/g, '/'),
    analysis,
    summary
  };
}

function listBatchMarkdownReports(batchDir) {
  if (!fs.existsSync(batchDir)) {
    return [];
  }

  const files = [];
  walk(batchDir, files);

  return files
    .filter((filePath) => {
      const filename = path.basename(filePath);
      return filename.endsWith('.md') && filename !== 'index.md' && filename !== 'summary.md';
    })
    .sort();
}

function analyzeBatchReports(reportFiles, options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const batchDir = options.batchDir || path.join(rootDir, 'reports', 'semantic_queries', 'batch');
  const groupStats = createInitialGroupStats();
  const reports = [];

  for (const filePath of reportFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const totalFound = parseTotalFound(content);
    const groupName = getGroupNameFromPath(filePath, batchDir);
    const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');

    if (!groupStats[groupName]) {
      groupStats[groupName] = {
        total: 0,
        withResults: 0,
        empty: 0
      };
    }

    groupStats[groupName].total++;

    if (totalFound > 0) {
      groupStats[groupName].withResults++;
    } else {
      groupStats[groupName].empty++;
    }

    reports.push({
      path: relativePath,
      groupName,
      totalFound
    });
  }

  return {
    totalReports: reports.length,
    reportsWithResults: reports.filter((report) => report.totalFound > 0).length,
    emptyReports: reports.filter((report) => report.totalFound === 0).length,
    groupStats,
    reports
  };
}

function renderBatchSummary({ analysis, index, generatedAt }) {
  const lines = [
    '# Resumo Executivo — Semantic Query Batch Reports',
    '',
    '## Informações Gerais',
    '',
    `- Data de geração: ${generatedAt}`,
    `- Total de relatórios batch encontrados: ${analysis.totalReports}`,
    `- Total de padrões aprovados no índice: ${index.total}`,
    '',
    '## Cobertura Geral',
    '',
    `- Relatórios com resultados: ${analysis.reportsWithResults}`,
    `- Relatórios vazios: ${analysis.emptyReports}`,
    '',
    '## Cobertura por Grupo',
    '',
    '| Grupo | Total de relatórios | Com resultados | Vazios |',
    '| --- | ---: | ---: | ---: |'
  ];

  for (const groupName of DEFAULT_GROUPS) {
    const stats = analysis.groupStats[groupName] || { total: 0, withResults: 0, empty: 0 };
    lines.push(`| ${groupName} | ${stats.total} | ${stats.withResults} | ${stats.empty} |`);
  }

  lines.push('');
  lines.push('## Segmentos Mais Cobertos');
  lines.push('');
  lines.push(renderCountsList(index.counts && index.counts.por_segmento));
  lines.push('');
  lines.push('## Tipos de Dor Mais Cobertos');
  lines.push('');
  lines.push(renderCountsList(index.counts && index.counts.por_tipo_dor));
  lines.push('');
  lines.push('## Hooks Mais Cobertos');
  lines.push('');
  lines.push(renderCountsList(index.counts && index.counts.por_hook_type));
  lines.push('');
  lines.push('## Principais Lacunas');
  lines.push('');
  lines.push('### Segmentos sem cobertura');
  lines.push('');
  lines.push(renderValuesList(index.coverage && index.coverage.segmentos && index.coverage.segmentos.missing));
  lines.push('');
  lines.push('### Tipos de dor sem cobertura');
  lines.push('');
  lines.push(renderValuesList(index.coverage && index.coverage.tipos_dor && index.coverage.tipos_dor.missing));
  lines.push('');
  lines.push('### Hooks sem cobertura');
  lines.push('');
  lines.push(renderValuesList(index.coverage && index.coverage.hooks && index.coverage.hooks.missing));
  lines.push('');
  lines.push('## Recomendações Estratégicas');
  lines.push('');
  lines.push(...buildDeterministicRecommendations(index, analysis).map((item) => `- ${item}`));
  lines.push('');
  lines.push('> Resumo gerado automaticamente a partir dos batch reports e de `data/biblioteca_anuncios/padroes_locucao/index.json`.');

  return `${lines.join('\n')}\n`;
}

function buildDeterministicRecommendations(index, analysis) {
  const recommendations = [];
  const missingSegments = getMissing(index, 'segmentos');
  const missingHooks = getMissing(index, 'hooks');
  const missingPainTypes = getMissing(index, 'tipos_dor');
  const lowSegments = getLowCoverageValues(index.counts && index.counts.por_segmento, 1);

  if (index.total === 0) {
    recommendations.push('Promover os primeiros padrões aprovados antes de priorizar análises por grupo.');
  }

  if (missingSegments.length > 0) {
    recommendations.push(`Expandir coleta para segmentos ainda sem cobertura: ${missingSegments.join(', ')}.`);
  }

  if (missingPainTypes.length > 0) {
    recommendations.push(`Criar padrões para tipos de dor ainda sem cobertura: ${missingPainTypes.slice(0, 8).join(', ')}.`);
  }

  if (missingHooks.length > 0) {
    recommendations.push(`Coletar padrões usando hooks ainda ausentes: ${missingHooks.join(', ')}.`);
  }

  if (analysis.emptyReports > analysis.reportsWithResults) {
    recommendations.push('Priorizar categorias com relatórios vazios antes de expandir categorias já cobertas.');
  }

  if (lowSegments.length > 0) {
    recommendations.push(`Aumentar profundidade em segmentos com apenas 1 padrão aprovado: ${lowSegments.join(', ')}.`);
  }

  if (recommendations.length === 0) {
    recommendations.push('Manter rotina de revisão e promoção para preservar cobertura equilibrada.');
  }

  return recommendations;
}

function renderCountsList(counts = {}) {
  const entries = Object.entries(counts || {})
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  if (entries.length === 0) {
    return 'Nenhum item coberto ainda.';
  }

  return entries.map(([key, value]) => `- ${key}: ${value}`).join('\n');
}

function renderValuesList(values = []) {
  if (!Array.isArray(values) || values.length === 0) {
    return 'Nenhuma lacuna listada.';
  }

  return values.map((value) => `- ${value}`).join('\n');
}

function getMissing(index, key) {
  return index.coverage && index.coverage[key] && Array.isArray(index.coverage[key].missing)
    ? index.coverage[key].missing
    : [];
}

function getLowCoverageValues(counts = {}, threshold = 1) {
  return Object.entries(counts || {})
    .filter(([, value]) => value <= threshold)
    .map(([key]) => key)
    .sort();
}

function createInitialGroupStats() {
  const stats = {};

  for (const groupName of DEFAULT_GROUPS) {
    stats[groupName] = {
      total: 0,
      withResults: 0,
      empty: 0
    };
  }

  return stats;
}

function getGroupNameFromPath(filePath, batchDir) {
  const relativeParts = path.relative(batchDir, filePath).split(path.sep);
  return relativeParts.length > 1 ? relativeParts[0] : 'sem_grupo';
}

function parseTotalFound(content) {
  const match = content.match(/Total encontrado:\s*(\d+)/);
  return match ? Number(match[1]) : 0;
}

function validateApprovedIndex(index) {
  if (!index || index.type !== 'padroes_locucao_index' || typeof index.total !== 'number') {
    throw new Error('Index de padroes de locucao invalido.');
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
}

if (require.main === module) {
  try {
    const result = buildSemanticQueryBatchSummary();
    console.log(`OK semantic query batch summary: ${result.path}`);
  } catch (error) {
    console.error(`Erro: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  DEFAULT_GROUPS,
  analyzeBatchReports,
  buildDeterministicRecommendations,
  buildSemanticQueryBatchSummary,
  listBatchMarkdownReports,
  parseTotalFound,
  renderBatchSummary
};
