# Zermanzer — Family tree editor

A frontend-only React and TypeScript family tree builder. Add people, tell their stories, and arrange them on a draggable canvas. No account, database, or backend is required.

**Website:** [Zermanzer](https://aamir2020.github.io/family-tree-generator/)

![Zermanzer family tree editor with the White family diagram and person details sidebar](docs/images/zermanzer-ui.png)

## Run locally

Requires Node.js 22.12 or later and npm.

```bash
npm ci
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm run check         # Formatting, ESLint, strict type checking, and tests
npm run format        # Format source, styles, Markdown, and configuration with Prettier
npm run format:check  # Check formatting without changing files
npm run lint          # Check TypeScript and React hooks with ESLint
npm run lint:fix      # Apply automatic ESLint fixes
npm run typecheck     # Check application, tests, and configuration with TypeScript
npm test              # Run the TypeScript tests using tsx and Node's test runner
npm run build         # Type check, then build production static files in dist/
npm run preview       # Serve the production build locally
```

## Using the editor

- Use the right sidebar to **Add person**, **Import tree**, **Export tree**, or **Clear tree**. Select a card to show its details below the tools. Use the pencil or trash button on a card to edit or delete that person directly from the diagram. Deletion requires confirmation and can be undone.
- **Clear tree** warns before removing all people and connections. You can cancel, export first, or undo a confirmed clear during the session.
- The fictional White family from Breaking Bad is preloaded as the example for new visitors. Custom saved trees remain on this device.
- Click **+** on a card or **Add a connection** in its details. Choose mother, father, son, daughter, wife, or husband; add a new person or connect someone already in the tree.
- When adding a wife or husband to someone with children, a second step asks which children to connect to the new partner. Choose **Only add partner** to skip. Existing parent slots are respected; unavailable connections show a reason. Adding the partner and selected children can be undone together.
- Shared children of connected partners branch from the midpoint of the partner line. Single-parent links remain direct. Click a shared child line to remove both parent links, or remove one in person details.
- New parents appear above, children below, and partners beside the selected person. Drag any card to reposition it; drag blank canvas to pan. Click **Select** on the canvas, drag across empty space to draw a selection rectangle, then drag a selected card to move the group. Hold Shift while drawing another rectangle to add to the selection. Click **Select** again to return to panning. Use the scroll wheel over the canvas to zoom around the pointer. Zoom buttons and Fit tree are at the bottom left.
- Relationship lines have no text labels; select a person to see their relationships in the sidebar. Click a line or the connection’s × in the details to remove it. Deleting a person also removes their connections. Undo restores the last 30 graph changes.
- Birthdays are optional. Enter a full date (`YYYY-MM-DD`), a year, or leave the field blank.
- Use the sun/moon button in the header to switch themes. The initial theme follows your system preference; your choice is saved on this device.
- Search highlights matching people. Edit the tree name above the canvas.
- **Export tree** lets you name the downloaded JSON file. **Import tree** validates a Zermanzer JSON file before asking to replace the current tree. Replacement can be undone. Other vendors’ formats, including GEDCOM, are not supported.

Changes are saved in this browser’s local storage. There is no server sync. Export backups before clearing browser data or moving devices. All example people are fictional. Optional Google Fonts requests contain no tree data; system fonts work offline.

## Data structure

`src/graph.ts` implements a directed, labeled graph: `people` store unique IDs, details, and canvas coordinates; `connections` store unique IDs, source/target IDs, and relation types. This allows independent deletion and multiple children or spouses without nesting or duplicating people.

A graph has `version: 1`, `title`, `people`, and `connections`. Mother/father links occupy one parent slot per person. Son/daughter links also occupy the source person’s mother or father slot on the child when the source gender is specified. Unspecified parents do not occupy a gendered slot. Ancestry cycles, self links, missing endpoints, duplicate IDs, and multiple connections between the same pair are rejected. Children and spouses can be connected to multiple different people.

Imports are limited to 5 MB, 1,000 people, and 5,000 connections. Layout is manual: initial relative placement suggests generations, but dragging does not enforce rows.

## Project structure

- `src/main.tsx`: application entry point.
- `src/App.tsx`: editor state, canvas interactions, and viewport controls.
- `src/PersonCard.tsx` and `src/TreeSidebar.tsx`: person cards and the tools/details sidebar.
- `src/EditorDialog.tsx`, `src/ExportDialog.tsx`, and the review components: editing, confirmations, and relationship dialogs.
- `src/types.ts`: shared person, relationship, graph, and dialog types.
- `src/graph.ts`: graph validation, mutations, placement, and fictional sample data.
- `src/connections.ts`: curved relationship lines and shared parent/child branches.
- `src/selection.ts` and `src/people.ts`: group selection and derived sibling relationships.
- `src/style.css` and `src/theme.ts`: responsive styling and initial theme preference.
- `tests/*.test.ts`: domain model, relationships, connection layout, and selection tests.
- `tsconfig.json`, `eslint.config.ts`, and `.prettierrc.json`: TypeScript, lint, and formatting configuration.

## Code conventions

TypeScript runs in strict mode across the application, tests, and tooling configuration. Imported JSON is validated at runtime before becoming a typed family graph. Components have explicit props, and editor dialogs use a discriminated union for their state.

Use two spaces, single quotes, and semicolons; Prettier applies these conventions automatically. Keep components and graph operations in focused modules. Run `npm run format` after editing and `npm run check` before committing. Production builds also require successful type checking.
