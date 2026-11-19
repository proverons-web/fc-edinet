FC EDINET v2.30.27 — PRODUCTION SAFETY QA HOTFIX

СИМПТОМ:
Production Safety v2.30.27: 15/16 passed.
В консоли распечатан огромный текст STEP-2.30.27.txt.

ПРИЧИНА:
QA проверяет, что инструкция одновременно объясняет резервное копирование
базы Supabase и расширение Git-архива `.bundle`. В текущем STEP написано
"Git bundle", но нет буквального ".bundle". Это ошибка документации.

УСТАНОВКА:
1. Распакуй ВСЮ папку FC_Edinet_v2.30.27_PRODUCTION_SAFETY_QA_HOTFIX
   в КОРНЕ проекта, рядом с package.json, STEP-2.30.27.txt и DEPLOY_FC_EDINET.bat.
2. Запусти внутри папки FIX_PRODUCTION_SAFETY_QA.bat.
3. Скрипт проверит версию 2.30.27, исходный QA и действительный Git-бэкап.
4. Создаст резервную копию STEP вне проекта в FC_Edinet_QABackups_v2.30.27.
5. Добавит одну поясняющую строку о файле .bundle. НИ ОДИН QA-тест не изменится.
6. Автоматически запустит node scripts/qa-production-safety-v2326.mjs.
   Успех: Production Safety v2.30.27: 16/16 passed.
7. Если проверка не пройдёт, оригинальная инструкция восстановится.
8. После успешного hotfix запусти DEPLOY_FC_EDINET.bat из корня проекта.

Не меняет код сайта, админку, права, Git, Vercel, Supabase или SQL.

Предупреждения о типе Node-модуля не являются причиной этого сбоя.
