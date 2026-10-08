/**
 * UX Doctor - Alibaba PageAgent Esintili DOM Budama ve Etkileşimli Düğüm Çıkarıcı
 *
 * Web sayfalarındaki binlerce anlamsız sarmalayıcı (wrapper) div'i filtreleyerek
 * yalnızca ergonomi ve erişilebilirlik açısından kritik olan:
 *  1. Etkileşimli Öğeleri (Butonlar, Linkler, Form Girişleri, Tıklanabilir Öğeler)
 *  2. Kritik Semantik Metin Bloklarını (h1-h6 başlıkları, paragraflar, etiketler)
 * çıkarır ve sadeleştirilmiş bir DOMNodeSnapshot listesi üretir.
 */

export interface RectBounds {
  top: number;
  left: number;
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface NodeComputedStyles {
  fontSize: string;
  lineHeight: string;
  color: string;
  backgroundColor: string;
  cursor: string;
  borderRadius: string;
  display: string;
}

export interface AriaAttributes {
  role: string | null;
  ariaLabel: string | null;
  ariaLabelledBy: string | null;
  ariaDescribedBy: string | null;
  ariaHidden: string | null;
  ariaExpanded: string | null;
  ariaDisabled: string | null;
  ariaRequired: string | null;
}

export type NodeCategory = 'button' | 'link' | 'input' | 'heading' | 'text' | 'clickable-custom';

export interface ErgonomicDiagnostics {
  isSmallTarget: boolean; // < 44x44px dokunma/tıklama hedefi uyarısı
  hasAccessibleName: boolean;
  missingLabelOrAlt: boolean;
  notes: string[];
}

export interface DOMNodeSnapshot {
  id: string;
  nodeIndex: number;
  tagName: string;
  category: NodeCategory;
  text: string;
  selector: string;
  rect: RectBounds;
  computedStyles: NodeComputedStyles;
  ariaAttributes: AriaAttributes;
  diagnostics: ErgonomicDiagnostics;
}

export interface ExtractionSummary {
  scannedElementsCount: number;
  prunedCount: number;
  interactiveCount: number;
  headingsCount: number;
  textBlocksCount: number;
  timestamp: number;
  url: string;
  title: string;
  nodes: DOMNodeSnapshot[];
}

/**
 * Bir DOM elemanının kullanıcı tarafından görünür olup olmadığını kontrol eder.
 * Opacity, visibility, display ve getBoundingClientRect (genişlik/yükseklik > 0) bakar.
 */
export function isElementVisible(el: HTMLElement): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;

  // Temel etiket eleme (script, style, noscript, template vb.)
  const ignoredTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'IFRAME', 'SVG', 'PATH', 'SOURCE'];
  if (ignoredTags.includes(el.tagName)) return false;

  const style = window.getComputedStyle(el);

  if (style.display === 'none') return false;
  if (style.visibility === 'hidden' || style.visibility === 'collapse') return false;
  if (parseFloat(style.opacity) <= 0.01) return false;

  // Boyut kontrolü
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  // Sayfa dışına aşırı taşan veya gizlenmiş overflow durumları
  if (style.overflow === 'hidden' && (rect.width < 1 || rect.height < 1)) return false;

  return true;
}

/**
 * Bir elemanın benzersiz veya okunabilir CSS seçicisini oluşturur.
 */
export function getUniqueSelector(el: HTMLElement): string {
  if (el.id) {
    // ID sayı ile başlıyorsa CSS.escape gerekebilir
    return `#${CSS.escape(el.id)}`;
  }

  const path: string[] = [];
  let current: HTMLElement | null = el;

  while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector += `#${CSS.escape(current.id)}`;
      path.unshift(selector);
      break;
    } else {
      let sibling = current;
      let nth = 1;
      while (sibling.previousElementSibling) {
        sibling = sibling.previousElementSibling as HTMLElement;
        if (sibling.tagName === current.tagName) {
          nth++;
        }
      }
      if (nth > 1) {
        selector += `:nth-of-type(${nth})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
    if (path.length >= 4) break; // Çok derin selectorleri buda
  }

  return path.join(' > ') || el.tagName.toLowerCase();
}

/**
 * Elemanın erişilebilir ismini (Accessible Name) tespit eder.
 */
function getAccessibleName(el: HTMLElement): string {
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

  const ariaLabelledBy = el.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelledEl = document.getElementById(ariaLabelledBy);
    if (labelledEl && labelledEl.textContent) return labelledEl.textContent.trim();
  }

  if (el instanceof HTMLInputElement) {
    if (el.placeholder) return el.placeholder.trim();
    if (el.value) return el.value.trim();
    // İlişkili label ara
    if (el.id) {
      const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (label && label.textContent) return label.textContent.trim();
    }
  }

  if (el instanceof HTMLImageElement && el.alt) {
    return el.alt.trim();
  }

  const title = el.getAttribute('title');
  if (title) return title.trim();

  return (el.textContent || '').trim();
}

/**
 * Elemanın etkileşimli olup olmadığını ve kategorisini sınıflandırır.
 */
function classifyElement(
  el: HTMLElement,
  style: CSSStyleDeclaration
): { isInteractive: boolean; category: NodeCategory | null } {
  const tagName = el.tagName.toLowerCase();
  const role = el.getAttribute('role');

  // 1. Butonlar
  if (tagName === 'button' || role === 'button') {
    return { isInteractive: true, category: 'button' };
  }

  // 2. Linkler
  if (tagName === 'a' && (el.hasAttribute('href') || role === 'link')) {
    return { isInteractive: true, category: 'link' };
  }

  // 3. Form Kontrolleri
  if (tagName === 'input') {
    const type = (el as HTMLInputElement).type || 'text';
    if (['button', 'submit', 'reset'].includes(type)) {
      return { isInteractive: true, category: 'button' };
    }
    if (type !== 'hidden') {
      return { isInteractive: true, category: 'input' };
    }
  }
  if (tagName === 'textarea' || tagName === 'select') {
    return { isInteractive: true, category: 'input' };
  }

  // 4. Özel Tıklanabilir Öğeler (cursor:pointer, onclick, tabindex)
  const isClickableCursor = style.cursor === 'pointer';
  const hasClickHandler = el.hasAttribute('onclick') || el.hasAttribute('@click') || el.hasAttribute('v-on:click');
  const hasTabIndex = el.hasAttribute('tabindex') && el.getAttribute('tabindex') !== '-1';
  const customInteractiveRoles = ['checkbox', 'radio', 'tab', 'menuitem', 'switch', 'combobox', 'option'];

  if (role && customInteractiveRoles.includes(role)) {
    return { isInteractive: true, category: 'clickable-custom' };
  }

  if (isClickableCursor || hasClickHandler || (hasTabIndex && tagName !== 'div' && tagName !== 'span')) {
    return { isInteractive: true, category: 'clickable-custom' };
  }

  // 5. Kritik Başlıklar
  if (/^h[1-6]$/.test(tagName)) {
    return { isInteractive: false, category: 'heading' };
  }

  // 6. Anlamlı Metin Blokları (p, label)
  if (tagName === 'p' || tagName === 'label') {
    return { isInteractive: false, category: 'text' };
  }

  return { isInteractive: false, category: null };
}

/**
 * Alibaba PageAgent Tarzı Düğüm Budama ve Çıkarım Fonksiyonu
 *
 * Sayfadaki gereksiz layout div'lerini eler, yalnızca etkileşimli öğeleri ve
 * kritik metinleri toplayarak sade bir DOMNodeSnapshot listesi döndürür.
 */
export function extractInteractiveNodes(root: Document | HTMLElement = document): ExtractionSummary {
  const container = root instanceof Document ? root.body : root;
  const allElements = container ? Array.from(container.querySelectorAll('*')) : [];
  
  let scannedCount = 0;
  let prunedCount = 0;
  let interactiveCount = 0;
  let headingsCount = 0;
  let textBlocksCount = 0;

  const snapshots: DOMNodeSnapshot[] = [];

  for (let i = 0; i < allElements.length; i++) {
    const rawEl = allElements[i];
    if (!(rawEl instanceof HTMLElement)) continue;

    scannedCount++;

    // 1. Görünürlük Kontrolü (Görünmeyenler budanır)
    if (!isElementVisible(rawEl)) {
      prunedCount++;
      continue;
    }

    const style = window.getComputedStyle(rawEl);
    const classification = classifyElement(rawEl, style);

    // Kategoriye girmeyen genel layout div'leri ve sarmalayıcılar budanır
    if (!classification.category) {
      prunedCount++;
      continue;
    }

    const textContent = (rawEl.textContent || '').replace(/\s+/g, ' ').trim();

    // Boş başlık veya p etiketlerini buda
    if ((classification.category === 'heading' || classification.category === 'text') && !textContent) {
      prunedCount++;
      continue;
    }

    // Eğer bir butonun veya linkin içindeki bir p/label ise, ebeveyn zaten ele alacaktır -> buda
    if ((classification.category === 'text' || classification.category === 'heading') && rawEl.closest('button, a')) {
      prunedCount++;
      continue;
    }

    const rect = rawEl.getBoundingClientRect();
    const accessibleName = getAccessibleName(rawEl);

    // Ergonomi Teşhisleri
    const notes: string[] = [];
    const isInteractive = classification.isInteractive;
    
    // Küçük Dokunma / Tıklama Hedefi Kontrolü (WCAG 2.5.5 / 2.5.8 Ergonomi Kontrolü: 44x44px)
    const isSmallTarget = isInteractive && (rect.width < 44 || rect.height < 44);
    if (isSmallTarget) {
      notes.push(`Küçük dokunma alanı: ${Math.round(rect.width)}x${Math.round(rect.height)}px (Önerilen: min 44x44px)`);
    }

    // Eksik Erişilebilir İsim (Missing Label / Alt / Text)
    const hasAccessibleName = accessibleName.length > 0;
    const missingLabelOrAlt = isInteractive && !hasAccessibleName;
    if (missingLabelOrAlt) {
      notes.push('Erişilebilir etiket (aria-label, alt veya metin) eksik');
    }

    // Sayaç güncelleme
    if (isInteractive) interactiveCount++;
    if (classification.category === 'heading') headingsCount++;
    if (classification.category === 'text') textBlocksCount++;

    const snapshot: DOMNodeSnapshot = {
      id: rawEl.id || `ux-doc-${snapshots.length + 1}`,
      nodeIndex: snapshots.length + 1,
      tagName: rawEl.tagName.toLowerCase(),
      category: classification.category,
      text: textContent.length > 120 ? textContent.slice(0, 117) + '...' : textContent,
      selector: getUniqueSelector(rawEl),
      rect: {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        x: Math.round(rect.x),
        y: Math.round(rect.y),
      },
      computedStyles: {
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        color: style.color,
        backgroundColor: style.backgroundColor,
        cursor: style.cursor,
        borderRadius: style.borderRadius,
        display: style.display,
      },
      ariaAttributes: {
        role: rawEl.getAttribute('role'),
        ariaLabel: rawEl.getAttribute('aria-label'),
        ariaLabelledBy: rawEl.getAttribute('aria-labelledby'),
        ariaDescribedBy: rawEl.getAttribute('aria-describedby'),
        ariaHidden: rawEl.getAttribute('aria-hidden'),
        ariaExpanded: rawEl.getAttribute('aria-expanded'),
        ariaDisabled: rawEl.getAttribute('aria-disabled'),
        ariaRequired: rawEl.getAttribute('aria-required'),
      },
      diagnostics: {
        isSmallTarget,
        hasAccessibleName,
        missingLabelOrAlt,
        notes,
      },
    };

    snapshots.push(snapshot);
  }

  const pageTitle = typeof document !== 'undefined' ? document.title : 'Sayfa';
  const pageUrl = typeof window !== 'undefined' && window.location ? window.location.href : '';

  return {
    scannedElementsCount: scannedCount,
    prunedCount,
    interactiveCount,
    headingsCount,
    textBlocksCount,
    timestamp: Date.now(),
    url: pageUrl,
    title: pageTitle,
    nodes: snapshots,
  };
}
