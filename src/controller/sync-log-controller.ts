import { Hono } from "hono"
import { access, jwtMiddleware } from "../lib/auth"
import { SyncLogService } from "../service/sync-log-service";

export const syncLogController = new Hono().basePath("/sync")
syncLogController.use(jwtMiddleware)
const syncLogService = new SyncLogService();

syncLogController.get("/logs", access("admin"), async (c) => {
  const limit = Number(c.req.query("limit")) || 50;
  const logs = await syncLogService.getLogs(limit);
  return c.json(logs);
})

syncLogController.get("/logs/:id", access("admin"), async (c) => {
  const log = await syncLogService.getLogById(c.req.param("id"));
  return c.json(log);
})
