'use strict';

const fs = require('fs');
const path = require('path');

const { processBrainBatch } = require('../core/batchProcessor');

const testRoot = path.join(__dirname, '.tmp_batchProcessor');
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

function gancho(overrides = {}) {
  return {
    type: 'gancho',
    product: 'polo',
    objective: 'vender',
    style: 'premium',
    strength: 5,
    text: 'Sua polo nao precisa parecer uniforme comum.',
    context: 'Usar em videos premium de venda para polos personalizadas.',
    ...overrides
  };
}

function insightAnuncio(overrides = {}) {
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

function insightEstrategico(overrides = {}) {
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function finish() {
  console.log('\n' + '-'.repeat(48));
  console.log(`Result: ${passed} passed | ${failed} failed`);
  fs.rmSync(testRoot, { recursive: true, force: true });

  if (failed > 0) {
    process.exit(1);
  }
}

fs.rmSync(testRoot, { recursive: true, force: true });
fs.mkdirSync(testRoot, { recursive: true });

console.log('\n[TEST 1] process mixed batch');

const batch = {
  agent: 'AGENT_TENDENCIAS',
  source_type: 'routine',
  items: [
    gancho(),
    gancho(),
    gancho({
      text: 'Gancho diferente para vender uniformes premium para empresas.'
    }),
    insightAnuncio(),
    insightEstrategico(),
    {
      type: 'gancho',
      text: 'curto'
    }
  ]
};

const report = processBrainBatch(batch, { rootDir: testRoot });

console.log('  Report:', report);
assert(report.total === 6, 'reports total items');
assert(report.saved === 4, 'saves valid unique items');
assert(report.duplicates === 1, 'marks duplicate item');
assert(report.failed === 1, 'marks invalid item as failed');
assert(report.results.length === 6, 'keeps one result per item');
assert(report.errors.length === 1, 'records failed item error');
assert(report.results[0].success === true, 'first item succeeds');
assert(report.results[1].duplicate === true, 'second item is duplicate');
assert(report.results[3].success === true, 'insight_anuncio succeeds');
assert(report.results[4].success === true, 'insight_estrategico succeeds');
assert(report.results[5].success === false, 'invalid item fails');

const ganchosDir = path.join(testRoot, 'data', 'ganchos');
const savedFiles = fs.readdirSync(ganchosDir)
  .filter((file) => file.endsWith('.json') && file !== 'index.json');
const index = readJson(path.join(ganchosDir, 'index.json'));
assert(savedFiles.length === 2, 'only unique valid files are saved');
assert(index.length === 2, 'manifest lists only saved files');

const savedItem = readJson(path.join(ganchosDir, savedFiles[0]));
assert(savedItem.agent === 'AGENT_TENDENCIAS', 'saved item includes agent');
assert(savedItem.source_type === 'routine', 'saved item includes batch source_type');
assert(savedItem.batch_id === report.batch_id, 'saved item includes batch_id');
assert(typeof savedItem.processed_at === 'string', 'saved item includes processed_at');
assert(savedItem.type === 'gancho', 'saved item uses Portuguese type');

const batchLogPath = path.join(testRoot, 'logs', 'batches', `batch_${today}.json`);
assert(fs.existsSync(batchLogPath), 'creates batch log');
assert(readJson(batchLogPath).some((entry) => entry.batch_id === report.batch_id), 'batch log includes report');

const adDir = path.join(testRoot, 'data', 'biblioteca_anuncios', 'analisado');
const strategicDir = path.join(testRoot, 'data', 'estrategia_mateus', 'autoridade');
assert(fs.readdirSync(adDir).some((file) => file.endsWith('.json') && file !== 'index.json'), 'batch saves insight_anuncio in mapped folder');
assert(fs.readdirSync(strategicDir).some((file) => file.endsWith('.json') && file !== 'index.json'), 'batch saves insight_estrategico in mapped folder');

console.log('\n[TEST 2] invalid batch shape');

const invalidReport = processBrainBatch({
  agent: 'AGENT_TENDENCIAS',
  source_type: 'manual',
  items: null
}, { rootDir: testRoot });

assert(invalidReport.total === 0, 'invalid batch reports total 0');
assert(invalidReport.failed === 1, 'invalid batch reports failed');
assert(invalidReport.errors.some((error) => String(error).includes('batch.items')), 'invalid batch explains items error');

finish();
