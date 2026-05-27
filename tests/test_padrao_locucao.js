'use strict';

const fs = require('fs');
const path = require('path');

const { validateBrainItem } = require('../core/validator');
const { saveBrainItem } = require('../core/writer');

const testRoot = path.join(__dirname, '.tmp_padrao_locucao');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  OK ${label}`);
    passed++;
  } else {
    console.log(`  FAIL ${label}`);
    failed++;
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function validPadraoLocucao(overrides = {}) {
  return {
    type: 'padrao_locucao',
    source: 'teste_manual',
    plataforma: 'instagram',
    produto: 'uniforme corporativo',
    abertura: 'comeca com pergunta direta sobre imagem profissional',
    estrutura: 'dor -> promessa -> prova visual -> CTA',
    promessa: 'empresa mais profissional atraves do uniforme',
    dor_principal: 'empresa parecer desorganizada por falta de padronizacao visual',
    objecao_atacada: 'medo de investir em uniforme e nao perceber valor',
    tom: 'direto e comercial',
    ritmo: 'rapido',
    cta: 'chamar no WhatsApp para orcamento',
    strength: 5,
    text: 'Padrao de locucao focado em transformar percepcao visual em argumento de venda.',
    context: 'Usar para criar roteiros proprios sobre uniformizacao empresarial sem copiar frases originais.',
    created_at: '2026-05-26',
    ...overrides
  };
}

function resetTestRoot() {
  fs.rmSync(testRoot, { recursive: true, force: true });
  fs.mkdirSync(testRoot, { recursive: true });
}

function finish() {
  console.log('\n' + '-'.repeat(48));
  console.log(`Result: ${passed} passed | ${failed} failed`);
  fs.rmSync(testRoot, { recursive: true, force: true });

  if (failed > 0) {
    process.exit(1);
  }
}

resetTestRoot();

console.log('\n[TEST 1] padrao_locucao valido passa no validator');

const validation = validateBrainItem(validPadraoLocucao());
assert(validation.valid === true, 'validator accepts valid padrao_locucao');
assert(validation.errors.length === 0, 'valid padrao_locucao has no errors');

console.log('\n[TEST 2] writer salva padrao_locucao no caminho correto');

const result = saveBrainItem(validPadraoLocucao(), { rootDir: testRoot });
const expectedDir = path.join(testRoot, 'data', 'biblioteca_anuncios', 'padroes_locucao');
const indexPath = path.join(expectedDir, 'index.json');

console.log('  Result:', result);
assert(result.success === true, 'saveBrainItem returns success=true');
assert(result.duplicate === false, 'item is not duplicate');
assert(result.relativePath.includes('data/biblioteca_anuncios/padroes_locucao/'), 'relative path uses padroes_locucao folder');
assert(fs.existsSync(result.path), 'saved JSON file exists');
assert(fs.existsSync(indexPath), 'index.json was created');
assert(readJson(indexPath).includes(`${result.id}.json`), 'index.json lists saved file');

const savedItem = readJson(result.path);
assert(savedItem.type === 'padrao_locucao', 'saved item keeps padrao_locucao type');
assert(savedItem.fingerprint && typeof savedItem.fingerprint === 'string', 'saved item has fingerprint');

console.log('\n[TEST 3] padrao_locucao invalido falha');

const invalidWithoutOpening = validateBrainItem(validPadraoLocucao({
  abertura: ''
}));
const invalidWithoutProduct = validateBrainItem(validPadraoLocucao({
  produto: ''
}));

assert(invalidWithoutOpening.valid === false, 'missing abertura fails');
assert(invalidWithoutOpening.errors.some((error) => error.includes('abertura')), 'abertura error is reported');
assert(invalidWithoutProduct.valid === false, 'missing produto fails');
assert(invalidWithoutProduct.errors.some((error) => error.includes('produto')), 'produto error is reported');

const invalidSave = saveBrainItem(validPadraoLocucao({
  abertura: '',
  produto: ''
}), { rootDir: testRoot });

assert(invalidSave.success === false, 'writer rejects invalid padrao_locucao');
assert(invalidSave.path === null, 'invalid item is not saved');

finish();
