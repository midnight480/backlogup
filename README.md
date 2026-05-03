# BacklogUp

[English](README.md) | [日本語](README_ja.md)

> Forked from: [common-creation/backlogup](https://github.com/common-creation/backlogup)

## What is this?

BacklogUp calls the Backlog API to back up data for a specified project.  
The backed-up data can be browsed using a lightweight local viewer.

## Features & Specifications

### 1. Data Backup Feature (`npm run backup`)
- **Full Local Storage**: Saves data from a specified Backlog project to your local environment as JSON and actual files.
- **Backup Targets**:
  - **Issues**: Issue details, status, priority, custom attributes, comments, attachments
  - **Wiki**: Wiki page content, stars, attachments, tags
  - **Documents**: Folder/file tree structure, document content, comments (including replies), attachments
  - **Project Settings**: Issue types, categories, milestones, member list, **License Info** (plan type, user limits, storage capacity, etc.)
  - **User Information**: User metadata, profile icons
- **Incremental Updates**: If existing data is found, only the updated portions are fetched, significantly speeding up subsequent backups.

### 2. Local Archive Viewer (SPA)
A fast, intuitive React + Vite-based viewer for browsing backed-up data offline.

- **Modern UI Layout**:
  - Spacious layout using header navigation (sidebar-less).
  - Consistent design system utilizing Tailwind CSS with semantic theme colors (Green-based Primary color).
- **Dashboard**:
  - Displays basic project information, backup progress/statistics, and license details.
- **Issue Explorer**:
  - Paginated list view (statuses and priorities visualized with badges).
  - Fast issue filtering via index-based local keyword search.
- **Wiki / Document Viewer**:
  - Left pane displays a folder tree automatically generated from path structures.
  - Features an **incremental search box** to filter the tree in real-time by page/file name.
  - Supports Markdown rendering for Wikis, and rich-text rendering via Tiptap (ProseMirror) for Documents.
  - Supports attachment downloads and hierarchical display of comment threads.
- **User Settings (Settings Modal)**:
  - **i18n Support**: Instant switching between English (EN) and Japanese (JA).
  - **Theme Settings**: Toggle between Light and Dark modes.
  - Settings are saved to the browser's `localStorage` and persist across reloads.

## How to Backup

1. Copy `sample.env` to `.env`
2. Fill in the required fields as commented in `.env`:
   - `BACKLOG_HOST` — Backlog domain (e.g., `xxx.backlog.com`)
   - `BACKLOG_API_KEY` — API Key (Get this from Personal Settings → API)
   - `BACKLOG_PROJECT_KEY` — Project Key
3. Run `npm run backup` to start the backup process.

*Note: Depending on the size of the Backlog project, the backup may take some time.*

### ⚠️ When Changing the Project Key (Required)

Extracted data is not separated into project-specific folders; it is always saved in the same `dist/assets` directory.
Therefore, **when changing the project key in `.env` to back up a different project, you MUST reset and replace the existing data.**
(Failure to do so will result in mixed data from multiple projects, causing display issues in the viewer.)

To completely delete existing backup data and start a fresh backup, run the command with `CLEAN_BACKUP=true`:

```bash
CLEAN_BACKUP=true npm run backup
```

## Building the Viewer

```bash
npm run build
```

All assets, including the backup data, will be saved in the `dist` directory.

## Development

```bash
# Install dependencies
npm install

# Start the development server
npx vite --open
```

## Coding Standards for AI Agents

We provide rule files automatically loaded by various AI IDEs.

| IDE | File | Loading |
|-----|---------|---------|
| Kiro | `.kiro/steering/coding-standards.md` | Automatic |
| Cursor | `.cursorrules` | Automatic |
| GitHub Copilot | `.github/copilot-instructions.md` | Automatic |
| Cline | `.clinerules` | Automatic |
| Windsurf | `.windsurfrules` | Automatic |
| Google Antigravity | — | Manual setup required |

Master Document: [`docs/coding-standards.md`](docs/coding-standards.md)

### Setup for Antigravity

Since Google Antigravity does not support automatic file-based rule loading, you must manually register them in Knowledge.

1. Open Antigravity
2. Go to Settings → Knowledge
3. Add the contents of `docs/coding-standards.md` as Knowledge

## License

MIT License
