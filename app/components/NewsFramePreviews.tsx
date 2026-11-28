"use client";

import { useEffect, useRef, useState } from "react";
import { newsCoverStyle } from "@/lib/news-cover";

const frames = [ ["home", "Главная новость"], ["home-list", "Лента на главной"], ["lead", "Новости — главная"], ["secondary", "Новости — рядом"], ["archive", "Карточка архива"], ["article", "Полная статья"] ] as const;

export default function NewsFramePreviews({ src, x = 50, y = 50, zoom = 100, onFrameRatio }: { src: string; x?: number; y?: number; zoom?: number; onFrameRatio?: (ratio: number) => void }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [selected, setSelected] = useState<typeof frames[number][0]>("home");
  const activeFrame = useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const node=activeFrame.current;
    if(!onFrameRatio || !node)return;
    const update=()=>{const box=node.getBoundingClientRect();if(box.width>0&&box.height>0)onFrameRatio(box.width/box.height);};
    update();const observer=new ResizeObserver(update);observer.observe(node);return()=>observer.disconnect();
  },[device,selected,src ? true : false,onFrameRatio]);
  if (!src) return null;
  const style = newsCoverStyle({cover_position_x:x,cover_position_y:y,cover_zoom:zoom});
  return <div className="newsFramesPanel">
    <div className="newsFramesHead"><span>SAFE ZONE · реальные кадры сайта</span><div><button type="button" aria-pressed={device === "desktop"} onClick={()=>setDevice("desktop")}>ПК</button><button type="button" aria-pressed={device === "mobile"} onClick={()=>setDevice("mobile")}>Телефон</button></div></div>
    <div className="newsFramesGrid">{frames.map(([frame,label])=><figure key={frame} className={onFrameRatio&&selected===frame?"is-selected":""}><div ref={selected===frame?activeFrame:undefined} className="newsFramePreview" data-frame={frame} data-device={device}><img src={src} alt="" style={style}/></div><figcaption>{onFrameRatio?<button type="button" aria-pressed={selected===frame} onClick={()=>setSelected(frame)}>{label}</button>:label}</figcaption></figure>)}</div>
    <small>{onFrameRatio?"Выбери карточку, чтобы увидеть её точную границу на исходном кадре. ":""}В каждом кадре видна та же область изображения, что и на сайте.</small>
  </div>;
}
