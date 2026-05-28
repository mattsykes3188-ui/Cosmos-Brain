'use strict';

const fs = require('fs');
const path = require('path');

const {
  formatQueryResult,
  getAllowedSemanticFilters,
  queryApprovedPatterns,
  saveSemanticQueryReport
} = require('../core/semanticQuery');

function parseArgs(argv = process.argv.slice(2)) {
  const allowedFilters = new Set(getAllowedSemanticFilters());
  const filters = {};
  let save = false;
  let report = false;

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    if (arg === '--save') {
      save = true;
      continue;
    }

    if (arg === '--report') {
      report = true;
      continue;
    }

    if (!arg.startsWith('--')) {
      throw new Error(`Argumento invalido: ${arg}`);
    }

    const field = arg.slice(2);

    if (!allowedFilters.has(field)) {
      throw new Error(`Filtro desconhecido: ${field}. Filtros permitidos: ${[...allowedFilters].join(', ')}`);
    }

    const value = argv[index + 1];

    if (!value || value.startsWith('--')) {
      throw new Error(`Filtro sem valor: ${field}`);
    }

    filters[field] = value;
    index++;
  }

  return {
    filters,
    report,
    save
  };
}

function runCli(argv = process.argv.slice(2), options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const parsed = parseArgs(argv);
  const result = formatQueryResult(queryApprovedPatterns(parsed.filters, { rootDir }));

  printResult(result);

  if (parsed.save) {
    result.savedTo = saveQueryResult(rootDir, result);
    console.log(`Resultado salvo em: ${result.savedTo}`);
  }

  if (parsed.report) {
    const report = saveSemanticQueryReport(parsed.filters, result, { rootDir });
    result.reportSavedTo = report.path;
    console.log(`Relatorio salvo em: ${report.path}`);
  }

  return result;
}

function printResult(result) {
  console.log(JSON.stringify(result, null, 2));

  if (result.total === 0) {
    console.log('Nenhum padrao aprovado encontrado para os filtros informados.');
  }
}

function saveQueryResult(rootDir, result) {
  const reportPath = path.join(rootDir, 'reports', 'padroes_locucao_query_result.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2), 'utf8');
  return path.relative(rootDir, reportPath).replace(/\\/g, '/');
}

if (require.main === module) {
  try {
    runCli();
  } catch (error) {
    console.error(`Erro: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  printResult,
  runCli,
  saveQueryResult
};
