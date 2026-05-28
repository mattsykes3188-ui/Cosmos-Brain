'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const htmlPath = path.join(rootDir, 'tools', 'video-intelligence', 'public', 'index.html');

function readHtml() {
  assert.ok(fs.existsSync(htmlPath), 'tools/video-intelligence/public/index.html deve existir.');
  return fs.readFileSync(htmlPath, 'utf8');
}

function assertIncludes(html, expected) {
  assert.ok(html.includes(expected), `HTML deve conter: ${expected}`);
}

function assertIdPresent(html, id) {
  assertIncludes(html, `id="${id}"`);
}

function countVisiblePrimarySteps(html) {
  const matches = html.match(/<section class="status-panel primary-step">/g) || [];
  return matches.length;
}

function run() {
  const html = readHtml();

  assertIncludes(html, 'Video Intelligence');
  assertIncludes(html, '1. Upload vídeo');
  assertIncludes(html, '2. Revisar transcrição');
  assertIncludes(html, '3. Salvar no Brain');
  assertIncludes(html, 'Cole aqui o JSON retornado pelo ChatGPT');
  assertIncludes(html, 'Modo técnico / avançado');
  assertIncludes(html, 'validarRespostaGptNoNavegador');
  assertIncludes(html, 'JSON validado localmente');

  assert.ok(countVisiblePrimarySteps(html) === 3, 'Tela principal deve ter exatamente 3 passos visíveis.');

  assertIdPresent(html, 'manualGptResponse');
  assertIdPresent(html, 'saveGptToBrainButton');
  assertIdPresent(html, 'manualGptPreview');

  [
    'uploadForm',
    'videoFile',
    'whisperModelSelect',
    'whisperLanguageSelect',
    'submitButton',
    'status',
    'uploadStatus',
    'audioStatus',
    'whisperStatus',
    'durationStatus',
    'transcriptionPreview',
    'rawTranscriptionSelect',
    'loadRawButton',
    'saveCuratedButton',
    'curationEditor',
    'curationStatus',
    'curatedTranscriptionSelect',
    'loadCuratedButton',
    'curatedReader',
    'buildGptPromptButton',
    'copyGptPromptButton',
    'manualGptPrompt',
    'validateGptResponseButton',
    'workflowStatus',
    'workflowGrid',
    'refreshWorkflowButton',
    'rebuildReportsButton',
    'assistSemanticButton',
    'segmentoSelect',
    'hookTypeSelect',
    'objetivoComercialSelect',
    'tipoCtaSelect',
    'savePatternButton',
    'draftPatternSelect',
    'promoteDraftButton',
    'draftPatternViewer'
  ].forEach((id) => assertIdPresent(html, id));

  assert.ok(
    html.indexOf('Modo técnico / avançado') < html.indexOf('Status do Workflow completo'),
    'Workflow completo deve ficar no modo técnico.'
  );
  assert.ok(
    html.indexOf('Modo técnico / avançado') < html.indexOf('Curadoria de Inteligência'),
    'Taxonomia e extração manual devem ficar no modo técnico.'
  );
  assert.ok(
    html.indexOf('Modo técnico / avançado') < html.indexOf('Revisão e Promoção de Padrão de Locução'),
    'Promoção manual deve ficar no modo técnico.'
  );

  assert.ok(!html.includes('https://api.openai.com'), 'UI não deve chamar API externa.');
  assert.ok(!html.includes('../index.html'), 'UI não deve acoplar o dashboard principal.');

  console.log('test_ultra_simplified_brain_intake_ui: 22 passed');
}

run();
