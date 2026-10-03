"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import PageHeroShell from "@/app/components/PageHeroShell";
import ClubRichContent from "@/app/components/ClubRichContent";
import type { ClubAchievement, ClubLeader, ClubProfile, SitePageDesignSnapshot } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { localized } from "@/lib/i18n";
import { heroLayerStyle, heroLayerVisible } from "@/lib/hero-builder";
import { mergeTranslatedTextIntoRichContent } from "@/lib/club-rich-content";
import {
  frameCssVariables,
  imageFocusCssVariables,
  normalizeClubPageLayout,
  sectionClass,
  sectionStyle,
  type BuilderBreakpoint,
  type ClubElementFrame,
  type ClubElementKey,
  type ClubPageLayoutConfig,
  type ClubSectionConfig,
} from "@/lib/content-page-builder";

type ClubText = {
  founded:string; city:string; colors:string; defaultMotto:string; defaultColors:string;
  about:string; aboutEmpty:string; contacts:string; contactTitle:string; phone:string; address:string;
  historyEyebrow:string; history:string; historyEmpty:string; arena:string; stadiumPhoto:string; capacity:string;
  stadiumDescriptionEmpty:string; people:string; leadership:string; leadershipEmpty:string;
  resultsHistory:string; achievements:string; achievementsEmpty:string;
};

type SelectedElement = { sectionKey:string; elementKey:string } | null;

export default function ClubPageCanvas({
  locale,
  text,
  profile,
  leaders,
  achievements,
  design,
  initialLayout,
  builderMode = false,
}: {
  locale: Locale;
  text: ClubText;
  profile: ClubProfile | null;
  leaders: ClubLeader[];
  achievements: ClubAchievement[];
  design: SitePageDesignSnapshot;
  initialLayout: ClubPageLayoutConfig;
  builderMode?: boolean;
}) {
  const [layout, setLayout] = useState(() => normalizeClubPageLayout(initialLayout));
  const [breakpoint, setBreakpoint] = useState<BuilderBreakpoint>("desktop");
  const [selected, setSelected] = useState<SelectedElement>(null);

  useEffect(() => {
    if (!builderMode) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as {type?:string; layout?:unknown; breakpoint?:BuilderBreakpoint; selected?:SelectedElement};
      if (data?.type !== "fc-club-builder-layout") return;
      if (data.layout) setLayout(normalizeClubPageLayout(data.layout));
      if (data.breakpoint) setBreakpoint(data.breakpoint);
      setSelected(data.selected ?? null);
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({type:"fc-club-builder-ready"}, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, [builderMode]);

  const patchFrame = (sectionKey: string, elementKey: string, next: ClubElementFrame) => {
    setLayout((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => section.key === sectionKey ? {
        ...section,
        frames: {
          ...section.frames,
          [breakpoint]: { ...section.frames[breakpoint], [elementKey]: next },
        },
      } : section),
    }));
    if (builderMode) window.parent.postMessage({type:"fc-club-builder-frame", sectionKey, elementKey, breakpoint, frame:next}, window.location.origin);
  };

  const patchImageFocus = (sectionKey: string, next: {x:number;y:number}) => {
    setLayout((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => section.key === sectionKey ? {
        ...section,
        image_focus: {
          ...(section.image_focus ?? {desktop:{x:50,y:52},tablet:{x:50,y:52},mobile:{x:50,y:52}}),
          [breakpoint]: next,
        },
      } : section),
    }));
    if (builderMode) window.parent.postMessage({type:"fc-club-builder-image-focus", sectionKey, breakpoint, focus:next}, window.location.origin);
  };

  const selectElement = (sectionKey:string, elementKey:string) => {
    if (!builderMode) return;
    setSelected({sectionKey,elementKey});
    window.parent.postMessage({type:"fc-club-builder-select",sectionKey,elementKey}, window.location.origin);
  };

  const clubName = localized(profile?.club_name, profile?.club_name_ro, locale) || "FC Edineț";
  const city = localized(profile?.city, profile?.city_ro, locale) || "Edineț";
  const motto = localized(profile?.motto, profile?.motto_ro, locale) || text.defaultMotto;
  const colors = localized(profile?.club_colors, profile?.club_colors_ro, locale) || text.defaultColors;
  const address = localized(profile?.address, profile?.address_ro, locale);
  const stadiumName = localized(profile?.stadium_name, profile?.stadium_name_ro, locale) || "Stadionul Edineț";
  const stadiumAddress = localized(profile?.stadium_address, profile?.stadium_address_ro, locale);
  const stadiumDescription = localized(profile?.stadium_description, profile?.stadium_description_ro, locale) || text.stadiumDescriptionEmpty;
  const aboutRich = locale === "ro" ? (profile?.about_rich_content_ro ?? mergeTranslatedTextIntoRichContent(profile?.about_rich_content, profile?.about_text_ro)) : profile?.about_rich_content;
  const historyRich = locale === "ro" ? (profile?.history_rich_content_ro ?? mergeTranslatedTextIntoRichContent(profile?.history_rich_content, profile?.history_text_ro)) : profile?.history_rich_content;
  const stadiumRich = locale === "ro" ? (profile?.stadium_rich_content_ro ?? mergeTranslatedTextIntoRichContent(profile?.stadium_rich_content, profile?.stadium_description_ro)) : profile?.stadium_rich_content;
  const aboutFallback = localized(profile?.about_text, profile?.about_text_ro, locale) || text.aboutEmpty;
  const historyFallback = localized(profile?.history_text, profile?.history_text_ro, locale) || text.historyEmpty;

  const renderSection = (section: ClubSectionConfig) => {
    if (!section.visible) return null;
    const common = { className: sectionClass(section), style: sectionStyle(section), key: section.key };

    if (section.layout_mode === "manual") {
      return <section {...common} data-builder-section={section.key}>
        <BuilderInner manual>
          {section.key === "about" && <>
            <ManualFrame section={section} elementKey="about-copy" breakpoint={breakpoint} builderMode={builderMode} selected={selected} onSelect={selectElement} onChange={patchFrame}>
              <div className="clubAboutCopy"><p className="eyebrow blue">{text.about}</p><h2>{clubName}</h2><ClubRichContent content={aboutRich} fallbackText={aboutFallback}/></div>
            </ManualFrame>
            <ManualFrame section={section} elementKey="about-contact" breakpoint={breakpoint} builderMode={builderMode} selected={selected} onSelect={selectElement} onChange={patchFrame}>
              <aside className="clubContactCard"><p className="eyebrow blue">{text.contacts}</p><h3>{text.contactTitle}</h3><Contact label="Email" value={profile?.email}/><Contact label={text.phone} value={profile?.phone}/><Contact label={text.address} value={address}/></aside>
            </ManualFrame>
          </>}
          {section.key === "history" && <ManualFrame section={section} elementKey="history-copy" breakpoint={breakpoint} builderMode={builderMode} selected={selected} onSelect={selectElement} onChange={patchFrame}>
            <div className="clubHistoryContent"><p className="eyebrow blue">{text.historyEyebrow}</p><h2>{text.history}</h2><ClubRichContent content={historyRich} fallbackText={historyFallback}/></div>
          </ManualFrame>}
          {section.key === "stadium" && <>
            <ManualFrame section={section} elementKey="stadium-heading" breakpoint={breakpoint} builderMode={builderMode} selected={selected} onSelect={selectElement} onChange={patchFrame}>
              <div className="sectionHeading clubBuilderLooseHeading"><div><p className="eyebrow">{text.arena}</p><h2>{stadiumName}</h2></div></div>
            </ManualFrame>
            <ManualFrame section={section} elementKey="stadium-image" breakpoint={breakpoint} builderMode={builderMode} selected={selected} onSelect={selectElement} onChange={patchFrame} image>
              <div className="clubStadiumImage clubBuilderManualImage" style={{...imageFocusCssVariables(section),"--stadium-radius":`${section.image_radius ?? 28}px`,"--stadium-fit":section.image_fit ?? "cover"} as CSSProperties}>
                {profile?.stadium_image_url ? <img src={profile.stadium_image_url} alt={stadiumName}/> : <span>{text.stadiumPhoto}</span>}
                <PhotoFocusDrag builderMode={builderMode} active={selected?.sectionKey==="stadium"&&selected.elementKey==="stadium-image"} focus={section.image_focus?.[breakpoint]??{x:50,y:52}} onChange={(next)=>patchImageFocus("stadium",next)}/>
              </div>
            </ManualFrame>
            <ManualFrame section={section} elementKey="stadium-info" breakpoint={breakpoint} builderMode={builderMode} selected={selected} onSelect={selectElement} onChange={patchFrame}>
              <div className="clubStadiumInfo"><div className="clubStadiumFacts"><Fact label={text.capacity} value={profile?.stadium_capacity ? profile.stadium_capacity.toLocaleString(locale === "ro" ? "ro-RO" : "ru-RU") : "—"}/><Fact label={text.address} value={stadiumAddress || "—"}/></div><ClubRichContent content={stadiumRich} fallbackText={stadiumDescription}/></div>
            </ManualFrame>
          </>}
          {section.key === "leadership" && <>
            <ManualFrame section={section} elementKey="leadership-heading" breakpoint={breakpoint} builderMode={builderMode} selected={selected} onSelect={selectElement} onChange={patchFrame}>
              <div className="sectionHeading clubBuilderLooseHeading"><div><p className="eyebrow blue">{text.people}</p><h2>{text.leadership}</h2></div></div>
            </ManualFrame>
            <ManualFrame section={section} elementKey="leadership-grid" breakpoint={breakpoint} builderMode={builderMode} selected={selected} onSelect={selectElement} onChange={patchFrame}>
              {leaders.length ? <div className={`clubLeadershipGrid clubLeadershipVariant-${section.variant}`} style={{"--leadership-cols":section.columns ?? 3} as CSSProperties}>{leaders.map((leader)=><LeaderCard key={leader.id} leader={leader} locale={locale}/>)}</div> : <div className="adminEmpty">{text.leadershipEmpty}</div>}
            </ManualFrame>
          </>}
          {section.key === "achievements" && <>
            <ManualFrame section={section} elementKey="achievements-heading" breakpoint={breakpoint} builderMode={builderMode} selected={selected} onSelect={selectElement} onChange={patchFrame}>
              <div className="sectionHeading clubBuilderLooseHeading"><div><p className="eyebrow">{text.resultsHistory}</p><h2>{text.achievements}</h2></div></div>
            </ManualFrame>
            <ManualFrame section={section} elementKey="achievements-list" breakpoint={breakpoint} builderMode={builderMode} selected={selected} onSelect={selectElement} onChange={patchFrame}>
              {achievements.length ? <AchievementList items={achievements} locale={locale} variant={section.variant}/> : <div className="clubDarkEmpty">{text.achievementsEmpty}</div>}
            </ManualFrame>
          </>}
        </BuilderInner>
      </section>;
    }

    switch (section.key) {
      case "about":
        return <section {...common} className={`${common.className} clubAboutSection`}><BuilderInner>
          <div className={`clubStoryGrid clubAboutVariant-${section.variant}`}>
            <Selectable builderMode={builderMode} selected={selected} sectionKey="about" elementKey="about-copy" onSelect={selectElement}><div className="clubAboutCopy"><p className="eyebrow blue">{text.about}</p><h2>{clubName}</h2><ClubRichContent content={aboutRich} fallbackText={aboutFallback}/></div></Selectable>
            <Selectable builderMode={builderMode} selected={selected} sectionKey="about" elementKey="about-contact" onSelect={selectElement}><aside className="clubContactCard"><p className="eyebrow blue">{text.contacts}</p><h3>{text.contactTitle}</h3><Contact label="Email" value={profile?.email}/><Contact label={text.phone} value={profile?.phone}/><Contact label={text.address} value={address}/></aside></Selectable>
          </div>
        </BuilderInner></section>;
      case "history":
        return <section {...common} className={`${common.className} clubHistorySection`}><BuilderInner><Selectable builderMode={builderMode} selected={selected} sectionKey="history" elementKey="history-copy" onSelect={selectElement}><div className={`clubHistoryContent clubHistoryVariant-${section.variant}`}><p className="eyebrow blue">{text.historyEyebrow}</p><h2>{text.history}</h2><ClubRichContent content={historyRich} fallbackText={historyFallback}/></div></Selectable></BuilderInner></section>;
      case "stadium": {
        const photoStyle = {...imageFocusCssVariables(section),"--stadium-image-height":"520px","--stadium-radius":`${section.image_radius ?? 28}px`,"--stadium-fit":section.image_fit ?? "cover"} as CSSProperties;
        return <section {...common} className={`${common.className} clubStadiumSection`}><BuilderInner>
          <Selectable builderMode={builderMode} selected={selected} sectionKey="stadium" elementKey="stadium-heading" onSelect={selectElement}><div className="sectionHeading"><div><p className="eyebrow">{text.arena}</p><h2>{stadiumName}</h2></div></div></Selectable>
          <div className={`clubStadiumBuilder clubStadiumVariant-${section.variant}`} style={photoStyle}>
            <Selectable builderMode={builderMode} selected={selected} sectionKey="stadium" elementKey="stadium-image" onSelect={selectElement}><div className="clubStadiumImage">{profile?.stadium_image_url ? <img src={profile.stadium_image_url} alt={stadiumName}/> : <span>{text.stadiumPhoto}</span>}<PhotoFocusDrag builderMode={builderMode} active={selected?.sectionKey==="stadium"&&selected.elementKey==="stadium-image"} focus={section.image_focus?.[breakpoint]??{x:50,y:52}} onChange={(next)=>patchImageFocus("stadium",next)}/></div></Selectable>
            <Selectable builderMode={builderMode} selected={selected} sectionKey="stadium" elementKey="stadium-info" onSelect={selectElement}><div className="clubStadiumInfo"><div className="clubStadiumFacts"><Fact label={text.capacity} value={profile?.stadium_capacity ? profile.stadium_capacity.toLocaleString(locale === "ro" ? "ro-RO" : "ru-RU") : "—"}/><Fact label={text.address} value={stadiumAddress || "—"}/></div><ClubRichContent content={stadiumRich} fallbackText={stadiumDescription}/></div></Selectable>
          </div>
        </BuilderInner></section>;
      }
      case "leadership":
        return <section {...common} className={`${common.className} clubLeadershipSection`}><BuilderInner>
          <Selectable builderMode={builderMode} selected={selected} sectionKey="leadership" elementKey="leadership-heading" onSelect={selectElement}><div className="sectionHeading"><div><p className="eyebrow blue">{text.people}</p><h2>{text.leadership}</h2></div></div></Selectable>
          <Selectable builderMode={builderMode} selected={selected} sectionKey="leadership" elementKey="leadership-grid" onSelect={selectElement}>{leaders.length ? <div className={`clubLeadershipGrid clubLeadershipVariant-${section.variant}`} style={{"--leadership-cols":section.columns ?? 3} as CSSProperties}>{leaders.map((leader)=><LeaderCard key={leader.id} leader={leader} locale={locale}/>)}</div> : <div className="adminEmpty">{text.leadershipEmpty}</div>}</Selectable>
        </BuilderInner></section>;
      case "achievements":
        return <section {...common} className={`${common.className} clubAchievementsSection`}><BuilderInner>
          <Selectable builderMode={builderMode} selected={selected} sectionKey="achievements" elementKey="achievements-heading" onSelect={selectElement}><div className="sectionHeading"><div><p className="eyebrow">{text.resultsHistory}</p><h2>{text.achievements}</h2></div></div></Selectable>
          <Selectable builderMode={builderMode} selected={selected} sectionKey="achievements" elementKey="achievements-list" onSelect={selectElement}>{achievements.length ? <AchievementList items={achievements} locale={locale} variant={section.variant}/> : <div className="clubDarkEmpty">{text.achievementsEmpty}</div>}</Selectable>
        </BuilderInner></section>;
    }
  };

  return <main className={builderMode ? "clubBuilderPreviewDocument" : undefined}>
    <PageHeroShell design={design} className="clubHero" contentClassName="container clubHeroInner" contentImageUrl={profile?.hero_image_url}>
      <>{heroLayerVisible(design.layer_config,"intro") && <div className="clubHeroIntro" style={heroLayerStyle(design.layer_config,"intro")}>{design.show_eyebrow && <p className="eyebrow">{city.toUpperCase()} • MOLDOVA</p>}<h1>{clubName}</h1>{design.show_description && <p className="clubHeroMotto">{motto}</p>}</div>}{heroLayerVisible(design.layer_config,"facts") && <div className="clubHeroFacts" style={heroLayerStyle(design.layer_config,"facts")}><Fact label={text.founded} value={profile?.founded_year ? String(profile.founded_year) : "—"}/><Fact label={text.city} value={city}/><Fact label={text.colors} value={colors}/></div>}</>
    </PageHeroShell>
    {layout.sections.map(renderSection)}
  </main>;
}

function BuilderInner({children,manual=false}:{children:ReactNode;manual?:boolean}) { return <div className={`contentBuilderInner ${manual?"clubManualCanvas":""}`}>{children}</div>; }

function ManualFrame({section,elementKey,breakpoint,builderMode,selected,onSelect,onChange,image=false,children}:{section:ClubSectionConfig;elementKey:ClubElementKey;breakpoint:BuilderBreakpoint;builderMode:boolean;selected:SelectedElement;onSelect:(sectionKey:string,elementKey:string)=>void;onChange:(sectionKey:string,elementKey:string,next:ClubElementFrame)=>void;image?:boolean;children:ReactNode}) {
  const current = section.frames[breakpoint][elementKey];
  const interaction = useRef<{mode:"move"|"resize";startX:number;startY:number;frame:ClubElementFrame;parentWidth:number}|null>(null);
  const active = selected?.sectionKey===section.key && selected.elementKey===elementKey;
  const begin = (mode:"move"|"resize") => (event:ReactPointerEvent<HTMLButtonElement>) => {
    if (!builderMode) return;
    event.preventDefault(); event.stopPropagation();
    const parent = event.currentTarget.closest(".clubManualCanvas") as HTMLElement | null;
    interaction.current = {mode,startX:event.clientX,startY:event.clientY,frame:{...current},parentWidth:Math.max(1,parent?.getBoundingClientRect().width ?? 1)};
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect(section.key,elementKey);
  };
  const move = (event:ReactPointerEvent<HTMLButtonElement>) => {
    const state = interaction.current; if (!state) return;
    event.preventDefault(); event.stopPropagation();
    const dx = event.clientX-state.startX; const dy=event.clientY-state.startY;
    if (state.mode==="move") {
      onChange(section.key,elementKey,{...state.frame,x:round1(state.frame.x+(dx/state.parentWidth)*100),y:Math.round(state.frame.y+dy)});
    } else {
      onChange(section.key,elementKey,{...state.frame,width:Math.max(5,round1(state.frame.width+(dx/state.parentWidth)*100)),height:Math.max(0,Math.round((state.frame.height || 120)+dy))});
    }
  };
  const end = (event:ReactPointerEvent<HTMLButtonElement>) => { if (!interaction.current) return; event.preventDefault(); interaction.current=null; try{event.currentTarget.releasePointerCapture(event.pointerId);}catch{} };
  return <div className={`clubManualFrame ${image?"is-image":""} ${builderMode?"is-builder":""} ${active?"is-selected":""}`} style={frameCssVariables(section.frames,elementKey)} data-builder-element={elementKey} onClick={(e)=>{if(builderMode){e.preventDefault();e.stopPropagation();onSelect(section.key,elementKey);}}}>
    {children}
    {builderMode && <><button type="button" className="clubBuilderDragHandle" title="Перетащить" onPointerDown={begin("move")} onPointerMove={move} onPointerUp={end}>✥</button><button type="button" className="clubBuilderResizeHandle" title="Изменить размер" onPointerDown={begin("resize")} onPointerMove={move} onPointerUp={end}>↘</button></>}
  </div>;
}

function Selectable({builderMode,selected,sectionKey,elementKey,onSelect,children}:{builderMode:boolean;selected:SelectedElement;sectionKey:string;elementKey:string;onSelect:(sectionKey:string,elementKey:string)=>void;children:ReactNode}) {
  if (!builderMode) return <>{children}</>;
  const active=selected?.sectionKey===sectionKey&&selected.elementKey===elementKey;
  return <div className={`clubTemplateSelectable ${active?"is-selected":""}`} onClick={(e)=>{e.preventDefault();e.stopPropagation();onSelect(sectionKey,elementKey);}}>{children}</div>;
}

function LeaderCard({leader,locale}:{leader:ClubLeader;locale:Locale}) { return <article className="clubLeaderCard"><div className="clubLeaderPhoto">{leader.photo_url ? <img src={leader.photo_url} alt={leader.name}/> : <span>FCE</span>}</div><div><span>{localized(leader.role, leader.role_ro, locale)}</span><h3>{leader.name}</h3>{localized(leader.bio, leader.bio_ro, locale) && <p>{localized(leader.bio, leader.bio_ro, locale)}</p>}</div></article>; }
function AchievementList({items,locale,variant}:{items:ClubAchievement[];locale:Locale;variant:string}) { return <div className={`clubTimeline clubAchievementsVariant-${variant}`}>{items.map((item)=><article key={item.id}><div className="clubTimelineYear">{item.year || "—"}</div><div><h3>{localized(item.title,item.title_ro,locale)}</h3>{localized(item.description,item.description_ro,locale)&&<p>{localized(item.description,item.description_ro,locale)}</p>}</div></article>)}</div>; }
function Fact({label,value}:{label:string;value:string}) { return <div className="clubFact"><span>{label}</span><strong>{value}</strong></div>; }
function Contact({label,value}:{label:string;value:string|null|undefined}) { return <div className="clubContactRow"><span>{label}</span><strong>{value || "—"}</strong></div>; }
function PhotoFocusDrag({builderMode,active,focus,onChange}:{builderMode:boolean;active:boolean;focus:{x:number;y:number};onChange:(next:{x:number;y:number})=>void}) {
  const interaction=useRef<{startX:number;startY:number;focus:{x:number;y:number};width:number;height:number}|null>(null);
  if(!builderMode||!active)return null;
  const begin=(event:ReactPointerEvent<HTMLButtonElement>)=>{event.preventDefault();event.stopPropagation();const host=event.currentTarget.parentElement;const rect=host?.getBoundingClientRect();interaction.current={startX:event.clientX,startY:event.clientY,focus:{...focus},width:Math.max(1,rect?.width??1),height:Math.max(1,rect?.height??1)};event.currentTarget.setPointerCapture(event.pointerId);};
  const move=(event:ReactPointerEvent<HTMLButtonElement>)=>{const state=interaction.current;if(!state)return;event.preventDefault();event.stopPropagation();const dx=event.clientX-state.startX;const dy=event.clientY-state.startY;onChange({x:clamp(Math.round(state.focus.x-(dx/state.width)*100),0,100),y:clamp(Math.round(state.focus.y-(dy/state.height)*100),0,100)});};
  const end=(event:ReactPointerEvent<HTMLButtonElement>)=>{interaction.current=null;try{event.currentTarget.releasePointerCapture(event.pointerId);}catch{}};
  return <button type="button" className="clubBuilderImageFocusDrag" onPointerDown={begin} onPointerMove={move} onPointerUp={end} title="Тяни фото внутри рамки"><span>✥ ФОКУС ФОТО</span><small>X {focus.x}% · Y {focus.y}%</small></button>;
}
function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value));}
function round1(value:number){return Math.round(value*10)/10;}
