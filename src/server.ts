import { MikroORM, Options } from "@mikro-orm/core";
import { __prod__, Context, COOKIE_NAME } from "./constants";
import { ApolloServer } from "apollo-server-express";
import config from "./mikro-orm.config";
import { buildSchema } from "type-graphql";
import PostResolver from "./resolvers/PostResolver";
import "reflect-metadata";

import express from "express";
import UserResolver from "./resolvers/UserResolver";
import Redis from "ioredis";
import session from "express-session";
import connectRedis from "connect-redis";
import cors from "cors";

require("dotenv").config;

const port = process.env.PORT || 4000;

async function main() {
  const orm = await MikroORM.init(<Options>config);
  await orm.getMigrator().up();

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
    context: ({ req, res }): Context => ({ em: orm.em, req, res, redis }),
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
