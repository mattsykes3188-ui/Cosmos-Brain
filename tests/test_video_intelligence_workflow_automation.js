'use strict';

const fs = require('fs');
const path = require('path');

const {
  PATTERNS_DIR,
  REBUILD_STEPS,
  buildWorkflowStateFromFiles,
  getWorkflowState,
  inferNextStep,
  promoverPadraoLocucao,
  rebuildSemanticReports,
  safeRunNodeScript
} = require('../tools/video-intelligence/server');

const rootDir = path.join(__dirname, '..');
const approvedDir = path.join(rootDir, 'data', 'biblioteca_anuncios', 'padroes_locucao');
const tmpRoot = path.join(__dirname, '.tmp_video_workflow');
const draftName = 'unit_workflow_auto_pattern.json';
const draftPath = path.join(PATTERNS_DIR, draftName);
const approvedPath = path.join(approvedDir, draftName);

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

function touch(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, 'fixture', 'utf8');
}

function workflowDirs() {
  return {
    uploadDir: path.join(tmpRoot, 'uploads'),
    audioDir: path.join(tmpRoot, 'audio'),
    rawDir: path.join(tmpRoot, 'transcricoes_brutas'),
    curatedDir: path.join(tmpRoot, 'transcricoes_curadas'),
    patternsDir: path.join(tmpRoot, 'padroes_locucao'),
    approvedDir: path.join(tmpRoot, 'approved')
  };
}

function validDraft() {
  return {
    type: 'padrao_locucao',
    source: {
      kind: 'transcricao_curada',
      filename: 'unit_workflow_curada.txt',
      path: 'tools/video-intelligence/transcricoes_curadas/unit_workflow_curada.txt'
    },
    titulo: 'Padrao workflow automation',
    segmento: 'agro',
    tipo_dor: 'baixa_percepcao_premium',
    hook_type: 'dor_direta',
    estrutura_narrativa: 'problema_solucao',
    tom_emocional: 'confiavel',
    tipo_cta: 'chamar_whatsapp',
    formato_conteudo: 'reel',
    estilo_visual: 'fabrica_real',
    objetivo_comercial: 'gerar_lead',
    observacoes: 'Draft local para teste de workflow.',
    createdAt: '2026-05-27T00:00:00.000Z',
    status: 'draft'
  };
}

function cleanup() {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  fs.rmSync(draftPath, { force: true });
  fs.rmSync(approvedPath, { force: true });
  for (const file of fs.existsSync(approvedDir) ? fs.readdirSync(approvedDir) : []) {
    if (file.startsWith('unit_workflow_auto_pattern_')) {
      fs.rmSync(path.join(approvedDir, file), { force: true });
    }
  }
}

cleanup();

console.log('\n[TEST 1] exported functions and base state');
assert(typeof getWorkflowState === 'function', 'getWorkflowState exists');
assert(typeof buildWorkflowStateFromFiles === 'function', 'buildWorkflowStateFromFiles exists');
assert(typeof inferNextStep === 'function', 'inferNextStep exists');
assert(typeof safeRunNodeScript === 'function', 'safeRunNodeScript exists');
assert(typeof rebuildSemanticReports === 'function', 'rebuildSemanticReports exists');

const realState = getWorkflowState();
assert(Array.isArray(realState.uploads), 'workflow state has uploads array');
assert(Array.isArray(realState.audios), 'workflow state has audios array');
assert(Array.isArray(realState.transcricoesBrutas), 'workflow state has raw transcripts array');
assert(Array.isArray(realState.transcricoesCuradas), 'workflow state has curated transcripts array');
assert(Array.isArray(realState.padroesDraft), 'workflow state has draft patterns array');
assert(Array.isArray(realState.padroesApproved), 'workflow state has approved patterns array');
assert(typeof realState.nextStep === 'string', 'workflow state has nextStep');
assert(typeof realState.lastUpdatedAt === 'string', 'workflow state has lastUpdatedAt');

console.log('\n[TEST 2] inferNextStep states');
assert(inferNextStep({ uploads: [] }) === 'upload_video', 'empty state asks for upload');
assert(inferNextStep({ uploads: ['video.mp4'], transcricoesBrutas: [] }) === 'aguardar_transcricao_bruta', 'upload without raw asks for raw transcription');
assert(inferNextStep({ uploads: ['video.mp4'], transcricoesBrutas: ['raw.txt'], transcricoesCuradas: [] }) === 'curar_transcricao', 'raw transcript asks for curation');
assert(inferNextStep({
  uploads: ['video.mp4'],
  transcricoesBrutas: ['raw.txt'],
  transcricoesCuradas: ['curada.txt'],
  padroesDraft: []
}) === 'extrair_padrao_locucao', 'curated transcript asks for pattern extraction');
assert(inferNextStep({
  uploads: ['video.mp4'],
  transcricoesBrutas: ['raw.txt'],
  transcricoesCuradas: ['curada.txt'],
  padroesDraft: ['draft.json'],
  padroesApproved: []
}) === 'promover_para_brain', 'draft asks for promotion');
assert(inferNextStep({
  uploads: ['video.mp4'],
  transcricoesBrutas: ['raw.txt'],
  transcricoesCuradas: ['curada.txt'],
  padroesDraft: ['draft.json'],
  padroesApproved: ['approved.json']
}) === 'rebuild_inteligencia', 'approved pattern asks for rebuild');

console.log('\n[TEST 3] buildWorkflowStateFromFiles reads local files');
const dirs = workflowDirs();
touch(path.join(dirs.uploadDir, 'video.mp4'));
touch(path.join(dirs.audioDir, 'video.wav'));
touch(path.join(dirs.rawDir, 'video.txt'));
touch(path.join(dirs.curatedDir, 'video_curada.txt'));
touch(path.join(dirs.patternsDir, 'video_padrao.json'));
touch(path.join(dirs.approvedDir, 'video_padrao.json'));
touch(path.join(dirs.approvedDir, 'index.json'));

const tmpState = buildWorkflowStateFromFiles(dirs);
assert(tmpState.uploads.includes('video.mp4'), 'state lists uploads');
assert(tmpState.audios.includes('video.wav'), 'state lists audios');
assert(tmpState.transcricoesBrutas.includes('video.txt'), 'state lists raw transcripts');
assert(tmpState.transcricoesCuradas.includes('video_curada.txt'), 'state lists curated transcripts');
assert(tmpState.padroesDraft.includes('video_padrao.json'), 'state lists drafts');
assert(tmpState.padroesApproved.includes('video_padrao.json'), 'state lists approved patterns');
assert(!tmpState.padroesApproved.includes('index.json'), 'state ignores approved index.json');
assert(tmpState.nextStep === 'rebuild_inteligencia', 'state infers rebuild after approved pattern');

console.log('\n[TEST 4] safeRunNodeScript and rebuild orchestration');
assertThrows(() => safeRunNodeScript('../scripts/build_padroes_locucao_index.js'), 'safeRunNodeScript rejects traversal');
assertThrows(() => safeRunNodeScript('core/validator.js'), 'safeRunNodeScript rejects non-scripts folder');

const called = [];
const rebuild = rebuildSemanticReports({
  runner: (script, args) => {
    called.push({ script, args });
    return {
      success: true,
      exit_code: 0,
      stdout: 'ok',
      stderr: ''
    };
  }
});

assert(rebuild.success === true, 'mocked rebuild succeeds');
assert(rebuild.steps.length === REBUILD_STEPS.length, 'rebuild calls all expected steps');
assert(called[0].script === 'scripts/build_padroes_locucao_index.js', 'rebuild first step is index');
assert(called.some((item) => item.script === 'scripts/build_semantic_query_batch_reports.js' && item.args.includes('--all')), 'rebuild runs batch reports with --all');
assert(called[called.length - 1].script === 'scripts/build_semantic_knowledge_expansion_plan.js', 'rebuild last step is expansion plan');

console.log('\n[TEST 5] promotion preserves draft and rebuild remains actionable');
fs.mkdirSync(PATTERNS_DIR, { recursive: true });
fs.mkdirSync(approvedDir, { recursive: true });
fs.writeFileSync(draftPath, JSON.stringify(validDraft(), null, 2), 'utf8');

const promoted = promoverPadraoLocucao(draftName);

assert(fs.existsSync(draftPath), 'promotion does not delete draft');
assert(fs.existsSync(path.join(approvedDir, promoted.promotedFilename)), 'promotion creates approved file');
assert(rebuildSemanticReports({
  runner: () => ({
    success: true,
    exit_code: 0,
    stdout: 'ok',
    stderr: ''
  })
}).success === true, 'rebuild remains actionable after promotion');

cleanup();

console.log('\n' + '-'.repeat(48));
console.log(`Result: ${passed} passed | ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
