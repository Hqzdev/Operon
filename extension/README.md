# Operon Lens Extension

Chrome extension for the Operon in-browser integration layer.

## Load Locally

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `extension` folder.

## Current Scope

- Manifest V3 extension.
- Popup with extension key, page scan, and sync controls.
- Background service worker.
- Content script registration for Meta, TikTok, and Shopify surfaces.
- Basic visible metric parsing for Meta, TikTok, and Shopify.
- POST sync to `/integrations/extension/sync`.

## Connect

1. Open Operon → Settings → Integrations.
2. Create an extension connection and copy the extension key.
3. Paste the key in the extension popup.
4. Open Meta Ads, TikTok Ads, or Shopify Admin.
5. Click Sync data.
