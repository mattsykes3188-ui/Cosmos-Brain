'use strict';

const { hashText } = require('./hash');

// Retorna: tipo_subtipo_YYYYMMDD_hash4
// Ex: hooks_premium_20260524_a3f9
function generateId(type, subtype, text = '') {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seed = text || `${type}_${subtype}_${date}`;
  const hash = hashText(seed);
  return `${type}_${subtype}_${date}_${hash}`;
}

module.exports = { generateId };
