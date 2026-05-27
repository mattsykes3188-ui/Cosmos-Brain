'use strict';

const fs = require('fs');
const path = require('path');

const { validateBrainItem } = require('../core/validator');

function validateJsonFiles(options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const dataDir = path.join(rootDir, 'data');
  const errors = [];
  const warnings = [];
  const checkedFiles = [];

  if (!fs.existsSync(dataDir)) {
    errors.push({
      file: 'data',
      message: 'data directory not found.'
    });
    return buildResult(errors, warnings, checkedFiles);
  }

  for (const filePath of walkJsonFiles(dataDir)) {
    const relativePath = toRelative(rootDir, filePath);
    checkedFiles.push(relativePath);

    const stat = fs.statSync(filePath);
    if (stat.size === 0) {
      errors.push({ file: relativePath, message: 'JSON file is empty.' });
      continue;
    }

    let text;
    try {
      const buffer = fs.readFileSync(filePath);
      text = decodeUtf8(buffer);
    } catch (error) {
      errors.push({ file: relativePath, message: `Invalid UTF-8: ${error.message}` });
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(stripBom(text));
    } catch (error) {
      errors.push({ file: relativePath, message: `Invalid JSON: ${error.message}` });
      continue;
    }

    if (path.basename(filePath) === 'index.json') {
      if (isGeneratedStrategicIndex(relativePath)) {
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          errors.push({ file: relativePath, message: 'Generated strategic index must contain an object.' });
        }
        continue;
      }

      if (!Array.isArray(parsed)) {
        errors.push({ file: relativePath, message: 'index.json must contain an array.' });
      }
      continue;
    }

    if (isTaxonomyFile(relativePath)) {
      if (!Array.isArray(parsed)) {
        errors.push({ file: relativePath, message: 'Taxonomy JSON must contain an array.' });
      }
      continue;
    }

    if (isApprovedPatternFile(relativePath)) {
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        errors.push({ file: relativePath, message: 'Approved pattern JSON must contain an object.' });
      }
      continue;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      errors.push({ file: relativePath, message: 'Data JSON must contain an object.' });
      continue;
    }

    const validation = validateBrainItem(parsed);
    if (!validation.valid) {
      errors.push({
        file: relativePath,
        message: 'Data item failed validation.',
        errors: validation.errors
      });
    }
  }

  return buildResult(errors, warnings, checkedFiles);
}

function isTaxonomyFile(relativePath) {
  return relativePath.startsWith('data/taxonomia/');
}

function isGeneratedStrategicIndex(relativePath) {
  return relativePath === 'data/biblioteca_anuncios/padroes_locucao/index.json';
}

function isApprovedPatternFile(relativePath) {
  return relativePath.startsWith('data/biblioteca_anuncios/padroes_locucao/');
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

function decodeUtf8(buffer) {
  return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
}

function stripBom(text) {
  return text.replace(/^\uFEFF/, '');
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
  const result = validateJsonFiles();
  printResult('JSON files', result);
  process.exit(result.success ? 0 : 1);
}

function printResult(label, result) {
  if (result.success) {
    console.log(`OK ${label}: ${result.checked_files} files checked.`);
    return;
  }

  console.error(`FAIL ${label}: ${result.errors.length} error(s).`);
  for (const error of result.errors) {
    console.error(`- ${error.file}: ${error.message}`);
  }
}

module.exports = {
  isGeneratedStrategicIndex,
  isApprovedPatternFile,
  isTaxonomyFile,
  validateJsonFiles,
  walkJsonFiles
};
