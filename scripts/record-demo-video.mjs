/**
 * UX Doctor - Otomatik Demo Videosu Kaydedici (Testsiz / Standalone)
 *
 * Playwright-core ve Google Chrome kullanarak:
 *  1. Dahili Vite sunucusunu başlatır.
 *  2. 1280x720 çözünürlükte video kaydını açar.
 *  3. DEMO_REHBERI.md senaryosunu adım adım icra eder:
 *     - Sayfa teşhisini başlatma
 *     - Deterministik vs Norman skorlama karşılaştırması
 *     - 6 Norman alt skorlarının gösterimi
 *     - Skor formülü ve gerekçesi modalı
 *     - Kanıtlı bulgular listesi ve filtreleme
 *     - Sayfada canlı vurgulama (Highlight)
 *     - Gizlilik & API ayarları
 *     - JSON raporu dışa aktarımı
 *  4. Kaydedilen videoyu 'demo/ux_doctor_demo_video.webm' olarak saklar.
 */

import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const demoDir = path.resolve(rootDir, 'demo');

if (!fs.existsSync(demoDir)) {
  fs.mkdirSync(demoDir, { recursive: true });
}

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function recordDemo() {
  console.log('🚀 [UX Doctor] Vite sunucusu başlatılıyor...');
  const viteServer = await createServer({
    root: rootDir,
    server: { port: 5173, host: '127.0.0.1' },
  });
  await viteServer.listen();
  console.log('✅ [UX Doctor] Vite sunucusu http://127.0.0.1:5173 üzerinde hazır.');

  console.log('🎥 [UX Doctor] Chrome video kaydedici başlatılıyor...');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--window-size=1280,760',
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: demoDir,
      size: { width: 1280, height: 720 },
    },
  });

  const page = await context.newPage();

  console.log('🌐 [UX Doctor] Sayfaya gidiliyor...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
  await sleep(2000);

  // 1. SAHNE: Giriş ve Başlık
  console.log('🎬 [Sahne 1] Giriş ve sayfa durumu...');
  await sleep(2500);

  // 2. SAHNE: "Tek Tıkla UX Teşhisini Başlat" butonuna tıklama
  console.log('🎬 [Sahne 2] Teşhis başlatılıyor...');
  const runAuditBtn = page.locator('button:has-text("Tek Tıkla UX Teşhisini Başlat")');
  if (await runAuditBtn.isVisible()) {
    await runAuditBtn.click();
    await sleep(3500); // Analizin tamamlanmasını bekle
  }

  // 3. SAHNE: Skorları ve Katmanları İnceleme
  console.log('🎬 [Sahne 3] Bileşik skor ve katman karşılaştırması inceleniyor...');
  await sleep(3000);

  // 4. SAHNE: Skor Formülü ve Gerekçesi Modalı
  console.log('🎬 [Sahne 4] Skor formülü modalı açılıyor...');
  const formulaBtn = page.locator('button:has-text("Skor Formülü & Gerekçesi")');
  if (await formulaBtn.isVisible()) {
    await formulaBtn.click();
    await sleep(4000); // Formülü oku
    // Modalı kapat
    const modalCloseBtn = page.locator('button:has-text("Anladım")');
    if (await modalCloseBtn.isVisible()) {
      await modalCloseBtn.click();
      await sleep(1500);
    }
  }

  // 5. SAHNE: Norman 6 İlke Alt Skorlarına Odaklanma
  console.log('🎬 [Sahne 5] Don Norman 6 İlke alt skorları inceleniyor...');
  await page.mouse.wheel(0, 200);
  await sleep(3000);

  // 6. SAHNE: Bulgular Filtrelemesi
  console.log('🎬 [Sahne 6] Bulgular listesi ve filtreler test ediliyor...');
  await page.mouse.wheel(0, 300);
  await sleep(2000);

  // WCAG Filtresi
  const wcagFilterBtn = page.locator('button:has-text("WCAG")');
  if (await wcagFilterBtn.isVisible()) {
    await wcagFilterBtn.click();
    await sleep(2500);
  }

  // Norman Filtresi
  const normanFilterBtn = page.locator('button:has-text("Norman")');
  if (await normanFilterBtn.isVisible()) {
    await normanFilterBtn.click();
    await sleep(2500);
  }

  // Tümü Filtresi
  const allFilterBtn = page.locator('button:has-text("Tümü")').first();
  if (await allFilterBtn.isVisible()) {
    await allFilterBtn.click();
    await sleep(2000);
  }

  // 7. SAHNE: Sayfada Canlı Vurgulama (Highlight on Click)
  console.log('🎬 [Sahne 7] Sayfada Göster (Highlight) tetikleniyor...');
  const highlightBtns = page.locator('button:has-text("Sayfada Göster")');
  const count = await highlightBtns.count();
  if (count > 0) {
    await highlightBtns.first().click();
    await sleep(3500); // Vurgulama animasyonunu göster
  }

  // 8. SAHNE: Ayarlar ve Etik Kalkanı
  console.log('🎬 [Sahne 8] Ayarlar & Etik Güvenlik kalkanı modalı...');
  const settingsBtn = page.locator('button[title*="Ayarlar"]').first();
  if (await settingsBtn.isVisible()) {
    await settingsBtn.click();
    await sleep(3500);
    // Modalı kapat
    const closeBtn = page.locator('button:has-text("✕")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await sleep(1500);
    }
  }

  // 9. SAHNE: JSON Raporu Dışa Aktarma
  console.log('🎬 [Sahne 9] JSON raporu dışa aktarılıyor...');
  const exportJsonBtn = page.locator('button:has-text("JSON Raporunu İndir")');
  if (await exportJsonBtn.isVisible()) {
    await exportJsonBtn.click();
    await sleep(2500);
  }

  // 10. SAHNE: Sekmeler Arası Gezinme (Ek Özellikler: Isı Haritası / Oturumlar)
  console.log('🎬 [Sahne 10] Isı Haritası sekmesi gösteriliyor...');
  const heatmapTab = page.locator('button:has-text("Isı Haritası")');
  if (await heatmapTab.isVisible()) {
    await heatmapTab.click();
    await sleep(3000);
  }

  console.log('🎬 [Sahne 11] Teşhis paneline geri dönüş...');
  const diagnosisTab = page.locator('button:has-text("Teşhis")');
  if (await diagnosisTab.isVisible()) {
    await diagnosisTab.click();
    await sleep(3000);
  }

  console.log('🛑 [UX Doctor] Kayıt tamamlanıyor...');
  await page.close();
  await context.close();
  await browser.close();
  await viteServer.close();

  // En son üretilen video dosyasını bul ve yeniden adlandır
  const files = fs.readdirSync(demoDir).filter((f) => f.endsWith('.webm'));
  if (files.length > 0) {
    // En yeni dosyayı al
    files.sort((a, b) => fs.statSync(path.join(demoDir, b)).mtimeMs - fs.statSync(path.join(demoDir, a)).mtimeMs);
    const latestVideo = path.join(demoDir, files[0]);
    const finalVideoPath = path.join(demoDir, 'ux_doctor_demo_video.webm');

    if (latestVideo !== finalVideoPath) {
      if (fs.existsSync(finalVideoPath)) {
        fs.unlinkSync(finalVideoPath);
      }
      fs.renameSync(latestVideo, finalVideoPath);
    }

    const stats = fs.statSync(finalVideoPath);
    console.log(`🎉 [UX Doctor] Demo videosu başarıyla kaydedildi!`);
    console.log(`📁 Dosya Yolu: ${finalVideoPath}`);
    console.log(`📦 Dosya Boyutu: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  }
}

recordDemo().catch((err) => {
  console.error('❌ Hata oluştu:', err);
  process.exit(1);
});
