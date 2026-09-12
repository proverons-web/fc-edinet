export type Player = {
  id: string | number;
  first_name: string;
  last_name: string;
  slug: string;
  shirt_number: number | null;
  position: string;
  birth_date: string | null;
  nationality: string | null;
  height_cm: number | null;
  photo_url: string | null;
  bio: string | null;
  bio_ro?: string | null;
  ro_translation_locked?: boolean;
  ro_translation_source_hash?: string | null;
  ro_translation_updated_at?: string | null;
  is_active: boolean;
  display_order: number | null;
  preferred_foot: string | null;
  hometown: string | null;
  previous_club: string | null;
  joined_at: string | null;
};

export type NewsCategory = {
  id: string | number;
  name: string;
  name_ro?: string | null;
  slug: string;
  display_order?: number | null;
  is_active?: boolean;
};

export type NewsArticle = {
  id: string | number;
  title: string;
  title_ro?: string | null;
  slug: string;
  excerpt: string | null;
  excerpt_ro?: string | null;
  content: string;
  content_ro?: string | null;
  ro_translation_locked?: boolean;
  ro_translation_source_hash?: string | null;
  ro_translation_updated_at?: string | null;
  cover_image_url: string | null;
  author_name: string | null;
  status: 'draft' | 'review' | 'published';
  published_at: string | null;
  views: number;
  is_featured: boolean;
  category_id: string | number | null;
  category: NewsCategory | null;
  created_by?: string | null;
  submitted_at?: string | null;
  published_by?: string | null;
  editor_note?: string | null;
  created_at?: string;
  updated_at?: string;
};

export const positionLabels: Record<string, string> = {
  goalkeeper: 'Вратарь',
  defender: 'Защитник',
  midfielder: 'Полузащитник',
  forward: 'Нападающий',
};

export const positionPluralLabels: Record<string, string> = {
  goalkeeper: 'Вратари',
  defender: 'Защитники',
  midfielder: 'Полузащитники',
  forward: 'Нападающие',
};

export const footLabels: Record<string, string> = {
  left: 'Левая',
  right: 'Правая',
  both: 'Обе',
};


export type UserRole = "fan" | "author" | "editor" | "admin";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  preferred_language: "ru" | "ro";
  notifications_enabled: boolean;
  role: UserRole;
  created_at: string;
  updated_at: string;
};


export type FavoritePlayer = {
  user_id: string;
  player_id: string;
  created_at: string;
  player?: Player | null;
};

export type FavoriteMatch = {
  user_id: string;
  match_id: string | number;
  created_at: string;
  match?: ClubMatch | null;
};

export type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
};

export const roleLabels: Record<UserRole, string> = {
  fan: "Болельщик",
  author: "Автор",
  editor: "Редактор",
  admin: "Администратор",
};

export const staffRoles: UserRole[] = ["author", "editor", "admin"];


export type AuditLogEntry = {
  id: string | number;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_role: UserRole | null;
  action: "insert" | "update" | "delete";
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  changed_fields: string[];
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
};


export type ClubTeam = {
  id: string | number;
  name: string;
  short_name: string | null;
  slug: string;
  city: string | null;
  home_stadium: string | null;
  logo_url: string | null;
  is_club: boolean;
  is_active: boolean;
};

export type Competition = {
  id: string | number;
  name: string;
  slug: string;
  season: string | null;
  is_active: boolean;
};

export type MatchStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "postponed"
  | "cancelled";

export type ClubMatch = {
  id: string | number;
  competition_id: string | number | null;
  home_team_id: string | number;
  away_team_id: string | number;
  kickoff: string;
  stadium: string | null;
  round: string | null;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  notes: string | null;
  home: ClubTeam | null;
  away: ClubTeam | null;
  competition: Competition | null;
  created_at?: string;
  updated_at?: string;
};

export const matchStatusLabels: Record<MatchStatus, string> = {
  scheduled: "Предстоящий",
  live: "Идёт матч",
  finished: "Завершён",
  postponed: "Перенесён",
  cancelled: "Отменён",
};


export type StandingEntry = {
  id: string | number;
  competition_id: string | number;
  team_id: string | number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  points_adjustment: number;
  played: number;
  goal_difference: number;
  points: number;
  team: ClubTeam | null;
  competition?: Competition | null;
  created_at?: string;
  updated_at?: string;
};


export type ClubProfile = {
  id: number;
  club_name: string;
  club_name_ro?: string | null;
  city: string;
  city_ro?: string | null;
  founded_year: number | null;
  club_colors: string | null;
  club_colors_ro?: string | null;
  motto: string | null;
  motto_ro?: string | null;
  about_text: string | null;
  about_text_ro?: string | null;
  history_text: string | null;
  history_text_ro?: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  address_ro?: string | null;
  stadium_name: string | null;
  stadium_name_ro?: string | null;
  stadium_capacity: number | null;
  stadium_address: string | null;
  stadium_address_ro?: string | null;
  stadium_description: string | null;
  stadium_description_ro?: string | null;
  ro_translation_locked?: boolean;
  ro_translation_source_hash?: string | null;
  ro_translation_updated_at?: string | null;
  hero_image_url: string | null;
  stadium_image_url: string | null;
  updated_at: string;
};

export type ClubLeader = {
  id: string | number;
  name: string;
  role: string;
  role_ro?: string | null;
  bio: string | null;
  bio_ro?: string | null;
  ro_translation_locked?: boolean;
  ro_translation_source_hash?: string | null;
  ro_translation_updated_at?: string | null;
  photo_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ClubAchievement = {
  id: string | number;
  year: string | null;
  title: string;
  title_ro?: string | null;
  description: string | null;
  description_ro?: string | null;
  ro_translation_locked?: boolean;
  ro_translation_source_hash?: string | null;
  ro_translation_updated_at?: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};


export type MediaAlbum = {
  id: string | number;
  title: string;
  slug: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  cover_image_url: string | null;
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type MediaPhoto = {
  id: string | number;
  album_id: string | number;
  image_url: string;
  thumb_url: string;
  storage_path: string;
  thumb_storage_path: string;
  original_name: string | null;
  caption: string | null;
  photographer: string | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
  album?: MediaAlbum | null;
};

export type MediaVideo = {
  id: string | number;
  title: string;
  description: string | null;
  youtube_url: string;
  youtube_id: string;
  published_at: string | null;
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};


export type HomepageHero = {
  id: number;
  eyebrow: string;
  eyebrow_ro?: string | null;
  title_main: string;
  title_main_ro?: string | null;
  title_accent: string;
  title_accent_ro?: string | null;
  description: string;
  description_ro?: string | null;
  primary_button_text: string;
  primary_button_text_ro?: string | null;
  primary_button_href: string;
  secondary_button_text: string;
  secondary_button_text_ro?: string | null;
  ro_translation_locked?: boolean;
  ro_translation_source_hash?: string | null;
  ro_translation_updated_at?: string | null;
  secondary_button_href: string;
  background_image_url: string | null;
  overlay_opacity: number;
  background_position: "center" | "top" | "bottom" | "left" | "right";
  desktop_position_x?: number | null;
  desktop_position_y?: number | null;
  desktop_zoom_percent?: number | null;
  mobile_background_image_url?: string | null;
  mobile_position_x?: number | null;
  mobile_position_y?: number | null;
  mobile_zoom_percent?: number | null;
  hero_height_desktop?: number | null;
  hero_height_mobile?: number | null;
  text_alignment?: "left" | "center" | "right" | null;
  show_match_card?: boolean | null;
  show_primary_button: boolean;
  show_secondary_button: boolean;
  updated_at: string;
};


export type HomepageSectionKey =
  | "matches"
  | "standings"
  | "news"
  | "players"
  | "media"
  | "partners";

export type HomepageSection = {
  section_key: HomepageSectionKey;
  is_enabled: boolean;
  display_order: number;
  updated_at: string;
};

export type HomepageSettings = {
  id: number;
  show_pinned_news: boolean;
  pinned_news_id: string | number | null;
  banner_enabled: boolean;
  banner_eyebrow: string;
  banner_eyebrow_ro?: string | null;
  banner_title: string;
  banner_title_ro?: string | null;
  banner_text: string;
  banner_text_ro?: string | null;
  banner_button_text: string;
  banner_button_text_ro?: string | null;
  ro_translation_locked?: boolean;
  ro_translation_source_hash?: string | null;
  ro_translation_updated_at?: string | null;
  banner_button_href: string;
  banner_image_url: string | null;
  banner_overlay_opacity: number;
  banner_background_position: "center" | "top" | "bottom" | "left" | "right";
  updated_at: string;
};



export type HomepageDesignDraft = {
  id: number;
  background_image_url: string | null;
  mobile_background_image_url: string | null;
  desktop_position_x: number;
  desktop_position_y: number;
  desktop_zoom_percent: number;
  mobile_position_x: number;
  mobile_position_y: number;
  mobile_zoom_percent: number;
  hero_height_desktop: number;
  hero_height_mobile: number;
  overlay_opacity: number;
  text_alignment: "left" | "center" | "right";
  show_match_card: boolean;
  section_order: HomepageSectionKey[];
  section_visibility: Record<HomepageSectionKey, boolean>;
  updated_by: string | null;
  updated_at: string;
};

export type HomepageDesignSnapshot = Omit<HomepageDesignDraft, "id" | "updated_by" | "updated_at">;

export type HomepageDesignVersion = {
  id: string | number;
  label: string | null;
  snapshot: HomepageDesignSnapshot;
  published_by: string | null;
  created_at: string;
};

export const homepageSectionLabels: Record<HomepageSectionKey, string> = {
  matches: "Матчи",
  standings: "Турнирная таблица",
  news: "Новости",
  players: "Команда",
  media: "Фото и видео",
  partners: "Партнёры",
};


export type PartnerLevel = "main" | "official" | "technical" | "supporter";

export type Partner = {
  id: string | number;
  name: string;
  slug: string;
  website_url: string | null;
  description: string | null;
  description_ro?: string | null;
  ro_translation_locked?: boolean;
  ro_translation_source_hash?: string | null;
  ro_translation_updated_at?: string | null;
  logo_url: string;
  logo_storage_path: string | null;
  partner_level: PartnerLevel;
  display_order: number;
  is_active: boolean;
  show_on_homepage: boolean;
  created_at: string;
  updated_at: string;
};

export const partnerLevelLabels: Record<PartnerLevel, string> = {
  main: "Главный партнёр",
  official: "Официальный партнёр",
  technical: "Технический партнёр",
  supporter: "Партнёр клуба",
};

export type NewsComment = {
  id: string | number;
  news_id: string | number;
  user_id?: string;
  body: string;
  status: "visible" | "hidden";
  author_display_name: string;
  author_avatar_url: string | null;
  moderated_by?: string | null;
  moderated_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type CommentReportReason = "spam" | "offensive" | "harassment" | "other";
export type CommentReportStatus = "pending" | "resolved" | "dismissed";

export type CommentReport = {
  id: string | number;
  comment_id: string | number;
  reporter_id: string;
  reason: CommentReportReason;
  details: string | null;
  status: CommentReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type CommentBlock = {
  user_id: string;
  reason: string | null;
  blocked_until: string | null;
  blocked_by: string;
  created_at: string;
  updated_at: string;
};

export type TranslationDiagnostic = {
  id: string | number;
  actor_user_id: string | null;
  content_type: string;
  content_id: string | null;
  content_label: string | null;
  status: "success" | "error";
  model: string;
  http_status: number | null;
  error_type: string | null;
  error_code: string | null;
  error_message: string | null;
  request_id: string | null;
  created_at: string;
};
