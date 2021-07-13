import { Request, Response } from "express";
import { Session, SessionData } from "express-session";
import { Redis } from "ioredis";

export type Context = {
  req: Request & {
    session: Session & Partial<SessionData> & { userId?: number };
  };
  res: Response;
  redis: Redis;
};

export const __prod__ = process.env.NODE_ENV === "production";

export const COOKIE_NAME = "qid";

export const FORGET_PASSWORD_PREFIX = "forget-password:";
