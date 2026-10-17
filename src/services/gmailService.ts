import { getAccessToken } from './firebaseService';

export interface GmailSummaryMessage {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
}

function encodeBase64Url(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.byteLength; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function fetchRecentClubEmails(): Promise<{
  needsAuth: boolean;
  messages: GmailSummaryMessage[];
}> {
  const token = await getAccessToken();
  if (!token) {
    return { needsAuth: true, messages: [] };
  }

  const listRes = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5',
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (listRes.status === 401 || listRes.status === 403) {
    return { needsAuth: true, messages: [] };
  }
  if (!listRes.ok) {
    throw new Error(`Gmail mesaj listesi alınamadı (${listRes.status})`);
  }

  const listData = (await listRes.json()) as { messages?: Array<{ id: string }> };
  const rawList = listData.messages || [];
  const details: GmailSummaryMessage[] = [];

  for (const item of rawList.slice(0, 4)) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    if (!msgRes.ok) continue;
    const msgJson = (await msgRes.json()) as {
      id: string;
      snippet?: string;
      payload?: { headers?: Array<{ name: string; value: string }> };
    };
    const headers = msgJson.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    details.push({
      id: msgJson.id,
      subject: getHeader('Subject') || '(Konusuz İleti)',
      from: getHeader('From') || 'Arena Ağı',
      date: getHeader('Date') || '',
      snippet: msgJson.snippet || ''
    });
  }

  return { needsAuth: false, messages: details };
}

export async function sendGmailMessage(params: {
  to: string;
  subject: string;
  bodyText: string;
}): Promise<{ ok: boolean; needsAuth?: boolean; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { ok: false, needsAuth: true, error: 'Gmail erişim anahtarı bulunamadı.' };
  }

  const mimeMessage = [
    `To: ${params.to.trim()}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(params.subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    params.bodyText
  ].join('\r\n');

  const raw = encodeBase64Url(mimeMessage);
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw })
  });

  if (res.status === 401 || res.status === 403) {
    return { ok: false, needsAuth: true, error: 'Gmail oturum izni gerekli.' };
  }
  if (!res.ok) {
    return { ok: false, error: `E-posta gönderilemedi (${res.status})` };
  }
  return { ok: true };
}
