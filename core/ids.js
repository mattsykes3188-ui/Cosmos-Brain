'use strict';

const { createShortHash } = require('./hash');

function generateBrainId(item, options = {}) {
  const type = sanitizeIdPart(item && item.type ? item.type : 'item');
  const date = formatDate(options.date || new Date());
  const hash = createShortHash(item, options.hashLength || 5);

  return `${type}_${date}_${hash}`;
}

function sanitizeIdPart(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'item';
}

function formatDate(dateInput) {
  if (typeof dateInput === 'string') {
    return dateInput.slice(0, 10).replace(/-/g, '');
  }

  return dateInput.toISOString().slice(0, 10).replace(/-/g, '');
}

module.exports = {
  generateBrainId,
  sanitizeIdPart,
  formatDate
};
