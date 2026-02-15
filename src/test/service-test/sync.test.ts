import { test } from "bun:test"
import { SyncService } from "../../service/sync-service";

const syncService = new SyncService();

test("Sync service test", async () => {
  const changes = await syncService.getChanges();
  console.log(changes);
});


test("Autosync", async () => {
  await syncService.autoSync();
});