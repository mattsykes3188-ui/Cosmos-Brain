'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  buildSemanticBaseName,
  buildSemanticFilename,
  getNextSemanticSequence,
  normalizeSemanticFilename,
  slugifySemanticPart
} = require('../core/semanticNaming');
const {
  CURATED_TRANSCRIPTIONS_DIR,
  PATTERNS_DIR,
  salvarPadraoLocucao
} = require('../tools/video-intelligence/server');

const rootDir = path.join(__dirname, '..');
const tempDir = path.join(rootDir, 'tmp_semantic_naming_test');
const curatedFixtureName = 'WhatsApp-Video-2026-05-26-at-23-27-44_curada.txt';
const curatedFixturePath = path.join(CURATED_TRANSCRIPTIONS_DIR, curatedFixtureName);
const semanticPrefix = 'pesca_autoridade_demonstracao_produto_';

function cleanup() {
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.rmSync(curatedFixturePath, { force: true });

  if (fs.existsSync(PATTERNS_DIR)) {
    for (const filename of fs.readdirSync(PATTERNS_DIR)) {
      if (filename.startsWith(semanticPrefix) && filename.endsWith('.json')) {
        fs.rmSync(path.join(PATTERNS_DIR, filename), { force: true });
      }
    }
  }
}

function validPayload(overrides = {}) {
  return {
    sourceFilename: curatedFixtureName,
    titulo: 'Padrao semantico de pesca',
    segmento: 'pesca',
    tipo_dor: 'baixa_percepcao_premium',
    hook_type: 'autoridade',
    estrutura_narrativa: 'demonstracao_produto',
    tom_emocional: 'premium',
    tipo_cta: 'chamar_whatsapp',
    formato_conteudo: 'reel',
    estilo_visual: 'fabrica_real',
    objetivo_comercial: 'gerar_lead',
    observacoes: 'Teste de naming semantico preservando o arquivo original.',
    ...overrides
  };
}

cleanup();
fs.mkdirSync(tempDir, { recursive: true });
fs.mkdirSync(CURATED_TRANSCRIPTIONS_DIR, { recursive: true });
fs.writeFileSync(curatedFixturePath, 'Transcricao curada de teste para nome semantico.', 'utf8');

assert.strictEqual(slugifySemanticPart('Pescá Premium CTA WhatsApp'), 'pesca_premium_cta_whatsapp');
assert.strictEqual(slugifySemanticPart('  Demonstração  Produto  '), 'demonstracao_produto');

assert.strictEqual(
  buildSemanticBaseName(validPayload()),
  'pesca_autoridade_demonstracao_produto_gerar_lead',
  'base name uses the four priority semantic fields'
);
assert.strictEqual(buildSemanticBaseName({ segmento: 'pesca', objetivo_comercial: 'gerar_lead' }), 'pesca_gerar_lead');

assert.strictEqual(getNextSemanticSequence('pesca_autoridade_demonstracao_produto_gerar_lead', tempDir), '001');
fs.writeFileSync(path.join(tempDir, 'pesca_autoridade_demonstracao_produto_gerar_lead_001.json'), '{}', 'utf8');
assert.strictEqual(getNextSemanticSequence('pesca_autoridade_demonstracao_produto_gerar_lead', tempDir), '002');
assert.strictEqual(buildSemanticFilename(validPayload(), tempDir), 'pesca_autoridade_demonstracao_produto_gerar_lead_002.json');
assert.strictEqual(normalizeSemanticFilename('Pescá Autoridade Demonstração 001.json'), 'pesca_autoridade_demonstracao_001.json');

const first = salvarPadraoLocucao(validPayload());
const second = salvarPadraoLocucao(validPayload());
const firstPayload = JSON.parse(fs.readFileSync(first.absolutePath, 'utf8'));

assert.strictEqual(first.filename, 'pesca_autoridade_demonstracao_produto_gerar_lead_001.json');
assert.strictEqual(second.filename, 'pesca_autoridade_demonstracao_produto_gerar_lead_002.json');
assert.notStrictEqual(first.filename, second.filename, 'semantic filenames do not duplicate');
assert.strictEqual(firstPayload.source.originalFilename, curatedFixtureName, 'source.originalFilename preserves raw source name');
assert.strictEqual(firstPayload.source.filename, curatedFixtureName, 'legacy source filename remains available');
assert.ok(!first.filename.includes('WhatsApp-Video'), 'semantic filename does not use raw WhatsApp filename');

cleanup();

console.log('test_semantic_naming_layer: 13 passed');
