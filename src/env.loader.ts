import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });
config({
  path: resolve(
    process.cwd(),
    `src/config/env/.env.${process.env.NODE_ENV ?? 'development'}`,
  ),
});
