import { z } from "zod";

export const planTypes = ["date", "trip", "activity", "birthday", "anniversary", "event", "reminder", "other"] as const;

const optionalText = (maximum: number) => z.string().trim().max(maximum).optional().transform((value) => value || null);

export const planSchema = z.object({
  sourceBucketId: z.union([z.literal(""), z.uuid()]).optional().transform((value) => value || null),
  title: z.string().trim().min(1, "Name this plan.").max(160),
  description: optionalText(8000),
  type: z.enum(planTypes),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a start date and time."),
  endsAt: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)]),
  timezone: z.string().trim().min(1).max(64),
  location: optionalText(240),
  budget: z.union([z.literal(""), z.string().regex(/^\d{1,9}(?:\.\d{1,2})?$/, "Use a valid amount.")]),
  currency: z.union([z.literal(""), z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a three-letter currency code.")]),
}).superRefine((value, context) => {
  if ((value.budget === "") !== (value.currency === "")) {
    context.addIssue({ code: "custom", path: [value.budget === "" ? "budget" : "currency"], message: "Add both an amount and currency." });
  }
});

export const memorySchema = z.object({
  sourceBucketId: z.union([z.literal(""), z.uuid()]).optional().transform((value) => value || null),
  title: z.string().trim().min(1, "Name this memory.").max(160),
  description: optionalText(12000),
  memoryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the date this happened."),
  location: optionalText(240),
  rating: z.union([z.literal(""), z.coerce.number().int().min(1).max(5)]),
  favorite: z.string().optional().transform((value) => value === "on"),
  sourcePlanId: z.union([z.literal(""), z.string().uuid()]).optional().transform((value) => value || null),
});

export function isValidTimeZone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

export function zonedLocalToUtc(value: string, timezone: string) {
  if (!isValidTimeZone(timezone)) throw new Error("Unsupported timezone");
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    hourCycle: "h23",
  });
  let candidate = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(candidate)).map((part) => [part.type, part.value]));
    const rendered = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    candidate += target - rendered;
  }
  const verification = Object.fromEntries(formatter.formatToParts(new Date(candidate)).map((part) => [part.type, part.value]));
  const expected = [year, month, day, hour, minute];
  const actual = [verification.year, verification.month, verification.day, verification.hour, verification.minute].map(Number);
  if (expected.some((part, index) => part !== actual[index])) throw new Error("That local time does not exist in this timezone.");
  return new Date(candidate).toISOString();
}

export function moneyToMinorUnits(value: string) {
  if (!value) return null;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
