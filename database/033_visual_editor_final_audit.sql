-- FC EDINEȚ v2.1.11 — Visual Editor final audit
-- Repair invalid anchor coordinates left by older Canvas drafts while Safe Zone lock is enabled.
-- Only coordinates whose CENTER is already outside the configured Safe Zone are repaired.
-- A valid published coordinate is preferred; otherwise the center of the viewport is used.

with source as (
  select d.id, d.canvas_config as draft_cfg, h.canvas_config as published_cfg
  from public.homepage_design_draft d
  cross join public.homepage_hero h
  where d.id = 1
    and h.id = 1
    and coalesce((d.canvas_config ->> 'lock_safe_zone')::boolean, false) = true
), repaired as (
  select id,
    draft_cfg || jsonb_build_object(
      'desktop',
        (draft_cfg -> 'desktop') || jsonb_build_object(
          'text_x', case
            when coalesce((draft_cfg #>> '{desktop,text_x}')::numeric, 50) < coalesce((draft_cfg #>> '{desktop,safe_left}')::numeric, 0)
              or coalesce((draft_cfg #>> '{desktop,text_x}')::numeric, 50) > 100 - coalesce((draft_cfg #>> '{desktop,safe_right}')::numeric, 0)
            then coalesce((published_cfg #>> '{desktop,text_x}')::numeric, 50)
            else coalesce((draft_cfg #>> '{desktop,text_x}')::numeric, 50) end,
          'text_y', case
            when coalesce((draft_cfg #>> '{desktop,text_y}')::numeric, 50) < coalesce((draft_cfg #>> '{desktop,safe_top}')::numeric, 0)
              or coalesce((draft_cfg #>> '{desktop,text_y}')::numeric, 50) > 100 - coalesce((draft_cfg #>> '{desktop,safe_bottom}')::numeric, 0)
            then coalesce((published_cfg #>> '{desktop,text_y}')::numeric, 50)
            else coalesce((draft_cfg #>> '{desktop,text_y}')::numeric, 50) end,
          'match_x', case
            when coalesce((draft_cfg #>> '{desktop,match_x}')::numeric, 50) < coalesce((draft_cfg #>> '{desktop,safe_left}')::numeric, 0)
              or coalesce((draft_cfg #>> '{desktop,match_x}')::numeric, 50) > 100 - coalesce((draft_cfg #>> '{desktop,safe_right}')::numeric, 0)
            then coalesce((published_cfg #>> '{desktop,match_x}')::numeric, 50)
            else coalesce((draft_cfg #>> '{desktop,match_x}')::numeric, 50) end,
          'match_y', case
            when coalesce((draft_cfg #>> '{desktop,match_y}')::numeric, 50) < coalesce((draft_cfg #>> '{desktop,safe_top}')::numeric, 0)
              or coalesce((draft_cfg #>> '{desktop,match_y}')::numeric, 50) > 100 - coalesce((draft_cfg #>> '{desktop,safe_bottom}')::numeric, 0)
            then coalesce((published_cfg #>> '{desktop,match_y}')::numeric, 50)
            else coalesce((draft_cfg #>> '{desktop,match_y}')::numeric, 50) end
        ),
      'tablet',
        (draft_cfg -> 'tablet') || jsonb_build_object(
          'text_x', case
            when coalesce((draft_cfg #>> '{tablet,text_x}')::numeric, 50) < coalesce((draft_cfg #>> '{tablet,safe_left}')::numeric, 0)
              or coalesce((draft_cfg #>> '{tablet,text_x}')::numeric, 50) > 100 - coalesce((draft_cfg #>> '{tablet,safe_right}')::numeric, 0)
            then coalesce((published_cfg #>> '{tablet,text_x}')::numeric, 50)
            else coalesce((draft_cfg #>> '{tablet,text_x}')::numeric, 50) end,
          'text_y', case
            when coalesce((draft_cfg #>> '{tablet,text_y}')::numeric, 50) < coalesce((draft_cfg #>> '{tablet,safe_top}')::numeric, 0)
              or coalesce((draft_cfg #>> '{tablet,text_y}')::numeric, 50) > 100 - coalesce((draft_cfg #>> '{tablet,safe_bottom}')::numeric, 0)
            then coalesce((published_cfg #>> '{tablet,text_y}')::numeric, 50)
            else coalesce((draft_cfg #>> '{tablet,text_y}')::numeric, 50) end,
          'match_x', case
            when coalesce((draft_cfg #>> '{tablet,match_x}')::numeric, 50) < coalesce((draft_cfg #>> '{tablet,safe_left}')::numeric, 0)
              or coalesce((draft_cfg #>> '{tablet,match_x}')::numeric, 50) > 100 - coalesce((draft_cfg #>> '{tablet,safe_right}')::numeric, 0)
            then coalesce((published_cfg #>> '{tablet,match_x}')::numeric, 50)
            else coalesce((draft_cfg #>> '{tablet,match_x}')::numeric, 50) end,
          'match_y', case
            when coalesce((draft_cfg #>> '{tablet,match_y}')::numeric, 50) < coalesce((draft_cfg #>> '{tablet,safe_top}')::numeric, 0)
              or coalesce((draft_cfg #>> '{tablet,match_y}')::numeric, 50) > 100 - coalesce((draft_cfg #>> '{tablet,safe_bottom}')::numeric, 0)
            then coalesce((published_cfg #>> '{tablet,match_y}')::numeric, 50)
            else coalesce((draft_cfg #>> '{tablet,match_y}')::numeric, 50) end
        ),
      'mobile',
        (draft_cfg -> 'mobile') || jsonb_build_object(
          'text_x', case
            when coalesce((draft_cfg #>> '{mobile,text_x}')::numeric, 50) < coalesce((draft_cfg #>> '{mobile,safe_left}')::numeric, 0)
              or coalesce((draft_cfg #>> '{mobile,text_x}')::numeric, 50) > 100 - coalesce((draft_cfg #>> '{mobile,safe_right}')::numeric, 0)
            then coalesce((published_cfg #>> '{mobile,text_x}')::numeric, 50)
            else coalesce((draft_cfg #>> '{mobile,text_x}')::numeric, 50) end,
          'text_y', case
            when coalesce((draft_cfg #>> '{mobile,text_y}')::numeric, 50) < coalesce((draft_cfg #>> '{mobile,safe_top}')::numeric, 0)
              or coalesce((draft_cfg #>> '{mobile,text_y}')::numeric, 50) > 100 - coalesce((draft_cfg #>> '{mobile,safe_bottom}')::numeric, 0)
            then coalesce((published_cfg #>> '{mobile,text_y}')::numeric, 50)
            else coalesce((draft_cfg #>> '{mobile,text_y}')::numeric, 50) end,
          'match_x', case
            when coalesce((draft_cfg #>> '{mobile,match_x}')::numeric, 50) < coalesce((draft_cfg #>> '{mobile,safe_left}')::numeric, 0)
              or coalesce((draft_cfg #>> '{mobile,match_x}')::numeric, 50) > 100 - coalesce((draft_cfg #>> '{mobile,safe_right}')::numeric, 0)
            then coalesce((published_cfg #>> '{mobile,match_x}')::numeric, 50)
            else coalesce((draft_cfg #>> '{mobile,match_x}')::numeric, 50) end,
          'match_y', case
            when coalesce((draft_cfg #>> '{mobile,match_y}')::numeric, 50) < coalesce((draft_cfg #>> '{mobile,safe_top}')::numeric, 0)
              or coalesce((draft_cfg #>> '{mobile,match_y}')::numeric, 50) > 100 - coalesce((draft_cfg #>> '{mobile,safe_bottom}')::numeric, 0)
            then coalesce((published_cfg #>> '{mobile,match_y}')::numeric, 50)
            else coalesce((draft_cfg #>> '{mobile,match_y}')::numeric, 50) end
        )
    ) as canvas_config
  from source
)
update public.homepage_design_draft d
set canvas_config = r.canvas_config
from repaired r
where d.id = r.id;
