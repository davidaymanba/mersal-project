# Demo script (10 minutes)

This walkthrough shows the full product live: a parcel goes from quote to payout, and the
admin tools are shown along the way. All accounts and parcels come from `pnpm demo:seed`.
They are sample data and should be presented that way.

## Before the call

```bash
pnpm infra:up      # Postgres, Redis, Mailpit
pnpm dev           # API on :4000, web on :3000 — DEMO_MODE=true in apps/api/.env
pnpm demo:reset    # wipes the local database, then loads the demo data (about 5 seconds)
```

`demo:reset` deletes everything in the local database. To add demo data to an empty
database without resetting it, run `pnpm demo:seed` instead.

Open three separate browser profiles (or one normal window, one private window and another
browser), because each one holds its own session:

| Window    | Account                    | Password      |
| --------- | -------------------------- | ------------- |
| Sender    | `nadia@demo.mersal.local`  | `Demo2026!`   |
| Traveller | `yacine@demo.mersal.local` | `Demo2026!`   |
| Admin     | `admin@mersal.local`       | `Mersal!2026` |

In demo mode the 48-hour hold lasts 2 minutes, offers expire after 3 minutes, and email and
phone codes appear on screen.

## What the demo data contains

| Reference shown as | Status                  | Sender → traveller        | Use it to show                                 |
| ------------------ | ----------------------- | ------------------------- | ---------------------------------------------- |
| Diploma copies     | Completed               | Nadia → Yacine            | Timeline, chat, two-way reviews, payout        |
| Winter clothes     | Completed               | Sofiane → Samira          | Reviews, reliability                           |
| Perfume set        | Completed               | Inès → Samira             | Dispute resolved with a partial refund         |
| Medical textbooks  | In dispute              | Mehdi → Yacine            | Open dispute to resolve live, blocked earnings |
| Tea set            | Delivered               | Claire → Karim            | Earning on hold                                |
| Moroccan pottery   | In transit              | Youssef → Leila           | Morocco → France direction, recipient tracking |
| Rental documents   | Picked up               | Claire → Yacine           | Express parcel                                 |
| Football kits      | Matched                 | Sofiane → Karim           | Chat with a masked phone number                |
| Children’s books   | Looking for a traveller | Mehdi → (offer to Samira) | Pending offer (expires after 3 minutes)        |
| Summer clothes     | Looking for a traveller | Claire                    | Route with no traveller yet                    |
| Visa documents     | No match                | Sofiane                   | Window passed, retry or refund                 |
| Birthday present   | Refunded                | Nadia                     | Cancelled before pickup                        |
| Family clothes     | Priced                  | Inès                      | Quote not paid yet                             |

`amine@demo.mersal.local` has an identity check waiting in the verification queue.

## The walkthrough

**1. Public site (1 min).** Open the home page in French, then switch to Arabic to show the
right-to-left layout. Open _How it works_ for the money flow, then _Pricing_. Price Paris →
Algiers, Gifts, 2 kg, and point out that every line of the price is visible.

**2. A new parcel (2 min).** In the Sender window, create a shipment Paris → Algiers from
that quote and pay with the demo payment. The parcel moves to _Looking for a traveller_.

**3. Matching (1½ min).** In the Traveller window, open _Offers_: the parcel is there with
Yacine's earnings and a countdown. Accept it. The sender gets a notification right away.
Send a chat message that includes a phone number, and show that the other side sees it
masked.

**4. Handover (1½ min).**

- The sender shows the pickup code, and the traveller enters it.
- Open the recipient tracking link from the shipment page in a private window: it shows the
  delivery code and the timeline, with no account needed.
- The traveller enters the delivery code. In _Wallet_, the earning is now on hold. It becomes
  available about 2 minutes later.

**5. Admin (2½ min).**

- _Overview_: activity chart, GMV, commission, match rate.
- _Matching_: open the new parcel to see every candidate, with scores and exclusion reasons.
- _Pricing_: edit a tariff draft, run the simulator, and only then activate it.
- _Disputes_: open the textbooks case, start the review and resolve it. The ledger changes
  are visible in Yacine's wallet.
- _Verifications_: approve Amine.
- _Payouts_: run the payout now.
- _Audit log_: every one of these actions is recorded.

**6. White-label (30 s).** Open `/brand` and switch the theme to WASS'LA. The whole product,
including the admin, takes the new colours.

## If something goes wrong

- **No offer arrives.** Matching runs every 15 seconds in demo mode. Check that the route has
  a published trip (Yacine: Paris → Algiers).
- **A code was mistyped five times.** Use _Reset code attempts_ on the admin shipment page.
- **Starting over.** Run `pnpm demo:reset` again.
