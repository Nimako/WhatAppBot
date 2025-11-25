/**
 * Simple script to generate placeholder PWA icons
 * Run with: node src/public/generate-icons.js
 * Requires: canvas package (npm install canvas) or use online tools
 * 
 * For quick setup, use online icon generators instead:
 * - https://realfavicongenerator.net/
 * - https://www.pwabuilder.com/imageGenerator
 */

console.log(`
PWA Icon Generation Guide
=========================

To make your PWA installable, you need icon files. Here are your options:

OPTION 1: Online Icon Generator (Recommended)
----------------------------------------------
1. Go to: https://realfavicongenerator.net/
2. Upload a 512x512 PNG image with your logo
3. Download the generated icons
4. Place icon-192.png and icon-512.png in:
   - src/public/web/
   - src/public/mobile/

OPTION 2: Create Simple Icons
------------------------------
Create two PNG files for each app:

Web Chat Icons (src/public/web/):
- icon-192.png (192x192 pixels, green background #25d366)
- icon-512.png (512x512 pixels, green background #25d366)

Mobile App Icons (src/public/mobile/):
- icon-192.png (192x192 pixels, purple gradient #667eea to #764ba2)
- icon-512.png (512x512 pixels, purple gradient #667eea to #764ba2)

You can use any image editor or online tools like:
- https://www.canva.com/
- https://www.figma.com/
- https://www.gimp.org/

OPTION 3: Use Placeholder Service (Temporary)
----------------------------------------------
For testing, you can temporarily use a placeholder service:
- Update manifest.json to use: "src": "https://via.placeholder.com/192"
- This is only for testing - replace with real icons for production

IMPORTANT NOTES:
- Icons must be PNG format
- Icons must exist for PWA installation to work
- Check browser console for PWA debug info
- HTTPS is required for production (localhost works for development)
`);

