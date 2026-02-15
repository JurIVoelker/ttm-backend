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
} else {
  console.error(`Unknown argument: ${args[0]}`);
  process.exit(1);
}
