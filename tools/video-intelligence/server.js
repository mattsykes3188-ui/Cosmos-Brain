'use strict';

const { execFile } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const PORT = Number(process.env.PORT || 5600);
const TOOL_ROOT = __dirname;
const PUBLIC_DIR = path.join(TOOL_ROOT, 'public');
const UPLOAD_DIR = path.join(TOOL_ROOT, 'uploads');
const AUDIO_DIR = path.join(TOOL_ROOT, 'audio');
const RAW_TRANSCRIPTIONS_DIR = path.join(TOOL_ROOT, 'transcricoes_brutas');
const CURATED_TRANSCRIPTIONS_DIR = path.join(TOOL_ROOT, 'transcricoes_curadas');
const PATTERNS_DIR = path.join(TOOL_ROOT, 'padroes_locucao');
const TAXONOMY_DIR = path.join(TOOL_ROOT, '..', '..', 'data', 'taxonomia');
const TRANSCRIBE_SCRIPT = path.join(TOOL_ROOT, 'transcribe.py');
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
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
  const file = parseMultipartFile(body, contentType);

  if (!file) {
    sendJson(response, 400, {
      success: false,
      message: 'Nenhum arquivo foi encontrado no upload.'
    });
    return;
  }

  const video = salvarVideoEnviado(file);
  const audio = await extrairAudioDoVideo(video.absolutePath);
  const transcription = await transcreverAudio(audio.absolutePath);

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
      preview: transcription.preview
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

  await runCommand('ffmpeg', [
    '-y',
    '-i',
    videoPath,
    '-vn',
    '-acodec',
    'pcm_s16le',
    '-ar',
    '16000',
    '-ac',
    '1',
    audioPath
  ], {
    dependencyName: 'ffmpeg'
  });

  return {
    filename: audioFilename,
    absolutePath: audioPath,
    path: toSlash(path.relative(TOOL_ROOT, audioPath))
  };
}

async function transcreverAudio(audioPath) {
  const transcriptFilename = `${path.parse(audioPath).name}.txt`;
  const transcriptPath = path.join(RAW_TRANSCRIPTIONS_DIR, transcriptFilename);
  const pythonCommand = process.env.WHISPER_PYTHON || process.env.PYTHON || 'python';

  await runCommand(pythonCommand, [
    TRANSCRIBE_SCRIPT,
    audioPath,
    transcriptPath,
    '--model',
    process.env.WHISPER_MODEL || 'tiny'
  ], {
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

function gerarNomePadraoLocucao(filename) {
  const safeName = assertSafeTextFilename(filename);
  const parsed = path.parse(safeName);

  return `${parsed.name}_padrao_locucao.json`;
}

function salvarPadraoLocucao(payload) {
  const normalized = validarPayloadPadraoLocucao(payload);
  const patternFilename = gerarNomePadraoLocucao(normalized.sourceFilename);
  const targetPath = path.join(PATTERNS_DIR, patternFilename);
  const sourcePath = path.join(CURATED_TRANSCRIPTIONS_DIR, normalized.sourceFilename);

  fs.mkdirSync(PATTERNS_DIR, { recursive: true });

  const output = {
    type: 'padrao_locucao',
    source: {
      kind: 'transcricao_curada',
      filename: normalized.sourceFilename,
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
  sendJson(response, 200, {
    success: true,
    promotedFilename: result.promotedFilename,
    destination: result.destination
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
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  if (!boundaryMatch) {
    return null;
  }

  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  const parts = splitBuffer(body, boundary);

  for (const part of parts) {
    const trimmed = trimMultipartPart(part);
    const separatorIndex = trimmed.indexOf(Buffer.from('\r\n\r\n'));

    if (separatorIndex === -1) {
      continue;
    }

    const rawHeaders = trimmed.slice(0, separatorIndex).toString('utf8');
    const content = trimmed.slice(separatorIndex + 4);
    const filenameMatch = rawHeaders.match(/filename="([^"]+)"/i);

    if (!filenameMatch) {
      continue;
    }

    return {
      filename: filenameMatch[1],
      content
    };
  }

  return null;
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
  CURATED_TRANSCRIPTIONS_DIR,
  PATTERNS_DIR,
  RAW_TRANSCRIPTIONS_DIR,
  TAXONOMY_DIR,
  TOOL_ROOT,
  UPLOAD_DIR,
  carregarTaxonomia,
  createSafeFileName,
  createSafeTextFileName,
  extrairAudioDoVideo,
  gerarNomeCurado,
  gerarNomePadraoLocucao,
  gerarNomePromovido,
  handleUpload,
  lerTranscricaoBruta,
  lerTranscricaoCurada,
  lerPadraoLocucaoDraft,
  listarTaxonomiasDisponiveis,
  listarPadroesLocucaoDraft,
  listarTranscricoesBrutas,
  listarTranscricoesCuradas,
  parseMultipartFile,
  promoverPadraoLocucao,
  salvarPadraoLocucao,
  salvarTranscricaoCurada,
  salvarTranscricaoBruta,
  startServer,
  transcreverAudio,
  validarPadraoLocucaoContraTaxonomia,
  validarPadraoLocucaoSchema,
  validarValorTaxonomia
};
