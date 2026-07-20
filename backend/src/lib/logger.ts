import { config } from "../config";

type LogContext = Record<string, unknown>;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: config.NODE_ENV === "production" ? undefined : error.stack,
    };
  }

  return error;
}

function write(level: "info" | "warn" | "error", message: string, context?: LogContext) {
  const payload = {
    level,
    message,
    service: "finguard-api",
    timestamp: new Date().toISOString(),
    ...context,
  };

  const output = JSON.stringify(payload);

  if (level === "error") {
    console.error(output);
    return;
  }

  if (level === "warn") {
    console.warn(output);
    return;
  }

  if (config.NODE_ENV !== "production") {
    console.info(output);
  }
}

export const logger = {
  info(message: string, context?: LogContext) {
    write("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    write("warn", message, context);
  },
  error(message: string, error?: unknown, context?: LogContext) {
    write("error", message, { ...context, error: serializeError(error) });
  },
};
