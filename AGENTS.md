# Repository Guidelines

## Project Structure & Module Organization

This workspace is currently a scaffold: no application source, tests, assets, or dependency manifests are present. The project name is `family-tree-generator`; its implementation stack has not yet been established.

When adding the initial implementation, group application code in `src/`, automated tests in `tests/`, and static resources in `assets/`, unless the chosen framework requires a different layout. Keep related functionality together and document the actual structure in a root `README.md`.

## Build, Test, and Development Commands

No build, development, or test commands are configured yet. Do not assume commands such as `npm test` or `make build` work.

When introducing tooling, provide reproducible commands for dependency installation, local development, production builds, and automated checks. Record those commands in `README.md` and commit the appropriate dependency manifest and lockfile.



## Coding Style & Naming Conventions

Follow the conventions of the selected language and framework. Use consistent indentation within each file, descriptive names, and small modules with clear responsibilities. Avoid mixing naming styles within a module.

Configure a formatter and linter when the stack is introduced, and document their invocation. Keep generated output and installed dependencies out of version control.

## Testing Guidelines

No testing framework or coverage threshold is currently configured. Add tests alongside new behavior using the selected framework’s standard naming pattern, such as `*.test.*` or `test_*.py`. Cover core behavior, edge cases, and regressions. Keep test data synthetic and deterministic.

## Commit & Pull Request Guidelines

Git history is unavailable in this workspace, so no existing commit convention can be verified. Use concise, imperative commit subjects, such as `Add family relationship validation`.

Pull requests should describe the change, explain its purpose, list validation performed, and link relevant issues. Include screenshots for visible interface changes and identify any setup steps or limitations.

## Security & Configuration

Never commit credentials, local configuration secrets, or real family records. Use synthetic examples and document required environment variables without including secret values.
