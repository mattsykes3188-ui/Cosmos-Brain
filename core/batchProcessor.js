'use strict';

const fs = require('fs');
const path = require('path');

const { createShortHash } = require('./hash');
const { formatDate, sanitizeIdPart } = require('./ids');
const { saveBrainItem } = require('./writer');

function processBrainBatch(batch, options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const processedAt = new Date().toISOString();
  const agent = normalizeAgent(batch && batch.agent);
  const sourceType = normalizeSourceType(batch && batch.source_type);
  const batchId = createBatchId(batch, { date: options.date, agent });

  const report = {
    batch_id: batchId,
    agent,
    source_type: sourceType,
    processed_at: processedAt,
    total: Array.isArray(batch && batch.items) ? batch.items.length : 0,
    saved: 0,
    duplicates: 0,
    failed: 0,
    results: [],
    errors: []
  };

  if (!batch || typeof batch !== 'object' || Array.isArray(batch)) {
    report.failed = 1;
    report.errors.push('Batch must be an object.');
    writeBatchLog(report, { rootDir });
    return report;
  }

  if (!Array.isArray(batch.items)) {
    report.failed = 1;
    report.errors.push('batch.items must be an array.');
    writeBatchLog(report, { rootDir });
    return report;
  }

  batch.items.forEach((item, index) => {
    try {
      const enrichedItem = {
        ...item,
        agent,
        source_type: item && item.source_type ? item.source_type : sourceType,
        batch_id: batchId,
        processed_at: processedAt
      };

      const result = saveBrainItem(enrichedItem, {
        ...options,
        rootDir,
        action: 'processBrainBatch'
      });

      const resultEntry = {
        index,
        id: result.id || null,
        type: enrichedItem.type || null,
        success: Boolean(result.success),
        duplicate: Boolean(result.duplicate),
        path: result.relativePath || result.path || null,
        errors: result.errors || []
      };

      report.results.push(resultEntry);

      if (result.success) {
        report.saved++;
      } else if (result.duplicate) {
        report.duplicates++;
      } else {
        report.failed++;
        report.errors.push({
          index,
          id: result.id || null,
          errors: result.errors || ['Unknown save failure.']
        });
      }
    } catch (error) {
      report.failed++;
      report.results.push({
        index,
        id: item && item.id ? item.id : null,
        type: item && item.type ? item.type : null,
        success: false,
        duplicate: false,
        path: null,
        errors: [error.message]
      });
      report.errors.push({
        index,
        id: item && item.id ? item.id : null,
        errors: [error.message]
      });
    }
  });

  writeBatchLog(report, { rootDir });

  return report;
}

function createBatchId(batch, options = {}) {
  const agent = sanitizeIdPart(options.agent || normalizeAgent(batch && batch.agent));
  const date = formatDate(options.date || new Date());
  const hash = createShortHash({
    type: 'batch',
    product: agent,
    objective: normalizeSourceType(batch && batch.source_type),
    style: String(Array.isArray(batch && batch.items) ? batch.items.length : 0),
    text: JSON.stringify(batch && batch.items ? batch.items : [])
  });

  return `${agent}_${date}_${hash}`;
}

function normalizeAgent(agent) {
  return String(agent || 'UNKNOWN_AGENT').trim() || 'UNKNOWN_AGENT';
}

function normalizeSourceType(sourceType) {
  return String(sourceType || 'manual').trim() || 'manual';
}

function writeBatchLog(report, options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const today = new Date().toISOString().slice(0, 10);
  const logDir = path.join(rootDir, 'logs', 'batches');
  const logPath = path.join(logDir, `batch_${today}.json`);

  fs.mkdirSync(logDir, { recursive: true });

  const logs = readBatchLog(logPath);
  logs.push(report);

  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2), 'utf8');

  return logPath;
}

function readBatchLog(logPath) {
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
  createBatchId,
  processBrainBatch,
  writeBatchLog
};
