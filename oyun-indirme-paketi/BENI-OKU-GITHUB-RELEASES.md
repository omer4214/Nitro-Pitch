# NITRO PITCH 3D — GITHUB RELEASES YÜKLEME KLASÖRÜ (EXE & APK)

Bu klasör (`oyun-indirme-paketi/`), GitHub deponuzun **Releases (Sürümler)** bölümüne doğrudan yükleyebilmeniz için hazırlanmıştır.

## Klasör İçindekiler
1. **`NitroPitch-Windows-x64.exe`** — Windows 10/11 (64-Bit) masaüstü çalıştırılabilir oyun paketi.
2. **`NitroPitch-Android-Mobile.apk`** — Android telefon ve tabletler için mobil kurulum paketi (Analog Joystick + Dokunmatik Kontroller dahil).
3. **`NitroPitch-Full-Release-Bundle.zip`** — Hem EXE hem APK hem de tam WebGL derlemesini içeren toplu arşiv.

## GitHub Releases'e Nasıl Eklenir?
1. GitHub deponuzun sayfasında sağ taraftaki **Releases** -> **Create a new release** (veya **Draft a new release**) butonuna tıklayın.
2. **Choose a tag** kısmına `v1.0.0` yazıp **Create new tag: v1.0.0 on publish** seçin.
3. **Release title** kısmına `Nitro Pitch 3D v1.0.0 (PC .EXE + Android .APK)` yazın.
4. Bu klasördeki (`oyun-indirme-paketi/`) şu dosyaları sürükleyip **Attach binaries by dropping them here** alanına bırakın:
   - `NitroPitch-Windows-x64.exe`
   - `NitroPitch-Android-Mobile.apk`
   - `NitroPitch-Full-Release-Bundle.zip`
5. **Publish release** butonuna basın!

> **Not:** Ayrıca deponuza `.github/workflows/build-exe-apk-release.yml` GitHub Actions iş akışı eklenmiştir. GitHub'da yeni bir tag (`v1.0.0` gibi) oluşturduğunuzda GitHub sunucuları otomatik olarak Electron Windows `.exe` ve Android Gradle `.apk` dosyalarını derleyip Release sayfasına otomatik yükler!
