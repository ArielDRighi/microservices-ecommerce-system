# ADR-025: CI/CD with Husky & lint-staged

**Status:** Accepted  
**Date:** 2024-01-17  
**Author:** Development Team

---

## Context

Need **automated quality checks** before commits: linting, formatting, tests.

---

## Decision

Use **Husky + lint-staged** for Git hooks:

**Husky Setup:**
```json
// package.json
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write",
      "jest --bail --findRelatedTests"
    ]
  }
}
```

**Git Hooks:**
```bash
# .husky/pre-commit
npm run lint-staged

# .husky/pre-push
npm run test
npm run test:e2e
```

---

## Workflow

```
1. Developer commits code
   ↓
2. pre-commit hook runs
   - ESLint fixes issues
   - Prettier formats code
   - Jest tests related files
   ↓
3. If all pass → commit succeeds
   If any fail → commit blocked
   ↓
4. Developer pushes code
   ↓
5. pre-push hook runs
   - Full test suite (unit + E2E)
   ↓
6. If pass → push succeeds
   If fail → push blocked
```

---

## Benefits

✅ **Quality Gate:** No bad code reaches repo  
✅ **Fast:** Only test changed files  
✅ **Automatic:** Zero manual intervention  
✅ **Consistent:** Same checks for all developers  

---

## CI/CD Pipeline (Planned)

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:cov
      - run: npm run test:e2e
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: docker build -t app .
```

---

**Status:** ✅ **IMPLEMENTED** (Husky + lint-staged)  
**Planned:** GitHub Actions CI/CD pipeline  
**Files:** `.husky/`, `package.json`
