#!/usr/bin/env node

/**
 * Build aggregated index files from individual app files for each project
 */

const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const { glob } = require('glob');

// Version constants
// Increment PROJECT_INDEX_VERSION when making breaking changes to project index structure
// Increment MASTER_INDEX_VERSION when making breaking changes to master index structure
const PROJECT_INDEX_VERSION = '0.1.0';
const MASTER_INDEX_VERSION = '0.1.0';

/**
 * Fetch GitHub repository metadata using GitHub API
 * @param {string} repoUrl - GitHub repository URL
 * @returns {Promise<object|null>} Repository metadata or null if not available
 */
async function fetchGitHubMetadata(repoUrl) {
  if (!repoUrl) {
    return null;
  }

  try {
    // Parse and validate the URL to prevent substring injection attacks
    const url = new URL(repoUrl);
    if (url.hostname !== 'github.com') {
      return null;
    }

    // Extract owner/repo from URL
    const match = new RegExp(/github\.com\/([^/]+)\/([^/]+)/).exec(repoUrl);
    if (!match) {
      return null;
    }

    const [, owner, repo] = match;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo.replace(/\.git$/, '')}`;

    // Use fetch (available in Node 18+)
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'LizardByte-App-Directory',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return {
      stars: data.stargazers_count,
      openIssues: data.open_issues_count,
      forks: data.forks_count,
      lastUpdated: data.updated_at,
      license: data.license?.spdx_id || null,
    };
  } catch (error_) {
    // GitHub metadata is optional - log error but continue build
    console.error(`    Warning: Failed to fetch GitHub metadata: ${error_.message}`);
    return null;
  }
}

async function loadAllApps() {
  const apps = [];
  const appFiles = await glob('apps/**/*.json');

  for (const file of appFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const app = JSON.parse(content);

      // Fetch GitHub metadata if available
      let githubMetadata = null;
      if (app.links?.github) {
        console.log(`  Fetching GitHub metadata for ${app.id}...`);
        githubMetadata = await fetchGitHubMetadata(app.links.github);
      }

      // Include ALL fields from the app definition
      const indexEntry = {
        ...app,
        // Add GitHub metadata if available
        ...(githubMetadata && {
          github: githubMetadata,
        }),
      };

      apps.push(indexEntry);
    } catch (err) {
      console.error(`Error processing ${file}:`, err.message);
    }
  }

  return apps;
}

async function buildProjectIndex(projectId, projectConfig, allApps) {
  // Filter apps based on project configuration
  let projectApps = [...allApps];

  // Apply include_only filter if specified
  if (projectConfig.include_only && projectConfig.include_only.length > 0) {
    projectApps = projectApps.filter(app => projectConfig.include_only.includes(app.id));
  }

  // Apply exclude_apps filter
  if (projectConfig.exclude_apps && projectConfig.exclude_apps.length > 0) {
    projectApps = projectApps.filter(app => !projectConfig.exclude_apps.includes(app.id));
  }

  // Filter by featured categories
  if (projectConfig.featured_categories && projectConfig.featured_categories.length > 0) {
    projectApps = projectApps.filter(app => projectConfig.featured_categories.includes(app.category));
  }

  // Load project-specific categories
  const categoriesPath = `projects/${projectId}/categories.json`;
  if (!fs.existsSync(categoriesPath)) {
    console.error(`Categories file not found for ${projectId}: ${categoriesPath}`);
    return null;
  }

  const categoriesContent = fs.readFileSync(categoriesPath, 'utf8');
  const categoriesData = JSON.parse(categoriesContent);

  // Count apps per category
  const categoryCounts = {};
  projectApps.forEach(app => {
    categoryCounts[app.category] = (categoryCounts[app.category] || 0) + 1;
  });

  // Add counts to categories and namespace them with project ID to avoid clashes
  const categories = categoriesData.categories.map(cat => ({
    ...cat,
    // Namespace category ID with project to avoid clashes across projects
    // e.g., "client" becomes "sunshine:client"
    id: `${projectId}:${cat.id}`,
    originalId: cat.id, // Keep original for reference
    count: categoryCounts[cat.id] || 0,
  }));

  // Update app categories to use namespaced IDs
  projectApps = projectApps.map(app => ({
    ...app,
    category: `${projectId}:${app.category}`,
  }));

  // Build index
  return {
    version: PROJECT_INDEX_VERSION,
    project: {
      id: projectConfig.id,
      name: projectConfig.name,
      description: projectConfig.description || '',
    },
    updated: new Date().toISOString(),
    apps: projectApps.toSorted((a, b) => {
      // Featured apps first
      if (a.featured && !b.featured) {
        return -1;
      }
      if (!a.featured && b.featured) {
        return 1;
      }
      // Then alphabetically
      return a.name.localeCompare(b.name);
    }),
    categories: categories,
  };
}

async function buildIndexes() {
  // Ensure dist directory exists
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
  }

  // Load all apps
  console.log('Loading all apps...');
  const allApps = await loadAllApps();
  console.log(`Loaded ${allApps.length} apps`);

  // Find all project configuration files in subdirectories
  const projectFiles = await glob('projects/*/project.json');

  for (const projectFile of projectFiles) {
    try {
      const projectDir = path.dirname(projectFile);
      const projectId = path.basename(projectDir);
      const content = fs.readFileSync(projectFile, 'utf8');
      const projectConfig = JSON.parse(content);

      console.log(`\nBuilding index for project: ${projectConfig.name}`);
      const index = await buildProjectIndex(projectId, projectConfig, allApps);

      if (index) {
        // Write project-specific index
        const outputPath = `dist/${projectId}.json`;
        fs.writeFileSync(outputPath, JSON.stringify(index, null, 2));
        console.log(`✓ Built ${outputPath}: ${index.apps.length} apps, ${index.categories.length} categories`);
      }
    } catch (err) {
      console.error(`Error building index for ${projectFile}:`, err.message);
    }
  }

  // Also create a master index with all apps and all unique categories
  console.log('\nBuilding master index...');
  const allCategories = new Set();
  const categoryData = {};

  // Collect all categories from all projects with namespacing
  const categoryFiles = await glob('projects/*/categories.json');
  for (const catFile of categoryFiles) {
    const projectId = path.basename(path.dirname(catFile));
    const content = fs.readFileSync(catFile, 'utf8');
    const data = JSON.parse(content);
    data.categories.forEach(cat => {
      const namespacedId = `${projectId}:${cat.id}`;
      if (!allCategories.has(namespacedId)) {
        allCategories.add(namespacedId);
        categoryData[namespacedId] = {
          ...cat,
          id: namespacedId,
          originalId: cat.id,
          project: projectId,
        };
      }
    });
  }

  // Count apps per category (using original category IDs)
  const categoryCounts = {};
  allApps.forEach(app => {
    categoryCounts[app.category] = (categoryCounts[app.category] || 0) + 1;
  });

  const masterCategories = Object.values(categoryData).map(cat => ({
    ...cat,
    count: categoryCounts[cat.originalId] || 0,
  }));

  const masterIndex = {
    version: MASTER_INDEX_VERSION,
    updated: new Date().toISOString(),
    apps: allApps.toSorted((a, b) => {
      if (a.featured && !b.featured) {
        return -1;
      }
      if (!a.featured && b.featured) {
        return 1;
      }
      return a.name.localeCompare(b.name);
    }),
    categories: masterCategories,
  };

  fs.writeFileSync('dist/index.json', JSON.stringify(masterIndex, null, 2));
  console.log(`✓ Built dist/index.json: ${masterIndex.apps.length} apps, ${masterCategories.length} categories`);

  console.log('\n✓ Build complete!');
}

buildIndexes().catch(console.error);
