export const SUPPORTED_LOCALES = ['en', 'de', 'fr', 'pl', 'uk'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: SupportedLocale = 'en'

interface Translations {
  iAmHuman: string
  verificationFailed: string
  verifying: string
  ariaCheckbox: string
  ariaVerifying: string
  ariaSuccess: string
  ariaFailed: string
  srLoading: string
  srSuccess: string
  srFailed: string
  ariaProgress: string
}

export const translations: Record<SupportedLocale, Translations> = {
  en: {
    iAmHuman: 'I am human',
    verificationFailed: 'Verification failed, click to retry',
    verifying: 'Verifying...',
    ariaCheckbox: 'Human verification checkbox. Press Enter or Space to verify you are human.',
    ariaVerifying: 'Verifying that you are human. Please wait.',
    ariaSuccess: 'Verification successful. You have been verified as human.',
    ariaFailed: 'Verification failed. Press Enter or Space to try again.',
    srLoading: 'Verification in progress. Please wait.',
    srSuccess: 'Verification successful!',
    srFailed: 'Verification failed. Please try again.',
    ariaProgress: 'Verification progress',
  },
  de: {
    iAmHuman: 'Ich bin ein Mensch',
    verificationFailed: 'Verifizierung fehlgeschlagen, klicken Sie zum Wiederholen',
    verifying: 'Verifizierung...',
    ariaCheckbox: 'Kontrollkästchen zur menschlichen Verifizierung. Drücken Sie Enter oder Leertaste, um zu bestätigen, dass Sie ein Mensch sind.',
    ariaVerifying: 'Verifizierung, dass Sie ein Mensch sind. Bitte warten.',
    ariaSuccess: 'Verifizierung erfolgreich. Sie wurden als Mensch verifiziert.',
    ariaFailed: 'Verifizierung fehlgeschlagen. Drücken Sie Enter oder Leertaste, um es erneut zu versuchen.',
    srLoading: 'Verifizierung läuft. Bitte warten.',
    srSuccess: 'Verifizierung erfolgreich!',
    srFailed: 'Verifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.',
    ariaProgress: 'Verifizierungsfortschritt',
  },
  fr: {
    iAmHuman: 'Je suis humain',
    verificationFailed: 'Vérification échouée, cliquez pour réessayer',
    verifying: 'Vérification...',
    ariaCheckbox: 'Case de vérification humaine. Appuyez sur Entrée ou Espace pour confirmer que vous êtes humain.',
    ariaVerifying: 'Vérification en cours. Veuillez patienter.',
    ariaSuccess: 'Vérification réussie. Vous avez été vérifié comme humain.',
    ariaFailed: 'Vérification échouée. Appuyez sur Entrée ou Espace pour réessayer.',
    srLoading: 'Vérification en cours. Veuillez patienter.',
    srSuccess: 'Vérification réussie !',
    srFailed: 'Vérification échouée. Veuillez réessayer.',
    ariaProgress: 'Progression de la vérification',
  },
  pl: {
    iAmHuman: 'Jestem człowiekiem',
    verificationFailed: 'Weryfikacja nie powiodła się, kliknij, aby spróbować ponownie',
    verifying: 'Weryfikacja...',
    ariaCheckbox: 'Pole wyboru weryfikacji człowieka. Naciśnij Enter lub Spację, aby potwierdzić, że jesteś człowiekiem.',
    ariaVerifying: 'Trwa weryfikacja, że jesteś człowiekiem. Proszę czekać.',
    ariaSuccess: 'Weryfikacja zakończona pomyślnie. Zostałeś zweryfikowany jako człowiek.',
    ariaFailed: 'Weryfikacja nie powiodła się. Naciśnij Enter lub Spację, aby spróbować ponownie.',
    srLoading: 'Weryfikacja w toku. Proszę czekać.',
    srSuccess: 'Weryfikacja zakończona pomyślnie!',
    srFailed: 'Weryfikacja nie powiodła się. Spróbuj ponownie.',
    ariaProgress: 'Postęp weryfikacji',
  },
  uk: {
    iAmHuman: 'Я людина',
    verificationFailed: 'Перевірка не вдалася, натисніть, щоб спробувати знову',
    verifying: 'Перевірка...',
    ariaCheckbox: 'Прапорець перевірки людини. Натисніть Enter або Пробіл, щоб підтвердити, що ви людина.',
    ariaVerifying: 'Перевіряємо, що ви людина. Будь ласка, зачекайте.',
    ariaSuccess: 'Перевірка успішна. Вас підтверджено як людину.',
    ariaFailed: 'Перевірка не вдалася. Натисніть Enter або Пробіл, щоб спробувати знову.',
    srLoading: 'Перевірка триває. Будь ласка, зачекайте.',
    srSuccess: 'Перевірка успішна!',
    srFailed: 'Перевірка не вдалася. Будь ласка, спробуйте ще раз.',
    ariaProgress: 'Прогрес перевірки',
  },
}

export const isSupportedLocale = (locale: string): locale is SupportedLocale => {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale)
}

export const normalizeLocale = (locale: string): SupportedLocale => {
  const lowered = locale.toLowerCase()
  const primary = lowered.split('-')[0].split('_')[0]

  if (isSupportedLocale(primary)) {
    return primary
  }

  return DEFAULT_LOCALE
}

export const detectBrowserLocale = (): SupportedLocale => {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LOCALE
  }

  const languages = navigator.languages || [navigator.language]

  for (const lang of languages) {
    const normalized = normalizeLocale(lang)
    if (normalized !== DEFAULT_LOCALE || lang.toLowerCase().startsWith('en')) {
      return normalized
    }
  }

  return DEFAULT_LOCALE
}

export const getTranslations = (locale: SupportedLocale) => {
  return translations[locale] || translations[DEFAULT_LOCALE]
}
