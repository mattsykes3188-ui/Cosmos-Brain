'use strict';

// Princípio: Agente propõe. Core valida. Core salva. Core registra.
// Nenhum agente salva diretamente em data/ — todo salvamento passa por aqui.

const fs = require('fs');
const path = require('path');

const { validate }     = require('./validator');
const { isDuplicate }  = require('./deduplicator');
const { generateId }   = require('./ids');
const { log }          = require('./logger');

function write(object, type) {
  // schemas usam nome singular: 'hooks' → 'hook'
  const schemaName = type.replace(/s$/, '');

  // ── 1. Validação ──────────────────────────────────────────────────────────
  const validation = validate(object, schemaName);
  if (!validation.valid) {
    log('write', { status: 'validation_error', item_id: null, errors: validation.errors });
    return { success: false, errors: validation.errors };
  }

  // ── 2. Detecção de duplicata ──────────────────────────────────────────────
  if (isDuplicate(object.text, type)) {
    const errors = [`Texto duplicado detectado em data/${type}/`];
    log('write', { status: 'duplicate', item_id: null, errors });
    return { success: false, errors };
  }

  // ── 3. Geração de ID ──────────────────────────────────────────────────────
  const subtype = object.style || object.subtype || 'default';
  const id = generateId(type, subtype, object.text);

  // ── 4. Enriquecimento e salvamento ────────────────────────────────────────
  const enriched = {
    ...object,
    id,
    created_at: new Date().toISOString().slice(0, 10)
  };

  const dir = path.join(__dirname, '..', 'data', type);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${id}.json`);

  try {
    fs.writeFileSync(filePath, JSON.stringify(enriched, null, 2), 'utf-8');
  } catch (e) {
    const errors = [`Erro ao salvar arquivo: ${e.message}`];
    log('write', { status: 'save_error', item_id: id, errors });
    return { success: false, errors };
  }

  // ── 5. Registro de sucesso ────────────────────────────────────────────────
  log('write', { status: 'success', item_id: id, errors: [] });

  return { success: true, id, path: filePath };
}

module.exports = { write };
