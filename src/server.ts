import { createUserLoader, createUpvoteLoader } from "./utils/CreateDataLoader";
import { Upvote } from "./entities/Upvote";
import { __prod__, Context, COOKIE_NAME } from "./constants";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import PostResolver from "./resolvers/PostResolver";
import "reflect-metadata";
import "dotenv-safe/config";

import express from "express";
import UserResolver from "./resolvers/UserResolver";
import Redis from "ioredis";
import session from "express-session";
import connectRedis from "connect-redis";
import cors from "cors";

import { createConnection } from "typeorm";
import { Post } from "./entities/Post";
import { User } from "./entities/User";

const port = process.env.PORT || 4000;

async function main() {
  const conn = await createConnection({
    type: "postgres",
    // database: process.env.DB_NAME,
    // username: process.env.DB_USERNAME!,
    // password: process.env.DB_PASSWORD!,
    url: process.env.DATABASE_URL,
    logging: true,
    synchronize: true,
    port: Number(process.env.DB_PORT) || 5432,
    entities: [Post, User, Upvote],
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await conn.runMigrations();

  const app = express();
  const RedisStore = connectRedis(session);
  const redis = new Redis(process.env.REDIS_URL);

  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN,
      credentials: true,
    })
  );

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({ client: redis, disableTouch: true }),
      saveUninitialized: false,
      secret: process.env.REDIS_SECRET,
      resave: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
        httpOnly: true,
        secure: __prod__,
        sameSite: "lax",
        // domain: __prod__ ? "" : undefined,
      },
    })
  );
  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }): Context => ({
      req,
      res,
      redis,
      dataLoaders: {
        userLoader: createUserLoader(),
        upvoteLoader: createUpvoteLoader(),
      },
    }),
  });
  apolloServer.applyMiddleware({ app, cors: false });
  app.get("/", (_req, _res) => {
    return "hello world";
  });
  app.listen(process.env.PORT, () => {
    console.log(`Listening on port ${port}`);
  });
}

main();
