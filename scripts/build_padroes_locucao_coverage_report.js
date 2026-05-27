'use strict';

const fs = require('fs');
const path = require('path');

const { buildPadroesLocucaoIndex } = require('./build_padroes_locucao_index');

function buildPadroesLocucaoCoverageReport(options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const indexPath = options.indexPath || path.join(rootDir, 'data', 'biblioteca_anuncios', 'padroes_locucao', 'index.json');
  const reportPath = options.reportPath || path.join(rootDir, 'reports', 'padroes_locucao_coverage_report.md');

  ensureIndex(rootDir, indexPath);

  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8').replace(/^\uFEFF/, ''));
  validateIndex(index);

  const report = renderCoverageReport(index);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report, 'utf8');

  return {
    success: true,
    path: reportPath,
    report
  };
}

function ensureIndex(rootDir, indexPath) {
  if (fs.existsSync(indexPath)) {
    return;
  }

  buildPadroesLocucaoIndex({ rootDir });
}

function validateIndex(index) {
  if (!index || typeof index !== 'object' || Array.isArray(index)) {
    throw new Error('Index de padroes de locucao deve ser um objeto.');
  }

  if (index.type !== 'padroes_locucao_index') {
    throw new Error('Index invalido: type deve ser padroes_locucao_index.');
  }

  if (typeof index.total !== 'number') {
    throw new Error('Index invalido: total deve ser numero.');
  }
}

function renderCoverageReport(index) {
  const generatedAt = new Date().toISOString();
  const lines = [
    '# Relatorio de Cobertura - Padroes de Locucao',
    '',
    `- Data de geracao: ${generatedAt}`,
    `- Total de padroes aprovados: ${index.total}`,
    '',
    '## Resumo executivo',
    ''
  ];

  if (index.total === 0) {
    lines.push('Ainda nao ha padroes de locucao aprovados no Brain.');
    lines.push('Todas as categorias monitoradas seguem sem cobertura ate que os primeiros drafts sejam promovidos.');
  } else {
    lines.push(`O Brain possui ${index.total} padrao(oes) de locucao aprovado(s).`);
    lines.push('As secoes abaixo mostram os grupos mais cobertos e as lacunas que ainda precisam de coleta de inteligencia.');
  }

  lines.push('');
  lines.push('## Cobertura principal');
  lines.push('');
  lines.push(renderTopSection('Top segmentos cobertos', index.counts.por_segmento));
  lines.push(renderTopSection('Top tipos de dor cobertos', index.counts.por_tipo_dor));
  lines.push(renderTopSection('Top hooks cobertos', index.counts.por_hook_type));
  lines.push(renderTopSection('Top estruturas narrativas', index.counts.por_estrutura_narrativa));
  lines.push(renderTopSection('Top tons emocionais', index.counts.por_tom_emocional));
  lines.push(renderTopSection('Top CTAs', index.counts.por_tipo_cta));
  lines.push(renderTopSection('Top objetivos comerciais', index.counts.por_objetivo_comercial));
  lines.push('');
  lines.push('## Lacunas');
  lines.push('');
  lines.push(renderListSection('Segmentos sem padroes', index.coverage.segmentos.missing));
  lines.push(renderListSection('Tipos de dor sem padroes', index.coverage.tipos_dor.missing));
  lines.push(renderListSection('Hooks sem padroes', index.coverage.hooks.missing));
  lines.push('');
  lines.push('## Cobertos');
  lines.push('');
  lines.push(renderListSection('Segmentos cobertos', index.coverage.segmentos.covered));
  lines.push(renderListSection('Tipos de dor cobertos', index.coverage.tipos_dor.covered));
  lines.push(renderListSection('Hooks cobertos', index.coverage.hooks.covered));
  lines.push('');
  lines.push('> Relatorio gerado automaticamente a partir de `data/biblioteca_anuncios/padroes_locucao/index.json`.');

  return `${lines.join('\n')}\n`;
}

function renderTopSection(title, counts = {}) {
  const entries = Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10);

  if (entries.length === 0) {
    return `### ${title}\n\nNenhum item coberto ainda.\n`;
  }

  return [
    `### ${title}`,
    '',
    ...entries.map(([key, value]) => `- ${key}: ${value}`),
    ''
  ].join('\n');
}

function renderListSection(title, values = []) {
  if (!Array.isArray(values) || values.length === 0) {
    return `### ${title}\n\nNenhum item listado.\n`;
  }

  return [
    `### ${title}`,
    '',
    ...values.map((value) => `- ${value}`),
    ''
  ].join('\n');
}

if (require.main === module) {
  try {
    const result = buildPadroesLocucaoCoverageReport();
    console.log(`OK coverage report: ${path.relative(path.join(__dirname, '..'), result.path).replace(/\\/g, '/')}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  buildPadroesLocucaoCoverageReport,
  renderCoverageReport,
  renderListSection,
  renderTopSection
};
