# FC Edineț v2.29.20 — production checklist

- [ ] `DEPLOY_FC_EDINET.bat` завершает все шаги; TypeScript и `next build` успешны.
- [ ] `/api/version` показывает `2.29.20`.
- [ ] `npm run qa:live` проходит.
- [ ] `/admin/data-integrity` открывается и не сообщает о неожиданных расхождениях.
- [ ] На тестовом матче запись гола/замены вызывает пересчёт статистики и не теряет прежние расширенные показатели.
- [ ] При повторном сохранении из устаревшей вкладки появляется сообщение о конфликте.
- [ ] Перевод RU/RO, фото, новости, «Зал славы», календарь и публичные протоколы отображаются как в v2.29.19.
- [ ] При ошибке сохранения статистики не возникает ложного сообщения «Сохранено».

## Scope

`database/069_atomic_player_statistics.sql` устанавливает PostgreSQL-функцию `save_club_player_stats_atomic`, доступную только авторизованным редакторам и администраторам. Запись показателей игроков и смена статуса статистики выполняются в одной транзакции. Сама публикация отчёта и другие операции матч-центра остаются отдельными действиями.

Migration already applied to production Supabase. No existing match rows were modified by installation. Runtime tests of authenticated saves still need a controlled test match.
