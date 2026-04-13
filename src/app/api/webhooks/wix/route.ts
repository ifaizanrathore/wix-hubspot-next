import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { syncWixToHubSpot } from '@/lib/services/syncService';

const SITE_ID = process.env.WIX_SITE_ID!;

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Acknowledge immediately — process async
  const rawBody = await req.text();

  // Respond before processing to avoid webhook timeouts
  setImmediate(async () => {
    try {
      // Optional HMAC verification
      const secret = process.env.WIX_WEBHOOK_SECRET;
      if (secret && secret !== 'your_wix_webhook_secret_here') {
        const sig = req.headers.get('x-wix-signature') ?? '';
        const expected = crypto
          .createHmac('sha256', secret)
          .update(rawBody)
          .digest('base64');
        if (sig !== expected) {
          console.warn('[Wix Webhook] Invalid signature — ignoring');
          return;
        }
      }

      const body = JSON.parse(rawBody) as {
        entityId?: string;
        eventType?: string;
        data?: { eventType?: string };
      };

      const { entityId, eventType } = body;
      if (!entityId) return;

      console.log(`[Wix Webhook] event=${eventType} contactId=${entityId}`);

      if (
        eventType?.includes('contact_created') ||
        eventType?.includes('contact_updated')
      ) {
        await syncWixToHubSpot(SITE_ID, entityId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown';
      console.error('[Wix Webhook] Error:', msg);
    }
  });

  return NextResponse.json({ received: true });
}
