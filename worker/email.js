const T = {
    it: {
        subject: "{beer} è arrivata alla Birreria Cassina!",
        hello: "Buone notizie!",
        body: "La birra che aspettavi, <strong>{beer}</strong>{brewery}, è ora disponibile da noi.",
        cta: "Guarda il menu di oggi",
        footer: "Hai ricevuto questa email perché hai chiesto di essere avvisato per questa birra. Riceverai un solo avviso.",
        unsub: "Annulla gli avvisi",
    },
    en: {
        subject: "{beer} has arrived at Birreria Cassina!",
        hello: "Good news!",
        body: "The beer you were waiting for, <strong>{beer}</strong>{brewery}, is now available.",
        cta: "See today's menu",
        footer: "You received this email because you asked to be notified about this beer. You will get just this one notice.",
        unsub: "Cancel notifications",
    },
    de: {
        subject: "{beer} ist in der Birreria Cassina angekommen!",
        hello: "Gute Nachrichten!",
        body: "Das Bier, auf das du gewartet hast, <strong>{beer}</strong>{brewery}, ist jetzt erhältlich.",
        cta: "Zur heutigen Karte",
        footer: "Du erhältst diese E-Mail, weil du für dieses Bier benachrichtigt werden wolltest. Es ist die einzige Nachricht.",
        unsub: "Benachrichtigungen abbestellen",
    },
    fr: {
        subject: "{beer} est arrivée à la Birreria Cassina !",
        hello: "Bonne nouvelle !",
        body: "La bière que vous attendiez, <strong>{beer}</strong>{brewery}, est maintenant disponible.",
        cta: "Voir le menu du jour",
        footer: "Vous recevez cet e-mail car vous avez demandé à être prévenu pour cette bière. C'est le seul message.",
        unsub: "Annuler les alertes",
    },
    es: {
        subject: "¡{beer} ha llegado a la Birreria Cassina!",
        hello: "¡Buenas noticias!",
        body: "La cerveza que esperabas, <strong>{beer}</strong>{brewery}, ya está disponible.",
        cta: "Ver el menú de hoy",
        footer: "Has recibido este correo porque pediste que te avisáramos de esta cerveza. Solo recibirás este aviso.",
        unsub: "Cancelar avisos",
    },
};
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
export function arrivalEmail(lang, beer, brewery, menuUrl, unsubUrl) {
    const t = T[lang] ?? T.it;
    const b = esc(beer);
    const br = brewery ? ` (${esc(brewery)})` : "";
    const cta = menuUrl
        ? `<p style="margin:28px 0"><a href="${esc(menuUrl)}" style="background:#D97706;color:#ffffff;` +
            `padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:bold">${t.cta}</a></p>`
        : "";
    const unsub = unsubUrl ? ` <a href="${esc(unsubUrl)}" style="color:#8a7a6a">${t.unsub}</a>` : "";
    const html = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5EBE1">' +
        '<tr><td align="center" style="padding:32px 16px">' +
        '<table role="presentation" width="560" cellpadding="0" cellspacing="0" ' +
        'style="max-width:560px;background:#ffffff;border-top:4px solid #D97706;border-radius:8px">' +
        '<tr><td style="padding:32px;font-family:Georgia,serif;color:#1C1713">' +
        '<p style="margin:0;font-size:12px;letter-spacing:3px;color:#B45309;text-transform:uppercase">Birreria Cassina</p>' +
        `<h1 style="margin:12px 0 0;font-size:26px">${t.hello}</h1>` +
        `<p style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5">${t.body.replace("{beer}", b).replace("{brewery}", br)}</p>` +
        cta +
        `<p style="font-family:Arial,sans-serif;font-size:12px;color:#8a7a6a;line-height:1.5">${t.footer}${unsub}</p>` +
        '<p style="font-family:Arial,sans-serif;font-size:12px;color:#8a7a6a">— Birreria Cassina</p>' +
        "</td></tr></table></td></tr></table>";
    return { subject: t.subject.replace("{beer}", beer), html };
}
export class EmailUnavailable extends Error {
}
export async function sendEmail(env, to, subject, html) {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM)
        throw new EmailUnavailable("RESEND_API_KEY / EMAIL_FROM non configurati");
    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            from: env.EMAIL_FROM,
            to: [to],
            subject,
            html,
            ...(env.EMAIL_REPLY_TO ? { reply_to: env.EMAIL_REPLY_TO } : {}),
        }),
    });
    if (!res.ok)
        throw new EmailUnavailable(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}
