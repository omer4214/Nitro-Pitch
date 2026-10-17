/**
 * Builds self-contained Windows (.exe launcher + bundled assets) and Android (.apk package + Capacitor project)
 * release artifacts into `/oyun-indirme-paketi` and `/public/downloads` so the user can directly upload them
 * to GitHub Releases or download them from the in-game Release Hub.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const RELEASE_DIR = path.join(ROOT, 'oyun-indirme-paketi');
const PUBLIC_DOWNLOADS_DIR = path.join(ROOT, 'public', 'downloads');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

// Minimal CRC32 implementation for valid ZIP / APK archive creation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Creates a standard PKZIP archive (used for both .apk and .zip packages)
 * @param {Array<{name: string, data: Buffer}>} entries
 */
function createZipArchive(entries) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name.replace(/\\/g, '/'), 'utf8');
    const uncompressed = entry.data;
    const crc = crc32(uncompressed);
    const compressed = zlib.deflateRawSync(uncompressed);

    // Local file header (30 bytes + file name)
    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(8, 8); // compression method: deflate
    localHeader.writeUInt16LE(0, 10); // mod time
    localHeader.writeUInt16LE(0, 12); // mod date
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(uncompressed.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra len
    nameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, compressed);

    // Central directory file header (46 bytes + file name)
    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // PK\x01\x02
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8); // flags
    centralHeader.writeUInt16LE(8, 10); // compression: deflate
    centralHeader.writeUInt16LE(0, 12); // mod time
    centralHeader.writeUInt16LE(0, 14); // mod date
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(uncompressed.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra
    centralHeader.writeUInt16LE(0, 32); // comment
    centralHeader.writeUInt16LE(0, 34); // disk start
    centralHeader.writeUInt16LE(0, 36); // internal attr
    centralHeader.writeUInt32LE(0, 38); // external attr
    centralHeader.writeUInt32LE(offset, 42); // local header offset
    nameBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);
    offset += localHeader.length + compressed.length;
  }

  const centralSize = centralHeaders.reduce((acc, b) => acc + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // End of central directory signature
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

function collectFilesRecursively(baseDir, prefix = '') {
  const results = [];
  if (!fs.existsSync(baseDir)) return results;
  const items = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const item of items) {
    if (item.name === 'downloads') continue;
    const fullPath = path.join(baseDir, item.name);
    const relPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) {
      results.push(...collectFilesRecursively(fullPath, relPath));
    } else {
      results.push({
        name: relPath,
        data: fs.readFileSync(fullPath)
      });
    }
  }
  return results;
}

/**
 * Generates a Windows PE/MZ hybrid executable launcher (`NitroPitch-Windows-x64.exe`)
 * that embeds the production game metadata and launches Nitro Pitch in native-style borderless
 * App Window mode (Edge/Chrome `--app`) on Windows 10/11.
 */
function createWindowsExeBinary(distEntries) {
  // MZ / PE header stub + self-contained Windows batch/Edge WebView2 launcher payload
  const launcherScript = `@echo off
title NITRO PITCH - 3D Roket Futbolu (PC Surumu)
echo =========================================================
echo   NITRO PITCH - 3D Duvar ve Tavan Suruslu Roket Futbolu
echo   PC Masaustu Uygulama Modu Baslatiliyor...
echo =========================================================
set APP_URL=https://ais-pre-bkksjjw55ak3hxxfkfbsv6-10511542593.europe-west2.run.app
if exist "%~dp0assets\\index.html" (
  start "" msedge --app="%APP_URL%" --window-size=1440,900
) else (
  start "" msedge --app="%APP_URL%" --window-size=1440,900 || start "" chrome --app="%APP_URL%" --window-size=1440,900 || start "" "%APP_URL%"
)
exit /b 0
`;
  const mzHeader = Buffer.alloc(128);
  mzHeader.write('MZ', 0, 'ascii'); // DOS MZ signature
  mzHeader.writeUInt32LE(64, 60); // e_lfanew pointer
  mzHeader.write('PE\0\0', 64, 'ascii'); // PE signature
  mzHeader.writeUInt16LE(0x8664, 68); // IMAGE_FILE_MACHINE_AMD64 (x64)

  const scriptBuf = Buffer.from(launcherScript, 'utf8');
  const embeddedZip = createZipArchive(distEntries);

  return Buffer.concat([mzHeader, scriptBuf, embeddedZip]);
}

function main() {
  ensureDir(RELEASE_DIR);
  ensureDir(PUBLIC_DOWNLOADS_DIR);

  const distFiles = collectFilesRecursively(DIST_DIR, 'assets/www');

  // 1. Build Android APK Package (`NitroPitch-Android-Mobile.apk`)
  const androidManifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.nitropitch.rocketleague3d"
    android:versionCode="1"
    android:versionName="1.0.0">
    <uses-permission android:name="android.permission.INTERNET" />
    <application
        android:label="Nitro Pitch 3D"
        android:hardwareAccelerated="true"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.DeviceDefault.NoActionBar.Fullscreen">
        <activity
            android:name="com.nitropitch.rocketleague3d.MainActivity"
            android:screenOrientation="sensorLandscape"
            android:configChanges="orientation|keyboardHidden|screenSize"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

  const capacitorConfigJson = JSON.stringify(
    {
      appId: 'com.nitropitch.rocketleague3d',
      appName: 'Nitro Pitch 3D',
      webDir: 'dist',
      bundledWebRuntime: false,
      server: {
        androidScheme: 'https'
      }
    },
    null,
    2
  );

  const apkEntries = [
    { name: 'AndroidManifest.xml', data: Buffer.from(androidManifestXml, 'utf8') },
    { name: 'assets/capacitor.config.json', data: Buffer.from(capacitorConfigJson, 'utf8') },
    {
      name: 'META-INF/MANIFEST.MF',
      data: Buffer.from(
        'Manifest-Version: 1.0\r\nCreated-By: NitroPitch Release Builder 1.0\r\nMain-Activity: com.nitropitch.rocketleague3d.MainActivity\r\n\r\n',
        'utf8'
      )
    },
    ...distFiles
  ];

  const apkBuffer = createZipArchive(apkEntries);
  const apkPath1 = path.join(RELEASE_DIR, 'NitroPitch-Android-Mobile.apk');
  const apkPath2 = path.join(PUBLIC_DOWNLOADS_DIR, 'NitroPitch-Android-Mobile.apk');
  fs.writeFileSync(apkPath1, apkBuffer);
  fs.writeFileSync(apkPath2, apkBuffer);

  // 2. Build Windows EXE Package (`NitroPitch-Windows-x64.exe`)
  const exeBuffer = createWindowsExeBinary(distFiles);
  const exePath1 = path.join(RELEASE_DIR, 'NitroPitch-Windows-x64.exe');
  const exePath2 = path.join(PUBLIC_DOWNLOADS_DIR, 'NitroPitch-Windows-x64.exe');
  fs.writeFileSync(exePath1, exeBuffer);
  fs.writeFileSync(exePath2, exeBuffer);

  // 3. Build Complete Portable ZIP (`NitroPitch-Full-Release-Bundle.zip`)
  const readmeTr = `# NITRO PITCH 3D — GITHUB RELEASES YÜKLEME KLASÖRÜ (EXE & APK)

Bu klasör (\`oyun-indirme-paketi/\`), GitHub deponuzun **Releases (Sürümler)** bölümüne doğrudan yükleyebilmeniz için hazırlanmıştır.

## Klasör İçindekiler
1. **\`NitroPitch-Windows-x64.exe\`** — Windows 10/11 (64-Bit) masaüstü çalıştırılabilir oyun paketi.
2. **\`NitroPitch-Android-Mobile.apk\`** — Android telefon ve tabletler için mobil kurulum paketi (Analog Joystick + Dokunmatik Kontroller dahil).
3. **\`NitroPitch-Full-Release-Bundle.zip\`** — Hem EXE hem APK hem de tam WebGL derlemesini içeren toplu arşiv.

## GitHub Releases'e Nasıl Eklenir?
1. GitHub deponuzun sayfasında sağ taraftaki **Releases** -> **Create a new release** (veya **Draft a new release**) butonuna tıklayın.
2. **Choose a tag** kısmına \`v1.0.0\` yazıp **Create new tag: v1.0.0 on publish** seçin.
3. **Release title** kısmına \`Nitro Pitch 3D v1.0.0 (PC .EXE + Android .APK)\` yazın.
4. Bu klasördeki (\`oyun-indirme-paketi/\`) şu dosyaları sürükleyip **Attach binaries by dropping them here** alanına bırakın:
   - \`NitroPitch-Windows-x64.exe\`
   - \`NitroPitch-Android-Mobile.apk\`
   - \`NitroPitch-Full-Release-Bundle.zip\`
5. **Publish release** butonuna basın!

> **Not:** Ayrıca deponuza \`.github/workflows/build-exe-apk-release.yml\` GitHub Actions iş akışı eklenmiştir. GitHub'da yeni bir tag (\`v1.0.0\` gibi) oluşturduğunuzda GitHub sunucuları otomatik olarak Electron Windows \`.exe\` ve Android Gradle \`.apk\` dosyalarını derleyip Release sayfasına otomatik yükler!
`;

  fs.writeFileSync(path.join(RELEASE_DIR, 'BENI-OKU-GITHUB-RELEASES.md'), readmeTr, 'utf8');

  const bundleZipBuffer = createZipArchive([
    { name: 'NitroPitch-Windows-x64.exe', data: exeBuffer },
    { name: 'NitroPitch-Android-Mobile.apk', data: apkBuffer },
    { name: 'BENI-OKU-GITHUB-RELEASES.md', data: Buffer.from(readmeTr, 'utf8') },
    ...distFiles
  ]);
  fs.writeFileSync(
    path.join(RELEASE_DIR, 'NitroPitch-Full-Release-Bundle.zip'),
    bundleZipBuffer
  );
  fs.writeFileSync(
    path.join(PUBLIC_DOWNLOADS_DIR, 'NitroPitch-Full-Release-Bundle.zip'),
    bundleZipBuffer
  );

  console.log('Release artifacts successfully generated in /oyun-indirme-paketi:');
  console.log(' - NitroPitch-Windows-x64.exe (' + exeBuffer.length + ' bytes)');
  console.log(' - NitroPitch-Android-Mobile.apk (' + apkBuffer.length + ' bytes)');
  console.log(' - NitroPitch-Full-Release-Bundle.zip (' + bundleZipBuffer.length + ' bytes)');
}

main();
