'use strict';

const fs = require('fs');
const path = require('path');

const APPROVED_PATTERNS_DIR = path.join(
  __dirname,
  '..',
  'data',
  'biblioteca_anuncios',
  'padroes_locucao'
);
const PATTERN_INDEX_PATH = path.join(APPROVED_PATTERNS_DIR, 'index.json');

const ALLOWED_FILTERS = [
  'segmento',
  'objetivo_comercial',
  'hook_type',
  'estrutura_narrativa',
  'tom_emocional',
  'tipo_cta'
];

function loadPatternIndex(options = {}) {
  const indexPath = options.indexPath || PATTERN_INDEX_PATH;

  if (!fs.existsSync(indexPath)) {
    throw new Error('Index de padroes aprovados nao encontrado. Rode: node scripts/build_padroes_locucao_index.js');
  }

  const index = readJson(indexPath);

  if (!index || index.type !== 'padroes_locucao_index' || !Array.isArray(index.items)) {
    throw new Error('Index de padroes aprovados invalido.');
  }

  return index;
}

function loadApprovedPatterns(options = {}) {
  const directory = options.directory || APPROVED_PATTERNS_DIR;

  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory)
    .filter((filename) => filename.endsWith('.json') && filename !== 'index.json')
    .map((filename) => readPatternIfApproved(path.join(directory, filename), filename))
    .filter(Boolean)
    .sort(comparePatterns);
}

function getApprovedPatterns(filters = {}, options = {}) {
  const normalizedFilters = normalizeFilters(filters);
  const patterns = options.patterns || loadApprovedPatterns(options);

  validateFilters(normalizedFilters);

  return patterns.filter((pattern) => matchesFilters(pattern, normalizedFilters));
}

function getPatternsBySegment(segmento, options = {}) {
  return getApprovedPatterns({ segmento }, options);
}

function getPatternsByObjective(objetivo, options = {}) {
  return getApprovedPatterns({ objetivo_comercial: objetivo }, options);
}

function getPatternsByHook(hook, options = {}) {
  return getApprovedPatterns({ hook_type: hook }, options);
}

function getPatternsByNarrative(narrativa, options = {}) {
  return getApprovedPatterns({ estrutura_narrativa: narrativa }, options);
}

function getPatternsByCTA(cta, options = {}) {
  return getApprovedPatterns({ tipo_cta: cta }, options);
}

function getPatternsByTone(tom, options = {}) {
  return getApprovedPatterns({ tom_emocional: tom }, options);
}

function getBestPatternsForBrief(brief = {}, options = {}) {
  const patterns = options.patterns || loadApprovedPatterns(options);
  const normalizedBrief = normalizeFilters(brief);
  const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : 5;

  validateFilters(normalizedBrief);

  const exactMatches = patterns
    .filter((pattern) => matchesFilters(pattern, normalizedBrief))
    .sort(comparePatterns);

  if (exactMatches.length > 0) {
    return exactMatches.slice(0, Math.max(0, limit));
  }

  const scored = patterns
    .map((pattern) => ({
      pattern,
      score: scorePatternForBrief(pattern, normalizedBrief)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return comparePatterns(a.pattern, b.pattern);
    })
    .map((item) => item.pattern);

  return scored.slice(0, Math.max(0, limit));
}

function readPatternIfApproved(filePath, filename) {
  try {
    const pattern = readJson(filePath);

    if (!pattern || pattern.type !== 'padrao_locucao' || pattern.status !== 'approved') {
      return null;
    }

    return {
      ...pattern,
      filename
    };
  } catch (_) {
    return null;
  }
}

function normalizeFilters(filters = {}) {
  const normalized = {};

  for (const [key, value] of Object.entries(filters || {})) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    normalized[key] = String(value).trim();
  }

  return normalized;
}

function validateFilters(filters) {
  for (const field of Object.keys(filters)) {
    if (!ALLOWED_FILTERS.includes(field)) {
      throw new Error(`Filtro de conhecimento desconhecido: ${field}`);
    }
  }
}

function matchesFilters(pattern, filters) {
  return Object.entries(filters).every(([field, value]) => pattern[field] === value);
}

function scorePatternForBrief(pattern, brief) {
  const weights = {
    segmento: 5,
    objetivo_comercial: 4,
    hook_type: 3,
    estrutura_narrativa: 3,
    tom_emocional: 2,
    tipo_cta: 2
  };

  return Object.entries(brief).reduce((score, [field, value]) => {
    return pattern[field] === value ? score + (weights[field] || 1) : score;
  }, 0);
}

function comparePatterns(a, b) {
  const dateA = Date.parse(a.approvedAt || a.createdAt || '');
  const dateB = Date.parse(b.approvedAt || b.createdAt || '');

  if (Number.isFinite(dateA) && Number.isFinite(dateB) && dateA !== dateB) {
    return dateB - dateA;
  }

  return String(a.filename || '').localeCompare(String(b.filename || ''));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

module.exports = {
  ALLOWED_FILTERS,
  APPROVED_PATTERNS_DIR,
  PATTERN_INDEX_PATH,
  getApprovedPatterns,
  getBestPatternsForBrief,
  getPatternsByCTA,
  getPatternsByHook,
  getPatternsByNarrative,
  getPatternsByObjective,
  getPatternsBySegment,
  getPatternsByTone,
  loadApprovedPatterns,
  loadPatternIndex
};
