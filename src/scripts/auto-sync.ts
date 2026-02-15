import { SyncService } from "../service/sync-service";

const syncService = new SyncService();

(async () => {
  await syncService.autoSync();
})();
