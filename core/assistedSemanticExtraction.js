'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const ASSIST_DIR = path.join(ROOT_DIR, 'data', 'semantic_assists');
const TAXONOMY_DIR = path.join(ROOT_DIR, 'data', 'taxonomia');

const ASSIST_CONFIG = {
  segmento: {
    mappingFile: 'segmentos_keywords.json',
    taxonomyFile: 'segmentos.json'
  },
  hook_type: {
    mappingFile: 'hooks_keywords.json',
    taxonomyFile: 'tipos_hook.json'
  },
  tom_emocional: {
    mappingFile: 'tons_keywords.json',
    taxonomyFile: 'tons_emocionais.json'
  },
  estrutura_narrativa: {
    mappingFile: 'narrativas_keywords.json',
    taxonomyFile: 'estruturas_narrativas.json'
  },
  objetivo_comercial: {
    mappingFile: 'objetivos_keywords.json',
    taxonomyFile: 'objetivos_comerciais.json'
  },
  tipo_cta: {
    mappingFile: 'ctas_keywords.json',
    taxonomyFile: 'tipos_cta.json'
  }
};

function normalizeText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeText(text) {
  const normalized = normalizeText(text);

  if (!normalized) {
    return [];
  }

  return normalized.split(' ').filter((token) => token.length > 1);
}

function extractKeywordSignals(text, mapping = null) {
  const normalized = normalizeText(text);
  const sourceMapping = mapping || loadAllKeywordMappings();
  const signals = {};

  for (const [groupName, groupMapping] of Object.entries(sourceMapping)) {
    signals[groupName] = {};

    for (const [id, keywords] of Object.entries(groupMapping)) {
      const matched = keywords.filter((keyword) => normalized.includes(normalizeText(keyword)));

      if (matched.length > 0) {
        signals[groupName][id] = matched;
      }
    }
  }

  return signals;
}

function inferSegmento(text) {
  return inferField('segmento', text);
}

function inferHookType(text) {
  return inferField('hook_type', text);
}

function inferTomEmocional(text) {
  return inferField('tom_emocional', text);
}

function inferEstruturaNarrativa(text) {
  return inferField('estrutura_narrativa', text);
}

function inferObjetivoComercial(text) {
  return inferField('objetivo_comercial', text);
}

function inferTipoCTA(text) {
  return inferField('tipo_cta', text);
}

function inferSemanticSuggestions(text) {
  return {
    segmento: inferSegmento(text),
    hook_type: inferHookType(text),
    estrutura_narrativa: inferEstruturaNarrativa(text),
    tom_emocional: inferTomEmocional(text),
    tipo_cta: inferTipoCTA(text),
    objetivo_comercial: inferObjetivoComercial(text)
  };
}

function calculateSuggestionConfidence(matches, totalSignals) {
  const matchCount = Array.isArray(matches) ? matches.length : Number(matches || 0);
  const total = Math.max(1, Number(totalSignals || 0));
  const confidence = Math.min(1, matchCount / total);

  return Number(confidence.toFixed(2));
}

function inferField(field, text) {
  const config = ASSIST_CONFIG[field];

  if (!config) {
    throw new Error(`Campo semantico desconhecido: ${field}`);
  }

  const mapping = loadKeywordMapping(config.mappingFile);
  const officialIds = loadTaxonomyIds(config.taxonomyFile);
  const normalized = normalizeText(text);
  let best = null;
  let totalSignals = 0;

  for (const [id, keywords] of Object.entries(mapping)) {
    if (!officialIds.has(id)) {
      continue;
    }

    const matched = keywords.filter((keyword) => normalized.includes(normalizeText(keyword)));
    totalSignals += matched.length;

    if (matched.length === 0) {
      continue;
    }

    const candidate = {
      value: id,
      matches: matched,
      score: matched.length
    };

    if (!best || candidate.score > best.score || (candidate.score === best.score && candidate.value < best.value)) {
      best = candidate;
    }
  }

  if (!best) {
    return {
      value: null,
      confidence: 0,
      signals: []
    };
  }

  return {
    value: best.value,
    confidence: calculateSuggestionConfidence(best.matches, totalSignals),
    signals: best.matches
  };
}

function loadAllKeywordMappings() {
  const output = {};

  for (const [field, config] of Object.entries(ASSIST_CONFIG)) {
    output[field] = loadKeywordMapping(config.mappingFile);
  }

  return output;
}

function loadKeywordMapping(fileName) {
  const filePath = path.join(ASSIST_DIR, fileName);
  const parsed = readJson(filePath);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Mapa de assistencia invalido: ${fileName}`);
  }

  return parsed;
}

function loadTaxonomyIds(fileName) {
  const filePath = path.join(TAXONOMY_DIR, fileName);
  const parsed = readJson(filePath);

  if (!Array.isArray(parsed)) {
    throw new Error(`Taxonomia invalida: ${fileName}`);
  }

  return new Set(parsed.map((item) => item.id).filter(Boolean));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

module.exports = {
  ASSIST_CONFIG,
  calculateSuggestionConfidence,
  extractKeywordSignals,
  inferEstruturaNarrativa,
  inferHookType,
  inferObjetivoComercial,
  inferSegmento,
  inferSemanticSuggestions,
  inferTipoCTA,
  inferTomEmocional,
  normalizeText,
  tokenizeText
};
