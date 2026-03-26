import { test, expect } from "bun:test"
import { SyncService } from "../../service/sync-service";

const syncService = new SyncService();

test("Sync service test", async () => {
  const changes = await syncService.getChanges();
  console.log(changes);
});


test("Autosync", async () => {
  await syncService.autoSync();
});

test("getPlayers: returns array grouped by teamType", async () => {
  const players = await syncService.getPlayers();

  expect(Array.isArray(players)).toBe(true);
  for (const group of players) {
    expect(typeof group.teamType).toBe("string");
    expect(Array.isArray(group.players)).toBe(true);
    for (const player of group.players) {
      expect(typeof player.name).toBe("string");
      expect(typeof player.QTTR).toBe("number");
      expect(typeof player.position).toBe("string");
      expect(typeof player.teamIndex).toBe("number");
    }
  }
});