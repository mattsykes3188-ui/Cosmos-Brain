'use strict';

const fs = require('fs');
const path = require('path');

const REQUIRED_FIELDS = [
  'segmento',
  'tipo_dor',
  'hook_type',
  'estrutura_narrativa',
  'tom_emocional',
  'tipo_cta',
  'objetivo_comercial'
];

const COUNT_FIELDS = {
  segmento: 'por_segmento',
  tipo_dor: 'por_tipo_dor',
  hook_type: 'por_hook_type',
  estrutura_narrativa: 'por_estrutura_narrativa',
  tom_emocional: 'por_tom_emocional',
  tipo_cta: 'por_tipo_cta',
  objetivo_comercial: 'por_objetivo_comercial'
};

function buildPadroesLocucaoIndex(options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const patternsDir = options.patternsDir || path.join(rootDir, 'data', 'biblioteca_anuncios', 'padroes_locucao');
  const outputPath = options.outputPath || path.join(patternsDir, 'index.json');
  const taxonomyDir = options.taxonomyDir || path.join(rootDir, 'data', 'taxonomia');

  fs.mkdirSync(patternsDir, { recursive: true });

  const taxonomy = {
    segmentos: loadTaxonomyIds(taxonomyDir, 'segmentos.json'),
    tipos_dor: loadTaxonomyIds(taxonomyDir, 'tipos_dor.json'),
    hooks: loadTaxonomyIds(taxonomyDir, 'tipos_hook.json')
  };
  const errors = [];
  const items = [];
  const counts = createEmptyCounts();

  for (const filename of listPatternJsonFiles(patternsDir)) {
    const filePath = path.join(patternsDir, filename);
    let payload;

    try {
      payload = JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
    } catch (error) {
      errors.push(`${filename}: JSON invalido: ${error.message}`);
      continue;
    }

    if (payload.type !== 'padrao_locucao' || payload.status !== 'approved') {
      continue;
    }

    const missingFields = REQUIRED_FIELDS.filter((field) => !isNonEmptyString(payload[field]));
    if (missingFields.length > 0) {
      errors.push(`${filename}: campos obrigatorios ausentes: ${missingFields.join(', ')}`);
      continue;
    }

    const item = {
      filename,
      titulo: payload.titulo || '',
      segmento: payload.segmento,
      tipo_dor: payload.tipo_dor,
      hook_type: payload.hook_type,
      estrutura_narrativa: payload.estrutura_narrativa,
      tom_emocional: payload.tom_emocional,
      tipo_cta: payload.tipo_cta,
      objetivo_comercial: payload.objetivo_comercial,
      approvedAt: payload.approvedAt || '',
      sourceFilename: payload.source && payload.source.filename ? payload.source.filename : ''
    };

    items.push(item);

    for (const [field, countKey] of Object.entries(COUNT_FIELDS)) {
      incrementCount(counts[countKey], item[field]);
    }
  }

  if (errors.length > 0) {
    const error = new Error(`Falha ao gerar indice de padroes de locucao:\n${errors.join('\n')}`);
    error.errors = errors;
    throw error;
  }

  items.sort((a, b) => a.filename.localeCompare(b.filename));

  const index = {
    type: 'padroes_locucao_index',
    generatedAt: new Date().toISOString(),
    total: items.length,
    counts,
    coverage: {
      segmentos: buildCoverage(items.map((item) => item.segmento), taxonomy.segmentos),
      tipos_dor: buildCoverage(items.map((item) => item.tipo_dor), taxonomy.tipos_dor),
      hooks: buildCoverage(items.map((item) => item.hook_type), taxonomy.hooks)
    },
    items
  };

  fs.writeFileSync(outputPath, JSON.stringify(index, null, 2), 'utf8');

  return {
    success: true,
    path: outputPath,
    index
  };
}

function listPatternJsonFiles(patternsDir) {
  if (!fs.existsSync(patternsDir)) {
    return [];
  }

  return fs.readdirSync(patternsDir)
    .filter((filename) => filename.endsWith('.json') && filename !== 'index.json')
    .sort();
}

function loadTaxonomyIds(taxonomyDir, filename) {
  const filePath = path.join(taxonomyDir, filename);
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));

  if (!Array.isArray(parsed)) {
    throw new Error(`Taxonomia invalida: ${filename}`);
  }

  return parsed.map((item) => item.id).filter(isNonEmptyString).sort();
}

function createEmptyCounts() {
  return {
    por_segmento: {},
    por_tipo_dor: {},
    por_hook_type: {},
    por_estrutura_narrativa: {},
    por_tom_emocional: {},
    por_tipo_cta: {},
    por_objetivo_comercial: {}
  };
}

function incrementCount(target, key) {
  target[key] = (target[key] || 0) + 1;
}

function buildCoverage(values, officialIds) {
  const covered = [...new Set(values)].filter(Boolean).sort();
  const coveredSet = new Set(covered);

  return {
    covered,
    missing: officialIds.filter((id) => !coveredSet.has(id))
  };
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

if (require.main === module) {
  try {
    const result = buildPadroesLocucaoIndex();
    console.log(`OK padroes_locucao_index: ${result.index.total} approved pattern(s) indexed.`);
    console.log(`Index: ${path.relative(path.join(__dirname, '..'), result.path).replace(/\\/g, '/')}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  REQUIRED_FIELDS,
  buildCoverage,
  buildPadroesLocucaoIndex,
  createEmptyCounts,
  listPatternJsonFiles
};
