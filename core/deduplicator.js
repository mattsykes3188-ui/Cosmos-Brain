'use strict';

const fs = require('fs');
const path = require('path');

const { createFingerprint } = require('./hash');

function findDuplicateBrainItem(item, folderPath) {
  const fingerprint = item.fingerprint || createFingerprint(item);

  if (!fs.existsSync(folderPath)) {
    return {
      duplicate: false,
      fingerprint,
      match: null
    };
  }

  const files = fs.readdirSync(folderPath)
    .filter((file) => file.endsWith('.json') && file !== 'index.json');

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const existing = readJson(filePath);

    if (!existing) {
      continue;
    }

    const existingFingerprint = existing.fingerprint || createFingerprint(existing);

    if (existingFingerprint === fingerprint) {
      return {
        duplicate: true,
        fingerprint,
        match: {
          id: existing.id || path.basename(file, '.json'),
          file,
          path: filePath
        }
      };
    }
  }

  return {
    duplicate: false,
    fingerprint,
    match: null
  };
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return null;
  }
}

// Compatibility helper for older code that only checked duplicated text.
function isDuplicate(itemOrText, folderPath) {
  const item = typeof itemOrText === 'string'
    ? { type: '', product: '', objective: '', style: '', text: itemOrText }
    : itemOrText;

  return findDuplicateBrainItem(item, folderPath).duplicate;
}

module.exports = {
  findDuplicateBrainItem,
  isDuplicate
};
