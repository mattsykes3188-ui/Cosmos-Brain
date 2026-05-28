'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  buildResearchIndexes,
  detectDuplicateResearchExport,
  generateResearchImportId,
  importResearchExports,
  loadResearchExports,
  normalizeResearchExport,
  validateResearchExport
} = require('../core/researchExportImporter');

const repoRoot = path.join(__dirname, '..');
const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cosmos-research-importer-'));

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

function setupTaxonomy() {
  const taxonomyDir = path.join(rootDir, 'data', 'taxonomia');
  const taxonomies = {
    'segmentos.json': ['pesca', 'agro'],
    'objetivos_comerciais.json': ['gerar_lead', 'converter_whatsapp'],
    'tipos_hook.json': ['autoridade', 'dor_direta'],
    'estruturas_narrativas.json': ['demonstracao_produto', 'prova_visual'],
    'tons_emocionais.json': ['premium', 'direto'],
    'tipos_cta.json': ['chamar_whatsapp', 'conhecer_modelos'],
    'estilos_visuais.json': ['premium_clean', 'fabrica_real'],
    'formatos_conteudo.json': ['reel', 'carrossel']
  };

  for (const [filename, ids] of Object.entries(taxonomies)) {
    writeJson(path.join(taxonomyDir, filename), ids.map((id) => ({
      id,
      label: id,
      descricao: id,
      categoria: 'teste',
      sinonimos: [],
      exemplos: [],
      relacionados: [],
      status: 'active'
    })));
  }
}

function validExport(overrides = {}) {
  return {
    type: 'market_signal',
    status: 'approved',
    title: 'Pesca premium com autoridade',
    insight: 'Conteudos de pesca geram lead quando combinam autoridade e demonstracao do produto.',
    source: {
      kind: 'cosmos_research',
      chat: 'radar_mercado'
    },
    segmento: 'pesca',
    objetivo_comercial: 'gerar_lead',
    hook_type: 'autoridade',
    estrutura_narrativa: 'demonstracao_produto',
    tom_emocional: 'premium',
    tipo_cta: 'chamar_whatsapp',
    estilo_visual: 'premium_clean',
    formato_conteudo: 'reel',
    created_at: '2026-05-27T00:00:00.000Z',
    tags: ['pesca', 'lead'],
    ...overrides
  };
}

setupTaxonomy();

const exportsDir = path.join(rootDir, 'research_exports');
writeJson(path.join(exportsDir, 'valid_approved.json'), validExport());
writeJson(path.join(exportsDir, 'valid_draft.json'), validExport({
  status: 'draft',
  title: 'Draft visual de pesca',
  insight: 'Referencia ainda em curadoria para videos de pesca.',
  source: 'analise_visual'
}));
writeJson(path.join(exportsDir, 'invalid_missing_type.json'), {
  status: 'approved',
  title: 'Sem tipo',
  insight: 'Deve ser rejeitado.',
  source: 'teste'
});
writeJson(path.join(exportsDir, 'duplicate.json'), validExport());

assert.strictEqual(loadResearchExports({ rootDir }).length, 4, 'loads JSON exports');
assert.strictEqual(validateResearchExport(validExport(), { rootDir }).valid, true, 'valid export passes validation');
assert.strictEqual(validateResearchExport(validExport({ segmento: 'invalido' }), { rootDir }).valid, false, 'invalid taxonomy fails validation');

const normalized = normalizeResearchExport(validExport(), { rootDir });
assert.strictEqual(normalized.valid, true, 'normalization succeeds');
assert.ok(normalized.item.id.startsWith('research_market_signal_20260527_'), 'predictable id is generated');
assert.strictEqual(generateResearchImportId(normalized.item), normalized.item.id, 'id generation is deterministic');

const importResult = importResearchExports({ rootDir });
assert.strictEqual(importResult.total, 4, 'imports all exports from queue');
assert.strictEqual(importResult.imported, 2, 'imports valid approved and draft exports');
assert.strictEqual(importResult.rejected, 2, 'rejects invalid and duplicate exports');
assert.strictEqual(importResult.duplicates, 1, 'detects duplicate exports');

const libraryDir = path.join(rootDir, 'data', 'research_library');
const index = JSON.parse(fs.readFileSync(path.join(libraryDir, 'index.json'), 'utf8'));
const draftsIndex = JSON.parse(fs.readFileSync(path.join(libraryDir, 'drafts_index.json'), 'utf8'));

assert.strictEqual(index.type, 'research_library_index', 'approved index is generated');
assert.strictEqual(index.approved, 1, 'approved index only contains approved items');
assert.strictEqual(index.drafts, 1, 'draft count is tracked');
assert.ok(index.items.every((item) => item.status === 'approved'), 'Midia-facing index does not expose drafts');
assert.strictEqual(draftsIndex.total, 1, 'drafts stay separated');

const approvedFiles = fs.readdirSync(path.join(libraryDir, 'market_signals', 'approved')).filter((name) => name.endsWith('.json'));
const draftFiles = fs.readdirSync(path.join(libraryDir, 'market_signals', 'draft')).filter((name) => name.endsWith('.json'));
assert.strictEqual(approvedFiles.length, 1, 'approved file is stored in approved folder');
assert.strictEqual(draftFiles.length, 1, 'draft file is stored in draft folder');

const duplicateCheck = detectDuplicateResearchExport(normalized.item, { rootDir });
assert.strictEqual(duplicateCheck.duplicate, true, 'duplicate check finds imported item');

const rebuilt = buildResearchIndexes({ rootDir });
assert.strictEqual(rebuilt.index.counts.by_type.market_signal, 1, 'index by type is generated');
assert.strictEqual(rebuilt.index.counts.by_segmento.pesca, 1, 'index by segment is generated');
assert.strictEqual(rebuilt.index.counts.by_objetivo.gerar_lead, 1, 'index by objective is generated');
assert.strictEqual(rebuilt.index.counts.by_hook.autoridade, 1, 'index by hook is generated');
assert.strictEqual(rebuilt.index.counts.by_visual.premium_clean, 1, 'index by visual is generated');
assert.strictEqual(rebuilt.index.counts.by_narrativa.demonstracao_produto, 1, 'index by narrative is generated');
assert.ok(fs.existsSync(path.join(rootDir, 'reports', 'research_import_report.md')), 'import report is generated');

const source = fs.readFileSync(path.join(repoRoot, 'core', 'researchExportImporter.js'), 'utf8').toLowerCase();
assert.ok(!source.includes('openai'), 'no external AI is used');
assert.ok(!source.includes('embedding'), 'no embeddings are implemented');
assert.ok(fs.existsSync(path.join(repoRoot, 'index.html')), 'dashboard principal remains intact');

fs.rmSync(rootDir, { recursive: true, force: true });

console.log('test_research_export_importer: 31 passed');
