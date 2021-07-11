import { EntityManager, IDatabaseDriver, Connection } from "@mikro-orm/core";
import { Request, Response } from "express";
import { Session, SessionData } from "express-session";

export type Context = {
  em: EntityManager<IDatabaseDriver<Connection>>;
  req: Request & {
    session: Session & Partial<SessionData> & { userId?: number };
  };
  res: Response;
};

export const __prod__ = process.env.NODE_ENV === "production";

export const COOKIE_NAME = "qid";
