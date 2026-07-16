export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '8000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  auth: {
    secret: process.env.BETTER_AUTH_SECRET,
    url: process.env.BETTER_AUTH_URL,
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    chatModel:
      process.env.OPENROUTER_CHAT_MODEL ??
      'nvidia/nemotron-3-ultra-550b-a55b:free',
  },
});
