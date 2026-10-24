import { randomBytes } from "crypto";
import { z } from "zod";
import { adminAuth, db } from "@/lib/firebase/admin";
import { HttpError } from "@/lib/auth/guard";
import { audit } from "./org";
export const EmployeeInput = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional().default(""),
    address: z.string().optional().default(""),
    gender: z.enum(["male", "female", "other"]).default("male"),
    departmentId: z.string().min(1, "Department is required"),
    designationId: z.string().optional().default(""),
    joinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    basic: z.coerce.number().positive("Salary must be greater than 0"),
});
export async function allEmployees() {
    const snap = await db().collection("employees").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function getEmployee(ctx, id) {
    if (ctx.role === "employee" && ctx.employeeId !== id)
        throw new HttpError(403, "You can only view your own profile");
    const d = await db().collection("employees").doc(id).get();
    if (!d.exists)
        throw new HttpError(404, "Employee not found");
    return { id: d.id, ...d.data() };
}
/** Server-side search, filter and paging. Employees only ever see themselves. */
export async function searchEmployees(ctx, opts) {
    if (ctx.role === "employee")
        return { items: [await getEmployee(ctx, ctx.employeeId)], total: 1 };
    let rows = await allEmployees();
    const q = opts.q?.toLowerCase().trim();
    if (q)
        rows = rows.filter((e) => [e.name, e.email, e.code].some((v) => v?.toLowerCase().includes(q)));
    if (opts.dept)
        rows = rows.filter((e) => e.departmentId === opts.dept);
    if (opts.status)
        rows = rows.filter((e) => e.status === opts.status);
    rows.sort((a, b) => (a.code > b.code ? 1 : -1));
    const size = opts.size ?? 20, page = opts.page ?? 1;
    return { items: rows.slice((page - 1) * size, page * size), total: rows.length };
}
const tempPassword = () => "Hcm-" + randomBytes(4).toString("hex");
/** HR registers an employee → creates their login with a temporary password. */
export async function createEmployee(ctx, input) {
    const data = EmployeeInput.parse(input);
    const existing = await db().collection("employees").where("email", "==", data.email).limit(1).get();
    if (!existing.empty)
        throw new HttpError(409, "An employee with this email already exists");
    const count = (await db().collection("employees").count().get()).data().count;
    const code = `EMP-${String(count + 1).padStart(3, "0")}`;
    const password = tempPassword();
    const user = await adminAuth().createUser({ email: data.email, password, displayName: data.name }).catch((e) => {
        throw new HttpError(409, e.message);
    });
    const ref = db().collection("employees").doc();
    const emp = { ...data, code, uid: user.uid, status: "active", createdAt: new Date().toISOString() };
    await ref.set(emp);
    await db().collection("users").doc(user.uid).set({
        email: data.email, name: data.name, role: "employee", employeeId: ref.id, active: true, mustChangePassword: true,
    });
    await adminAuth().setCustomUserClaims(user.uid, { role: "employee" });
    await audit(ctx, "create", "employee", ref.id, null, emp);
    return { id: ref.id, code, tempPassword: password };
}
const HR_FIELDS = ["name", "phone", "address", "gender", "departmentId", "designationId", "basic", "status", "exitDate"];
const SELF_FIELDS = ["phone", "address"];
export async function updateEmployee(ctx, id, patch) {
    const before = await getEmployee(ctx, id);
    const allowed = ctx.role === "hr" ? HR_FIELDS : ctx.role === "employee" ? SELF_FIELDS : [];
    const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
    if (!Object.keys(clean).length)
        throw new HttpError(403, "Nothing you are allowed to change");
    if ("basic" in clean && !(Number(clean.basic) > 0))
        throw new HttpError(400, "Salary must be greater than 0");
    if ("basic" in clean)
        clean.basic = Number(clean.basic);
    await db().collection("employees").doc(id).update(clean);
    if (clean.status === "inactive" && before.uid) {
        await db().collection("users").doc(before.uid).update({ active: false });
        await adminAuth().updateUser(before.uid, { disabled: true });
    }
    await audit(ctx, "update", "employee", id, before, { ...before, ...clean });
    return { ok: true };
}
