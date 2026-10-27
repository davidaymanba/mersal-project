export type MailLocale = 'en' | 'fr' | 'ar';

export type MailTemplate =
  | 'emailVerification'
  | 'passwordReset'
  | 'verificationApproved'
  | 'verificationRejected'
  | 'offerReceived'
  | 'shipmentMatched'
  | 'shipmentNoMatch'
  | 'paymentReceipt'
  | 'shipmentDelivered'
  | 'recipientOnTheWay'
  | 'notification';

interface Copy {
  subject: string;
  heading: string;
  body: string;
  footer: string;
}

const FOOTER: Record<MailLocale, string> = {
  en: 'You receive this email because you have a Mersal account.',
  fr: 'Vous recevez cet e-mail car vous avez un compte Mersal.',
  ar: 'تصلك هذه الرسالة لأن لديك حساباً على مرسال.',
};

const COPY: Record<MailLocale, Record<MailTemplate, Omit<Copy, 'footer'>>> = {
  en: {
    emailVerification: {
      subject: 'Your Mersal verification code',
      heading: 'Confirm your email',
      body: 'Hello {name}, use this code to confirm your email address. It expires in 15 minutes.',
    },
    passwordReset: {
      subject: 'Reset your Mersal password',
      heading: 'Reset your password',
      body: 'Use this code to choose a new password. It expires in 15 minutes. If you did not ask for this, you can ignore this email.',
    },
    verificationApproved: {
      subject: 'You are verified as a traveller',
      heading: 'Identity check approved',
      body: 'Hello {name}, your identity check was approved. You can now publish trips and receive parcel proposals.',
    },
    verificationRejected: {
      subject: 'Your identity check needs attention',
      heading: 'We could not approve your identity check',
      body: 'Hello {name}, reason given by our team: “{reason}”. You can submit new documents from your account.',
    },
    offerReceived: {
      subject: 'A parcel is waiting for your answer',
      heading: 'New parcel proposal',
      body: 'Hello {name}, parcel {reference} matches your trip. Accept or decline it before the proposal expires.',
    },
    shipmentMatched: {
      subject: 'A traveller accepted your parcel',
      heading: 'Your parcel has a traveller',
      body: 'Hello {name}, a verified traveller accepted parcel {reference}. Open your shipment to arrange the hand-over.',
    },
    shipmentNoMatch: {
      subject: 'We have not found a traveller yet',
      heading: 'No traveller found for {reference}',
      body: 'Hello {name}, no traveller is available in your departure window. You can extend the dates or request a refund from your account.',
    },
    paymentReceipt: {
      subject: 'Payment received for {reference}',
      heading: 'Thank you, your payment is confirmed',
      body: 'Hello {name}, we received {amount} for parcel {reference}. We are now proposing it to verified travellers on your route. The traveller is paid only after delivery is confirmed.',
    },
    shipmentDelivered: {
      subject: 'Parcel {reference} has been delivered',
      heading: 'Delivered',
      body: 'Hello {name}, the traveller confirmed delivery of parcel {reference} with the recipient’s code. If anything is wrong, report it from your shipment page within 48 hours.',
    },
    recipientOnTheWay: {
      subject: 'A parcel is on its way to you',
      heading: 'Parcel {reference} is on its way',
      body: 'Hello {name}, a parcel is travelling to you with a verified Mersal traveller. Give this code to the traveller when you receive it — only then.',
    },
    notification: { subject: '{title}', heading: '{title}', body: '{body}' },
  },
  fr: {
    emailVerification: {
      subject: 'Votre code de vérification Mersal',
      heading: 'Confirmez votre e-mail',
      body: 'Bonjour {name}, utilisez ce code pour confirmer votre adresse e-mail. Il expire dans 15 minutes.',
    },
    passwordReset: {
      subject: 'Réinitialisez votre mot de passe Mersal',
      heading: 'Réinitialiser le mot de passe',
      body: "Utilisez ce code pour choisir un nouveau mot de passe. Il expire dans 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
    },
    verificationApproved: {
      subject: 'Vous êtes vérifié en tant que voyageur',
      heading: "Vérification d'identité approuvée",
      body: 'Bonjour {name}, votre vérification a été approuvée. Vous pouvez publier vos trajets et recevoir des propositions de colis.',
    },
    verificationRejected: {
      subject: "Votre vérification d'identité demande une action",
      heading: "Nous n'avons pas pu valider votre vérification",
      body: 'Bonjour {name}, motif indiqué par notre équipe : « {reason} ». Vous pouvez envoyer de nouveaux documents depuis votre compte.',
    },
    offerReceived: {
      subject: 'Un colis attend votre réponse',
      heading: 'Nouvelle proposition de colis',
      body: "Bonjour {name}, le colis {reference} correspond à votre trajet. Acceptez ou refusez-le avant l'expiration de la proposition.",
    },
    shipmentMatched: {
      subject: 'Un voyageur a accepté votre colis',
      heading: 'Votre colis a un voyageur',
      body: 'Bonjour {name}, un voyageur vérifié a accepté le colis {reference}. Ouvrez votre envoi pour organiser la remise.',
    },
    shipmentNoMatch: {
      subject: "Nous n'avons pas encore trouvé de voyageur",
      heading: 'Aucun voyageur pour {reference}',
      body: "Bonjour {name}, aucun voyageur n'est disponible sur votre période de départ. Vous pouvez élargir les dates ou demander un remboursement depuis votre compte.",
    },
    paymentReceipt: {
      subject: 'Paiement reçu pour {reference}',
      heading: 'Merci, votre paiement est confirmé',
      body: "Bonjour {name}, nous avons reçu {amount} pour le colis {reference}. Nous le proposons maintenant à des voyageurs vérifiés sur votre trajet. Le voyageur n'est payé qu'après confirmation de la livraison.",
    },
    shipmentDelivered: {
      subject: 'Le colis {reference} a été livré',
      heading: 'Livré',
      body: 'Bonjour {name}, le voyageur a confirmé la livraison du colis {reference} avec le code du destinataire. En cas de problème, signalez-le depuis votre envoi sous 48 heures.',
    },
    recipientOnTheWay: {
      subject: 'Un colis est en route vers vous',
      heading: 'Le colis {reference} est en route',
      body: 'Bonjour {name}, un colis voyage vers vous avec un voyageur Mersal vérifié. Donnez ce code au voyageur lorsque vous le recevez — seulement à ce moment-là.',
    },
    notification: { subject: '{title}', heading: '{title}', body: '{body}' },
  },
  ar: {
    emailVerification: {
      subject: 'رمز التحقق من مرسال',
      heading: 'أكّد بريدك الإلكتروني',
      body: 'مرحباً {name}، استخدم هذا الرمز لتأكيد بريدك الإلكتروني. صلاحيته 15 دقيقة.',
    },
    passwordReset: {
      subject: 'إعادة تعيين كلمة المرور في مرسال',
      heading: 'إعادة تعيين كلمة المرور',
      body: 'استخدم هذا الرمز لاختيار كلمة مرور جديدة. صلاحيته 15 دقيقة. إذا لم تطلب ذلك يمكنك تجاهل هذه الرسالة.',
    },
    verificationApproved: {
      subject: 'تم توثيقك كمسافر',
      heading: 'تمت الموافقة على التحقق من الهوية',
      body: 'مرحباً {name}، تمت الموافقة على التحقق من هويتك. يمكنك الآن نشر رحلاتك واستقبال عروض الطرود.',
    },
    verificationRejected: {
      subject: 'التحقق من هويتك يحتاج إلى إجراء',
      heading: 'لم نتمكن من الموافقة على التحقق من هويتك',
      body: 'مرحباً {name}، السبب الذي ذكره فريقنا: «{reason}». يمكنك إرسال مستندات جديدة من حسابك.',
    },
    offerReceived: {
      subject: 'طرد بانتظار ردك',
      heading: 'عرض طرد جديد',
      body: 'مرحباً {name}، الطرد {reference} يناسب رحلتك. اقبله أو ارفضه قبل انتهاء صلاحية العرض.',
    },
    shipmentMatched: {
      subject: 'قبل مسافر طردك',
      heading: 'لطردك مسافر الآن',
      body: 'مرحباً {name}، قبل مسافر موثّق الطرد {reference}. افتح شحنتك لترتيب التسليم.',
    },
    shipmentNoMatch: {
      subject: 'لم نجد مسافراً بعد',
      heading: 'لا يوجد مسافر للطرد {reference}',
      body: 'مرحباً {name}، لا يوجد مسافر متاح في فترة الانطلاق التي اخترتها. يمكنك تمديد التواريخ أو طلب استرداد المبلغ من حسابك.',
    },
    paymentReceipt: {
      subject: 'تم استلام الدفع للطرد {reference}',
      heading: 'شكراً، تم تأكيد دفعتك',
      body: 'مرحباً {name}، استلمنا {amount} للطرد {reference}. نعرضه الآن على مسافرين موثّقين على طريقك. لا يحصل المسافر على أجره إلا بعد تأكيد التسليم.',
    },
    shipmentDelivered: {
      subject: 'تم تسليم الطرد {reference}',
      heading: 'تم التسليم',
      body: 'مرحباً {name}، أكّد المسافر تسليم الطرد {reference} برمز المستلم. إذا كانت هناك مشكلة، أبلغ عنها من صفحة الشحنة خلال 48 ساعة.',
    },
    recipientOnTheWay: {
      subject: 'طرد في الطريق إليك',
      heading: 'الطرد {reference} في الطريق',
      body: 'مرحباً {name}، طرد في طريقه إليك مع مسافر موثّق من مرسال. أعطِ هذا الرمز للمسافر عند استلامك الطرد فقط.',
    },
    notification: { subject: '{title}', heading: '{title}', body: '{body}' },
  },
};

function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');
}

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

export function renderMail(
  template: MailTemplate,
  locale: MailLocale,
  vars: Record<string, string>,
  options: { code?: string; cta?: { label: string; url: string } } = {},
): RenderedMail {
  const copy = COPY[locale] ?? COPY.en;
  const t = copy[template];
  const subject = fill(t.subject, vars);
  const heading = escapeHtml(fill(t.heading, vars));
  const body = escapeHtml(fill(t.body, vars));
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const align = dir === 'rtl' ? 'right' : 'left';

  const codeBlock = options.code
    ? `<p style="margin:24px 0;font:600 32px/1 'Courier New',monospace;letter-spacing:8px;color:#0B2E33;background:#E6F4F2;border-radius:12px;padding:18px;text-align:center" dir="ltr">${options.code}</p>`
    : '';
  const ctaBlock = options.cta
    ? `<p style="margin:24px 0"><a href="${escapeHtml(options.cta.url)}" style="display:inline-block;background:#0F766E;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">${escapeHtml(options.cta.label)}</a></p>`
    : '';

  const html = `<!doctype html><html lang="${locale}" dir="${dir}"><body style="margin:0;background:#F7F2EA;font-family:Arial,'Segoe UI',sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:16px;border:1px solid #DDE5E4" cellpadding="0" cellspacing="0"><tr><td style="padding:32px;text-align:${align}" dir="${dir}">
<p style="margin:0 0 24px;font:600 22px/1 Arial,sans-serif;color:#0F766E">${locale === 'ar' ? 'مرسال' : 'mersal'}<span style="color:#E2643B">.</span></p>
<h1 style="margin:0 0 12px;font-size:20px;color:#0B2E33">${heading}</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:#52676A">${body}</p>
${codeBlock}${ctaBlock}
<p style="margin:32px 0 0;font-size:12px;color:#8A9A9C">${FOOTER[locale] ?? FOOTER.en}</p>
</td></tr></table></td></tr></table></body></html>`;

  const text = [
    fill(t.heading, vars),
    '',
    fill(t.body, vars),
    options.code ? `\n${options.code}\n` : '',
    options.cta ? `${options.cta.label}: ${options.cta.url}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html, text };
}
