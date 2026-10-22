import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Please provide a valid email address').max(254);
// bcrypt only uses the first 72 bytes, so cap there
const password = z.string().min(6, 'Password must be at least 6 characters').max(72);

export const registerSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    email,
    password,
    confirmPassword: z.string().optional(),
  }).refine((d) => !d.confirmPassword || d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
};

export const loginSchema = {
  body: z.object({
    email,
    // No min length on login: don't leak password policy, just require presence
    password: z.string().min(1, 'Password is required').max(72),
  }),
};

export const updateProfileSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Name is required').max(100),
  }),
};

export const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required').max(72),
    newPassword: password,
  }),
};

export const updatePreferencesSchema = {
  body: z.object({
    emailNotifications: z.boolean().optional(),
    workflowNotifications: z.boolean().optional(),
    autoRetryFailed: z.boolean().optional(),
  }),
};
