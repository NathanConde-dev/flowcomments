import { checkForUpdates } from '../lib/updates/check';

async function main() {
  const r = await checkForUpdates();
  console.log(
    JSON.stringify(
      {
        current: r.current,
        latest: r.latest,
        updateAvailable: r.updateAvailable,
        remoteAvailable: r.remoteAvailable,
        remoteSource: r.remoteSource,
        selfUpdateEnabled: r.selfUpdateEnabled,
        top: r.releases.slice(0, 3).map((x) => ({
          version: x.version,
          title: x.title,
        })),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
