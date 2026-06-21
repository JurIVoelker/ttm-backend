import { SyncService } from './service/sync-service.js';

const args = process.argv.slice(2);

if (args.length === 0) {
  import('./index').catch(err => {
    console.error('Error importing index.ts:', err);
    process.exit(1);
  }).then(({ default: server }) => {
    Bun.serve(server);
  })
} else if (args[0] === 'sync') {
  const synService = new SyncService();
  synService.autoSync().then(() => {
    process.exit(0);
  })
} else if (args[0] === 'migrate') {
  if (!args[1] || !args[2]) {
    console.error('Usage: migrate <oldDbUrl> <newDbUrl> [--dry-run]');
    process.exit(1);
  }
  import('../scripts/migrate-invite-tokens.js').catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
} else {
  console.error(`Unknown argument: ${args[0]}`);
  process.exit(1);
}
