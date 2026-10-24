# HCM Lite

AI-assisted Human Capital Management for **Admin, HR and Employees**. Built for the Saylani Hackathon (24 Oct 2026).
The app starts empty: Admin sets up the company, HR registers employees, and every number comes from what people do in the app.

## Stack
- **Next.js 15** (App Router, JavaScript) + **Tailwind v4**, lucide icons, recharts, sonner
- **Firebase Auth** (email/password; Firebase hashes passwords with scrypt and issues JWT ID tokens)
- **Firestore** accessed **only on the server** through the Firebase Admin SDK
- **Gemini 2.5 Flash** (`@google/genai`) with function calling. The key stays on the server
- **@react-pdf/renderer** for payslip PDFs · deployed on **Vercel**

## Run locally (< 10 min)
1. `npm install`
2. Copy `.env.example` → `.env.local` and fill it in:
   - Firebase console → Project settings → **Your apps** → Web app config (6 `NEXT_PUBLIC_*` values)
   - Project settings → **Service accounts** → Generate new private key → `project_id`, `client_email`, `private_key`
   - In Firebase: enable **Authentication → Email/Password** and create a **Firestore** database (production mode)
   - `AI_API_KEY` from https://aistudio.google.com → Get API key
3. `npm run dev` → open http://localhost:3000

## First Admin
On a fresh database, `/` redirects to **/setup**. Enter the company name and the Admin's name, email and password.
Default leave types (annual 14, sick 8, casual 10, unpaid) are created from the brief's rules. Admin then adds
departments, office hours and location, and creates HR logins. HR registering an employee creates that employee's login with a
temporary password that must be changed on first sign-in.

## Architecture
```
app/api/<module>/route.js   thin handlers: route(roles, fn) → verify ID token → load role → call service
lib/services/*.js           all business rules (attendance, leave, payroll, analytics). Reused by the AI tools
lib/ai/index.js             Gemini chat with tools, dashboard summary, smart leave
lib/auth/guard.js           role + data-scope guard; employees only ever read their own employeeId
components/features/*       screens; components/ui.jsx design system
```
Rules worth checking: server-stamped time (Asia/Karachi), one check-in per day (409), late after start + grace, half day
under 5 h, working-day leave counting with overlap/balance checks (422), payroll gross = 1.5 × basic with proration,
absent/unpaid/half-day deductions and the tax slab, Admin-only finalize with lock (423), audit log with before/after JSON.

## AI
- Chat (`/api/ai/chat`): tools `get_headcount`, `get_attendance_summary`, `get_late_comers`, `get_leave_summary`,
  `get_my_leave_balance`, `get_my_attendance`, `get_payroll_summary`, `search_employees`. Each tool is filtered by role and
  runs the same services as the dashboards, so answers match them. Employees can't reach other people's data.
- Summarize: KPI JSON → 3–5 bullets. Smart leave: sentence (English / Roman Urdu) → validated JSON → pre-filled form → user confirms.
- 15 s timeout with fallback, 20 requests/user/hour, every call logged in `aiLogs`, answers labelled "AI-generated".

## Done / not done
**Done:** first-run setup · login/logout/change password · role menus & dashboards · company settings · departments,
designations, leave types, holidays · HR logins (create/deactivate/reset) · employee registration with login · directory with
search, filter, paging · Employee 360 · CSV export · web check-in/out · attendance board & calendar · corrections · leave
apply/cancel/balance/approve · salary structure · payroll draft/finalize/lock · payslip PDF · dashboards with date & department
filters · AI chat, summary, smart leave, policy Q&A · announcements · notifications · audit log · dark mode · responsive to 375 px.

**Not done:** CSV import with dry run · camera/face check-in · attrition risk score · tests.
