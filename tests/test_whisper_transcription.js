'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const {
  RAW_TRANSCRIPTIONS_DIR,
  salvarTranscricaoBruta,
  transcreverAudio
} = require('../tools/video-intelligence/server');

const testRoot = path.join(__dirname, '.tmp_whisper_transcription');
const sampleAudioPath = path.join(testRoot, 'sample.wav');

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

function commandAvailable(command, args) {
  try {
    execFileSync(command, args, { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

function whisperAvailable() {
  const pythonCommand = process.env.WHISPER_PYTHON || process.env.PYTHON || 'python';

  try {
    execFileSync(pythonCommand, ['-c', 'import whisper'], { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

function reset() {
  fs.rmSync(testRoot, { recursive: true, force: true });
  fs.mkdirSync(testRoot, { recursive: true });
}

function cleanup() {
  fs.rmSync(testRoot, { recursive: true, force: true });
  for (const file of fs.readdirSync(RAW_TRANSCRIPTIONS_DIR).filter((name) => name.startsWith('sample') && name.endsWith('.txt'))) {
    fs.rmSync(path.join(RAW_TRANSCRIPTIONS_DIR, file), { force: true });
  }
  fs.rmSync(path.join(RAW_TRANSCRIPTIONS_DIR, 'unit_transcription.txt'), { force: true });
}

async function run() {
  reset();

  console.log('\n[TEST 1] transcription helpers exist');
  assert(typeof transcreverAudio === 'function', 'transcreverAudio exists');
  assert(typeof salvarTranscricaoBruta === 'function', 'salvarTranscricaoBruta exists');

  console.log('\n[TEST 2] raw transcription path is generated correctly');
  const saved = salvarTranscricaoBruta('Transcricao bruta de teste local.', 'unit_transcription.txt');
  assert(saved.filename === 'unit_transcription.txt', 'txt filename is preserved safely');
  assert(saved.path === 'transcricoes_brutas/unit_transcription.txt', 'txt path points to transcricoes_brutas');
  assert(fs.existsSync(saved.absolutePath), 'txt file is written');
  assert(saved.preview.includes('Transcricao bruta'), 'preview contains transcription text');

  if (!commandAvailable('ffmpeg', ['-version'])) {
    console.log('  SKIP ffmpeg not available locally; real Whisper sample skipped');
    cleanup();
    finish();
    return;
  }

  if (!whisperAvailable()) {
    console.log('  SKIP openai-whisper not available locally; real transcription skipped');
    cleanup();
    finish();
    return;
  }

  console.log('\n[TEST 3] Whisper transcribes a tiny local wav when available');
  execFileSync('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:duration=1',
    '-ar',
    '16000',
    '-ac',
    '1',
    sampleAudioPath
  ], { stdio: 'ignore' });

  const result = await transcreverAudio(sampleAudioPath);
  assert(result.filename === 'sample.txt', 'Whisper output filename matches audio base');
  assert(fs.existsSync(result.absolutePath), 'Whisper output txt exists');
  assert(typeof result.text === 'string', 'Whisper result exposes text string');

  cleanup();
  finish();
}

function finish() {
  console.log('\n' + '-'.repeat(48));
  console.log(`Result: ${passed} passed | ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  cleanup();
  console.error(error);
  process.exit(1);
});
