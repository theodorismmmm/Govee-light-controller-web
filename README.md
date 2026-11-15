# OpenLights

Professional black-and-white web dashboard for Govee lights.

## Features

- Landing page explaining the Govee Open API flow
- API key stored in browser local storage
- Device discovery, power, color, brightness, and presets
- Client-side schedules while the dashboard is open
- Sample-data mode for exploring the UI without a key

## Develop

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Stack

Next.js App Router, TypeScript, Tailwind CSS. Server routes proxy the official Govee Open API so the browser avoids CORS issues. Your API key is never stored on the server.
