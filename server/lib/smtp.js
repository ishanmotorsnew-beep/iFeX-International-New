export function normalizeSmtpPassword(pass) {
  return typeof pass === 'string' ? pass.replace(/\s+/g, '') : '';
}

export function buildSmtpCandidates({ host, port, secure, user, pass }) {
  const normalizedPass = normalizeSmtpPassword(pass);

  if (!host || !user || !normalizedPass) {
    return [];
  }

  const configuredPort = Number(port) || (secure !== false ? 465 : 587);
  const configuredSecure = secure !== false;
  const isGmail = /gmail\.com$/i.test(host);

  if (isGmail) {
    return [
      { service: 'gmail', auth: { user, pass: normalizedPass } },
      {
        host,
        port: 587,
        secure: false,
        requireTLS: true,
        auth: { user, pass: normalizedPass },
        tls: { ciphers: 'TLSv1.2' },
      },
    ];
  }

  const candidates = [{ host, port: configuredPort, secure: configuredSecure, auth: { user, pass: normalizedPass } }];

  if (configuredPort !== 587 && configuredSecure) {
    candidates.push({ host, port: 587, secure: false, auth: { user, pass: normalizedPass }, tls: { ciphers: 'TLSv1.2' } });
  }

  return candidates;
}
