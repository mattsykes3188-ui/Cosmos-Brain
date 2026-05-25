'use strict';

const crypto = require('crypto');

const HASH_FIELDS = [
  'type',
  'product',
  'objective',
  'style',
  'strength',
  'text',
  'context',
  'source_type'
];

function pickMainContent(item) {
  const content = {};

  for (const field of HASH_FIELDS) {
    content[field] = item && item[field] !== undefined ? item[field] : '';
  }

  return content;
}

function createFingerprint(item) {
  const payload = JSON.stringify(pickMainContent(item));

  return crypto
    .createHash('sha256')
    .update(payload)
    .digest('hex');
}

function createShortHash(item, length = 5) {
  return createFingerprint(item).slice(0, length);
}

module.exports = {
  createFingerprint,
  createShortHash,
  pickMainContent
};
