"use client";

import { useState } from "react";

type YouTubePlayerProps = {
  videoId: string;
  title: string;
  className?: string;
  facadeClassName?: string;
};

export default function YouTubePlayer({
  videoId,
  title,
  className = "",
  facadeClassName = "",
}: YouTubePlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [thumbnail, setThumbnail] = useState(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`);

  return (
    <div className={`siteYouTubePlayer ${className}`.trim()}>
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className={`siteYouTubeFacade ${facadeClassName}`.trim()}
          onClick={() => setPlaying(true)}
          aria-label={`Смотреть видео: ${title}`}
        >
          <img
            src={thumbnail}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setThumbnail(`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`)}
          />
          <span className="siteYouTubePlay" aria-hidden="true">▶</span>
        </button>
      )}
    </div>
  );
}
