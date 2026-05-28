'use strict';

const fs = require('fs');
const path = require('path');

const FILTER_TAXONOMY_FILES = {
  segmento: 'segmentos.json',
  tipo_dor: 'tipos_dor.json',
  hook_type: 'tipos_hook.json',
  estrutura_narrativa: 'estruturas_narrativas.json',
  tom_emocional: 'tons_emocionais.json',
  tipo_cta: 'tipos_cta.json',
  objetivo_comercial: 'objetivos_comerciais.json',
  formato_conteudo: 'formatos_conteudo.json',
  estilo_visual: 'estilos_visuais.json'
};

const BATCH_REPORT_GROUPS = {
  segmentos: {
    field: 'segmento',
    taxonomyFile: 'segmentos.json'
  },
  tons_emocionais: {
    field: 'tom_emocional',
    taxonomyFile: 'tons_emocionais.json'
  },
  objetivos_comerciais: {
    field: 'objetivo_comercial',
    taxonomyFile: 'objetivos_comerciais.json'
  },
  tipos_dor: {
    field: 'tipo_dor',
    taxonomyFile: 'tipos_dor.json'
  },
  hooks: {
    field: 'hook_type',
    taxonomyFile: 'tipos_hook.json'
  }
};

const RESULT_FIELDS = [
  'filename',
  'titulo',
  'segmento',
  'tipo_dor',
  'hook_type',
  'estrutura_narrativa',
  'tom_emocional',
  'tipo_cta',
  'objetivo_comercial',
  'formato_conteudo',
  'estilo_visual',
  'sourceFilename'
];

function loadApprovedPatternIndex(options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const indexPath = options.indexPath || path.join(
    rootDir,
    'data',
    'biblioteca_anuncios',
    'padroes_locucao',
    'index.json'
  );

  if (!fs.existsSync(indexPath)) {
    throw new Error(
      'Index de padroes de locucao nao encontrado. Rode: node scripts/build_padroes_locucao_index.js'
    );
  }

  const index = readJson(indexPath);

  if (!index || index.type !== 'padroes_locucao_index' || !Array.isArray(index.items)) {
    throw new Error('Index de padroes de locucao invalido ou corrompido.');
  }

  return {
    index,
    indexPath
  };
}

function getAllowedSemanticFilters() {
  return Object.keys(FILTER_TAXONOMY_FILES);
}

function validateSemanticFilter(field, value, options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const allowedFilters = getAllowedSemanticFilters();

  if (!allowedFilters.includes(field)) {
    return {
      success: false,
      field,
      value,
      message: `Filtro desconhecido: ${field}. Filtros permitidos: ${allowedFilters.join(', ')}`
    };
  }

  if (!isSafeTaxonomyValue(value)) {
    return {
      success: false,
      field,
      value,
      message: `Valor invalido para ${field}: ${value}`
    };
  }

  const taxonomyIds = loadTaxonomyIds(rootDir, FILTER_TAXONOMY_FILES[field]);

  if (!taxonomyIds.has(value)) {
    return {
      success: false,
      field,
      value,
      message: `Valor nao encontrado na taxonomia oficial para ${field}: ${value}`
    };
  }

  return {
    success: true,
    field,
    value
  };
}

function queryApprovedPatterns(filters = {}, options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const normalizedFilters = normalizeFilters(filters);

  for (const [field, value] of Object.entries(normalizedFilters)) {
    const validation = validateSemanticFilter(field, value, { rootDir });
    if (!validation.success) {
      throw new Error(validation.message);
    }
  }

  const { index, indexPath } = loadApprovedPatternIndex({
    rootDir,
    indexPath: options.indexPath
  });

  const items = index.items
    .filter((item) => matchesFilters(item, normalizedFilters))
    .map(pickResultFields);

  return {
    success: true,
    total: items.length,
    filters: normalizedFilters,
    items,
    source: path.relative(rootDir, indexPath).replace(/\\/g, '/'),
    indexGeneratedAt: index.generatedAt || null
  };
}

function formatQueryResult(result) {
  return {
    success: Boolean(result && result.success),
    total: result && typeof result.total === 'number' ? result.total : 0,
    filters: result && result.filters ? result.filters : {},
    items: Array.isArray(result && result.items) ? result.items.map(pickResultFields) : [],
    source: result && result.source ? result.source : '',
    indexGeneratedAt: result && result.indexGeneratedAt ? result.indexGeneratedAt : null
  };
}

function buildSemanticQueryReport(filters = {}, queryResult = {}) {
  const result = formatQueryResult({
    ...queryResult,
    filters: queryResult.filters || filters
  });
  const appliedFilters = normalizeFilters(filters);
  const generatedAt = new Date().toISOString();
  const lines = [
    '# Relatório de Consulta Semântica — Padrões de Locução',
    '',
    '## Filtros aplicados',
    ''
  ];

  const filterEntries = Object.entries(appliedFilters);

  if (filterEntries.length === 0) {
    lines.push('- nenhum filtro aplicado');
  } else {
    for (const [field, value] of filterEntries) {
      lines.push(`- ${field}: ${value}`);
    }
  }

  lines.push('');
  lines.push('## Resumo');
  lines.push('');
  lines.push(`- Total encontrado: ${result.total}`);
  lines.push(`- Data de geração: ${generatedAt}`);
  lines.push('');
  lines.push('## Resultados');
  lines.push('');

  if (result.total === 0) {
    lines.push('Nenhum padrão encontrado para os filtros aplicados.');
    return `${lines.join('\n')}\n`;
  }

  for (const item of result.items) {
    lines.push(`### ${item.titulo || item.filename || 'Padrao sem titulo'}`);
    lines.push(`- Arquivo: ${item.filename || ''}`);
    lines.push(`- Segmento: ${item.segmento || ''}`);
    lines.push(`- Tipo de dor: ${item.tipo_dor || ''}`);
    lines.push(`- Hook: ${item.hook_type || ''}`);
    lines.push(`- Estrutura narrativa: ${item.estrutura_narrativa || ''}`);
    lines.push(`- Tom emocional: ${item.tom_emocional || ''}`);
    lines.push(`- CTA: ${item.tipo_cta || ''}`);
    lines.push(`- Objetivo comercial: ${item.objetivo_comercial || ''}`);
    lines.push(`- Formato: ${item.formato_conteudo || ''}`);
    lines.push(`- Estilo visual: ${item.estilo_visual || ''}`);
    lines.push(`- Source: ${item.sourceFilename || result.source || ''}`);
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function generateSemanticQueryReportFilename(filters = {}) {
  const normalizedFilters = normalizeFilters(filters);
  const entries = Object.entries(normalizedFilters).sort(([fieldA], [fieldB]) => fieldA.localeCompare(fieldB));

  for (const [field, value] of entries) {
    if (!getAllowedSemanticFilters().includes(field)) {
      throw new Error(`Filtro desconhecido: ${field}`);
    }

    if (!isSafeTaxonomyValue(value)) {
      throw new Error(`Valor inseguro para relatorio: ${field}=${value}`);
    }
  }

  if (entries.length === 0) {
    return 'semantic_query_all.md';
  }

  const suffix = entries.map(([field, value]) => `${field}_${value}`).join('__');
  return `semantic_query_${suffix}.md`;
}

function saveSemanticQueryReport(filters = {}, queryResult = {}, options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const reportDir = options.reportDir || path.join(rootDir, 'reports', 'semantic_queries');
  const filename = generateSemanticQueryReportFilename(filters);
  const reportPath = path.join(reportDir, filename);
  const resolvedReportDir = path.resolve(reportDir);
  const resolvedReportPath = path.resolve(reportPath);

  if (!resolvedReportPath.startsWith(`${resolvedReportDir}${path.sep}`)) {
    throw new Error('Caminho de relatorio invalido.');
  }

  fs.mkdirSync(resolvedReportDir, { recursive: true });
  fs.writeFileSync(resolvedReportPath, buildSemanticQueryReport(filters, queryResult), 'utf8');

  return {
    success: true,
    filename,
    path: path.relative(rootDir, resolvedReportPath).replace(/\\/g, '/')
  };
}

function getBatchReportGroups() {
  return Object.keys(BATCH_REPORT_GROUPS);
}

function buildBatchSemanticQueryReports(groupName, options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const group = getBatchGroupConfig(groupName);
  const taxonomyIds = [...loadTaxonomyIds(rootDir, group.taxonomyFile)];

  return taxonomyIds.map((value) => {
    const filters = {
      [group.field]: value
    };
    const queryResult = queryApprovedPatterns(filters, { rootDir });
    const filename = generateSemanticQueryReportFilename(filters);

    return {
      groupName,
      field: group.field,
      value,
      filename,
      total: queryResult.total,
      filters,
      queryResult,
      report: buildSemanticQueryReport(filters, queryResult)
    };
  });
}

function saveBatchSemanticQueryReports(groupName, options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const reports = buildBatchSemanticQueryReports(groupName, { rootDir });
  const reportDir = options.reportDir || path.join(rootDir, 'reports', 'semantic_queries', 'batch', groupName);
  const resolvedReportDir = path.resolve(reportDir);
  const savedReports = [];

  fs.mkdirSync(resolvedReportDir, { recursive: true });

  for (const item of reports) {
    const reportPath = path.join(resolvedReportDir, item.filename);
    const resolvedReportPath = path.resolve(reportPath);

    if (!resolvedReportPath.startsWith(`${resolvedReportDir}${path.sep}`)) {
      throw new Error('Caminho de relatorio em lote invalido.');
    }

    fs.writeFileSync(resolvedReportPath, item.report, 'utf8');
    savedReports.push({
      groupName: item.groupName,
      field: item.field,
      value: item.value,
      total: item.total,
      filename: item.filename,
      path: path.relative(rootDir, resolvedReportPath).replace(/\\/g, '/')
    });
  }

  return {
    success: true,
    groupName,
    total: savedReports.length,
    reports: savedReports
  };
}

function getBatchGroupConfig(groupName) {
  if (!Object.prototype.hasOwnProperty.call(BATCH_REPORT_GROUPS, groupName)) {
    throw new Error(`Grupo invalido: ${groupName}. Grupos permitidos: ${getBatchReportGroups().join(', ')}`);
  }

  return BATCH_REPORT_GROUPS[groupName];
}

function normalizeFilters(filters) {
  const normalized = {};

  for (const [field, value] of Object.entries(filters || {})) {
    if (typeof value === 'undefined' || value === null || value === '') {
      continue;
    }

    normalized[field] = String(value).trim();
  }

  return normalized;
}

function matchesFilters(item, filters) {
  return Object.entries(filters).every(([field, value]) => item[field] === value);
}

function pickResultFields(item) {
  const picked = {};

  for (const field of RESULT_FIELDS) {
    picked[field] = item && typeof item[field] !== 'undefined' ? item[field] : '';
  }

  return picked;
}

function loadTaxonomyIds(rootDir, fileName) {
  const taxonomyPath = path.join(rootDir, 'data', 'taxonomia', fileName);

  if (!fs.existsSync(taxonomyPath)) {
    throw new Error(`Taxonomia nao encontrada: ${fileName}`);
  }

  const items = readJson(taxonomyPath);

  if (!Array.isArray(items)) {
    throw new Error(`Taxonomia invalida: ${fileName}`);
  }

  return new Set(items.map((item) => item.id).filter(isSafeTaxonomyValue));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function isSafeTaxonomyValue(value) {
  return typeof value === 'string' && /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(value);
}

module.exports = {
  BATCH_REPORT_GROUPS,
  FILTER_TAXONOMY_FILES,
  RESULT_FIELDS,
  buildSemanticQueryReport,
  buildBatchSemanticQueryReports,
  formatQueryResult,
  generateSemanticQueryReportFilename,
  getBatchReportGroups,
  getAllowedSemanticFilters,
  loadApprovedPatternIndex,
  queryApprovedPatterns,
  saveBatchSemanticQueryReports,
  saveSemanticQueryReport,
  validateSemanticFilter
};
