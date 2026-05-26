'use strict';

const fs = require('fs');
const path = require('path');

const { saveBrainItem } = require('../core/writer');

const testRoot = path.join(__dirname, '.tmp_writer');
const today = new Date().toISOString().slice(0, 10);

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

function validGancho(overrides = {}) {
  return {
    type: 'gancho',
    product: 'polo',
    objective: 'vender',
    style: 'premium',
    strength: 5,
    text: 'Sua polo nao precisa parecer uniforme comum.',
    context: 'Usar em videos premium de venda para polos personalizadas.',
    source_type: 'test',
    ...overrides
  };
}

function validInsightAnuncio(overrides = {}) {
  return {
    type: 'insight_anuncio',
    source: 'biblioteca_manual',
    marca: 'Marca exemplo',
    produto: 'uniforme corporativo',
    promessa: 'entrega rapida com preco acessivel',
    dor_principal: 'cliente precisa repor uniformes sem atrasar a operacao',
    formato: 'anuncio estatico',
    estilo_visual: 'simples e direto',
    estrutura_copy: 'dor, promessa, prova e chamada para orcamento',
    strength: 4,
    text: 'Anuncios de preco funcionam melhor quando a promessa e simples e verificavel.',
    context: 'Usar para analisar padroes de copy em anuncios de uniformes.',
    ...overrides
  };
}

function validInsightEstrategico(overrides = {}) {
  return {
    type: 'insight_estrategico',
    source: 'observacao_manual',
    padrao_mercado: 'fabricas comunicam uniforme como item comum e comparavel por preco',
    interpretacao_estrategica: 'a oportunidade esta em vender percepcao premium e confianca operacional',
    angulo_conteudo: 'mostrar antes e depois de apresentacao visual premium',
    formato_recomendado: 'carrossel de autoridade',
    strength: 5,
    text: 'Percepcao premium desloca a conversa de preco para valor percebido.',
    context: 'Usar em conteudos de autoridade sobre diferenciacao para fabricas.',
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

console.log('\n[TEST 1] writer saves a valid item');

const result = saveBrainItem(validGancho(), { rootDir: testRoot });
const indexPath = path.join(testRoot, 'data', 'ganchos', 'index.json');
const logPath = path.join(testRoot, 'logs', `log_${today}.json`);

console.log('  Result:', result);
assert(result.success === true, 'returns success=true');
assert(result.duplicate === false, 'returns duplicate=false');
assert(typeof result.id === 'string' && result.id.startsWith('gancho_'), 'generates gancho id');
assert(fs.existsSync(result.path), 'saves JSON file');
assert(fs.existsSync(indexPath), 'creates/updates ganchos index.json');
assert(readJson(indexPath).includes(`${result.id}.json`), 'index.json lists saved file');

const savedItem = readJson(result.path);
assert(savedItem.type === 'gancho', 'saved item keeps Portuguese type');
assert(savedItem.fingerprint && typeof savedItem.fingerprint === 'string', 'saves fingerprint');
assert(savedItem.created_at && typeof savedItem.created_at === 'string', 'saves created_at');

console.log('\n[TEST 2] writer rejects duplicate');

const duplicateResult = saveBrainItem(validGancho(), { rootDir: testRoot });
const ganchoJsonFiles = fs.readdirSync(path.join(testRoot, 'data', 'ganchos'))
  .filter((file) => file.endsWith('.json') && file !== 'index.json');

console.log('  Result:', duplicateResult);
assert(duplicateResult.success === false, 'duplicate returns success=false');
assert(duplicateResult.duplicate === true, 'duplicate returns duplicate=true');
assert(ganchoJsonFiles.length === 1, 'duplicate does not save a second file');

console.log('\n[TEST 3] writer rejects invalid item');

const invalidResult = saveBrainItem({
  type: 'gancho',
  text: 'short'
}, { rootDir: testRoot });

console.log('  Result:', invalidResult);
assert(invalidResult.success === false, 'invalid item returns success=false');
assert(invalidResult.duplicate === false, 'invalid item is not marked duplicate');
assert(Array.isArray(invalidResult.errors) && invalidResult.errors.length > 0, 'invalid item returns errors');

const logs = readJson(logPath);
assert(logs.some((entry) => entry.id === result.id && entry.success === true), 'log includes save success');
assert(logs.some((entry) => entry.duplicate === true), 'log includes duplicate entry');
assert(logs.some((entry) => entry.success === false && entry.message === 'Validation failed.'), 'log includes validation failure');

console.log('\n[TEST 4] writer saves intelligence domains in mapped folders');

const adInsightResult = saveBrainItem(validInsightAnuncio(), { rootDir: testRoot });
const strategicInsightResult = saveBrainItem(validInsightEstrategico(), { rootDir: testRoot });
const adIndexPath = path.join(testRoot, 'data', 'biblioteca_anuncios', 'analisado', 'index.json');
const strategicIndexPath = path.join(testRoot, 'data', 'estrategia_mateus', 'autoridade', 'index.json');

console.log('  Ad insight:', adInsightResult);
console.log('  Strategic insight:', strategicInsightResult);
assert(adInsightResult.success === true, 'saves insight_anuncio');
assert(adInsightResult.relativePath.includes('data/biblioteca_anuncios/analisado/'), 'insight_anuncio path is correct');
assert(fs.existsSync(adIndexPath), 'insight_anuncio target index is created');
assert(readJson(adIndexPath).includes(`${adInsightResult.id}.json`), 'insight_anuncio index lists saved file');
assert(strategicInsightResult.success === true, 'saves insight_estrategico');
assert(strategicInsightResult.relativePath.includes('data/estrategia_mateus/autoridade/'), 'insight_estrategico path is correct');
assert(fs.existsSync(strategicIndexPath), 'insight_estrategico target index is created');
assert(readJson(strategicIndexPath).includes(`${strategicInsightResult.id}.json`), 'insight_estrategico index lists saved file');

finish();
