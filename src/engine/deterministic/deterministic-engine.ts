/**
 * UX Doctor - Deterministik Analiz Katmanı (Deterministic Engine)
 *
 * Kod ile kesin olarak ölçülebilen, doğrulanabilir ve nesnel kontroller:
 *  1. WCAG 1.4.3: Renk Kontrast Oranı (Hesaplanan stiller üzerinden matematiksel parlaklık)
 *  2. WCAG 1.1.1: Eksik Görsel Alternatif Metinleri (img:not([alt]))
 *  3. WCAG 3.3.2 / 1.3.1: Etiketsiz Form Kontrolleri (label, aria-label, aria-labelledby)
 *  4. WCAG 2.5.8 / 2.5.5: Dokunma/Tıklama Hedefi Boyutu (24x24px altı ihlal, 44x44px altı uyarı)
 *  5. WCAG 3.1.1: Sayfa Dili Tanımı (html[lang])
 *  6. WCAG 1.3.1: Başlık Hiyerarşisi (H1 eksikliği, atlanan başlık seviyeleri)
 *  7. WCAG 4.1.2: Boş / İsimsiz Tıklanabilir Öğeler (İkon butonlar vb.)
 */

export type SeverityLevel = 'Kritik' | 'Yüksek' | 'Orta' | 'Düşük';

export interface DeterministicFinding {
  id: string;
  ruleId: string; // örn: "WCAG 1.4.3", "WCAG 1.1.1"
  category: 'Kontrast' | 'Görsel Erişilebilirliği' | 'Form Etiketleri' | 'Dokunma Hedefi' | 'Sayfa Dili' | 'Başlık Hiyerarşisi' | 'Erişilebilir İsim';
  title: string;
  severity: SeverityLevel;
  selector: string;
  elementSnippet: string;
  description: string;
  recommendation: string;
  rect?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  calculatedValue?: string | number;
  expectedValue?: string | number;
}

export interface DeterministicCategoryScore {
  name: string;
  categoryKey: string;
  score: number; // 0 - 100
  weight: number; // 0 - 1
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export interface DeterministicAuditResult {
  score: number; // 0 - 100 genel deterministik skor
  evaluatedAt: number;
  totalFindingsCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  findings: DeterministicFinding[];
  categoryScores: Record<string, DeterministicCategoryScore>;
  pageMetadata: {
    title: string;
    url: string;
    lang: string | null;
    totalElementsScanned: number;
  };
}

// Renk Luminance ve Kontrast Hesaplama Yardımcıları
interface RGB {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColorRgba(colorStr: string): RGB | null {
  if (!colorStr || colorStr === 'transparent' || colorStr === 'inherit') return null;

  // rgb(r, g, b) veya rgba(r, g, b, a)
  const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1], 10),
      g: parseInt(rgbaMatch[2], 10),
      b: parseInt(rgbaMatch[3], 10),
      a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1.0,
    };
  }

  // Hex formatı (#ffffff veya #fff)
  if (colorStr.startsWith('#')) {
    let hex = colorStr.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
        a: 1.0,
      };
    }
  }

  return null;
}

// sRGB luminance formülü (W3C WCAG 2.2 spesifikasyonu)
function getRelativeLuminance(rgb: RGB): number {
  const [rs, gs, bs] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((c) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function calculateContrastRatio(foreground: RGB, background: RGB): number {
  const l1 = getRelativeLuminance(foreground);
  const l2 = getRelativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

// Ebeveyn ağacında yukarı çıkarak gerçek görünür arka plan rengini bulur
function getEffectiveBackgroundColor(el: HTMLElement): RGB {
  let current: HTMLElement | null = el;
  while (current && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    const parsed = parseColorRgba(style.backgroundColor);
    if (parsed && parsed.a > 0.1) {
      return parsed;
    }
    current = current.parentElement;
  }
  // Varsayılan beyaz arka plan
  return { r: 255, g: 255, b: 255, a: 1.0 };
}

// Güvenli CSS Seçici Üretici
export function buildSimpleSelector(el: HTMLElement): string {
  if (el.id) {
    return `#${CSS.escape(el.id)}`;
  }
  const tag = el.tagName.toLowerCase();
  if (el.className && typeof el.className === 'string') {
    const firstClass = el.className.split(/\s+/).filter(Boolean)[0];
    if (firstClass && !firstClass.includes(':') && !firstClass.includes('/')) {
      const parent = el.parentElement;
      if (parent && parent.tagName !== 'BODY') {
        return `${parent.tagName.toLowerCase()} > ${tag}.${CSS.escape(firstClass)}`;
      }
      return `${tag}.${CSS.escape(firstClass)}`;
    }
  }
  return tag;
}

function getElementSnippet(el: HTMLElement): string {
  const clone = el.cloneNode(false) as HTMLElement;
  const outer = clone.outerHTML || '';
  return outer.length > 140 ? outer.slice(0, 137) + '...' : outer;
}

/**
 * Ana Deterministik Denetim Fonksiyonu
 */
export function runDeterministicAudit(root: Document | HTMLElement = document): DeterministicAuditResult {
  const doc = root instanceof Document ? root : root.ownerDocument || document;
  const container = root instanceof Document ? root.body : root;
  const findings: DeterministicFinding[] = [];

  let scannedCount = 0;

  // 1. KONTROL: Sayfa Dili Tanımı (WCAG 3.1.1 - Language of Page)
  const htmlEl = doc.documentElement;
  const langAttr = htmlEl.getAttribute('lang');
  if (!langAttr || !langAttr.trim()) {
    findings.push({
      id: 'wcag-3-1-1-lang',
      ruleId: 'WCAG 3.1.1',
      category: 'Sayfa Dili',
      title: 'Sayfa Dili (lang) Tanımlanmamış',
      severity: 'Yüksek',
      selector: 'html',
      elementSnippet: '<html ...>',
      description: '<html> etiketinde "lang" özniteliği eksik. Ekran okuyucular doğru telaffuz ve sentezleme motorunu seçemez.',
      recommendation: '<html lang="tr"> (veya ilgili dil kodu) özniteliğini ekleyin.',
      expectedValue: 'lang="tr"',
      calculatedValue: 'Eksik veya Boş',
    });
  }

  // 2. KONTROL: Başlık Hiyerarşisi (WCAG 1.3.1 - Heading Structure)
  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6')) as HTMLElement[];
  const h1Elements = headings.filter((h) => h.tagName.toLowerCase() === 'h1');

  if (h1Elements.length === 0) {
    findings.push({
      id: 'wcag-1-3-1-no-h1',
      ruleId: 'WCAG 1.3.1',
      category: 'Başlık Hiyerarşisi',
      title: 'Sayfada Birincil Başlık (H1) Eksik',
      severity: 'Orta',
      selector: 'body',
      elementSnippet: '<body>...</body>',
      description: 'Sayfada konuyu özetleyen en az bir adet <h1> başlığı bulunmalıdır. Ekran okuyucu kullanıcıları ana içeriğe başlık kısayoluyla atlar.',
      recommendation: 'Sayfanın ana amacını açıklayan net bir <h1> başlığı ekleyin.',
      expectedValue: '1 adet <h1>',
      calculatedValue: '0 adet',
    });
  } else if (h1Elements.length > 2) {
    findings.push({
      id: 'wcag-1-3-1-multi-h1',
      ruleId: 'WCAG 1.3.1',
      category: 'Başlık Hiyerarşisi',
      title: 'Aşırı Sayıda H1 Başlığı Mevcut',
      severity: 'Düşük',
      selector: buildSimpleSelector(h1Elements[1]),
      elementSnippet: getElementSnippet(h1Elements[1]),
      description: `Sayfada ${h1Elements.length} adet <h1> başlığı var. Semantik netlik için sayfa başına tek bir ana <h1> önerilir.`,
      recommendation: 'Alt bölümleri <h2> veya <h3> seviyesine dönüştürün.',
      expectedValue: '1 adet <h1>',
      calculatedValue: `${h1Elements.length} adet`,
    });
  }

  // Başlık seviyesi atlamaları (ör. H1 -> H3)
  let lastHeadingLevel = 1;
  headings.forEach((h, idx) => {
    const level = parseInt(h.tagName.substring(1), 10);
    if (idx > 0 && level > lastHeadingLevel + 1) {
      findings.push({
        id: `wcag-1-3-1-heading-skip-${idx}`,
        ruleId: 'WCAG 1.3.1',
        category: 'Başlık Hiyerarşisi',
        title: `Başlık Seviyesi Atlandı (H${lastHeadingLevel} ➔ H${level})`,
        severity: 'Orta',
        selector: buildSimpleSelector(h),
        elementSnippet: getElementSnippet(h),
        description: `<h${lastHeadingLevel}> başlığından doğrudan <h${level}> başlığına atlandı. Ekran okuyucu kullanıcıları için mantıksal yapı bozulur.`,
        recommendation: `Aradaki <h${lastHeadingLevel + 1}> seviyesini kullanın veya başlık düzeyini düzeltin.`,
        expectedValue: `h${lastHeadingLevel + 1}`,
        calculatedValue: `h${level}`,
      });
    }
    lastHeadingLevel = level;
  });

  // 3. KONTROL: Görsellerin Alternatif Metinleri (WCAG 1.1.1 - Non-text Content)
  const images = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
  images.forEach((img, idx) => {
    scannedCount++;
    const hasAlt = img.hasAttribute('alt');
    const altText = img.getAttribute('alt') || '';
    const isInsideLink = Boolean(img.closest('a'));

    if (!hasAlt) {
      findings.push({
        id: `wcag-1-1-1-missing-alt-${idx}`,
        ruleId: 'WCAG 1.1.1',
        category: 'Görsel Erişilebilirliği',
        title: 'Görselde Alternatif Metin (alt) Eksik',
        severity: isInsideLink ? 'Kritik' : 'Yüksek',
        selector: buildSimpleSelector(img),
        elementSnippet: getElementSnippet(img),
        description: isInsideLink
          ? 'Link içerisindeki görselde alt metin yok. Ekran okuyucu link hedefini veya görseli açıklayamaz.'
          : 'Görselde alt özniteliği bulunmuyor. Görme engelli kullanıcılar görselin içeriğini öğrenemez.',
        recommendation: isInsideLink
          ? 'Görsele tıklama amacını anlatan net bir alt="..." ekleyin.'
          : 'Görsel bilgilendiriciyse açıklayıcı alt metin, yalnızca süsleyiciyse alt="" ekleyin.',
        expectedValue: 'alt="Açıklayıcı metin"',
        calculatedValue: 'Öznitelik yok',
      });
    } else if (hasAlt && isInsideLink && altText.trim() === '') {
      // Link içi boş alt metin
      findings.push({
        id: `wcag-1-1-1-empty-link-img-${idx}`,
        ruleId: 'WCAG 1.1.1',
        category: 'Görsel Erişilebilirliği',
        title: 'Tıklanabilir Link Görselinde Boş Alt Metin',
        severity: 'Yüksek',
        selector: buildSimpleSelector(img),
        elementSnippet: getElementSnippet(img),
        description: 'Link görevi gören bir görsel alt="" olarak işaretlenmiş, ek olarak metin yoksa link sessiz kalır.',
        recommendation: 'Linkin nereye gittiğini belirten alt metin ekleyin.',
        expectedValue: 'alt="Bağlantı açıklaması"',
        calculatedValue: 'alt=""',
      });
    }
  });

  // 4. KONTROL: Form Alanları Etiket Kontrolü (WCAG 3.3.2 / 1.3.1 - Info and Relationships)
  const formInputs = Array.from(
    container.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea')
  ) as HTMLElement[];

  formInputs.forEach((inputEl, idx) => {
    scannedCount++;
    const id = inputEl.getAttribute('id');
    const ariaLabel = inputEl.getAttribute('aria-label');
    const ariaLabelledby = inputEl.getAttribute('aria-labelledby');
    const titleAttr = inputEl.getAttribute('title');
    const parentLabel = inputEl.closest('label');

    let hasAssociatedLabel = false;

    if (ariaLabel && ariaLabel.trim()) hasAssociatedLabel = true;
    if (ariaLabelledby && doc.getElementById(ariaLabelledby)) hasAssociatedLabel = true;
    if (parentLabel && (parentLabel.textContent || '').trim()) hasAssociatedLabel = true;
    if (id && doc.querySelector(`label[for="${CSS.escape(id)}"]`)) hasAssociatedLabel = true;
    if (titleAttr && titleAttr.trim()) hasAssociatedLabel = true;

    if (!hasAssociatedLabel) {
      const inputType = inputEl.getAttribute('type') || inputEl.tagName.toLowerCase();
      findings.push({
        id: `wcag-3-3-2-missing-label-${idx}`,
        ruleId: 'WCAG 3.3.2',
        category: 'Form Etiketleri',
        title: `Etiketsiz Form Kontrolü (${inputType})`,
        severity: ['password', 'email', 'tel'].includes(inputType) ? 'Kritik' : 'Yüksek',
        selector: buildSimpleSelector(inputEl),
        elementSnippet: getElementSnippet(inputEl),
        description: 'Giriş alanına bağlı bir <label>, aria-label veya aria-labelledby bulunmuyor. Ekran okuyucu kullanıcıları alanın amacını anlayamaz.',
        recommendation: `<label for="${id || 'input-id'}"> etiketi bağlayın veya aria-label="${inputType}" tanımlayın.`,
        expectedValue: '<label> veya aria-label',
        calculatedValue: 'Bağlantılı etiket yok',
      });
    }
  });

  // 5. KONTROL: Dokunma/Tıklama Hedefi Boyutu (WCAG 2.5.8 - Target Size Minimum 24x24px & WCAG 2.5.5 - 44x44px)
  const interactiveElements = Array.from(
    container.querySelectorAll('button, a[href], [role="button"], input[type="button"], input[type="submit"]')
  ) as HTMLElement[];

  interactiveElements.forEach((btn, idx) => {
    scannedCount++;
    const style = window.getComputedStyle(btn);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) <= 0.05) return;

    const rect = btn.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const width = Math.round(rect.width);
    const height = Math.round(rect.height);

    // WCAG 2.5.8 AA Kriteri: Minimum 24x24 px
    if (width < 24 || height < 24) {
      findings.push({
        id: `wcag-2-5-8-target-size-${idx}`,
        ruleId: 'WCAG 2.5.8',
        category: 'Dokunma Hedefi',
        title: `Yetersiz Dokunma Hedefi (${width}x${height}px < 24x24px)`,
        severity: 'Yüksek',
        selector: buildSimpleSelector(btn),
        elementSnippet: getElementSnippet(btn),
        description: `Tıklanabilir öğe ${width}x${height}px boyutunda. WCAG 2.2 AA standardına göre dokunma hedefleri en az 24x24px olmalıdır.`,
        recommendation: 'Padding veya min-width / min-height değerlerini artırarak tıklama alanını genişletin.',
        rect: { top: Math.round(rect.top), left: Math.round(rect.left), width, height },
        expectedValue: 'Min 24x24 px',
        calculatedValue: `${width}x${height} px`,
      });
    } else if (width < 44 || height < 44) {
      // WCAG 2.5.5 AAA / Mobil Ergonomi Önerisi: 44x44px
      findings.push({
        id: `wcag-2-5-5-target-size-opt-${idx}`,
        ruleId: 'WCAG 2.5.5',
        category: 'Dokunma Hedefi',
        title: `Küçük Tıklama Alanı (${width}x${height}px < 44x44px)`,
        severity: 'Orta',
        selector: buildSimpleSelector(btn),
        elementSnippet: getElementSnippet(btn),
        description: `Öğe ${width}x${height}px boyutunda. Mobil ve dokunmatik cihazlarda el titremesi olan kullanıcılar için 44x44px önerilir.`,
        recommendation: 'Tıklama alanını CSS padding ile 44x44px seviyesine yaklaştırın.',
        rect: { top: Math.round(rect.top), left: Math.round(rect.left), width, height },
        expectedValue: 'Önerilen 44x44 px',
        calculatedValue: `${width}x${height} px`,
      });
    }
  });

  // 6. KONTROL: Metin Renk Kontrast Oranı (WCAG 1.4.3 - Contrast Minimum 4.5:1)
  const textNodes = Array.from(container.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, button, label')) as HTMLElement[];
  const checkedContrastSelectors = new Set<string>();

  textNodes.forEach((node, idx) => {
    scannedCount++;
    const text = (node.textContent || '').trim();
    if (!text || text.length < 2) return;

    // Yalnızca doğrudan metin taşıyan yaprak veya anlamlı düğümleri incele
    if (node.children.length > 3) return;

    const style = window.getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') return;

    const fgColor = parseColorRgba(style.color);
    if (!fgColor || fgColor.a < 0.2) return;

    const bgColor = getEffectiveBackgroundColor(node);
    const contrastRatio = calculateContrastRatio(fgColor, bgColor);

    const fontSize = parseFloat(style.fontSize) || 16;
    const isBold = parseInt(style.fontWeight, 10) >= 700 || style.fontWeight === 'bold';
    const isLargeText = fontSize >= 24 || (fontSize >= 18.5 && isBold);

    const minRatio = isLargeText ? 3.0 : 4.5;

    if (contrastRatio < minRatio) {
      const selector = buildSimpleSelector(node);
      if (checkedContrastSelectors.has(selector)) return;
      checkedContrastSelectors.add(selector);

      const rect = node.getBoundingClientRect();

      findings.push({
        id: `wcag-1-4-3-contrast-${idx}`,
        ruleId: 'WCAG 1.4.3',
        category: 'Kontrast',
        title: `Düşük Kontrast Oranı (${contrastRatio}:1)`,
        severity: contrastRatio < 2.5 ? 'Kritik' : contrastRatio < 3.5 ? 'Yüksek' : 'Orta',
        selector,
        elementSnippet: getElementSnippet(node),
        description: `Metin rengi ile arka plan arasındaki kontrast ${contrastRatio}:1 olarak ölçüldü. Standart gereksinimi: minimum ${minRatio}:1.`,
        recommendation: `Metin rengini veya arka planı koyulaştırarak/açıklaştırarak kontrastı en az ${minRatio}:1 seviyesine getirin.`,
        rect: {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        expectedValue: `>= ${minRatio}:1`,
        calculatedValue: `${contrastRatio}:1`,
      });
    }
  });

  // 7. KONTROL: Boş / İsimsiz Tıklanabilir Öğeler (WCAG 4.1.2 - Name, Role, Value)
  interactiveElements.forEach((el, idx) => {
    const text = (el.textContent || '').trim();
    const ariaLabel = el.getAttribute('aria-label');
    const ariaLabelledby = el.getAttribute('aria-labelledby');
    const title = el.getAttribute('title');

    const hasName = Boolean(text || (ariaLabel && ariaLabel.trim()) || ariaLabelledby || (title && title.trim()));
    if (!hasName) {
      findings.push({
        id: `wcag-4-1-2-empty-btn-${idx}`,
        ruleId: 'WCAG 4.1.2',
        category: 'Erişilebilir İsim',
        title: 'İsimsiz Tıklanabilir Öğe (Erişilebilir İsim Eksik)',
        severity: 'Kritik',
        selector: buildSimpleSelector(el),
        elementSnippet: getElementSnippet(el),
        description: 'Tıklanabilir buton veya linkin içinde metin veya aria-label yok (Muhtemelen yalnızca ikon). Ekran okuyucu bu öğeyi sessiz geçer.',
        recommendation: 'Butona aria-label="..." veya gizli <span class="sr-only"> açıklama metni ekleyin.',
        expectedValue: 'aria-label veya metin',
        calculatedValue: 'Boş / İsimsiz',
      });
    }
  });

  // Şiddet Sayımı
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  findings.forEach((f) => {
    if (f.severity === 'Kritik') criticalCount++;
    else if (f.severity === 'Yüksek') highCount++;
    else if (f.severity === 'Orta') mediumCount++;
    else if (f.severity === 'Düşük') lowCount++;
  });

  // Kategori Bazlı Ceza ve Skorlama Hesaplaması
  const categoryKeys: Array<DeterministicFinding['category']> = [
    'Kontrast',
    'Görsel Erişilebilirliği',
    'Form Etiketleri',
    'Dokunma Hedefi',
    'Sayfa Dili',
    'Başlık Hiyerarşisi',
    'Erişilebilir İsim',
  ];

  const categoryScores: Record<string, DeterministicCategoryScore> = {};

  categoryKeys.forEach((cat) => {
    const catFindings = findings.filter((f) => f.category === cat);
    let catPenalty = 0;
    let catCrit = 0;
    let catHigh = 0;
    let catMed = 0;
    let catLow = 0;

    catFindings.forEach((f) => {
      if (f.severity === 'Kritik') {
        catPenalty += 20;
        catCrit++;
      } else if (f.severity === 'Yüksek') {
        catPenalty += 12;
        catHigh++;
      } else if (f.severity === 'Orta') {
        catPenalty += 6;
        catMed++;
      } else {
        catPenalty += 3;
        catLow++;
      }
    });

    const catScore = Math.max(0, Math.min(100, Math.round(100 - catPenalty)));
    categoryScores[cat] = {
      name: cat,
      categoryKey: cat,
      score: catScore,
      weight: 1.0 / categoryKeys.length,
      criticalCount: catCrit,
      highCount: catHigh,
      mediumCount: catMed,
      lowCount: catLow,
    };
  });

  // Deterministik Genel Skor Formülü:
  // Ceza Puanı Modeli:
  // - Kritik İhlal Başı: -15 puan
  // - Yüksek İhlal Başı: -8 puan
  // - Orta İhlal Başı: -4 puan
  // - Düşük İhlal Başı: -2 puan
  const totalPenalty = criticalCount * 15 + highCount * 8 + mediumCount * 4 + lowCount * 2;
  const overallScore = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));

  return {
    score: overallScore,
    evaluatedAt: Date.now(),
    totalFindingsCount: findings.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    findings,
    categoryScores,
    pageMetadata: {
      title: typeof document !== 'undefined' ? document.title : '',
      url: typeof window !== 'undefined' && window.location ? window.location.href : '',
      lang: langAttr,
      totalElementsScanned: scannedCount,
    },
  };
}
