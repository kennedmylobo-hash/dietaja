export interface EvolutionCredentials {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

export async function sendWhatsAppText(
  phone: string,
  message: string,
  credentials: EvolutionCredentials
): Promise<{ success: boolean; messageId?: string; error?: string; response?: any }> {
  const formattedPhone = formatPhone(phone);
  const url = `${credentials.apiUrl}/message/sendText/${credentials.instanceName}`;

  console.log(`[EVOLUTION] Sending text to ${formattedPhone} via ${credentials.instanceName}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': credentials.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
      }),
    });

    const responseText = await response.text();
    let responseJson: any = null;
    try { responseJson = JSON.parse(responseText); } catch (_) {}

    const messageId = responseJson?.key?.id || responseJson?.messageId || responseJson?.id;

    if (!response.ok) {
      console.error(`[EVOLUTION] ❌ API error ${response.status}: ${responseText}`);
      return { success: false, error: responseText, response: { status: response.status, body: responseJson || responseText } };
    }

    console.log(`[EVOLUTION] ✅ Message sent to ${formattedPhone}, messageId: ${messageId}`);
    return { success: true, messageId, response: responseJson };
  } catch (error) {
    console.error('[EVOLUTION] ❌ Exception:', error);
    return { success: false, error: String(error) };
  }
}

export async function sendWhatsAppMedia(
  phone: string,
  mediaUrl: string,
  caption: string,
  credentials: EvolutionCredentials,
  mediaType: 'image' | 'document' | 'video' = 'image'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const formattedPhone = formatPhone(phone);
  const url = `${credentials.apiUrl}/message/sendMedia/${credentials.instanceName}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': credentials.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: formattedPhone,
        mediatype: mediaType,
        media: mediaUrl,
        caption,
      }),
    });

    const responseText = await response.text();
    let responseJson: any = null;
    try { responseJson = JSON.parse(responseText); } catch (_) {}
    const messageId = responseJson?.key?.id || responseJson?.messageId;

    if (!response.ok) {
      return { success: false, error: responseText };
    }
    return { success: true, messageId };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
