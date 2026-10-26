# Zermander — Family tree editor

A frontend-only React family tree builder. Add people, tell their stories, and arrange them on a draggable canvas. No account, database, or backend is required.

## Run locally

Requires Node.js 22.12 or later and npm.

```bash
npm ci
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm test          # Graph constraints, deletion, positioning, and JSON roundtrip tests
npm run lint     # ESLint checks
npm run build    # Production static files in dist/
npm run preview  # Serve the production build locally
npm run format   # Apply automatic ESLint fixes
```

## Using the editor

- Click **Add person** for an independent person. Click a card to edit details.
- Click **+** on a card or **Add a connection** in its details. Choose mother, father, son, daughter, wife, or husband; add a new person or connect someone already in the tree.
- New parents appear above, children below, and partners beside the selected person. Drag any card to reposition it; drag blank canvas to pan. Zoom and Fit tree are at the bottom left.
- Relationship labels describe the target person relative to the source person. Click a label or the connection’s × in the details to remove it. Deleting a person also removes their connections. Undo restores the last 30 graph changes.
- Birthdays are optional. Enter a full date (`YYYY-MM-DD`), a year, or leave the field blank.
- Use the sun/moon button in the header to switch themes. The initial theme follows your system preference; your choice is saved on this device.
- Search highlights matching people. Edit the tree name above the canvas.
- **Export tree** downloads JSON. **Import tree** validates a Zermander JSON file before asking to replace the current tree. Replacement can be undone. Other vendors’ formats, including GEDCOM, are not supported.

Changes are saved in this browser’s local storage. There is no server sync. Export backups before clearing browser data or moving devices. All example people are fictional. Optional Google Fonts requests contain no tree data; system fonts work offline.

## Data structure

`src/graph.js` implements a directed, labeled graph: `people` store unique IDs, details, and canvas coordinates; `connections` store unique IDs, source/target IDs, and relation types. This allows independent deletion and multiple children or spouses without nesting or duplicating people.

A graph has `version: 1`, `title`, `people`, and `connections`. Mother/father links occupy one parent slot per person. Son/daughter links also occupy the source person’s mother or father slot on the child when the source gender is specified. Unspecified parents do not occupy a gendered slot. Ancestry cycles, self links, missing endpoints, duplicate IDs, and multiple connections between the same pair are rejected. Children and spouses can be connected to multiple different people.

Imports are limited to 5 MB, 1,000 people, and 5,000 connections. Layout is manual: initial relative placement suggests generations, but dragging does not enforce rows.

## Project structure

- `src/main.jsx`: React editor, person cards, SVG relationship lines, and dialogs.
- `src/graph.js`: graph validation, mutations, placement, and synthetic sample data.
- `src/style.css`: responsive styling.
- `tests/graph.test.js`: Node test runner tests for the domain model.
- `.github/workflows/pages.yml`: pull request checks and GitHub Pages deployment.

## Git workflow and website hosting

Create a GitHub repository and push this project to its `main` branch. If your checkout has no usable Git metadata, initialize it first in an environment where `.git` is writable:

```bash
git init -b main
git add .
git commit -m "Add React family tree editor"
git remote add origin https://github.com/Aamir2020/family-tree-generator.git
git push -u origin main
```

On GitHub, open **Settings → Pages → Build and deployment → Source → GitHub Actions**. Then run **Check and deploy to GitHub Pages** from Actions, or push a new commit to `main`.

The workflow installs from the lockfile, lints, tests, builds, and deploys `dist/`. The deployment URL appears in the workflow’s `github-pages` environment, typically `https://aamir2020.github.io/family-tree-generator/`. Vite uses relative asset paths so repository subpaths work. Pull requests run checks without publishing a preview site.

For changes, create a branch (`git switch -c feature/relationship-editor`), commit with a short imperative subject, and open a pull request into `main`. Include a description, test results, and screenshots for interface changes. Merging deploys the updated website. Family data remains in each visitor’s browser and is not included in deployment.
