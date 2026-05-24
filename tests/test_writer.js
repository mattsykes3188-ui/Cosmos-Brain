'use strict';

const { write } = require('../core/writer');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}`);
    failed++;
  }
}

// ── TEST 1: Salvar hook válido ─────────────────────────────────────────────
console.log('\n[TEST 1] Salvar hook válido');

const uniqueText = `Cada detalhe do uniforme fala pela sua marca — e o cliente percebe antes de você abrir a boca. [ts:${Date.now()}]`;

const validHook = {
  type: 'hook',
  product: 'uniforme corporativo premium',
  objective: 'capturar atenção de gestores no feed',
  style: 'premium',
  emotion: 'confiança',
  strength: 4,
  text: uniqueText,
  context: 'post carrossel Instagram para donos de empresa B2B',
  source_type: 'manual',
  tags: ['uniforme', 'marca', 'b2b']
};

const r1 = write(validHook, 'hooks');
console.log('  Retorno:', r1);
assert(r1.success === true,        'deve salvar com sucesso');
assert(typeof r1.id === 'string',  'deve retornar id gerado');
assert(fs.existsSync(r1.path),     'arquivo deve existir em disco');

// ── TEST 2: Rejeitar hook inválido ────────────────────────────────────────
console.log('\n[TEST 2] Rejeitar hook sem campos obrigatórios');

const r2 = write({ type: 'hook', text: 'texto sem contexto' }, 'hooks');
console.log('  Retorno:', r2);
assert(r2.success === false,                             'deve ser rejeitado');
assert(Array.isArray(r2.errors) && r2.errors.length > 0, 'deve listar erros');
assert(r2.errors.some(e => e.includes('obrigatório')),   'erros devem citar campos obrigatórios');

// ── TEST 3: Rejeitar duplicata ────────────────────────────────────────────
console.log('\n[TEST 3] Rejeitar texto duplicado');

const r3 = write({ ...validHook }, 'hooks');
console.log('  Retorno:', r3);
assert(r3.success === false,                             'deve ser rejeitado');
assert(r3.errors.some(e => e.toLowerCase().includes('duplicado')), 'erro deve mencionar duplicata');

// ── TEST 4: Verificar strength fora do range ──────────────────────────────
console.log('\n[TEST 4] Rejeitar strength=6 (fora do range 1-5)');

const r4 = write({ ...validHook, text: 'texto unico para teste de range ' + Date.now(), strength: 6 }, 'hooks');
console.log('  Retorno:', r4);
assert(r4.success === false,                  'deve ser rejeitado');
assert(r4.errors.some(e => e.includes('"strength"')), 'erro deve citar "strength"');

// ── TEST 5: Verificar log gerado ──────────────────────────────────────────
console.log('\n[TEST 5] Verificar log do dia');

const today = new Date().toISOString().slice(0, 10);
const logPath = path.join(__dirname, '..', 'logs', `log_${today}.json`);

assert(fs.existsSync(logPath), 'arquivo de log deve existir');

const logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
assert(logs.some(l => l.status === 'success'),          'log deve ter entrada de sucesso');
assert(logs.some(l => l.status === 'validation_error'), 'log deve ter entrada de validation_error');
assert(logs.some(l => l.status === 'duplicate'),        'log deve ter entrada de duplicate');

console.log(`\n  Últimas entradas do log (${logs.length} total):`);
logs.slice(-4).forEach(l =>
  console.log(`    [${l.status.padEnd(17)}] id=${l.item_id || '—'} | ${l.timestamp}`)
);

// ── Resultado ─────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(55));
console.log(`Resultado: ${passed} passou | ${failed} falhou`);
if (failed === 0) console.log('Todos os testes passaram.');
