import { z } from 'zod';

export const EmailSchema = z.string().trim().toLowerCase().email().max(254);
export const PasswordSchema = z.string().min(8).max(128);
/** E.164, e.g. +33612345678 */
export const PhoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/);
export const OneTimeCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/);
export const LocaleSchema = z.enum(['en', 'fr', 'ar']);

export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  locale: LocaleSchema.default('en'),
  acceptTerms: z.literal(true),
});
export type RegisterInput = z.input<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1).max(128),
});
export type LoginInput = z.input<typeof LoginSchema>;

export const VerifyCodeSchema = z.object({ code: OneTimeCodeSchema });
export const SendPhoneCodeSchema = z.object({ phone: PhoneSchema });

export const ForgotPasswordSchema = z.object({ email: EmailSchema });
export const ResetPasswordSchema = z.object({
  email: EmailSchema,
  code: OneTimeCodeSchema,
  password: PasswordSchema,
});

export const UpdateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().min(1).max(60).optional(),
  locale: LocaleSchema.optional(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: PasswordSchema,
});

export const IdentityDocumentType = z.enum([
  'PASSPORT',
  'NATIONAL_ID',
  'RESIDENCE_PERMIT',
  'DRIVING_LICENSE',
]);
export const SubmitVerificationSchema = z.object({
  documentType: IdentityDocumentType,
  documentCountry: z.string().trim().length(2).toUpperCase(),
});

export const RejectVerificationSchema = z.object({ reason: z.string().trim().min(3).max(500) });

/** Shape of the authenticated user returned by GET /auth/me. */
export interface MeResponse {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  locale: 'en' | 'fr' | 'ar';
  emailVerified: boolean;
  phoneVerified: boolean;
  travellerStatus: 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  reliabilityScore: number;
  ratingAvg: number | null;
  ratingCount: number;
  payoutsEnabled: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: MeResponse;
  accessToken: string;
  refreshToken: string;
  /** Only present in demo mode, so the flow can be shown without an SMS provider. */
  devCode?: string;
}
