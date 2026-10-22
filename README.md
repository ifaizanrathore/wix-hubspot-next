# Wix ↔ HubSpot Contact Sync

[![CI](https://github.com/ifaizanrathore/wix-hubspot-next/actions/workflows/ci.yml/badge.svg)](https://github.com/ifaizanrathore/wix-hubspot-next/actions/workflows/ci.yml)

Two-way contact sync between a Wix site and HubSpot, built as a single Next.js app: API routes handle OAuth and webhooks, and a dashboard shows the connection, field mappings and sync history.

## Features

- **HubSpot OAuth 2.0** with access and refresh tokens stored encrypted in MongoDB and refreshed automatically
- **Two-way sync**: Wix contact webhooks update HubSpot, HubSpot webhooks update Wix
- **Loop prevention**: each sync records its source and time, so the echo webhook from the other side is skipped within a 60-second window, and unchanged values are not written again
- **Form capture**: Wix form submissions create or update HubSpot contacts, including UTM source, medium and campaign
- **Configurable field mapping** per site, with the Wix fields and HubSpot properties loaded live
- **Wix webhook signature check** when `WIX_WEBHOOK_SECRET` is set
- **Dashboard** with Overview, Field Mappings and Sync Logs tabs

## Tech stack

- Next.js 16 (App Router, API routes), React 19, TypeScript
- MongoDB with Mongoose
- Tailwind CSS
- HubSpot CRM API (scopes: `crm.objects.contacts.read`, `crm.objects.contacts.write`) and Wix REST API

## Run locally

```bash
git clone https://github.com/ifaizanrathore/wix-hubspot-next.git
cd wix-hubspot-next
npm install
```

Create `.env.local`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/wix-hubspot
JWT_SECRET=a-long-random-string

HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=
HUBSPOT_REDIRECT_URI=http://localhost:3001/oauth/callback

WIX_API_KEY=
WIX_SITE_ID=
WIX_WEBHOOK_SECRET=

NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_SITE_ID=
```

Then:

```bash
npm run dev   # http://localhost:3001
```

The redirect URI and scopes must match the ones configured in your HubSpot app.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server on port 3001 |
| `npm run lint` | Run ESLint |
| `npm run build` | Production build |

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── oauth/          # initiate, callback, status
│   │   ├── webhooks/       # wix, hubspot
│   │   ├── field-mappings/ # mappings, Wix fields, HubSpot properties
│   │   ├── contacts/       # manual sync, contact mappings
│   │   ├── forms/          # form submission capture
│   │   └── dashboard/      # stats, logs
│   └── page.tsx            # dashboard
├── components/             # ConnectionStatus, FieldMappingTable, StatsCards, SyncLogs
└── lib/
    ├── models/             # ContactMapping, FieldMapping, Installation, SyncLog
    └── services/           # hubspot, wix, sync engine, token encryption
```

## License

Released under the [MIT License](LICENSE).
