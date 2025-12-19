import { z } from "zod";

export const authSchema = z.object({
  email: z.email({ message: "Email is required" }).trim(),
  firstName: z
    .string({ message: "First name is required" })
    .min(1, "First name is required")
    .trim(),
  lastName: z
    .string({ message: "Last name is required" })
    .min(1, "Last name is required")
    .trim(),
});

export type authSchema = z.infer<typeof authSchema>;

export const authValidation = {
  login: authSchema.pick({ email: true }),
  update: authSchema.omit({ email: true }),
};
