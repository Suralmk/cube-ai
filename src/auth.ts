import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db/db.provider';
import * as schema from './db/schema';
import {organization} from 'better-auth/plugins/organization';
export const auth = betterAuth({
  basePath: '/api/v1/auth',
  database: drizzleAdapter(db, {   
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      
      // organization schemas
      organization: schema.organization,
      organizationMember: schema.organizationProfile,
      organizationRole: schema.organizationSettings,
      
      // chat schemas
      chatSession: schema.chatSession,
      chatMessage: schema.chatMessage,

      // document schemas
      document: schema.document,
    },
  }),
  plugins: [
    organization(),
  ],
  emailAndPassword: { enabled: true },
  trustedOrigins: [process.env.FRONTEND_URL!],
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
});
