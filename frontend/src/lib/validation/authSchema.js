import { z } from "zod";

/**
 * Validation schemas for authentication flows.
 * Kept isolated so it can be reused across pages (login, reset, etc.)
 * and easily migrated to TypeScript later (schema types via z.infer).
 */
export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, { message: "Email, username, or phone is required." }),
  password: z.string().min(1, { message: "Password is required." }),
  remember: z.boolean().optional().default(false),
});

export const loginDefaultValues = {
  identifier: "",
  password: "",
  remember: false,
};

export const resetSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is required." })
    .email({ message: "Please enter a valid email address." }),
});

export const resetDefaultValues = {
  email: "",
};
