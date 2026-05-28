'use strict';

const { execFile, spawnSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { inferSemanticSuggestions } = require('../../core/assistedSemanticExtraction');
const {
  buildManualGptPrompt,
  buildPreviewFromManualGptJson,
  extractJsonFromGptResponse,
  normalizeManualGptJson,
  validateManualGptJson
} = require('../../core/manualGptSemanticBridge');
const {
  buildSemanticFilename,
  normalizeSemanticFilename
} = require('../../core/semanticNaming');

const PORT = Number(process.env.PORT || 5600);
const TOOL_ROOT = __dirname;
const REPO_ROOT = path.join(TOOL_ROOT, '..', '..');
const PUBLIC_DIR = path.join(TOOL_ROOT, 'public');
const UPLOAD_DIR = path.join(TOOL_ROOT, 'uploads');
const AUDIO_DIR = path.join(TOOL_ROOT, 'audio');
const RAW_TRANSCRIPTIONS_DIR = path.join(TOOL_ROOT, 'transcricoes_brutas');
const CURATED_TRANSCRIPTIONS_DIR = path.join(TOOL_ROOT, 'transcricoes_curadas');
const PATTERNS_DIR = path.join(TOOL_ROOT, 'padroes_locucao');
const TAXONOMY_DIR = path.join(TOOL_ROOT, '..', '..', 'data', 'taxonomia');
const TRANSCRIBE_SCRIPT = path.join(TOOL_ROOT, 'transcribe.py');
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
const ALLOWED_WHISPER_MODELS = new Set(['tiny', 'base', 'small', 'medium', 'large']);
const ALLOWED_WHISPER_LANGUAGES = new Set(['pt', 'auto']);
const TAXONOMY_MAP = {
  segmentos: 'segmentos.json',
  tipos_dor: 'tipos_dor.json',
  estruturas_narrativas: 'estruturas_narrativas.json',
  tons_emocionais: 'tons_emocionais.json',
  tipos_hook: 'tipos_hook.json',
  tipos_cta: 'tipos_cta.json',
  formatos_conteudo: 'formatos_conteudo.json',
  estilos_visuais: 'estilos_visuais.json',
  objetivos_comerciais: 'objetivos_comerciais.json'
};
const PATTERN_TAXONOMY_FIELDS = {
  segmento: 'segmentos',
  tipo_dor: 'tipos_dor',
  hook_type: 'tipos_hook',
  estrutura_narrativa: 'estruturas_narrativas',
  tom_emocional: 'tons_emocionais',
  tipo_cta: 'tipos_cta',
  formato_conteudo: 'formatos_conteudo',
  estilo_visual: 'estilos_visuais',
  objetivo_comercial: 'objetivos_comerciais'
};
const REBUILD_STEPS = [
  { name: 'index', script: 'scripts/build_padroes_locucao_index.js', args: [] },
  { name: 'coverage_report', script: 'scripts/build_padroes_locucao_coverage_report.js', args: [] },
  { name: 'batch_reports', script: 'scripts/build_semantic_query_batch_reports.js', args: ['--all'] },
  { name: 'batch_summary', script: 'scripts/build_semantic_query_batch_summary.js', args: [] },
  { name: 'gap_backlog', script: 'scripts/build_semantic_knowledge_gap_backlog.js', args: [] },
  { name: 'expansion_plan', script: 'scripts/build_semantic_knowledge_expansion_plan.js', args: [] }
];

function startServer(port = PORT) {
  ensureWorkingDirs();

  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

      if (request.method === 'GET' && requestUrl.pathname === '/') {
        serveHtml(response);
        return;
      }

      if (request.method === 'POST' && requestUrl.pathname === '/upload') {
        await handleUpload(request, response);
        return;
      }

      if (request.method === 'GET' && requestUrl.pathname === '/transcricoes-brutas') {
        sendJson(response, 200, {
          success: true,
          files: listarTranscricoesBrutas()
        });
        return;
      }

      if (request.method === 'GET' && requestUrl.pathname.startsWith('/transcricao-bruta/')) {
        const filename = decodeURIComponent(requestUrl.pathname.replace('/transcricao-bruta/', ''));
        sendJson(response, 200, {
          success: true,
          filename,
          text: lerTranscricaoBruta(filename)
        });
        return;
      }

      if (request.method === 'POST' && requestUrl.pathname === '/salvar-transcricao-curada') {
        await handleSalvarTranscricaoCurada(request, response);
        return;
      }

      if (request.method === 'GET' && requestUrl.pathname === '/transcricoes-curadas') {
        sendJson(response, 200, {
          success: true,
          files: listarTranscricoesCuradas()
        });
        return;
      }

      if (request.method === 'GET' && requestUrl.pathname.startsWith('/transcricao-curada/')) {
        const filename = decodeURIComponent(requestUrl.pathname.replace('/transcricao-curada/', ''));
        sendJson(response, 200, {
          success: true,
          filename,
          text: lerTranscricaoCurada(filename)
        });
        return;
      }

      if (request.method === 'GET' && requestUrl.pathname === '/taxonomias') {
        sendJson(response, 200, {
          success: true,
          taxonomias: listarTaxonomiasDisponiveis()
        });
        return;
      }

      if (request.method === 'POST' && requestUrl.pathname === '/salvar-padrao-locucao') {
        await handleSalvarPadraoLocucao(request, response);
        return;
      }

      if (request.method === 'POST' && requestUrl.pathname === '/assist-semantic-extraction') {
        await handleAssistSemanticExtraction(request, response);
        return;
      }

      if (request.method === 'POST' && requestUrl.pathname === '/manual-gpt/build-prompt') {
        await handleManualGptBuildPrompt(request, response);
        return;
      }

      if (request.method === 'POST' && requestUrl.pathname === '/manual-gpt/parse-response') {
        await handleManualGptParseResponse(request, response);
        return;
      }

      if (request.method === 'GET' && requestUrl.pathname === '/padroes-locucao-draft') {
        sendJson(response, 200, {
          success: true,
          files: listarPadroesLocucaoDraft()
        });
        return;
      }

      if (request.method === 'GET' && requestUrl.pathname.startsWith('/padrao-locucao-draft/')) {
        const filename = decodeURIComponent(requestUrl.pathname.replace('/padrao-locucao-draft/', ''));
        sendJson(response, 200, {
          success: true,
          filename,
          payload: lerPadraoLocucaoDraft(filename)
        });
        return;
      }

      if (request.method === 'POST' && requestUrl.pathname === '/promover-padrao-locucao') {
        await handlePromoverPadraoLocucao(request, response);
        return;
      }

      if (request.method === 'GET' && requestUrl.pathname === '/workflow-state') {
        sendJson(response, 200, getWorkflowState());
        return;
      }

      if (request.method === 'POST' && requestUrl.pathname === '/rebuild-semantic-reports') {
        const rebuild = rebuildSemanticReports();
        sendJson(response, rebuild.success ? 200 : 500, rebuild);
        return;
      }

      sendJson(response, 404, {
        success: false,
        message: 'Rota nao encontrada.'
      });
    } catch (error) {
      sendJson(response, error.statusCode || 500, {
        success: false,
        message: createFriendlyErrorMessage(error),
        detail: error.message
      });
    }
  });

  server.listen(port, () => {
    console.log(`Video Intelligence Parser rodando em http://localhost:${port}`);
  });

  return server;
}

function ensureWorkingDirs() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  fs.mkdirSync(RAW_TRANSCRIPTIONS_DIR, { recursive: true });
  fs.mkdirSync(CURATED_TRANSCRIPTIONS_DIR, { recursive: true });
  fs.mkdirSync(PATTERNS_DIR, { recursive: true });
}

function serveHtml(response) {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');

  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8'
  });
  response.end(html);
}

async function handleUpload(request, response) {
  const startedAt = Date.now();
  const contentType = request.headers['content-type'] || '';

  if (!contentType.includes('multipart/form-data')) {
    sendJson(response, 400, {
      success: false,
      message: 'Envie o arquivo usando multipart/form-data.'
    });
    return;
  }

  const body = await readRequestBody(request, MAX_UPLOAD_BYTES);
  const multipart = parseMultipartForm(body, contentType);
  const file = multipart.file;
  const whisperConfig = getWhisperConfig(multipart.fields);

  if (!file) {
    sendJson(response, 400, {
      success: false,
      message: 'Nenhum arquivo foi encontrado no upload.'
    });
    return;
  }

  const video = salvarVideoEnviado(file);
  const audio = await extrairAudioDoVideo(video.absolutePath);
  const transcription = await transcreverAudio(audio.absolutePath, whisperConfig);

  // TODO: gerar transcricao_curada.
  // TODO: gerar padrao_locucao.
  // TODO: enviar para processBrainBatch.

  sendJson(response, 200, {
    success: true,
    video: {
      filename: video.filename,
      path: video.path,
      bytes: video.bytes
    },
    audio: {
      filename: audio.filename,
      path: audio.path
    },
    transcription: {
      filename: transcription.filename,
      path: transcription.path,
      preview: transcription.preview,
      model: whisperConfig.model,
      language: whisperConfig.language
    },
    duration_ms: Date.now() - startedAt,
    message: 'Video recebido, audio extraido e transcricao bruta concluida.'
  });
}

function salvarVideoEnviado(file) {
  const safeName = createSafeFileName(file.filename);

  if (path.extname(safeName).toLowerCase() !== '.mp4') {
    const error = new Error('Apenas arquivos .mp4 sao aceitos nesta fase.');
    error.code = 'INVALID_EXTENSION';
    error.statusCode = 400;
    throw error;
  }

  ensureWorkingDirs();

  const targetPath = path.join(UPLOAD_DIR, safeName);
  fs.writeFileSync(targetPath, file.content);

  return {
    filename: safeName,
    absolutePath: targetPath,
    path: toSlash(path.relative(TOOL_ROOT, targetPath)),
    bytes: file.content.length
  };
}

async function extrairAudioDoVideo(videoPath) {
  ensureWorkingDirs();

  const parsed = path.parse(videoPath);
  const audioFilename = `${parsed.name}.wav`;
  const audioPath = path.join(AUDIO_DIR, audioFilename);

  await runCommand('ffmpeg', buildFfmpegAudioArgs(videoPath, audioPath), {
    dependencyName: 'ffmpeg'
  });

  return {
    filename: audioFilename,
    absolutePath: audioPath,
    path: toSlash(path.relative(TOOL_ROOT, audioPath))
  };
}

function buildFfmpegAudioArgs(videoPath, audioPath) {
  return [
    '-i',
    videoPath,
    '-vn',
    '-ac',
    '1',
    '-ar',
    '16000',
    '-y',
    audioPath
  ];
}

async function transcreverAudio(audioPath, options = {}) {
  const transcriptFilename = `${path.parse(audioPath).name}.txt`;
  const transcriptPath = path.join(RAW_TRANSCRIPTIONS_DIR, transcriptFilename);
  const pythonCommand = process.env.WHISPER_PYTHON || process.env.PYTHON || 'python';
  const whisperConfig = getWhisperConfig(options);
  const runner = options.runCommandFn || runCommand;

  await runner(pythonCommand, buildTranscribeArgs(audioPath, transcriptPath, whisperConfig), {
    dependencyName: 'python/openai-whisper',
    timeoutMs: 30 * 60 * 1000
  });

  const text = fs.readFileSync(transcriptPath, 'utf8').replace(/^\uFEFF/, '').trim();
  return salvarTranscricaoBruta(text, transcriptFilename);
}

function salvarTranscricaoBruta(text, filename) {
  ensureWorkingDirs();

  const safeName = createSafeTextFileName(filename);
  const transcriptPath = path.join(RAW_TRANSCRIPTIONS_DIR, safeName);
  const cleanText = String(text || '').trim();

  fs.writeFileSync(transcriptPath, cleanText, 'utf8');

  return {
    filename: safeName,
    absolutePath: transcriptPath,
    path: toSlash(path.relative(TOOL_ROOT, transcriptPath)),
    text: cleanText,
    preview: cleanText.slice(0, 420)
  };
}

function getWhisperConfig(input = {}) {
  return {
    model: validateWhisperModel(input.model || process.env.WHISPER_MODEL || 'small'),
    language: validateWhisperLanguage(input.language || process.env.WHISPER_LANGUAGE || 'pt')
  };
}

function validateWhisperModel(model) {
  const normalized = String(model || '').trim().toLowerCase();

  if (!ALLOWED_WHISPER_MODELS.has(normalized)) {
    throwBadRequest(`Modelo Whisper invalido: ${model}. Use tiny, base, small, medium ou large.`);
  }

  return normalized;
}

function validateWhisperLanguage(language) {
  const normalized = String(language || '').trim().toLowerCase();

  if (!ALLOWED_WHISPER_LANGUAGES.has(normalized)) {
    throwBadRequest(`Idioma Whisper invalido: ${language}. Use pt ou auto.`);
  }

  return normalized;
}

function buildTranscribeArgs(audioPath, outputPath, config = {}) {
  const whisperConfig = getWhisperConfig(config);

  return [
    TRANSCRIBE_SCRIPT,
    '--audio',
    audioPath,
    '--model',
    whisperConfig.model,
    '--language',
    whisperConfig.language,
    '--output',
    outputPath
  ];
}

function listarTranscricoesBrutas() {
  ensureWorkingDirs();

  return fs.readdirSync(RAW_TRANSCRIPTIONS_DIR)
    .filter((filename) => path.extname(filename).toLowerCase() === '.txt')
    .sort();
}

function lerTranscricaoBruta(filename) {
  const safeName = assertSafeTextFilename(filename);
  const filePath = path.join(RAW_TRANSCRIPTIONS_DIR, safeName);

  if (!fs.existsSync(filePath)) {
    const error = new Error(`Transcricao bruta nao encontrada: ${safeName}`);
    error.statusCode = 404;
    throw error;
  }

  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

function salvarTranscricaoCurada(filename, text) {
  const safeName = assertSafeTextFilename(filename);
  const curatedName = gerarNomeCurado(safeName);
  const targetPath = path.join(TOOL_ROOT, 'transcricoes_curadas', curatedName);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, String(text || '').trim(), 'utf8');

  return {
    filename: curatedName,
    absolutePath: targetPath,
    path: toSlash(path.relative(TOOL_ROOT, targetPath))
  };
}

function gerarNomeCurado(filename) {
  const safeName = assertSafeTextFilename(filename);
  const parsed = path.parse(safeName);

  return `${parsed.name}_curada.txt`;
}

function listarTranscricoesCuradas() {
  ensureWorkingDirs();

  return fs.readdirSync(CURATED_TRANSCRIPTIONS_DIR)
    .filter((filename) => path.extname(filename).toLowerCase() === '.txt')
    .sort();
}

function lerTranscricaoCurada(filename) {
  const safeName = assertSafeTextFilename(filename);
  const filePath = path.join(CURATED_TRANSCRIPTIONS_DIR, safeName);

  if (!fs.existsSync(filePath)) {
    const error = new Error(`Transcricao curada nao encontrada: ${safeName}`);
    error.statusCode = 404;
    throw error;
  }

  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

function listarTaxonomiasDisponiveis() {
  const taxonomias = {};

  for (const nome of Object.keys(TAXONOMY_MAP)) {
    taxonomias[nome] = carregarTaxonomia(nome);
  }

  return taxonomias;
}

function carregarTaxonomia(nome) {
  const fileName = TAXONOMY_MAP[nome];

  if (!fileName) {
    const error = new Error(`Taxonomia desconhecida: ${nome}`);
    error.statusCode = 400;
    throw error;
  }

  const filePath = path.join(TAXONOMY_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    const error = new Error(`Arquivo de taxonomia nao encontrado: ${fileName}`);
    error.statusCode = 500;
    throw error;
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));

  if (!Array.isArray(parsed)) {
    const error = new Error(`Taxonomia invalida: ${nome}`);
    error.statusCode = 500;
    throw error;
  }

  return parsed;
}

function validarValorTaxonomia(nomeTaxonomia, valor) {
  if (typeof valor !== 'string' || valor.trim() === '') {
    return false;
  }

  return carregarTaxonomia(nomeTaxonomia).some((item) => item && item.id === valor);
}

function gerarNomePadraoLocucao(payloadOrFilename, directory = PATTERNS_DIR) {
  if (payloadOrFilename && typeof payloadOrFilename === 'object' && !Array.isArray(payloadOrFilename)) {
    return buildSemanticFilename(payloadOrFilename, directory);
  }

  const safeName = assertSafeTextFilename(payloadOrFilename);
  const parsed = path.parse(safeName);

  return normalizeSemanticFilename(`${parsed.name}_padrao_locucao.json`);
}

function salvarPadraoLocucao(payload) {
  const normalized = validarPayloadPadraoLocucao(payload);
  const patternFilename = gerarNomePadraoLocucao(normalized, PATTERNS_DIR);
  const targetPath = path.join(PATTERNS_DIR, patternFilename);
  const sourcePath = path.join(CURATED_TRANSCRIPTIONS_DIR, normalized.sourceFilename);

  fs.mkdirSync(PATTERNS_DIR, { recursive: true });

  const output = {
    type: 'padrao_locucao',
    source: {
      kind: 'transcricao_curada',
      filename: normalized.sourceFilename,
      originalFilename: normalized.originalFilename,
      path: toSlash(path.relative(path.join(TOOL_ROOT, '..', '..'), sourcePath))
    },
    titulo: normalized.titulo,
    segmento: normalized.segmento,
    tipo_dor: normalized.tipo_dor,
    hook_type: normalized.hook_type,
    estrutura_narrativa: normalized.estrutura_narrativa,
    tom_emocional: normalized.tom_emocional,
    tipo_cta: normalized.tipo_cta,
    formato_conteudo: normalized.formato_conteudo,
    estilo_visual: normalized.estilo_visual,
    objetivo_comercial: normalized.objetivo_comercial,
    observacoes: normalized.observacoes,
    createdAt: new Date().toISOString(),
    status: 'draft'
  };

  fs.writeFileSync(targetPath, JSON.stringify(output, null, 2), 'utf8');

  return {
    filename: patternFilename,
    absolutePath: targetPath,
    path: toSlash(path.relative(TOOL_ROOT, targetPath)),
    payload: output
  };
}

function listarPadroesLocucaoDraft() {
  ensureWorkingDirs();

  return fs.readdirSync(PATTERNS_DIR)
    .filter((filename) => path.extname(filename).toLowerCase() === '.json')
    .sort();
}

function listarPadroesLocucaoApproved() {
  const approvedDir = getApprovedPatternsDir();

  fs.mkdirSync(approvedDir, { recursive: true });

  return fs.readdirSync(approvedDir)
    .filter((filename) => path.extname(filename).toLowerCase() === '.json' && filename !== 'index.json')
    .sort();
}

function lerPadraoLocucaoDraft(filename) {
  const safeName = assertSafeJsonFilename(filename);
  const filePath = path.join(PATTERNS_DIR, safeName);

  if (!fs.existsSync(filePath)) {
    const error = new Error(`Padrao draft nao encontrado: ${safeName}`);
    error.statusCode = 404;
    throw error;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function validarPadraoLocucaoContraTaxonomia(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throwBadRequest('Padrao de locucao deve ser um objeto.');
  }

  for (const [field, taxonomyName] of Object.entries(PATTERN_TAXONOMY_FIELDS)) {
    if (!validarValorTaxonomia(taxonomyName, payload[field])) {
      throwBadRequest(`Valor invalido para ${field}: ${payload[field]}`);
    }
  }

  return true;
}

function validarPadraoLocucaoSchema(payload) {
  const requiredFields = [
    'type',
    'source',
    'titulo',
    'segmento',
    'tipo_dor',
    'hook_type',
    'estrutura_narrativa',
    'tom_emocional',
    'tipo_cta',
    'formato_conteudo',
    'estilo_visual',
    'objetivo_comercial',
    'observacoes',
    'status'
  ];

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throwBadRequest('Padrao de locucao deve ser um objeto.');
  }

  for (const field of requiredFields) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      throwBadRequest(`Campo obrigatorio ausente: ${field}`);
    }
  }

  if (payload.type !== 'padrao_locucao') {
    throwBadRequest('Campo type deve ser padrao_locucao.');
  }

  if (!payload.source || typeof payload.source !== 'object' || payload.source.kind !== 'transcricao_curada') {
    throwBadRequest('Campo source deve apontar para transcricao_curada.');
  }

  if (!['draft', 'approved'].includes(payload.status)) {
    throwBadRequest('Status deve ser draft ou approved.');
  }

  validarPadraoLocucaoContraTaxonomia(payload);

  return true;
}

function gerarNomePromovido(filename) {
  const safeName = assertSafeJsonFilename(filename);
  const destinationDir = getApprovedPatternsDir();
  const parsed = path.parse(safeName);
  let candidate = safeName;
  let counter = 2;

  while (fs.existsSync(path.join(destinationDir, candidate))) {
    candidate = `${parsed.name}_${counter}${parsed.ext}`;
    counter++;
  }

  return candidate;
}

function promoverPadraoLocucao(filename) {
  const safeName = assertSafeJsonFilename(filename);
  const draftPath = path.join(PATTERNS_DIR, safeName);

  if (!fs.existsSync(draftPath)) {
    const error = new Error(`Padrao draft nao encontrado: ${safeName}`);
    error.statusCode = 404;
    throw error;
  }

  const draftPayload = lerPadraoLocucaoDraft(safeName);
  validarPadraoLocucaoSchema(draftPayload);

  const destinationDir = getApprovedPatternsDir();
  const promotedFilename = gerarNomePromovido(safeName);
  const destinationPath = path.join(destinationDir, promotedFilename);
  const repoRoot = path.join(TOOL_ROOT, '..', '..');

  fs.mkdirSync(destinationDir, { recursive: true });

  const promotedPayload = {
    ...draftPayload,
    source: draftPayload.source,
    status: 'approved',
    createdAt: draftPayload.createdAt || new Date().toISOString(),
    approvedAt: new Date().toISOString(),
    promotedFrom: toSlash(path.relative(repoRoot, draftPath))
  };

  fs.writeFileSync(destinationPath, JSON.stringify(promotedPayload, null, 2), 'utf8');

  return {
    promotedFilename,
    absolutePath: destinationPath,
    destination: toSlash(path.relative(repoRoot, destinationPath)),
    payload: promotedPayload
  };
}

async function handlePromoverPadraoLocucao(request, response) {
  const body = await readRequestBody(request, 2 * 1024 * 1024);
  let payload;

  try {
    payload = JSON.parse(body.toString('utf8').replace(/^\uFEFF/, ''));
  } catch (_) {
    sendJson(response, 400, {
      success: false,
      message: 'Body JSON invalido.'
    });
    return;
  }

  const result = promoverPadraoLocucao(payload.filename);
  const rebuild = rebuildSemanticReports();
  sendJson(response, 200, {
    success: rebuild.success,
    promotedFilename: result.promotedFilename,
    destination: result.destination,
    rebuild,
    message: rebuild.success
      ? 'Padrao promovido e inteligencia reconstruida.'
      : 'Padrao promovido, mas o rebuild semantico falhou parcialmente.'
  });
}

function validarPayloadPadraoLocucao(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throwBadRequest('Payload de padrao_locucao deve ser um objeto.');
  }

  const requiredStringFields = [
    'sourceFilename',
    'titulo',
    'observacoes',
    ...Object.keys(PATTERN_TAXONOMY_FIELDS)
  ];
  const normalized = {};

  for (const field of requiredStringFields) {
    const value = payload[field];

    if (typeof value !== 'string' || value.trim() === '') {
      throwBadRequest(`Campo obrigatorio ausente ou invalido: ${field}`);
    }

    normalized[field] = value.trim();
  }

  normalized.sourceFilename = assertSafeTextFilename(normalized.sourceFilename);
  normalized.originalFilename = typeof payload.originalFilename === 'string' && payload.originalFilename.trim() !== ''
    ? assertSafeTextFilename(payload.originalFilename.trim())
    : normalized.sourceFilename;

  const sourcePath = path.join(CURATED_TRANSCRIPTIONS_DIR, normalized.sourceFilename);
  if (!fs.existsSync(sourcePath)) {
    throwBadRequest(`Transcricao curada nao encontrada: ${normalized.sourceFilename}`);
  }

  for (const [field, taxonomyName] of Object.entries(PATTERN_TAXONOMY_FIELDS)) {
    if (!validarValorTaxonomia(taxonomyName, normalized[field])) {
      throwBadRequest(`Valor invalido para ${field}: ${normalized[field]}`);
    }
  }

  return normalized;
}

async function handleSalvarPadraoLocucao(request, response) {
  const body = await readRequestBody(request, 2 * 1024 * 1024);
  let payload;

  try {
    payload = JSON.parse(body.toString('utf8').replace(/^\uFEFF/, ''));
  } catch (_) {
    sendJson(response, 400, {
      success: false,
      message: 'Body JSON invalido.'
    });
    return;
  }

  const result = salvarPadraoLocucao(payload);
  sendJson(response, 200, {
    success: true,
    patternFilename: result.filename,
    path: result.path
  });
}

async function handleAssistSemanticExtraction(request, response) {
  const body = await readRequestBody(request, 2 * 1024 * 1024);
  let payload;

  try {
    payload = JSON.parse(body.toString('utf8').replace(/^\uFEFF/, ''));
  } catch (_) {
    sendJson(response, 400, {
      success: false,
      message: 'Body JSON invalido.'
    });
    return;
  }

  if (!payload || typeof payload.text !== 'string' || payload.text.trim() === '') {
    sendJson(response, 400, {
      success: false,
      message: 'Campo text e obrigatorio para sugerir campos semanticos.'
    });
    return;
  }

  sendJson(response, 200, {
    success: true,
    suggestions: inferSemanticSuggestions(payload.text),
    message: 'Sugestoes geradas por heuristica local. Revise todos os campos antes de salvar.'
  });
}

async function handleManualGptBuildPrompt(request, response) {
  const body = await readRequestBody(request, 2 * 1024 * 1024);
  let payload;

  try {
    payload = JSON.parse(body.toString('utf8').replace(/^\uFEFF/, ''));
  } catch (_) {
    sendJson(response, 400, {
      success: false,
      message: 'Body JSON invalido.'
    });
    return;
  }

  try {
    sendJson(response, 200, {
      success: true,
      prompt: buildManualGptPrompt(payload.text)
    });
  } catch (error) {
    sendJson(response, 400, {
      success: false,
      message: error.message
    });
  }
}

async function handleManualGptParseResponse(request, response) {
  const body = await readRequestBody(request, 2 * 1024 * 1024);
  let payload;

  try {
    payload = JSON.parse(body.toString('utf8').replace(/^\uFEFF/, ''));
  } catch (_) {
    sendJson(response, 400, {
      success: false,
      message: 'Body JSON invalido.'
    });
    return;
  }

  try {
    const parsed = extractJsonFromGptResponse(payload.responseText);
    const validation = validateManualGptJson(parsed);

    if (!validation.valid) {
      sendJson(response, 400, {
        success: false,
        message: 'JSON semantico invalido.',
        errors: validation.errors
      });
      return;
    }

    const normalized = normalizeManualGptJson(parsed);
    sendJson(response, 200, {
      success: true,
      json: normalized,
      preview: buildPreviewFromManualGptJson(normalized)
    });
  } catch (error) {
    sendJson(response, 400, {
      success: false,
      message: error.message,
      errors: error.errors || []
    });
  }
}

function throwBadRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

async function handleSalvarTranscricaoCurada(request, response) {
  const body = await readRequestBody(request, 2 * 1024 * 1024);
  let payload;

  try {
    payload = JSON.parse(body.toString('utf8').replace(/^\uFEFF/, ''));
  } catch (_) {
    sendJson(response, 400, {
      success: false,
      message: 'Body JSON invalido.'
    });
    return;
  }

  const result = salvarTranscricaoCurada(payload.filename, payload.text);
  sendJson(response, 200, {
    success: true,
    curatedFilename: result.filename,
    path: result.path
  });
}

function assertSafeTextFilename(filename) {
  if (typeof filename !== 'string' || filename.trim() === '') {
    const error = new Error('Filename deve ser um .txt valido.');
    error.statusCode = 400;
    throw error;
  }

  const trimmed = filename.trim();

  if (trimmed !== path.basename(trimmed) || trimmed.includes('..') || /[\\/]/.test(trimmed)) {
    const error = new Error('Filename invalido: path traversal bloqueado.');
    error.statusCode = 400;
    throw error;
  }

  if (path.extname(trimmed).toLowerCase() !== '.txt') {
    const error = new Error('Apenas arquivos .txt sao aceitos para curadoria.');
    error.statusCode = 400;
    throw error;
  }

  return trimmed;
}

function assertSafeJsonFilename(filename) {
  if (typeof filename !== 'string' || filename.trim() === '') {
    const error = new Error('Filename deve ser um .json valido.');
    error.statusCode = 400;
    throw error;
  }

  const trimmed = filename.trim();

  if (trimmed !== path.basename(trimmed) || trimmed.includes('..') || /[\\/]/.test(trimmed)) {
    const error = new Error('Filename invalido: path traversal bloqueado.');
    error.statusCode = 400;
    throw error;
  }

  if (path.extname(trimmed).toLowerCase() !== '.json') {
    const error = new Error('Apenas arquivos .json sao aceitos para padroes de locucao.');
    error.statusCode = 400;
    throw error;
  }

  return trimmed;
}

function getApprovedPatternsDir() {
  return path.join(TOOL_ROOT, '..', '..', 'data', 'biblioteca_anuncios', 'padroes_locucao');
}

function getWorkflowState() {
  return buildWorkflowStateFromFiles();
}

function buildWorkflowStateFromFiles(options = {}) {
  const state = {
    uploads: listFilesByExtension(options.uploadDir || UPLOAD_DIR, '.mp4'),
    audios: listFilesByExtension(options.audioDir || AUDIO_DIR, '.wav'),
    transcricoesBrutas: listFilesByExtension(options.rawDir || RAW_TRANSCRIPTIONS_DIR, '.txt'),
    transcricoesCuradas: listFilesByExtension(options.curatedDir || CURATED_TRANSCRIPTIONS_DIR, '.txt'),
    padroesDraft: listFilesByExtension(options.patternsDir || PATTERNS_DIR, '.json'),
    padroesApproved: listFilesByExtension(options.approvedDir || getApprovedPatternsDir(), '.json')
      .filter((filename) => filename !== 'index.json'),
    nextStep: '',
    lastUpdatedAt: new Date().toISOString()
  };

  state.nextStep = inferNextStep(state);

  return state;
}

function inferNextStep(workflowState) {
  const state = workflowState || {};

  if (!hasItems(state.uploads)) {
    return 'upload_video';
  }

  if (!hasItems(state.transcricoesBrutas)) {
    return 'aguardar_transcricao_bruta';
  }

  if (!hasItems(state.transcricoesCuradas)) {
    return 'curar_transcricao';
  }

  if (!hasItems(state.padroesDraft)) {
    return 'extrair_padrao_locucao';
  }

  if (!hasItems(state.padroesApproved)) {
    return 'promover_para_brain';
  }

  return 'rebuild_inteligencia';
}

function rebuildSemanticReports(options = {}) {
  const runner = options.runner || safeRunNodeScript;
  const steps = [];

  for (const step of REBUILD_STEPS) {
    console.log(`[video-intelligence] rebuild: ${step.name}`);
    const result = runner(step.script, step.args);
    steps.push({
      name: step.name,
      success: result.success,
      script: step.script,
      args: step.args,
      exit_code: result.exit_code,
      stdout: result.stdout,
      stderr: result.stderr,
      message: result.success ? 'ok' : 'falha no rebuild'
    });

    if (!result.success) {
      console.error(`[video-intelligence] rebuild falhou em ${step.name}: ${result.stderr || result.stdout}`);
      break;
    }
  }

  return {
    success: steps.length === REBUILD_STEPS.length && steps.every((step) => step.success),
    steps,
    lastUpdatedAt: new Date().toISOString()
  };
}

function safeRunNodeScript(scriptPath, args = [], options = {}) {
  const safeScriptPath = assertSafeRepoScriptPath(scriptPath);
  const safeArgs = Array.isArray(args) ? args.map(String) : [];
  const result = spawnSync(process.execPath, [safeScriptPath, ...safeArgs], {
    cwd: options.cwd || REPO_ROOT,
    encoding: 'utf8',
    windowsHide: true,
    timeout: options.timeoutMs || 2 * 60 * 1000
  });

  return {
    success: result.status === 0,
    exit_code: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

function assertSafeRepoScriptPath(scriptPath) {
  if (typeof scriptPath !== 'string' || scriptPath.trim() === '') {
    throwBadRequest('Script invalido para rebuild.');
  }

  const normalized = scriptPath.replace(/\\/g, '/');

  if (path.isAbsolute(normalized) || normalized.includes('..') || !normalized.startsWith('scripts/')) {
    throwBadRequest('Path traversal bloqueado para script de rebuild.');
  }

  if (path.extname(normalized) !== '.js') {
    throwBadRequest('Apenas scripts .js podem ser executados no rebuild.');
  }

  const resolved = path.resolve(REPO_ROOT, normalized);
  const scriptsRoot = path.resolve(REPO_ROOT, 'scripts');

  if (!resolved.startsWith(`${scriptsRoot}${path.sep}`)) {
    throwBadRequest('Script fora da pasta scripts bloqueado.');
  }

  return resolved;
}

function listFilesByExtension(dir, extension) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir)
    .filter((filename) => path.extname(filename).toLowerCase() === extension)
    .sort();
}

function hasItems(value) {
  return Array.isArray(value) && value.length > 0;
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile(command, args, {
      cwd: TOOL_ROOT,
      windowsHide: true,
      timeout: options.timeoutMs || 10 * 60 * 1000
    }, (error, stdout, stderr) => {
      if (error) {
        const wrappedError = new Error(formatCommandError(command, options.dependencyName, error, stdout, stderr));
        wrappedError.code = error.code;
        wrappedError.dependencyName = options.dependencyName;
        reject(wrappedError);
        return;
      }

      resolve({ stdout, stderr });
    });

    child.stdin.end();
  });
}

function formatCommandError(command, dependencyName, error, stdout, stderr) {
  const dependency = dependencyName || command;
  const details = [stderr, stdout, error.message].filter(Boolean).join('\n').trim();

  if (error.code === 'ENOENT') {
    return `${dependency} nao esta disponivel localmente. Instale e teste antes de processar videos.`;
  }

  return `Falha ao executar ${dependency}: ${details}`;
}

function createFriendlyErrorMessage(error) {
  if (error.statusCode === 400 || error.statusCode === 404) {
    return error.message;
  }

  if (error.code === 'INVALID_EXTENSION') {
    return error.message;
  }

  if (error.dependencyName === 'ffmpeg') {
    return 'Nao foi possivel extrair o audio. Verifique se o ffmpeg esta instalado e acessivel no PATH.';
  }

  if (error.dependencyName === 'python/openai-whisper') {
    return 'Nao foi possivel transcrever. Verifique Python e openai-whisper local.';
  }

  return 'Falha no processamento local do video.';
}

function readRequestBody(request, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    request.on('data', (chunk) => {
      total += chunk.length;

      if (total > maxBytes) {
        reject(new Error('Arquivo excede o limite local de upload.'));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });

    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

function parseMultipartFile(body, contentType) {
  return parseMultipartForm(body, contentType).file;
}

function parseMultipartForm(body, contentType) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  if (!boundaryMatch) {
    return {
      file: null,
      fields: {}
    };
  }

  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  const parts = splitBuffer(body, boundary);
  const fields = {};
  let file = null;

  for (const part of parts) {
    const trimmed = trimMultipartPart(part);
    const separatorIndex = trimmed.indexOf(Buffer.from('\r\n\r\n'));

    if (separatorIndex === -1) {
      continue;
    }

    const rawHeaders = trimmed.slice(0, separatorIndex).toString('utf8');
    const content = trimmed.slice(separatorIndex + 4);
    const nameMatch = rawHeaders.match(/name="([^"]+)"/i);
    const filenameMatch = rawHeaders.match(/filename="([^"]+)"/i);

    if (!nameMatch) {
      continue;
    }

    if (filenameMatch) {
      file = {
        filename: filenameMatch[1],
        content
      };
      continue;
    }

    fields[nameMatch[1]] = content.toString('utf8').trim();
  }

  return {
    file,
    fields
  };
}

function splitBuffer(buffer, separator) {
  const parts = [];
  let start = 0;
  let index = buffer.indexOf(separator, start);

  while (index !== -1) {
    if (index > start) {
      parts.push(buffer.slice(start, index));
    }

    start = index + separator.length;
    index = buffer.indexOf(separator, start);
  }

  if (start < buffer.length) {
    parts.push(buffer.slice(start));
  }

  return parts;
}

function trimMultipartPart(part) {
  let start = 0;
  let end = part.length;

  while (start < end && (part[start] === 13 || part[start] === 10)) {
    start++;
  }

  if (part[start] === 45 && part[start + 1] === 45) {
    return Buffer.alloc(0);
  }

  if (end - start >= 2 && part[end - 2] === 13 && part[end - 1] === 10) {
    end -= 2;
  }

  return part.slice(start, end);
}

function createSafeFileName(filename) {
  const parsed = path.parse(filename || 'video.mp4');
  const baseName = parsed.name
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'video';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  return `${baseName}_${stamp}${parsed.ext.toLowerCase()}`;
}

function createSafeTextFileName(filename) {
  const parsed = path.parse(filename || 'transcricao.txt');
  const baseName = parsed.name
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100) || 'transcricao';

  return `${baseName}.txt`;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(payload, null, 2));
}

function toSlash(value) {
  return value.replace(/\\/g, '/');
}

if (require.main === module) {
  startServer();
}

module.exports = {
  AUDIO_DIR,
  ALLOWED_WHISPER_LANGUAGES,
  ALLOWED_WHISPER_MODELS,
  CURATED_TRANSCRIPTIONS_DIR,
  PATTERNS_DIR,
  RAW_TRANSCRIPTIONS_DIR,
  REBUILD_STEPS,
  REPO_ROOT,
  TAXONOMY_DIR,
  TOOL_ROOT,
  UPLOAD_DIR,
  buildWorkflowStateFromFiles,
  buildFfmpegAudioArgs,
  buildTranscribeArgs,
  carregarTaxonomia,
  createSafeFileName,
  createSafeTextFileName,
  extrairAudioDoVideo,
  gerarNomeCurado,
  gerarNomePadraoLocucao,
  gerarNomePromovido,
  getWhisperConfig,
  getWorkflowState,
  handleAssistSemanticExtraction,
  handleManualGptBuildPrompt,
  handleManualGptParseResponse,
  handleUpload,
  inferNextStep,
  lerTranscricaoBruta,
  lerTranscricaoCurada,
  lerPadraoLocucaoDraft,
  listarTaxonomiasDisponiveis,
  listarPadroesLocucaoApproved,
  listarPadroesLocucaoDraft,
  listarTranscricoesBrutas,
  listarTranscricoesCuradas,
  parseMultipartFile,
  parseMultipartForm,
  promoverPadraoLocucao,
  rebuildSemanticReports,
  safeRunNodeScript,
  salvarPadraoLocucao,
  salvarTranscricaoCurada,
  salvarTranscricaoBruta,
  startServer,
  transcreverAudio,
  validarPadraoLocucaoContraTaxonomia,
  validarPadraoLocucaoSchema,
  validarValorTaxonomia,
  validateWhisperLanguage,
  validateWhisperModel
};
