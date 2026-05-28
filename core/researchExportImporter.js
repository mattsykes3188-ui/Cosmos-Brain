'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const RESEARCH_TYPES = {
  market_signal: 'market_signals',
  creative_reference: 'creative_references',
  visual_pattern: 'visual_patterns',
  profile_analysis: 'profile_analysis',
  padrao_locucao: 'locution_patterns',
  positioning_pattern: 'creative_references',
  campaign_reference: 'campaign_references'
};

const VALID_RESEARCH_STATUSES = new Set(['draft', 'approved']);
const TAXONOMY_FIELD_FILES = {
  segmento: 'segmentos.json',
  objetivo_comercial: 'objetivos_comerciais.json',
  hook_type: 'tipos_hook.json',
  estrutura_narrativa: 'estruturas_narrativas.json',
  narrativa: 'estruturas_narrativas.json',
  tom_emocional: 'tons_emocionais.json',
  tipo_cta: 'tipos_cta.json',
  estilo_visual: 'estilos_visuais.json',
  formato_conteudo: 'formatos_conteudo.json'
};

function loadResearchExports(options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const exportsDir = getPaths(rootDir).exportsDir;
  ensureResearchDirectories(rootDir);

  return fs.readdirSync(exportsDir)
    .filter((filename) => filename.endsWith('.json'))
    .sort()
    .map((filename) => ({
      filename,
      path: path.join(exportsDir, filename)
    }));
}

function validateResearchExport(exportData, options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const errors = [];

  if (!exportData || typeof exportData !== 'object' || Array.isArray(exportData)) {
    return {
      valid: false,
      errors: ['Research export deve ser um objeto JSON.']
    };
  }

  if (!exportData.type || !RESEARCH_TYPES[exportData.type]) {
    errors.push(`Type invalido ou ausente: ${exportData.type || ''}`);
  }

  if (!VALID_RESEARCH_STATUSES.has(exportData.status)) {
    errors.push(`Status invalido ou ausente: ${exportData.status || ''}`);
  }

  const title = exportData.title || exportData.titulo;
  if (!isNonEmptyString(title)) {
    errors.push('Titulo ausente. Use title ou titulo.');
  }

  const insight = exportData.insight || exportData.text || exportData.summary || exportData.observacoes;
  if (!isNonEmptyString(insight)) {
    errors.push('Insight ausente. Use insight, text, summary ou observacoes.');
  }

  if (!exportData.source) {
    errors.push('Source ausente.');
  }

  for (const [field, taxonomyFile] of Object.entries(TAXONOMY_FIELD_FILES)) {
    if (exportData[field] === undefined || exportData[field] === null || exportData[field] === '') {
      continue;
    }

    if (!isValidTaxonomyValue(rootDir, taxonomyFile, exportData[field])) {
      errors.push(`Valor invalido para ${field}: ${exportData[field]}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function normalizeResearchExport(exportData, options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const validation = validateResearchExport(exportData, { rootDir });

  if (!validation.valid) {
    return {
      valid: false,
      errors: validation.errors,
      item: null
    };
  }

  const title = cleanString(exportData.title || exportData.titulo);
  const insight = cleanString(exportData.insight || exportData.text || exportData.summary || exportData.observacoes);
  const source = normalizeSource(exportData.source);
  const normalized = {
    id: exportData.id ? cleanString(exportData.id) : '',
    type: cleanString(exportData.type),
    status: cleanString(exportData.status),
    title,
    insight,
    source,
    segmento: cleanString(exportData.segmento),
    objetivo_comercial: cleanString(exportData.objetivo_comercial),
    hook_type: cleanString(exportData.hook_type),
    estrutura_narrativa: cleanString(exportData.estrutura_narrativa || exportData.narrativa),
    tom_emocional: cleanString(exportData.tom_emocional),
    tipo_cta: cleanString(exportData.tipo_cta),
    estilo_visual: cleanString(exportData.estilo_visual),
    formato_conteudo: cleanString(exportData.formato_conteudo),
    tags: normalizeArray(exportData.tags),
    created_at: normalizeDate(exportData.created_at || exportData.createdAt),
    imported_at: new Date().toISOString()
  };

  normalized.fingerprint = createResearchFingerprint(normalized);
  normalized.id = normalized.id || generateResearchImportId(normalized);

  return {
    valid: true,
    errors: [],
    item: removeEmptyFields(normalized)
  };
}

function generateResearchImportId(item) {
  const date = normalizeDate(item.created_at).slice(0, 10).replace(/-/g, '');
  const type = slugify(item.type || 'research');
  const hash = createHash([
    item.type,
    item.status,
    sourceKey(item.source),
    item.title,
    item.insight,
    item.segmento
  ].join('|')).slice(0, 8);

  return `research_${type}_${date}_${hash}`;
}

function detectDuplicateResearchExport(item, options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const libraryDir = getPaths(rootDir).libraryDir;

  if (!item || !item.fingerprint || !fs.existsSync(libraryDir)) {
    return {
      duplicate: false,
      match: null
    };
  }

  for (const filePath of listJsonFiles(libraryDir)) {
    try {
      const existing = readJson(filePath);
      if (existing && existing.fingerprint === item.fingerprint) {
        return {
          duplicate: true,
          match: {
            id: existing.id,
            path: toSlash(path.relative(rootDir, filePath))
          }
        };
      }
    } catch (_) {
      continue;
    }
  }

  return {
    duplicate: false,
    match: null
  };
}

function importResearchExport(exportFile, options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const paths = getPaths(rootDir);
  ensureResearchDirectories(rootDir);

  const stagedPath = stageResearchExport(exportFile, { rootDir });
  let exportData;

  try {
    exportData = readJson(stagedPath);
  } catch (error) {
    return moveRejectedResearchExport(stagedPath, [`JSON invalido: ${error.message}`], { rootDir });
  }

  const normalized = normalizeResearchExport(exportData, { rootDir });

  if (!normalized.valid) {
    return moveRejectedResearchExport(stagedPath, normalized.errors, { rootDir });
  }

  const duplicate = detectDuplicateResearchExport(normalized.item, { rootDir });
  if (duplicate.duplicate) {
    return moveRejectedResearchExport(stagedPath, [`Duplicado de ${duplicate.match.path}`], {
      rootDir,
      duplicate: true,
      duplicateMatch: duplicate.match
    });
  }

  const targetFolder = RESEARCH_TYPES[normalized.item.type];
  const libraryDir = path.join(paths.libraryDir, targetFolder, normalized.item.status);
  const libraryFilename = `${normalized.item.id}.json`;
  const libraryPath = path.join(libraryDir, libraryFilename);
  const importedPath = path.join(paths.importedDir, path.basename(stagedPath));

  fs.mkdirSync(libraryDir, { recursive: true });
  fs.writeFileSync(libraryPath, JSON.stringify(normalized.item, null, 2), 'utf8');
  moveFileSafe(stagedPath, importedPath);

  return {
    success: true,
    imported: true,
    rejected: false,
    duplicate: false,
    id: normalized.item.id,
    type: normalized.item.type,
    status: normalized.item.status,
    sourcePath: toSlash(path.relative(rootDir, importedPath)),
    libraryPath: toSlash(path.relative(rootDir, libraryPath)),
    errors: []
  };
}

function moveRejectedResearchExport(filePath, errors, options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const rejectedDir = getPaths(rootDir).rejectedDir;
  const targetPath = path.join(rejectedDir, path.basename(filePath));

  fs.mkdirSync(rejectedDir, { recursive: true });
  moveFileSafe(filePath, targetPath);

  return {
    success: false,
    imported: false,
    rejected: true,
    duplicate: Boolean(options.duplicate),
    duplicateMatch: options.duplicateMatch || null,
    sourcePath: toSlash(path.relative(rootDir, targetPath)),
    libraryPath: null,
    errors: errors || ['Research export rejeitado.']
  };
}

function buildResearchIndexes(options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const paths = getPaths(rootDir);
  ensureResearchDirectories(rootDir);

  const allItems = listJsonFiles(paths.libraryDir)
    .map((filePath) => {
      try {
        return {
          ...readJson(filePath),
          path: toSlash(path.relative(rootDir, filePath))
        };
      } catch (_) {
        return null;
      }
    })
    .filter(Boolean);
  const approvedItems = allItems.filter((item) => item.status === 'approved');
  const draftItems = allItems.filter((item) => item.status === 'draft');
  const index = {
    type: 'research_library_index',
    generatedAt: new Date().toISOString(),
    total: approvedItems.length,
    approved: approvedItems.length,
    drafts: draftItems.length,
    counts: {
      by_type: countBy(approvedItems, 'type'),
      by_segmento: countBy(approvedItems, 'segmento'),
      by_objetivo: countBy(approvedItems, 'objetivo_comercial'),
      by_hook: countBy(approvedItems, 'hook_type'),
      by_visual: countBy(approvedItems, 'estilo_visual'),
      by_narrativa: countBy(approvedItems, 'estrutura_narrativa')
    },
    items: approvedItems.map(toIndexItem)
  };
  const draftsIndex = {
    type: 'research_library_drafts_index',
    generatedAt: index.generatedAt,
    total: draftItems.length,
    items: draftItems.map(toIndexItem)
  };

  fs.mkdirSync(paths.libraryDir, { recursive: true });
  fs.writeFileSync(path.join(paths.libraryDir, 'index.json'), JSON.stringify(index, null, 2), 'utf8');
  fs.writeFileSync(path.join(paths.libraryDir, 'drafts_index.json'), JSON.stringify(draftsIndex, null, 2), 'utf8');
  writeTypeIndexes(paths.libraryDir, allItems, rootDir, index.generatedAt);

  return {
    success: true,
    index,
    draftsIndex
  };
}

function importResearchExports(options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  ensureResearchDirectories(rootDir);

  const exports = loadResearchExports({ rootDir });
  const results = exports.map((exportFile) => importResearchExport(exportFile, { rootDir }));
  const indexResult = buildResearchIndexes({ rootDir });
  const report = buildResearchImportReport(results, indexResult.index);
  const reportPath = path.join(rootDir, 'reports', 'research_import_report.md');

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report, 'utf8');

  return {
    success: results.every((result) => result.imported || result.rejected),
    total: results.length,
    imported: results.filter((result) => result.imported).length,
    rejected: results.filter((result) => result.rejected).length,
    duplicates: results.filter((result) => result.duplicate).length,
    results,
    index: indexResult.index,
    reportPath: toSlash(path.relative(rootDir, reportPath))
  };
}

function buildResearchImportReport(results = [], index = null) {
  const imported = results.filter((result) => result.imported);
  const rejected = results.filter((result) => result.rejected);
  const duplicates = results.filter((result) => result.duplicate);
  const approved = imported.filter((result) => result.status === 'approved');
  const drafts = imported.filter((result) => result.status === 'draft');
  const countsByType = countBy(imported, 'type');
  const lines = [
    '# Research Import Report',
    '',
    `- Data de geracao: ${new Date().toISOString()}`,
    `- Total processado: ${results.length}`,
    `- Total importado: ${imported.length}`,
    `- Total rejeitado: ${rejected.length}`,
    `- Duplicados: ${duplicates.length}`,
    `- Approved: ${approved.length}`,
    `- Drafts: ${drafts.length}`,
    '',
    '## Cobertura por tipo',
    ''
  ];

  if (Object.keys(countsByType).length === 0) {
    lines.push('- nenhum item importado');
  } else {
    for (const [type, total] of Object.entries(countsByType)) {
      lines.push(`- ${type}: ${total}`);
    }
  }

  lines.push('');
  lines.push('## Rejeitados');
  lines.push('');

  if (rejected.length === 0) {
    lines.push('- nenhum arquivo rejeitado');
  } else {
    for (const result of rejected) {
      lines.push(`- ${result.sourcePath}: ${(result.errors || []).join(' | ')}`);
    }
  }

  if (index) {
    lines.push('');
    lines.push('## Indice aprovado');
    lines.push('');
    lines.push(`- Total consumivel pelo Midia: ${index.total}`);
  }

  return `${lines.join('\n')}\n`;
}

function ensureResearchDirectories(rootDir) {
  const paths = getPaths(rootDir);
  const dirs = [
    paths.exportsDir,
    paths.stagingDir,
    paths.importedDir,
    paths.rejectedDir,
    paths.libraryDir
  ];

  for (const folder of Object.values(RESEARCH_TYPES)) {
    dirs.push(path.join(paths.libraryDir, folder, 'approved'));
    dirs.push(path.join(paths.libraryDir, folder, 'draft'));
  }

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getPaths(rootDir) {
  return {
    exportsDir: path.join(rootDir, 'research_exports'),
    stagingDir: path.join(rootDir, 'research_staging'),
    importedDir: path.join(rootDir, 'research_imported'),
    rejectedDir: path.join(rootDir, 'research_rejected'),
    libraryDir: path.join(rootDir, 'data', 'research_library'),
    taxonomyDir: path.join(rootDir, 'data', 'taxonomia')
  };
}

function stageResearchExport(exportFile, options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const paths = getPaths(rootDir);
  const sourcePath = typeof exportFile === 'string' ? exportFile : exportFile.path;
  const safeName = assertSafeJsonFilename(path.basename(sourcePath));
  const stagedPath = path.join(paths.stagingDir, safeName);

  moveFileSafe(sourcePath, stagedPath);

  return stagedPath;
}

function writeTypeIndexes(libraryDir, allItems, rootDir, generatedAt) {
  for (const folder of new Set(Object.values(RESEARCH_TYPES))) {
    const folderPath = path.join(libraryDir, folder);
    const approved = allItems.filter((item) => item.path.includes(`/${folder}/approved/`));
    const draft = allItems.filter((item) => item.path.includes(`/${folder}/draft/`));

    fs.mkdirSync(folderPath, { recursive: true });
    fs.writeFileSync(path.join(folderPath, 'index.json'), JSON.stringify({
      type: 'research_type_index',
      folder,
      generatedAt,
      approved: approved.length,
      drafts: draft.length,
      items: approved.map(toIndexItem)
    }, null, 2), 'utf8');
  }
}

function createResearchFingerprint(item) {
  return createHash([
    sourceKey(item.source),
    item.insight,
    item.segmento,
    item.type,
    item.title
  ].join('|'));
}

function normalizeSource(source) {
  if (typeof source === 'string') {
    return {
      kind: 'cosmos_research',
      value: cleanString(source)
    };
  }

  if (source && typeof source === 'object' && !Array.isArray(source)) {
    return Object.entries(source).reduce((normalized, [key, value]) => {
      normalized[key] = typeof value === 'string' ? cleanString(value) : value;
      return normalized;
    }, {});
  }

  return {
    kind: 'cosmos_research',
    value: 'unknown'
  };
}

function sourceKey(source) {
  if (typeof source === 'string') {
    return cleanString(source);
  }

  if (source && typeof source === 'object') {
    return JSON.stringify(source);
  }

  return '';
}

function isValidTaxonomyValue(rootDir, taxonomyFile, value) {
  if (!isNonEmptyString(value)) {
    return false;
  }

  const taxonomyPath = path.join(getPaths(rootDir).taxonomyDir, taxonomyFile);
  if (!fs.existsSync(taxonomyPath)) {
    return false;
  }

  const taxonomy = readJson(taxonomyPath);
  return Array.isArray(taxonomy) && taxonomy.some((item) => item && item.id === value);
}

function normalizeDate(value) {
  const time = Date.parse(value || '');
  return Number.isFinite(time) ? new Date(time).toISOString() : new Date().toISOString();
}

function normalizeArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => cleanString(item)).filter(Boolean);
}

function removeEmptyFields(item) {
  return Object.entries(item).reduce((cleaned, [key, value]) => {
    if (value === '' || value === null || typeof value === 'undefined') {
      return cleaned;
    }

    if (Array.isArray(value) && value.length === 0) {
      return cleaned;
    }

    cleaned[key] = value;
    return cleaned;
  }, {});
}

function toIndexItem(item) {
  return {
    id: item.id,
    type: item.type,
    status: item.status,
    title: item.title,
    segmento: item.segmento || '',
    objetivo_comercial: item.objetivo_comercial || '',
    hook_type: item.hook_type || '',
    estrutura_narrativa: item.estrutura_narrativa || '',
    tom_emocional: item.tom_emocional || '',
    tipo_cta: item.tipo_cta || '',
    estilo_visual: item.estilo_visual || '',
    path: item.path
  };
}

function countBy(items, field) {
  return items.reduce((counts, item) => {
    const value = item[field] || 'sem_valor';
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return listJsonFiles(fullPath);
    }

    return entry.isFile() && entry.name.endsWith('.json') ? [fullPath] : [];
  });
}

function moveFileSafe(sourcePath, targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  if (fs.existsSync(targetPath)) {
    const parsed = path.parse(targetPath);
    let counter = 2;
    let candidate = path.join(parsed.dir, `${parsed.name}_${counter}${parsed.ext}`);

    while (fs.existsSync(candidate)) {
      counter++;
      candidate = path.join(parsed.dir, `${parsed.name}_${counter}${parsed.ext}`);
    }

    fs.renameSync(sourcePath, candidate);
    return candidate;
  }

  fs.renameSync(sourcePath, targetPath);
  return targetPath;
}

function assertSafeJsonFilename(filename) {
  if (!isNonEmptyString(filename) || path.basename(filename) !== filename || path.extname(filename) !== '.json') {
    throw new Error(`Nome de arquivo JSON inseguro: ${filename}`);
  }

  return filename;
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || 'research';
}

function createHash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function toSlash(value) {
  return value.replace(/\\/g, '/');
}

module.exports = {
  RESEARCH_TYPES,
  TAXONOMY_FIELD_FILES,
  VALID_RESEARCH_STATUSES,
  buildResearchImportReport,
  buildResearchIndexes,
  detectDuplicateResearchExport,
  ensureResearchDirectories,
  generateResearchImportId,
  importResearchExport,
  importResearchExports,
  loadResearchExports,
  moveRejectedResearchExport,
  normalizeResearchExport,
  validateResearchExport
};
