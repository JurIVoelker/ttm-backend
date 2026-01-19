import { createMiddleware } from "hono/factory";
import { pino } from "pino";
import { PinoPretty } from "pino-pretty";
import { format } from "date-fns"

const stream = PinoPretty({
  levelFirst: true,
  colorize: true,
  ignore: "hostname,pid",
});

const logger = pino(
  {
    level: "debug"
  },
  stream,
);

export default logger;

const GREEN = "\x1b[32m";
const BLUE = "\x1b[34m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const MAGENTA = "\x1b[35m";
const WHITE = "\x1b[37m";

const methodColors: Record<string, string> = {
  GET: GREEN,
  POST: BLUE,
  PUT: MAGENTA,
  DELETE: RED,
}

const getStatusColor = (status: number) => {
  if (status >= 200 && status < 300) return GREEN;
  if (status >= 300 && status < 400) return MAGENTA;
  if (status >= 400 && status < 500) return YELLOW;
  if (status >= 500) return RED;
  return WHITE;
}

export const loggerMiddleware = createMiddleware(async (c, next) => {
  const color = methodColors[c.req.method] || WHITE;
  const start = Date.now();
  console.log(`\n<-- [${format(start, "HH:mm:ss:SSS")}] ${color}${c.req.method} ${WHITE}${c.req.path}`);
  await next();
  const end = Date.now();
  const ms = end - start;

  let size = 0;
  if (c.res.body && typeof c.res.body === "object") {
    try {
      size = Buffer.byteLength(JSON.stringify(c.res.body), "utf8");
    } catch {
      size = 0;
    }
  }

  const sizeStr = size > 0 ? ` - ${size} Bytes` : "";
  console.log(`--> [${format(end, "HH:mm:ss:SSS")}] Status ${getStatusColor(c.res.status)}${c.res.status}${WHITE} - ${ms} ms${sizeStr}`);
});
