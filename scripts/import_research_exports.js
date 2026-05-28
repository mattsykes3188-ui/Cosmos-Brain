'use strict';

const { importResearchExports } = require('../core/researchExportImporter');

function main() {
  const result = importResearchExports();

  console.log('Research exports importados.');
  console.log(`Total: ${result.total}`);
  console.log(`Importados: ${result.imported}`);
  console.log(`Rejeitados: ${result.rejected}`);
  console.log(`Duplicados: ${result.duplicates}`);
  console.log(`Relatorio: ${result.reportPath}`);

  if (!result.success) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  main
};
