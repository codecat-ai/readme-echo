# Contributing

Thank you for helping improve Readme Echo.

## Development Setup

Use Node.js 22.18 or newer.

```sh
npm test
node src/cli.ts check
```

## Workflow

- Write tests before production changes when behavior changes.
- Keep code comments and commit messages in English.
- Use Conventional Commits, such as `feat: add config validation` or `fix: handle empty targets`.
- Keep README translations structurally synchronized.
- Do not add network calls or code execution of README content.

## Pull Requests

Before opening a pull request, run:

```sh
npm test
node src/cli.ts check
```

Include a short description of the behavior change, tests run, and any follow-up work.
