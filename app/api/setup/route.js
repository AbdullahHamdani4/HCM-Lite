import { z } from "zod";
import { adminAuth, db } from "@/lib/firebase/admin";
import { route, body, HttpError } from "@/lib/auth/guard";
import { DEFAULT_SETTINGS, audit } from "@/lib/services/org";
import { DEFAULT_LEAVE_TYPES } from "@/lib/services/leave";

const Input = z.object({ companyName: z.string().min(2), name: z.string().min(2), email: z.string().email(), password: z.string().min(8) });

const isDone = async () => (await db().collection("settings").doc("company").get()).exists;

export const GET = route(null, async () => ({ done: await isDone() }));

/** First run only: creates company settings, default leave types and the Admin account. */
export const POST = route(null, async (_c, req) => {
  if (await isDone()) throw new HttpError(409, "Setup has already been completed");
  const d = Input.parse(await body(req));
  const user = await adminAuth().createUser({ email: d.email, password: d.password, displayName: d.name });
  await adminAuth().setCustomUserClaims(user.uid, { role: "admin" });
  await db().collection("users").doc(user.uid).set({ email: d.email, name: d.name, role: "admin", active: true, mustChangePassword: false });
  await db().collection("settings").doc("company").set({ companyName: d.companyName, ...DEFAULT_SETTINGS, createdAt: new Date().toISOString() });
  const batch = db().batch();
  DEFAULT_LEAVE_TYPES.forEach((t) => batch.set(db().collection("leaveTypes").doc(t.code), t));
  await batch.commit();
  await audit({ uid: user.uid, name: d.name, role: "admin" }, "setup", "company", "company", null, { companyName: d.companyName });
  return { ok: true };
});
