# HCM Lite

AI-assisted HR system with 3 roles: Admin, HR, Employee. The app starts EMPTY (no seed or dummy data). Judges run the demo script below on the live link.

## Stack
- Next.js 15 (App Router) + JavaScript (no TypeScript; .js/.jsx only) + Tailwind v4 + shadcn/ui + lucide-react + framer-motion + recharts
- Firebase Auth (email/password) on the client; Firestore accessed ONLY from the server through the Firebase Admin SDK
- API: Next route handlers under `app/api/**`. Every handler calls `requireUser(req, roles)`, which verifies the ID token, loads the user doc, and checks the role and the data scope.
- AI: Gemini (`@google/genai`) with function calling, server-side only, key in `AI_API_KEY`
- PDF: `@react-pdf/renderer` (server). Validation: `zod`. Dates: `date-fns`. Deploy: Vercel.

## Structure
```
app/(auth)/login, app/setup (first run), app/change-password
app/(app)/admin/*, hr/*, employee/*   — role layouts with their own sidebars
app/api/<module>/route.ts             — thin: auth guard → zod → service
lib/services/<module>.ts              — ALL business rules live here (reused by the AI tools)
lib/firebase/{client,admin}.ts, lib/auth/guard.ts, lib/ai/{tools,chat}.ts
components/ui (shadcn), components/<feature>
```
Firestore collections: users, employees, departments, designations, leaveTypes, holidays, settings (doc "company"), attendance (id `${empId}_${yyyy-mm-dd}`), leaveRequests, payrollRuns, payslips, announcements, auditLogs, aiLogs.

## Roles and scope (enforced on the SERVER)
- Admin: company settings, departments, designations, leave types, holidays, create/deactivate/reset logins, sees all, finalizes payroll (only Admin), views the audit log.
- HR: registers employees (creates a Firebase user with a temp password and `mustChangePassword: true`), salary structure, attendance board, approves leave and corrections, creates the payroll draft, posts announcements. Cannot change settings, create Admins, finalize payroll, or view the audit log.
- Employee: check in/out, own attendance, leave apply/cancel/balance, own payslips, edit own phone/address only. Only ever reads rows with their own `employeeId`.
- Store the role in the Firestore user doc (and as a custom claim). The AI uses the SAME scope as the caller.

## Business rules (implement exactly)
- First run: if no Admin exists, `/setup` asks for the company name plus the Admin email/password. Otherwise it redirects to `/login`.
- Settings defaults: start 09:00, grace 15 min, half day if under 5 h, weekend Sat–Sun, office lat/lng, radius 150 m.
- Attendance: the SERVER stamps the time (Asia/Karachi). One record per employee per day; a second check-in returns 409. Late if check-in is after 09:15. half_day if worked time is under 5 h. missing_checkout if there is no check-out. absent if there is no record and no approved leave on a working day.
- Leave: count working days only (skip weekends and holidays). Quotas: annual 14, sick 8, casual 10, unpaid unlimited. Overlap or over-balance returns 422. Status: pending → approved/rejected (with an HR comment); the employee can cancel while pending.
- Payroll: gross = 1.5 × basic (basic + HRA 40% + medical 10% of basic). Per day = gross ÷ working days in the month. Deduct (absent + unpaid leave + 0.5 × half days) × per day. Prorate joiners and leavers. Annual tax on gross × 12: 0 up to 600k; 5% of the amount over 600k up to 1.2M; 30k + 15% over 1.2M up to 2.4M; 210k + 25% over 2.4M up to 3.6M; 510k + 35% over 3.6M. Monthly tax = annual ÷ 12. Net = gross − deductions − tax. Status draft → finalized (Admin only; locked, edits return 423/403).
- Audit: log create/update/approve/finalize actions with {actor, action, entity, entityId, before, after, at}. Entries are never edited.

## Metrics (server-computed, filters: date range + department)
- Attendance rate = (present + late + missing_checkout + 0.5 × half_day) ÷ (working-day records − on_leave)
- Late % = late ÷ (present + late). Leave utilization = approved days ÷ quota.
- HR dashboard: headcount, present today, on leave, late today, pending approvals, attendance trend, leave by type, top 5 late-comers, AI Summarize.
- Admin dashboard: headcount, payroll cost, avg salary, headcount by dept, payroll by dept, audit feed.
- Employee dashboard: check-in widget, hours this week vs 40, late count, leave balance, last payslip, announcements, ask assistant.

## AI (M8)
- `POST /api/ai/chat`: Gemini function calling. Tools: get_headcount, get_attendance_summary, get_late_comers, get_leave_summary, get_my_leave_balance, get_payroll_summary, search_employees. The tools call `lib/services/*` with the caller's scope. The model never touches the DB directly.
- An Employee asking about anyone else's salary or data gets a polite refusal (enforced by the tool scope, and also stated in the system prompt).
- Policy Q&A: the business rules above go in the system prompt. If an answer isn't in them, the model says it doesn't know.
- Summarize: send the KPI JSON → get 3–5 bullets that use only those numbers.
- Smart leave: sentence → JSON {type, start, end, reason}, validated with zod (retry once, then fall back to the plain form). Pre-fill the form; the user confirms. The AI never saves data itself.
- 15 s timeout, friendly fallback, 20 requests per user per hour, log to aiLogs, show an "AI-generated" label on answers.

## Design rules (strict — must NOT look like generic AI UI)
- Tone: calm, precise, editorial (Linear / Vercel / Stripe dashboard).
- Fonts via next/font: Geist for UI, Geist Mono for numbers/IDs/dates, Instrument Serif ONLY for big page titles and KPI hero numbers. Never Inter, Roboto, or Poppins.
- Neutrals: zinc. Background #FAFAF9, surface #FFFFFF, text #0A0A0A, muted #71717A, border zinc-200. Dark mode tuned, not inverted.
- One accent: #FF4F00. Use it for the primary action and the active nav item only (under 5% of the screen). Status colors are muted: green-600 / amber-600 / red-600 on tinted backgrounds.
- 4px grid. 1px borders instead of shadows. Radius 6px on controls, 10px on cards. No pill-everything, no gradients, no glassmorphism, no gradient text, no emoji.
- Type scale 12/13/14/16/20/28/40. Tracking −0.02em on large text. tabular-nums on all numbers.
- Layout: 240px left sidebar with grouped nav plus role badge; top bar with breadcrumbs and a ⌘K command palette. Content is left-aligned and dense where there is data, airy in page headers.
- Every view has loading (skeletons), empty (a short message plus the next action), and error states. Toasts via sonner. Motion 150–200 ms ease-out, respecting prefers-reduced-motion.
- Icons: lucide 16px, stroke 1.5. Copy is short and human. Responsive down to 375px (the sidebar becomes a sheet).

## Demo script (must work end to end on a fresh install)
1. Admin: setup → company, office hours/location, a department, leave types → creates an HR login.
2. HR registers 2–3 employees; one employee signs in, changes their password, checks in.
3. The employee types a leave request in plain words → confirms the pre-filled form → HR approves.
4. HR dashboard → Summarize; asks the AI "who is on leave"; runs payroll; Admin finalizes.
5. The employee downloads the payslip and asks for a colleague's salary (refused). Admin shows the audit log.

## Build priority
P0: setup, auth + guard, org setup, employees, check-in, leave, payroll + PDF → P1: dashboards, AI chat/summary/smart leave → P2: audit UI, announcements, directory search, corrections. Skip: CSV import, camera, notifications.

## Conventions
- Never commit secrets. Keep `.env.example` up to date. All money is PKR, formatted with Intl.
- After each module: run `npm run build` (or at least lint), fix errors, then commit with a clear message.
- README must cover: stack, how to run, env vars, first Admin, AI key, and what is done / not done.
