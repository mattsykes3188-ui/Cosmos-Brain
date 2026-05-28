'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

function assertDirectory(relativePath, message) {
  const absolutePath = path.join(rootDir, relativePath);
  assert.ok(fs.existsSync(absolutePath), `${message}: ${relativePath}`);
  assert.ok(fs.statSync(absolutePath).isDirectory(), `${relativePath} must be a directory`);
}

function assertFile(relativePath, message) {
  const absolutePath = path.join(rootDir, relativePath);
  assert.ok(fs.existsSync(absolutePath), `${message}: ${relativePath}`);
  assert.ok(fs.statSync(absolutePath).isFile(), `${relativePath} must be a file`);
}

assertDirectory('research_documents', 'research documents root exists');
assertDirectory('research_documents/raw', 'raw research documents folder exists');
assertDirectory('research_documents/processed', 'processed research documents folder exists');
assertFile('research_documents/README.md', 'research documents README exists');
assertFile('research_documents/raw/.gitkeep', 'raw folder stays tracked');
assertFile('research_documents/processed/.gitkeep', 'processed folder stays tracked');

assertDirectory('research_exports', 'structured research exports remain separated');
assertDirectory('research_staging', 'research staging remains separated');
assertDirectory('research_imported', 'research imported remains separated');
assertDirectory('research_rejected', 'research rejected remains separated');

assertDirectory('data/research_library', 'research library exists');
assertDirectory('data/research_library/approved', 'root approved library folder exists');
assertDirectory('data/research_library/draft', 'root draft library folder exists');
assertDirectory('data/research_library/indexes', 'root indexes library folder exists');
assertFile('data/research_library/approved/.gitkeep', 'approved root folder stays tracked');
assertFile('data/research_library/draft/.gitkeep', 'draft root folder stays tracked');
assertFile('data/research_library/indexes/.gitkeep', 'indexes root folder stays tracked');

assertFile('docs/architecture/RESEARCH_DOCUMENTS_STRUCTURE.md', 'architecture document exists');

const importerSource = fs.readFileSync(path.join(rootDir, 'core', 'researchExportImporter.js'), 'utf8');
assert.ok(!importerSource.includes('research_documents'), 'research document layer does not change importer behavior');
assert.ok(fs.existsSync(path.join(rootDir, 'index.html')), 'dashboard principal remains intact');

console.log('test_research_documents_structure: 21 passed');
