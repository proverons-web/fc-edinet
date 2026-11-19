FC Edinet v2.30.27 — hotfix старой проверки Club History Pro

Ошибка:
FAIL save requires editor
Club History Pro v2.30.27: 51/52 checks passed

Причина: в новой модели доступа редактирование истории клуба предназначено только администратору, а старый QA-тест по-прежнему требует requireEditor().

ДЕЙСТВИЯ
1. Распакуй всю папку FC_Edinet_v2.30.27_QA_HOTFIX в КОРЕНЬ папки сайта v2.30.27 рядом с package.json и DEPLOY_FC_EDINET.bat.
2. Запусти FC_Edinet_v2.30.27_QA_HOTFIX\FIX_CLUB_HISTORY_QA.bat.
3. Скрипт убедится, что app/admin/club/history/actions.ts содержит requireAdmin() именно в функции сохранения, а маршрут app/admin/club/layout.tsx требует администратора.
4. Скрипт исправит ТОЛЬКО две устаревшие проверки в scripts/qa-club-history-v2307.mjs. Оригинал сохранится ВНЕ проекта в FC_Edinet_QABackups_v2.30.27.
5. Он автоматически запустит обновлённый тест; при ошибке откатит файл.
6. После 52/52 PASS выполни npm run qa:user-roles и DEPLOY_FC_EDINET.bat.

НЕ ИЗМЕНЯЕТ: Supabase, роли, права на сервере, код истории клуба, другие тесты, Vercel, GitHub.
НЕ ПУБЛИКУЕТ автоматически.
НЕ НУЖНА новая SQL-миграция.
Если скрипт не найдёт ожидаемый код, он остановится вместо рискованной замены.
