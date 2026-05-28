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

function assertIncludes(html, expected, message) {
  assert.ok(html.includes(expected), message || `HTML deve conter: ${expected}`);
}

function assertIdPresent(html, id) {
  assertIncludes(html, `id="${id}"`, `Elemento #${id} deve continuar presente para preservar listeners existentes.`);
}

function run() {
  const html = readHtml();

  assertIncludes(html, '1. Enviar vídeo');
  assertIncludes(html, '2. Revisar transcrição');
  assertIncludes(html, '3. Curadoria com ChatGPT');
  assertIncludes(html, '4. Salvar no Brain');
  assertIncludes(html, 'Avançado / Técnico');

  assertIncludes(html, 'Curadoria de Inteligência');
  assertIncludes(html, 'Salvar rascunho técnico');
  assertIncludes(html, 'Valide a resposta do GPT antes de salvar.');

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
    'manualGptResponse',
    'validateGptResponseButton',
    'manualGptPreview',
    'saveGptToBrainButton',
    'manualGptStatus',
    'rebuildStatus',
    'workflowStatus',
    'workflowGrid',
    'refreshWorkflowButton',
    'rebuildReportsButton',
    'assistSemanticButton',
    'assistStatus',
    'assistSignals',
    'patternTitle',
    'segmentoSelect',
    'tipoDorSelect',
    'hookTypeSelect',
    'estruturaNarrativaSelect',
    'tomEmocionalSelect',
    'tipoCtaSelect',
    'formatoConteudoSelect',
    'estiloVisualSelect',
    'objetivoComercialSelect',
    'patternNotes',
    'savePatternButton',
    'patternStatus',
    'draftPatternSelect',
    'loadDraftButton',
    'promoteDraftButton',
    'draftPatternViewer',
    'promotionStatus'
  ].forEach((id) => assertIdPresent(html, id));

  assert.ok(
    html.indexOf('Avançado / Técnico') < html.indexOf('Status do Workflow completo'),
    'Status técnico completo deve ficar dentro da área avançada.'
  );

  assert.ok(
    html.indexOf('Avançado / Técnico') < html.indexOf('Curadoria de Inteligência'),
    'Curadoria técnica/manual antiga deve ficar dentro da área avançada.'
  );

  assert.ok(
    html.indexOf('Avançado / Técnico') < html.indexOf('Revisão e Promoção de Padrão de Locução'),
    'Revisão e promoção técnica devem ficar dentro da área avançada.'
  );

  assert.ok(!html.includes('https://api.openai.com'), 'UI local não deve conectar API externa.');
  assert.ok(!html.includes('../index.html'), 'UI local não deve acoplar o dashboard principal.');

  console.log('test_video_intelligence_simplified_ui: 24 passed');
}

run();
