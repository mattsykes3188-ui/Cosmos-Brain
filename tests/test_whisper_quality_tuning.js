'use strict';

const fs = require('fs');
const path = require('path');

const {
  RAW_TRANSCRIPTIONS_DIR,
  buildFfmpegAudioArgs,
  buildTranscribeArgs,
  getWhisperConfig,
  transcreverAudio,
  validateWhisperLanguage,
  validateWhisperModel
} = require('../tools/video-intelligence/server');

const rootDir = path.join(__dirname, '..');
const transcribePath = path.join(rootDir, 'tools', 'video-intelligence', 'transcribe.py');
const tmpDir = path.join(__dirname, '.tmp_whisper_quality');
const audioPath = path.join(tmpDir, 'quality.wav');
const outputTranscript = path.join(RAW_TRANSCRIPTIONS_DIR, 'quality.txt');

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

function cleanup() {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.rmSync(outputTranscript, { force: true });
}

async function main() {
  cleanup();
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(audioPath, 'fake wav content', 'utf8');

  console.log('\n[TEST 1] transcribe.py contract');
  assert(fs.existsSync(transcribePath), 'transcribe.py exists');
  const transcribeSource = fs.readFileSync(transcribePath, 'utf8');
  assert(transcribeSource.includes('--audio'), 'transcribe.py accepts --audio');
  assert(transcribeSource.includes('--model'), 'transcribe.py accepts --model');
  assert(transcribeSource.includes('--language'), 'transcribe.py accepts --language');
  assert(transcribeSource.includes('--output'), 'transcribe.py accepts --output');
  assert(transcribeSource.includes('fp16'), 'transcribe.py configures fp16');
  assert(transcribeSource.includes('"small"') || transcribeSource.includes("'small'"), 'transcribe.py supports small model default');

  console.log('\n[TEST 2] model and language validation');
  assert(validateWhisperModel('tiny') === 'tiny', 'accepts tiny model');
  assert(validateWhisperModel('base') === 'base', 'accepts base model');
  assert(validateWhisperModel('small') === 'small', 'accepts small model');
  assert(validateWhisperModel('medium') === 'medium', 'accepts medium model');
  assert(validateWhisperModel('large') === 'large', 'accepts large model');
  assertThrows(() => validateWhisperModel('mega'), 'rejects invalid model');
  assert(validateWhisperLanguage('pt') === 'pt', 'accepts pt language');
  assert(validateWhisperLanguage('auto') === 'auto', 'accepts auto language');
  assertThrows(() => validateWhisperLanguage('en'), 'rejects invalid language');
  assert(getWhisperConfig({}).model === 'small', 'default model is small');
  assert(getWhisperConfig({}).language === 'pt', 'default language is pt');

  console.log('\n[TEST 3] ffmpeg audio extraction args');
  const ffmpegArgs = buildFfmpegAudioArgs('input.mp4', 'output.wav');
  assert(ffmpegArgs.includes('-ac') && ffmpegArgs[ffmpegArgs.indexOf('-ac') + 1] === '1', 'ffmpeg uses mono audio');
  assert(ffmpegArgs.includes('-ar') && ffmpegArgs[ffmpegArgs.indexOf('-ar') + 1] === '16000', 'ffmpeg uses 16000 Hz');
  assert(ffmpegArgs.includes('-vn'), 'ffmpeg removes video stream');
  assert(ffmpegArgs.includes('-y'), 'ffmpeg overwrites output safely');

  console.log('\n[TEST 4] transcription command args');
  const args = buildTranscribeArgs('audio.wav', 'transcricao.txt', {
    model: 'medium',
    language: 'pt'
  });
  assert(args.includes('--audio') && args.includes('audio.wav'), 'transcription args include --audio');
  assert(args.includes('--model') && args.includes('medium'), 'transcription args include --model');
  assert(args.includes('--language') && args.includes('pt'), 'transcription args include --language');
  assert(args.includes('--output') && args.includes('transcricao.txt'), 'transcription args include --output');

  let capturedCommand = null;
  let capturedArgs = null;
  const result = await transcreverAudio(audioPath, {
    model: 'base',
    language: 'auto',
    runCommandFn: async (command, commandArgs) => {
      capturedCommand = command;
      capturedArgs = commandArgs;
      const outputIndex = commandArgs.indexOf('--output') + 1;
      fs.writeFileSync(commandArgs[outputIndex], 'Transcricao mockada em portugues.', 'utf8');
      return {
        stdout: 'ok',
        stderr: ''
      };
    }
  });

  assert(capturedCommand, 'transcreverAudio calls runner');
  assert(capturedArgs.includes('--model') && capturedArgs.includes('base'), 'transcreverAudio passes selected model');
  assert(capturedArgs.includes('--language') && capturedArgs.includes('auto'), 'transcreverAudio passes selected language');
  assert(result.filename === 'quality.txt', 'transcreverAudio writes expected transcript filename');
  assert(result.text.includes('Transcricao mockada'), 'transcreverAudio reads mocked transcript output');

  console.log('\n[TEST 5] dashboard principal remains separate');
  assert(fs.existsSync(path.join(rootDir, 'index.html')), 'main dashboard index.html still exists');

  cleanup();

  console.log('\n' + '-'.repeat(48));
  console.log(`Result: ${passed} passed | ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  cleanup();
  console.error(error);
  process.exit(1);
});
