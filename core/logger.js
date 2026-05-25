'use strict';

const fs = require('fs');
const path = require('path');

function logBrainAction(entry, options = {}) {
  const timestamp = new Date().toISOString();
  const today = timestamp.slice(0, 10);
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const logDir = path.join(rootDir, 'logs');
  const logPath = path.join(logDir, `log_${today}.json`);

  const normalizedEntry = {
    timestamp,
    action: entry.action || 'saveBrainItem',
    type: entry.type || null,
    id: entry.id || null,
    success: Boolean(entry.success),
    message: entry.message || '',
    path: entry.path || null,
    errors: Array.isArray(entry.errors) ? entry.errors : []
  };

  fs.mkdirSync(logDir, { recursive: true });

  const logs = readExistingLogs(logPath);
  logs.push(normalizedEntry);

  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2), 'utf8');

  return {
    entry: normalizedEntry,
    path: logPath
  };
}

function readExistingLogs(logPath) {
  if (!fs.existsSync(logPath)) {
    return [];
  }

  try {
    const content = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    return Array.isArray(content) ? content : [];
  } catch (_) {
    return [];
  }
}

module.exports = {
  logBrainAction
};
