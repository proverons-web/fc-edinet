-- FC EDINEȚ v2.1.11 — Visual Editor final audit
-- Persist a one-time repair for older Canvas coordinates created before Safe Zone 3.0.
-- Runtime code also repairs coordinates, so this migration is deliberately conservative:
-- it only clamps horizontal positions while Safe Zone lock is enabled.

-- Published homepage Hero.
update public.homepage_hero
set canvas_config = canvas_config || jsonb_build_object(
  'desktop',
    (canvas_config -> 'desktop') || jsonb_build_object(
      'text_x', least(
        100 - coalesce((canvas_config #>> '{desktop,safe_right}')::numeric, 7) - 27,
        greatest(
          coalesce((canvas_config #>> '{desktop,safe_left}')::numeric, 7) + 27,
          coalesce((canvas_config #>> '{desktop,text_x}')::numeric, 50)
        )
      ),
      'match_x', least(
        100 - coalesce((canvas_config #>> '{desktop,safe_right}')::numeric, 7) - 19,
        greatest(
          coalesce((canvas_config #>> '{desktop,safe_left}')::numeric, 7) + 19,
          coalesce((canvas_config #>> '{desktop,match_x}')::numeric, 50)
        )
      )
    ),
  'tablet',
    (canvas_config -> 'tablet') || jsonb_build_object(
      'text_x', least(
        100 - coalesce((canvas_config #>> '{tablet,safe_right}')::numeric, 6) - 39,
        greatest(
          coalesce((canvas_config #>> '{tablet,safe_left}')::numeric, 6) + 39,
          coalesce((canvas_config #>> '{tablet,text_x}')::numeric, 50)
        )
      ),
      'match_x', least(
        100 - coalesce((canvas_config #>> '{tablet,safe_right}')::numeric, 6) - 26,
        greatest(
          coalesce((canvas_config #>> '{tablet,safe_left}')::numeric, 6) + 26,
          coalesce((canvas_config #>> '{tablet,match_x}')::numeric, 50)
        )
      )
    ),
  'mobile',
    (canvas_config -> 'mobile') || jsonb_build_object(
      'text_x', least(
        100 - coalesce((canvas_config #>> '{mobile,safe_right}')::numeric, 5) - 44,
        greatest(
          coalesce((canvas_config #>> '{mobile,safe_left}')::numeric, 5) + 44,
          coalesce((canvas_config #>> '{mobile,text_x}')::numeric, 50)
        )
      ),
      'match_x', least(
        100 - coalesce((canvas_config #>> '{mobile,safe_right}')::numeric, 5) - 44,
        greatest(
          coalesce((canvas_config #>> '{mobile,safe_left}')::numeric, 5) + 44,
          coalesce((canvas_config #>> '{mobile,match_x}')::numeric, 50)
        )
      )
    )
)
where id = 1
  and canvas_config is not null
  and coalesce((canvas_config ->> 'lock_safe_zone')::boolean, false) = true;

-- Saved Visual Editor draft.
update public.homepage_design_draft
set canvas_config = canvas_config || jsonb_build_object(
  'desktop',
    (canvas_config -> 'desktop') || jsonb_build_object(
      'text_x', least(
        100 - coalesce((canvas_config #>> '{desktop,safe_right}')::numeric, 7) - 27,
        greatest(
          coalesce((canvas_config #>> '{desktop,safe_left}')::numeric, 7) + 27,
          coalesce((canvas_config #>> '{desktop,text_x}')::numeric, 50)
        )
      ),
      'match_x', least(
        100 - coalesce((canvas_config #>> '{desktop,safe_right}')::numeric, 7) - 19,
        greatest(
          coalesce((canvas_config #>> '{desktop,safe_left}')::numeric, 7) + 19,
          coalesce((canvas_config #>> '{desktop,match_x}')::numeric, 50)
        )
      )
    ),
  'tablet',
    (canvas_config -> 'tablet') || jsonb_build_object(
      'text_x', least(
        100 - coalesce((canvas_config #>> '{tablet,safe_right}')::numeric, 6) - 39,
        greatest(
          coalesce((canvas_config #>> '{tablet,safe_left}')::numeric, 6) + 39,
          coalesce((canvas_config #>> '{tablet,text_x}')::numeric, 50)
        )
      ),
      'match_x', least(
        100 - coalesce((canvas_config #>> '{tablet,safe_right}')::numeric, 6) - 26,
        greatest(
          coalesce((canvas_config #>> '{tablet,safe_left}')::numeric, 6) + 26,
          coalesce((canvas_config #>> '{tablet,match_x}')::numeric, 50)
        )
      )
    ),
  'mobile',
    (canvas_config -> 'mobile') || jsonb_build_object(
      'text_x', least(
        100 - coalesce((canvas_config #>> '{mobile,safe_right}')::numeric, 5) - 44,
        greatest(
          coalesce((canvas_config #>> '{mobile,safe_left}')::numeric, 5) + 44,
          coalesce((canvas_config #>> '{mobile,text_x}')::numeric, 50)
        )
      ),
      'match_x', least(
        100 - coalesce((canvas_config #>> '{mobile,safe_right}')::numeric, 5) - 44,
        greatest(
          coalesce((canvas_config #>> '{mobile,safe_left}')::numeric, 5) + 44,
          coalesce((canvas_config #>> '{mobile,match_x}')::numeric, 50)
        )
      )
    )
)
where id = 1
  and canvas_config is not null
  and coalesce((canvas_config ->> 'lock_safe_zone')::boolean, false) = true;
