'use strict';

const fs = require('fs');
const path = require('path');

const {
  getBatchReportGroups,
  saveBatchSemanticQueryReports
} = require('../core/semanticQuery');

function parseArgs(argv = process.argv.slice(2)) {
  let groupName = null;
  let all = false;

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    if (arg === '--all') {
      all = true;
      continue;
    }

    if (arg === '--group') {
      const value = argv[index + 1];

      if (!value || value.startsWith('--')) {
        throw new Error('Informe um grupo apos --group.');
      }

      groupName = value;
      index++;
      continue;
    }

    throw new Error(`Argumento invalido: ${arg}`);
  }

  if (all && groupName) {
    throw new Error('Use --all ou --group, nao ambos.');
  }

  if (!all && !groupName) {
    throw new Error('Informe --all ou --group <nome_do_grupo>.');
  }

  return {
    all,
    groupName
  };
}

function runCli(argv = process.argv.slice(2), options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const parsed = parseArgs(argv);
  const groupNames = parsed.all ? getBatchReportGroups() : [parsed.groupName];
  const results = [];

  for (const groupName of groupNames) {
    results.push(saveBatchSemanticQueryReports(groupName, { rootDir }));
  }

  const indexResult = saveBatchIndex(results, { rootDir });
  const totalReports = results.reduce((sum, result) => sum + result.total, 0);

  console.log(`OK semantic query batch reports: ${totalReports} report(s) generated.`);
  console.log(`Batch index: ${indexResult.path}`);

  return {
    success: true,
    groups: results.map((result) => result.groupName),
    totalReports,
    results,
    index: indexResult
  };
}

function saveBatchIndex(batchResults, options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const indexPath = options.indexPath || path.join(rootDir, 'reports', 'semantic_queries', 'batch', 'index.md');
  const content = buildBatchIndexMarkdown(batchResults);

  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, content, 'utf8');

  return {
    success: true,
    path: path.relative(rootDir, indexPath).replace(/\\/g, '/')
  };
}

function buildBatchIndexMarkdown(batchResults) {
  const generatedAt = new Date().toISOString();
  const groups = batchResults.map((result) => result.groupName);
  const paths = batchResults.flatMap((result) => result.reports.map((report) => report.path));
  const lines = [
    '# Índice de Relatórios Semânticos em Lote',
    '',
    `- Data de geração: ${generatedAt}`,
    `- Grupos gerados: ${groups.join(', ')}`,
    `- Total de relatórios gerados: ${paths.length}`,
    '',
    '## Arquivos',
    ''
  ];

  for (const filePath of paths.sort()) {
    lines.push(`- ${filePath}`);
  }

  lines.push('');
  lines.push('> Relatórios derivados de `data/biblioteca_anuncios/padroes_locucao/index.json`.');
  lines.push('> Eles podem ser regenerados a qualquer momento pelo script de batch.');

  return `${lines.join('\n')}\n`;
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
  buildBatchIndexMarkdown,
  parseArgs,
  runCli,
  saveBatchIndex
};
