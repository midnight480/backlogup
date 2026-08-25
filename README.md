# BacklogUp

[English](README.md) | [日本語](README_ja.md)

> Forked from: [common-creation/backlogup](https://github.com/common-creation/backlogup)

## What is this?

BacklogUp calls the Backlog API to back up data for a specified project.  
The backed-up data can be browsed using a lightweight local viewer, or migrated/imported to another Backlog space or project.

## How This Differs from the Official Migration Tool

If you landed here because Nulab's official migration tool ([BacklogMigration-Backlog](https://github.com/nulab/BacklogMigration-Backlog)) refused to migrate your project, this is the difference that matters.

The official tool reproduces the **entire history** of a project — including every status definition that has ever existed and every rename applied to one. That fidelity is exactly what makes it fail on long-lived projects:

- Projects where statuses have been added or renamed **9 or more times cannot be migrated at all**.
- Projects that have ever added a custom status **cannot be migrated from ASP to Enterprise**.

BacklogUp takes the opposite approach. It reads the **latest snapshot** of the project and re-creates that in the target space. The project's configuration history is never read, so those two walls simply don't apply — a project with 30 status renames behind it migrates the same as a fresh one.

| | Official tool | BacklogUp |
|---|---|---|
| Unit of migration | Full project history | Latest snapshot |
| 9+ status additions/renames | ❌ Cannot migrate | ✅ No restriction |
| ASP → Enterprise with custom statuses | ❌ Cannot migrate | ✅ No restriction |
| Custom statuses | Reproduced | Not reproduced (built-in 4 only) |
| Original author / timestamps | Native fields | Text metadata header in body & comments |
| Offline browsing before migrating | — | Local viewer included |

### The trade-off

Discarding history is what buys the compatibility, and you pay for it:

- **Custom statuses are not reproduced.** Only the four built-in statuses (Open / In Progress / Resolved / Closed) are applied. Issues sitting in a custom status land in the target with their status unchanged.
- **History is replayed as content, not as native history.** Comments are re-posted in chronological order, but the original author and timestamp appear as a metadata header in the text — the target's own change log will show the migrating API user and the migration date.
- **Attribute definitions are recreated, not preserved.** Missing issue types, categories and milestones are created automatically on the target side; they are not identical objects.

If you need a byte-faithful reproduction of a project's full history, use the official tool. If the official tool won't run on your project — or you just need the content moved and browsable — this is the pragmatic alternative.

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
- **Scope**: Issues and wikis only. Documents and shared files are backed up but **not** migrated — see [Migration Limitations](#migration-limitations).

---

## Easy Start (Almost One-Click, for Non-Engineers)

For people who aren't comfortable with the command line, there's a **double-click to run** option. A Japanese-language menu appears, and you just pick a number to run backups, download shared files, or launch the viewer.

| OS | File to double-click |
|----|----------------------|
| Windows | `start-windows.bat` |
| macOS | `start-mac.command` |

**How it works (both OSes)**

1. Download this repository as a ZIP and extract it (or `git clone`).
2. Double-click the file for your OS above.
   - On first run it checks for Node.js and auto-installs the required packages (a few minutes).
   - If Node.js is missing, follow the prompt to install the LTS version from the [official site](https://nodejs.org/en/download).
3. On first run a `.env` config file is created automatically and opens in Notepad / TextEdit. Fill in these three values and save:

   | Field | Value |
   |-------|-------|
   | `BACKLOG_HOST` | Backlog domain (e.g., `xxx.backlog.com`) |
   | `BACKLOG_API_KEY` | API key (Backlog → Personal Settings → API) |
   | `BACKLOG_PROJECT_KEY` | Project key |

4. When the menu appears, type the number for what you want to do and press Enter.

> 💡 On macOS, if you see "cannot be opened because it is from an unidentified developer," **right-click `start-mac.command` → Open** to run it.

---

The sections below are for users comfortable with the command line.
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

The list below is derived from the actual implementation under `scripts/migrate/`, not from the official tool's documentation.

**Not migrated at all**

1. **Documents** — `npm run backup` archives them, but `npm run migrate` only processes issues and wikis (`scripts/migrate/index.mts`).
2. **Shared files, Git and Subversion repositories.**
3. **Custom fields (custom attributes)** — no custom field values are read or posted. Issues arrive with custom fields empty.
4. **Stars** — backed up to `stars.json`, but never replayed on the target.
5. **Comment attachments** — issue-level attachments are migrated, but files attached to individual comments are not (`issue-migrator.mts`).
6. **Wiki tags and wiki edit history.**
7. **Read/unread status of notifications.** No mail notifications are sent during migration either (`mailNotify: false` throughout).

**Reproduced, but transformed**

8. **Statuses**: only the four built-in statuses (Open / In Progress / Resolved / Closed) are applied. Transitions to custom statuses recorded in the change log are skipped, and the final status sync is best-effort — if the target lacks that status ID the failure is silently ignored.
9. **Issue keys are not preserved.** New issues receive fresh sequential keys; the original key is written into the metadata header of the description.
10. **Author and timestamps become text.** Every issue and comment is created by the API key owner at migration time. The original creator, creation date and issue key appear as a `[元課題: ... | 登録者: ... | 登録日: ...]` header in the body.
11. **Issue types, categories, versions and milestones are recreated by name** (case-insensitive, whitespace-trimmed match). Anything missing on the target is created automatically — including issue types that only existed historically, which you may want to delete afterwards. If issue type creation fails, issues fall back to the target's first issue type.
12. **Unmatched users are reassigned.** If no user matches by email, name, or user ID, the issue is assigned to the API key owner. Use `user-mapping.json` to control this.
13. **Priority and resolution IDs are copied verbatim** from the source, which assumes the target space uses the standard IDs.
14. **Wiki attachments lose their original filenames.** They are stored and re-uploaded under their numeric attachment ID with no extension.
15. **Parent/child links depend on ordering.** Issues are migrated in ascending ID order and the parent is resolved from already-migrated issues; if a parent failed to migrate, the child arrives without its parent link.

**Operational constraints**

16. **Migration into the same project is blocked** — the run aborts if source and target host and project key are identical.
17. **A target project that already contains issues halts the run.** Set `ALLOW_EXISTING_ISSUES=true` in `.env` to proceed anyway.
18. **Rate limits**: on HTTP 429 the tool pauses for 60 seconds and retries up to 5 times before aborting. On the free plan the tighter limits make long migrations impractical.
19. **Do not run several migrations in parallel** against the same target space — the built-in throttling only accounts for a single running instance.
20. **Wiki pages with the same name on the target are overwritten** — matching is by page name, and an existing page is updated in place rather than duplicated.
21. **Wiki image tags referencing attachments by ID** (`#image(123)`) will not resolve after migrating to a different space.

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
