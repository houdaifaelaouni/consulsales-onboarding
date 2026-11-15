import type { Locale } from "@/lib/i18n";

/** Invite email copy per language. Marketing-sensitive wording should get a native review before launch (S7). */
export interface InviteCopy { subject: string; preview: string; heading: string; body: string; button: string; footer: string }

export const INVITE_COPY: Record<Locale, InviteCopy> = {
  en: {
    subject: "Your ConsulSales workspace is ready",
    preview: "One step to get started: open your workspace.",
    heading: "Welcome to ConsulSales",
    body: "Your payment is confirmed and your workspace is ready. Your first step is waiting for you.",
    button: "Open my workspace",
    footer: "This link works once and expires in 24 hours. If it expired, request a new one on the sign-in page.",
  },
  fr: {
    subject: "Votre espace ConsulSales est prêt",
    preview: "Une seule étape pour commencer : ouvrez votre espace.",
    heading: "Bienvenue chez ConsulSales",
    body: "Votre paiement est confirmé et votre espace est prêt. Votre première étape vous attend.",
    button: "Ouvrir mon espace",
    footer: "Ce lien ne fonctionne qu'une fois et expire sous 24 heures. S'il a expiré, demandez-en un nouveau sur la page de connexion.",
  },
  es: {
    subject: "Tu espacio de ConsulSales está listo",
    preview: "Un solo paso para empezar: abre tu espacio.",
    heading: "Te damos la bienvenida a ConsulSales",
    body: "Tu pago está confirmado y tu espacio está listo. Tu primer paso te está esperando.",
    button: "Abrir mi espacio",
    footer: "Este enlace funciona una sola vez y caduca en 24 horas. Si caducó, pide uno nuevo en la página de inicio de sesión.",
  },
  de: {
    subject: "Ihr ConsulSales-Bereich ist bereit",
    preview: "Ein Schritt zum Start: Öffnen Sie Ihren Bereich.",
    heading: "Willkommen bei ConsulSales",
    body: "Ihre Zahlung ist bestätigt und Ihr Bereich ist bereit. Ihr erster Schritt wartet auf Sie.",
    button: "Meinen Bereich öffnen",
    footer: "Dieser Link funktioniert nur einmal und läuft nach 24 Stunden ab. Ist er abgelaufen, fordern Sie auf der Anmeldeseite einen neuen an.",
  },
  "pt-br": {
    subject: "Seu espaço na ConsulSales está pronto",
    preview: "Um passo para começar: abra seu espaço.",
    heading: "Boas-vindas à ConsulSales",
    body: "Seu pagamento foi confirmado e seu espaço está pronto. Seu primeiro passo está esperando por você.",
    button: "Abrir meu espaço",
    footer: "Este link funciona uma única vez e expira em 24 horas. Se expirar, peça um novo na página de login.",
  },
  zh: {
    subject: "您的 ConsulSales 工作区已就绪",
    preview: "只需一步即可开始：打开您的工作区。",
    heading: "欢迎使用 ConsulSales",
    body: "您的付款已确认，工作区已准备就绪。您的第一步正在等您。",
    button: "打开我的工作区",
    footer: "此链接仅可使用一次，24 小时后失效。如已失效，请在登录页面重新获取。",
  },
};
