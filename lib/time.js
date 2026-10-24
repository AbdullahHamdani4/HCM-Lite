const TZ = "Asia/Karachi";
/** Server-side "now" in Pakistan time: date (yyyy-mm-dd) and minutes since midnight. */
export function pkNow(d = new Date()) {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
        timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(d).map((x) => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, minutes: (+p.hour % 24) * 60 + +p.minute, iso: d.toISOString() };
}
export const toMin = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
};
export const dow = (date) => new Date(date + "T00:00:00Z").getUTCDay();
export function addDays(date, n) {
    const d = new Date(date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}
export function eachDay(from, to) {
    const out = [];
    for (let d = from; d <= to; d = addDays(d, 1))
        out.push(d);
    return out;
}
export function monthRange(month) {
    const [y, m] = month.split("-").map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}
