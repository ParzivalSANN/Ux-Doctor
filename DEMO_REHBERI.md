# 🎬 UX Doctor - 3-5 Dakikalık Demo Videosu Çekim Kılavuzu & Konuşma Metni

Bu kılavuz, ödev tesliminde istenen 3-5 dakikalık video kaydını en etkili, profesyonel ve akıcı şekilde çekebilmeniz için adım adım hazırlanmıştır.

---

### ⏱️ Video Zaman Çizelgesi Özeti (Toplam: ~4 Dakika)
- **00:00 - 00:35:** Giriş, Amaç ve Manifest V3 Eklentisinin Yüklenmesi
- **00:35 - 01:25:** Katmanlı Mimari ve MHRS Sağlık Sitesi Analizi
- **01:25 - 02:15:** Sayfada Canlı Vurgulama (Highlight on Click) & Kanıt Gösterimi
- **02:15 - 03:00:** Büyükanne Testi, Gece 3 Acil Durum Testi ve Halüsinasyon Kalkanı
- **03:00 - 03:40:** Etik & Gizlilik Kalkanı ve JSON Raporu Dışa Aktarımı
- **03:40 - 04:00:** Kapanış ve Skorlama Özeti

---

### 🎙️ Sahne Sahne Konuşma Metni ve Ekran Hareketleri

#### 🎬 1. BÖLÜM: Giriş ve Kurulum (00:00 - 00:35)
* **Ekranda Ne Olacak:** `chrome://extensions` sayfası açık olsun. `dist` klasörü "Paketlenmemiş öğe yükle" ile yüklenmiş durumda olsun.
* **Ne Söyleyeceksiniz:**
  > *"Merhaba, bu videoda Deneyim Mühendisliği dersi kapsamında geliştirdiğim **UX Doctor** adlı Chrome Side Panel eklentisini tanıtacağım.*  
  > *Projemizin temel felsefesi: 'AI'a sayfayı sorup rastgele puan almak değil; tekrarlanabilir, doğrulanabilir ve her bulguyu somut kanıtla gösteren bir tanı aracı inşa etmektir. Kanıtı olmayan bulgu, bulgu sayılmaz.'*  
  > *Eklentimiz Manifest V3 mimarisinde, hiçbir tıklama botu olmadan tamamen salt-okunur olarak çalışıyor."*

---

#### 🎬 2. BÖLÜM: Canlı Teşhis ve Çift Katmanlı Skorlama (00:35 - 01:25)
* **Ekranda Ne Olacak:** Sağlık sitesi sekmesi açık olsun (`https://mhrs.gov.tr/vatandas/`). Sağ tarafta UX Doctor Side Panel'i açık olsun.
* **Eylemler:** Paneldeki nane yeşili **"Tek Tıkla UX Teşhisini Başlat"** butonuna tıklayın. 1-2 saniye içinde skorlar ve bulgular gelsin.
* **Ne Söyleyeceksiniz:**
  > *"Şimdi ilk test sitemiz olan MHRS Randevu portalındayız. Paneldeki 'Tek Tıkla UX Teşhisi' butonuna basıyorum.*  
  > *Gördüğünüz gibi sistem iki ayrı analiz katmanını aynı anda çalıştırdı:*  
  > *1. **Deterministik Katman:** WCAG 2.2 AA kurallarına göre renk kontrastını, dokunma hedefi boyutlarını ve eksik etiketleri kod seviyesinde ölçtü ve 68 puan verdi.*  
  > *2. **Yorumsal Katman:** Don Norman'ın 6 Temel İlkesine (Görünürlük, Geri Bildirim, Kısıtlar, Eşleme, Tutarlılık ve Sağlarlık) göre değerlendirme yaptı ve 62 puan verdi.*  
  > *Genel UX skorumuz bu iki katmanın eşit ağırlıklı aritmetik ortalaması olan **65 (Orta)** olarak hesaplandı."*

---

#### 🎬 3. BÖLÜM: Kanıt ve Sayfada Canlı Vurgulama (01:25 - 02:15)
* **Ekranda Ne Olacak:** Bulgular listesinde bir bulgunun üzerindeki **"Sayfada Göster"** butonuna tıklayın.
* **Eylemler:** 
  1. `div.help-container > button.tooltip-trigger` (20x20px dokunma hedefi) bulgusunun yanındaki **"Sayfada Göster"** butonuna tıklayın.
  2. Web sayfasının o elemana otomatik kaydığını ve etrafında nane yeşili parıldayan bir çerçevenin yandığını gösterin.
* **Ne Söyleyeceksiniz:**
  > *"Bu aracın en güçlü yanı, her bulgunun arkasında canlı DOM kanıtının olmasıdır.*  
  > *Örneğin burada: WCAG 2.5.8 Kuralı gereği 'Yardım butonu 20x20 piksel boyutuyla asgari 24 piksel sınırının altında' uyarısı var. 'Sayfada Göster' butonuna tıkladığım anda tarayıcı sayfayı doğrudan ilgili elemana kaydırıyor ve etrafında parıldayan çerçeveyle kanıtı tasarımcıya gösteriyor.*  
  > *İlgili CSS seçicisi de burada monospace olarak sunuluyor ve tek tıkla kopyalanabiliyor."*

---

#### 🎬 4. BÖLÜM: Büyükanne Testi & Halüsinasyon Kalkanı (02:15 - 03:00)
* **Ekranda Ne Olacak:** Norman bulgularını kaydırın, `Norman: Görünürlük` ve `Norman: Sağlarlık` kartlarını gösterin.
* **Ne Söyleyeceksiniz:**
  > *"Ödevimizin 4. bölümündeki stres senaryolarını incelediğimizde:*  
  > *- **Büyükanne Testi:** 72 yaşındaki bir kullanıcının el titremesi ve görme zayıflığıyla bu küçük 20x20px butonlara basamayacağı ve poliklinik kartlarında tıklama hissi (affordance) bulamayacağı araç tarafından kesin olarak yakalandı.*  
  > *- **Gece 3 Acil Durum Testi:** Şiddetli ağrıyla gece sisteme giren hastanın poliklinik randevusu değil 112 Acil yönlendirmesi aradığı, ancak bu yönlendirmenin sayfa altına gizlendiği 'Norman: Görünürlük' kuralıyla yakalandı.*  
  > *Ayrıca mimarimizde bulunan **Halüsinasyon Kalkanı (Grounding Verifier)** sayesinde, sayfada fiziksel olarak var olmayan hiçbir seçici kabul edilmiyor; raporda halüsinasyon oranımız **%0.0** olarak doğrulanıyor."*

---

#### 🎬 5. BÖLÜM: Etik Kalkanı ve JSON Dışa Aktarımı (03:00 - 03:40)
* **Ekranda Ne Olacak:** 
  1. Üstteki Etik Kalkanı rozetini gösterin.
  2. **"JSON Raporunu İndir"** butonuna tıklayın ve inen dosyayı tarayıcıda veya editörde 5 saniye gösterin.
* **Ne Söyleyeceksiniz:**
  > *"Etik ve güvenlik kurallarına tam uyum sağladık:*  
  > *- Sayfada parola veya hassas giriş alanı tespit edilirse açık kullanıcı onayı alınıyor.*  
  > *- Tüm form değerleri otomatik olarak `[MASKED]` şeklinde filtreleniyor; hiçbir kişisel veri veya klavye vuruşu toplanmıyor.*  
  > *- API anahtarı koda gömülmüyor, yerel storage'da tutuluyor.*  
  > *Son olarak 'JSON Raporunu İndir' butonuna basıyorum. Gördüğünüz gibi ödevin istediği tüm metrikler, alt skorlar ve kanıtlı seçiciler tek tıkla `/reports` standartlarında JSON olarak dışa aktarılabiliyor."*

---

#### 🎬 6. BÖLÜM: Kapanış (03:40 - 04:00)
* **Ne Söyleyeceksiniz:**
  > *"Özetle UX Doctor; deterministik WCAG kuralları ile Don Norman'ın bilişsel ergonomi ilkelerini kanıta dayalı, tekrarlanabilir ve halüsinasyonsuz bir yapıda birleştiren güvenilir bir tanı aracıdır.*  
  > *Beni dinlediğiniz için teşekkür ederim."*
