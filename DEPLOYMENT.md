# Firebase App Hosting Deployment Guide

## Quick Start

Your MCP server is now configured for Firebase App Hosting! Here's how to deploy it.

## Prerequisites

1. **Firebase CLI** installed:

   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase project** created:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project or use existing one
   - Enable **App Hosting** (under Build menu)

## Deployment Steps

### 1. Initialize Firebase (if not already done)

```bash
firebase login
firebase init hosting
```

### 2. Deploy to App Hosting

**Option A: Connect via Firebase Console (Recommended)**

1. Go to Firebase Console → App Hosting
2. Click "Get Started" or "Add a repository"
3. Connect your Git repository (GitHub, GitLab, etc.)
4. Firebase will automatically:
   - Detect `apphosting.yaml`
   - Run `buildCommand`: `npm ci && npm run build`
   - Run `runCommand`: `npm run start`
   - Deploy to Cloud Run

**Option B: Deploy from CLI**

```bash
# Deploy your current code
firebase deploy --only hosting
```

### 3. Get Your Deployment URL

After deployment, you'll get a URL like:

```
https://<your-project-id>.web.app
```

Your MCP endpoints will be:

- **Health check**: `https://<your-project-id>.web.app/healthz`
- **MCP endpoint**: `https://<your-project-id>.web.app/mcp`

## Testing Your Deployment

### Test the health endpoint

```bash
curl https://<your-project-id>.web.app/healthz
# Should return: ok
```

### Test the root endpoint

```bash
curl https://<your-project-id>.web.app/
# Should return JSON with server info
```

### Test SSE connection

```bash
curl -N https://<your-project-id>.web.app/mcp
# Should establish connection
```

## Local Testing (Before Deployment)

Test the SSE server locally before deploying:

```bash
# Build and start the server
npm run dev

# In another terminal, test endpoints
curl http://localhost:8080/healthz
curl http://localhost:8080/
```

The server will run on `http://localhost:8080` by default.

## Connecting from VS Code / Copilot

Once deployed, configure VS Code to use the remote Streamable HTTP endpoint.

### For VS Code MCP Extension

Update your `.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "multi-site-docs": {
      "type": "streamable-http",
      "url": "https://<your-project-id>.web.app/mcp"
    }
  }
}
```

### For Claude Desktop

Update `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "multi-site-documentation-server": {
      "transport": "streamable-http",
      "url": "https://<your-project-id>.web.app/mcp"
    }
  }
}
```

## Environment Variables (Optional)

To add environment variables in App Hosting:

1. Edit `apphosting.yaml`:

   ```yaml
   env:
     - variable: NODE_ENV
       value: production
       availability: BUILD
   ```

2. Or set them in Firebase Console → App Hosting → Settings

## Troubleshooting

### "Container failed to start on PORT 8080"

**Cause**: Server not listening on correct port/interface.

**Solution**: The server.ts already does this correctly:

```typescript
const port = parseInt(process.env.PORT || "8080", 10);
app.listen(port, "0.0.0.0", () => { ... });
```

### Check Cloud Run Logs

```bash
firebase hosting:channel:open live
# Then go to Cloud Run logs in console
```

Or visit:

```
https://console.cloud.google.com/run?project=<your-project-id>
```

### Build Failures

Check that `apphosting.yaml` matches your build process:

- `buildCommand` should install deps and compile TypeScript
- `runCommand` should start your server (not a build command)

### SSE Connection Issues

1. Check CORS headers if connecting from browser
2. Verify the MCP endpoint responds properly
3. Test with curl first to isolate client issues

## Files Created/Modified

- ✅ `src/server.ts` - Streamable HTTP server for Firebase App Hosting
- ✅ `apphosting.yaml` - Firebase App Hosting configuration
- ✅ `package.json` - Added express dependencies, updated scripts
- 📝 `src/index.ts` - Original stdio version (kept for reference)

## Key Differences: stdio vs Streamable HTTP

| Feature    | stdio (Local)        | Streamable HTTP (App Hosting) |
| ---------- | -------------------- | ----------------------------- |
| Transport  | StdioServerTransport | StreamableHTTPServerTransport |
| Protocol   | stdin/stdout         | HTTP + Server-Sent Events     |
| Port       | N/A                  | `process.env.PORT` (8080)     |
| Deployment | Local only           | Cloud Run / App Hosting       |
| Access     | VS Code local        | Any HTTP client               |

## Next Steps

1. ✅ Dependencies installed
2. ✅ Server built successfully
3. 🚀 Deploy to Firebase App Hosting
4. 🔗 Update your MCP client config with deployed URL
5. ✨ Start using your documentation server!

## Support

- [Firebase App Hosting Docs](https://firebase.google.com/docs/app-hosting)
- [MCP Documentation](https://modelcontextprotocol.io)
- [Express.js Guide](https://expressjs.com)
