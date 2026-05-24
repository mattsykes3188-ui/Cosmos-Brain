'use strict';

const fs = require('fs');
const path = require('path');

function validate(object, schemaName) {
  const schemaPath = path.join(__dirname, '..', 'schemas', `${schemaName}.schema.json`);

  if (!fs.existsSync(schemaPath)) {
    return { valid: false, errors: [`Schema não encontrado: ${schemaName}`] };
  }

  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  const errors = [];

  for (const field of schema.required) {
    const value = object[field];

    if (value === undefined || value === null || value === '') {
      errors.push(`Campo obrigatório ausente ou vazio: "${field}"`);
      continue;
    }

    const rules = schema.fields[field];
    if (!rules) continue;

    if (rules.type === 'number') {
      if (typeof value !== 'number') {
        errors.push(`"${field}" deve ser número, recebeu ${typeof value}`);
      } else {
        if (rules.min !== undefined && value < rules.min)
          errors.push(`"${field}" deve ser >= ${rules.min} (recebeu ${value})`);
        if (rules.max !== undefined && value > rules.max)
          errors.push(`"${field}" deve ser <= ${rules.max} (recebeu ${value})`);
      }
    }

    if (rules.type === 'string' && typeof value === 'string' && rules.minLength) {
      if (value.length < rules.minLength)
        errors.push(`"${field}" deve ter ao menos ${rules.minLength} caracteres`);
    }
  }

  for (const field of (schema.optional || [])) {
    const value = object[field];
    if (value === undefined) continue;

    const rules = schema.fields[field];
    if (!rules) continue;

    if (rules.type === 'array' && !Array.isArray(value))
      errors.push(`"${field}" deve ser array`);
    if (rules.type === 'boolean' && typeof value !== 'boolean')
      errors.push(`"${field}" deve ser boolean`);
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}

module.exports = { validate };
