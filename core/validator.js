'use strict';

const TYPE_TO_FOLDER = {
  gancho: 'ganchos',
  chamada_acao: 'chamadas_acao',
  tendencia: 'tendencias',
  dor_mercado: 'dores_mercado',
  narrativa: 'narrativas',
  direcao_visual: 'direcao_visual',
  insight_anuncio: 'biblioteca_anuncios/analisado',
  insight_estrategico: 'estrategia_mateus/autoridade',
  padrao_locucao: 'biblioteca_anuncios/padroes_locucao'
};

const TYPE_ALIASES = {
  hook: 'gancho',
  cta: 'chamada_acao',
  trend: 'tendencia',
  pain_point: 'dor_mercado',
  storytelling: 'narrativa',
  visual: 'direcao_visual'
};

const BASE_REQUIRED_FIELDS = [
  'type',
  'product',
  'objective',
  'style',
  'strength',
  'text',
  'context',
  'source_type'
];

const TYPE_REQUIRED_FIELDS = {
  gancho: BASE_REQUIRED_FIELDS,
  chamada_acao: BASE_REQUIRED_FIELDS,
  tendencia: BASE_REQUIRED_FIELDS,
  dor_mercado: BASE_REQUIRED_FIELDS,
  narrativa: BASE_REQUIRED_FIELDS,
  direcao_visual: BASE_REQUIRED_FIELDS,
  insight_anuncio: [
    'type',
    'source',
    'marca',
    'produto',
    'promessa',
    'dor_principal',
    'formato',
    'estilo_visual',
    'estrutura_copy',
    'strength',
    'text',
    'context',
    'created_at'
  ],
  insight_estrategico: [
    'type',
    'source',
    'padrao_mercado',
    'interpretacao_estrategica',
    'angulo_conteudo',
    'formato_recomendado',
    'strength',
    'text',
    'context',
    'created_at'
  ],
  padrao_locucao: [
    'type',
    'source',
    'plataforma',
    'produto',
    'abertura',
    'estrutura',
    'promessa',
    'dor_principal',
    'objecao_atacada',
    'tom',
    'ritmo',
    'cta',
    'strength',
    'text',
    'context',
    'created_at'
  ]
};

function validateBrainItem(item) {
  const errors = [];

  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return {
      valid: false,
      errors: ['Item must be an object.']
    };
  }

  const type = normalizeBrainType(item.type);
  const requiredFields = TYPE_REQUIRED_FIELDS[type] || BASE_REQUIRED_FIELDS;

  for (const field of requiredFields) {
    const value = item[field];

    if (value === undefined || value === null || value === '') {
      errors.push(`Missing required field: ${field}`);
      continue;
    }

    if (field !== 'strength' && typeof value !== 'string') {
      errors.push(`Field ${field} must be a string.`);
    }
  }

  if (typeof item.type === 'string' && !TYPE_TO_FOLDER[type]) {
    errors.push(`Unsupported type: ${item.type}`);
  }

  if (item.id !== undefined && item.id !== null && typeof item.id !== 'string') {
    errors.push('Field id must be a string when provided.');
  }

  validateRequiredStrings(item, requiredFields, errors);
  validateMinLength(item, 'text', 10, errors);
  validateMinLength(item, 'context', 10, errors);
  validateTypeSpecificRules(type, item, errors);
  validateStrength(item, errors);

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateTypeSpecificRules(type, item, errors) {
  if (type !== 'padrao_locucao') {
    return;
  }

  validateMinLength(item, 'abertura', 5, errors);
  validateMinLength(item, 'estrutura', 5, errors);
}

function validateRequiredStrings(item, fields, errors) {
  for (const field of fields) {
    if (field === 'strength') {
      continue;
    }

    validateNonEmptyString(item, field, errors);
  }
}

function validateNonEmptyString(item, field, errors) {
  const value = item[field];

  if (value === undefined || value === null || value === '') {
    return;
  }

  if (typeof value === 'string' && value.trim() === '') {
    errors.push(`Field ${field} must not be empty.`);
  }
}

function validateMinLength(item, field, minLength, errors) {
  const value = item[field];

  if (value === undefined || value === null || value === '') {
    return;
  }

  if (typeof value === 'string' && value.trim().length < minLength) {
    errors.push(`Field ${field} must have at least ${minLength} characters.`);
  }
}

function validateStrength(item, errors) {
  const value = item.strength;

  if (value === undefined || value === null || value === '') {
    return;
  }

  if (typeof value !== 'number') {
    errors.push('Field strength must be a number.');
    return;
  }

  if (value < 1 || value > 5) {
    errors.push('Field strength must be between 1 and 5.');
  }
}

function normalizeBrainType(type) {
  const normalized = String(type || '').trim().toLowerCase();
  return TYPE_ALIASES[normalized] || normalized;
}

module.exports = {
  BASE_REQUIRED_FIELDS,
  REQUIRED_FIELDS: BASE_REQUIRED_FIELDS,
  TYPE_ALIASES,
  TYPE_REQUIRED_FIELDS,
  TYPE_TO_FOLDER,
  normalizeBrainType,
  validateTypeSpecificRules,
  validate: validateBrainItem,
  validateBrainItem
};
