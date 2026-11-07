# FC Edineț v2.30.14 — проверка релиза

- `npm run qa:all`: PASS (полный регрессионный набор)
- Общий QA: 176/176
- Стабильность: 22/22
- Mobile Experience: 19/19
- Production Health (офлайн fixture): 9/9
- RUM и безопасность: 22/22
- Responsive Chromium: 59/59
- UI Consistency: 20/20
- TypeScript syntax parse: 298 файлов, 0 синтаксических ошибок
- `scripts/check-deploy.mjs` с тестовыми переменными: PASS
- `npm run typecheck`: не выполнено (npm-пакеты отсутствуют)
- `npm run build`: не выполнено (npm Registry недоступен по DNS)
- SQL-миграция 078: в архиве; на действующей базе НЕ запускалась
- Production deployment: НЕ выполнялся

Важно: проверка синтаксиса TypeScript — не полноценный `tsc --noEmit`.
