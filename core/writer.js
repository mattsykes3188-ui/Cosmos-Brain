'use strict';

// Agents and tasks save through this file. It is the data integrity gate:
// normalize -> validate -> hash -> deduplicate -> save -> update manifest -> log.

const fs = require('fs');
const path = require('path');

const { findDuplicateBrainItem } = require('./deduplicator');
const { createFingerprint } = require('./hash');
const { generateBrainId } = require('./ids');
const { logBrainAction } = require('./logger');
const { TYPE_TO_FOLDER, normalizeBrainType, validateBrainItem } = require('./validator');

function saveBrainItem(item, options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const action = options.action || 'saveBrainItem';
  const normalizedItem = normalizeBrainItem(item);
  const createdAt = normalizedItem && normalizedItem.created_at
    ? normalizedItem.created_at
    : new Date().toISOString().slice(0, 10);

  if (normalizedItem && typeof normalizedItem === 'object' && !Array.isArray(normalizedItem)) {
    normalizedItem.created_at = createdAt;
  }

  const validation = validateBrainItem(normalizedItem);

  if (!validation.valid) {
    logBrainAction({
      action,
      type: normalizedItem && normalizedItem.type,
      id: normalizedItem && normalizedItem.id,
      success: false,
      duplicate: false,
      path: null,
      message: 'Validation failed.',
      errors: validation.errors,
      tokens: options.tokens,
      cost_usd: options.cost_usd
    }, { rootDir });

    return {
      success: false,
      id: normalizedItem && normalizedItem.id ? normalizedItem.id : null,
      path: null,
      duplicate: false,
      errors: validation.errors
    };
  }

  const folderName = TYPE_TO_FOLDER[normalizedItem.type];
  const targetDir = path.join(rootDir, 'data', folderName);
  const fingerprint = createFingerprint(normalizedItem);
  const duplicateCheck = findDuplicateBrainItem({ ...normalizedItem, fingerprint }, targetDir);

  if (duplicateCheck.duplicate) {
    const duplicatePath = duplicateCheck.match.path;
    const duplicateRelativePath = toRelativeDataPath(rootDir, duplicatePath);

    logBrainAction({
      action,
      type: normalizedItem.type,
      id: duplicateCheck.match.id,
      success: false,
      duplicate: true,
      path: duplicateRelativePath,
      message: 'Duplicate item detected.',
      errors: [],
      tokens: options.tokens,
      cost_usd: options.cost_usd
    }, { rootDir });

    return {
      success: false,
      id: duplicateCheck.match.id,
      path: duplicatePath,
      relativePath: duplicateRelativePath,
      duplicate: true,
      fingerprint
    };
  }

  const id = normalizedItem.id || generateBrainId(normalizedItem, options);
  const fileName = `${id}.json`;
  const targetPath = path.join(targetDir, fileName);
  const relativePath = toRelativeDataPath(rootDir, targetPath);

  if (fs.existsSync(targetPath)) {
    const errors = [`File already exists: ${relativePath}`];

    logBrainAction({
      action,
      type: normalizedItem.type,
      id,
      success: false,
      duplicate: false,
      path: relativePath,
      message: 'ID collision detected.',
      errors,
      tokens: options.tokens,
      cost_usd: options.cost_usd
    }, { rootDir });

    return {
      success: false,
      id,
      path: targetPath,
      relativePath,
      duplicate: false,
      errors
    };
  }

  const payload = {
    ...normalizedItem,
    id,
    fingerprint,
    created_at: createdAt
  };

  try {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2), 'utf8');
    updateManifest(targetDir, fileName);

    logBrainAction({
      action,
      type: normalizedItem.type,
      id,
      success: true,
      duplicate: false,
      path: relativePath,
      message: 'Item saved.',
      errors: [],
      tokens: options.tokens,
      cost_usd: options.cost_usd
    }, { rootDir });

    return {
      success: true,
      id,
      path: targetPath,
      relativePath,
      duplicate: false,
      fingerprint
    };
  } catch (error) {
    const errors = [error.message];

    logBrainAction({
      action,
      type: normalizedItem.type,
      id,
      success: false,
      duplicate: false,
      path: relativePath,
      message: 'Save failed.',
      errors,
      tokens: options.tokens,
      cost_usd: options.cost_usd
    }, { rootDir });

    return {
      success: false,
      id,
      path: null,
      duplicate: false,
      errors
    };
  }
}

function normalizeBrainItem(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return item;
  }

  const normalized = { ...item };

  for (const [key, value] of Object.entries(normalized)) {
    if (typeof value === 'string') {
      normalized[key] = value.trim();
    }
  }

  if (typeof normalized.type === 'string') {
    normalized.type = normalizeBrainType(normalized.type);
  }

  return normalized;
}

function updateManifest(targetDir, fileName) {
  const indexPath = path.join(targetDir, 'index.json');
  const manifest = readManifest(indexPath);

  if (!manifest.includes(fileName)) {
    manifest.push(fileName);
  }

  fs.writeFileSync(indexPath, JSON.stringify(manifest, null, 2), 'utf8');
}

function readManifest(indexPath) {
  if (!fs.existsSync(indexPath)) {
    return [];
  }

  try {
    const content = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    return Array.isArray(content) ? content : [];
  } catch (_) {
    return [];
  }
}

function toRelativeDataPath(rootDir, targetPath) {
  return path.relative(rootDir, targetPath).replace(/\\/g, '/');
}

// Compatibility wrapper for older tasks that still call write(item, 'ganchos').
function write(item, type) {
  const singularType = type ? singularizeFolderType(type) : item && item.type;
  return saveBrainItem({
    ...item,
    type: item.type || singularType
  });
}

function singularizeFolderType(type) {
  const folderToType = {
    ganchos: 'gancho',
    chamadas_acao: 'chamada_acao',
    tendencias: 'tendencia',
    dores_mercado: 'dor_mercado',
    narrativas: 'narrativa',
    direcao_visual: 'direcao_visual',
    hooks: 'gancho',
    ctas: 'chamada_acao',
    trends: 'tendencia',
    pain_points: 'dor_mercado',
    storytelling: 'narrativa',
    visual: 'direcao_visual'
  };

  return folderToType[type] || type;
}

module.exports = {
  TYPE_TO_FOLDER,
  normalizeBrainItem,
  readManifest,
  saveBrainItem,
  singularizeFolderType,
  updateManifest,
  write
};
