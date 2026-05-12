import { translations, LANGUAGES, type LangCode } from './translations.js';

const STORAGE_KEY = 'lumicharge_lang';
const ATTR_KEY = 'data-i18n';
const ATTR_PLACEHOLDER = 'data-i18n-placeholder';

let currentLang: LangCode = detectLang();

function detectLang(): LangCode {
  const stored = localStorage.getItem(STORAGE_KEY) as LangCode | null;
  if (stored && LANGUAGES.some(l => l.code === stored)) return stored;

  const browser = navigator.language.slice(0, 2) as LangCode;
  if (LANGUAGES.some(l => l.code === browser)) return browser;

  return 'es';
}

export function getCurrentLang(): LangCode {
  return currentLang;
}

export function setLang(lang: LangCode): void {
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  applyTranslations();
  applyDirection();
  window.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
}

export function getDir(): 'ltr' | 'rtl' {
  return LANGUAGES.find(l => l.code === currentLang)?.dir || 'ltr';
}

function applyDirection(): void {
  document.documentElement.dir = getDir();
  document.documentElement.lang = currentLang;
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const entry = translations[key];
  if (!entry) return key;

  let text = entry[currentLang] || entry['es'] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

export function applyTranslations(): void {
  // Translate text content
  document.querySelectorAll(`[${ATTR_KEY}]`).forEach(el => {
    const key = el.getAttribute(ATTR_KEY);
    if (!key) return;
    const vars = (el as HTMLElement).dataset.i18nVars ? JSON.parse((el as HTMLElement).dataset.i18nVars || '{}') : undefined;
    el.textContent = t(key, vars);
  });

  // Translate placeholders
  document.querySelectorAll(`[${ATTR_PLACEHOLDER}]`).forEach(el => {
    const key = el.getAttribute(ATTR_PLACEHOLDER);
    if (!key) return;
    (el as HTMLInputElement).placeholder = t(key);
  });

  // Update language switcher button
  const btn = document.querySelector('.lang-btn');
  if (btn) {
    const lang = LANGUAGES.find(l => l.code === currentLang);
    if (lang) btn.textContent = lang.label;
  }
}

export function initI18n(): void {
  applyTranslations();
  applyDirection();
}
