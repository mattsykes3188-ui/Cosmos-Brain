'use strict';

// djb2-xor variant — deterministic 4-char base-36 fingerprint
function hashText(text) {
  const normalized = text.trim().toLowerCase();
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash) ^ normalized.charCodeAt(i);
    hash = hash | 0; // keep 32-bit
  }
  return Math.abs(hash).toString(36).padStart(4, '0').slice(-4);
}

module.exports = { hashText };
