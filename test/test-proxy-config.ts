import { ConfigParser, UserConfig } from '../src/utils/configParser';
import { StreamHandler } from '../src/handlers/stream';
import { getManifest } from '../src/manifest';

async function testProxyConfig() {
  console.log('=== [1] Test Config Encoding & Decoding ===');
  const originalConfig: UserConfig = {
    proxyUrl: 'https://my-easyproxy.example.com',
    proxyPassword: 'mypassword123',
    proxyType: 'easyproxy',
    includeDirect: false,
    enablePrivate: true,
    enableEvents: true,
    enablePublic: true
  };

  const encodedToken = ConfigParser.encode(originalConfig);
  console.log('Encoded token:', encodedToken);

  const decodedConfig = ConfigParser.decode(`cfg-${encodedToken}`);
  console.log('Decoded config:', decodedConfig);

  console.log('\n=== [2] Test Configured Manifest ===');
  const manifest = getManifest(decodedConfig);
  console.log('Manifest name:', manifest.name);
  console.log('Catalogs enabled:', manifest.catalogs.map(c => c.name));

  console.log('\n=== [3] Test Stream Resolution Delegated to EasyProxy ===');
  const streamResp = await StreamHandler.handle({
    type: 'tv',
    id: 'rivestream:private:51',
    userConfig: decodedConfig
  });

  console.log(`Streams generated: ${streamResp.streams.length}`);
  streamResp.streams.forEach((s, i) => {
    console.log(`  [Stream ${i + 1}] ${s.name} - ${s.title}`);
    console.log(`    URL: ${s.url}`);
  });

  const hasValidStream = streamResp.streams.some(s => 
    (s.url.includes('/proxy/hls/manifest.m3u8') || s.url.includes('/extractor/video')) &&
    s.url.includes('api_password=mypassword123')
  );

  if (hasValidStream && streamResp.streams.length > 0) {
    console.log('\n✅ VERIFICA SUPERATA: Generati stream EasyProxy con protezione token e credenziali!');
  } else {
    console.error('\n❌ VERIFICA FALLITA: Stream non conformi.');
    process.exit(1);
  }
}

testProxyConfig().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
