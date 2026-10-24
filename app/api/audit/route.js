import { db } from "@/lib/firebase/admin";
import { route } from "@/lib/auth/guard";

export const GET = route(["admin"], async () => {
  const snap = await db().collection("auditLogs").orderBy("atIso", "desc").limit(200).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data(), at: d.data().atIso }));
});
