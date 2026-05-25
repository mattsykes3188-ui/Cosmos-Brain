'use strict';

const REQUIRED_FIELDS = [
  'type',
  'product',
  'objective',
  'style',
  'strength',
  'text',
  'context',
  'source_type'
];

function validateBrainItem(item) {
  const errors = [];

  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return {
      valid: false,
      errors: ['Item must be an object.']
    };
  }

  for (const field of REQUIRED_FIELDS) {
    const value = item[field];

    if (value === undefined || value === null || value === '') {
      errors.push(`Missing required field: ${field}`);
      continue;
    }

    if (field !== 'strength' && typeof value !== 'string') {
      errors.push(`Field ${field} must be a string.`);
    }
  }

  if (item.id !== undefined && item.id !== null && typeof item.id !== 'string') {
    errors.push('Field id must be a string when provided.');
  }

  const hasStrength = item.strength !== undefined && item.strength !== null && item.strength !== '';

  if (hasStrength && typeof item.strength !== 'number') {
    errors.push('Field strength must be a number.');
  } else if (hasStrength && (item.strength < 1 || item.strength > 5)) {
    errors.push('Field strength must be between 1 and 5.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateBrainItem,
  validate: validateBrainItem
};
