#!/usr/bin/env node
/** FC Edinet v2.30.27 atomic local upgrade based strictly on v2.30.26. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const kit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(kit, '..');
const originalVersion = '2.30.26';
const nextVersion = '2.30.27';
const changed = new Map();
const removed = new Set();
const read = (name) => changed.has(name) ? changed.get(name) : fs.readFileSync(path.join(root,name),'utf8');
const write = (name, contents) => changed.set(name,contents);
function replaceOne(s,a,b,label){
 const pos=s.indexOf(a);
 if(pos<0 || s.indexOf(a,pos+1)>=0) throw Error(`${label}: expected exactly one matching source fragment`);
 return s.slice(0,pos)+b+s.slice(pos+a.length);
}
function modify(name,fn){let previous=read(name);let result=fn(previous);if(!result || result===previous)throw Error(`${name}: transformation made no change`);write(name,result);}
function sourceFile(file){return fs.readFileSync(path.join(kit,'files',file),'utf8');}
function addFile(name){if(fs.existsSync(path.join(root,name))) throw Error(`${name}: file already exists; aborting to prevent overwrite`);write(name,sourceFile(name));}
const getVersion=()=>JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
try{
 if(!fs.existsSync(path.join(root,'package.json'))) throw Error('Extract UPDATE_FC_EDINET_v2.30.27 into the v2.30.26 project directory.');
 if(getVersion()!==originalVersion) throw Error(`Expected FC Edinet ${originalVersion}; found ${getVersion()}. No files changed.`);
 if(!fs.existsSync(path.join(root,'DEPLOY_FC_EDINET.bat'))) throw Error('Missing official installer; wrong project directory.');

 // Fail-closed account provisioning. A Supabase server secret is mandatory:
 // ordinary signUp is never an admin API substitute.
 modify('app/admin/users/actions.ts',s=>{
   const begin=s.indexOf('export async function createAdminUser('), end=s.indexOf('export async function updateUserRole(');
   if(begin<0||end<=begin||!s.slice(begin,end).includes('createIsolatedSignupClient'))throw Error('Admin creation implementation differs from reviewed v2.30.26 source');
   const fn=`export async function createAdminUser(formData: FormData) {
  // Protect the action itself, not just the page or the browser form.
  await requireAdmin();
  if (!isSupabaseAdminConfigured()) redirect("/admin/users?error=admin_secret_required#new-user");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const requestedRole = String(formData.get("role") ?? "fan").trim() as UserRole;
  if (!/^\\S+@\\S+\\.\\S+$/.test(email) || password.length < 10 || password.length > 128 || fullName.length > 120 || !allowedRoles.has(requestedRole)) {
    redirect("/admin/users?error=create_invalid#new-user");
  }
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });
  if (error || !data.user) {
    console.error("admin createUser failed", error?.message || "no user returned");
    redirect(\`/admin/users?error=\${/already|registered|exists/i.test(error?.message ?? "") ? "email_exists" : "create_failed"}#new-user\`);
  }
  const newUserId = data.user.id;
  const { error: profileError } = await admin.from("profiles").upsert({
    id: newUserId, email, full_name: fullName || null, role: requestedRole,
  }, { onConflict: "id" });
  if (profileError) {
    console.error("new user profile setup failed", profileError.message);
    const rollback = await admin.auth.admin.deleteUser(newUserId);
    if (rollback.error) console.error("user creation rollback failed", rollback.error.message);
    redirect("/admin/users?error=create_profile_failed#new-user");
  }
  refreshUsers();
  redirect("/admin/users?created=1");
}

`;
   s=s.slice(0,begin)+fn+s.slice(end);
   s=replaceOne(s,'  createIsolatedSignupClient,\n','', 'remove insecure signup client import');
   return s;
 });
 modify('app/admin/users/page.tsx',s=>{
   s=replaceOne(s,'Без server-only secret аккаунт всё равно можно создать, но Supabase может\n                потребовать подтверждение email. Блокировка/разблокировка будет недоступна.',
     'Создание пользователей и блокировка требуют server-only ключа. Добавь SUPABASE_SECRET_KEY в Production Vercel и локальный .env.local, затем выполни новый деплой.', 'admin secret explanation');
   s=replaceOne(s,'Рекомендуется добавить SUPABASE_SECRET_KEY.', 'Для создания аккаунтов нужен действующий SUPABASE_SECRET_KEY.', 'admin secret headline');
   s=replaceOne(s,'Режим с подтверждением email','Admin API не настроен','auth status');
   s=replaceOne(s,'  const adminAuthConfigured = isSupabaseAdminConfigured();', `  const adminAuthConfigured = isSupabaseAdminConfigured();
  let adminAuthReady = false;
  if (adminAuthConfigured) {
    try {
      const { error: adminProbeError } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1 });
      adminAuthReady = !adminProbeError;
    } catch { adminAuthReady = false; }
  }`, 'validate Admin API key against Supabase');
   // Only show the create form when admin auth key is both present and accepted.
   s=s.replaceAll('adminAuthConfigured &&', 'adminAuthReady &&');
   s=s.replaceAll('!adminAuthConfigured &&', '!adminAuthReady &&');
   s=s.replaceAll('adminAuthConfigured ? ', 'adminAuthReady ? ');

   const formStart='<form action={createAdminUser} className="adminCreateUserForm">';
   const start=s.indexOf(formStart), end=s.indexOf('</form>',start);
   if(start<0||end<start) throw Error('Cannot locate new user form');
   s=s.slice(0,start)+'{adminAuthReady && (\n'+s.slice(start,end+7)+'\n            )}'+s.slice(end+7);
   return s;
 });

 // Strict visibility plus server-only route authorization; action functions
 // have their own requireAdmin guard even if invoked without navigating here.
 modify('app/components/AdminShellClient.tsx',s=>{
   const restricted=['/admin/site-builder','/admin/translations','/admin/statistics','/admin/club','/admin/partners','/admin/site-analytics'];
   for(const href of restricted){
     const re=new RegExp(`(href: "${href.replaceAll('/','\\/')}"[^\\n]*minRole: )"editor"`, 'g');
     let n=0;
     s=s.replace(re,(_whole,prefix)=>{n++;return prefix+'"admin"'});
     if(n!==1) throw Error(`${href}: expected 1 navigation entry; found ${n}`);
   }
   return s;
 });
 modify('app/admin/page.tsx',s=>{
   const needle='  const isAdmin = profile.role === "admin";';
   if(!s.includes(needle))throw Error('Dashboard role check missing');
   const shortcut=`\n  if (!isAdmin) {
    const allowed = profile.role === "editor"
      ? [
          ["Новости", "/admin/news"], ["Медиа", "/admin/media"],
          ["Комментарии", "/admin/comments"], ["Игроки", "/admin/players"],
          ["Штаб команды", "/admin/staff"], ["Календарь", "/admin/matches"],
          ["Соревнования", "/admin/matches/competitions"],
          ["Протокол матча", "/admin/match-center"], ["Турнирная таблица", "/admin/standings"],
        ]
      : [["Мои новости", "/admin/news"]];
    return <main className="adminPage adminDashboardV2">
      <section className="adminDashboardIntro"><div>
        <p className="eyebrow blue">FC EDINEȚ • РАБОЧИЕ РАЗДЕЛЫ</p>
        <h1>{profile.role === "editor" ? "Редактор" : "Автор"}</h1>
        <p>Только разрешённые функции. Администратор управляет настройками и пользователями отдельно.</p>
      </div></section>
      <nav className="adminRoleQuickGrid" aria-label="Доступные разделы">
        {allowed.map(([label, href]) => <Link key={href} href={href}>{label}<span aria-hidden="true">→</span></Link>)}
      </nav>
      <p className="adminRoleNotice">Для быстрого редактирования открой нужную страницу сайта и нажми на карандаш.</p>
    </main>;
  }
`;
   return replaceOne(s,needle,needle+shortcut,'restricted staff dashboard');
 });
 modify('app/admin/layout.tsx',s=>replaceOne(s,'import "../admin-mobile-v23024.css";', 'import "../admin-mobile-v23024.css";\nimport "../admin-roles-v23027.css";', 'new admin CSS'));
 modify('app/components/SiteHeader.tsx',s=>{
   s=replaceOne(s,'import HeaderNavClient from "@/app/components/HeaderNavClient";', 'import HeaderNavClient from "@/app/components/HeaderNavClient";\nimport EditOnSite from "@/app/components/EditOnSite";', 'import floating edit');
   return replaceOne(s,'      </header>\n    </>', '      </header>\n      <EditOnSite role={profile?.role ?? "fan"} locale={locale} />\n    </>', 'mount edit button');
 });
 // Authors must not see or open other authors' draft news directly.
 modify('app/admin/news/page.tsx',s=>replaceOne(s,'  const { data, error } = await query;', '  if (profile.role === "author") query = query.eq("created_by", userId);\n  const { data, error } = await query;', 'author news filtering'));
 modify('app/admin/news/[id]/edit/page.tsx',s=>replaceOne(s,'  const article = articleData as unknown as NewsArticle;', '  const article = articleData as unknown as NewsArticle;\n  if (profile.role === "author" && article.created_by !== userId) notFound();', 'author ownership')); 

 modify('app/admin/site-builder/page.tsx',s=>{if(!s.includes('requireEditor'))throw Error('Site builder page role check missing');return s.replaceAll('requireEditor','requireAdmin');});
 const adminOnlyDirs=['club','design','home','page-builder','site-builder','partners','statistics','translations','site-analytics','data-integrity','diagnostics','audit','users'];
 for(const dir of adminOnlyDirs){
   const name=`app/admin/${dir}/layout.tsx`;
   if(fs.existsSync(path.join(root,name)))throw Error(`${name} already exists; check before applying this upgrade`);
   write(name, `import { requireAdmin } from "@/lib/editorial";\n\nexport default async function AdminOnlyLayout({ children }: { children: React.ReactNode }) {\n  await requireAdmin();\n  return <>{children}</>;\n}\n`);
 }
 const deniedActions=[
   'app/admin/club/actions.ts','app/admin/club/archive/actions.ts',
   'app/admin/club/hall-of-fame/actions.ts','app/admin/club/history/actions.ts',
   'app/admin/design/actions.ts','app/admin/design/global-actions.ts',
   'app/admin/home/actions.ts','app/admin/page-builder/[pageKey]/actions.ts',
   'app/admin/page-builder/club/actions.ts','app/admin/site-builder/actions.ts',
   'app/admin/partners/actions.ts','app/admin/statistics/actions.ts',
   'app/admin/statistics/[matchId]/actions.ts','app/admin/translations/actions.ts',
 ];
 for(const name of deniedActions){
   modify(name,s=>{
     if(!s.includes('requireEditor')) throw Error(`${name}: no requireEditor found`);
     s=s.replaceAll('requireEditor','requireAdmin');
     s=s.replace(/requireAdmin, requireAdmin/g,'requireAdmin');
     return s;
   });
 }
 // New files stored verbatim in this update (keeps data and current content intact).
 const extra=[
  'lib/admin-role-permissions.ts','app/components/EditOnSite.tsx',
  'app/edit-on-site-v23027.css','app/admin/edit/page.tsx','app/admin-roles-v23027.css',
  'database/085_admin_editor_role_boundaries.sql','scripts/qa-user-roles-v2327.mjs',
 ];
 extra.forEach(addFile);
 modify('package.json',s=>{
   const pkg=JSON.parse(s);
   if(pkg.version!==originalVersion)throw Error('package.json version mismatch');
   pkg.version=nextVersion;
   pkg.scripts['qa:user-roles']='node --experimental-strip-types scripts/qa-user-roles-v2327.mjs';
   pkg.scripts['qa:all']+=' && npm run qa:user-roles';
   pkg.scripts['deploy:check']=pkg.scripts['deploy:check'].replace(' && npm run typecheck', ' && npm run qa:user-roles && npm run typecheck');
   if(!pkg.scripts['deploy:check'].includes('npm run qa:user-roles'))throw Error('deploy:check format has changed');
   return JSON.stringify(pkg,null,2)+'\n';
 });
 modify('lib/release.ts',s=>replaceOne(s,'2.30.26',nextVersion,'release label'));
 modify('.gitignore',s=>s+'\n# Upgrade kit must not enter GitHub when deploying\n/UPDATE_FC_EDINET_v2.30.27/\n');
 const workflow='.github/workflows/responsive-qa.yml';
 modify(workflow,s=>{
   const marker='      - name: Pre-deploy Git rollback and secret leak prevention';
   if(!s.includes(marker))throw Error('CI workflow has changed');
   return replaceOne(s,marker,`      - name: Role enforcement, account provisioning and public edit links\n        run: npm run qa:user-roles\n${marker}`,'CI user roles QA');
 });
 modify('scripts/qa-unified-admin-v2321.mjs',s=>{
   const a='minRole: "editor"/';
   if(!s.includes(a))throw Error('Old builder role QA contract missing');
   s=replaceOne(s,a,'minRole: "admin"/','builder navigation authorization QA');
   s=s.replaceAll('requireEditor\\(\\)', 'requireAdmin\\(\\)');
   s=s.replaceAll('/requireEditor/', '/requireAdmin/');
   return s;
 });
 modify('scripts/qa-builder-workspace-v2322.mjs',s=>{
   const oldPage='assert.match(read("app/admin/site-builder/page.tsx"), /requireEditor\\(\\)/);';
   if(!s.includes(oldPage))throw Error('Site builder page QA check missing');
   s=replaceOne(s,oldPage,oldPage.replace('requireEditor','requireAdmin'),'site builder page QA');
   const a='assert.match(read("app/admin/page-builder\\/\\[pageKey\\]\\/actions.ts"), /requireEditor\\(\\)/);';
   if(!s.includes(a))throw Error('Page-builder action QA check missing');
   return replaceOne(s,a,a.replace('requireEditor','requireAdmin'),'page-builder action authorization QA');
 });
 // Keep historical QA scripts' version checks synchronized with the release.
 for(const entry of fs.readdirSync(path.join(root,'scripts'))){
   if(!entry.endsWith('.mjs'))continue;
   const name=`scripts/${entry}`, body=read(name);
   const updated=body.replaceAll(originalVersion,nextVersion).replaceAll(String.raw`2\.30\.26`,String.raw`2\.30\.27`);
   if(updated!==body)write(name,updated);
 }
 removed.add('STEP-2.30.26.txt');
 write('STEP-2.30.27.txt',sourceFile('STEP-2.30.27.txt'));
 write('RELEASE-NOTES-v2.30.27.md',sourceFile('RELEASE-NOTES-v2.30.27.md'));

 // Refuse to publish any partial set: validate before touching disk.
 for(const [file] of changed){const target=path.resolve(root,file);if(!target.startsWith(root+path.sep))throw Error(`Path outside project: ${file}`);}
 const backupDir=path.join(path.dirname(root),'FC_Edinet_UpdateBackups_v2.30.27');
 if(fs.existsSync(backupDir))throw Error(`Backup directory ${backupDir} already exists; avoid overwriting it.`);
 fs.mkdirSync(backupDir,{recursive:true});
 const originals=new Map();
 try {
   for(const name of [...changed.keys(),...removed]){
     const target=path.join(root,name);
     if(fs.existsSync(target)){
       const data=fs.readFileSync(target);
       originals.set(name,data);
       const backup=path.join(backupDir,name);
       fs.mkdirSync(path.dirname(backup),{recursive:true});fs.writeFileSync(backup,data);
     }
   }
   for(const [name,body] of changed){
     const target=path.join(root,name);fs.mkdirSync(path.dirname(target),{recursive:true});
     const temporary=target+'.upgrade-tmp';fs.writeFileSync(temporary,body,'utf8');fs.renameSync(temporary,target);
   }
   for(const name of removed)fs.rmSync(path.join(root,name),{force:true});
   const result=getVersion();if(result!==nextVersion)throw Error('Version validation after write failed');
   console.log(`PASS FC Edinet ${nextVersion}: ${changed.size} files written, ${removed.size} retired. SQL migration NOT run.`);
   console.log(`Original files backed up in ${backupDir}`);
   console.log('NEXT: apply database/085_admin_editor_role_boundaries.sql in Supabase, configure SUPABASE_SECRET_KEY, run DEPLOY_FC_EDINET.bat.');
 } catch(error) {
   for(const name of changed.keys()){
     const target=path.join(root,name);fs.rmSync(target,{force:true});
     if(originals.has(name)){fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,originals.get(name));}
   }
   for(const name of removed){if(originals.has(name)){const target=path.join(root,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,originals.get(name));}}
   throw error;
 }
}catch(error){console.error(`UPDATE BLOCKED: ${error instanceof Error?error.message:String(error)}`);process.exitCode=1;}
