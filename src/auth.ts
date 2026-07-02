import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db/db.provider';
import * as schema from './db/schema';

export const auth = betterAuth({
  basePath: '/api/v1/auth',
  database: drizzleAdapter(db, {   
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: { enabled: true },
  trustedOrigins: [process.env.FRONTEND_URL!],
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
});
