# Contributing

```bash
git clone https://github.com/praxicraft-platform/praxicraft-node.git
cd praxicraft-node
npm install
npm test
npm run build
```

Guidelines:

- Thin wrapper around the [Assess Public API](https://docs.praxicraft.com).
- Keep HTTP mocked in tests — no live production calls in CI.
- Public exports live in `src/index.ts`.
- Release notes: [RELEASING.md](RELEASING.md).
