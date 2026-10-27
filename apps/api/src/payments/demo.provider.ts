import { randomUUID } from 'node:crypto';
import type { PaymentProvider } from './payment-provider';

/**
 * Local stand-in for the payment provider: checkouts are confirmed from the demo payment
 * sheet, refunds and transfers succeed immediately. Never used when Stripe keys are set.
 */
export class DemoPaymentProvider implements PaymentProvider {
  readonly name = 'demo' as const;

  async createCheckout(args: { paymentId: string }) {
    return { providerPaymentId: `demo_pay_${args.paymentId}` };
  }

  async checkoutStatus(): Promise<'open'> {
    // Demo payments are confirmed explicitly through PaymentsService.confirmDemo.
    return 'open';
  }

  async refund() {
    return { refundId: `demo_re_${randomUUID()}` };
  }

  async createPayoutAccount(args: { userId: string }) {
    return { accountId: `demo_acct_${args.userId}` };
  }

  async payoutAccountReady() {
    return true;
  }

  async transfer() {
    return { transferId: `demo_tr_${randomUUID()}` };
  }
}
