# Icon Generation for Web Chat PWA

To make the PWA installable, you need to create icon files. Here are two options:

## Option 1: Generate Icons Online
1. Go to https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator
2. Upload a 512x512 PNG image with your app logo
3. Download the generated icons
4. Place `icon-192.png` and `icon-512.png` in this directory

## Option 2: Create Simple Icons Manually
Create two PNG files:
- `icon-192.png` - 192x192 pixels
- `icon-512.png` - 512x512 pixels

Use a green (#25D366) background with a white chat/message icon or ECG logo.

## Quick SVG to PNG Conversion
You can use online tools like:
- https://cloudconvert.com/svg-to-png
- https://convertio.co/svg-png/

Or use ImageMagick:
```bash
convert -background "#25D366" -size 512x512 icon.svg icon-512.png
convert -background "#25D366" -size 192x192 icon.svg icon-192.png
```

## Temporary Solution
For development, you can use placeholder images or skip icons (the PWA will still work but won't show an icon when installed).

