/** Machine-readable error codes returned in `{ code, message }` error bodies. Clients translate them. */
export const ErrorCode = {
  // generic
  VALIDATION: 'validation_failed',
  NOT_FOUND: 'not_found',
  FORBIDDEN: 'forbidden',
  UNAUTHORIZED: 'unauthorized',
  INVALID_FILE: 'invalid_file',
  INVALID_STATUS: 'invalid_status',
  TOO_MANY_REQUESTS: 'too_many_requests',
  INTERNAL: 'internal_error',
  // accounts
  EMAIL_TAKEN: 'email_taken',
  PHONE_TAKEN: 'phone_taken',
  INVALID_CREDENTIALS: 'invalid_credentials',
  ACCOUNT_SUSPENDED: 'account_suspended',
  INVALID_CODE: 'invalid_code',
  TOO_MANY_ATTEMPTS: 'too_many_attempts',
  CODE_RECENTLY_SENT: 'code_recently_sent',
  EMAIL_NOT_VERIFIED: 'email_not_verified',
  PHONE_NOT_VERIFIED: 'phone_not_verified',
  VERIFICATION_PENDING: 'verification_pending',
  ALREADY_VERIFIED: 'already_verified',
  WRONG_PASSWORD: 'wrong_password',
  // pricing & shipments
  ROUTE_NOT_SERVED: 'route_not_served',
  NO_ACTIVE_TARIFF: 'no_active_tariff',
  TOO_HEAVY: 'too_heavy',
  CATEGORY_WEIGHT_LIMIT: 'category_weight_limit',
  UNKNOWN_OPTION: 'unknown_option',
  QUOTE_EXPIRED: 'quote_expired',
  QUOTE_USED: 'quote_used',
  INVALID_DATES: 'invalid_dates',
  PHOTOS_REQUIRED: 'photos_required',
  NOT_CANCELLABLE: 'not_cancellable',
  ALREADY_EXISTS: 'already_exists',
  // trips & matching
  TRAVELLER_NOT_VERIFIED: 'traveller_not_verified',
  TRIP_HAS_SHIPMENTS: 'trip_has_shipments',
  TRIP_FULL: 'trip_full',
  OFFER_EXPIRED: 'offer_expired',
  OFFER_NOT_PENDING: 'offer_not_pending',
  // payments & wallet
  PAYMENT_PROVIDER_ERROR: 'payment_provider_error',
  PAYMENT_NOT_PENDING: 'payment_not_pending',
  PAYOUT_ACCOUNT_REQUIRED: 'payout_account_required',
  NOTHING_TO_REFUND: 'nothing_to_refund',
  // disputes & reviews
  DISPUTE_WINDOW_CLOSED: 'dispute_window_closed',
  DISPUTE_EXISTS: 'dispute_exists',
  REVIEW_EXISTS: 'review_exists',
  REVIEW_NOT_ALLOWED: 'review_not_allowed',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
