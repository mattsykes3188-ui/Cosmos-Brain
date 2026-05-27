'use strict';

const fs = require('fs');
const path = require('path');

const REQUIRED_MANIFEST_DIRS = [
  'data/ganchos',
  'data/tendencias',
  'data/chamadas_acao',
  'data/biblioteca_anuncios',
  'data/estrategia_mateus'
];

function validateManifests(options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const dataDir = path.join(rootDir, 'data');
  const errors = [];
  const warnings = [];
  const checkedFiles = [];

  for (const relativeDir of REQUIRED_MANIFEST_DIRS) {
    const indexPath = path.join(rootDir, relativeDir, 'index.json');
    if (!fs.existsSync(indexPath)) {
      errors.push({
        file: toSlash(path.join(relativeDir, 'index.json')),
        message: 'Required manifest not found.'
      });
    }
  }

  if (!fs.existsSync(dataDir)) {
    errors.push({ file: 'data', message: 'data directory not found.' });
    return buildResult(errors, warnings, checkedFiles);
  }

  for (const indexPath of findIndexFiles(dataDir)) {
    const relativeIndexPath = toRelative(rootDir, indexPath);
    if (isGeneratedStrategicIndex(relativeIndexPath)) {
      continue;
    }

    checkedFiles.push(relativeIndexPath);
    validateManifestFile(rootDir, indexPath, errors);
  }

  return buildResult(errors, warnings, checkedFiles);
}

function isGeneratedStrategicIndex(relativePath) {
  return relativePath === 'data/biblioteca_anuncios/padroes_locucao/index.json';
}

function validateManifestFile(rootDir, indexPath, errors) {
  const relativeIndexPath = toRelative(rootDir, indexPath);
  let entries;

  try {
    entries = JSON.parse(fs.readFileSync(indexPath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    errors.push({ file: relativeIndexPath, message: `Invalid manifest JSON: ${error.message}` });
    return;
  }

  if (!Array.isArray(entries)) {
    errors.push({ file: relativeIndexPath, message: 'Manifest must contain an array.' });
    return;
  }

  const seen = new Set();
  const baseDir = path.dirname(indexPath);

  for (const entry of entries) {
    if (typeof entry !== 'string' || entry.trim() === '') {
      errors.push({ file: relativeIndexPath, message: 'Manifest entry must be a non-empty string.' });
      continue;
    }

    if (seen.has(entry)) {
      errors.push({ file: relativeIndexPath, message: `Duplicate manifest entry: ${entry}` });
    }
    seen.add(entry);

    if (path.isAbsolute(entry) || entry.includes('..')) {
      errors.push({ file: relativeIndexPath, message: `Unsafe manifest entry: ${entry}` });
      continue;
    }

    if (path.basename(entry) === 'index.json') {
      errors.push({ file: relativeIndexPath, message: `Circular manifest reference: ${entry}` });
      continue;
    }

    const targetPath = path.resolve(baseDir, entry);
    if (!targetPath.startsWith(path.resolve(baseDir))) {
      errors.push({ file: relativeIndexPath, message: `Manifest entry escapes folder: ${entry}` });
      continue;
    }

    if (!fs.existsSync(targetPath)) {
      errors.push({ file: relativeIndexPath, message: `Listed file does not exist: ${entry}` });
      continue;
    }

    if (!fs.statSync(targetPath).isFile()) {
      errors.push({ file: relativeIndexPath, message: `Manifest entry is not a file: ${entry}` });
    }
  }
}

function findIndexFiles(dir) {
  const files = [];

  for (const name of fs.readdirSync(dir)) {
    const filePath = path.join(dir, name);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      files.push(...findIndexFiles(filePath));
    } else if (name === 'index.json') {
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

function toSlash(value) {
  return value.replace(/\\/g, '/');
}

if (require.main === module) {
  const result = validateManifests();
  printResult('manifests', result);
  process.exit(result.success ? 0 : 1);
}

function printResult(label, result) {
  if (result.success) {
    console.log(`OK ${label}: ${result.checked_files} manifests checked.`);
    return;
  }

  console.error(`FAIL ${label}: ${result.errors.length} error(s).`);
  for (const error of result.errors) {
    console.error(`- ${error.file}: ${error.message}`);
  }
}

module.exports = {
  REQUIRED_MANIFEST_DIRS,
  findIndexFiles,
  isGeneratedStrategicIndex,
  validateManifests
};
