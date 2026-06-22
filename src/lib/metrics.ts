import { prometheus } from "@hono/prometheus";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import logger, { getClientIp } from "./logger";
import { METRICS_ALLOWED_IPS } from "../config";

// RED metrics; registerMetrics goes on `*`, printMetrics on the route.
export const { registerMetrics, printMetrics } = prometheus();

// RFC1918 private ranges (10/8, 172.16/12, 192.168/16) + IPv6 unique-local (fc00::/7).
const PRIVATE_IP_RE = /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|f[cd])/i;

const isTrustedIp = (ip: string): boolean => {
  const a = ip.replace(/^::ffff:/, ""); // strip IPv4-mapped IPv6 prefix
  if (a === "127.0.0.1" || a === "::1") return true; // localhost
  return PRIVATE_IP_RE.test(a) || METRICS_ALLOWED_IPS.includes(a);
};

export const metricsIpAllowlist = createMiddleware(async (c, next) => {
  const ip = getClientIp(c);
  if (!isTrustedIp(ip)) {
    logger.warn({ ip, path: c.req.path }, "Blocked /metrics access from untrusted IP");
    throw new HTTPException(403, { message: "Forbidden" });
  }
  await next();
});
