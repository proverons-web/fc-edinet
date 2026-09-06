# FC Edineț v1.6 — первый production deploy

v1.6 — версия для публикации сайта через:

Windows / VS Code
→ GitHub
→ Vercel
→ Supabase

После Vercel компьютер не обязан быть включён.

---

## 1. Подготовка локально

Скопируй `.env.local` из v1.5.1.

Проверь, что там есть:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Запусти:

```powershell
npm install
npm run deploy:check
```

`deploy:check` сначала проверит переменные,
затем автоматически запустит `next build`.

После успешной сборки:

```powershell
npm run dev
```

Проверь:

```text
http://localhost:3000
http://localhost:3000/api/health
http://localhost:3000/api/version
http://localhost:3000/robots.txt
http://localhost:3000/sitemap.xml
```

---

## 2. GitHub

Если Git ещё не инициализирован:

```powershell
git init
git add .
git commit -m "FC Edinet v1.6 production"
git branch -M main
```

Создай пустой GitHub repository `fc-edinet`.

GitHub покажет URL.

Пример:

```powershell
git remote add origin https://github.com/YOUR_NAME/fc-edinet.git
git push -u origin main
```

Убедись, что `.env.local` не появился в GitHub.

---

## 3. Vercel

Открой Vercel.

```text
Add New
→ Project
→ Import Git Repository
→ fc-edinet
```

Настройки:

```text
Framework Preset: Next.js
Root Directory: ./
Build Command: оставить автоматически
Output Directory: оставить автоматически
```

---

## 4. Environment Variables

До Deploy добавь:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Со значениями из `.env.local`.

Для первого deploy `NEXT_PUBLIC_SITE_URL`
можно не добавлять: приложение умеет использовать адрес Vercel.

Нажми Deploy.

---

## 5. После первого deploy

Допустим Vercel выдал:

```text
https://fc-edinet-example.vercel.app
```

В Vercel:

```text
Settings
→ Environment Variables
```

добавь:

```text
NEXT_PUBLIC_SITE_URL=https://fc-edinet-example.vercel.app
```

Environment:

```text
Production
```

После изменения переменной сделай Redeploy.

---

## 6. Supabase Auth

Supabase:

```text
Authentication
→ URL Configuration
```

Site URL:

```text
https://fc-edinet-example.vercel.app
```

Redirect URLs оставить/добавить:

```text
http://localhost:3000/**
https://fc-edinet-example.vercel.app/**
```

Для production лучше использовать точный production URL.
Wildcard пригодится для localhost и при необходимости preview deployments.

---

## 7. Проверка production

Публичные:

```text
/
 /news
 /team
 /matches
 /standings
 /club
 /media
```

Служебные:

```text
/api/health
/api/version
/robots.txt
/sitemap.xml
```

`/api/version` должен показывать:

```json
{
  "app": "fc-edinet",
  "version": "1.6.0"
}
```

Админка:

```text
/login
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

## 8. Дальнейшие обновления

Обычный цикл:

```powershell
npm run deploy:check
git add .
git commit -m "FC Edinet v1.x"
git push
```

Vercel автоматически создаст новый deployment
после push в production branch.

---

## 9. Когда появится собственный домен

Например:

```text
https://example.md
```

Поменяй:

```text
NEXT_PUBLIC_SITE_URL=https://example.md
```

В Supabase:

```text
Site URL=https://example.md
Redirect URL=https://example.md/**
```

И сделай Redeploy.

---

## SQL

Для v1.6 НОВЫЙ SQL НЕ НУЖЕН.

База данных остаётся из v1.5.1.
