'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const { validateDataIntegrity } = require('./validate_data_integrity');
const { validateJsonFiles } = require('./validate_json_files');
const { validateManifests } = require('./validate_manifests');

const PRE_VALIDATION_SCRIPTS = [
  'tests/test_seed_approved_patterns.js',
  'scripts/build_padroes_locucao_index.js',
  'scripts/build_padroes_locucao_coverage_report.js'
];

const TEST_FILES = [
  'tests/test_validator.js',
  'tests/test_writer.js',
  'tests/test_deduplicator.js',
  'tests/test_batchProcessor.js',
  'tests/test_brain_consumption_layer.js',
  'tests/test_brain_powered_midia_suggestions.js',
  'tests/test_creative_direction_layer.js',
  'tests/test_research_export_importer.js',
  'tests/test_research_documents_structure.js',
  'tests/test_assisted_semantic_extraction.js',
  'tests/test_manual_gpt_semantic_bridge.js',
  'tests/test_semantic_naming_layer.js',
  'tests/test_padrao_locucao.js',
  'tests/test_video_audio_extraction.js',
  'tests/test_whisper_transcription.js',
  'tests/test_whisper_quality_tuning.js',
  'tests/test_video_intelligence_workflow_automation.js',
  'tests/test_video_intelligence_simplified_ui.js',
  'tests/test_ultra_simplified_brain_intake_ui.js',
  'tests/test_transcription_curation.js',
  'tests/test_manual_pattern_extraction.js',
  'tests/test_pattern_review_promotion.js',
  'tests/test_padroes_locucao_index.js',
  'tests/test_padroes_locucao_coverage_report.js',
  'tests/test_semantic_query.js',
  'tests/test_semantic_query_report.js',
  'tests/test_semantic_query_batch_reports.js',
  'tests/test_semantic_query_batch_summary.js',
  'tests/test_semantic_knowledge_gap_backlog.js',
  'tests/test_semantic_knowledge_expansion_plan.js',
  'tests/test_taxonomia.js'
];

function runPrePushValidation(options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const startedAt = Date.now();
  const errors = [];
  const warnings = [];
  const testResults = [];
  const validationResults = [];

  if (options.runTests !== false) {
    for (const setupFile of PRE_VALIDATION_SCRIPTS) {
      const result = runNodeScript(rootDir, setupFile);
      testResults.push(result);

      if (!result.success) {
        errors.push({
          file: setupFile,
          message: 'Pre-validation script failed.',
          stdout: result.stdout,
          stderr: result.stderr
        });
      }
    }

    for (const testFile of TEST_FILES) {
      const result = runNodeScript(rootDir, testFile);
      testResults.push(result);

      if (!result.success) {
        errors.push({
          file: testFile,
          message: 'Test failed.',
          stdout: result.stdout,
          stderr: result.stderr
        });
      }
    }
  }

  const validations = [
    { name: 'validate_manifests', run: () => validateManifests({ rootDir }) },
    { name: 'validate_json_files', run: () => validateJsonFiles({ rootDir }) },
    { name: 'validate_data_integrity', run: () => validateDataIntegrity({ rootDir }) }
  ];

  for (const validation of validations) {
    try {
      const result = validation.run();
      validationResults.push({ name: validation.name, ...result });

      if (!result.success) {
        for (const error of result.errors) {
          errors.push({
            validation: validation.name,
            ...error
          });
        }
      }

      for (const warning of result.warnings || []) {
        warnings.push({
          validation: validation.name,
          ...warning
        });
      }
    } catch (error) {
      validationResults.push({
        name: validation.name,
        success: false,
        errors: [{ message: error.message }],
        warnings: [],
        checked_files: 0
      });
      errors.push({
        validation: validation.name,
        message: error.message
      });
    }
  }

  const durationMs = Date.now() - startedAt;
  const testsPassed = testResults.every((result) => result.success);
  const validationsPassed = validationResults.every((result) => result.success);
  const checkedFiles = validationResults.reduce((sum, result) => sum + (result.checked_files || 0), 0);
  const success = errors.length === 0 && testsPassed && validationsPassed;

  const report = {
    timestamp: new Date().toISOString(),
    success,
    tests_passed: testsPassed,
    validations_passed: validationsPassed,
    errors,
    warnings,
    checked_files: checkedFiles,
    duration_ms: durationMs,
    tests: testResults.map((result) => ({
      file: result.file,
      success: result.success,
      exit_code: result.exit_code
    })),
    validations: validationResults.map((result) => ({
      name: result.name,
      success: result.success,
      checked_files: result.checked_files || 0,
      errors: result.errors || [],
      warnings: result.warnings || []
    }))
  };

  if (options.writeLog !== false) {
    report.log_path = writePushSafetyLog(rootDir, report);
  }

  return report;
}

function runNodeScript(rootDir, scriptPath) {
  const absolutePath = path.join(rootDir, scriptPath);

  if (!fs.existsSync(absolutePath)) {
    return {
      file: scriptPath,
      success: false,
      exit_code: null,
      stdout: '',
      stderr: 'Script not found.'
    };
  }

  const result = spawnSync(process.execPath, [absolutePath], {
    cwd: rootDir,
    encoding: 'utf8'
  });

  return {
    file: scriptPath,
    success: result.status === 0,
    exit_code: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

function writePushSafetyLog(rootDir, report) {
  const today = new Date().toISOString().slice(0, 10);
  const logDir = path.join(rootDir, 'logs', 'push_safety');
  const logPath = path.join(logDir, `push_validation_${today}.json`);
  fs.mkdirSync(logDir, { recursive: true });

  const logs = readJsonArray(logPath);
  logs.push({
    timestamp: report.timestamp,
    success: report.success,
    tests_passed: report.tests_passed,
    validations_passed: report.validations_passed,
    errors: report.errors,
    warnings: report.warnings,
    checked_files: report.checked_files,
    duration_ms: report.duration_ms
  });

  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2), 'utf8');

  return path.relative(rootDir, logPath).replace(/\\/g, '/');
}

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function printReport(report) {
  if (report.success) {
    console.log('✅ Todos os testes passaram');
    console.log('✅ Todos os manifests válidos');
    console.log('✅ Integridade do banco confirmada');
    console.log('✅ Push seguro para execução');
    console.log(`Arquivos verificados: ${report.checked_files}`);
    console.log(`Log: ${report.log_path}`);
    return;
  }

  console.error('❌ Push bloqueado');
  console.error(`Erros: ${report.errors.length}`);
  for (const error of report.errors.slice(0, 20)) {
    const location = error.file || error.validation || 'pre_push_validation';
    console.error(`- ${location}: ${error.message}`);
  }
  console.error(`Log: ${report.log_path}`);
}

if (require.main === module) {
  const report = runPrePushValidation();
  printReport(report);
  process.exit(report.success ? 0 : 1);
}

module.exports = {
  PRE_VALIDATION_SCRIPTS,
  TEST_FILES,
  printReport,
  runNodeScript,
  runPrePushValidation,
  writePushSafetyLog
};
