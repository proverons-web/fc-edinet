# FC Edineț v1.5 — публикация на Vercel

Эта версия подготовлена к первому production-деплою.

## Что уже находится в облаке

Supabase:
- Database
- Auth
- Storage

После деплоя Next.js будет работать на Vercel и домашний компьютер
для работы сайта больше не потребуется.

---

# 1. Локальная проверка

Открой PowerShell в папке проекта:

```powershell
npm install
npm run build
```

Если build успешный:

```powershell
npm run dev
```

Проверь:

- http://localhost:3000
- http://localhost:3000/news
- http://localhost:3000/team
- http://localhost:3000/matches
- http://localhost:3000/standings
- http://localhost:3000/club
- http://localhost:3000/media
- http://localhost:3000/login
- http://localhost:3000/admin
- http://localhost:3000/api/health
- http://localhost:3000/robots.txt
- http://localhost:3000/sitemap.xml

---

# 2. Переменные локальной среды

Файл `.env.local` должен содержать:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`.env.local` НЕ загружаем в GitHub.

---

# 3. Создать Git-репозиторий

В корне проекта:

```powershell
git init
git add .
git commit -m "FC Edinet v1.5 production ready"
git branch -M main
```

Создай пустой репозиторий GitHub.

После создания GitHub покажет адрес репозитория.

Пример:

```powershell
git remote add origin https://github.com/YOUR_NAME/fc-edinet.git
git push -u origin main
```

---

# 4. Импортировать проект в Vercel

Vercel:

1. Add New
2. Project
3. Import Git Repository
4. Выбрать `fc-edinet`
5. Framework Preset: Next.js
6. Root Directory: `./`
7. Build Command: оставить автоматически
8. Output Directory: оставить автоматически

До нажатия Deploy добавь Environment Variables.

---

# 5. Environment Variables в Vercel

Project -> Settings -> Environment Variables.

Добавить:

```text
NEXT_PUBLIC_SUPABASE_URL
```

Значение — то же, что в `.env.local`.

Добавить:

```text
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Значение — то же, что в `.env.local`.

Для первого deployment можно временно НЕ задавать
`NEXT_PUBLIC_SITE_URL`.
Код сможет использовать адрес Vercel автоматически.

После первого deploy Vercel даст адрес примерно:

```text
https://fc-edinet-xxxxx.vercel.app
```

После этого рекомендуется добавить:

```text
NEXT_PUBLIC_SITE_URL=https://fc-edinet-xxxxx.vercel.app
```

и сделать Redeploy.

После подключения собственного домена поменять на:

```text
NEXT_PUBLIC_SITE_URL=https://YOUR-DOMAIN
```

---

# 6. Supabase Auth — production URL

Supabase Dashboard:

Authentication -> URL Configuration

Site URL:
```text
https://YOUR-VERCEL-DOMAIN
```

Redirect URLs добавить:
```text
https://YOUR-VERCEL-DOMAIN/**
```

Для локальной разработки также оставить разрешённым:
```text
http://localhost:3000/**
```

Это важно для регистрации, подтверждения email и авторизации.

---

# 7. Deploy

Нажать Deploy.

Vercel должен выполнить примерно:

```text
npm install
npm run build
```

После завершения открыть Production URL.

---

# 8. Production-проверка

Проверить публичные страницы:

```text
/
 /news
 /team
 /matches
 /standings
 /club
 /media
```

Проверить:

- фотографии Supabase
- логотипы команд
- главный hero
- фотоальбомы
- страницу конкретной фотографии
- Share
- YouTube
- таблицу
- матчи

Потом:

```text
/login
```

Войти Admin.

Проверить:

```text
/admin
/admin/news
/admin/players
/admin/matches
/admin/standings
/admin/club
/admin/media
/admin/home
```

---

# 9. Служебные адреса

Health check:

```text
/api/health
```

Ожидается:

```json
{
  "status": "ok",
  "app": "fc-edinet",
  "supabaseConfigured": true
}
```

SEO:

```text
/robots.txt
/sitemap.xml
```

---

# 10. Что произойдёт после публикации

До:

```text
ПК -> npm run dev -> localhost -> Supabase
```

После:

```text
Посетитель
    ↓
Vercel / Next.js
    ↓
Supabase
 Database + Auth + Storage
```

ПК можно выключить — сайт продолжит работать.

---

# 11. Дальнейшие обновления

После связи GitHub + Vercel workflow станет проще:

```powershell
git add .
git commit -m "описание обновления"
git push
```

Push в production-ветку `main` автоматически создаст новый deployment.

Перед каждым push:

```powershell
npm run build
```

Это обязательная локальная проверка.
