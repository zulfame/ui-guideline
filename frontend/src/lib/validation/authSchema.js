import { z } from "zod";

/**
 * Validation schemas for authentication flows.
 * Kept isolated so it can be reused across pages (login, reset, etc.)
 * and easily migrated to TypeScript later (schema types via z.infer).
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email wajib diisi." })
    .email({ message: "Masukkan alamat email yang valid." }),
  password: z
    .string()
    .min(1, { message: "Kata sandi wajib diisi." })
    .min(6, { message: "Kata sandi minimal 6 karakter." }),
  remember: z.boolean().optional().default(false),
});

export const loginDefaultValues = {
  email: "",
  password: "",
  remember: false,
};
