'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const {
  calculateSuggestionConfidence,
  inferEstruturaNarrativa,
  inferHookType,
  inferSegmento,
  inferSemanticSuggestions,
  inferTomEmocional,
  normalizeText,
  tokenizeText
} = require('../core/assistedSemanticExtraction');
const { startServer } = require('../tools/video-intelligence/server');

const rootDir = path.join(__dirname, '..');
const approvedDir = path.join(rootDir, 'data', 'biblioteca_anuncios', 'padroes_locucao');
const draftDir = path.join(rootDir, 'tools', 'video-intelligence', 'padroes_locucao');

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

function taxonomyIds(fileName) {
  return new Set(readJson(path.join(rootDir, 'data', 'taxonomia', fileName)).map((item) => item.id));
}

function countJsonFiles(dir) {
  if (!fs.existsSync(dir)) {
    return 0;
  }

  return fs.readdirSync(dir).filter((file) => path.extname(file).toLowerCase() === '.json').length;
}

function postJson(port, route, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const request = http.request({
      hostname: '127.0.0.1',
      port,
      path: route,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          payload: JSON.parse(Buffer.concat(chunks).toString('utf8'))
        });
      });
    });

    request.on('error', reject);
    request.end(body);
  });
}

async function main() {
  console.log('\n[TEST 1] text normalization and tokenization');
  assert(normalizeText('Proteção Solar, Camisa UV!') === 'protecao solar camisa uv', 'normalizeText removes accents and punctuation');
  assert(tokenizeText('Camisa UV para pesca').includes('pesca'), 'tokenizeText creates useful tokens');

  console.log('\n[TEST 2] deterministic field inference');
  const pescaText = 'Camisa UV para pesca com proteção solar e acabamento premium.';
  const hospitalarText = 'Scrub hospitalar para clínica de saúde com tecido técnico.';
  const ofertaText = 'Mais de cem opções para sua equipe. Clique agora e solicite um orçamento.';
  const visualText = 'Veja o resultado em close: prova visual do acabamento superior.';

  assert(inferSegmento(pescaText).value === 'pesca', 'inferSegmento detects pesca');
  assert(inferSegmento(hospitalarText).value === 'hospitalar', 'inferSegmento detects hospitalar');
  assert(inferHookType(ofertaText).value === 'promessa_pratica', 'inferHookType maps direct offer language to official promessa_pratica');
  assert(inferTomEmocional(pescaText).value === 'premium', 'inferTomEmocional detects premium');
  assert(inferEstruturaNarrativa(visualText).value === 'prova_visual', 'inferEstruturaNarrativa detects prova_visual');

  console.log('\n[TEST 3] suggestion shape and confidence');
  const suggestions = inferSemanticSuggestions(`${pescaText} ${ofertaText} ${visualText}`);
  const taxonomyByField = {
    segmento: taxonomyIds('segmentos.json'),
    hook_type: taxonomyIds('tipos_hook.json'),
    estrutura_narrativa: taxonomyIds('estruturas_narrativas.json'),
    tom_emocional: taxonomyIds('tons_emocionais.json'),
    tipo_cta: taxonomyIds('tipos_cta.json'),
    objetivo_comercial: taxonomyIds('objetivos_comerciais.json')
  };

  for (const [field, suggestion] of Object.entries(suggestions)) {
    assert(Object.prototype.hasOwnProperty.call(suggestion, 'value'), `${field} has value`);
    assert(Object.prototype.hasOwnProperty.call(suggestion, 'confidence'), `${field} has confidence`);
    assert(Array.isArray(suggestion.signals), `${field} has signals array`);
    assert(suggestion.confidence >= 0 && suggestion.confidence <= 1, `${field} confidence is between 0 and 1`);

    if (suggestion.value) {
      assert(taxonomyByField[field].has(suggestion.value), `${field} suggestion uses official taxonomy id`);
    }
  }

  assert(calculateSuggestionConfidence(['a', 'b'], 4) === 0.5, 'calculateSuggestionConfidence returns expected ratio');

  console.log('\n[TEST 4] endpoint suggests without saving files');
  const beforeApproved = countJsonFiles(approvedDir);
  const beforeDrafts = countJsonFiles(draftDir);
  const server = startServer(0);

  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  const response = await postJson(port, '/assist-semantic-extraction', {
    text: `${pescaText} ${ofertaText}`
  });

  await new Promise((resolve) => server.close(resolve));

  assert(response.statusCode === 200, 'assist endpoint returns 200');
  assert(response.payload.success === true, 'assist endpoint returns success');
  assert(response.payload.suggestions.segmento.value === 'pesca', 'assist endpoint returns semantic suggestion');
  assert(countJsonFiles(approvedDir) === beforeApproved, 'assist endpoint does not save approved files');
  assert(countJsonFiles(draftDir) === beforeDrafts, 'assist endpoint does not save draft files');

  console.log('\n' + '-'.repeat(48));
  console.log(`Result: ${passed} passed | ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
