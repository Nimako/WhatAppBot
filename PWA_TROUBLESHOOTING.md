# PWA Troubleshooting Guide

## Why is the Install Button Not Showing?

The install button appears when the `beforeinstallprompt` event fires. This event only fires when all PWA requirements are met.

### Check These Requirements:

1. **Icons Must Exist**
   - Create `icon-192.png` and `icon-512.png` in both `/web/` and `/mobile/` directories
   - Icons must be valid PNG files
   - See `src/public/generate-icons.js` for instructions

2. **HTTPS Required (Production)**
   - PWAs require HTTPS in production
   - `localhost` works for development
   - Use ngrok or similar for testing: `ngrok http 3000`

3. **Service Worker Must Register**
   - Check browser console for "Service Worker registered" message
   - If you see errors, check the service worker file path
   - Service worker must be served from the same origin

4. **Valid Manifest**
   - Manifest must be accessible at `/web/manifest.json` or `/mobile/manifest.json`
   - Check browser console for manifest errors
   - Open DevTools > Application > Manifest to verify

5. **Not Already Installed**
   - If app is already installed, the prompt won't show
   - Check if running in standalone mode

## Debug Steps:

1. **Open Browser Console**
   - Look for "PWA Debug Info" messages
   - Check for any errors

2. **Check Service Worker**
   - DevTools > Application > Service Workers
   - Should show "activated and running"

3. **Check Manifest**
   - DevTools > Application > Manifest
   - Verify all fields are correct
   - Check for icon errors

4. **Test on Different Browsers**
   - Chrome/Edge: Full PWA support
   - Safari iOS: Limited support (uses "Add to Home Screen")
   - Firefox: Limited support

## Quick Fixes:

### If Icons Are Missing:
```bash
# Create simple placeholder icons using ImageMagick
# Or use online tools mentioned in generate-icons.js
```

### If Service Worker Fails:
- Check that `/web/sw.js` and `/mobile/sw.js` are accessible
- Verify service worker scope matches manifest scope
- Clear browser cache and reload

### If Manifest Errors:
- Verify manifest.json is valid JSON
- Check that all required fields are present
- Ensure icons array has valid entries

## Testing Installation:

1. **Chrome/Edge Desktop:**
   - Look for install icon in address bar
   - Or use the install button that appears

2. **Chrome Android:**
   - "Add to Home Screen" prompt appears automatically
   - Or use browser menu > "Install app"

3. **Safari iOS:**
   - Use Share button > "Add to Home Screen"
   - No automatic prompt (iOS limitation)

## Console Debugging:

The app now logs detailed debug info:
- Service Worker registration status
- Standalone mode detection
- Install prompt availability
- Reasons why install might not be available

Check the browser console for these messages!

