# Firebase App Hosting - Quick Reference

## ✅ Setup Complete!

Your MCP server is ready for Firebase App Hosting deployment.

## What Was Created/Modified

### New Files

- **`src/server.ts`** - SSE/HTTP server for Firebase App Hosting
- **`apphosting.yaml`** - Firebase deployment configuration
- **`DEPLOYMENT.md`** - Complete deployment guide

### Modified Files

- **`package.json`** - Added express dependencies, updated scripts
- **`README.md`** - Added Firebase App Hosting notice

### Preserved Files

- **`src/index.ts`** - Original stdio version (for local VS Code use)
- **`.vscode/mcp.json`** - Local VS Code MCP configuration

## Quick Commands

### Local Development

```bash
# Build TypeScript
npm run build

# Start server (port 8080)
npm run start

# Or build + start
npm run dev

# Test health endpoint
curl http://localhost:8080/healthz
```

### Deploy to Firebase

```bash
# One-time setup
firebase login
firebase init hosting

# Deploy (via Console recommended)
# 1. Go to Firebase Console → App Hosting
# 2. Connect your Git repository
# 3. Firebase auto-detects apphosting.yaml
```

## Key Configuration

### apphosting.yaml

```yaml
scripts:
  buildCommand: npm ci && npm run build
  runCommand: npm run start
```

### Server Details

- **Port**: `process.env.PORT` or 8080
- **Interface**: 0.0.0.0 (required for Cloud Run)
- **Transport**: SSE (Server-Sent Events)

## Endpoints

Once deployed to `https://your-app.web.app`:

| Endpoint       | Purpose                               |
| -------------- | ------------------------------------- |
| `/`            | Server info and API overview          |
| `/healthz`     | Health check (returns "ok")           |
| `/mcp/sse`     | SSE stream (MCP client connects here) |
| `/mcp/message` | Message endpoint (client → server)    |

## MCP Tools Available

1. **fetch_doc_index** - Get documentation index
2. **fetch_doc_page** - Fetch specific doc page
3. **search_docs** - Search documentation

All tools support: module-federation, modernjs, firebase sites

## Next Steps

1. **Test locally** (already done ✅):

   ```bash
   npm run start
   curl http://localhost:8080/healthz
   ```

2. **Deploy to Firebase**:
   - Connect repo in Firebase Console → App Hosting
   - Firebase will build and deploy automatically

3. **Connect client**:
   - Update VS Code/Copilot config with deployed URL
   - Use SSE transport instead of stdio

4. **Monitor**:
   - Check Cloud Run logs in Firebase Console
   - Health endpoint for uptime monitoring

## Troubleshooting

### Port Issues

✅ Server listens on `process.env.PORT` with 0.0.0.0 interface

### Build Failures

✅ `apphosting.yaml` specifies correct build commands

### SSE Connection

✅ Server uses `SSEServerTransport` from MCP SDK

## Support Resources

- [Full Deployment Guide](DEPLOYMENT.md)
- [Firebase App Hosting Docs](https://firebase.google.com/docs/app-hosting)
- [MCP Documentation](https://modelcontextprotocol.io)

---

**Status**: ✅ Ready to deploy!
