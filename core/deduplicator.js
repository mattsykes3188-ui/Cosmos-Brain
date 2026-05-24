'use strict';

const fs = require('fs');
const path = require('path');
const { hashText } = require('./hash');

function isDuplicate(text, type) {
  const dir = path.join(__dirname, '..', 'data', type);

  if (!fs.existsSync(dir)) return false;

  const incomingHash = hashText(text);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const content = JSON.parse(
        fs.readFileSync(path.join(dir, file), 'utf-8')
      );
      if (content.text && hashText(content.text) === incomingHash) {
        return true;
      }
    } catch (_) {
      // arquivo corrompido: ignora e continua
    }
  }

  return false;
}

module.exports = { isDuplicate };
