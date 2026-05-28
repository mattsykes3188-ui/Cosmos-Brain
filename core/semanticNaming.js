'use strict';

const fs = require('fs');
const path = require('path');

const MAX_SEMANTIC_PARTS = 4;
const SEMANTIC_PRIORITY_FIELDS = [
  'segmento',
  'hook_type',
  'estrutura_narrativa',
  'objetivo_comercial'
];

function slugifySemanticPart(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function buildSemanticBaseName(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'padrao_locucao';
  }

  const parts = [];

  for (const field of SEMANTIC_PRIORITY_FIELDS) {
    const slug = slugifySemanticPart(payload[field]);

    if (slug) {
      parts.push(slug);
    }

    if (parts.length >= MAX_SEMANTIC_PARTS) {
      break;
    }
  }

  return parts.length ? parts.join('_') : 'padrao_locucao';
}

function getNextSemanticSequence(baseName, directory) {
  const normalizedBaseName = normalizeSemanticFilename(baseName).replace(/\.json$/i, '');
  let maxSequence = 0;

  if (fs.existsSync(directory)) {
    const expression = new RegExp(`^${escapeRegExp(normalizedBaseName)}_(\\d{3})\\.json$`);

    for (const filename of fs.readdirSync(directory)) {
      const match = filename.match(expression);

      if (match) {
        maxSequence = Math.max(maxSequence, Number(match[1]));
      }
    }
  }

  return String(maxSequence + 1).padStart(3, '0');
}

function buildSemanticFilename(payload, directory) {
  const baseName = buildSemanticBaseName(payload);
  const sequence = getNextSemanticSequence(baseName, directory);

  return `${baseName}_${sequence}.json`;
}

function normalizeSemanticFilename(name) {
  const parsed = path.parse(String(name || 'padrao_locucao'));
  const baseName = slugifySemanticPart(parsed.name || name) || 'padrao_locucao';
  const ext = parsed.ext && parsed.ext.toLowerCase() === '.json' ? '.json' : '';

  return `${baseName}${ext}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  SEMANTIC_PRIORITY_FIELDS,
  buildSemanticBaseName,
  buildSemanticFilename,
  getNextSemanticSequence,
  normalizeSemanticFilename,
  slugifySemanticPart
};
