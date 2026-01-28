#!/usr/bin/env node

/**
 * Validate JSON files against schemas
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('node:fs');
const { glob } = require('glob');

const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false,
});
addFormats(ajv);

async function validateFiles(schemaPath, pattern, label) {
  console.log(`\nValidating ${label}...`);

  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  const schema = JSON.parse(schemaContent);
  const validate = ajv.compile(schema);

  const files = await glob(pattern);

  if (files.length === 0) {
    console.log(`  No files found matching ${pattern}`);
    return true;
  }

  let allValid = true;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    let data;

    try {
      data = JSON.parse(content);
    } catch (err) {
      console.error(`  ✗ ${file} - Invalid JSON: ${err.message}`);
      allValid = false;
      continue;
    }

    const valid = validate(data);

    if (valid) {
      console.log(`  ✓ ${file}`);
    } else {
      console.error(`  ✗ ${file} - Validation failed:`);
      for (const error of validate.errors) {
        console.error(`    ${error.instancePath || '/'}: ${error.message}`);
      }
      allValid = false;
    }
  }

  return allValid;
}

async function main() {
  const validations = [
    {
      schema: 'schemas/app.schema.json',
      pattern: 'apps/**/*.json',
      label: 'app definitions',
    },
    {
      schema: 'schemas/project.schema.json',
      pattern: 'projects/**/project.json',
      label: 'project configs',
    },
    {
      schema: 'schemas/categories.schema.json',
      pattern: 'projects/**/categories.json',
      label: 'category files',
    },
  ];

  let allValid = true;

  for (const { schema, pattern, label } of validations) {
    const result = await validateFiles(schema, pattern, label);
    if (!result) {
      allValid = false;
    }
  }

  console.log('');

  if (allValid) {
    console.log('✓ All validations passed');
    process.exit(0);
  } else {
    console.error('✗ Validation failed');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
