/**
 * UX Doctor - Gizlilik ve Maskeleme Modülü (Privacy First)
 *
 * Kullanıcı etkileşimi sırasında şifre, kredi kartı, telefon, e-posta
 * ve hassas metinlerin asla ham biçimde kaydedilmemesini sağlar.
 */

// Hassas input selector listesi
const SENSITIVE_SELECTORS = [
  'input[type="password"]',
  'input[type="email"]',
  'input[type="tel"]',
  'input[autocomplete*="cc-"]',
  'input[autocomplete*="password"]',
  'input[name*="card" i]',
  'input[name*="cc" i]',
  'input[name*="cvv" i]',
  'input[name*="cvc" i]',
  'input[name*="pass" i]',
  'input[name*="phone" i]',
  'input[name*="email" i]',
  'input[name*="ssn" i]',
  'input[name*="tckn" i]',
  'input[name*="iban" i]',
  '[data-ux-mask]',
  '[data-ux-mask] *',
];

// Regex tabanlı kredi kartı, telefon ve e-posta deseni
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const CREDIT_CARD_REGEX = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;
const PHONE_REGEX = /(?:\+?\d{1,3}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}/g;
const IBAN_REGEX = /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/gi;

/**
 * Bir DOM elemanının gizlenmesi (maskelenmesi) gereken hassas bir öğe olup olmadığını denetler.
 */
export function isSensitiveElement(el: Element | null): boolean {
  if (!el || !(el instanceof Element)) return false;

  // 1. data-ux-mask özniteliği var mı (veya kapsayıcısında var mı)
  if (el.closest('[data-ux-mask]')) {
    return true;
  }

  // 2. Hassas selector eşleşmesi kontrolü
  for (const selector of SENSITIVE_SELECTORS) {
    try {
      if (el.matches(selector)) return true;
    } catch {
      // Geçersiz selector olursa atla
    }
  }

  // 3. Form alanları için placeholder veya label analizi
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const placeholder = (el.placeholder || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const name = (el.name || '').toLowerCase();
    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();

    const sensitiveWords = ['şifre', 'password', 'kredi', 'kart', 'cvv', 'cvc', 'telefon', 'tckn', 'iban', 'email', 'e-posta'];
    if (sensitiveWords.some((word) => placeholder.includes(word) || id.includes(word) || name.includes(word) || ariaLabel.includes(word))) {
      return true;
    }
  }

  return false;
}

/**
 * Metin içeriğindeki e-posta, kredi kartı, telefon ve IBAN gibi hassas verileri maskeler.
 */
export function maskSensitiveText(text: string): string {
  if (!text) return '';

  return text
    .replace(CREDIT_CARD_REGEX, '•••• •••• •••• ••••')
    .replace(IBAN_REGEX, '•••• •••• •••• •••• •••• ••')
    .replace(EMAIL_REGEX, '•••••@••••.•••')
    .replace(PHONE_REGEX, '•••• ••• •• ••');
}

/**
 * Bir elemanın içeriğini veya değerini güvenli şekilde döndürür.
 * Hassas elemanlar için asla ham değer dönmez, '••••••' döndürür.
 */
export function sanitizeElementValue(el: HTMLElement | null): string {
  if (!el) return '';

  if (isSensitiveElement(el)) {
    return '••••••';
  }

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return maskSensitiveText(el.value || '');
  }

  const text = (el.textContent || '').trim();
  return maskSensitiveText(text);
}

/**
 * rrweb kayıt konfigürasyonu için maskeleme fonksiyonu.
 */
export function rrwebMaskInputOptions() {
  return {
    maskAllInputs: false,
    maskInputOptions: {
      password: true,
      email: true,
      tel: true,
    },
    maskInputFn: (text: string, element: HTMLElement | null) => {
      if (element && isSensitiveElement(element)) {
        return '••••••';
      }
      return maskSensitiveText(text);
    },
    maskTextFn: (text: string, element: HTMLElement | null) => {
      if (element && isSensitiveElement(element)) {
        return '••••••';
      }
      return maskSensitiveText(text);
    },
  };
}
