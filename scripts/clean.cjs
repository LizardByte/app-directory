#!/usr/bin/env node

/**
 * Clean build artifacts
 */

const fs = require('node:fs');

function clean() {
  const distDir = 'dist';

  if (fs.existsSync(distDir)) {
    console.log(`Removing ${distDir} directory...`);
    fs.rmSync(distDir, { recursive: true, force: true });
    console.log('✓ Clean complete!');
  } else {
    console.log('Nothing to clean.');
  }
}

clean();
