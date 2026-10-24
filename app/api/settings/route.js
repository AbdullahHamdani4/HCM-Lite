import { z } from "zod";
import { db } from "@/lib/firebase/admin";
import { route, body } from "@/lib/auth/guard";
import { getSettings, audit } from "@/lib/services/org";

const Input = z.object({
  companyName: z.string().min(2), startTime: z.string().regex(/^\d{2}:\d{2}$/), graceMin: z.coerce.number().min(0),
  halfDayHours: z.coerce.number().min(1), weekend: z.array(z.number().min(0).max(6)),
  lat: z.coerce.number().nullable(), lng: z.coerce.number().nullable(), radius: z.coerce.number().min(10),
});

export const GET = route(["admin", "hr"], () => getSettings());

export const PUT = route(["admin"], async (ctx, req) => {
  const before = await getSettings();
  const data = Input.parse(await body(req));
  await db().collection("settings").doc("company").set(data, { merge: true });
  await audit(ctx, "update", "settings", "company", before, data);
  return data;
});
