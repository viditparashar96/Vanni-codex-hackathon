/* Side-effect style imports (e.g. `import "./globals.css"`).
   Next.js declares these via next-env.d.ts, but IDE TS servers can miss
   that chain when .next dev types are stale — this shim is unconditional. */
declare module "*.css";
