import { z } from "zod";
import { randomBytes } from "crypto";
import { adminAuth, db } from "@/lib/firebase/admin";
import { route, body, HttpError } from "@/lib/auth/guard";
import { audit } from "@/lib/services/org";

const Input = z.object({ name: z.string().min(2), email: z.string().email() });

export const GET = route(["admin"], async () => {
  const snap = await db().collection("users").get();
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() })).sort((a, b) => a.role.localeCompare(b.role));
});

/** Admin creates HR logins (temporary password, must change on first sign-in). */
export const POST = route(["admin"], async (ctx, req) => {
  const d = Input.parse(await body(req));
  const password = "Hcm-" + randomBytes(4).toString("hex");
  const user = await adminAuth().createUser({ email: d.email, password, displayName: d.name }).catch((e) => { throw new HttpError(409, e.message); });
  await adminAuth().setCustomUserClaims(user.uid, { role: "hr" });
  const rec = { email: d.email, name: d.name, role: "hr", active: true, mustChangePassword: true };
  await db().collection("users").doc(user.uid).set(rec);
  await audit(ctx, "create", "user", user.uid, null, rec);
  return { uid: user.uid, tempPassword: password };
});

/** Deactivate / activate / reset password for any non-admin login. */
export const PATCH = route(["admin"], async (ctx, req) => {
  const { uid, action } = await body(req);
  const ref = db().collection("users").doc(uid);
  const u = (await ref.get()).data();
  if (!u) throw new HttpError(404, "User not found");
  if (u.role === "admin") throw new HttpError(403, "Admin accounts can't be changed here");
  if (action === "reset") {
    const password = "Hcm-" + randomBytes(4).toString("hex");
    await adminAuth().updateUser(uid, { password });
    await ref.update({ mustChangePassword: true });
    await audit(ctx, "reset_password", "user", uid);
    return { tempPassword: password };
  }
  const active = action === "activate";
  await adminAuth().updateUser(uid, { disabled: !active });
  await ref.update({ active });
  await audit(ctx, active ? "activate" : "deactivate", "user", uid, u, { ...u, active });
  return { ok: true };
});
