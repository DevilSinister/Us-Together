import { z } from "zod";

export const emailSchema = z.email("Enter a valid email address.").max(254);

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "Password is too long.")
  .regex(/[a-z]/, "Add a lowercase letter.")
  .regex(/[A-Z]/, "Add an uppercase letter.")
  .regex(/[0-9]/, "Add a number.");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(128),
});

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Tell us what to call you.").max(80),
  timezone: z.string().trim().min(1).max(64).refine(isValidTimeZone, "Choose a valid timezone."),
});

export const onboardingProfileSchema = profileSchema.extend({
  avatarStyle: z.enum(["rose", "wine", "blush", "plum"]),
});

export const relationshipSchema = z.object({
  relationshipStartedOn: z.iso.date("Choose a valid date.").or(z.literal("")),
});

export const pairingCodeSchema = z.object({
  pairingCode: z.string().trim().regex(/^\d{6}$/, "Enter the six-digit code."),
});
