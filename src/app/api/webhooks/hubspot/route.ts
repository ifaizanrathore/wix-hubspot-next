import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Installation from '@/lib/models/Installation';
import { getContact } from '@/lib/services/hubspotService';
import { syncHubSpotToWix } from '@/lib/services/syncService';

interface HsEvent {
  subscriptionType?: string;
  objectId?: number;
  portalId?: number;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();

  setImmediate(async () => {
    try {
      await connectDB();
      const body = JSON.parse(rawBody) as HsEvent | HsEvent[];
      const events = Array.isArray(body) ? body : [body];

      for (const event of events) {
        const { subscriptionType, objectId, portalId } = event;
        if (!objectId || !portalId) continue;

        const inst = await Installation.findOne({
          hubspotPortalId: String(portalId),
          isConnected: true,
        });
        if (!inst) {
          console.warn(`[HubSpot Webhook] No installation for portal ${portalId}`);
          continue;
        }

        console.log(`[HubSpot Webhook] type=${subscriptionType} objectId=${objectId}`);

        if (
          subscriptionType === 'contact.creation' ||
          subscriptionType === 'contact.propertyChange'
        ) {
          const contact = await getContact(
            inst.siteId,
            String(objectId),
            ['email', 'firstname', 'lastname', 'phone', 'company', 'jobtitle'],
          );
          await syncHubSpotToWix(inst.siteId, String(objectId), contact.properties);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown';
      console.error('[HubSpot Webhook] Error:', msg);
    }
  });

  return NextResponse.json({ received: true });
}
