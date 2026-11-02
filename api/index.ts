// api/index.ts
// Vercel Serverless Function entry point for Lead Row REST API
import { createApp } from '../apps/server/src/app';

const app = createApp();

export default app;

