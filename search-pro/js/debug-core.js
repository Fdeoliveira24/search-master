/**
 * Search Pro Debug Utilities
 * Comprehensive diagnostics for search features including business data and Google Sheets integration
 */

// [1.0] DEBUG CORE MODULE
(() => {
  console.log("🔧 [Search Pro] Debug v2.0 Loaded");

  // --- [2.0] TOUR DEBUG ENHANCED (from tour-debug-v5.js) ---
  window.tourDebug = (function () {
    /**
     * Gets the type of an overlay element based on class and data
     * @param {Object} overlay - The overlay to analyze
     * @return {String} - The identified element type
     */
    function getElementType(overlay) {
      if (!overlay) return "Unknown";
      const className = overlay.get("class");
      const data = overlay.get("data");
      const label = (data && data.label ? data.label : "").toLowerCase();
      switch (className) {
        case "HotspotPanoramaOverlay":
          if (label.includes("polygon")) return "Polygon";
          if (label.includes("image")) return "Projected Image";
          if (label.includes("info") || label.includes("text")) return "Text";
          return "Hotspot";
        case "QuadVideoPanoramaOverlay":
          return "Video";
        case "FramePanoramaOverlay":
          if (label.includes("floor") || label.includes("map"))
            return "Floorplan";
          return "Webframe";
        case "ImagePanoramaOverlay":
          return "Image";
        default:
          return className || "Element";
      }
    }

    /**
     * Extracts and formats overlay attributes in a readable form
     * @param {Object} overlay - The overlay to analyze
     * @return {Object} - Formatted attributes
     */
    function getOverlayAttributes(overlay) {
      if (!overlay) return {};
      try {
        const data = overlay.get("data") || {};
        const attributeMap = {};
        ["id", "class", "label", "title", "subtitle", "description"].forEach(
          (prop) => {
            const value = overlay.get(prop) || data[prop];
            if (value !== undefined) attributeMap[prop] = value;
          },
        );
        if (overlay.get("class") === "HotspotPanoramaOverlay") {
          attributeMap.hasPanoramaAction = data.hasPanoramaAction;
          attributeMap.hasOpenableMedia = data.hasOpenableMedia;
          attributeMap.targets = data.targets;
        }
        if (overlay.get("class") === "QuadVideoPanoramaOverlay") {
          attributeMap.videoUrl = data.video && data.video.url;
          attributeMap.videoAutoplay = data.video && data.video.autoplay;
        }
        if (overlay.get("class") === "FramePanoramaOverlay") {
          attributeMap.url = data.url;
          attributeMap.frameWidth = data.width;
          attributeMap.frameHeight = data.height;
        }
        return attributeMap;
      } catch (e) {
        return { error: e.message };
      }
    }

    /**
     * Enhanced 3DVista tour inspection and overlay analysis
     */
    function inspectTour() {
      console.log("=== ENHANCED TOUR INSPECTION ===");
      if (!window.tour || !window.tour.player) {
        console.log("Tour or player not initialized");
        return;
      }
      try {
        // [1] Playlists and Panoramas
        console.log("\n--- Listing All Playlists and Their Panoramas ---");
        const playlists = window.tour.player.getByClassName("PlayList");
        if (!playlists || playlists.length === 0) {
          console.log("No playlists found.");
        } else {
          playlists.forEach((playlist, pIdx) => {
            console.log(`\nPlaylist ${pIdx + 1}:`);
            console.log(`ID: ${playlist.get("id")}`);
            console.log(
              `Name: ${(playlist.get("data") && playlist.get("data").name) || "N/A"}`,
            );
            const items = playlist.get("items");
            if (!items || items.length === 0) {
              console.log("  No items in this playlist.");
              return;
            }
            items.forEach((item, idx) => {
              const media = item.get("media");
              if (!media) {
                console.log(`  Item ${idx + 1}: No media associated.`);
                return;
              }
              const mediaClass = media.get("class");
              const mediaId = media.get("id");
              const data = media.get("data") || {};
              console.log(`  Item ${idx + 1}:`, {
                id: mediaId,
                class: mediaClass,
                label: media.get("label") || data.label,
                subtitle: media.get("subtitle") || data.subtitle,
                title: media.get("title") || data.title,
                description: media.get("description") || data.description,
                tags: data.tags || [],
              });
            });
          });
        }
        // [2] Containers
        console.log("\n--- Listing All Containers ---");
        const containers = window.tour.player.getByClassName("Container");
        containers.forEach((c) => {
          const data = c.get("data") || {};
          console.log("Container:", {
            id: c.get("id"),
            label: data.label,
            name: data.name,
            visible: c.get("visible"),
            contentType: data.contentType,
            children: (c.get("children") && c.get("children").length) || 0,
          });
        });
        // [3] Categorized Elements by Type
        console.log("\n--- Categorized Elements by Type ---");
        const elementCounts = {
          Panorama: 0,
          Hotspot: 0,
          Polygon: 0,
          Video: 0,
          Image: 0,
          "Projected Image": 0,
          Webframe: 0,
          Floorplan: 0,
          Text: 0,
          Other: 0,
        };
        const elementsByType = {
          Panorama: [],
          Hotspot: [],
          Polygon: [],
          Video: [],
          Image: [],
          "Projected Image": [],
          Webframe: [],
          Floorplan: [],
          Text: [],
          Other: [],
        };
        playlists.forEach((playlist) => {
          const items = playlist.get("items");
          items.forEach((item, _idx) => {
            const media = item.get("media");
            if (!media) return;
            if (media.get("class") === "Panorama") {
              elementCounts.Panorama++;
              elementsByType.Panorama.push({
                id: media.get("id"),
                label:
                  media.get("label") ||
                  (media.get("data") && media.get("data").label),
                playlistId: playlist.get("id"),
              });
              const overlays = media.get("overlays");
              if (!overlays || !Array.isArray(overlays)) return;
              overlays.forEach((overlay) => {
                try {
                  const elementType = getElementType(overlay);
                  if (elementCounts[elementType] !== undefined) {
                    elementCounts[elementType]++;
                  } else {
                    elementCounts.Other++;
                  }
                  const attributes = getOverlayAttributes(overlay);
                  const categoryData = {
                    id: overlay.get("id"),
                    parentPanorama:
                      media.get("label") ||
                      (media.get("data") && media.get("data").label) ||
                      media.get("id"),
                    attributes,
                  };
                  if (elementsByType[elementType]) {
                    elementsByType[elementType].push(categoryData);
                  } else {
                    elementsByType.Other.push({
                      ...categoryData,
                      actualType: elementType,
                    });
                  }
                } catch (err) {
                  console.warn("Error processing overlay:", err);
                }
              });
            }
          });
        });
        console.log("Element Counts:", elementCounts);
        Object.keys(elementsByType).forEach((type) => {
          if (elementsByType[type].length > 0) {
            console.log(`\n${type} Elements (${elementsByType[type].length}):`);
            elementsByType[type].forEach((el, i) => {
              if (i < 10 || elementsByType[type].length <= 20) {
                console.log(
                  `  ${i + 1}. ${el.id || "No ID"} ${el.label ? `- ${el.label}` : ""}`,
                );
                if (el.attributes) {
                  console.log("     Attributes:", el.attributes);
                }
              } else if (i === 10) {
                console.log(
                  `  ... and ${elementsByType[type].length - 10} more items`,
                );
              }
            });
          }
        });
        // [4] Sample Panorama Data Structure
        console.log("\n--- Sample Panorama Data Structure ---");
        const samplePanorama = elementsByType.Panorama[0];
        if (samplePanorama) {
          const panoramaId = samplePanorama.id;
          const panoramaObj = window.tour.player.getById(panoramaId);
          if (panoramaObj) {
            const panoramaStructure = {
              id: panoramaObj.get("id"),
              class: panoramaObj.get("class"),
              properties: {},
            };
            ["label", "subtitle", "description", "data", "overlays"].forEach(
              (prop) => {
                try {
                  const value = panoramaObj.get(prop);
                  if (value !== undefined) {
                    if (prop === "overlays" && Array.isArray(value)) {
                      panoramaStructure.properties[prop] =
                        `Array[${value.length}]`;
                    } else if (prop === "data" && typeof value === "object") {
                      panoramaStructure.properties[prop] = Object.keys(
                        value || {},
                      );
                    } else {
                      panoramaStructure.properties[prop] = value;
                    }
                  }
                } catch {
                  // Ignore errors when accessing panorama properties
                }
              },
            );
            console.log("Sample Panorama Structure:", panoramaStructure);
          }
        }
        // [5] Player API
        console.log("\n--- Inspecting Player API ---");
        const player = window.tour.player;
        const playerMethods = Object.getOwnPropertyNames(
          Object.getPrototypeOf(player),
        )
          .concat(Object.keys(player))
          .filter((prop) => typeof player[prop] === "function")
          .sort();
        console.log("Available Player Methods:", playerMethods);
        // Test key methods
        console.log("\n--- Testing Key Element Methods ---");
        const methodTests = [
          "getMainPlayList",
          "getByClassName",
          "getById",
          "getMainViewer",
          "getOverlaysByTags",
          "getOverlaysByName",
        ];
        methodTests.forEach((method) => {
          console.log(
            `Method "${method}": ${typeof player[method] === "function" ? "Available" : "Not Available"}`,
          );
        });
      } catch (err) {
        console.log("Error during inspection:", err);
      }
    }
    function init() {
      if (window.tour) {
        inspectTour();
      } else {
        document.addEventListener("DOMContentLoaded", () => {
          setTimeout(inspectTour, 1000);
        });
      }
    }
    // Initialize debug tool
    init();
    // Public API
    return {
      inspect: inspectTour,
      getElementType: getElementType,
    };
  })();

  // [1.1] CORE DIAGNOSTICS FUNCTIONS
  // [1.1.1] Main entry point for diagnostics
  function runDiagnostics() {
    const report = generateDebugReport();
    printDebugSummary(report);
    observeSearchPanel();

    // [1.1.1.1] Return report object for potential use in other tools
    return report;
  }

  // [1.1.2] Main report generator
  function generateDebugReport() {
    const searchFunctions =
      window.tourSearchFunctions || window.searchFunctions;
    const container = document.getElementById("searchContainer");
    const tourObj = searchFunctions?.__tour || window.tourInstance;
    const stored = localStorage.getItem("searchPro.config");
    const config = searchFunctions?.getConfig?.() || {};
    const lastUpdate = localStorage.getItem("searchPro.configUpdated");

    // Build comprehensive diagnostic report
    const report = {
      timestamp: new Date().toISOString(),
      browser: navigator.userAgent,
      windowSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },

      // Core module status
      searchPro: {
        version: searchFunctions?.version || "n/a",
        buildDate: searchFunctions?.buildDate || "n/a",
        initialized: !!window.searchListInitialized,
        initTime: window.searchInitTime || "n/a",
        tourDetected: !!tourObj,
        tourName: tourObj?.name || "n/a",
        methods: {
          initializeSearch:
            typeof searchFunctions?.initializeSearch === "function",
          toggleSearch: typeof searchFunctions?.toggleSearch === "function",
          updateConfig: typeof searchFunctions?.updateConfig === "function",
          getConfig: typeof searchFunctions?.getConfig === "function",
          getSearchIndex: typeof searchFunctions?.getSearchIndex === "function",
        },
      },

      // DOM status section
      dom: {
        searchContainer: !!container,
        searchContainerVisible: container?.style.display === "block",
        resultsContainer: !!document.getElementById("searchResults"),
        searchInput: !!document.getElementById("searchInput"),
        resultCount: container
          ? container.querySelectorAll(".result-item").length
          : 0,
        businessResults: container
          ? container.querySelectorAll(".result-item[data-business='true']")
              .length
          : 0,
        sheetsResults: container
          ? container.querySelectorAll(".result-item[data-sheets='true']")
              .length
          : 0,
        stylesLoaded:
          !!document.querySelector("link[href*='css/search-01.css']") ||
          !!document.querySelector("style[data-source='search-pro']"),
      },

      // Configuration flags
      config: {
        raw: config,
        businessDataEnabled: config.businessData?.useBusinessData || false,
        businessDataFile: config.businessData?.businessDataFile || "n/a",
        businessDataDir: config.businessData?.businessDataDir || "n/a",
        googleSheetsEnabled: config.googleSheets?.useGoogleSheetData || false,
        googleSheetUrl: config.googleSheets?.googleSheetUrl || "n/a",
        googleSheetFetchMode: config.googleSheets?.fetchMode || "n/a",
        googleSheetAsDataSource: config.googleSheets?.useAsDataSource || false,
        cachingEnabled: config.googleSheets?.caching?.enabled || false,
        cachingTimeout: config.googleSheets?.caching?.timeoutMinutes || 0,
        progressiveLoadingEnabled:
          config.googleSheets?.progressiveLoading?.enabled || false,
        authEnabled: config.googleSheets?.authentication?.enabled || false,
        minSearchChars: config.minSearchChars || 2,
        showTagsInResults: config.showTagsInResults || false,
      },

      // Data sources section
      dataSources: getDataSourceStats(searchFunctions),

      // Search index diagnostics
      searchIndex: getSearchIndexStats(searchFunctions),

      // Storage and persistence

      localStorage: {
        available: (() => {
          try {
            localStorage.setItem("__test__", "test");
            localStorage.removeItem("__test__");
            return true;
          } catch {
            // Removed unused parameter
            return false;
          }
        })(),
        config: stored ? JSON.parse(stored) : "n/a",
        lastUpdated: lastUpdate
          ? new Date(parseInt(lastUpdate, 10)).toISOString()
          : "n/a",
        cacheStatus: getCacheStatus(),
      },
    };

    console.groupCollapsed("🔍 SEARCH PRO DIAGNOSTIC REPORT");
    console.table(report);
    console.log("📦 Full Report:", report);
    console.groupEnd();

    return report;
  }

  // [1.2] DATA SOURCE DIAGNOSTICS
  /**
   * [1.2.1] Get statistics about data sources (Business data and Google Sheets)
   */
  function getDataSourceStats(searchFunctions) {
    // Initial empty state
    const stats = {
      businessData: {
        enabled: false,
        source: "none",
        loaded: false,
        recordCount: 0,
        lastLoaded: "n/a",
        matchedElements: 0,
        unmatchedEntries: 0,
        sampleEntries: [],
        errors: [],
      },
      googleSheets: {
        enabled: false,
        url: "n/a",
        loaded: false,
        recordCount: 0,
        lastFetched: "n/a",
        lastParsed: "n/a",
        matchedElements: 0,
        unmatchedEntries: 0,
        sampleEntries: [],
        errors: [],
        cacheStatus: "n/a",
      },
    };

    // If search functions not available, return default stats
    if (!searchFunctions) return stats;

    // Get internal data if available through debug accessors
    const config = searchFunctions.getConfig?.() || {};
    const businessData = searchFunctions._getBusinessData?.() || [];
    const sheetsData = searchFunctions._getGoogleSheetsData?.() || [];

    // Business data stats
    if (config.businessData?.useBusinessData) {
      stats.businessData.enabled = true;
      stats.businessData.source = "local JSON";
      stats.businessData.loaded = businessData.length > 0;
      stats.businessData.recordCount = businessData.length;
      stats.businessData.lastLoaded = window.businessDataLoadTime || "unknown";

      // Sample entries (up to 3)
      stats.businessData.sampleEntries = businessData.slice(0, 3);

      // Matching stats if available
      if (searchFunctions._getBusinessDataMatchStats) {
        const matchStats = searchFunctions._getBusinessDataMatchStats() || {};
        stats.businessData.matchedElements = matchStats.matched || 0;
        stats.businessData.unmatchedEntries = matchStats.unmatched || 0;
      }
    }

    // Google Sheets stats
    if (config.googleSheets?.useGoogleSheetData) {
      stats.googleSheets.enabled = true;
      stats.googleSheets.url = config.googleSheets.googleSheetUrl;
      stats.googleSheets.loaded = sheetsData.length > 0;
      stats.googleSheets.recordCount = sheetsData.length;
      stats.googleSheets.lastFetched = window.sheetsDataFetchTime || "unknown";
      stats.googleSheets.lastParsed = window.sheetsDataParseTime || "unknown";

      // Sample entries (up to 3)
      stats.googleSheets.sampleEntries = sheetsData.slice(0, 3);

      // Check for recent errors
      if (window.sheetsDataErrors) {
        stats.googleSheets.errors = window.sheetsDataErrors;
      }

      // Matching stats if available
      if (searchFunctions._getGoogleSheetsMatchStats) {
        const matchStats = searchFunctions._getGoogleSheetsMatchStats() || {};
        stats.googleSheets.matchedElements = matchStats.matched || 0;
        stats.googleSheets.unmatchedEntries = matchStats.unmatched || 0;
      }

      // Cache status
      if (config.googleSheets.caching?.enabled) {
        const key =
          config.googleSheets.caching.storageKey || "tourGoogleSheetsData";
        const timestamp = localStorage.getItem(`${key}_timestamp`);
        if (timestamp) {
          const age = (Date.now() - parseInt(timestamp, 10)) / (1000 * 60); // minutes
          stats.googleSheets.cacheStatus = {
            exists: true,
            ageMinutes: age.toFixed(1),
            expired: age > (config.googleSheets.caching.timeoutMinutes || 60),
          };
        } else {
          stats.googleSheets.cacheStatus = { exists: false };
        }
      }
    }

    return stats;
  }

  /**
   * [1.2.2] Get statistics about the search index
   */
  function getSearchIndexStats(searchFunctions) {
    // Default empty state
    const stats = {
      totalEntries: 0,
      elementTypes: {},
      businessOverrides: 0,
      sheetsOverrides: 0,
      fallbackLabels: 0,
      sampleEntries: [],
      examples: {
        standard: null,
        business: null,
        sheets: null,
      },
    };

    // If search functions not available, return default stats
    if (!searchFunctions) return stats;

    // Try to get search index data
    const indexData = searchFunctions.getSearchIndex?.() || [];
    stats.totalEntries = indexData.length;

    // Count by element type
    indexData.forEach((entry) => {
      const type = entry.type || "unknown";
      stats.elementTypes[type] = (stats.elementTypes[type] || 0) + 1;

      // Count data source overrides
      if (entry.businessName) stats.businessOverrides++;
      if (entry.sheetsData) stats.sheetsOverrides++;
      if (entry.useFallbackLabel) stats.fallbackLabels++;

      // Collect examples of different entry types
      if (
        !stats.examples.standard &&
        !entry.businessName &&
        !entry.sheetsData
      ) {
        stats.examples.standard = { ...entry };
      }
      if (!stats.examples.business && entry.businessName) {
        stats.examples.business = { ...entry };
      }
      if (!stats.examples.sheets && entry.sheetsData) {
        stats.examples.sheets = { ...entry };
      }
    });

    // Get sample entries for deeper inspection
    stats.sampleEntries = indexData.slice(0, 5);

    return stats;
  }

  // [1.3] STORAGE AND CACHE DIAGNOSTICS
  /**
   * [1.3.1] Get local storage cache status for various features
   */
  function getCacheStatus() {
    const cacheItems = [];

    // Check for known cache keys
    const knownKeys = [
      "tourGoogleSheetsData",
      "searchPro.config",
      "searchPro.history",
      "searchPro.favorites",
      "businessData",
    ];

    knownKeys.forEach((key) => {
      try {
        const value = localStorage.getItem(key);
        const timestamp = localStorage.getItem(`${key}_timestamp`);

        if (value) {
          const size = value.length;
          const item = { key, exists: true, sizeBytes: size };

          if (timestamp) {
            const age = (Date.now() - parseInt(timestamp, 10)) / (1000 * 60); // minutes
            item.ageMinutes = age.toFixed(1);
          }

          cacheItems.push(item);
        }
      } catch (e) {
        cacheItems.push({ key, error: e.message });
      }
    });

    return cacheItems;
  }

  // [1.4] REPORTING AND DISPLAY
  /**
   * [1.4.1] Print formatted debug summary to console
   */
  function printDebugSummary(report) {
    console.group("🔍 Search Pro Debug Summary");

    // Core status
    console.groupCollapsed("📊 CORE STATUS");
    console.log(
      `Search Pro v${report.searchPro.version} (${report.searchPro.initialized ? "initialized" : "not initialized"})`,
    );
    console.log(
      `Tour detected: ${report.searchPro.tourDetected ? "yes" : "no"} (${report.searchPro.tourName})`,
    );
    console.log(`Browser: ${report.browser}`);
    console.log(
      `Window: ${report.windowSize.width}×${report.windowSize.height}`,
    );
    console.table(report.searchPro.methods);
    console.groupEnd();

    // Configuration
    console.groupCollapsed("⚙️ CONFIGURATION");
    console.log("Active configuration:", report.config);
    console.log(
      `Business data: ${report.config.businessDataEnabled ? "enabled" : "disabled"}`,
    );
    console.log(
      `Google Sheets: ${report.config.googleSheetsEnabled ? "enabled" : "disabled"}`,
    );
    if (report.config.googleSheetsEnabled) {
      console.log(`  URL: ${report.config.googleSheetUrl}`);
      console.log(`  Mode: ${report.config.googleSheetFetchMode}`);
      console.log(
        `  Use as data source: ${report.config.googleSheetAsDataSource ? "yes" : "no"}`,
      );
      console.log(
        `  Caching: ${report.config.cachingEnabled ? "enabled" : "disabled"} (${report.config.cachingTimeout}min)`,
      );
      console.log(
        `  Progressive loading: ${report.config.progressiveLoadingEnabled ? "enabled" : "disabled"}`,
      );
      console.log(
        `  Authentication: ${report.config.authEnabled ? "enabled" : "disabled"}`,
      );
    }
    console.groupEnd();

    // Data sources
    console.groupCollapsed("📂 DATA SOURCES");

    // Business data
    if (report.dataSources.businessData.enabled) {
      console.groupCollapsed("Business Data");
      console.log(`Source: ${report.dataSources.businessData.source}`);
      console.log(`Records: ${report.dataSources.businessData.recordCount}`);
      console.log(`Last loaded: ${report.dataSources.businessData.lastLoaded}`);
      console.log(
        `Matched elements: ${report.dataSources.businessData.matchedElements}`,
      );
      console.log(
        `Unmatched entries: ${report.dataSources.businessData.unmatchedEntries}`,
      );

      if (report.dataSources.businessData.sampleEntries.length > 0) {
        console.log(
          "Sample entries:",
          report.dataSources.businessData.sampleEntries,
        );
      }

      console.groupEnd();
    } else {
      console.log("Business data: disabled");
    }

    // Google Sheets
    if (report.dataSources.googleSheets.enabled) {
      console.groupCollapsed("Google Sheets Data");
      console.log(`URL: ${report.dataSources.googleSheets.url}`);
      console.log(`Records: ${report.dataSources.googleSheets.recordCount}`);
      console.log(
        `Last fetched: ${report.dataSources.googleSheets.lastFetched}`,
      );
      console.log(
        `Matched elements: ${report.dataSources.googleSheets.matchedElements}`,
      );
      console.log(
        `Unmatched entries: ${report.dataSources.googleSheets.unmatchedEntries}`,
      );

      if (report.dataSources.googleSheets.cacheStatus !== "n/a") {
        console.log(
          "Cache status:",
          report.dataSources.googleSheets.cacheStatus,
        );
      }

      if (report.dataSources.googleSheets.errors.length > 0) {
        console.warn("Errors:", report.dataSources.googleSheets.errors);
      }

      if (report.dataSources.googleSheets.sampleEntries.length > 0) {
        console.log(
          "Sample entries:",
          report.dataSources.googleSheets.sampleEntries,
        );
      }

      console.groupEnd();
    } else {
      console.log("Google Sheets: disabled");
    }

    console.groupEnd(); // Data sources

    // Search index
    console.groupCollapsed("🔍 SEARCH INDEX");
    console.log(`Total entries: ${report.searchIndex.totalEntries}`);
    console.log("Element types:", report.searchIndex.elementTypes);
    console.log(`Business overrides: ${report.searchIndex.businessOverrides}`);
    console.log(
      `Google Sheets overrides: ${report.searchIndex.sheetsOverrides}`,
    );
    console.log(`Fallback labels: ${report.searchIndex.fallbackLabels}`);

    // Show examples by type
    if (report.searchIndex.examples.standard) {
      console.groupCollapsed("Example: Standard Entry");
      console.log(report.searchIndex.examples.standard);
      console.groupEnd();
    }

    if (report.searchIndex.examples.business) {
      console.groupCollapsed("Example: Business Data Entry");
      console.log(report.searchIndex.examples.business);
      console.groupEnd();
    }

    if (report.searchIndex.examples.sheets) {
      console.groupCollapsed("Example: Google Sheets Entry");
      console.log(report.searchIndex.examples.sheets);
      console.groupEnd();
    }

    console.groupEnd(); // Search index

    // DOM & UI
    console.groupCollapsed("🖥️ DOM & UI");
    console.log(
      `Search container: ${report.dom.searchContainer ? "found" : "missing"}`,
    );
    console.log(
      `Search visible: ${report.dom.searchContainerVisible ? "yes" : "no"}`,
    );
    console.log(
      `Results container: ${report.dom.resultsContainer ? "found" : "missing"}`,
    );
    console.log(
      `Search input: ${report.dom.searchInput ? "found" : "missing"}`,
    );
    console.log(`Current results: ${report.dom.resultCount}`);
    console.log(`Business results: ${report.dom.businessResults}`);
    console.log(`Google Sheets results: ${report.dom.sheetsResults}`);
    console.log(`Styles loaded: ${report.dom.stylesLoaded ? "yes" : "no"}`);
    console.groupEnd(); // DOM & UI

    // Storage
    console.groupCollapsed("💾 STORAGE");
    console.log(
      `LocalStorage available: ${report.localStorage.available ? "yes" : "no"}`,
    );
    console.log(`Config last updated: ${report.localStorage.lastUpdated}`);
    console.log("Cache status:", report.localStorage.cacheStatus);
    console.groupEnd(); // Storage

    // Full report
    console.groupCollapsed("📋 FULL REPORT");
    console.log(report);
    console.groupEnd(); // Full report

    console.groupEnd(); // Main group

    // Return a simple text summary
    return `Search Pro v${report.searchPro.version} | Business Data: ${report.config.businessDataEnabled ? "enabled" : "disabled"} | Google Sheets: ${report.config.googleSheetsEnabled ? "enabled" : "disabled"} | Index items: ${report.searchIndex.totalEntries}`;
  }

  // [1.5] MONITORING AND OBSERVERS
  /**
   * [1.5.1] Set up observers to monitor search panel events
   */
  function observeSearchPanel() {
    const container = document.getElementById("searchContainer");
    if (!container) {
      console.warn("Cannot observe search panel - container not found");
      return;
    }

    // Report when search is toggled
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "style") {
          const isVisible = container.style.display === "block";
          console.log(
            `🔍 Search Panel ${isVisible ? "shown" : "hidden"} at ${new Date().toLocaleTimeString()}`,
          );

          // If visible, log current result stats
          if (isVisible) {
            const totalResults =
              container.querySelectorAll(".result-item").length;
            const businessResults = container.querySelectorAll(
              ".result-item[data-business='true']",
            ).length;
            const sheetsResults = container.querySelectorAll(
              ".result-item[data-sheets='true']",
            ).length;
            console.log(
              `Current results: ${totalResults} (${businessResults} business, ${sheetsResults} sheets)`,
            );
          }
        }
      });
    });

    observer.observe(container, { attributes: true });
    console.log("💢 Search panel observer active");

    // Also observe the results container for changes
    const resultsContainer = document.getElementById("searchResults");
    if (resultsContainer) {
      const resultsObserver = new MutationObserver((_mutations) => {
        // When results are updated
        const searchInput = document.getElementById("searchInput");
        const searchTerm = searchInput ? searchInput.value : "";
        const totalResults = container.querySelectorAll(".result-item").length;

        if (searchTerm && totalResults > 0) {
          console.log(
            `Search results for "${searchTerm}": ${totalResults} items`,
          );
        }
      });

      resultsObserver.observe(resultsContainer, { childList: true });
    }
  }

  /**
   * Log thumbnail assignment and fallback for a search result item.
   * Call this right before setting the thumbnail URL for any result.
   */
  function logThumbnailAssignment(result, thumbSettings, resolvedUrl) {
    const { type, label, id } = result.item || result;
    const typeKey = type || "Unknown";
    const configMap = thumbSettings?.defaultImages || {};
    const configUrl = configMap[typeKey];
    const fallbackUrl =
      configMap.default || "./search-pro/assets/generic-default.jpg";
    const found = !!configUrl;

    console.log(`[Thumbnail Debug] Assigning thumbnail for result:`, {
      id,
      type: typeKey,
      label,
      "Config type URL": configUrl || "(none)",
      "Final resolved URL": resolvedUrl,
      "Using fallback": !found,
      "Fallback URL": fallbackUrl,
    });
    if (!found) {
      console.warn(
        `[Thumbnail Debug] No type-specific thumbnail configured for "${typeKey}". Used fallback: ${fallbackUrl}`,
      );
    }
  }

  /**
   * Log result item type assignment during rendering.
   */
  function logResultTypeMapping(result) {
    const { type, id, label } = result.item || result;
    console.debug(
      `[Result Type Mapping] ID: ${id}, Label: ${label}, Type: ${type}`,
    );
  }

  // [1.6] GLOBAL EXPORTS AND INITIALIZATION
  // [1.6.1] Expose debug tools globally
  window.searchProDebug = {
    runDiagnostics,
    generateDebugReport,
    printDebugSummary,
    observeSearchPanel,
    logThumbnailAssignment,
    logResultTypeMapping,

    // Additional utilities
    inspectSearchIndex: () => {
      const searchFunctions =
        window.tourSearchFunctions || window.searchFunctions;
      return searchFunctions?.getSearchIndex?.() || [];
    },

    inspectGoogleSheetsData: () => {
      const searchFunctions =
        window.tourSearchFunctions || window.searchFunctions;
      return searchFunctions?._getGoogleSheetsData?.() || [];
    },

    inspectBusinessData: () => {
      const searchFunctions =
        window.tourSearchFunctions || window.searchFunctions;
      return searchFunctions?._getBusinessData?.() || [];
    },

    showMatchStats: () => {
      const searchFunctions =
        window.tourSearchFunctions || window.searchFunctions;

      const businessStats =
        searchFunctions?._getBusinessDataMatchStats?.() || {};
      const sheetsStats = searchFunctions?._getGoogleSheetsMatchStats?.() || {};

      console.group("🔍 Data Matching Statistics");
      console.log("Business Data:", businessStats);
      console.log("Google Sheets:", sheetsStats);
      console.groupEnd();

      return { businessStats, sheetsStats };
    },

    inspectConfig: () => {
      const searchFunctions =
        window.tourSearchFunctions || window.searchFunctions;
      return searchFunctions?.getConfig?.() || {};
    },

    clearCache: () => {
      try {
        // Known cache keys
        const cacheKeys = [
          "tourGoogleSheetsData",
          "tourGoogleSheetsData_timestamp",
          "businessData",
          "businessData_timestamp",
        ];

        cacheKeys.forEach((key) => {
          localStorage.removeItem(key);
        });

        console.log("🧹 Search Pro cache cleared successfully");
        return true;
      } catch (e) {
        console.error("Failed to clear cache:", e);
        return false;
      }
    },

    testFetchGoogleSheet: (url) => {
      if (!url) {
        console.error("Please provide a Google Sheet URL");
        return;
      }

      console.log(`🔄 Testing fetch from: ${url}`);

      let fetchUrl = url;
      if (
        url.includes("spreadsheets.google.com/") &&
        !url.includes("/export")
      ) {
        // Extract sheet ID
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
          const sheetId = match[1];
          fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
          console.log(`🔄 Converted to export URL: ${fetchUrl}`);
        }
      }

      fetch(fetchUrl)
        .then((response) => {
          console.log("Response status:", response.status);
          console.log("Response headers:", [...response.headers.entries()]);
          return response.text();
        })
        .then((text) => {
          console.log(
            "Data preview (first 500 chars):",
            text.substring(0, 500),
          );
          console.log("Total size:", text.length, "characters");
        })
        .catch((error) => {
          console.error("Fetch error:", error);
        });
    },
  };

  // [1.6.2] Auto-run diagnostics on load
  runDiagnostics();

  // [1.6.3] Display banner
  console.log(
    "%c Search Pro Debug Tools %c Ready - Type searchProDebug.runDiagnostics() to analyze ",
    "background:#4285F4; color:white; font-weight:bold; padding:3px;",
    "background:#f1f1f1; color:#444; padding:3px;",
  );

  // [1.6.4] Run diagnostics on document load
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(runDiagnostics, 100);
  });

  // [1.6.5] Delayed diagnostics to capture late-loading resources
  setTimeout(() => {
    if (window.searchProDebug?.runDiagnostics) {
      window.searchProDebug.runDiagnostics();
    }
  }, 2000);

  // Global error logging
  window.addEventListener("error", function (event) {
    console.error(
      "[Search Pro ERROR]",
      event.message,
      event.filename,
      event.lineno,
      event.colno,
      event.error,
    );
  });

  window.addEventListener("unhandledrejection", function (event) {
    console.error("[Search Pro UNHANDLED PROMISE REJECTION]", event.reason);
  });
})();

/**
 * Listen for image load errors inside search results (thumbnail issues).
 */
function observeThumbnailErrors() {
  document.body.addEventListener(
    "error",
    function (e) {
      if (
        e.target &&
        e.target.tagName === "IMG" &&
        e.target.classList.contains("result-thumbnail")
      ) {
        console.error(
          `[Thumbnail Debug] Failed to load image: ${e.target.src}`,
          e,
        );
      }
    },
    true,
  );
}
observeThumbnailErrors();

/**
 * Programmatically check that all thumbnail asset files exist.
 * Usage: searchProDebug.checkThumbnailAssets(thumbSettings)
 */
window.searchProDebug = window.searchProDebug || {};
window.searchProDebug.checkThumbnailAssets = function (thumbSettings) {
  const map = thumbSettings.defaultImages || {};
  Object.entries(map).forEach(([type, url]) => {
    fetch(url, { method: "HEAD" })
      .then((res) => {
        if (!res.ok) {
          console.warn(
            `[Thumbnail Asset Check] Missing or inaccessible: [${type}] ${url}`,
          );
        } else {
          console.log(`[Thumbnail Asset Check] OK: [${type}] ${url}`);
        }
      })
      .catch((err) => {
        console.error(
          `[Thumbnail Asset Check] Error fetching: [${type}] ${url}`,
          err,
        );
      });
  });
};

// Log successful loading
console.debug("✅ Search Pro Debug loaded successfully");

/**
 * TIMING-AWARE GOOGLE SHEETS INTEGRATION FIX
 * This waits for the tour to be fully loaded before applying the fix
 */

(function () {
  console.log(
    "%c⏰ TIMING-AWARE GOOGLE SHEETS FIX",
    "background: #FF9800; color: white; padding: 8px; font-weight: bold;",
  );

  // Function to check if tour is ready
  function isTourReady() {
    const tour = window.tour || window.tourInstance;
    return (
      tour && tour.mainPlayList && typeof tour.mainPlayList.get === "function"
    );
  }

  // Function to wait for tour to be ready
  function waitForTour(callback, maxAttempts = 5) {
    let attempts = 0;

    function check() {
      attempts++;

      if (isTourReady()) {
        console.log("✅ Tour is ready after", attempts, "attempts");
        callback();
      } else if (attempts >= maxAttempts) {
        console.error("❌ Timeout waiting for tour to be ready");
      } else {
        // Log only every 5 attempts
        if (attempts % 5 === 0) {
          console.log(`⏳ Waiting for tour... (${attempts}/${maxAttempts})`);
        }
        setTimeout(check, 1000);
      }
    }

    check();
  }

  // Enhanced rebuild function that waits for tour
  window.smartSearchRebuild = function () {
    console.log("🤖 Smart search rebuild - checking tour readiness...");

    if (!isTourReady()) {
      console.log("⏳ Tour not ready yet, waiting...");
      waitForTour(() => {
        console.log("✅ Tour ready, proceeding with rebuild...");
        performRebuild();
      });
    } else {
      console.log("✅ Tour already ready, rebuilding immediately...");
      performRebuild();
    }
  };

  function performRebuild() {
    const searchFunctions = window.tourSearchFunctions;
    const tour = window.tour || window.tourInstance;

    if (!searchFunctions || !tour) {
      console.error("❌ Missing search functions or tour");
      return;
    }

    console.log("🔄 Rebuilding search index with Google Sheets integration...");

    // Reset initialization flags
    window.searchListInitialized = false;
    window.searchListInitiinitialized = false;

    try {
      // Reinitialize search
      searchFunctions.initializeSearch(tour);

      // Check results
      setTimeout(() => {
        console.log("🔍 Checking enhanced results...");

        if (window.fuse && window.fuse._docs) {
          const total = window.fuse._docs.length;
          const enhanced = window.fuse._docs.filter(
            (item) => item.enhanced || item.imageUrl || item.sheetsData,
          );

          console.log(`📊 Search Index: ${total} items total`);
          console.log(`✨ Enhanced Items: ${enhanced.length}`);

          if (enhanced.length > 0) {
            console.log("🎉 SUCCESS! Google Sheets integration working!");
            console.log("📋 Sample enhanced items:", enhanced.slice(0, 3));

            // Test the search to see if thumbnails show
            console.log("🧪 Testing search results...");
            setTimeout(() => {
              const searchContainer =
                document.getElementById("searchContainer");
              const searchInput = document.getElementById("tourSearch");

              if (searchContainer && searchInput) {
                // Show search and perform test search
                searchContainer.style.display = "block";
                searchContainer.classList.add("visible");
                searchInput.value = "*";
                searchInput.dispatchEvent(new Event("input"));

                console.log(
                  "🔍 Test search performed - check for thumbnails in search results!",
                );
              }
            }, 500);
          } else {
            console.warn("⚠️ No items enhanced - checking ID matching...");

            // Quick ID check
            const sheetsData =
              window.SearchProModules?.DataManager?.getGoogleSheetsData() || [];
            const sheetsIds = sheetsData.map((row) => row.id).filter(Boolean);
            const searchIds = window.fuse._docs
              .map((item) => item.id)
              .filter(Boolean);

            console.log("📄 Google Sheets IDs:", sheetsIds);
            console.log("🔍 Search Index IDs:", searchIds);

            const matches = sheetsIds.filter((id) => searchIds.includes(id));
            console.log("✅ ID Matches:", matches);

            if (matches.length === 0) {
              console.error(
                "❌ No ID matches found! Check your Google Sheets ID column",
              );
            }
          }
        } else {
          console.error("❌ Search index not accessible");
        }
      }, 1000);
    } catch (error) {
      console.error("❌ Error during rebuild:", error);
    }
  }

  console.log("\n🛠️ Available commands:");
  console.log("smartSearchRebuild() - Timing-aware rebuild");

  // Wait a bit for any ongoing initialization to settle, then try rebuild
  setTimeout(() => {
    console.log("🚀 Starting smart rebuild...");
    window.smartSearchRebuild();
  }, 2000);
})();
