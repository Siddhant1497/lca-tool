# Hosting SustainHub and sharing with clients

## 1. Put the app online (free, permanent link)

The app is a static website: no server or database. Your clients' data never goes to the host; it stays in the browser where you enter it.

1. Merge pull request #1 into `main`.
2. In the repository go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` builds, tests and publishes the app. After about 2 minutes it is live at:

   **https://siddhant1497.github.io/lca-tool/**

Every later merge to `main` redeploys automatically (Actions tab shows progress).

> The repository is public, so the app's *code* is public. That is fine: no client data is in the code. Do **not** commit client files or backups to the repository.

Alternatives that work the same way (drag-and-drop the `dist/` folder after `npm run build`): Netlify, Cloudflare Pages, Vercel, or any company web server.

## 2. Keep each client separate

Use the **client switcher** (top right). Each client has its own inventory, factors, activities, levers, strategy and certification projects. Switching never mixes data.

Data lives in the browser you use. To move to another computer, or to keep a safe copy: **Data Manager → Export & backup → Download backup** (per client), then **Restore** elsewhere.

## 3. Share only what a client needs

**Client sharing** page (sidebar):

1. Switch to the client.
2. Tick the sections they should see: KPIs, pathway, scope split, Scope 3 hotspots, intensity, levers/MACC, strategy, disclosure frameworks (choose GHG Protocol / GRI / BRSR / IFRS S2) and specific certification projects.
3. Add cover details (title, prepared by, note) and **Preview**.
4. **Download client dashboard** → one `.html` file.

What the file contains is limited to the ticked sections (data minimisation). Activity data, your emission-factor library and other clients are **never** included. The file is read-only, works offline and needs no login. The client double-clicks it to open it in any browser.

How to deliver it:

| Option | Link? | Who can open it |
|---|---|---|
| Email / WhatsApp attachment | No | Recipient |
| Google Drive / OneDrive / SharePoint, shared with the client's email | Yes | Only people you grant |
| Claude artifact (ask Claude to publish the file) | Yes | Private until you share it from the artifact page |
| Upload to a public website | Yes | **Anyone with the link**, so avoid for confidential figures |

Each file is a dated snapshot. When numbers change, generate a new one.

## 4. When you'd need a server

Live, always-up-to-date client portals with client logins (each client signs in and sees only their own dashboard) need a backend with authentication, e.g. Supabase or Firebase with row-level access rules. The data model is already separated per client, so this is a natural next step.
