/**
 * UX Doctor - Bölünmüş Ekran Demo Videosu Kaydedici (Target Site + Side Panel)
 *
 * Playwright-core ve Google Chrome kullanarak:
 *  1. Dahili Vite sunucusunu başlatır.
 *  2. 1280x720 çözünürlükte video kaydını açar.
 *  3. http://127.0.0.1:5173/demo-split.html adresini açar:
 *     - Sol panel: Değerlendirilen hedef web sitesi (T.C. Sağlık Bakanlığı MHRS Randevu Portalı)
 *     - Sağ panel: UX Doctor Chrome Side Panel (v0.2.0)
 *  4. Adım adım senaryo (3 - 3.5 dakika):
 *     - Sol sayfada gezinme ve öğelerin incelenmesi (randevu arama, takvim, poliklinikler)
 *     - "Tek Tıkla UX Teşhisini Başlat" butonuna tıklanması ve canlı tarama
 *     - Çift katmanlı skorların (Deterministik 68 vs Norman 62 -> Bileşik 65) sunulması
 *     - Skor Formülü ve Gerekçesi modalının incelenmesi
 *     - Don Norman 6 ilke alt skorlarının incelenmesi
 *     - Bulguların filtrelenmesi (WCAG vs Norman)
 *     - "Sayfada Göster" butonu ile sol web sitesindeki öğelerin (#help-btn, #quick-clinic-search, #appointment-hint, #emergency-link) canlı vurgulanması
 *     - Etik, Gizlilik ve Hassas Veri Kalkanı ayarlarının gösterilmesi
 *     - JSON raporunun dışa aktarılması
 *     - Isı haritası ve oturum analizi sekmelerinin gösterilmesi
 *  5. Kaydedilen videoyu 'demo/ux_doctor_demo_video.webm' olarak saklar.
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

  console.log('🌐 [UX Doctor] Bölünmüş ekran sayfasına gidiliyor (/demo-split.html)...');
  await page.goto('http://127.0.0.1:5173/demo-split.html', { waitUntil: 'networkidle' });
  await sleep(3000);

  const panel = page.frameLocator('#sidepanel-frame');

  // ========================================================
  // 1. SAHNE: GİRİŞ & HEDEF WEB SİTESİNİN İNCELENMESİ (0:00 - 0:25)
  // ========================================================
  console.log('🎬 [Sahne 1] Hedef web sitesi (MHRS) ve UX Doctor Side Panel tanıtılıyor...');
  // Sol sayfada fare ile başlık ve arama kartına gezinme
  await page.mouse.move(300, 120);
  await sleep(3000);

  // Arama inputu üzerine gel
  await page.mouse.move(350, 220);
  await sleep(2500);

  // Poliklinik kartlarına doğru hafif aşağı kaydır
  await page.locator('#target-web-page').evaluate((el) => {
    el.scrollBy({ top: 180, behavior: 'smooth' });
  });
  await sleep(3000);

  // Takvim günlerine doğru kaydır
  await page.locator('#target-web-page').evaluate((el) => {
    el.scrollBy({ top: 160, behavior: 'smooth' });
  });
  await sleep(3000);

  // Sayfanın en üstüne geri dön
  await page.locator('#target-web-page').evaluate((el) => {
    el.scrollTo({ top: 0, behavior: 'smooth' });
  });
  await sleep(2500);

  // Sağ panele geçiş
  await page.mouse.move(1050, 100);
  await sleep(2000);

  // ========================================================
  // 2. SAHNE: TEK TIKLA UX TEŞHİSİNİ BAŞLATMA (0:25 - 0:50)
  // ========================================================
  console.log('🎬 [Sahne 2] Canlı Çift Katmanlı UX Teşhisi başlatılıyor...');
  const runAuditBtn = panel.locator('button:has-text("Tek Tıkla UX Teşhisini Başlat")');
  if (await runAuditBtn.isVisible()) {
    await runAuditBtn.click();
    console.log('⏳ [Sahne 2] Sayfa taranıyor: WCAG kuralları ve Don Norman ilkeleri...');
    await sleep(6000); // Analizin tamamlanmasını bekle
  }

  // ========================================================
  // 3. SAHNE: BİLEŞİK SKOR VE ÇİFT KATMAN KARŞILAŞTIRMASI (0:50 - 1:25)
  // ========================================================
  console.log('🎬 [Sahne 3] Genel UX Skoru (65/100) ve katmanlar inceleniyor...');
  await page.mouse.move(1050, 200);
  await sleep(4000);

  // Skor Formülü modalını aç
  console.log('🎬 [Sahne 3] Skor Formülü & Gerekçesi modalı açılıyor...');
  const formulaBtn = panel.locator('button:has-text("Skor Formülü & Gerekçesi")');
  if (await formulaBtn.isVisible()) {
    await formulaBtn.click();
    await sleep(6000); // Formülü ve gerekçeleri oku

    // Modalı kapat
    const modalCloseBtn = panel.locator('button:has-text("Anladım")');
    if (await modalCloseBtn.isVisible()) {
      await modalCloseBtn.click();
      await sleep(2500);
    }
  }

  // ========================================================
  // 4. SAHNE: DON NORMAN 6 İLKE ALT SKORLARI (1:25 - 2:00)
  // ========================================================
  console.log('🎬 [Sahne 4] Don Norman 6 İlke alt skorları inceleniyor...');
  // Yan paneli aşağı kaydırarak Norman alt skorlarını göster
  await page.mouse.move(1050, 350);
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 120);
    await sleep(1500);
  }
  await sleep(4000);

  // ========================================================
  // 5. SAHNE: KANITLI BULGULAR & CANLI SAYFA VURGULAMA (2:00 - 2:50)
  // ========================================================
  console.log('🎬 [Sahne 5] Bulgular listesi ve filtreleme test ediliyor...');
  await page.mouse.wheel(0, 200);
  await sleep(2500);

  // WCAG Filtresine tıkla
  console.log('🎬 [Sahne 5] WCAG Filtresi seçiliyor...');
  const wcagFilterBtn = panel.locator('button:has-text("WCAG")');
  if (await wcagFilterBtn.isVisible()) {
    await wcagFilterBtn.click();
    await sleep(3000);
  }

  // 1. Bulgu: #help-btn (20x20px Dokunma Hedefi İhlali) vurgula
  console.log('🎬 [Sahne 5] 1. Bulgu: #help-btn hedef sitede canlı vurgulanıyor...');
  const highlightBtns = panel.locator('button:has-text("Sayfada Göster")');
  const count = await highlightBtns.count();
  if (count > 0) {
    await highlightBtns.nth(0).click();
    // Sol taraftaki MHRS sayfasında ? butonunun vurgulanmasını göster
    await page.mouse.move(450, 180);
    await sleep(5500);
  }

  // 2. Bulgu: #quick-clinic-search (Etiketsiz Form İhlali) vurgula
  if (count > 1) {
    console.log('🎬 [Sahne 5] 2. Bulgu: #quick-clinic-search hedef sitede canlı vurgulanıyor...');
    await highlightBtns.nth(1).click();
    await page.mouse.move(300, 240);
    await sleep(5500);
  }

  // 3. Bulgu: #appointment-hint (Düşük Kontrast İhlali) vurgula
  if (count > 2) {
    console.log('🎬 [Sahne 5] 3. Bulgu: #appointment-hint hedef sitede canlı vurgulanıyor...');
    await highlightBtns.nth(2).click();
    await page.mouse.move(350, 310);
    await sleep(5500);
  }

  // Norman Filtresine geç
  console.log('🎬 [Sahne 5] Norman Filtresi seçiliyor...');
  const normanFilterBtn = panel.locator('button:has-text("Norman")');
  if (await normanFilterBtn.isVisible()) {
    await normanFilterBtn.click();
    await sleep(3000);
  }

  // Norman bulgusunu vurgula (Örn. footer acil linki veya poliklinik kartı)
  const normanHighlightBtns = panel.locator('button:has-text("Sayfada Göster")');
  const normanCount = await normanHighlightBtns.count();
  if (normanCount > 0) {
    console.log('🎬 [Sahne 5] Norman bulgusu hedef sitede canlı vurgulanıyor...');
    await normanHighlightBtns.first().click();
    await sleep(5500);
  }

  // Tümü filtresine geri dön
  const allFilterBtn = panel.locator('button:has-text("Tümü")').first();
  if (await allFilterBtn.isVisible()) {
    await allFilterBtn.click();
    await sleep(2500);
  }

  // ========================================================
  // 6. SAHNE: ETİK, GİZLİLİK VE HASSAS VERİ KALKANI (2:50 - 3:15)
  // ========================================================
  console.log('🎬 [Sahne 6] Etik, Gizlilik ve Güvenlik Ayarları açılıyor...');
  const settingsBtn = panel.locator('button[title*="Ayarlar"]').first();
  if (await settingsBtn.isVisible()) {
    await settingsBtn.click();
    await sleep(5500); // Gizlilik ve etik bildirimlerini göster

    // Ayarlar modalını kapat
    const closeBtn = panel.locator('button:has-text("✕")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await sleep(2500);
    }
  }

  // ========================================================
  // 7. SAHNE: JSON RAPORUNU DIŞA AKTARMA & SEKMELER (3:15 - 3:35)
  // ========================================================
  console.log('🎬 [Sahne 7] JSON Raporu dışa aktarılıyor...');
  const exportJsonBtn = panel.locator('button:has-text("JSON Raporunu İndir")');
  if (await exportJsonBtn.isVisible()) {
    await exportJsonBtn.click();
    await sleep(3500);
  }

  // Isı Haritası sekmesi
  console.log('🎬 [Sahne 7] Ek Sekme: Isı Haritası gösteriliyor...');
  const heatmapTab = panel.locator('button:has-text("Isı Haritası")');
  if (await heatmapTab.isVisible()) {
    await heatmapTab.click();
    await sleep(3500);
  }

  // Teşhis paneline geri dönüş
  console.log('🎬 [Sahne 7] Teşhis paneline geri dönülüyor...');
  const diagnosisTab = panel.locator('button:has-text("Teşhis")');
  if (await diagnosisTab.isVisible()) {
    await diagnosisTab.click();
    await sleep(3500);
  }

  console.log('🛑 [UX Doctor] Kayıt tamamlanıyor ve video kaydediliyor...');
  await page.close();
  await context.close();
  await browser.close();
  await viteServer.close();

  // En son üretilen video dosyasını bul ve yeniden adlandır
  const files = fs.readdirSync(demoDir).filter((f) => f.endsWith('.webm'));
  if (files.length > 0) {
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
