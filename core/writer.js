'use strict';

// Agents and tasks should call this module instead of writing directly to data/.
// The core validates, identifies, saves, updates the manifest and logs the action.

const fs = require('fs');
const path = require('path');

const { createFingerprint } = require('./hash');
const { generateBrainId } = require('./ids');
const { logBrainAction } = require('./logger');
const { validateBrainItem } = require('./validator');

const TYPE_TO_FOLDER = {
  hook: 'hooks',
  cta: 'ctas',
  trend: 'trends',
  pain_point: 'pain_points',
  storytelling: 'storytelling',
  visual: 'visual'
};

function saveBrainItem(item, options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const action = options.action || 'saveBrainItem';
  const validation = validateBrainItem(item);

  if (!validation.valid) {
    logBrainAction({
      action,
      type: item && item.type,
      id: item && item.id,
      success: false,
      message: 'Validation failed.',
      path: null,
      errors: validation.errors
    }, { rootDir });

    return {
      success: false,
      id: item && item.id ? item.id : null,
      path: null,
      errors: validation.errors
    };
  }

  const folderName = TYPE_TO_FOLDER[item.type];

  if (!folderName) {
    const errors = [`Unsupported type: ${item.type}`];

    logBrainAction({
      action,
      type: item.type,
      id: item.id,
      success: false,
      message: 'Unsupported item type.',
      path: null,
      errors
    }, { rootDir });

    return {
      success: false,
      id: item.id || null,
      path: null,
      errors
    };
  }

  const fingerprint = createFingerprint(item);
  const id = item.id || generateBrainId(item, options);
  const createdAt = item.created_at || new Date().toISOString().slice(0, 10);
  const fileName = `${id}.json`;
  const targetDir = path.join(rootDir, 'data', folderName);
  const targetPath = path.join(targetDir, fileName);
  const relativePath = path.join('data', folderName, fileName).replace(/\\/g, '/');

  const payload = {
    ...item,
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
      type: item.type,
      id,
      success: true,
      message: 'Item saved.',
      path: relativePath,
      errors: []
    }, { rootDir });

    return {
      success: true,
      id,
      path: targetPath,
      relativePath,
      fingerprint
    };
  } catch (error) {
    const errors = [error.message];

    logBrainAction({
      action,
      type: item.type,
      id,
      success: false,
      message: 'Save failed.',
      path: relativePath,
      errors
    }, { rootDir });

    return {
      success: false,
      id,
      path: null,
      errors
    };
  }
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

// Compatibility wrapper for older tasks that still call write(item, 'hooks').
function write(item, type) {
  const singularType = type ? type.replace(/s$/, '') : item && item.type;
  return saveBrainItem({
    ...item,
    type: item.type || singularType
  });
}

module.exports = {
  TYPE_TO_FOLDER,
  saveBrainItem,
  updateManifest,
  write
};
