FC EDINET v2.30.27 — исправление ошибки TypeScript TS2307

СИМПТОМ:
files/lib/admin-role-permissions.ts: Cannot find module './types'
UPDATE_FC_EDINET_v2.30.27/files/lib/admin-role-permissions.ts: Cannot find module './types'

ПРИЧИНА:
Папки установочного обновления лежат внутри исходного проекта и попадают под
общую TypeScript проверку. Рабочий файл lib/admin-role-permissions.ts исправен.

УСТАНОВКА:
1. Распакуй ВСЮ папку FC_Edinet_v2.30.27_TYPECHECK_CLEANUP_HOTFIX в корень
   проекта (там, где лежат package.json и DEPLOY_FC_EDINET.bat).
2. Запусти FIX_TYPECHECK_EXTRA_FILES.bat внутри этой папки.
3. Скрипт сначала проверит, что проект — fc-edinet 2.30.27, что настоящий модуль
   lib/admin-role-permissions.ts и файл lib/types.ts существуют, а лишние копии
   в папках files/ и UPDATE_FC_EDINET_v2.30.27/ совпадают с рабочим модулем.
4. Только после этого скрипт ПЕРЕМЕСТИТ две папки обновления рядом с проектом,
   в FC_Edinet_InstallerArchives_v2.30.27/typecheck-cleanup-... .
   Ничего не удаляется. Для ручного восстановления записывается инструкция.
5. Скрипт запускает npm run typecheck. Если ошибок нет — заново запусти
   DEPLOY_FC_EDINET.bat из корня проекта.
6. Если возникнет НОВАЯ TypeScript ошибка, исправление не обходится молча:
   сохрани её текст и отправь для анализа.

НЕ ИЗМЕНЯЕТ:
- файлы приложения, импорты, права ролей, серверные действия;
- Supabase, SQL и GitHub;
- архивы резервных копий из прежних шагов;
- основные QA проверки.

Если папки уже перенесены, скрипт безопасно сообщит, что делать ничего не надо.
