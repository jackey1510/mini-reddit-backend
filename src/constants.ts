import { createUpvoteLoader } from "./utils/CreateDataLoader";
import DataLoader from "dataloader";
import { Request, Response } from "express";
import { Session, SessionData } from "express-session";
import { Redis } from "ioredis";
import { User } from "./entities/User";

export type Context = {
  req: Request & {
    session: Session & Partial<SessionData> & { userId?: number };
  };
  res: Response;
  redis: Redis;
  dataLoaders: myDataLoaders;
};

export type myDataLoaders = {
  userLoader: DataLoader<number, User, number>;
  upvoteLoader: ReturnType<typeof createUpvoteLoader>;
};

export const __prod__ = process.env.NODE_ENV === "production";

export const COOKIE_NAME = "qid";

export const FORGET_PASSWORD_PREFIX = "forget-password:";
