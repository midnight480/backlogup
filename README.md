# BacklogUp

[English](README.md) | [日本語](README_ja.md)

> Forked from: [common-creation/backlogup](https://github.com/common-creation/backlogup)

## What is this?

BacklogUp calls the Backlog API to back up data for a specified project.  
The backed-up data can be browsed using a lightweight local viewer, or migrated/imported to another Backlog space or project.

## Features & Specifications

### 1. Data Backup Feature (`npm run backup`)
- **Full Local Storage**: Saves data from a specified Backlog project to your local environment as JSON and actual files.
- **Backup Targets**:
  - **Issues**: Issue details, status, priority, custom attributes, comments, attachments
  - **Wiki**: Wiki page content, stars, attachments, tags
  - **Documents**: Folder/file tree structure, document content, comments (including replies), attachments
  - **Shared Files**: Recursively traverses the file-sharing area and builds a file list (`shared-files/list.json`). Because there can be many files, the actual files are **not** downloaded by `npm run backup`; instead they are fetched with the separate `npm run download:sharedfiles` command, individually or in bulk, with resumable downloads ([details](#downloading-shared-files)). Files are saved preserving the original folder structure and file names.
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

### 3. Data Migration Feature (`npm run migrate`)
Migrate/import backed-up data (issues, wiki pages, attachments, settings) to another Backlog space or project.

- **Automatic User Mapping**: Matches source users to target space users by exact email match and name/ID matching. Manual override via `user-mapping.json` is also supported.
- **Attribute Synchronization**: Automatically extracts target issue types, categories, and milestones (creates missing ones automatically).
- **Sequential Issue & Wiki Reproduction**: Re-creates issues, comments, and attachments in chronological order. Adds metadata headers (original creator, creation date, original issue key) to descriptions and comments.

---

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

---

## How to Migrate Data (`npm run migrate`)

Migrate backed-up data to a different Backlog space or target project.

### Prerequisites & Steps

1. Run `npm run backup` beforehand to ensure you have the latest local backup data.
2. Add target space credentials to `.env`:

```env
# Target Backlog domain
TARGET_BACKLOG_HOST=target.backlog.com

# Target Backlog API key
TARGET_BACKLOG_API_KEY=YYYYYYYYYYYYYYYYYYYYYYYYYYY

# Target project key
TARGET_BACKLOG_PROJECT_KEY=TARGET_PROJ

# Set to true if you want to proceed even if issues already exist in the target project (default: false)
ALLOW_EXISTING_ISSUES=false
```

3. Run the migration command:

```bash
npm run migrate
```

### Manual User Mapping Customization (`user-mapping.json`)

Automatic user matching runs by default using email and name. If you want to specify manual user mappings, create `dist/assets/user-mapping.json`:

```json
{
  "yamada@example.com": "yamada_target@example.com",
  "Taro Yamada": "Target Space Yamadaro",
  "1001": 2005
}
```

### Pre-flight Checks & Safety Features
- **API Permission Check**: Verifies in advance that the API key owner is a member of the target project.
- **Same Project Prevention**: Aborts automatically if source and target are the same project to prevent accidental overwrites.
- **Existing Issue Check**: Pauses automatically if the target project already contains issues. Set `ALLOW_EXISTING_ISSUES=true` in `.env` to continue ignoring issue numbers.

### Migration Limitations
1. If the project key is changed after changing a parent issue, the parent issue change cannot be reflected.
2. Previously existing issue types are created automatically during migration. Delete them manually after migration if needed.
3. Stars attached to issues or Wikis are not migrated.
4. If units are set for numeric custom fields, units in comment change history will not be migrated.
5. Migration within the exact same project is not supported.
6. `fitissuekey` and `filter` options cannot be used simultaneously.
7. If custom attributes with identical names exist in source and target, data inconsistencies may occur. Check beforehand.
8. Global search index is not migrated.
9. Projects where custom statuses have been added cannot be migrated from ASP to Enterprise.
10. Free plan environments cannot be migrated due to API rate limits.
11. Parallel execution of this migration tool is not supported due to API rate limits.
12. When migrating to a different space, Wiki image tags using IDs (`image#123`) will not display images.
13. Projects with 9 or more status additions/changes cannot be migrated.
14. Leading/trailing spaces or commas in attribute names (types, categories, statuses, versions, milestones, custom fields) may cause migration issues. Please clean them up prior to migration.
15. Shared files, Subversion, and Git repositories are not migrated.
16. Read/unread status of notifications is not migrated.

---

## Downloading Shared Files

Shared files can be numerous, and the Web UI's bulk download sometimes times out. This tool separates "building the list" from "downloading the actual files", fetching one file at a time via the API for reliability (this increases the number of API calls, but rate limits are handled automatically with a 60-second wait and retry).

1. Running `npm run backup` creates **only the list** of shared files at `dist/assets/shared-files/list.json` (no actual files are downloaded at this point).
2. Then download the actual files with `npm run download:sharedfiles`.

```bash
# Show the list (ID, path, size)
npm run download:sharedfiles -- --list

# Download everything (resumes from where it left off if interrupted)
npm run download:sharedfiles -- --all

# Download only specific files by ID (individually)
npm run download:sharedfiles -- 123 456
npm run download:sharedfiles -- --id 123,456

# Bulk-download files whose path contains a given string (e.g. a specific folder)
npm run download:sharedfiles -- --path Designs
```

- Files already downloaded (matching byte size) are skipped by default, so you can safely interrupt and resume even with many files. Writes are atomic via a temp file, so an interrupted run never leaves a partial file behind. Use `--force` to re-download.
- Downloaded files are saved under `dist/assets/shared-files/`, preserving the **original folder structure and file names** from Backlog.
- The command exits with a non-zero status if any file fails, so automation won't treat an incomplete archive as success.

### Selecting and downloading from the viewer

When you start the viewer with `npm run dev`, the "Shared Files" tab lets you check files in the list and fetch them with the "Download selected" button. The dev server calls the Backlog API **server-side** using `BACKLOG_API_KEY` from `.env`, so the API key is never exposed to the browser. Fetched files are saved to the same `dist/assets/shared-files/` and reflected in the list immediately (available only while `npm run dev` is running).

---

## Building the Viewer

```bash
npm run build
```

All assets, including the backup data, will be saved in the `dist` directory.

---

## Development

```bash
# Install dependencies
npm install

# Start the development server
npx vite --open
```

---

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

---

## License

MIT License
