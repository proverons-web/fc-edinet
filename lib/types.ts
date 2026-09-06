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
  slug: string;
  display_order?: number | null;
  is_active?: boolean;
};

export type NewsArticle = {
  id: string | number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
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
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export const roleLabels: Record<UserRole, string> = {
  fan: "Болельщик",
  author: "Автор",
  editor: "Редактор",
  admin: "Администратор",
};

export const staffRoles: UserRole[] = ["author", "editor", "admin"];


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
  city: string;
  founded_year: number | null;
  club_colors: string | null;
  motto: string | null;
  about_text: string | null;
  history_text: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  stadium_name: string | null;
  stadium_capacity: number | null;
  stadium_address: string | null;
  stadium_description: string | null;
  hero_image_url: string | null;
  stadium_image_url: string | null;
  updated_at: string;
};

export type ClubLeader = {
  id: string | number;
  name: string;
  role: string;
  bio: string | null;
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
  description: string | null;
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
  title_main: string;
  title_accent: string;
  description: string;
  primary_button_text: string;
  primary_button_href: string;
  secondary_button_text: string;
  secondary_button_href: string;
  background_image_url: string | null;
  overlay_opacity: number;
  background_position: "center" | "top" | "bottom" | "left" | "right";
  show_primary_button: boolean;
  show_secondary_button: boolean;
  updated_at: string;
};
