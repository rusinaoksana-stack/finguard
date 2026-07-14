import type { RequestHandler } from "express";
import { ZodError, type ZodSchema } from "zod";
import { HttpError } from "./http-error";

export function validateBody<T>(schema: ZodSchema<T>): RequestHandler {
  return (req, _res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new HttpError(400, "Invalid request body", error.flatten()));
        return;
      }

      next(error);
    }
  };
}
