# 3DVista Enhanced Search Pro Plugin

## Overview

This plugin enables advanced, customizable search for 3DVista virtual tours, providing enhanced indexing, flexible filtering, history, keyboard navigation, custom UI, and integration with external data sources like Google Sheets.

---

## Table of Contents

- [1. Version Comparison: v1.3 vs v2.0](#1-version-comparison-v13-v20)
- [2. New in v2.0 (Modular Architecture)](#2-new-in-v20-modular-architecture)
- [3. Key Features](#3-key-features)
- [4. Migration Guide](#4-migration-guide)
- [5. Usage Instructions](#5-usage-instructions)
- [6. Configuring Default Images and Google Sheets](#6-configuring-default-images-and-google-sheets)
- [7. Troubleshooting](#7-troubleshooting)
- [8. File Structure](#8-file-structure)
- [9. Changelog](#9-changelog)

---

## 1. Version Comparison: v1.3 vs v2.0

| Feature/Aspect          | v1.3 (Legacy)                                  | v2.0 (Modular/Current)                                                 |
| ----------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| **File Structure**      | Single, monolithic JS file                     | Modular: multiple files, each for a subsystem                          |
| **Initialization**      | Simple, inline; direct access to tour object   | Modular, event-driven, robust playlist detection & error handling      |
| **Search Index**        | Basic Fuse.js config, single item type         | Multi-type index, advanced weighting, flexible filtering (white/black) |
| **Filtering**           | Whitelist/Blacklist blocks (comment/uncomment) | Configurable in UI/config file, persistent, and dynamic                |
| **UI Customization**    | Hardcoded in JS                                | Full theme/appearance config, CSS variable support, live preview       |
| **Result Grouping**     | Sorted by label, no type grouping              | Grouped by type (Panorama, Hotspot, etc), user-configurable order      |
| **Thumbnails**          | Icon-based only                                | Type-specific default images, CDN/URL support, error fallback          |
| **Google Sheets**       | Not supported                                  | Full hybrid integration, CSV/JSON, caching, and progressive loading    |
| **History**             | LocalStorage, simple max-items                 | Modular, optional, with UI and clear controls                          |
| **Keyboard Navigation** | Up/down/enter, focus handling                  | Modular, ARIA roles, improved accessibility                            |
| **Error Handling**      | Console logs, no user feedback                 | Verbose logs, debug module, user error UI, asset validation            |
| **Extensibility**       | Difficult, must edit file directly             | Config file driven, ready for control panel/GUI, live config updates   |
| **Tour Integration**    | Button-triggered only, hardcoded               | Fully compatible with 3DVista’s tour button actions and overlays       |
| **Result Rendering**    | Inline HTML strings, minimal state separation  | Template-driven, robust classes, maintainable DOM structure            |
| **Testing/Debugging**   | No diagnostics                                 | Debug core module, validation utilities, logging separation            |

---

## 2. New in v2.0 (Modular Architecture)

- **Modular Design:** Files for search engine, UI manager, DOM handler, data manager, utils, debug, and config.
- **Config-Driven:** All settings (appearance, grouping, filtering, thumbnail logic, Google Sheets, etc.) are defined in one central config object or file.
- **Type-Specific Thumbnails:** Assign per-type images via CDN or assets. Flexible for future control panels.
- **Google Sheets Integration:** Hybrid and primary data source modes, supports CSV/JSON, caching, progressive loading.
- **Robust Error Handling:** Comprehensive debug logs, user-facing errors, fallback and validation for assets.
- **CSS Separation:** All visual styles, thumbnail sizes, and border radius defined in CSS variables, supporting live preview and theming.
- **Diagnostic Tools:** Asset validation, result rendering debug hooks, and logs are modularized and optional.

---

## 3. Key Features

- **Flexible Search Indexing** (via Fuse.js, with weights for label, tags, description)
- **Whitelist/Blacklist Filtering** (in config, not code)
- **Advanced UI Customization:** Theme, border radius, result group order, icon or thumbnail per type
- **Thumbnail Support:** Type-specific, fallback, and CDN-compatible
- **Google Sheets Data Integration:** External data can supplement or override tour metadata
- **Robust Keyboard Navigation:** Improved accessibility (focus, ARIA roles)
- **Comprehensive Debug Logging:** Modular, with options to validate assets, log errors, and inspect behavior

---

## 4. Migration Guide

**Upgrading from v1.3 to v2.0:**

- Move config settings to the central config section (see below).
- Move custom thumbnail/image URLs to the `defaultImages` object in config.
- If you have custom whitelist/blacklist arrays, move those to the filtering config.
- All custom CSS (border radius, thumbnail size) should go in `search-01.css` using CSS variables, not inline JS.
- Google Sheets: Update your spreadsheet structure to match the data fields in the config and enable `googleSheets.useGoogleSheetData`.
- Place all scripts in `/search-pro/js/` and assets in `/search-pro/assets/`.

---

## 5. Usage Instructions

### Basic Setup

1. **Include All Scripts and CSS**

   ```html
   <link rel="stylesheet" href="search-pro/css/search-01.css" />
   <script src="search-pro/js/search-01.js"></script>
   <!-- ...other modules as needed... -->
   ```

2. **Set Up the Search Container**

   ```html
   <div id="searchContainer"></div>
   ```

3. **Initialize with the Tour Button**

   - Set 3DVista's button action to:  
     `window.tourSearchFunctions.initializeSearch(this);`
   - Search will appear and update via the new modular code.

4. **Update Config (optional)**
   - Modify `window.tourSearchFunctions.updateConfig({...})` to customize thumbnails, filtering, Sheets, etc.

---

## 6. Configuring Default Images and Google Sheets

### Type-Specific Thumbnails (Example)

```js
defaultImages: {
  Panorama: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=400&fit=crop",
  Hotspot: "https://images.unsplash.com/photo-1465101162946-4377e57745c3?w=400&h=400&fit=crop",
  Video: "https://images.unsplash.com/photo-1454023492550-5696f8ff10e1?w=400&h=400&fit=crop",
  default: "https://picsum.photos/400/400?random=1"
}
To use local assets: Place images in /search-pro/assets/ and use relative paths, e.g. "./search-pro/assets/panorama-default.jpg"

Google Sheets Integration
Make sure your sheet has at least these columns:
id, tag, name, description, imageUrl, elementType, parentId

Example config:

js
Always show details

Copy
googleSheets: {
  useGoogleSheetData: true,
  googleSheetUrl: "<YOUR_PUBLISHED_CSV_OR_JSON_URL>",
  fetchMode: "csv",
  // ...other options...
}
7. Troubleshooting
No Results?

Ensure mainPlayList is available before initialization (console logs will help).

Check CDN/asset URLs for typos.

Use the debug core for thumbnail validation:
window.searchProDebug.validateThumbnailAssets()

Google Sheets Not Loading?

Publish your sheet as CSV or JSON and make sure your API key (if needed) is correct.

Sheet must be public or shared with appropriate permissions.

CSS Not Applying?

Check for correct path and variable usage in search-01.css.

Keyboard Navigation Broken?

Confirm that ARIA roles and tabindex are preserved in your DOM.

Search UI Not Appearing?

Make sure the search container exists and scripts are loaded in order.

8. File Structure
arduino
Always show details

Copy
/search-pro/
  ├── assets/
  │   ├── panorama-default.jpg
  │   ├── hotspot-default.jpg
  │   ├── video-default.jpg
  │   ├── business-default.jpg
  │   └── default-thumbnail.jpg
  ├── css/
  │   └── search-01.css
  ├── js/
  │   ├── search-01.js
  │   ├── ui-manager.js
  │   ├── dom-handler.js
  │   ├── data-manager.js
  │   ├── search-engine.js
  │   ├── related-content.js
  │   ├── debug-core.js
  │   └── ...
  └── extras/
      └── READ.ME
9. Changelog
v2.0 (Current)

Full modularization, new configuration system

Type-specific and CDN-based thumbnails

Google Sheets integration with validation/caching

Enhanced result grouping, ordering, and rendering

Debug core module for diagnostics and validation

Improved keyboard and accessibility support

CSS-driven theming and appearance controls

v1.3 (Legacy)

Monolithic file

Basic search/filter with whitelist/blacklist

Only icon-based result rendering

Simple history and keyboard navigation

No external data or diagnostic support

For migration support, usage questions, or customization help, contact the original developer or open an issue in your project repository.
```
