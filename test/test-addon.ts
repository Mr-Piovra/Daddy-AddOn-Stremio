import { getManifest } from '../src/manifest';
import { CatalogHandler } from '../src/handlers/catalog';
import { MetaHandler } from '../src/handlers/meta';
import { StreamHandler } from '../src/handlers/stream';
import { ScheduleService } from '../src/services/schedule';
import { ChannelsService } from '../src/services/channels';

async function runAddonTests() {
  console.log('=== [1] Test Manifest ===');
  const manifest = getManifest();
  console.log(`Addon Name: ${manifest.name} (v${manifest.version})`);
  console.log(`Catalogs count: ${manifest.catalogs.length}`);
  manifest.catalogs.forEach(c => console.log(`  - [${c.id}] ${c.name}`));

  console.log('\n=== [2] Test Channels Service ===');
  const privateCount = ChannelsService.getPrivateChannels().total;
  const publicCount = ChannelsService.getPublicChannels().total;
  const countriesCount = ChannelsService.getCountries().length;
  const categoriesCount = ChannelsService.getCategories().length;
  console.log(`Private Channels: ${privateCount}`);
  console.log(`Public Channels: ${publicCount}`);
  console.log(`Countries: ${countriesCount}, Categories: ${categoriesCount}`);

  console.log('\n=== [3] Test Catalog Handler (Private TV) ===');
  const privateCatalog = await CatalogHandler.handle({
    type: 'tv',
    id: 'rivestream-private',
    extra: { skip: 0 }
  });
  console.log(`Private catalog items returned: ${privateCatalog.metas.length}`);
  console.log(`Sample item:`, privateCatalog.metas[0]);

  console.log('\n=== [4] Test Catalog Handler (Public IPTV Italy) ===');
  const publicCatalog = await CatalogHandler.handle({
    type: 'tv',
    id: 'rivestream-public',
    extra: { genre: 'Italy', skip: 0 }
  });
  console.log(`Italian public channels returned: ${publicCatalog.metas.length}`);
  if (publicCatalog.metas.length > 0) {
    console.log(`Sample Italian item:`, publicCatalog.metas[0]);
  }

  console.log('\n=== [5] Test Schedule & Live Events ===');
  const events = await ScheduleService.getLiveEvents();
  console.log(`Live events found today: ${events.length}`);
  if (events.length > 0) {
    console.log(`Sample event:`, events[0]);
  }

  console.log('\n=== [6] Test Meta Handler ===');
  const metaResp = await MetaHandler.handle({
    type: 'tv',
    id: 'rivestream:private:51'
  });
  console.log('Meta detail:', metaResp.meta?.name, metaResp.meta?.genres);

  console.log('\n=== [7] Test Stream Handler (Resolving DaddyLive HLS) ===');
  console.log('Resolving streams for channel 51 (ABC USA)...');
  const streamResp = await StreamHandler.handle({
    type: 'tv',
    id: 'rivestream:private:51'
  });
  console.log(`Streams resolved: ${streamResp.streams.length}`);
  streamResp.streams.forEach((s, idx) => {
    console.log(`  [Stream ${idx + 1}] ${s.name} - ${s.title}`);
    console.log(`    URL: ${s.url.substring(0, 80)}...`);
  });

  console.log('\n✅ TUTTI I TEST SONO STATI COMPLETATI CON SUCCESSO!');
}

runAddonTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
