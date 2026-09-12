import type { Locale } from "@/lib/i18n";

export const commentsText: Record<Locale, {
  eyebrow: string;
  title: string;
  count: (count: number) => string;
  loginPrompt: string;
  login: string;
  placeholder: string;
  publish: string;
  empty: string;
  delete: string;
  report: string;
  reportTitle: string;
  reason: string;
  details: string;
  detailsPlaceholder: string;
  sendReport: string;
  cancelHint: string;
  reasons: Record<"spam" | "offensive" | "harassment" | "other", string>;
  blocked: string;
  blockedUntil: (date: string) => string;
  blockedForever: string;
  blockedReason: string;
  added: string;
  deleted: string;
  reported: string;
  reportDuplicate: string;
  rateLimit: string;
  invalid: string;
  error: string;
  own: string;
}> = {
  ru: {
    eyebrow: "ОБСУЖДЕНИЕ",
    title: "Комментарии",
    count: (count) => `${count} ${pluralRu(count, "комментарий", "комментария", "комментариев")}`,
    loginPrompt: "Войдите в аккаунт, чтобы оставить комментарий.",
    login: "Войти",
    placeholder: "Напишите комментарий…",
    publish: "Опубликовать",
    empty: "Комментариев пока нет. Можно стать первым.",
    delete: "Удалить",
    report: "Пожаловаться",
    reportTitle: "Жалоба на комментарий",
    reason: "Причина",
    details: "Комментарий к жалобе",
    detailsPlaceholder: "Необязательно, до 500 символов",
    sendReport: "Отправить жалобу",
    cancelHint: "Жалоба попадёт редактору сайта.",
    reasons: {
      spam: "Спам",
      offensive: "Оскорбительный контент",
      harassment: "Травля / преследование",
      other: "Другое",
    },
    blocked: "Возможность комментировать для этого аккаунта временно ограничена.",
    blockedUntil: (date) => `Блокировка действует до ${date}.`,
    blockedForever: "Блокировка действует без срока.",
    blockedReason: "Причина",
    added: "Комментарий опубликован.",
    deleted: "Комментарий удалён.",
    reported: "Жалоба отправлена редактору.",
    reportDuplicate: "Вы уже отправляли жалобу на этот комментарий.",
    rateLimit: "Слишком быстро. Подождите около 20 секунд и попробуйте снова.",
    invalid: "Проверьте текст комментария.",
    error: "Не удалось выполнить действие. Попробуйте ещё раз.",
    own: "Вы",
  },
  ro: {
    eyebrow: "DISCUȚIE",
    title: "Comentarii",
    count: (count) => `${count} ${count === 1 ? "comentariu" : "comentarii"}`,
    loginPrompt: "Autentifică-te pentru a lăsa un comentariu.",
    login: "Autentificare",
    placeholder: "Scrie un comentariu…",
    publish: "Publică",
    empty: "Nu există încă niciun comentariu. Poți fi primul.",
    delete: "Șterge",
    report: "Raportează",
    reportTitle: "Raportează comentariul",
    reason: "Motiv",
    details: "Detalii",
    detailsPlaceholder: "Opțional, până la 500 de caractere",
    sendReport: "Trimite raportarea",
    cancelHint: "Raportarea va ajunge la redacția site-ului.",
    reasons: {
      spam: "Spam",
      offensive: "Conținut ofensator",
      harassment: "Hărțuire",
      other: "Alt motiv",
    },
    blocked: "Posibilitatea de a comenta pentru acest cont este limitată temporar.",
    blockedUntil: (date) => `Blocarea este activă până la ${date}.`,
    blockedForever: "Blocarea este activă fără termen.",
    blockedReason: "Motiv",
    added: "Comentariul a fost publicat.",
    deleted: "Comentariul a fost șters.",
    reported: "Raportarea a fost trimisă redacției.",
    reportDuplicate: "Ai raportat deja acest comentariu.",
    rateLimit: "Prea repede. Așteaptă aproximativ 20 de secunde și încearcă din nou.",
    invalid: "Verifică textul comentariului.",
    error: "Acțiunea nu a putut fi efectuată. Încearcă din nou.",
    own: "Tu",
  },
};

function pluralRu(value: number, one: string, few: string, many: string) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
