"use client";

import { useRef } from "react";
import { setVideoHomepage } from "@/app/admin/media/actions";

export default function MediaHomepageToggle({ videoId, checked }: { videoId: string | number; checked: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={setVideoHomepage} className="mediaHomepageToggleForm">
      <input type="hidden" name="video_id" value={String(videoId)} />
      <input type="hidden" name="show_on_homepage" value="off" />
      <label className="mediaHomepageToggle">
        <input
          type="checkbox"
          name="show_on_homepage"
          value="on"
          defaultChecked={checked}
          onChange={() => formRef.current?.requestSubmit()}
        />
        <span className="mediaHomepageToggleTrack" aria-hidden="true"><i /></span>
        <b>Показывать на главной</b>
      </label>
    </form>
  );
}
