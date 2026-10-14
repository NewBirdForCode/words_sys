<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/e2c08356-e880-4fbc-ae68-26fb6cffcc75

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## FastAPI Backend Integration

The React frontend now uses the FastAPI backend for registration, login/logout, wordbook loading and mutations, and learning-record writes. Set the backend URL before starting Vite:

```bash
cp .env.example .env.local
# Local HTTPS backend:
# VITE_API_BASE_URL="https://localhost:8443"
npm run dev
```

Start the backend separately according to [backend/README.md](backend/README.md). The development HTTPS certificate is self-signed, so the browser must first open `https://localhost:8443/healthz` and accept the local certificate warning. In production, set `VITE_API_BASE_URL` to the trusted HTTPS domain of the deployed API.

The browser keeps only the access token and a cached user profile locally. Business data is read from and written to FastAPI; the existing local cache is used only to keep the learning UI responsive and as a temporary offline fallback.

The following features are also backed by FastAPI:

- mistake book records and resolution state
- anti-forgetting memory progress
- daily plan settings
- teacher classroom management and class vocabulary publishing
- administrator system vocabulary publishing and deactivation

Teachers and administrators see the **班级管理** or **管理后台** entry in the left sidebar after login. A teacher can create multiple classes; each class automatically receives a unique invite code. Students use the **加入班级** entry to enter the code supplied by their teacher. Regenerating a code immediately invalidates the previous code.

## Windows Desktop Packaging

The project includes an Electron desktop wrapper. The desktop app starts the local API server automatically and loads the packaged React interface.

Build a Windows x64 portable executable:

```bash
npm install
npm run desktop:pack:portable
```

The output is written to `release/words_sys-0.0.0-win-x64.exe`.

To build the Windows NSIS installer:

```bash
npm run desktop:pack
```

The NSIS target is best built on Windows or Linux with Wine installed. The portable target does not require an installer environment.
