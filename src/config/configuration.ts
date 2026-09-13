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
    embeddingModel:
      process.env.OPENROUTER_EMBEDDING_MODEL ??
      'nvidia/llama-nemotron-embed-vl-1b-v2:free',
  },
  qdrant: {
    url: process.env.QDRANT_URL ?? 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
  },
  rag: {
    topK: parseInt(process.env.RAG_TOP_K ?? '5', 10),
    chunkSize: parseInt(process.env.RAG_CHUNK_SIZE ?? '1000', 10),
    chunkOverlap: parseInt(process.env.RAG_CHUNK_OVERLAP ?? '200', 10),
  },
  chat: {
    historyLimit: parseInt(process.env.CHAT_HISTORY_LIMIT ?? '5', 10),
  },
  storage: {
    driver: process.env.STORAGE_DRIVER ?? 'local',
    localDir: process.env.STORAGE_LOCAL_DIR ?? './storage',
    region: process.env.AWS_REGION ?? 'us-east-1',
    bucketName: process.env.AWS_S3_BUCKET_NAME,
    endpoint: process.env.AWS_S3_ENDPOINT,
    forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
    signedUrlExpiry: parseInt(
      process.env.AWS_S3_SIGNED_URL_EXPIRY ?? '3600',
      10,
    ),
  },
});
