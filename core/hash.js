'use strict';

const crypto = require('crypto');

const HASH_FIELDS = [
  'type',
  'product',
  'objective',
  'style',
  'text'
];

function createFingerprint(item) {
  const payload = JSON.stringify(createHashBase(item));

  return crypto
    .createHash('sha256')
    .update(payload)
    .digest('hex');
}

function createShortHash(item, length = 5) {
  return createFingerprint(item).slice(0, length);
}

function createHashBase(item) {
  const base = {};

  for (const field of HASH_FIELDS) {
    base[field] = normalizeHashValue(item && item[field]);
  }

  return base;
}

function normalizeHashValue(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

module.exports = {
  HASH_FIELDS,
  createFingerprint,
  createHashBase,
  createShortHash,
  normalizeHashValue
};
