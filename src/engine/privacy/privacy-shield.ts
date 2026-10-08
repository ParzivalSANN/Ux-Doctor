/**
 * UX Doctor - Etik ve Gizlilik Kalkanı (Privacy & Ethics Shield)
 *
 * ÖDEV KURALI 5 (ETİK VE GÜVENLİK):
 *  1. Eklenti giriş yapılmış, kişisel veya sağlık verisi içeren sayfalarda
 *     kullanıcıdan açık onay almadan çalışmamalıdır.
 *  2. Form alanlarına girilen değerler, klavye vuruşları ve kişisel veriler
 *     asla toplanmamalı ve LLM'e gönderilmemelidir. Form değerleri maskelenmelidir.
 *  3. API anahtarı repoya commit edilmemeli, yerel depoda tutulmalıdır.
 *  4. Sitelere hiçbir otomatik form gönderimi veya bot tıklaması yapılmamalıdır.
 */

export interface PrivacyCheckResult {
  hasSensitiveInputs: boolean;
  isLoggedInLikely: boolean;
  detectedSensitivities: string[];
  requiresExplicitConsent: boolean;
  maskedElementCount: number;
}

/**
 * Sayfadaki form alanlarını ve DOM yapısını hassas veri açısından tarar
 */
export function auditPagePrivacy(root: Document | HTMLElement = document): PrivacyCheckResult {
  const container = root instanceof Document ? root.body : root;
  if (!container) {
    return {
      hasSensitiveInputs: false,
      isLoggedInLikely: false,
      detectedSensitivities: [],
      requiresExplicitConsent: false,
      maskedElementCount: 0,
    };
  }

  const detectedSensitivities: string[] = [];

  // 1. Parola Giriş Alanları
  const passwordInputs = container.querySelectorAll('input[type="password"]');
  if (passwordInputs.length > 0) {
    detectedSensitivities.push(`${passwordInputs.length} adet parola giriş alanı`);
  }

  // 2. Kredi Kartı / Ödeme Alanları
  const paymentInputs = container.querySelectorAll(
    'input[autocomplete*="cc-"], input[name*="card"], input[name*="cvv"], input[id*="credit"]'
  );
  if (paymentInputs.length > 0) {
    detectedSensitivities.push('Ödeme / Kart bilgi alanı');
  }

  // 3. TC Kimlik / Sağlık / Kişisel Veri İpuçları
  const nationalIdInputs = container.querySelectorAll(
    'input[name*="tckn"], input[name*="kimlik"], input[id*="tckn"], input[id*="kimlik"]'
  );
  if (nationalIdInputs.length > 0) {
    detectedSensitivities.push('Kimlik numarası / Kişisel kayıt alanı');
  }

  // 4. Oturum Açılmış Sayfa İpuçları (Profil, Çıkış Yap, Hesabım butonları)
  const logoutKeywords = ['çıkış yap', 'logout', 'sign out', 'hesabım', 'profilim', 'oturum kapat'];
  const textContent = (container.textContent || '').toLowerCase();
  const hasLogoutClue = logoutKeywords.some((kw) => textContent.includes(kw));

  if (hasLogoutClue && (passwordInputs.length > 0 || nationalIdInputs.length > 0)) {
    detectedSensitivities.push('Oturum açılmış kişisel kullanıcı paneli');
  }

  const hasSensitiveInputs =
    passwordInputs.length > 0 || paymentInputs.length > 0 || nationalIdInputs.length > 0;
  const isLoggedInLikely = hasLogoutClue && hasSensitiveInputs;
  const requiresExplicitConsent = hasSensitiveInputs || isLoggedInLikely;

  return {
    hasSensitiveInputs,
    isLoggedInLikely,
    detectedSensitivities,
    requiresExplicitConsent,
    maskedElementCount: passwordInputs.length + paymentInputs.length + nationalIdInputs.length,
  };
}

/**
 * DOM'daki tüm form giriş değerlerini maskeler.
 * LLM'e veya analize giden hiçbir nesnede gerçek kullanıcı verisi bırakmaz.
 */
export function maskSensitiveValue(value: string | null | undefined): string {
  if (!value) return '';
  return '[MASKED]';
}

/**
 * Metin içindeki e-posta, telefon ve TC Kimlik formatındaki verileri maskeler
 */
export function sanitizeTextForAudit(text: string): string {
  if (!text) return '';

  return text
    // E-posta maskeleme
    .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[EMAIL_MASKED]')
    // Telefon numarası maskeleme (+90 veya 05xx)
    .replace(/(?:\+90|0)?\s*[1-9]\d{2}\s*\d{3}\s*\d{2}\s*\d{2}/g, '[PHONE_MASKED]')
    // 11 Haneli TC Kimlik maskeleme
    .replace(/\b[1-9]\d{10}\b/g, '[TCKN_MASKED]');
}
