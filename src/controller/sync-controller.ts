import { Hono } from "hono"
import { access, jwtMiddleware } from "../lib/auth"
import { SyncService } from "../service/sync-service";
import { validateJSON } from "../lib/validate";
import { POST_SYNC_IDS_SCHEMA, POST_SYNC_SETTINGS_SCHEMA } from "../validation/sync-schema";

export const syncController = new Hono().basePath("/sync")
syncController.use(jwtMiddleware)
const syncService = new SyncService();

syncController.get("", access("admin"), async (c) => {
  const changes = await syncService.getChanges();
  return c.json(changes);
})

syncController.post("", access("admin"), async (c) => {
  await syncService.autoSync();
  return c.json({ status: "ok" });
})

syncController.post("/ids", access("admin"), validateJSON(POST_SYNC_IDS_SCHEMA), async (c) => {
  const { ids } = c.get("json");
  await syncService.manualSync(ids);
  return c.json({ status: "ok" });
})

syncController.get("/settings", access("admin"), async (c) => {
  const settings = await syncService.getSettings();
  return c.json(settings);
})

syncController.post("/settings", validateJSON(POST_SYNC_SETTINGS_SCHEMA), access("admin"), async (c) => {
  const { autoSync, includeRRSync } = c.get("json");
  const settings = await syncService.updateSettings(autoSync, includeRRSync);
  return c.json(settings);
})