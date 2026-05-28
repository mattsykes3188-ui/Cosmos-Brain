'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const {
  buildManualGptPrompt,
  buildPreviewFromManualGptJson,
  extractJsonFromGptResponse,
  normalizeManualGptJson,
  validateManualGptJson
} = require('../core/manualGptSemanticBridge');
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

function assertThrows(fn, label) {
  try {
    fn();
    assert(false, label);
  } catch (_) {
    assert(true, label);
  }
}

function validJson(overrides = {}) {
  return {
    titulo: 'Padrao GPT manual para pesca',
    segmento: 'pesca',
    tipo_dor: 'baixa_percepcao_premium',
    hook_type: 'promessa_pratica',
    estrutura_narrativa: 'prova_visual',
    tom_emocional: 'premium',
    tipo_cta: 'conhecer_modelos',
    formato_conteudo: 'reel',
    estilo_visual: 'premium_clean',
    objetivo_comercial: 'vender_premium',
    observacoes: 'Classificacao manual assistida por GPT.',
    signals: ['camisa uv', 'pesca', 'premium'],
    reasoning: 'A transcricao enfatiza pesca, prova visual e valor premium.',
    ...overrides
  };
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
  console.log('\n[TEST 1] prompt generation');
  const transcription = 'Camisa UV para pesca com prova visual de acabamento premium.';
  const prompt = buildManualGptPrompt(transcription);

  assert(prompt.includes(transcription), 'prompt includes curated transcription');
  assert(prompt.includes('segmento:'), 'prompt includes allowed taxonomy ids');
  assert(prompt.includes('Retorne somente JSON valido'), 'prompt requires only JSON');
  assert(prompt.includes('Nao invente IDs'), 'prompt forbids invented ids');
  assert(prompt.includes('pesca'), 'prompt includes taxonomy value pesca');

  console.log('\n[TEST 2] response JSON extraction');
  const json = validJson();
  assert(extractJsonFromGptResponse(JSON.stringify(json)).segmento === 'pesca', 'extracts pure JSON');
  assert(extractJsonFromGptResponse(`\`\`\`json\n${JSON.stringify(json)}\n\`\`\``).segmento === 'pesca', 'extracts fenced json block');
  assertThrows(() => extractJsonFromGptResponse('isso nao e json'), 'rejects invalid JSON');

  console.log('\n[TEST 3] validation and normalization');
  assert(validateManualGptJson(json).valid === true, 'accepts official taxonomy ids');
  assert(validateManualGptJson(validJson({ segmento: 'id_inexistente' })).valid === false, 'rejects invalid taxonomy id');

  const normalized = normalizeManualGptJson(json);
  assert(normalized.titulo === json.titulo, 'normalize keeps titulo');
  assert(Array.isArray(normalized.signals), 'normalize keeps signals array');
  assert(normalized.hook_type === 'promessa_pratica', 'normalize keeps official hook id');

  const preview = buildPreviewFromManualGptJson(json);
  assert(preview.classificacao.segmento === 'pesca', 'preview includes classification');
  assert(preview.reasoning.includes('pesca'), 'preview includes reasoning');

  console.log('\n[TEST 4] endpoints do not save files');
  const beforeApproved = countJsonFiles(approvedDir);
  const beforeDrafts = countJsonFiles(draftDir);
  const server = startServer(0);

  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  const promptResponse = await postJson(port, '/manual-gpt/build-prompt', {
    text: transcription
  });
  const parseResponse = await postJson(port, '/manual-gpt/parse-response', {
    responseText: `\`\`\`json\n${JSON.stringify(json)}\n\`\`\``
  });
  const invalidResponse = await postJson(port, '/manual-gpt/parse-response', {
    responseText: JSON.stringify(validJson({ segmento: 'invalido' }))
  });

  await new Promise((resolve) => server.close(resolve));

  assert(promptResponse.statusCode === 200, 'build-prompt endpoint exists');
  assert(promptResponse.payload.prompt.includes('IDs permitidos'), 'build-prompt endpoint returns prompt');
  assert(parseResponse.statusCode === 200, 'parse-response endpoint accepts valid JSON');
  assert(parseResponse.payload.preview.classificacao.segmento === 'pesca', 'parse-response returns preview');
  assert(invalidResponse.statusCode === 400, 'parse-response rejects invalid id');
  assert(countJsonFiles(approvedDir) === beforeApproved, 'manual GPT endpoints do not save approved files');
  assert(countJsonFiles(draftDir) === beforeDrafts, 'manual GPT endpoints do not save draft files');

  console.log('\n[TEST 5] dashboard principal remains separate');
  assert(fs.existsSync(path.join(rootDir, 'index.html')), 'main dashboard index.html still exists');

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
