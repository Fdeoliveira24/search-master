/*
====================================
3DVista Enhanced Search Script
Version: 1.0.5
Last Updated: 05/29/2025 (Non-Modular working)
Description: Search Pro Debug Utilities
 * Comprehensive diagnostics for search features including business data and Google Sheets integration
 */

// [1.0] DEBUG CORE MODULE
(() => {
  console.log("🔧 [Search Pro] Debug v2.0 Loaded");

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
          !!document.querySelector("link[href*='search-01-non-mod.css']") ||
          !!document.querySelector("style[data-source='search-pro-non-mod']"),
      }, // It must match the same search-pro-non-mod directory and file name

      // Configuration flags
      config: {
        raw: config,
        businessDataEnabled: config.businessData?.useBusinessData || true, // Check if business data is enabled
        businessDataFile: config.businessData?.businessDataFile || "n/a",
        businessDataDir: config.businessData?.businessDataDir || "n/a",
        googleSheetsEnabled: config.googleSheets?.useGoogleSheetData || false, // Check if Google Sheets is enabled
        googleSheetUrl: config.googleSheets?.googleSheetUrl || "n/a",
        googleSheetFetchMode: config.googleSheets?.fetchMode || "n/a",
        googleSheetAsDataSource: config.googleSheets?.useAsDataSource || false, // Check if Google Sheets is used as a data source
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
          } catch (e) {
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
      const resultsObserver = new MutationObserver((mutations) => {
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

  // [1.6] GLOBAL EXPORTS AND INITIALIZATION
  // [1.6.1] Expose debug tools globally
  // [Moved from search-01.js _toggleSearch] Logs diagnostics for toggleSearch
  function logToggleDiagnostics(searchContainer) {
    try {
      const resultsContainer = searchContainer
        ? searchContainer.querySelector(".search-results")
        : null;
      const resultsSection = searchContainer
        ? searchContainer.querySelector(".results-section")
        : null;
      const noResults = searchContainer
        ? searchContainer.querySelector(".no-results")
        : null;
      // Log display/visibility/background
      if (searchContainer) {
        const cs = getComputedStyle(searchContainer);
        console.log(
          "[DIAG] [toggleSearch:before] searchContainer display:",
          cs.display,
          "visibility:",
          cs.visibility,
          "background:",
          cs.background,
          searchContainer.style.background,
          "classes:",
          searchContainer.className,
          "HTML:",
          searchContainer.outerHTML,
        );
      }
      if (resultsContainer) {
        const cs = getComputedStyle(resultsContainer);
        console.log(
          "[DIAG] [toggleSearch:before] resultsContainer display:",
          cs.display,
          "visibility:",
          cs.visibility,
          "background:",
          cs.background,
          resultsContainer.style.background,
          "classes:",
          resultsContainer.className,
          "HTML:",
          resultsContainer.outerHTML,
        );
      }
      if (resultsSection) {
        const cs = getComputedStyle(resultsSection);
        console.log(
          "[DIAG] [toggleSearch:before] resultsSection display:",
          cs.display,
          "visibility:",
          cs.visibility,
          "background:",
          cs.background,
          resultsSection.style.background,
          "classes:",
          resultsSection.className,
          "innerHTML:",
          resultsSection.innerHTML,
        );
      }
      // Count duplicate/detached containers
      const allSearchContainers = document.querySelectorAll("#searchContainer");
      console.log(
        "[DIAG] [toggleSearch:before] Number of #searchContainer elements:",
        allSearchContainers.length,
      );
      allSearchContainers.forEach((el, i) => {
        if (!document.body.contains(el)) {
          console.warn(
            `[DIAG] [toggleSearch:before] Detached #searchContainer[${i}]`,
            el.outerHTML,
          );
        }
      });
    } catch (err) {
      console.error("[DIAG] [toggleSearch:before] Diagnostics error:", err);
    }
  }

  /**
   * [1.9] TOUR TAG EXTRACTION - Enhanced tag discovery across all possible locations
   * This function finds all tags in the tour using multiple detection methods
   */
  function extractTourTags() {
    console.group("🏷️ Tour Tags Extraction (Enhanced)");

    if (!window.tour?.player) {
      console.error("Tour or player not initialized.");
      console.groupEnd();
      return null;
    }

    try {
      // Initialize tag collections
      const allTags = new Set();
      const tagsByType = {
        panorama: {},
        hotspot: {},
        container: {},
        other: {},
      };

      console.log("Scanning panoramas...");
      const playlists = window.tour.player.getByClassName("PlayList") || [];

      // Check if search plugin tag data is available
      const searchFunctions =
        window.tourSearchFunctions || window.searchFunctions;
      const searchIndex = searchFunctions?.getSearchIndex?.();

      if (searchIndex && searchIndex.length > 0) {
        console.log(
          `Found search index with ${searchIndex.length} entries, checking for tags...`,
        );

        searchIndex.forEach((item) => {
          if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
            console.log(
              `Found tags in search index for ${item.id || item.label}: ${item.tags.join(", ")}`,
            );

            item.tags.forEach((tag) => {
              allTags.add(tag);

              // Categorize by element type
              const type = item.type || "unknown";
              const targetCategory = type.toLowerCase().includes("panorama")
                ? "panorama"
                : type.toLowerCase().includes("hotspot")
                  ? "hotspot"
                  : "other";

              if (!tagsByType[targetCategory][tag])
                tagsByType[targetCategory][tag] = [];
              tagsByType[targetCategory][tag].push({
                id: item.id,
                label: item.label,
                source: "search_index",
              });
            });
          }
        });
      }

      // Extended scanning with multiple property paths
      playlists.forEach((playlist) => {
        const items = playlist.get("items") || [];
        items.forEach((item) => {
          const media = item.get("media");
          if (!media) return;

          const mediaId = media.get("id");
          const mediaLabel =
            media.get("label") || media.get("data")?.label || mediaId;
          const mediaType = media.get("class") || "unknown";

          // Check multiple paths for tags
          const possibleTagPaths = [
            media.get("tags"), // Standard location
            media.get("data")?.tags, // In data object
            media.get("metadata")?.tags, // In metadata
            media.get("searchTags"), // Custom search tags
            media.get("properties")?.tags, // In properties
          ];

          // Process tags from any path
          possibleTagPaths.forEach((tagSource) => {
            let mediaTags = tagSource;

            // Handle string tags (convert CSV to array)
            if (typeof mediaTags === "string") {
              mediaTags = mediaTags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
            }

            // Process array tags
            if (mediaTags && Array.isArray(mediaTags) && mediaTags.length > 0) {
              mediaTags.forEach((tag) => {
                if (tag) {
                  allTags.add(tag);

                  if (mediaType === "Panorama") {
                    if (!tagsByType.panorama[tag])
                      tagsByType.panorama[tag] = [];
                    tagsByType.panorama[tag].push({
                      id: mediaId,
                      label: mediaLabel,
                    });
                  } else {
                    if (!tagsByType.other[tag]) tagsByType.other[tag] = [];
                    tagsByType.other[tag].push({
                      id: mediaId,
                      label: mediaLabel,
                      type: mediaType,
                    });
                  }
                }
              });
            }
          });

          // Check hotspots with enhanced tag paths
          if (mediaType === "Panorama") {
            const overlays = media.get("overlays") || [];
            overlays.forEach((overlay) => {
              const hotspotId = overlay.get("id");
              const hotspotData = overlay.get("data");
              const hotspotLabel = hotspotData?.label || hotspotId;

              const possibleHotspotTagPaths = [
                overlay.get("tags"),
                overlay.get("data")?.tags,
                overlay.get("userData")?.tags,
                overlay.get("properties")?.tags,
              ];

              possibleHotspotTagPaths.forEach((tagSource) => {
                let hotspotTags = tagSource;

                // Handle string tags
                if (typeof hotspotTags === "string") {
                  hotspotTags = hotspotTags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean);
                }

                if (
                  hotspotTags &&
                  Array.isArray(hotspotTags) &&
                  hotspotTags.length > 0
                ) {
                  hotspotTags.forEach((tag) => {
                    if (tag) {
                      allTags.add(tag);
                      if (!tagsByType.hotspot[tag])
                        tagsByType.hotspot[tag] = [];
                      tagsByType.hotspot[tag].push({
                        id: hotspotId,
                        label: hotspotLabel,
                        panoramaId: mediaId,
                        panoramaLabel: mediaLabel,
                      });
                    }
                  });
                }
              });
            });
          }
        });
      });

      // Check business data as a tag source
      console.log("Checking for business data tags...");
      const businessData = searchFunctions?._getBusinessData?.() || [];
      if (businessData.length > 0) {
        console.log(`Found ${businessData.length} business data entries`);
        businessData.forEach((entry) => {
          if (
            entry.tags &&
            Array.isArray(entry.tags) &&
            entry.tags.length > 0
          ) {
            const elementId = entry.id;
            const elementLabel = entry.name || entry.label || elementId;

            entry.tags.forEach((tag) => {
              if (tag) {
                allTags.add(tag);
                if (!tagsByType.other[tag]) tagsByType.other[tag] = [];
                tagsByType.other[tag].push({
                  id: elementId,
                  label: elementLabel,
                  type: "business_data",
                });
              }
            });
          }
        });
      }

      // Output results
      const tagsList = Array.from(allTags).sort();

      console.log(`Found ${tagsList.length} unique tags in the tour:`);
      console.table(tagsList);

      // Return the results for potential use in other scripts
      const result = {
        allTags: tagsList,
        tagsByType: tagsByType,
        count: tagsList.length,
        searchIndex: {
          available: !!searchIndex,
          count: searchIndex?.length || 0,
        },
        businessData: {
          available: businessData.length > 0,
          count: businessData.length,
        },
      };

      console.log(
        "✅ Tag extraction complete. Results available in returned object.",
      );
      console.groupEnd(); // Tour Tags Extraction

      // Add to window for easy access
      window.tourTags = result;
      console.log("📋 Access results through window.tourTags");

      return result;
    } catch (error) {
      console.error("Error extracting tour tags:", error);
      console.groupEnd();
      return null;
    }
  }

  /**
   * [1.11] BUSINESS DATA MATCHING DIAGNOSTICS
   * Debug logging system for business data integration
   */
  function debugBusinessMatching(enabled = true) {
    if (!enabled) return;
    
    console.group("🔍 Business Data Matching Diagnostics");
    
    // Fix: Get business data from multiple possible sources
    const searchFunctions = window.tourSearchFunctions || window.searchFunctions;
    const businessData = 
        window._businessData || 
        (searchFunctions && typeof searchFunctions._getBusinessData === 'function' ? 
          searchFunctions._getBusinessData() : 
          (searchFunctions && searchFunctions._businessData ? 
            searchFunctions._businessData : []));
    
    if (!businessData || businessData.length === 0) {
      console.log("⚠️ No business data available");
      console.log("Data sources checked:");
      console.log("  - window._businessData:", !!window._businessData);
      console.log("  - searchFunctions._getBusinessData():", !!(searchFunctions && typeof searchFunctions._getBusinessData === 'function'));
      console.log("  - searchFunctions._businessData:", !!(searchFunctions && searchFunctions._businessData));
    } else {
      console.log(`✅ Found ${businessData.length} business data entries`);
      // Display sample entries
      console.groupCollapsed("📊 Business Data Entries");
      businessData.slice(0, 5).forEach((entry, idx) => {
        console.log(`${idx + 1}. ${entry.name || 'Unnamed'} (ID: ${entry.id || 'no-id'})`);
      });
      console.groupEnd();
    }
    
    // Log all panoramas in tour
    if (window.tour && window.tour.player) {
      const panoramas = window.tour.player.getByClassName('Panorama');
      console.groupCollapsed("🖼️ Tour Panoramas");
      panoramas.forEach((pano, idx) => {
        const panoData = pano.get('data') || {};
        console.log(`${idx + 1}. ${panoData.label || 'Unnamed'} (ID: ${pano.get('id')}, Tags: ${(panoData.tags || []).join(',')}`);
      });
      console.groupEnd();

      // Perform matching analysis
      if (businessData && businessData.length && panoramas.length) {
        console.groupCollapsed("🧩 Matching Analysis");

        let matchedCount = 0;
        let unmatchedPanoramas = [];
        let unmatchedBusinessData = [...businessData];

        // Check each panorama for potential matches
        panoramas.forEach((pano, idx) => {
          const panoData = pano.get('data') || {};
          const panoId = pano.get('id');
          const panoLabel = panoData.label || '';
          const panoTags = panoData.tags || [];

          console.group(`Panorama: ${panoLabel || panoId}`);

          // Check all matching strategies
          let matched = false;
          let matchStrategy = '';
          let matchedEntry = null;

          // 1. Match by panorama name/label = business data ID
          const nameMatch = businessData.find(entry =>
            entry.id && panoLabel && entry.id.toLowerCase() === panoLabel.toLowerCase());

          if (nameMatch) {
            matched = true;
            matchStrategy = 'Direct Name Match';
            matchedEntry = nameMatch;

            // Remove from unmatched list
            unmatchedBusinessData = unmatchedBusinessData.filter(entry => entry.id !== nameMatch.id);
          }

          // 2. Match by tag = business data ID
          if (!matched && panoTags.length) {
            const tagMatch = businessData.find(entry =>
              entry.id && panoTags.some(tag => tag.toLowerCase() === entry.id.toLowerCase()));

            if (tagMatch) {
              matched = true;
              matchStrategy = 'Tag Match';
              matchedEntry = tagMatch;

              // Remove from unmatched list
              unmatchedBusinessData = unmatchedBusinessData.filter(entry => entry.id !== tagMatch.id);
            }
          }

          // 3. Match by ID containing business data ID as substring
          if (!matched) {
            const idMatch = businessData.find(entry =>
              entry.id && panoId && panoId.toLowerCase().includes(entry.id.toLowerCase()));

            if (idMatch) {
              matched = true;
              matchStrategy = 'ID Substring Match';
              matchedEntry = idMatch;

              // Remove from unmatched list
              unmatchedBusinessData = unmatchedBusinessData.filter(entry => entry.id !== idMatch.id);
            }
          }

          // Log the result
          if (matched) {
            matchedCount++;
            console.log(`✅ Matched using ${matchStrategy}`);
            console.log(`Business data: ${matchedEntry.name} (${matchedEntry.id})`);
          } else {
            console.log("❌ No match found");
            unmatchedPanoramas.push({
              id: panoId,
              label: panoLabel,
              tags: panoTags
            });
          }

          console.groupEnd();
        });

        // Summary
        console.log(`📈 Summary: ${matchedCount}/${panoramas.length} panoramas matched (${Math.round(matchedCount/panoramas.length*100)}%)`);

        // Log unmatched items
        if (unmatchedPanoramas.length) {
          console.groupCollapsed(`⚠️ ${unmatchedPanoramas.length} unmatched panoramas`);
          unmatchedPanoramas.forEach((item, idx) => {
            console.log(`${idx+1}. ${item.label || item.id} (Tags: ${item.tags.join(',')})`);
          });
          console.groupEnd();
        }

        if (unmatchedBusinessData.length) {
          console.groupCollapsed(`⚠️ ${unmatchedBusinessData.length} unused business data entries`);
          unmatchedBusinessData.forEach((item, idx) => {
            console.log(`${idx+1}. ${item.name || 'Unnamed'} (ID: ${item.id})`);
          });
          console.groupEnd();
        }

        console.groupEnd(); // Matching Analysis
      }
    } else {
      console.log("⚠️ Tour or player not available");
    }

    console.groupEnd(); // Main group
  }

  // Add this to your debugBusinessMatching function:
  function testBusinessMatchForElement(elementData) {
    // Check if the main function exists and use it if available
    if (typeof window.searchFunctions?.findBusinessMatch === 'function') {
      return window.searchFunctions.findBusinessMatch(elementData);
    }
    
    // Otherwise do a simplified matching check
    const businessData = window.searchFunctions?._getBusinessData?.() || [];
    if (!businessData.length) return null;
    
    // Do basic matching
    const name = elementData.name || '';
    const id = elementData.id || '';
    const tags = elementData.tags || [];
    
    // Try name match
    if (name) {
      const match = businessData.find(entry => entry.id === name);
      if (match) return match;
    }
    
    // Try tag match
    for (const tag of tags) {
      const match = businessData.find(entry => entry.id === tag);
      if (match) return match;
    }
    
    return null;
  }

  window.searchProDebug = {
    runDiagnostics,
    logToggleDiagnostics,
    generateDebugReport,
    printDebugSummary,
    observeSearchPanel,
    extractTourTags,
    debugBusinessMatching, // <-- Add this line

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

    /**
     * [1.10] BUSINESS DATA RELOAD
     * Reloads business data without exposing internal methods
     */
    reloadBusinessData: () => {
      console.group("🔄 Business Data Reload");

      const searchFunctions =
        window.tourSearchFunctions || window.searchFunctions;

      if (!searchFunctions) {
        console.error("Search functions not available");
        console.groupEnd();
        return Promise.reject("Search functions not available");
      }

      // Get the current config
      const config = searchFunctions.getConfig();

      // Force a configuration update to trigger a reload
      return new Promise((resolve, reject) => {
        try {
          // First, ensure business data is enabled
          if (!config.businessData || !config.businessData.useBusinessData) {
            console.log("Business data was disabled, enabling it now");
            searchFunctions.updateConfig({
              businessData: {
                useBusinessData: true,
                businessDataFile:
                  config.businessData?.businessDataFile || "business.json",
                businessDataDir:
                  config.businessData?.businessDataDir || "business-data",
              },
            });
          } else {
            // Toggle the config to force a reload
            console.log("Toggling business data configuration to force reload");
            searchFunctions.updateConfig({
              businessData: {
                useBusinessData: false,
              },
            });

            // Wait a moment and then re-enable
            setTimeout(() => {
              searchFunctions.updateConfig({
                businessData: {
                  useBusinessData: true,
                  businessDataFile: config.businessData.businessDataFile,
                  businessDataDir: config.businessData.businessDataDir,
                },
              });
            }, 50);
          }

          // Force a complete reinitialization after a delay
          setTimeout(() => {
            if (window.tour) {
              console.log("Reinitializing search with fresh data");
              searchFunctions.initializeSearch(window.tour);

              // Verify the reload by checking search results
              setTimeout(() => {
                // Test with wildcard search to see all results
                const searchInput = document.querySelector("#tourSearch");
                if (searchInput) {
                  searchFunctions.toggleSearch(true);
                  searchInput.value = "*";
                  searchInput.dispatchEvent(new Event("input"));
                  console.log("Search triggered with wildcard to verify data");
                }

                console.groupEnd();
                resolve("Business data reloaded successfully");
              }, 500);
            } else {
              console.warn("Tour not available for reinitialization");
              console.groupEnd();
              reject("Tour not available");
            }
          }, 300);
        } catch (err) {
          console.error("Failed to reload business data:", err);
          console.groupEnd();
          reject(err);
        }
      });
    },
  };

  // [1.6.2] Auto-run diagnostics on load
  const debugParams = new URLSearchParams(window.location.search);
  runDiagnostics();
  if (debugParams.get("tourInspect") === "true") {
    console.log("🔍 Auto-running tour inspection (from URL param)");
    setTimeout(inspectTour, 1500); // Delay to ensure tour is loaded
  }

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

  // [1.7] SPECIALIZED UI DIAGNOSTICS - WHITE CONTAINER ISSUE
  /**
   * [1.7.1] Monitor search container visibility and background issues
   */
  function monitorSearchContainerVisibility() {
    console.log("🔍 Starting search container visibility monitor");

    const searchContainer = document.getElementById("searchContainer");
    if (!searchContainer) {
      console.error("Cannot monitor search container - element not found");
      return;
    }

    // Create a persistent diagnostic tool attached to the container
    const containerDiagnostics = {
      toggleCount: 0,
      lastToggleTime: null,
      visibilityHistory: [],
      backgroundIssuesDetected: 0,

      logToggle: function (isVisible) {
        this.toggleCount++;
        this.lastToggleTime = new Date();

        const entry = {
          timestamp: new Date(),
          action: isVisible ? "show" : "hide",
          display: getComputedStyle(searchContainer).display,
          visibility: getComputedStyle(searchContainer).visibility,
          background: getComputedStyle(searchContainer).background,
          opacity: getComputedStyle(searchContainer).opacity,
          hasResultsClass: searchContainer.classList.contains("has-results"),
          visibleClass: searchContainer.classList.contains("visible"),
          zIndex: getComputedStyle(searchContainer).zIndex,
          elementsAtCenter: getElementsAtScreenCenter(),
        };

        this.visibilityHistory.push(entry);
        if (this.visibilityHistory.length > 20) {
          this.visibilityHistory.shift(); // Keep only last 20 entries
        }

        // Check for potential issues
        if (!isVisible && entry.display !== "none") {
          console.warn(
            "🚨 ISSUE DETECTED: Container should be hidden but display is not 'none'",
            entry,
          );
          this.backgroundIssuesDetected++;
        }

        if (
          !isVisible &&
          !entry.hasResultsClass &&
          entry.background !== "transparent" &&
          !entry.background.includes("rgba(0, 0, 0, 0)")
        ) {
          console.warn(
            "🚨 ISSUE DETECTED: Container background not transparent when hidden",
            entry,
          );
          this.backgroundIssuesDetected++;
        }

        // Comprehensive logging
        console.groupCollapsed(
          `🔄 Search Toggle #${this.toggleCount}: ${isVisible ? "SHOW" : "HIDE"}`,
        );
        console.log("🕒 Time:", entry.timestamp.toLocaleTimeString());

        // Container state
        console.log("📦 Container state:", {
          display: entry.display,
          visibility: entry.visibility,
          background: entry.background,
          opacity: entry.opacity,
          classList: searchContainer.className,
          hasResultsClass: entry.hasResultsClass,
          visibleClass: entry.visibleClass,
        });

        // Child elements
        const resultsContainer =
          searchContainer.querySelector(".search-results");
        const resultsSection =
          searchContainer.querySelector(".results-section");
        const noResults = searchContainer.querySelector(".no-results");

        if (resultsContainer) {
          console.log("📋 Results container:", {
            display: getComputedStyle(resultsContainer).display,
            background: getComputedStyle(resultsContainer).background,
            opacity: getComputedStyle(resultsContainer).opacity,
            visibility: getComputedStyle(resultsContainer).visibility,
            childElementCount: resultsContainer.childElementCount,
          });
        }

        if (resultsSection) {
          console.log("📝 Results section:", {
            display: getComputedStyle(resultsSection).display,
            childElementCount: resultsSection.childElementCount,
            innerHTML:
              resultsSection.innerHTML.length > 100
                ? resultsSection.innerHTML.substring(0, 100) + "..."
                : resultsSection.innerHTML,
          });
        }

        if (noResults) {
          console.log("❌ No results element:", {
            display: getComputedStyle(noResults).display,
            visibility: getComputedStyle(noResults).visibility,
          });
        }

        // Check for elements at center of screen
        console.log("🎯 Elements at screen center:", entry.elementsAtCenter);

        // Check for duplicate search containers
        const allSearchContainers =
          document.querySelectorAll("#searchContainer");
        if (allSearchContainers.length > 1) {
          console.warn(
            `⚠️ CRITICAL ISSUE: Found ${allSearchContainers.length} search containers!`,
          );
          Array.from(allSearchContainers).forEach((container, idx) => {
            console.log(`Container #${idx}:`, {
              display: getComputedStyle(container).display,
              visibility: getComputedStyle(container).visibility,
              background: getComputedStyle(container).background,
              inDom: document.body.contains(container),
              parent: container.parentElement?.tagName || "none",
            });
          });
        }

        // CSS Rule Analysis
        console.log(
          "🎨 Relevant CSS rules:",
          findRelevantCSSRules("#searchContainer"),
        );

        console.groupEnd();

        // Schedule a follow-up check after transitions should be complete
        if (!isVisible) {
          setTimeout(() => this.checkAfterHide(), 500);
        }

        return entry;
      },

      checkAfterHide: function () {
        const searchContainer = document.getElementById("searchContainer");
        if (!searchContainer) return;

        console.groupCollapsed("🔍 Post-hide check");
        console.log("Display:", getComputedStyle(searchContainer).display);
        console.log(
          "Background:",
          getComputedStyle(searchContainer).background,
        );
        console.log("Opacity:", getComputedStyle(searchContainer).opacity);
        console.log(
          "Visibility:",
          getComputedStyle(searchContainer).visibility,
        );
        console.log("Class list:", searchContainer.className);
        console.log("Elements at center:", getElementsAtScreenCenter());

        // Check for any remaining visible search-related elements
        const allSearchElements = document.querySelectorAll(
          "#searchContainer, .search-results, .results-section",
        );
        allSearchElements.forEach((el) => {
          const style = getComputedStyle(el);
          if (
            style.display !== "none" &&
            style.opacity !== "0" &&
            style.visibility !== "hidden"
          ) {
            console.warn(
              "⚠️ Search element still visible:",
              el.tagName,
              el.className,
              {
                display: style.display,
                opacity: style.opacity,
                visibility: style.visibility,
              },
            );
          }
        });

        console.groupEnd();
      },

      getHistory: function () {
        return this.visibilityHistory;
      },

      generateReport: function () {
        return {
          toggleCount: this.toggleCount,
          lastToggle: this.lastToggleTime,
          backgroundIssues: this.backgroundIssuesDetected,
          history: this.visibilityHistory.slice(-5), // Last 5 entries
        };
      },
    };

    // Attach the diagnostics object to window for manual inspection
    window.searchContainerDiagnostics = containerDiagnostics;

    // Set up observers
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          // Check if this was a visibility toggle
          if (
            mutation.attributeName === "style" ||
            mutation.attributeName === "class"
          ) {
            const isVisible =
              searchContainer.style.display !== "none" &&
              !searchContainer.classList.contains("hidden");

            containerDiagnostics.logToggle(isVisible);
          }
        }
      }
    });

    observer.observe(searchContainer, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    console.log(
      "🔄 Search container visibility monitor active - Access with window.searchContainerDiagnostics",
    );
    return containerDiagnostics;
  }

  /**
   * [1.7.2] Get all elements at the center of the screen
   */
  function getElementsAtScreenCenter() {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const elements = document.elementsFromPoint(centerX, centerY);

    return elements.map((el) => ({
      tag: el.tagName,
      id: el.id || "none",
      className: el.className || "none",
      display: getComputedStyle(el).display,
      background: getComputedStyle(el).background,
      opacity: getComputedStyle(el).opacity,
      zIndex: getComputedStyle(el).zIndex,
    }));
  }

  /**
   * [1.7.3] Find all CSS rules affecting the search container
   */
  function findRelevantCSSRules(selector) {
    const relevantRules = [];

    try {
      for (const sheet of document.styleSheets) {
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (!rules) continue;

          for (const rule of rules) {
            if (
              rule.selectorText &&
              (rule.selectorText.includes("searchContainer") ||
                rule.selectorText.includes("search-results") ||
                rule.selectorText.includes("has-results"))
            ) {
              relevantRules.push({
                selector: rule.selectorText,
                background: rule.style.background || "not set",
                backgroundColor: rule.style.backgroundColor || "not set",
                display: rule.style.display || "not set",
                opacity: rule.style.opacity || "not set",
                visibility: rule.style.visibility || "not set",
                transition: rule.style.transition || "not set",
                zIndex: rule.style.zIndex || "not set",
                sheetHref: sheet.href || "inline",
              });
            }
          }
        } catch (e) {
          // CORS issues with external stylesheets
        }
      }
    } catch (e) {
      console.error("Error analyzing CSS rules:", e);
    }

    return relevantRules;
  }

  // Initialize the visibility monitor
  monitorSearchContainerVisibility();

  // Add to global exports
  window.searchProDebug.monitorSearchContainerVisibility =
    monitorSearchContainerVisibility;
  window.searchProDebug.getElementsAtScreenCenter = getElementsAtScreenCenter;
  window.searchProDebug.findRelevantCSSRules = findRelevantCSSRules;
})();

// Log successful loading
console.debug("✅ Search Pro Debug loaded successfully");
