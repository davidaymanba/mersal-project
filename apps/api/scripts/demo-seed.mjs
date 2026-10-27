// Demo data: simulated senders and travellers that use the running API exactly like real users,
// so every balance, ledger entry, event and notification comes from the platform's own logic.
// Two steps would otherwise need real time to pass; for those the script moves a date in the
// database and lets the normal job do the rest (hold release, expired delivery window).
//
// Every account uses the @demo.mersal.local domain. None of this is real activity.
// Usage (API running with DEMO_MODE=true, on a freshly reset database): pnpm demo:seed
import { existsSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { PrismaClient } from '@prisma/client';

if (existsSync('.env')) process.loadEnvFile('.env');

const API = process.env.DEMO_API_URL ?? `http://localhost:${process.env.API_PORT ?? 4000}/api`;
const DOMAIN = 'demo.mersal.local';
const PASSWORD = 'Demo2026!';
const ADMIN = { email: 'admin@mersal.local', password: 'Mersal!2026' };
const prisma = new PrismaClient();

const isoDay = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** A signed-in API session with its own cookie jar. */
class Session {
  cookies = new Map();

  constructor(label) {
    this.label = label;
  }

  async call(method, path, body) {
    const headers = { 'x-e2e-key': process.env.E2E_BYPASS_KEY ?? '' };
    if (this.cookies.size)
      headers.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) {
      headers['content-type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const res = await fetch(`${API}${path}`, { method, headers, body: payload });
    for (const cookie of res.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const [name, ...value] = pair.split('=');
      this.cookies.set(name.trim(), value.join('='));
    }
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok)
      throw new Error(
        `${this.label}: ${method} ${path} → ${res.status} ${data?.code ?? ''} ${data?.message ?? ''}`,
      );
    return data;
  }

  get = (path) => this.call('GET', path);
  post = (path, body) => this.call('POST', path, body);
}

/** A small flat-colour PNG standing in for identity photos. */
function placeholderPng() {
  const size = 64;
  const crc = (buf) => {
    let c = ~0;
    for (const byte of buf) {
      c ^= byte;
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const row = Buffer.concat([
    Buffer.from([0]),
    Buffer.from(Array.from({ length: size }, () => [0xe6, 0xf4, 0xf2]).flat()),
  ]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return new Blob(
    [
      Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', header),
        chunk('IDAT', deflateSync(raw)),
        chunk('IEND', Buffer.alloc(0)),
      ]),
    ],
    { type: 'image/png' },
  );
}

// ─── People ─────────────────────────────────────────────────────────────────

const TRAVELLERS = {
  yacine: {
    firstName: 'Yacine',
    lastName: 'Benali',
    phone: '+33612000101',
    locale: 'fr',
    country: 'FR',
    iban: 'FR7630006000011234567890189',
  },
  samira: {
    firstName: 'Samira',
    lastName: 'Haddad',
    phone: '+33612000102',
    locale: 'fr',
    country: 'FR',
    iban: 'FR7610107001011234567890129',
  },
  karim: {
    firstName: 'Karim',
    lastName: 'Mansour',
    phone: '+33612000103',
    locale: 'fr',
    country: 'FR',
    iban: 'FR7612739000701234567890151',
  },
  leila: {
    firstName: 'Leila',
    lastName: 'Amrani',
    phone: '+212612000104',
    locale: 'ar',
    country: 'MA',
    iban: 'FR7614508000301234567890143',
  },
};
const SENDERS = {
  nadia: { firstName: 'Nadia', lastName: 'Saidi', phone: '+33612000201', locale: 'fr' },
  sofiane: { firstName: 'Sofiane', lastName: 'Djebbar', phone: '+33612000202', locale: 'en' },
  claire: { firstName: 'Claire', lastName: 'Martin', phone: '+33612000203', locale: 'fr' },
  mehdi: { firstName: 'Mehdi', lastName: 'Kaci', phone: '+33612000204', locale: 'ar' },
  ines: { firstName: 'Inès', lastName: 'Bouzid', phone: '+33612000205', locale: 'fr' },
  youssef: { firstName: 'Youssef', lastName: 'Alaoui', phone: '+212612000206', locale: 'ar' },
};

const emailFor = (person) =>
  `${person.firstName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z]/g, '')}@${DOMAIN}`;

async function createAccount(person) {
  const session = new Session(person.firstName);
  const { devCode } = await session.post('/auth/register', {
    email: emailFor(person),
    password: PASSWORD,
    firstName: person.firstName,
    lastName: person.lastName,
    locale: person.locale,
    acceptTerms: true,
  });
  await session.post('/auth/email/verify', { code: devCode });
  const sent = await session.post('/auth/phone/send', { phone: person.phone });
  await session.post('/auth/phone/verify', { code: sent.devCode });
  return session;
}

async function submitIdentity(session, country) {
  const form = new FormData();
  form.set('documentType', 'PASSPORT');
  form.set('documentCountry', country);
  form.set('documentFront', placeholderPng(), 'demo-document.png');
  form.set('selfie', placeholderPng(), 'demo-selfie.png');
  return session.post('/verification', form);
}

// ─── Parcels ────────────────────────────────────────────────────────────────

let catalog;
const city = (slug) => {
  const found = catalog.cities.find((c) => c.slug === slug);
  if (!found) throw new Error(`Unknown city ${slug}`);
  return found.id;
};

async function createShipment(sender, spec) {
  const quote = await sender.post('/quotes', {
    originCityId: city(spec.from),
    destinationCityId: city(spec.to),
    categoryCode: spec.category,
    weightGrams: spec.grams,
    lengthCm: spec.size[0],
    widthCm: spec.size[1],
    heightCm: spec.size[2],
    declaredValue: spec.value,
    urgency: spec.urgency ?? 'STANDARD',
    options: spec.options ?? [],
  });
  const shipment = await sender.post('/shipments', {
    quoteId: quote.id,
    description: spec.description,
    earliestDate: isoDay(0),
    latestDate: isoDay(spec.latestInDays ?? 8),
    recipientName: spec.recipient[0],
    recipientPhone: spec.recipient[1],
    restrictedItemsAck: true,
  });
  return shipment.id;
}

async function pay(sender, shipmentId) {
  const payment = await sender.post(`/shipments/${shipmentId}/payment`);
  await sender.post(`/payments/${payment.paymentId}/confirm-demo`);
}

/** Matching runs as a background job; wait for the offer to reach the traveller's inbox. */
async function waitForOffer(traveller, shipmentId) {
  for (let i = 0; i < 40; i++) {
    const offers = await traveller.get('/offers');
    const offer = offers.find((o) => o.shipment.id === shipmentId);
    if (offer) return offer.id;
    await sleep(250);
  }
  throw new Error(`No offer reached ${traveller.label} for ${shipmentId}`);
}

async function matchWith(sender, traveller, shipmentId) {
  await pay(sender, shipmentId);
  await traveller.post(`/offers/${await waitForOffer(traveller, shipmentId)}/accept`);
  return sender.get(`/shipments/${shipmentId}`);
}

async function pickUp(sender, traveller, shipmentId) {
  const { pickupCode } = await sender.get(`/shipments/${shipmentId}`);
  await traveller.post(`/shipments/${shipmentId}/pickup`, { code: pickupCode });
}

async function deliver(sender, traveller, shipmentId) {
  const { deliveryCode } = await sender.get(`/shipments/${shipmentId}`);
  await traveller.post(`/shipments/${shipmentId}/deliver`, { code: deliveryCode });
}

async function waitForStatus(session, shipmentId, status) {
  for (let i = 0; i < 40; i++) {
    if ((await session.get(`/shipments/${shipmentId}`)).status === status) return;
    await sleep(250);
  }
  throw new Error(`${shipmentId} did not reach ${status}`);
}

// ─── Run ────────────────────────────────────────────────────────────────────

async function main() {
  // Right after a database reset the dev server may still be restarting.
  let health = null;
  for (let i = 0; i < 60 && !health?.checks; i++) {
    health = await fetch(`${API}/health`)
      .then((r) => r.json())
      .catch(() => null);
    if (!health?.checks) await sleep(500);
  }
  if (!health)
    throw new Error(`The API is not reachable at ${API}. Start it with "pnpm dev" first.`);
  if (!health.demoMode)
    throw new Error('Demo data needs DEMO_MODE=true (one-time codes are returned to the client).');
  if (await prisma.user.count({ where: { email: { endsWith: `@${DOMAIN}` } } })) {
    throw new Error(
      'Demo accounts already exist. Run "pnpm demo:reset" to start from a clean database.',
    );
  }

  const admin = new Session('admin');
  await admin.post('/auth/login', ADMIN);
  catalog = await admin.get('/catalog');

  console.log('Travellers: accounts, identity checks, payout accounts, trips');
  const t = {};
  for (const [key, person] of Object.entries(TRAVELLERS)) {
    t[key] = await createAccount(person);
    const { id } = await submitIdentity(t[key], person.country);
    await admin.post(`/admin/verifications/${id}/approve`);
    await t[key].post('/wallet/payout-account', {
      holderName: `${person.firstName} ${person.lastName}`,
      iban: person.iban,
    });
  }
  const pending = await createAccount({
    firstName: 'Amine',
    lastName: 'Rahmani',
    phone: '+33612000105',
    locale: 'fr',
  });
  await submitIdentity(pending, 'FR');

  const trip = (session, from, to, days, kg, maxItems, notes) =>
    session.post('/trips', {
      originCityId: city(from),
      destinationCityId: city(to),
      departureDate: isoDay(days),
      capacityGrams: kg * 1000,
      maxItems,
      notes,
    });
  await trip(
    t.yacine,
    'fr-paris',
    'dz-algiers',
    2,
    12,
    5,
    'Train to Marseille, then the ferry. Hand-over near Gare de Lyon.',
  );
  await trip(t.samira, 'fr-lyon', 'dz-oran', 3, 10, 4);
  await trip(t.karim, 'fr-marseille', 'tn-tunis', 4, 8, 3);
  await trip(t.leila, 'ma-casablanca', 'fr-paris', 1, 6, 2);

  console.log('Senders');
  const s = {};
  for (const [key, person] of Object.entries(SENDERS)) s[key] = await createAccount(person);

  console.log('Shipments in every stage');
  // Completed and paid out, reviewed both ways.
  const completedA = await createShipment(s.nadia, {
    from: 'fr-paris',
    to: 'dz-algiers',
    category: 'DOCUMENTS',
    grams: 800,
    size: [32, 24, 3],
    value: 2000,
    description: 'University diploma copies in a sealed envelope',
    recipient: ['Karima Saidi', '+213550000301'],
  });
  await matchWith(s.nadia, t.yacine, completedA);
  await s.nadia.post(`/shipments/${completedA}/messages`, {
    body: 'Bonjour Yacine, I can bring the envelope to Gare de Lyon tomorrow at 9.',
  });
  await t.yacine.post(`/shipments/${completedA}/messages`, {
    body: 'Perfect, see you at the main entrance.',
  });
  await pickUp(s.nadia, t.yacine, completedA);
  await deliver(s.nadia, t.yacine, completedA);

  const completedB = await createShipment(s.sofiane, {
    from: 'fr-lyon',
    to: 'dz-oran',
    category: 'CLOTHING',
    grams: 3000,
    size: [45, 35, 20],
    value: 12000,
    description: 'Winter clothes for my parents',
    recipient: ['Abdelkader Djebbar', '+213550000302'],
  });
  await matchWith(s.sofiane, t.samira, completedB);
  await pickUp(s.sofiane, t.samira, completedB);
  await deliver(s.sofiane, t.samira, completedB);

  // Resolved dispute: partial refund, the rest released to the traveller.
  const resolved = await createShipment(s.ines, {
    from: 'fr-lyon',
    to: 'dz-oran',
    category: 'COSMETICS',
    grams: 1200,
    size: [30, 20, 15],
    value: 6000,
    description: 'Perfume set and creams, boxed',
    recipient: ['Souad Bouzid', '+213550000303'],
  });
  await matchWith(s.ines, t.samira, resolved);
  await pickUp(s.ines, t.samira, resolved);
  await deliver(s.ines, t.samira, resolved);

  // Open dispute waiting for the admin.
  const disputed = await createShipment(s.mehdi, {
    from: 'fr-paris',
    to: 'dz-algiers',
    category: 'BOOKS',
    grams: 2500,
    size: [35, 25, 15],
    value: 9000,
    description: 'Six medical textbooks',
    recipient: ['Rachid Kaci', '+213550000304'],
  });
  await matchWith(s.mehdi, t.yacine, disputed);
  await pickUp(s.mehdi, t.yacine, disputed);
  await deliver(s.mehdi, t.yacine, disputed);

  // Delivered, traveller's earning on hold.
  const held = await createShipment(s.claire, {
    from: 'fr-marseille',
    to: 'tn-tunis',
    category: 'GIFTS',
    grams: 1800,
    size: [30, 30, 20],
    value: 7000,
    description: 'Wedding gift: a boxed tea set',
    recipient: ['Amel Ben Salah', '+21650000305'],
    options: ['FRAGILE'],
  });
  await matchWith(s.claire, t.karim, held);
  await pickUp(s.claire, t.karim, held);
  await deliver(s.claire, t.karim, held);

  // On its way.
  const inTransit = await createShipment(s.youssef, {
    from: 'ma-casablanca',
    to: 'fr-paris',
    category: 'GIFTS',
    grams: 2200,
    size: [40, 30, 15],
    value: 5000,
    description: 'Moroccan pottery for my sister',
    recipient: ['Salma Alaoui', '+33612000306'],
    options: ['FRAGILE'],
  });
  await matchWith(s.youssef, t.leila, inTransit);
  await pickUp(s.youssef, t.leila, inTransit);
  await t.leila.post(`/shipments/${inTransit}/in-transit`);

  const pickedUp = await createShipment(s.claire, {
    from: 'fr-paris',
    to: 'dz-algiers',
    category: 'DOCUMENTS',
    grams: 400,
    size: [30, 22, 2],
    value: 1000,
    description: 'Signed rental documents',
    recipient: ['Yasmine Haddad', '+213550000307'],
    urgency: 'EXPRESS',
  });
  await matchWith(s.claire, t.yacine, pickedUp);
  await pickUp(s.claire, t.yacine, pickedUp);

  // Matched, meeting being arranged (the phone number in the message is masked).
  const matched = await createShipment(s.sofiane, {
    from: 'fr-marseille',
    to: 'tn-tunis',
    category: 'CLOTHING',
    grams: 2000,
    size: [40, 30, 15],
    value: 8000,
    description: 'Football kits for a youth club',
    recipient: ['Walid Trabelsi', '+21650000308'],
  });
  await matchWith(s.sofiane, t.karim, matched);
  await s.sofiane.post(`/shipments/${matched}/messages`, {
    body: 'Hi Karim, I can come on Saturday morning. Call me on 06 12 34 56 78 if easier.',
  });
  await t.karim.post(`/shipments/${matched}/messages`, {
    body: "Saturday works. Let's keep it here in the chat: Vieux-Port, 10:00?",
  });

  // Offer waiting in the traveller's inbox (expires after a few minutes in demo mode).
  const offered = await createShipment(s.mehdi, {
    from: 'fr-lyon',
    to: 'dz-oran',
    category: 'BOOKS',
    grams: 1500,
    size: [30, 22, 10],
    value: 4000,
    description: 'Children’s books in Arabic and French',
    recipient: ['Nawel Kaci', '+213550000309'],
  });
  await pay(s.mehdi, offered);
  await waitForOffer(t.samira, offered);

  // Paid, no traveller on that route yet.
  const waiting = await createShipment(s.claire, {
    from: 'fr-nice',
    to: 'tn-sousse',
    category: 'CLOTHING',
    grams: 2500,
    size: [40, 30, 20],
    value: 6000,
    description: 'Summer clothes',
    recipient: ['Hela Mabrouk', '+21650000310'],
  });
  await pay(s.claire, waiting);

  // Delivery window passed without a traveller.
  const noMatch = await createShipment(s.sofiane, {
    from: 'fr-toulouse',
    to: 'ma-rabat',
    category: 'DOCUMENTS',
    grams: 300,
    size: [30, 22, 1],
    value: 500,
    description: 'Certified copies for a visa file',
    recipient: ['Omar Bennani', '+212612000311'],
    latestInDays: 1,
  });
  await pay(s.sofiane, noMatch);

  // Paid then cancelled by the sender before pickup: refunded in full.
  const cancelled = await createShipment(s.nadia, {
    from: 'fr-lille',
    to: 'dz-annaba',
    category: 'GIFTS',
    grams: 1000,
    size: [25, 20, 10],
    value: 3000,
    description: 'Birthday present',
    recipient: ['Lamia Saidi', '+213550000312'],
  });
  await pay(s.nadia, cancelled);
  await s.nadia.post(`/shipments/${cancelled}/cancel`, {
    reason: 'Plans changed, I will bring it myself.',
  });

  // Priced but not paid yet.
  await createShipment(s.ines, {
    from: 'fr-bordeaux',
    to: 'dz-constantine',
    category: 'CLOTHING',
    grams: 4000,
    size: [50, 40, 25],
    value: 10000,
    description: 'Clothes for the family',
    recipient: ['Farid Bouzid', '+213550000313'],
  });

  console.log('Problems reported and resolved');
  const report = (session, shipmentId, reason, description) => {
    const form = new FormData();
    form.set('reason', reason);
    form.set('description', description);
    return session.post(`/shipments/${shipmentId}/disputes`, form);
  };
  const toResolve = await report(
    s.ines,
    resolved,
    'DAMAGED',
    'One of the cream jars arrived cracked and leaked onto the box.',
  );
  await admin.post(`/admin/disputes/${toResolve.id}/review`);
  await admin.post(`/admin/disputes/${toResolve.id}/resolve`, {
    resolution: 'PARTIAL_REFUND',
    refundAmount: 500,
    note: 'One jar was damaged in transit: refunding its value, the rest of the delivery was fine.',
  });
  await report(
    s.mehdi,
    disputed,
    'ITEM_MISSING',
    'Only five of the six textbooks were in the box when it arrived.',
  );

  console.log('Time passes: holds end, the weekly payout runs');
  // The 48-hour hold (minutes in demo mode) is a real wait; move it to now and let the job release it.
  await prisma.ledgerEntry.updateMany({
    where: { shipmentId: { in: [completedA, completedB] }, releaseAt: { not: null } },
    data: { releaseAt: new Date(Date.now() - 60_000) },
  });
  await admin.post('/admin/payouts/release-holds');
  await waitForStatus(s.nadia, completedA, 'COMPLETED');
  await admin.post('/admin/payouts/run');

  // The delivery window of the Toulouse → Rabat parcel ends in the past; the matching sweep closes it.
  await prisma.shipment.update({
    where: { id: noMatch },
    data: { latestDate: new Date(Date.now() - 10 * 86_400_000) },
  });
  await admin.post('/admin/matching/tick');
  await waitForStatus(s.sofiane, noMatch, 'NO_MATCH');

  console.log('Reviews');
  await s.nadia.post(`/shipments/${completedA}/review`, {
    rating: 5,
    comment: 'On time and very kind. The envelope arrived perfect.',
  });
  await t.yacine.post(`/shipments/${completedA}/review`, {
    rating: 5,
    comment: 'Clear instructions and on time at the meeting point.',
  });
  await s.sofiane.post(`/shipments/${completedB}/review`, {
    rating: 4,
    comment: 'Smooth handover, delivered a day later than hoped.',
  });
  await t.samira.post(`/shipments/${completedB}/review`, { rating: 5 });

  console.log(`\nDemo data ready. Every account below uses the password ${PASSWORD}`);
  const rows = [
    ...Object.values(TRAVELLERS).map((p) => [emailFor(p), 'traveller']),
    [`amine@${DOMAIN}`, 'traveller, identity check pending'],
    ...Object.values(SENDERS).map((p) => [emailFor(p), 'sender']),
  ];
  for (const [email, role] of rows) console.log(`  ${email.padEnd(32)} ${role}`);
  console.log(`  ${ADMIN.email.padEnd(32)} admin (password ${ADMIN.password})`);
}

main()
  .catch((error) => {
    console.error(`\n✖ ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
