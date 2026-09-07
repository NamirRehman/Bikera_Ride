# App Icon and Splash Screen Guide

## Required Images

### 1. App Icon (`icon.png`)
- **Size**: 1024x1024 pixels
- **Format**: PNG with transparency
- **Design**: 
  - Use Bikera brand colors: Purple (#ff3eff) to Blue (#41beee) gradient
  - Logo: "B" letter or bike icon in a rounded square
  - Background: Dark (#191919) or gradient
  - No text (icon only)
  - Safe area: Keep important content within 80% of the image (will be cropped on some platforms)

### 2. Splash Screen (`splash-icon.png`)
- **Size**: 1242x2436 pixels (iOS) or 2048x2732 pixels (recommended for both)
- **Format**: PNG
- **Design**:
  - Background: #191919 (dark)
  - Centered Bikera logo (icon + "Bikera" text)
  - Logo should be ~30-40% of screen height
  - Use brand gradient colors for logo
  - Keep it simple and clean

### 3. Adaptive Icon (`adaptive-icon.png`) - Android
- **Size**: 1024x1024 pixels
- **Format**: PNG with transparency
- **Design**:
  - Same as app icon but ensure important content is in center 66% (Android will mask it)
  - Background color: #191919 (set in app.json)

### 4. Favicon (`favicon.png`) - Web
- **Size**: 48x48 or 192x192 pixels
- **Format**: PNG or ICO
- **Design**: Simplified version of app icon

## Brand Colors Reference
- **Primary Purple**: #ff3eff
- **Primary Blue**: #41beee
- **Background**: #191919
- **Gradient**: Linear from #ff3eff to #41beee

## Design Tips
1. Use high contrast for visibility on different backgrounds
2. Test icon on both light and dark backgrounds
3. Keep design simple - icons are small on devices
4. Use the gradient for brand recognition
5. Ensure logo is centered and balanced

## Current Configuration
All images are already configured in `app.json`:
- Icon: `./assets/icon.png`
- Splash: `./assets/splash-icon.png`
- Adaptive Icon: `./assets/adaptive-icon.png`
- Favicon: `./assets/favicon.png`

## Tools to Create Icons
- **Figma**: Design the icon, export as PNG
- **Canva**: Use templates for app icons
- **Online Tools**: 
  - https://www.appicon.co/
  - https://www.makeappicon.com/
  - https://icon.kitchen/

## After Creating Images
1. Replace the existing files in `assets/` folder
2. Run `npx expo prebuild` to regenerate native code
3. Test on both iOS and Android simulators
4. For production builds, images will be automatically optimized

