import { z } from "zod";

export const OTP_LENGTH = 6;

export const requestEmailOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(
      z.email({ error: "Escribe un email válido, como nombre@ejemplo.com." }),
    ),
});

export type RequestEmailOtpInput = z.infer<typeof requestEmailOtpSchema>;

export const verifyEmailOtpSchema = requestEmailOtpSchema.extend({
  token: z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), {
      error: `El código tiene ${OTP_LENGTH} dígitos.`,
    }),
});

export type VerifyEmailOtpInput = z.infer<typeof verifyEmailOtpSchema>;
