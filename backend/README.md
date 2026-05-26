# backend

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.3. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

you can create inngest files anywhere but the most important part is:

```ts
app.use(
  // Expose the middleware on our recommended path at `/api/inngest`.
  "/api/inngest",
  serve({
    client: inngest,
    functions: [
      /* functions*/
    ],
  })
);
```
