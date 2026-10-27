import Stripe from 'stripe';
import type { PaymentProvider, ProviderEvent } from './payment-provider';

/**
 * Stripe implementation: Checkout Sessions for sender payments, Connect Express accounts
 * for travellers, and transfers from the platform balance ("separate charges and transfers").
 * The fund flow must be validated with Stripe and legal advisers before going live.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe' as const;
  private readonly stripe: Stripe;

  constructor(
    secretKey: string,
    private readonly webhookSecret: string,
  ) {
    this.stripe = new Stripe(secretKey, { apiVersion: '2025-08-27.basil' });
  }

  async createCheckout(args: Parameters<PaymentProvider['createCheckout']>[0]) {
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer_email: args.customerEmail,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: args.currency.toLowerCase(),
              unit_amount: args.amount,
              product_data: { name: args.description },
            },
          },
        ],
        metadata: { paymentId: args.paymentId, shipmentId: args.shipmentId },
        payment_intent_data: {
          metadata: { paymentId: args.paymentId, shipmentId: args.shipmentId },
        },
        success_url: args.successUrl,
        cancel_url: args.cancelUrl,
      },
      { idempotencyKey: `checkout-${args.paymentId}` },
    );
    return { providerPaymentId: session.id, redirectUrl: session.url ?? undefined };
  }

  async checkoutStatus(sessionId: string) {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === 'paid') return 'paid' as const;
    return session.status === 'expired' ? ('expired' as const) : ('open' as const);
  }

  async refund(sessionId: string, amount: number) {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    const paymentIntent =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;
    if (!paymentIntent) throw new Error('Checkout session has no payment intent');
    const refund = await this.stripe.refunds.create({ payment_intent: paymentIntent, amount });
    return { refundId: refund.id };
  }

  async createPayoutAccount(args: Parameters<PaymentProvider['createPayoutAccount']>[0]) {
    const accountId =
      args.existingAccountId ??
      (
        await this.stripe.accounts.create({
          type: 'express',
          country: args.country,
          email: args.email,
          capabilities: { transfers: { requested: true } },
          metadata: { userId: args.userId },
        })
      ).id;
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      return_url: args.returnUrl,
      refresh_url: args.refreshUrl,
    });
    return { accountId, onboardingUrl: link.url };
  }

  async payoutAccountReady(accountId: string) {
    const account = await this.stripe.accounts.retrieve(accountId);
    return account.capabilities?.transfers === 'active' && account.payouts_enabled === true;
  }

  async transfer(args: { accountId: string; amount: number; currency: string; payoutId: string }) {
    const transfer = await this.stripe.transfers.create(
      {
        amount: args.amount,
        currency: args.currency.toLowerCase(),
        destination: args.accountId,
        metadata: { payoutId: args.payoutId },
      },
      { idempotencyKey: `payout-${args.payoutId}` },
    );
    return { transferId: transfer.id };
  }

  /** Verifies the signature and normalises the event. */
  parseWebhook(rawBody: Buffer, signature: string): ProviderEvent {
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    return {
      id: event.id,
      type: event.type,
      object: event.data.object as unknown as Record<string, unknown>,
    };
  }
}
