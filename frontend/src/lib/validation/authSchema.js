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

export const resetPasswordSchema = z
  .object({
    new_password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters." })
      .max(128, { message: "Password is too long." }),
    confirm: z.string().min(1, { message: "Please confirm your password." }),
  })
  .refine((data) => data.new_password === data.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

export const resetPasswordDefaultValues = {
  new_password: "",
  confirm: "",
};
