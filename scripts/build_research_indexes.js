'use strict';

const { buildResearchIndexes, ensureResearchDirectories } = require('../core/researchExportImporter');

function main() {
  ensureResearchDirectories(process.cwd());
  const result = buildResearchIndexes();

  console.log('Research indexes gerados.');
  console.log(`Approved consumiveis: ${result.index.approved}`);
  console.log(`Drafts separados: ${result.index.drafts}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  main
};
