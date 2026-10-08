/**
 * UX Doctor - Kararlı CSS Seçici Üretici (Stable Selector Generator)
 *
 * SPA uygulamaları, yeniden render edilen bileşenler ve responsive
 * tasarımlar için değişmeyen, güçlü ve tekil CSS yolları üretir.
 * Öncelik: id > data-testid > aria-label / name > tag.class:nth-of-type
 */

// Otomatik üretilmiş veya kararsız ID desenleri (React 18 useId, Ember, Chakra, styled-components vb.)
const UNSTABLE_ID_REGEX = /(:r[0-9a-z]+:|^[0-9]|^ember|^chakra-|^__next|^mui-|^mantine-|^radix-)/i;

/**
 * Bir ID'nin kararlı olup olmadığını denetler.
 */
function isStableId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  if (id.length < 2 || id.length > 50) return false;
  if (UNSTABLE_ID_REGEX.test(id)) return false;
  return true;
}

/**
 * Eleman için güvenli CSS escape işlemi.
 */
function safeEscape(str: string): string {
  try {
    return CSS.escape(str);
  } catch {
    return str.replace(/([ #;?%&,.+*~\':"!^$[\]()=>|\/@])/g, '\\$1');
  }
}

/**
 * Kararlı ve benzersiz bir CSS seçici üretir.
 */
export function generateStableSelector(el: Element | null): string {
  if (!el || !(el instanceof Element)) return '';

  const tagName = el.tagName.toLowerCase();

  // 1. Öncelik: Kararlı ID
  if (el.id && isStableId(el.id)) {
    const selector = `#${safeEscape(el.id)}`;
    // Belgede tekil mi kontrol et
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }

  // 2. Öncelik: data-testid / data-test / data-cy
  const testAttrs = ['data-testid', 'data-test', 'data-cy', 'data-qa'];
  for (const attr of testAttrs) {
    const val = el.getAttribute(attr);
    if (val) {
      const selector = `[${attr}="${safeEscape(val)}"]`;
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }
  }

  // 3. Öncelik: aria-label veya form adı (name)
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.length < 50) {
    const selector = `${tagName}[aria-label="${safeEscape(ariaLabel)}"]`;
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }

  const nameAttr = el.getAttribute('name');
  if (nameAttr) {
    const selector = `${tagName}[name="${safeEscape(nameAttr)}"]`;
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }

  // 4. Öncelik: Kararlı Hiyerarşik DOM Yolu (tag.class:nth-of-type)
  const path: string[] = [];
  let current: Element | null = el;

  while (current && current !== document.body && current.nodeType === Node.ELEMENT_NODE) {
    let currentTag = current.tagName.toLowerCase();

    // ID varsa ve kararlıysa kök olarak kullan ve döngüyü bitir
    if (current.id && isStableId(current.id)) {
      path.unshift(`#${safeEscape(current.id)}`);
      break;
    }

    // Kararlı test id varsa kullan ve bitir
    const currentTestId = current.getAttribute('data-testid');
    if (currentTestId) {
      path.unshift(`[data-testid="${safeEscape(currentTestId)}"]`);
      break;
    }

    // Sınıf adlarından kararlı olanları seç (Tailwind ya da dinamik hash sınıflarını sınırla)
    let classSelector = '';
    if (current.className && typeof current.className === 'string') {
      const cleanClasses = current.className
        .split(/\s+/)
        .filter((c) => c && !c.includes(':') && !c.startsWith('css-') && !c.startsWith('sc-') && c.length < 30)
        .slice(0, 2); // En fazla 2 anlamlı sınıf al

      if (cleanClasses.length > 0) {
        classSelector = '.' + cleanClasses.map(safeEscape).join('.');
      }
    }

    // nth-of-type hesapla
    let nth = 1;
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === current.tagName) {
        nth++;
      }
      sibling = sibling.previousElementSibling;
    }

    const step = `${currentTag}${classSelector}${nth > 1 ? `:nth-of-type(${nth})` : ''}`;
    path.unshift(step);

    current = current.parentElement;
    if (path.length >= 5) break; // Selector derinliğini 5 ile sınırla
  }

  return path.join(' > ') || tagName;
}

/**
 * Tıklanan noktanın eleman içi göreceli oranını hesaplar (0 - 1 arası relX, relY).
 * Bu oran, responsive ekranlarda buton içi tıklama haritası için kullanılır.
 */
export function calculateRelativeCoords(
  el: HTMLElement,
  clientX: number,
  clientY: number
): { relX: number; relY: number; width: number; height: number } {
  const rect = el.getBoundingClientRect();
  const width = Math.max(rect.width, 1);
  const height = Math.max(rect.height, 1);

  const rawX = (clientX - rect.left) / width;
  const rawY = (clientY - rect.top) / height;

  const relX = Number(Math.max(0, Math.min(1, rawX)).toFixed(3));
  const relY = Number(Math.max(0, Math.min(1, rawY)).toFixed(3));

  return {
    relX,
    relY,
    width: Math.round(width),
    height: Math.round(height),
  };
}
