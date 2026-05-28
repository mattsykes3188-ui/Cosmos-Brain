'use strict';

const fs = require('fs');
const path = require('path');

const { createFingerprint } = require('../core/hash');
const { TYPE_TO_FOLDER, normalizeBrainType, validateBrainItem } = require('../core/validator');

function validateDataIntegrity(options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const dataDir = path.join(rootDir, 'data');
  const schemasDir = path.join(rootDir, 'schemas');
  const errors = [];
  const warnings = [];
  const checkedFiles = [];
  const ids = new Map();
  const fingerprintsByType = new Map();
  const indexedFiles = collectIndexedFiles(rootDir, dataDir, errors);

  if (!fs.existsSync(dataDir)) {
    errors.push({ file: 'data', message: 'data directory not found.' });
    return buildResult(errors, warnings, checkedFiles);
  }

  for (const filePath of walkJsonFiles(dataDir)) {
    if (path.basename(filePath) === 'index.json') {
      continue;
    }

    const relativePath = toRelative(rootDir, filePath);

    if (isTaxonomyFile(relativePath)) {
      continue;
    }

    if (isSemanticAssistFile(relativePath)) {
      continue;
    }

    if (isApprovedPatternFile(relativePath)) {
      continue;
    }

    if (isResearchLibraryFile(relativePath)) {
      continue;
    }

    checkedFiles.push(relativePath);

    let item;
    try {
      item = JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
    } catch (error) {
      errors.push({ file: relativePath, message: `Invalid JSON: ${error.message}` });
      continue;
    }

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push({ file: relativePath, message: 'Data item must be an object.' });
      continue;
    }

    const normalizedType = normalizeBrainType(item.type);
    if (!TYPE_TO_FOLDER[normalizedType]) {
      errors.push({ file: relativePath, message: `Invalid type: ${item.type}` });
      continue;
    }

    if (item.type !== normalizedType) {
      errors.push({ file: relativePath, message: `Type must use canonical Portuguese name: ${normalizedType}` });
    }

    const schemaPath = path.join(schemasDir, `${normalizedType}.schema.json`);
    if (!fs.existsSync(schemaPath)) {
      errors.push({ file: relativePath, message: `Schema not found: schemas/${normalizedType}.schema.json` });
    }

    const validation = validateBrainItem(item);
    if (!validation.valid) {
      errors.push({
        file: relativePath,
        message: 'Data item failed validation.',
        errors: validation.errors
      });
    }

    if (item.id) {
      if (ids.has(item.id)) {
        errors.push({ file: relativePath, message: `Duplicate id also found in ${ids.get(item.id)}` });
      } else {
        ids.set(item.id, relativePath);
      }
    }

    const fingerprint = item.fingerprint || createFingerprint(item);
    const fingerprintKey = `${normalizedType}:${fingerprint}`;
    if (fingerprintsByType.has(fingerprintKey)) {
      errors.push({
        file: relativePath,
        message: `Duplicate critical fingerprint also found in ${fingerprintsByType.get(fingerprintKey)}`
      });
    } else {
      fingerprintsByType.set(fingerprintKey, relativePath);
    }

    if (!indexedFiles.has(path.resolve(filePath))) {
      errors.push({ file: relativePath, message: 'Data file is not listed in any index.json.' });
    }
  }

  return buildResult(errors, warnings, checkedFiles);
}

function isTaxonomyFile(relativePath) {
  return relativePath.startsWith('data/taxonomia/');
}

function isSemanticAssistFile(relativePath) {
  return relativePath.startsWith('data/semantic_assists/');
}

function isApprovedPatternFile(relativePath) {
  return relativePath.startsWith('data/biblioteca_anuncios/padroes_locucao/');
}

function isResearchLibraryFile(relativePath) {
  return relativePath.startsWith('data/research_library/');
}

function collectIndexedFiles(rootDir, dataDir, errors) {
  const indexedFiles = new Set();

  if (!fs.existsSync(dataDir)) {
    return indexedFiles;
  }

  for (const indexPath of walkJsonFiles(dataDir).filter((filePath) => path.basename(filePath) === 'index.json')) {
    let entries;
    try {
      entries = JSON.parse(fs.readFileSync(indexPath, 'utf8').replace(/^\uFEFF/, ''));
    } catch (_) {
      continue;
    }

    if (!Array.isArray(entries)) {
      continue;
    }

    for (const entry of entries) {
      if (typeof entry !== 'string') {
        continue;
      }

      const targetPath = path.resolve(path.dirname(indexPath), entry);
      if (fs.existsSync(targetPath)) {
        indexedFiles.add(targetPath);
      } else {
        errors.push({
          file: toRelative(rootDir, indexPath),
          message: `Manifest references missing file: ${entry}`
        });
      }
    }
  }

  return indexedFiles;
}

function walkJsonFiles(dir) {
  const files = [];

  for (const name of fs.readdirSync(dir)) {
    const filePath = path.join(dir, name);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      files.push(...walkJsonFiles(filePath));
    } else if (name.endsWith('.json')) {
      files.push(filePath);
    }
  }

  return files;
}

function buildResult(errors, warnings, checkedFiles) {
  return {
    success: errors.length === 0,
    errors,
    warnings,
    checked_files: checkedFiles.length,
    files: checkedFiles
  };
}

function toRelative(rootDir, filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

if (require.main === module) {
  const result = validateDataIntegrity();
  printResult('data integrity', result);
  process.exit(result.success ? 0 : 1);
}

function printResult(label, result) {
  if (result.success) {
    console.log(`OK ${label}: ${result.checked_files} data files checked.`);
    return;
  }

  console.error(`FAIL ${label}: ${result.errors.length} error(s).`);
  for (const error of result.errors) {
    console.error(`- ${error.file}: ${error.message}`);
  }
}

module.exports = {
  collectIndexedFiles,
  isApprovedPatternFile,
  isResearchLibraryFile,
  isSemanticAssistFile,
  isTaxonomyFile,
  validateDataIntegrity
};
