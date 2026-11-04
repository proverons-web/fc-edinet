# FC Edineț v2.29.14 — установка и публикация

1. Распакуйте папку `fc-edinet-v2.29.14` рядом с предыдущими релизами. Папку с действующим `.env.local` пока не удаляйте.
2. Запустите `DEPLOY_FC_EDINET.bat` из новой папки. Скрипт проверяет Supabase-параметры, устанавливает зависимости, запускает QA и `next build`, затем отправляет обновление в GitHub/Vercel.
3. На этапе `[2/8]` должны пройти `qa:site`, `qa:css`, security/editorial/admin/match QA, адаптивный тест и **новый `qa:ui` (20/20)**. Chrome или Edge необходимы для визуальных тестов.
4. Когда Vercel опубликует релиз, проверьте `https://fc-edinet.vercel.app/api/version` (ожидается **2.29.14**) и запустите `npm run qa:live` (ожидается **12/12**).
5. Проведите ручную проверку по `PRODUCTION-CHECKLIST-v2.29.14.md`.

Новый FULL-пакет не содержит `.env.local`, секретов Supabase, `node_modules` или `.next`. Не добавляйте серверные ключи под префиксом `NEXT_PUBLIC_`.

### Полезные команды

```powershell
npm run qa:site
npm run qa:css
npm run qa:ui
npm run qa:responsive
npm run qa:all
npm run build
npm run qa:live
```

**Новых миграций Supabase нет.** CSS-эталон `qa/baselines/ui-v2.29.13-css.json.gz` хранится в репозитории только для визуального сравнения; его содержимое — публичные стили, не секреты.
