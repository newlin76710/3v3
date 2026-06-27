import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile();
} catch {}

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
