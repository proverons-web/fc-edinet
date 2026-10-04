import type { CSSProperties } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ContentPageWidth = "container" | "wide" | "full";
export type ContentPageBackground = "inherit" | "light" | "surface" | "dark" | "brand";
export type ClubSectionKey = "about" | "history" | "stadium" | "leadership" | "achievements";
export type BuilderBreakpoint = "desktop" | "tablet" | "mobile";
export type ClubElementKey =
  | "about-copy"
  | "about-contact"
  | "history-copy"
  | "stadium-heading"
  | "stadium-image"
  | "stadium-info"
  | "leadership-heading"
  | "leadership-grid"
  | "achievements-heading"
  | "achievements-list";

export type ClubElementFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  padding: number;
  font_scale: number;
  text_align: "left" | "center" | "right";
  font_family: "inherit" | "arial" | "arial-black" | "verdana" | "tahoma" | "trebuchet" | "georgia" | "times";
  color: string;
  stroke_width: number;
  stroke_color: string;
  font_weight: number;
  letter_spacing: number;
  line_height: number;
  text_transform: "none" | "uppercase" | "lowercase" | "capitalize";
  italic: boolean;
  underline: boolean;
};

export type ClubResponsiveFrames = Record<BuilderBreakpoint, Record<string, ClubElementFrame>>;
export type ClubResponsiveNumber = Record<BuilderBreakpoint, number>;
export type ClubImageFocus = Record<BuilderBreakpoint, { x: number; y: number }>;

export type ClubSectionConfig = {
  key: ClubSectionKey;
  visible: boolean;
  width: ContentPageWidth;
  background: ContentPageBackground;
  padding_top: number;
  padding_bottom: number;
  variant: string;
  layout_mode: "template" | "manual";
  canvas_height: ClubResponsiveNumber;
  frames: ClubResponsiveFrames;
  image_focus?: ClubImageFocus;
  image_zoom?: ClubResponsiveNumber;
  /** legacy v2 values kept for backwards compatibility */
  image_position_x?: number;
  image_position_y?: number;
  image_fit?: "cover" | "contain";
  image_radius?: number;
  columns?: number;
};

export type ClubPageLayoutConfig = {
  version: 3;
  preset?: ClubPagePresetKey;
  sections: ClubSectionConfig[];
};

export type ClubPagePresetKey = "cinematic-blue" | "heritage-editorial";

const frame = (x:number,y:number,width:number,height:number=0,z:number=1,padding:number=0,font_scale:number=100,text_align:ClubElementFrame["text_align"]="left"):ClubElementFrame => ({x,y,width,height,z,padding,font_scale,text_align,font_family:"inherit",color:"",stroke_width:0,stroke_color:"#000000",font_weight:0,letter_spacing:0,line_height:0,text_transform:"none",italic:false,underline:false});
const emptyResponsiveFrames = (): ClubResponsiveFrames => ({ desktop:{}, tablet:{}, mobile:{} });
const defaultImageFocus = (): ClubImageFocus => ({ desktop:{x:50,y:52}, tablet:{x:50,y:52}, mobile:{x:50,y:52} });

function sectionDefaults(key: ClubSectionKey): ClubSectionConfig {
  const frames = emptyResponsiveFrames();
  const common = {
    key,
    visible: true,
    width: "container" as ContentPageWidth,
    background: "inherit" as ContentPageBackground,
    padding_top: 88,
    padding_bottom: 88,
    layout_mode: "template" as const,
    canvas_height: { desktop: 620, tablet: 700, mobile: 820 },
    frames,
  };

  if (key === "about") {
    frames.desktop["about-copy"] = frame(0,0,64,0,1,0,100,"left");
    frames.desktop["about-contact"] = frame(69,0,31,0,2,0,100,"left");
    frames.tablet["about-copy"] = frame(0,0,100,0);
    frames.tablet["about-contact"] = frame(0,360,100,0);
    frames.mobile["about-copy"] = frame(0,0,100,0);
    frames.mobile["about-contact"] = frame(0,430,100,0);
    return { ...common, variant:"contact-right", canvas_height:{desktop:560,tablet:760,mobile:940} };
  }
  if (key === "history") {
    frames.desktop["history-copy"] = frame(10,0,80,0,1,0,100,"left");
    frames.tablet["history-copy"] = frame(4,0,92,0);
    frames.mobile["history-copy"] = frame(0,0,100,0);
    return { ...common, background:"surface", variant:"readable", canvas_height:{desktop:720,tablet:820,mobile:980} };
  }
  if (key === "stadium") {
    frames.desktop["stadium-heading"] = frame(0,0,100,0,3);
    frames.desktop["stadium-image"] = frame(0,100,100,520,1);
    frames.desktop["stadium-info"] = frame(53,470,43,0,4,0,100,"left");
    frames.tablet["stadium-heading"] = frame(0,0,100,0,3);
    frames.tablet["stadium-image"] = frame(0,100,100,430,1);
    frames.tablet["stadium-info"] = frame(5,470,90,0,4);
    frames.mobile["stadium-heading"] = frame(0,0,100,0,3);
    frames.mobile["stadium-image"] = frame(0,90,100,320,1);
    frames.mobile["stadium-info"] = frame(0,390,100,0,4);
    return {
      ...common,
      width:"wide",
      background:"dark",
      variant:"cinematic",
      layout_mode:"manual",
      canvas_height:{desktop:760,tablet:780,mobile:790},
      image_focus:defaultImageFocus(),
      image_zoom:{desktop:115,tablet:115,mobile:120},
      image_position_x:50,
      image_position_y:52,
      image_fit:"cover",
      image_radius:28,
    };
  }
  if (key === "leadership") {
    frames.desktop["leadership-heading"] = frame(0,0,100,0,2);
    frames.desktop["leadership-grid"] = frame(0,110,100,0,1);
    frames.tablet["leadership-heading"] = frame(0,0,100,0,2);
    frames.tablet["leadership-grid"] = frame(0,100,100,0,1);
    frames.mobile["leadership-heading"] = frame(0,0,100,0,2);
    frames.mobile["leadership-grid"] = frame(0,90,100,0,1);
    return { ...common, variant:"cards", columns:3, canvas_height:{desktop:720,tablet:900,mobile:1280} };
  }
  frames.desktop["achievements-heading"] = frame(0,0,100,0,2);
  frames.desktop["achievements-list"] = frame(0,110,100,0,1);
  frames.tablet["achievements-heading"] = frame(0,0,100,0,2);
  frames.tablet["achievements-list"] = frame(0,100,100,0,1);
  frames.mobile["achievements-heading"] = frame(0,0,100,0,2);
  frames.mobile["achievements-list"] = frame(0,90,100,0,1);
  return { ...common, background:"dark", variant:"timeline", canvas_height:{desktop:700,tablet:850,mobile:1100} };
}

function cinematicPreset(): ClubPageLayoutConfig {
  const sections = [sectionDefaults("about"), sectionDefaults("stadium"), sectionDefaults("history"), sectionDefaults("leadership"), sectionDefaults("achievements")];
  sections[0] = {...sections[0], background:"light", padding_top:96, padding_bottom:92, variant:"contact-right"};
  sections[1] = {...sections[1], background:"dark", width:"wide", variant:"cinematic", layout_mode:"manual"};
  sections[2] = {...sections[2], background:"surface", width:"container", variant:"readable"};
  sections[3] = {...sections[3], background:"light", variant:"cards", columns:3};
  sections[4] = {...sections[4], background:"brand", width:"wide", variant:"cards"};
  return {version:3,preset:"cinematic-blue",sections};
}

function heritagePreset(): ClubPageLayoutConfig {
  const about = {...sectionDefaults("about"), background:"surface" as ContentPageBackground, variant:"contact-left", padding_top:80, padding_bottom:80};
  const history = {...sectionDefaults("history"), background:"light" as ContentPageBackground, width:"wide" as ContentPageWidth, variant:"columns", padding_top:96, padding_bottom:96};
  const stadium = {...sectionDefaults("stadium"), background:"dark" as ContentPageBackground, width:"wide" as ContentPageWidth, variant:"split-right", layout_mode:"template" as const, padding_top:88, padding_bottom:88};
  const achievements = {...sectionDefaults("achievements"), background:"dark" as ContentPageBackground, width:"container" as ContentPageWidth, variant:"timeline"};
  const leadership = {...sectionDefaults("leadership"), background:"surface" as ContentPageBackground, variant:"compact", columns:1};
  return {version:3,preset:"heritage-editorial",sections:[about,history,stadium,achievements,leadership]};
}

const defaults = cinematicPreset();

export function defaultClubPageLayout(): ClubPageLayoutConfig { return clone(defaults); }
export function clubPagePreset(key: ClubPagePresetKey): ClubPageLayoutConfig { return clone(key === "heritage-editorial" ? heritagePreset() : cinematicPreset()); }
export function clubPagePresetOptions(): {key:ClubPagePresetKey;label:string;description:string}[] {
  return [
    {key:"cinematic-blue",label:"Cinematic Blue",description:"Большой стадион, синие акценты, карточки поверх фото — современный клубный стиль."},
    {key:"heritage-editorial",label:"Heritage Editorial",description:"История на первом плане, журнальная верстка, стадион 50/50 и более классическая подача."},
  ];
}

export function clubSectionElements(key: ClubSectionKey): ClubElementKey[] {
  if (key === "about") return ["about-copy","about-contact"];
  if (key === "history") return ["history-copy"];
  if (key === "stadium") return ["stadium-heading","stadium-image","stadium-info"];
  if (key === "leadership") return ["leadership-heading","leadership-grid"];
  return ["achievements-heading","achievements-list"];
}

export function normalizeClubPageLayout(raw: unknown): ClubPageLayoutConfig {
  const fallback = defaultClubPageLayout();
  const root = isRecord(raw) ? raw : {};
  const source = Array.isArray(root.sections) ? root.sections : [];
  const byKey = new Map<string, unknown>();
  for (const item of source) if (isRecord(item) && typeof item.key === "string") byKey.set(item.key, item);
  const normalized = fallback.sections.map((base) => normalizeSection(base, byKey.get(base.key)));
  const requestedOrder = source.filter(isRecord).map((item) => String(item.key ?? "")).filter((key): key is ClubSectionKey => normalized.some((section) => section.key === key));
  const order = [...new Set([...requestedOrder, ...normalized.map((section) => section.key)])];
  const preset = root.preset === "heritage-editorial" || root.preset === "cinematic-blue" ? root.preset : undefined;
  return { version:3, preset, sections:order.map((key) => normalized.find((section) => section.key === key)!) };
}

export async function getPublishedClubPageLayout(supabase: SupabaseClient): Promise<ClubPageLayoutConfig> {
  const { data, error } = await supabase.from("content_page_published").select("published_config").eq("page_key", "club").maybeSingle();
  if (error || !data) return defaultClubPageLayout();
  return normalizeClubPageLayout(data.published_config);
}
export async function getDraftClubPageLayout(supabase: SupabaseClient): Promise<ClubPageLayoutConfig> {
  const { data, error } = await supabase.from("content_page_layouts").select("draft_config,published_config").eq("page_key", "club").maybeSingle();
  if (error || !data) return defaultClubPageLayout();
  return normalizeClubPageLayout(data.draft_config ?? data.published_config);
}

export function sectionClass(section: ClubSectionConfig) {
  return ["contentBuilderSection",`contentBuilderBg-${section.background}`,`contentBuilderWidth-${section.width}`,`contentBuilderVariant-${section.variant}`,section.layout_mode === "manual" ? "contentBuilderManual" : "contentBuilderTemplate"].join(" ");
}
export function sectionStyle(section: ClubSectionConfig) {
  return {"--content-pad-top":`${section.padding_top}px`,"--content-pad-bottom":`${section.padding_bottom}px`,"--club-canvas-desktop":`${section.canvas_height.desktop}px`,"--club-canvas-tablet":`${section.canvas_height.tablet}px`,"--club-canvas-mobile":`${section.canvas_height.mobile}px`} as CSSProperties;
}
export function frameCssVariables(frames: ClubResponsiveFrames, elementKey: string): CSSProperties {
  const d = frames.desktop[elementKey] ?? frame(0,0,100); const t = frames.tablet[elementKey] ?? d; const m = frames.mobile[elementKey] ?? t;
  const vars=(prefix:string,f:ClubElementFrame)=>({
    [`--f-${prefix}-x`]:`${f.x}%`,[`--f-${prefix}-y`]:`${f.y}px`,[`--f-${prefix}-w`]:`${f.width}%`,[`--f-${prefix}-h`]:`${f.height}px`,[`--f-${prefix}-z`]:f.z,[`--f-${prefix}-p`]:`${f.padding}px`,[`--f-${prefix}-font`]:f.font_scale/100,[`--f-${prefix}-align`]:f.text_align,
    [`--f-${prefix}-family`]:clubFontStack(f.font_family),[`--f-${prefix}-color`]:f.color||"inherit",[`--f-${prefix}-stroke`]:`${f.stroke_width}px`,[`--f-${prefix}-stroke-color`]:f.stroke_color,[`--f-${prefix}-weight`]:f.font_weight||"inherit",[`--f-${prefix}-letter`]:`${f.letter_spacing}px`,[`--f-${prefix}-line`]:f.line_height||"inherit",[`--f-${prefix}-transform`]:f.text_transform,[`--f-${prefix}-style`]:f.italic?"italic":"normal",[`--f-${prefix}-decoration`]:f.underline?"underline":"none"
  });
  return {...vars("d",d),...vars("t",t),...vars("m",m)} as CSSProperties;
}
function clubFontStack(value:ClubElementFrame["font_family"]){if(value==="arial-black")return '"Arial Black",Arial,Helvetica,sans-serif';if(value==="verdana")return 'Verdana,Geneva,sans-serif';if(value==="tahoma")return 'Tahoma,Verdana,sans-serif';if(value==="trebuchet")return '"Trebuchet MS",Arial,sans-serif';if(value==="georgia")return 'Georgia,"Times New Roman",serif';if(value==="times")return '"Times New Roman",Times,serif';if(value==="arial")return 'Arial,Helvetica,sans-serif';return 'inherit';}
export function imageFocusCssVariables(section: ClubSectionConfig): CSSProperties {
  const focus = section.image_focus ?? defaultImageFocus();
  const zoom = section.image_zoom ?? {desktop:115,tablet:115,mobile:120};
  return {
    "--stadium-focus-d-x":`${focus.desktop.x}%`,"--stadium-focus-d-y":`${focus.desktop.y}%`,
    "--stadium-focus-t-x":`${focus.tablet.x}%`,"--stadium-focus-t-y":`${focus.tablet.y}%`,
    "--stadium-focus-m-x":`${focus.mobile.x}%`,"--stadium-focus-m-y":`${focus.mobile.y}%`,
    "--stadium-zoom-d":zoom.desktop/100,"--stadium-zoom-t":zoom.tablet/100,"--stadium-zoom-m":zoom.mobile/100,
  } as CSSProperties;
}

function normalizeSection(base: ClubSectionConfig, raw: unknown): ClubSectionConfig {
  const value = isRecord(raw) ? raw : {};
  const layoutMode = value.layout_mode === "manual" || value.layout_mode === "template" ? value.layout_mode : base.layout_mode;
  const legacyX = integer(value.image_position_x,0,100,base.image_position_x ?? 50);
  const legacyY = integer(value.image_position_y,0,100,base.image_position_y ?? 52);
  const focusFallback = base.image_focus ?? {desktop:{x:legacyX,y:legacyY},tablet:{x:legacyX,y:legacyY},mobile:{x:legacyX,y:legacyY}};
  return {
    key:base.key,
    visible:typeof value.visible === "boolean" ? value.visible : base.visible,
    width:width(value.width,base.width),
    background:background(value.background,base.background),
    padding_top:integer(value.padding_top,0,220,base.padding_top),
    padding_bottom:integer(value.padding_bottom,0,220,base.padding_bottom),
    variant:variant(base.key,value.variant,base.variant),
    layout_mode:layoutMode,
    canvas_height:normalizeResponsiveNumber(value.canvas_height,base.canvas_height,260,1800),
    frames:normalizeFrames(value.frames,base.frames,base.key),
    image_focus:base.key === "stadium" ? normalizeImageFocus(value.image_focus,focusFallback,legacyX,legacyY) : undefined,
    image_zoom:base.key === "stadium" ? normalizeResponsiveNumber(value.image_zoom, base.image_zoom ?? {desktop:115,tablet:115,mobile:120}, 100, 200) : undefined,
    image_position_x:base.key === "stadium" ? legacyX : undefined,
    image_position_y:base.key === "stadium" ? legacyY : undefined,
    image_fit:base.key === "stadium" && (value.image_fit === "contain" || value.image_fit === "cover") ? value.image_fit : base.image_fit,
    image_radius:base.key === "stadium" ? integer(value.image_radius,0,60,base.image_radius ?? 28) : undefined,
    columns:base.key === "leadership" ? integer(value.columns,1,4,base.columns ?? 3) : undefined,
  };
}
function normalizeImageFocus(raw: unknown, fallback: ClubImageFocus, legacyX:number, legacyY:number): ClubImageFocus {
  if (!isRecord(raw)) return {desktop:{x:legacyX,y:legacyY},tablet:{x:legacyX,y:legacyY},mobile:{x:legacyX,y:legacyY}};
  const read=(bp:BuilderBreakpoint)=>{const value=isRecord(raw[bp])?raw[bp] as Record<string,unknown>:{};return{x:integer(value.x,0,100,fallback[bp].x),y:integer(value.y,0,100,fallback[bp].y)}};
  return {desktop:read("desktop"),tablet:read("tablet"),mobile:read("mobile")};
}
function normalizeFrames(raw: unknown, fallback: ClubResponsiveFrames, sectionKey: ClubSectionKey): ClubResponsiveFrames {
  const result: ClubResponsiveFrames = clone(fallback); if (!isRecord(raw)) return result;
  for (const bp of ["desktop","tablet","mobile"] as BuilderBreakpoint[]) { const group=isRecord(raw[bp])?raw[bp] as Record<string,unknown>:{}; for(const element of clubSectionElements(sectionKey)){const base=result[bp][element]??frame(0,0,100);const candidate=isRecord(group[element])?group[element] as Record<string,unknown>:{};result[bp][element]={x:number(candidate.x,-50,150,base.x),y:integer(candidate.y,-400,1800,base.y),width:number(candidate.width,5,180,base.width),height:integer(candidate.height,0,1400,base.height),z:integer(candidate.z,0,50,base.z),padding:integer(candidate.padding,0,100,base.padding),font_scale:integer(candidate.font_scale,50,180,base.font_scale),text_align:candidate.text_align === "center" || candidate.text_align === "right" || candidate.text_align === "left" ? candidate.text_align : base.text_align,font_family:fontFamily(candidate.font_family,base.font_family),color:colorValue(candidate.color,base.color),stroke_width:number(candidate.stroke_width,0,8,base.stroke_width),stroke_color:colorValue(candidate.stroke_color,base.stroke_color),font_weight:integer(candidate.font_weight,0,950,base.font_weight),letter_spacing:number(candidate.letter_spacing,-12,24,base.letter_spacing),line_height:number(candidate.line_height,0,2.4,base.line_height),text_transform:textTransform(candidate.text_transform,base.text_transform),italic:typeof candidate.italic === "boolean"?candidate.italic:base.italic,underline:typeof candidate.underline === "boolean"?candidate.underline:base.underline};}}
  return result;
}
function normalizeResponsiveNumber(raw: unknown, fallback: ClubResponsiveNumber, min: number, max: number): ClubResponsiveNumber {const value=isRecord(raw)?raw:{};return{desktop:integer(value.desktop,min,max,fallback.desktop),tablet:integer(value.tablet,min,max,fallback.tablet),mobile:integer(value.mobile,min,max,fallback.mobile)}};
function variant(key:ClubSectionKey,value:unknown,fallback:string){const allowed:Record<ClubSectionKey,string[]>={about:["contact-right","contact-left","stacked"],history:["readable","columns","card"],stadium:["cinematic","split-left","split-right","full-photo"],leadership:["cards","compact"],achievements:["timeline","cards"]};return typeof value === "string" && allowed[key].includes(value) ? value : fallback;}
function fontFamily(value:unknown,fallback:ClubElementFrame["font_family"]):ClubElementFrame["font_family"]{const allowed=["inherit","arial","arial-black","verdana","tahoma","trebuchet","georgia","times"];return typeof value === "string"&&allowed.includes(value)?value as ClubElementFrame["font_family"]:fallback;}
function textTransform(value:unknown,fallback:ClubElementFrame["text_transform"]):ClubElementFrame["text_transform"]{const allowed=["none","uppercase","lowercase","capitalize"];return typeof value === "string"&&allowed.includes(value)?value as ClubElementFrame["text_transform"]:fallback;}
function colorValue(value:unknown,fallback:string){if(value === "")return "";return typeof value === "string"&&/^#[0-9a-f]{6}$/i.test(value.trim())?value.trim().toLowerCase():fallback;}
function width(value:unknown,fallback:ContentPageWidth):ContentPageWidth{return value === "container" || value === "wide" || value === "full" ? value : fallback;}
function background(value:unknown,fallback:ContentPageBackground):ContentPageBackground{return value === "inherit" || value === "light" || value === "surface" || value === "dark" || value === "brand" ? value : fallback;}
function integer(value:unknown,min:number,max:number,fallback:number){const parsed=Number(value);return Number.isFinite(parsed)?Math.max(min,Math.min(max,Math.round(parsed))):fallback;}
function number(value:unknown,min:number,max:number,fallback:number){const parsed=Number(value);return Number.isFinite(parsed)?Math.max(min,Math.min(max,Math.round(parsed*10)/10)):fallback;}
function isRecord(value:unknown):value is Record<string,unknown>{return typeof value === "object" && value !== null && !Array.isArray(value);}
function clone<T>(value:T):T{return JSON.parse(JSON.stringify(value)) as T;}
