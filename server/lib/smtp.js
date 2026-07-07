export function buildSmtpCandidates({ host, port, secure, user, pass }) {
  if (!host || !user || !pass) {
    return [];
  }

  const configuredPort = Number(port) || (secure !== false ? 465 : 587);
  const configuredSecure = secure !== false;
  const isGmail = /gmail\.com$/i.test(host);

  if (isGmail) {
    return [
      { host, port: 465, secure: true },
      { host, port: 587, secure: false, tls: { ciphers: 'TLSv1.2' } },
    ];
  }

  const candidates = [{ host, port: configuredPort, secure: configuredSecure }];

  if (configuredPort !== 587 && configuredSecure) {
    candidates.push({ host, port: 587, secure: false, tls: { ciphers: 'TLSv1.2' } });
  }

  return candidates;
}
