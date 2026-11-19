FC Edinet v2.30.27 — Performance & Stability QA Hotfix

СИМПТОМ
FAIL Menu mutations are editor-protected before tag invalidation
Expected values to be strictly equal: 0 !== 7
Performance & Stability v2.30.27: 21/22 checks passed.

ПРИЧИНА
В новой версии все семь операций конструктора сайта работают только для
администратора (requireAdmin), но старый QA-тест проверяет requireEditor.
Сам тест устарел: защита доступа не должна ослабляться.

УСТАНОВКА
1. Распакуй ВСЮ папку FC_Edinet_v2.30.27_STABILITY_QA_HOTFIX
   В КОРЕНЬ проекта v2.30.27, рядом с package.json и DEPLOY_FC_EDINET.bat.
2. Запусти FC_Edinet_v2.30.27_STABILITY_QA_HOTFIX\FIX_STABILITY_QA.bat.
3. Скрипт проверит, что ВСЕ 7 действий menu/site builder используют
   requireAdmin(), вызывают инвалидирование public menu cache,
   а маршрут /admin/site-builder закрыт для редактора.
4. Если это так, он заменит ОДНО устаревшее ожидание внутри
   scripts/qa-performance-stability-v2310.mjs.
5. Исходный тест сохраняется ВНЕ проекта в
   FC_Edinet_QABackups_v2.30.27.
6. Тест Performance & Stability запускается автоматически; успех = 22/22.
   При провале теста старый QA восстанавливается.
7. После 22/22 запусти DEPLOY_FC_EDINET.bat из корня проекта.

НЕ МЕНЯЕТ: серверный код, роли, права в базе, настройки пользователей,
действующие публикации, Vercel, Supabase, GitHub.
НОВАЯ SQL-МИГРАЦИЯ: НЕ НУЖНА.

Если появится HOTFIX BLOCKED, пришли текст ошибки — скрипт специально
останавливается, не ослабляя систему безопасности.

Предупреждение MODULE_TYPELESS_PACKAGE_JSON не является причиной DEPLOY FAILED.
Нельзя просто менять число 7 на 0: это отключит важный контракт безопасности.
