# Contributing

Keep platform-specific selectors in the matching adapter directory, such as `extension/src/adapters/chatgpt/` or `extension/src/adapters/claude/`. Do not share host-DOM selectors between platforms.

Add or update a DOM fixture and focused adapter or integration regression test for every selector or lifecycle change. Use stable `data-testid`, semantic role, accessible label, or route-shaped `href` attributes instead of generated class names and IDs.

Before opening a pull request, run:

```bash
npm run lint
npm test
npm run build
```

Manually smoke-test `dist/extension` in current desktop Chrome and Edge on every affected platform when host-DOM behavior changes. Verify navigation, native composer input, sending, streaming, disable/restore behavior, and Claude Artifacts where applicable.
