/**
 * Marketplace payment provider. Stripe (Checkout + Connect, separate charges and transfers)
 * in production; a demo provider locally so the full flow works without credentials.
 */
export interface PaymentProvider {
  readonly name: 'stripe' | 'demo';

  /** Starts a hosted payment for the sender. */
  createCheckout(args: {
    paymentId: string;
    shipmentId: string;
    amount: number;
    currency: string;
    description: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ providerPaymentId: string; redirectUrl?: string }>;

  /** Reads the state of a checkout (used when a webhook did not arrive, e.g. local dev). */
  checkoutStatus(providerPaymentId: string): Promise<'paid' | 'open' | 'expired'>;

  refund(providerPaymentId: string, amount: number): Promise<{ refundId: string }>;

  /** Creates (or resumes) the traveller's payout account and returns an onboarding link if needed. */
  createPayoutAccount(args: {
    userId: string;
    email: string;
    country: string;
    existingAccountId: string | null;
    returnUrl: string;
    refreshUrl: string;
  }): Promise<{ accountId: string; onboardingUrl?: string }>;

  payoutAccountReady(accountId: string): Promise<boolean>;

  /** Moves a traveller's earnings to their payout account. */
  transfer(args: {
    accountId: string;
    amount: number;
    currency: string;
    payoutId: string;
  }): Promise<{ transferId: string }>;
}

export interface ProviderEvent {
  id: string;
  type: string;
  /** Normalised object of interest. */
  object: Record<string, unknown>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
