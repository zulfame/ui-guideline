import { z } from "zod";

/**
 * Validation schemas for authentication flows.
 * Kept isolated so it can be reused across pages (login, reset, etc.)
 * and easily migrated to TypeScript later (schema types via z.infer).
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is required." })
    .email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(1, { message: "Password is required." })
    .min(6, { message: "Password must be at least 6 characters." }),
  remember: z.boolean().optional().default(false),
});

export const loginDefaultValues = {
  email: "",
  password: "",
  remember: false,
};
