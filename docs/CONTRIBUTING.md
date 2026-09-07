# Contributing

Keep ChatGPT selectors inside `extension/src/adapters/chatgpt/selectors.ts`. Add or update a DOM fixture and test for every selector or lifecycle change.

Before opening a pull request, run:

```bash
npm run lint
npm test
npm run build
```

Manually smoke-test `dist/extension` in current desktop Chrome and Edge when host-DOM behavior changes.
