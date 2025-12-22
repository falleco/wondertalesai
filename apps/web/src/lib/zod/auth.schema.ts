import { z } from "zod";

export const authSchema = z.object({
  email: z.email({ message: "Email is required" }).trim(),
  fullName: z
    .string({ message: "Full name is required" })
    .min(1, "Full name is required")
    .trim(),
  image: z.string().optional().nullable(),
});

export type authSchema = z.infer<typeof authSchema>;

export const authValidation = {
  login: authSchema.pick({ email: true }),
  update: authSchema.omit({ email: true }),
};
