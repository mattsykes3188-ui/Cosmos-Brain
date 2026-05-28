'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  getApprovedPatterns,
  getBestPatternsForBrief,
  getPatternsByCTA,
  getPatternsByHook,
  getPatternsByNarrative,
  getPatternsByObjective,
  getPatternsBySegment,
  getPatternsByTone,
  loadApprovedPatterns,
  loadPatternIndex
} = require('../core/knowledgeReader');
const {
  buildCTASuggestions,
  buildHookSuggestions,
  buildNarrativeSuggestions,
  buildStrategicSummary,
  buildVisualDirectionSuggestions,
  composeContentDirection
} = require('../core/contentStrategyComposer');

const rootDir = path.join(__dirname, '..');
const dashboardPath = path.join(rootDir, 'index.html');

function run() {
  const index = loadPatternIndex();
  assert.strictEqual(index.type, 'padroes_locucao_index', 'pattern index loads');
  assert.ok(Array.isArray(index.items), 'pattern index has items');

  const patterns = loadApprovedPatterns();
  assert.ok(patterns.length > 0, 'approved patterns load');
  assert.ok(patterns.every((pattern) => pattern.type === 'padrao_locucao'), 'only padrao_locucao is loaded');
  assert.ok(patterns.every((pattern) => pattern.status === 'approved'), 'only approved patterns are loaded');
  assert.ok(!patterns.some((pattern) => String(pattern.filename || '').includes('exemplo_padrao_locucao')), 'draft examples are not loaded');

  const pescaPatterns = getPatternsBySegment('pesca');
  assert.ok(pescaPatterns.length > 0, 'filters by segment');
  assert.ok(pescaPatterns.every((pattern) => pattern.segmento === 'pesca'), 'segment filter is deterministic');

  assert.ok(getPatternsByObjective('gerar_lead').every((pattern) => pattern.objetivo_comercial === 'gerar_lead'), 'filters by objective');
  assert.ok(getPatternsByHook('autoridade').every((pattern) => pattern.hook_type === 'autoridade'), 'filters by hook');
  assert.ok(getPatternsByNarrative('demonstracao_produto').every((pattern) => pattern.estrutura_narrativa === 'demonstracao_produto'), 'filters by narrative');
  assert.ok(getPatternsByCTA('chamar_whatsapp').every((pattern) => pattern.tipo_cta === 'chamar_whatsapp'), 'filters by CTA');
  assert.ok(getPatternsByTone('premium').every((pattern) => pattern.tom_emocional === 'premium'), 'filters by tone');

  const exact = getApprovedPatterns({
    segmento: 'pesca',
    objetivo_comercial: 'gerar_lead'
  });
  assert.ok(exact.length > 0, 'combined filters return approved patterns');
  assert.ok(exact.every((pattern) => pattern.segmento === 'pesca' && pattern.objetivo_comercial === 'gerar_lead'), 'combined filters are exact');

  const best = getBestPatternsForBrief({
    segmento: 'pesca',
    objetivo_comercial: 'gerar_lead'
  });
  assert.ok(best.length > 0, 'best patterns returns compatible patterns');
  assert.strictEqual(best[0].segmento, 'pesca', 'best result prioritizes matching segment');
  assert.strictEqual(best[0].objetivo_comercial, 'gerar_lead', 'best result prioritizes matching objective');

  const direction = composeContentDirection({
    segmento: 'pesca',
    objetivo_comercial: 'gerar_lead'
  }, best);

  assert.ok(direction.recommendedHooks.length > 0, 'composer generates hook suggestions');
  assert.ok(direction.recommendedNarratives.length > 0, 'composer generates narrative suggestions');
  assert.ok(direction.recommendedCTAs.length > 0, 'composer generates CTA suggestions');
  assert.ok(direction.recommendedVisualStyles.length > 0, 'composer generates visual suggestions');
  assert.ok(direction.strategicSummary.includes('Padroes aprovados'), 'composer generates deterministic summary');
  assert.ok(direction.sourcePatterns.length > 0, 'composer keeps source patterns');
  assert.ok(direction.sourcePatterns.every((pattern) => pattern.filename), 'source patterns are traceable');

  assert.ok(buildHookSuggestions(best).every((item) => item.value && item.count > 0), 'hook suggestions are counted');
  assert.ok(buildNarrativeSuggestions(best).every((item) => item.value && item.count > 0), 'narrative suggestions are counted');
  assert.ok(buildCTASuggestions(best).every((item) => item.value && item.count > 0), 'CTA suggestions are counted');
  assert.ok(buildVisualDirectionSuggestions(best).every((item) => item.value && item.count > 0), 'visual suggestions are counted');
  assert.ok(buildStrategicSummary([]).includes('Nenhum padrao aprovado'), 'empty summary does not invent strategy');

  assert.throws(() => getApprovedPatterns({ prompt: 'pesca' }), /Filtro de conhecimento desconhecido/, 'unknown filters are rejected');

  const coreFiles = [
    fs.readFileSync(path.join(rootDir, 'core', 'knowledgeReader.js'), 'utf8'),
    fs.readFileSync(path.join(rootDir, 'core', 'contentStrategyComposer.js'), 'utf8')
  ].join('\n');
  assert.ok(!coreFiles.includes('openai'), 'no OpenAI API usage');
  assert.ok(!coreFiles.includes('embedding'), 'no embeddings are implemented');
  assert.ok(fs.existsSync(dashboardPath), 'dashboard principal remains present');

  console.log('test_brain_consumption_layer: 28 passed');
}

run();
