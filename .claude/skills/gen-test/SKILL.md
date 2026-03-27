---
name: gen-test
description: Generate tests for tRPC routers or React components. Usage - /gen-test <file-or-module>
---

Generate tests for the specified file or module in the PARA app.

## Setup (first time only)

If Vitest is not yet installed, run these commands:

```bash
cd /Users/aguimar/Documents/devel/para/para-app
docker compose exec app npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
docker compose restart app
```

Then create `vitest.config.ts` at the project root if it doesn't exist:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
```

And `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

## Generating tests

1. Read the target file the user specified.
2. Determine the type:
   - **tRPC router** (`src/server/routers/*.ts`): Write unit tests that mock `db` and test each procedure's input validation and output shape.
   - **React component** (`src/components/**/*.tsx`): Write tests using `@testing-library/react` that render the component and assert on visible output, user interactions, and key behaviors.
   - **Utility** (`src/lib/*.ts`): Write pure function tests.
3. Place the test file next to the source file with `.test.ts(x)` suffix.
4. Run the test: `docker compose exec app npx vitest run <test-file> --reporter=verbose`
5. If tests fail, fix them until they pass.

## Conventions

- Use `describe` / `it` blocks with clear descriptions
- Mock external dependencies (db, fetch, Clerk auth) — never hit real services
- For tRPC routers, use `createCaller` pattern from tRPC v11
- Keep tests focused: one behavior per `it` block
- Do NOT add tests for code that wasn't specified
