/**
 * Search Pro Debug Utilities
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
          !!document.querySelector("link[href*='search-01.css']") ||
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
  window.searchProDebug = {
    runDiagnostics,
    generateDebugReport,
    printDebugSummary,
    observeSearchPanel,

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

// Log successful loading
console.debug("✅ Search Pro Debug loaded successfully");
