import type { Locale } from "@/lib/i18n";

export const accountText: Record<Locale, {
  eyebrow: string; title: string; dashboard: string; profile: string; favorites: string; settings: string;
  logout: string; memberSince: string; role: string; city: string; notSet: string; favoritePlayers: string;
  favoriteMatches: string; editProfile: string; manageSettings: string; openFavorites: string; profileTitle: string;
  profileDescription: string; fullName: string; displayName: string; displayNameHint: string; avatar: string;
  avatarHint: string; cityHint: string; save: string; saving: string; removeAvatar: string; settingsTitle: string;
  settingsDescription: string; language: string; languageHint: string; notifications: string; notificationsHint: string;
  ru: string; ro: string; favoritesTitle: string; favoritesDescription: string; players: string; matches: string;
  noPlayers: string; noMatches: string; browsePlayers: string; browseMatches: string; addPlayer: string;
  removePlayer: string; followMatch: string; removeMatch: string; loginToFavorite: string; accountActive: string;
  fanMessage: string; adminPanel: string; staffMessage: string; profileSaved: string; settingsSaved: string;
  invalidName: string; invalidDisplayName: string; invalidCity: string; avatarType: string; avatarSize: string;
  profileError: string; settingsError: string; favoriteError: string; upcoming: string; finished: string;
}> = {
  ru: {
    eyebrow: "ЛИЧНЫЙ КАБИНЕТ", title: "Мой FC Edineț", dashboard: "Обзор", profile: "Профиль",
    favorites: "Избранное", settings: "Настройки", logout: "Выйти", memberSince: "С клубом на сайте с",
    role: "Роль", city: "Город", notSet: "Не указано", favoritePlayers: "Любимые игроки",
    favoriteMatches: "Сохранённые матчи", editProfile: "Редактировать профиль", manageSettings: "Настройки аккаунта",
    openFavorites: "Открыть избранное", profileTitle: "Мой профиль", profileDescription: "Имя, отображаемое имя, город и фотография профиля.",
    fullName: "Имя и фамилия", displayName: "Отображаемое имя", displayNameHint: "Так тебя будем показывать в будущих комментариях и функциях сообщества.",
    avatar: "Фото профиля", avatarHint: "JPG, PNG или WebP до 3 МБ. Новое фото заменит текущее.", cityHint: "Например: Edineț",
    save: "Сохранить", saving: "Сохраняем...", removeAvatar: "Удалить фото", settingsTitle: "Настройки",
    settingsDescription: "Язык аккаунта и будущие уведомления клуба.", language: "Предпочитаемый язык", languageHint: "После сохранения интерфейс переключится на выбранный язык.",
    notifications: "Уведомления клуба", notificationsHint: "Сохраняем предпочтение уже сейчас. Email/push-уведомления подключим на следующем этапе.",
    ru: "Русский", ro: "Română", favoritesTitle: "Моё избранное", favoritesDescription: "Игроки и матчи, за которыми ты хочешь следить.",
    players: "Игроки", matches: "Матчи", noPlayers: "Ты ещё не добавил игроков в избранное.", noMatches: "Ты ещё не сохранил ни одного матча.",
    browsePlayers: "Открыть состав", browseMatches: "Открыть календарь", addPlayer: "♡ Добавить в избранное", removePlayer: "♥ В избранном",
    followMatch: "☆ Следить за матчем", removeMatch: "★ Матч сохранён", loginToFavorite: "Войди, чтобы добавить в избранное",
    accountActive: "Аккаунт активен", fanMessage: "Теперь можно сохранять любимых игроков и матчи. Профиль станет основой для комментариев и уведомлений.",
    adminPanel: "Открыть админку", staffMessage: "Твоя клубная роль также даёт доступ к служебной панели.", profileSaved: "Профиль сохранён.",
    settingsSaved: "Настройки сохранены.", invalidName: "Имя должно содержать от 2 до 100 символов.", invalidDisplayName: "Отображаемое имя должно содержать от 2 до 60 символов.",
    invalidCity: "Название города слишком длинное.", avatarType: "Поддерживаются только JPG, PNG и WebP.", avatarSize: "Фото должно быть не больше 3 МБ.",
    profileError: "Не удалось сохранить профиль.", settingsError: "Не удалось сохранить настройки.", favoriteError: "Не удалось изменить избранное.",
    upcoming: "Предстоящий", finished: "Завершён"
  },
  ro: {
    eyebrow: "CONT PERSONAL", title: "FC Edineț al meu", dashboard: "Prezentare", profile: "Profil",
    favorites: "Favorite", settings: "Setări", logout: "Ieșire", memberSince: "Pe site-ul clubului din",
    role: "Rol", city: "Oraș", notSet: "Nespecificat", favoritePlayers: "Jucători favoriți",
    favoriteMatches: "Meciuri salvate", editProfile: "Editează profilul", manageSettings: "Setările contului",
    openFavorites: "Deschide favoritele", profileTitle: "Profilul meu", profileDescription: "Nume, nume afișat, oraș și fotografia de profil.",
    fullName: "Nume și prenume", displayName: "Nume afișat", displayNameHint: "Așa vei apărea în viitoarele comentarii și funcții ale comunității.",
    avatar: "Fotografie de profil", avatarHint: "JPG, PNG sau WebP până la 3 MB. O fotografie nouă o va înlocui pe cea actuală.", cityHint: "De exemplu: Edineț",
    save: "Salvează", saving: "Se salvează...", removeAvatar: "Șterge fotografia", settingsTitle: "Setări",
    settingsDescription: "Limba contului și viitoarele notificări ale clubului.", language: "Limba preferată", languageHint: "După salvare, interfața va trece la limba selectată.",
    notifications: "Notificările clubului", notificationsHint: "Preferința este salvată acum. Notificările email/push vor fi conectate într-o etapă viitoare.",
    ru: "Русский", ro: "Română", favoritesTitle: "Favoritele mele", favoritesDescription: "Jucătorii și meciurile pe care vrei să le urmărești.",
    players: "Jucători", matches: "Meciuri", noPlayers: "Nu ai adăugat încă jucători la favorite.", noMatches: "Nu ai salvat încă niciun meci.",
    browsePlayers: "Deschide lotul", browseMatches: "Deschide calendarul", addPlayer: "♡ Adaugă la favorite", removePlayer: "♥ În favorite",
    followMatch: "☆ Urmărește meciul", removeMatch: "★ Meci salvat", loginToFavorite: "Autentifică-te pentru a adăuga la favorite",
    accountActive: "Cont activ", fanMessage: "Acum poți salva jucătorii și meciurile preferate. Profilul va sta la baza comentariilor și notificărilor.",
    adminPanel: "Deschide administrarea", staffMessage: "Rolul tău în club îți oferă și acces la panoul de administrare.", profileSaved: "Profilul a fost salvat.",
    settingsSaved: "Setările au fost salvate.", invalidName: "Numele trebuie să conțină între 2 și 100 de caractere.", invalidDisplayName: "Numele afișat trebuie să conțină între 2 și 60 de caractere.",
    invalidCity: "Numele orașului este prea lung.", avatarType: "Sunt acceptate doar JPG, PNG și WebP.", avatarSize: "Fotografia nu poate depăși 3 MB.",
    profileError: "Profilul nu a putut fi salvat.", settingsError: "Setările nu au putut fi salvate.", favoriteError: "Favoritele nu au putut fi modificate.",
    upcoming: "Viitor", finished: "Încheiat"
  }
};
