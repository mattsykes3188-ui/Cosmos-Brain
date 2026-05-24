'use strict';

const fs = require('fs');
const path = require('path');

function log(operation, result) {
  const today = new Date().toISOString().slice(0, 10);
  const logDir = path.join(__dirname, '..', 'logs');
  const logPath = path.join(logDir, `log_${today}.json`);

  const entry = {
    timestamp: new Date().toISOString(),
    operation,
    status: result.status,
    item_id: result.item_id || null,
    errors: result.errors || []
  };

  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  let logs = [];
  if (fs.existsSync(logPath)) {
    try {
      logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    } catch (_) {
      logs = [];
    }
  }

  logs.push(entry);
  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2), 'utf-8');

  return entry;
}

module.exports = { log };
