'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data', 'taxonomia');
const docsDir = path.join(rootDir, 'docs', 'taxonomia');
const schemaPath = path.join(rootDir, 'schemas', 'taxonomia.schema.json');

const snakeCasePattern = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const allowedStatuses = new Set(['active', 'draft', 'deprecated']);

const taxonomyFiles = {
  'segmentos.json': [
    'corporativo',
    'hospitalar',
    'agro',
    'pesca',
    'esportivo',
    'comitiva',
    'promocional',
    'escolar',
    'gastronomia',
    'operacional'
  ],
  'tipos_dor.json': [
    'atraso_producao',
    'inconsistencia_lote',
    'aprovacao_whatsapp',
    'baixa_percepcao_premium',
    'falta_padronizacao',
    'briefing_incompleto',
    'arte_baixa_qualidade',
    'demora_orcamento',
    'cliente_indeciso',
    'retrabalho_design',
    'falta_identidade_visual',
    'dificuldade_vender_valor'
  ],
  'estruturas_narrativas.json': [
    'problema_solucao',
    'antes_depois',
    'bastidor',
    'prova_visual',
    'comparativo',
    'autoridade',
    'demonstracao_produto',
    'quebra_objecao',
    'transformacao',
    'processo_passo_a_passo'
  ],
  'tons_emocionais.json': [
    'premium',
    'confiavel',
    'urgente',
    'tecnico',
    'popular',
    'sofisticado',
    'esportivo',
    'corporativo',
    'inspirador',
    'direto'
  ],
  'tipos_hook.json': [
    'dor_direta',
    'pergunta',
    'choque',
    'curiosidade',
    'autoridade',
    'transformacao',
    'comparativo',
    'bastidor',
    'erro_comum',
    'promessa_pratica'
  ],
  'tipos_cta.json': [
    'pedir_orcamento',
    'chamar_whatsapp',
    'conhecer_modelos',
    'ver_catalogo',
    'solicitar_mockup',
    'fechar_pedido',
    'agendar_atendimento',
    'baixar_template',
    'aprovar_modelo',
    'pedir_amostra'
  ],
  'formatos_conteudo.json': [
    'reel',
    'carrossel',
    'post_estatico',
    'story',
    'video_bastidor',
    'video_prova_social',
    'anuncio_pago',
    'landing_page',
    'artigo_seo',
    'roteiro_vendas'
  ],
  'estilos_visuais.json': [
    'premium_clean',
    'industrial',
    'esportivo_agressivo',
    'corporativo_moderno',
    'artesanal',
    'tecnico',
    'institucional',
    'promocional_popular',
    'luxo_discreto',
    'fabrica_real'
  ],
  'objetivos_comerciais.json': [
    'gerar_lead',
    'aumentar_autoridade',
    'vender_premium',
    'educar_cliente',
    'reduzir_objecao',
    'aumentar_ticket',
    'acelerar_aprovacao',
    'divulgar_segmento',
    'fortalecer_marca',
    'converter_whatsapp'
  ]
};

const requiredDocs = [
  'README.md',
  'TAXONOMY_ARCHITECTURE.md',
  'entidades/segmentos.md',
  'entidades/produtos.md',
  'entidades/tecnicas.md',
  'entidades/publicos.md',
  'dores/tipos_de_dor.md',
  'dores/dores_operacionais.md',
  'dores/dores_comerciais.md',
  'dores/dores_de_percepcao.md',
  'narrativas/estruturas_narrativas.md',
  'narrativas/padroes_de_abertura.md',
  'narrativas/padroes_de_fechamento.md',
  'emocoes/tons_emocionais.md',
  'hooks/tipos_de_hook.md',
  'ctas/tipos_de_cta.md',
  'formatos/formatos_de_conteudo.md',
  'visuais/estilos_visuais.md',
  'visuais/gatilhos_visuais.md',
  'objetivos/objetivos_comerciais.md'
];

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
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateStringArray(item, field, label) {
  const value = item[field];
  assert(Array.isArray(value), `${label}.${field} is an array`);
  assert(Array.isArray(value) && value.length > 0, `${label}.${field} is not empty`);
  assert(Array.isArray(value) && value.every(isNonEmptyString), `${label}.${field} contains only strings`);
}

console.log('\n[TEST 1] taxonomy structure exists');

assert(fs.existsSync(docsDir), 'docs/taxonomia exists');
assert(fs.existsSync(dataDir), 'data/taxonomia exists');
assert(fs.existsSync(schemaPath), 'schemas/taxonomia.schema.json exists');

for (const docPath of requiredDocs) {
  assert(fs.existsSync(path.join(docsDir, docPath)), `doc exists: ${docPath}`);
}

console.log('\n[TEST 2] taxonomy JSON files are valid arrays');

for (const [fileName, requiredIds] of Object.entries(taxonomyFiles)) {
  const filePath = path.join(dataDir, fileName);
  assert(fs.existsSync(filePath), `JSON exists: ${fileName}`);

  const items = readJson(filePath);
  assert(Array.isArray(items), `${fileName} contains an array`);
  assert(Array.isArray(items) && items.length > 0, `${fileName} is not empty`);

  if (!Array.isArray(items)) {
    continue;
  }

  const ids = new Set();

  for (const item of items) {
    const label = `${fileName}:${item && item.id ? item.id : 'unknown'}`;

    assert(item && typeof item === 'object' && !Array.isArray(item), `${label} is an object`);
    assert(isNonEmptyString(item.id), `${label} has id`);
    assert(snakeCasePattern.test(item.id), `${label} id is snake_case`);
    assert(!ids.has(item.id), `${label} id is unique inside file`);
    ids.add(item.id);

    assert(isNonEmptyString(item.label), `${label} has label`);
    assert(isNonEmptyString(item.descricao), `${label} has descricao`);
    assert(isNonEmptyString(item.categoria), `${label} has categoria`);
    assert(allowedStatuses.has(item.status), `${label} has valid status`);
    validateStringArray(item, 'sinonimos', label);
    validateStringArray(item, 'exemplos', label);
    validateStringArray(item, 'relacionados', label);
  }

  for (const requiredId of requiredIds) {
    assert(ids.has(requiredId), `${fileName} includes required id ${requiredId}`);
  }
}

console.log('\n' + '-'.repeat(48));
console.log(`Result: ${passed} passed | ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
