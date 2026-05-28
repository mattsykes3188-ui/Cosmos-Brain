'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const TAXONOMY_DIR = path.join(ROOT_DIR, 'data', 'taxonomia');

const FIELD_TAXONOMIES = {
  segmento: 'segmentos.json',
  tipo_dor: 'tipos_dor.json',
  hook_type: 'tipos_hook.json',
  estrutura_narrativa: 'estruturas_narrativas.json',
  tom_emocional: 'tons_emocionais.json',
  tipo_cta: 'tipos_cta.json',
  formato_conteudo: 'formatos_conteudo.json',
  estilo_visual: 'estilos_visuais.json',
  objetivo_comercial: 'objetivos_comerciais.json'
};

const REQUIRED_FIELDS = [
  'titulo',
  ...Object.keys(FIELD_TAXONOMIES),
  'observacoes',
  'signals',
  'reasoning'
];

function buildManualGptPrompt(text) {
  const transcription = String(text || '').trim();

  if (!transcription) {
    throw new Error('Transcricao curada e obrigatoria para gerar o prompt.');
  }

  const taxonomy = loadTaxonomyIdsByField();
  const taxonomyLines = Object.entries(taxonomy)
    .map(([field, ids]) => `- ${field}: ${ids.join(', ')}`)
    .join('\n');

  return [
    'Voce vai classificar semanticamente uma transcricao curada para o Cosmos Brain.',
    '',
    'Regras obrigatorias:',
    '- Retorne somente JSON valido.',
    '- Nao use markdown.',
    '- Nao invente IDs.',
    '- Use apenas IDs permitidos listados abaixo.',
    '- Se estiver em duvida, escolha o ID permitido mais proximo.',
    '- Nao copie a transcricao como conteudo final.',
    '',
    'IDs permitidos por campo:',
    taxonomyLines,
    '',
    'Campos obrigatorios do JSON:',
    JSON.stringify(buildEmptyExpectedJson(), null, 2),
    '',
    'Transcricao curada:',
    transcription
  ].join('\n');
}

function extractJsonFromGptResponse(responseText) {
  const raw = String(responseText || '').trim();

  if (!raw) {
    throw new Error('Resposta do GPT esta vazia.');
  }

  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fencedMatch ? fencedMatch[1].trim() : raw;

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`JSON invalido na resposta do GPT: ${error.message}`);
  }
}

function validateManualGptJson(json) {
  const errors = [];

  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return {
      valid: false,
      errors: ['Resposta deve ser um objeto JSON.']
    };
  }

  for (const field of REQUIRED_FIELDS) {
    if (json[field] === undefined || json[field] === null) {
      errors.push(`Campo obrigatorio ausente: ${field}`);
    }
  }

  for (const field of ['titulo', 'observacoes', 'reasoning']) {
    if (json[field] !== undefined && (typeof json[field] !== 'string' || json[field].trim() === '')) {
      errors.push(`Campo deve ser string nao vazia: ${field}`);
    }
  }

  if (json.signals !== undefined && !Array.isArray(json.signals)) {
    errors.push('Campo signals deve ser array.');
  }

  const taxonomy = loadTaxonomyIdsByField();

  for (const [field, ids] of Object.entries(taxonomy)) {
    if (json[field] !== undefined && !ids.includes(json[field])) {
      errors.push(`ID invalido para ${field}: ${json[field]}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function normalizeManualGptJson(json) {
  const validation = validateManualGptJson(json);

  if (!validation.valid) {
    const error = new Error('JSON semantico invalido.');
    error.errors = validation.errors;
    throw error;
  }

  const normalized = {};

  for (const field of REQUIRED_FIELDS) {
    if (field === 'signals') {
      normalized.signals = json.signals.map((item) => String(item).trim()).filter(Boolean);
      continue;
    }

    normalized[field] = String(json[field]).trim();
  }

  return normalized;
}

function buildPreviewFromManualGptJson(json) {
  const normalized = normalizeManualGptJson(json);

  return {
    titulo: normalized.titulo,
    classificacao: {
      segmento: normalized.segmento,
      tipo_dor: normalized.tipo_dor,
      hook_type: normalized.hook_type,
      estrutura_narrativa: normalized.estrutura_narrativa,
      tom_emocional: normalized.tom_emocional,
      tipo_cta: normalized.tipo_cta,
      formato_conteudo: normalized.formato_conteudo,
      estilo_visual: normalized.estilo_visual,
      objetivo_comercial: normalized.objetivo_comercial
    },
    observacoes: normalized.observacoes,
    signals: normalized.signals,
    reasoning: normalized.reasoning
  };
}

function buildEmptyExpectedJson() {
  return {
    titulo: '',
    segmento: '',
    tipo_dor: '',
    hook_type: '',
    estrutura_narrativa: '',
    tom_emocional: '',
    tipo_cta: '',
    formato_conteudo: '',
    estilo_visual: '',
    objetivo_comercial: '',
    observacoes: '',
    signals: [],
    reasoning: ''
  };
}

function loadTaxonomyIdsByField() {
  const output = {};

  for (const [field, fileName] of Object.entries(FIELD_TAXONOMIES)) {
    output[field] = readTaxonomyIds(fileName);
  }

  return output;
}

function readTaxonomyIds(fileName) {
  const filePath = path.join(TAXONOMY_DIR, fileName);
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));

  if (!Array.isArray(parsed)) {
    throw new Error(`Taxonomia invalida: ${fileName}`);
  }

  return parsed.map((item) => item.id).filter(Boolean).sort();
}

module.exports = {
  FIELD_TAXONOMIES,
  REQUIRED_FIELDS,
  buildManualGptPrompt,
  buildPreviewFromManualGptJson,
  extractJsonFromGptResponse,
  normalizeManualGptJson,
  validateManualGptJson
};
