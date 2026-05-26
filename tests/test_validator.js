'use strict';

const { validateBrainItem } = require('../core/validator');

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

function validItem(overrides = {}) {
  return {
    type: 'tendencia',
    product: 'geral',
    objective: 'autoridade',
    style: 'tecnico',
    strength: 4,
    text: 'Clientes valorizam ver o uniforme antes da producao.',
    context: 'Usar em conteudos educativos sobre aprovacao visual.',
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
    created_at: '2026-05-25',
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
    created_at: '2026-05-25',
    ...overrides
  };
}

console.log('\n[TEST 1] valid item passes');

const valid = validateBrainItem(validItem());
assert(valid.valid === true, 'valid item passes');
assert(valid.errors.length === 0, 'valid item has no errors');

console.log('\n[TEST 2] invalid item fails');

const invalid = validateBrainItem(validItem({
  type: 'desconhecido',
  product: '',
  strength: 6,
  text: 'curto',
  context: 'curto'
}));

assert(invalid.valid === false, 'invalid item fails');
assert(invalid.errors.some((error) => error.includes('Unsupported type')), 'detects unsupported type');
assert(invalid.errors.some((error) => error.includes('product')), 'detects empty product');
assert(invalid.errors.some((error) => error.includes('strength')), 'detects invalid strength');
assert(invalid.errors.some((error) => error.includes('text')), 'detects short text');
assert(invalid.errors.some((error) => error.includes('context')), 'detects short context');

console.log('\n[TEST 3] all supported domain types pass');

for (const type of ['gancho', 'chamada_acao', 'tendencia', 'dor_mercado', 'narrativa', 'direcao_visual']) {
  const result = validateBrainItem(validItem({ type }));
  assert(result.valid === true, `${type} is supported`);
}

console.log('\n[TEST 4] new intelligence domains pass');

const validAdInsight = validateBrainItem(validInsightAnuncio());
const validStrategicInsight = validateBrainItem(validInsightEstrategico());
assert(validAdInsight.valid === true, 'insight_anuncio valid item passes');
assert(validStrategicInsight.valid === true, 'insight_estrategico valid item passes');

console.log('\n[TEST 5] new intelligence domains fail when required fields are invalid');

const invalidAdInsight = validateBrainItem(validInsightAnuncio({
  marca: '',
  produto: '',
  strength: 6,
  text: 'curto'
}));
const invalidStrategicInsight = validateBrainItem(validInsightEstrategico({
  padrao_mercado: '',
  interpretacao_estrategica: '',
  context: 'curto'
}));

assert(invalidAdInsight.valid === false, 'insight_anuncio invalid item fails');
assert(invalidAdInsight.errors.some((error) => error.includes('marca')), 'insight_anuncio requires marca');
assert(invalidAdInsight.errors.some((error) => error.includes('produto')), 'insight_anuncio requires produto');
assert(invalidAdInsight.errors.some((error) => error.includes('strength')), 'insight_anuncio validates strength');
assert(invalidStrategicInsight.valid === false, 'insight_estrategico invalid item fails');
assert(invalidStrategicInsight.errors.some((error) => error.includes('padrao_mercado')), 'insight_estrategico requires padrao_mercado');
assert(invalidStrategicInsight.errors.some((error) => error.includes('interpretacao_estrategica')), 'insight_estrategico requires interpretacao_estrategica');

console.log('\n' + '-'.repeat(48));
console.log(`Result: ${passed} passed | ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
