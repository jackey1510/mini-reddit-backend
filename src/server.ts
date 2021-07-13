import { __prod__, Context, COOKIE_NAME } from "./constants";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import PostResolver from "./resolvers/PostResolver";
import "reflect-metadata";

import express from "express";
import UserResolver from "./resolvers/UserResolver";
import Redis from "ioredis";
import session from "express-session";
import connectRedis from "connect-redis";
import cors from "cors";

import { createConnection } from "typeorm";
import { Post } from "./entities/post";
import { User } from "./entities/User";

require("dotenv").config();

const port = process.env.PORT || 4000;

async function main() {
  await createConnection({
    type: "postgres",
    database: "mini-reddit-2",
    username: process.env.DB_USERNAME!,
    password: process.env.DB_PASSWORD!,
    logging: true,
    synchronize: true,
    port: 5432,
    entities: [Post, User],
  });

  const app = express();
  const RedisStore = connectRedis(session);
  const redis = new Redis();

  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    })
  );

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({ client: redis, disableTouch: true }),
      saveUninitialized: false,
      secret: process.env.REDIS_SECRET || "hgihsigid",
      resave: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
        httpOnly: true,
        secure: __prod__,
        sameSite: "lax",
      },
    })
  );
  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }): Context => ({ req, res, redis }),
  });
  apolloServer.applyMiddleware({ app, cors: false });
  app.get("/", (_req, _res) => {
    return "hello world";
  });
  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
}

main();
