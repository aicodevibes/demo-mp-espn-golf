# Ticket 05: Firebase App Hosting Deployment Pipeline

Type: task
Status: resolved
Blocked by: 02

## Question

How will the Next.js App Router app be configured with `apphosting.yaml` and `.env.local` environment variables for seamless deployment to Firebase App Hosting?

## Answer

### 1. Configuration (`apphosting.yaml`)
Updated `apphosting.yaml` to declare environment variables for build and runtime availability:

```yaml
runConfig:
  minInstances: 0

env:
  - variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID
    value: fir-demo-mp
    availability:
      - BUILD
      - RUNTIME
  - variable: NEXT_PUBLIC_ADMIN_EMAIL
    value: aicodevibes@gmail.com
    availability:
      - BUILD
      - RUNTIME
```

### 2. Environment Variables & Local Development
- Client-side environment variables are declared with `NEXT_PUBLIC_` prefix in `.env.local` for local development.
- Production secrets (if added later) will use Firebase Secret Manager (`firebase apphosting:secrets:set <secretName>`).

### 3. Build & Deployment Pipeline
- Firebase App Hosting backend configured for `fir-demo-mp` in region `us-east4`.
- Auto-deploys from GitHub `main` branch.
- Pre-deploy verification command: `npm run build`.

