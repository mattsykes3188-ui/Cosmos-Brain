'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const {
  AUDIO_DIR,
  extrairAudioDoVideo
} = require('../tools/video-intelligence/server');

const testRoot = path.join(__dirname, '.tmp_video_audio_extraction');
const sampleVideoPath = path.join(testRoot, 'sample.mp4');

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

function reset() {
  fs.rmSync(testRoot, { recursive: true, force: true });
  fs.mkdirSync(testRoot, { recursive: true });
}

function cleanup() {
  fs.rmSync(testRoot, { recursive: true, force: true });
  for (const file of fs.readdirSync(AUDIO_DIR).filter((name) => name.startsWith('sample') && name.endsWith('.wav'))) {
    fs.rmSync(path.join(AUDIO_DIR, file), { force: true });
  }
}

async function run() {
  reset();

  console.log('\n[TEST 1] audio extraction exports function');
  assert(typeof extrairAudioDoVideo === 'function', 'extrairAudioDoVideo exists');

  if (!commandAvailable('ffmpeg', ['-version'])) {
    console.log('  SKIP ffmpeg not available locally; real extraction skipped');
    cleanup();
    finish();
    return;
  }

  console.log('\n[TEST 2] ffmpeg extracts wav from local mp4');
  execFileSync('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=1000:duration=1',
    '-f',
    'lavfi',
    '-i',
    'color=c=black:s=160x120:d=1',
    '-shortest',
    '-c:v',
    'mpeg4',
    '-c:a',
    'aac',
    sampleVideoPath
  ], { stdio: 'ignore' });

  const result = await extrairAudioDoVideo(sampleVideoPath);
  assert(result.filename.endsWith('.wav'), 'audio filename ends with .wav');
  assert(fs.existsSync(result.absolutePath), 'audio file exists');
  assert(result.path.startsWith('audio/'), 'audio relative path is inside audio folder');

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
