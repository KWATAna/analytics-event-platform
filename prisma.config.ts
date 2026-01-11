import { defineConfig, env } from '@prisma/config';

export default defineConfig({
  schema: './libs/persistence/prisma/schema.prisma',
  generator: {
    name: 'client',
    provider: 'prisma-client-js',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
