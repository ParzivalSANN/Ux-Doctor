# 📝 UX Doctor Geliştirme Süreci Yansıtma Notu (Reflection Note)

**Ders:** Deneyim Mühendisliği / UX Değerlendirme  
**Teslim:** Dönem Ödevi - Bölüm 6  
**Öğrenci / Geliştirici:** Berkay  

---

### 1. Yapay Zekanın (AI) Bana Nerede Yardım Ettiği?
Bu projede yapay zeka (LLM), özellikle Don Norman'ın 6 Temel İlkesi gibi yorumsal ve bilişsel ergonomi kavramlarının kodlanabilir bir kural zeminine oturtulmasında olağanüstü bir katalizör oldu. Normal şartlarda WCAG gibi kurallar W3C tarafından matematiksel olarak formülleştirilmişken (örn. 4.5:1 kontrast veya 24x24px dokunma boyutu), "Geri Bildirim Yetersizliği" veya "Sahte Sağlarlık (Affordance)" gibi kavramlar sübjektif kalmaya müsaittir.

AI'ın bana en büyük katkısı; sayfadaki etkileşimli öğeler budanıp kendisine sunulduğunda, bir tasarımcının empati yeteneğini simüle ederek "Bu buton tıklandığında kullanıcı ne bekler, arayüz ne cevap veriyor?" sorusuna bilişsel hipotezler (`hypothesis`) ve somut geliştirici önerileri (`recommendation`) üretebilmesi oldu. Ayrıca, TypeScript tipleri, W3C kontrast parlaklık (luminance) matematiksel formülleri ve karmaşık CSS seçici filtreleme algoritmalarının inşasında geliştirme hızımı en az 4-5 kat artırdı.

---

### 2. Yapay Zekanın Beni Nerede Yanılttığı?
Geliştirme sürecinin ilk denemelerinde en büyük tuzak, **"Aşırı Özgüvenli Halüsinasyon (Confident Hallucination)"** eğilimiydi. LLM'e tüm sayfanın ham HTML'ini veya ekran görüntüsünü verip serbestçe problem bulmasını istediğimde, model var olmayan CSS seçicileri uydurmaya başladı. 

Örneğin, sayfada gerçekte `div.help-container > button.tooltip-trigger` olan bir yardım butonunu incelemek yerine, kendi eğitim verisindeki genel kalıplardan esinlenerek `button#submit-appointment-help-modal-btn` gibi sayfada kesinlikle var olmayan hayali bir ID üretti. Dahası, sayfanın arkasında gizli olan (`display: none`) ve kullanıcının asla görmediği pasif modal pencerelerini aktifmiş gibi varsayarak "Bu alanda kontrast çok düşük" şeklinde asılsız alarmlar (False Positive) verdi. Modelin dili o kadar akademik ve ikna ediciydi ki, ilk bakışta bulgunun doğruluğundan şüphe etmek imkansız görünüyordu.

---

### 3. Bu Yanıltmayı Nasıl Fark Ettim ve Nasıl Çözdüm?
Bu yanıltmayı, ilk prototipte paneldeki "Sayfada Göster (Highlight)" butonuna bastığımda konsolun `null` dönmesi ve tarayıcının hiçbir elemanı bulamaması üzerine fark ettim. *"Kanıtı olmayan bulgu, bulgu sayılmaz"* kuralını tam da bu noktada bir mimari ilkeye dönüştürdüm:

1. **Halüsinasyon Kalkanı (Grounding Verifier):** LLM'in ürettiği her bir CSS seçiciyi, arayüze basılmadan önce canlı DOM üzerinde `document.querySelector(selector)` ile test eden bir doğrulama katmanı (`src/ai/verifier.ts`) yazdım. Sayfada fiziksel olarak karşılığı olmayan hiçbir seçici sisteme kabul edilmedi.
2. **Alibaba PageAgent Tarzı Ön Budama:** Sayfayı LLM'e göndermeden önce `display: none`, `opacity: 0` veya `rect.width <= 0` olan görünmez tüm çöpleri ayıkladım; modele yalnızca sayfada gerçekten nefes alan somut düğümleri verdim.
3. **Deterministik + Yorumsal Hibrit Yapı:** Matematiksel olarak ölçülebilen kontrolleri (kontrast, buton boyutu, alt metin) asla LLM'in insafına bırakmadım; bunları doğrudan JavaScript ile ölçen %100 deterministik bir motor inşa ettim.

**Sonuç:** AI güçlü bir yaratıcı akıl yürütücüdür; ancak bir tanı aracında güvenilirlik, AI'ın her iddiasını kod seviyesinde sorgulayan ve kanıt arayan katı bir doğrulayıcı mimariyle mümkündür.
