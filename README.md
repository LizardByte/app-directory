# LizardByte App Directory

A centralized directory of featured applications, clients, tools, and integrations for LizardByte projects.

## Repository Structure

```
app-directory/
├── .github/workflows/
│   └── build.yml              # Auto-build and deploy
├── apps/                      # App definitions
│   ├── moonlight/
│   ├── tools/
│   └── integrations/
├── projects/                  # Project configurations
│   └── sunshine/
│       ├── project.json       # Project config
│       └── categories.json    # Project categories
├── schemas/                   # JSON schemas
│   ├── app.schema.json        # App definition schema
│   ├── categories.schema.json
│   └── project.schema.json
├── scripts/
│   ├── build-index.js
│   └── clean.js
├── dist/                      # Generated (deployed to gh-pages)
│   ├── index.json
│   └── sunshine.json
├── package.json
└── README.md
```

## Quick Start

### Installation

```bash
npm install
```

### Build Indexes

```bash
npm run build        # Build all project indexes
npm run validate     # Validate all JSON files
npm run lint         # Lint JavaScript files
npm run lint:fix     # Auto-fix linting issues
npm test             # Validate + lint + build
npm run clean        # Remove dist directory
```

## Usage

### For Project Web UIs

Each project has its own generated index file:

```javascript
// For Sunshine
const response = await fetch('https://lizardbyte.github.io/app-directory/sunshine.json');
const data = await response.json();

// For master index (all apps)
const response = await fetch('https://lizardbyte.github.io/app-directory/index.json');
const data = await response.json();
```

### Adding a New App

1. Create a JSON file in the appropriate `apps/` subdirectory
2. Follow the schema defined in `schemas/app.schema.json`
3. Validate: `npm run validate`
4. Submit a pull request
5. Indexes will be automatically regenerated and deployed

**Example**: See the Moonlight app definitions:
- [`apps/moonlight/moonlight-qt.json`](apps/moonlight/moonlight-qt.json)
- [`apps/moonlight/moonlight-android.json`](apps/moonlight/moonlight-android.json)

## Schema Fields

### Required Fields
- `id`: Unique identifier (kebab-case)
- `name`: Display name
- `description`: Full description
- `category`: Category ID (must match a category in your project's categories.json)
- `platforms`: Array of supported platforms (windows, macos, linux, android, ios, web)

### Optional Fields
- `tagline`: Short one-liner
- `icon`: URL to app icon (512x512 PNG recommended)
- `screenshots`: Array of screenshot URLs
- `links`: Object with `website`, `github`, `download`, `documentation` URLs
- `tags`: Array of searchable keywords
- `featured`: Boolean to highlight the app
- `compatibility`: Version requirements for host projects
- `metadata`: Author, license, updated timestamp

## Adding a New Project

1. Create a project directory: `projects/{project-name}/`
2. Create project configuration: `projects/{project-name}/project.json`
3. Create project-specific categories: `projects/{project-name}/categories.json`

**Example**: See the Sunshine project configuration:
- [`projects/sunshine/project.json`](projects/sunshine/project.json) - Project configuration
- [`projects/sunshine/categories.json`](projects/sunshine/categories.json) - Category definitions

## Automation & Deployment

GitHub Actions automatically:
- ✓ Validates all JSON files against schemas (apps, projects, categories)
- ✓ Lints JavaScript files with ESLint
- ✓ Builds project-specific indexes in `dist/` directory
- ✓ Deploys to GitHub Pages (`gh-pages` branch)
- ✓ Runs on every push and pull request

### npm Scripts

```bash
npm run validate     # Validate all JSON files
npm run lint         # Lint JavaScript files
npm run lint:fix     # Auto-fix linting issues
npm run build        # Build all indexes
npm run build:all    # Validate + lint + build
npm test             # Same as build:all
npm run clean        # Remove dist/ directory
```

## CDN & Access

The built indexes are deployed to GitHub Pages and accessible via:

### GitHub Pages (Recommended)
```
https://lizardbyte.github.io/app-directory/{project}.json
https://lizardbyte.github.io/app-directory/index.json
```

### jsDelivr CDN (Faster, Global)
```
https://cdn.jsdelivr.net/gh/LizardByte/app-directory@gh-pages/{project}.json
```

### Raw GitHub (Slower)
```
https://raw.githubusercontent.com/LizardByte/app-directory/gh-pages/{project}.json
```

## Contributing

1. Fork the repository
2. Add your app JSON file
3. Ensure it validates against the schema
4. Submit a pull request
5. Maintainers will review and merge

## License

Apps listed in this directory retain their original licenses. This directory structure and metadata is MIT licensed.
