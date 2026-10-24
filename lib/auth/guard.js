import { NextResponse } from "next/server";
import { adminAuth, db } from "@/lib/firebase/admin";
export class HttpError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
export async function requireUser(req, roles) {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token)
        throw new HttpError(401, "Not signed in");
    let uid;
    try {
        uid = (await adminAuth().verifyIdToken(token)).uid;
    }
    catch {
        throw new HttpError(401, "Session expired, please sign in again");
    }
    const snap = await db().collection("users").doc(uid).get();
    const u = snap.data();
    if (!u || u.active === false)
        throw new HttpError(403, "Account is not active");
    if (roles && !roles.includes(u.role))
        throw new HttpError(403, "You do not have access to this");
    return { uid, role: u.role, employeeId: u.employeeId, name: u.name, email: u.email };
}
/** Route wrapper: auth + role guard + consistent JSON errors. */
export function route(roles, fn) {
    return async (req) => {
        try {
            const ctx = roles === null ? null : await requireUser(req, roles);
            const out = await fn(ctx, req, new URL(req.url));
            return out instanceof Response ? out : NextResponse.json(out ?? { ok: true });
        }
        catch (e) {
            if (e instanceof HttpError)
                return NextResponse.json({ error: e.message }, { status: e.status });
            if (e && typeof e === "object" && "issues" in e)
                return NextResponse.json({ error: "Invalid input", issues: e.issues }, { status: 400 });
            console.error(e);
            return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
        }
    };
}
export const body = async (req) => (await req.json().catch(() => ({})));
