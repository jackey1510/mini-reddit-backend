declare namespace NodeJS {
  interface ProcessEnv {
    REDIS_SECRET: string;
    DATABASE_URL: string;
    REDIS_URL: string;
    DB_PORT: string;
    CORS_ORIGIN: string;
  }
}