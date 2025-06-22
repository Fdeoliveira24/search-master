/*
====================================
3DVista Enhanced Search Script
Version: 2.0.1
Last Updated: 06/03/2025
Description: Advanced search functionality for 3DVista tours with comprehensive customization options.
Features include intelligent element detection with fallback strategies, extensive visual customization 
(themes, colors, typography, positioning), flexible content filtering by element types and tags, 
responsive mobile/desktop layouts, thumbnail support with default images, parent-child element 
relationships, Google Sheets integration, business data management, retry logic for element 
triggering, keyboard navigation, cross-window communication, and real-time search with 
configurable display options. Supports panoramas, hotspots, polygons, videos, webframes, 
images, text elements, projected images, 3D models, and custom business entries with 
comprehensive labeling and grouping capabilities.
====================================
*/

// [1.0] GLOBAL/MODULE SCOPE VARIABLES
// [1.0.1] Logger shim - will be replaced by the full implementation from debug-core-non-mod.js
if (!window.Logger) {
  window.Logger = {
    level: 2, // 0=none, 1=error, 2=warn, 3=info, 4=debug
    useColors: true,
    prefix: "[Search]",

    // Format a message with prefix
    _formatMessage: function (message, logType) {
      if (typeof message === "string" && message.includes(this.prefix)) {
        return message;
      }
      return `${this.prefix} ${logType}: ${message}`;
    },

    debug: function (message, ...args) {
      if (this.level >= 4) {
        console.debug(this._formatMessage(message, "DEBUG"), ...args);
      }
    },

    info: function (message, ...args) {
      if (this.level >= 3) {
        console.info(this._formatMessage(message, "INFO"), ...args);
      }
    },

    warn: function (message, ...args) {
      if (this.level >= 2) {
        console.warn(this._formatMessage(message, "WARN"), ...args);
      }
    },

    error: function (message, ...args) {
      if (this.level >= 1) {
        console.error(this._formatMessage(message, "ERROR"), ...args);
      }
    },

    // Helper for initializing with different logging levels
    setLevel: function (level) {
      if (typeof level === "number" && level >= 0 && level <= 4) {
        const oldLevel = this.level;
        this.level = level;
        this.info(`Logger level changed from ${oldLevel} to ${level}`);
        return true;
      }
      return false;
    },

    // Simple stubs for compatibility with full Logger
    setColorMode: function () {
      return false;
    },
    table: function (data) {
      if (this.level >= 3) console.table(data);
    },
    group: function (label) {
      if (this.level >= 3) console.group(label);
    },
    groupCollapsed: function (label) {
      if (this.level >= 3) console.groupCollapsed(label);
    },
    groupEnd: function () {
      if (this.level >= 3) console.groupEnd();
    },
    _log: function (message, ...args) {
      console.log(message, ...args);
    },
  };
  console.info(
    "[Search] Using fallback Logger shim until debug-core-non-mod.js loads",
  );
}
// [1.0.2] Placeholder markup for search container (replace with real markup as needed)
const SEARCH_MARKUP = '<div id="searchContainer"></div>';
// [1.0.3] Cross-window communication channel (BroadcastChannel API)
let _crossWindowChannel = {
  _channel: null,
  channelName: "tourSearchChannel",
  init() {
    try {
      if (typeof BroadcastChannel !== "undefined") {
        this._channel = new BroadcastChannel(this.channelName);
        Logger.info(
          "BroadcastChannel initialized for cross-window communication",
        );
        return true;
      } else {
        Logger.warn("BroadcastChannel API not available");
        return false;
      }
    } catch (error) {
      Logger.error("Error initializing BroadcastChannel:", error);
      return false;
    }
  },
  send(messageType, data) {
    if (this._channel) {
      this._channel.postMessage({ type: messageType, data });
    }
  },
  listen(callback) {
    if (this._channel) {
      this._channel.onmessage = (event) => {
        if (event.data && event.data.type) {
          callback(event.data);
        }
      };
    }
  },
  close() {
    if (this._channel) {
      this._channel.close();
      this._channel = null;
    }
  },
};
// [1.0.4] Cleanup for search event listeners
let _unbindSearchEventListeners = function () {
  try {
    if (
      window._searchEventCleanup &&
      Array.isArray(window._searchEventCleanup)
    ) {
      window._searchEventCleanup.forEach((cleanupFn) => {
        try {
          cleanupFn();
        } catch (e) {
          Logger.debug("Event cleanup error:", e);
        }
      });
      window._searchEventCleanup = [];
    }

    Logger.debug("Search event listeners cleaned up");
    return true;
  } catch (error) {
    Logger.warn("Error during event cleanup:", error);
    return false;
  }
};

// [1.0.5] Shared selection index for search results
let selectedIndex = -1;

// [2.0] CORE INITIALIZATION FUNCTION
function init() {
  if (window.searchListInitialized) {
    // Already initialized, do nothing
    return;
  }
  // [2.0.1] Internal initialization function
  function internalInit() {
    if (window.searchListInitialized) return;
    // Ensure idempotent DOM creation
    if (!document.getElementById("searchContainer")) {
      // Try to find the viewer element
      var viewer = document.getElementById("viewer");
      if (!viewer) {
        console.error(
          "Search Pro initialization failed: #viewer element not found",
        );
        return;
      }
      var temp = document.createElement("div");
      temp.innerHTML = SEARCH_MARKUP.trim();
      viewer.appendChild(temp.firstChild);
    }
    // Bind events and set up UI (idempotent)
    if (
      typeof window.tourSearchFunctions === "object" &&
      window.tourSearchFunctions._bindSearchEventListeners
    ) {
      var el = document.getElementById("searchContainer");
      var input = document.getElementById("tourSearch");
      var clearBtn = el ? el.querySelector(".clear-button") : null;
      var icon = el ? el.querySelector(".search-icon") : null;
      window.tourSearchFunctions._bindSearchEventListeners(
        el,
        input,
        clearBtn,
        icon,
        window.tourSearchFunctions.performSearch || function () {},
      );
    }
    window.searchListInitialized = true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", internalInit, { once: true });
  } else {
    internalInit();
  }
}
// [2.0.2] Expose init as a public method for robust initialization
window.tourSearchInit = init;

// [3.0] SCRIPT LOADER AND INITIALIZATION
(function () {
  // [3.0.1] Forward declarations for functions/objects used before definition
  let _crossWindowChannel = {
    _channel: null,
    channelName: "tourSearchChannel",
    init() {
      try {
        if (typeof BroadcastChannel !== "undefined") {
          this._channel = new BroadcastChannel(this.channelName);
          Logger.info(
            "BroadcastChannel initialized for cross-window communication",
          );
          return true;
        } else {
          Logger.warn("BroadcastChannel API not available");
          return false;
        }
      } catch (error) {
        Logger.error("Error initializing BroadcastChannel:", error);
        return false;
      }
    },
    send(messageType, data) {
      if (this._channel) {
        this._channel.postMessage({ type: messageType, data });
      }
    },
    listen(callback) {
      if (this._channel) {
        this._channel.onmessage = (event) => {
          if (event.data && event.data.type) {
            callback(event.data);
          }
        };
      }
    },
    close() {
      if (this._channel) {
        this._channel.close();
        this._channel = null;
      }
    },
  };

  let _unbindSearchEventListeners = function () {
    try {
      if (
        window._searchEventCleanup &&
        Array.isArray(window._searchEventCleanup)
      ) {
        window._searchEventCleanup.forEach((cleanupFn) => {
          try {
            cleanupFn();
          } catch (e) {
            Logger.debug("Event cleanup error:", e);
          }
        });
        window._searchEventCleanup = [];
      }

      Logger.debug("Search event listeners cleaned up");
      return true;
    } catch (error) {
      Logger.warn("Error during event cleanup:", error);
      return false;
    }
  };

  // [3.0.2] Default Configuration
  let _config = {
    debugMode: false, // Master debug switch
    maxResults: 20,
    minSearchLength: 2,
    showHotspots: true,
    showMedia: true,
    showPanoramas: true,
    searchInHotspotTitles: true,
    searchInMediaTitles: true,
    searchInPanoramaTitles: true,
    searchInHotspotDescriptions: false,
    searchInMediaDescriptions: false,
    mobileBreakpoint: 768,
    autoHide: {
      // Auto-hide search on mobile after selection
      mobile: true,
      desktop: false,
    },
  };

  // [3.0.3] Utility to wait for tour readiness
  function initializeSearchWhenTourReady(callback, timeoutMs = 15000) {
    const start = Date.now();
    (function poll() {
      if (
        window.tour &&
        window.tour.mainPlayList &&
        typeof window.tour.mainPlayList.get === "function" &&
        Array.isArray(window.tour.mainPlayList.get("items")) &&
        window.tour.mainPlayList.get("items").length > 0
      ) {
        callback && callback();
      } else if (Date.now() - start < timeoutMs) {
        setTimeout(poll, 200);
      } else {
        // Use Logger if available, otherwise console.warn
        if (typeof Logger !== "undefined") {
          Logger.warn("Tour not ready after waiting for", timeoutMs, "ms.");
        } else {
          console.warn("Tour not ready after waiting for", timeoutMs, "ms.");
        }
      }
    })();
  }

  // [3.0.4] Simple Logger Definition
  const Logger = {
    _log(level, ...args) {
      const prefix = `[SearchPro-${level.toUpperCase()}]`;
      if (typeof window !== "undefined" && window.console) {
        // Basic styling for console output
        const style =
          level === "error"
            ? "color: red; font-weight: bold;"
            : level === "warn"
              ? "color: orange;"
              : level === "info"
                ? "color: blue;"
                : "color: gray;"; // Default for debug

        if (
          level === "debug" &&
          (typeof _config === "undefined" || !_config.debugMode)
        ) {
          return; // Do not log debug messages if debugMode is off
        }
        console.log(`%c${prefix}`, style, ...args);
      } else {
        // Fallback for environments without console or specific styling, or if debugMode is off for debug messages
        if (
          level === "debug" &&
          (typeof _config === "undefined" || !_config.debugMode)
        ) {
          return;
        }
        console.log(prefix, ...args);
      }
    },
    debug(...args) {
      this._log("debug", ...args);
    },
    info(...args) {
      this._log("info", ...args);
    },
    warn(...args) {
      this._log("warn", ...args);
    },
    error(...args) {
      this._log("error", ...args);
    },
  };

  // [3.0.5] Check if script is already loaded
  if (window._searchProLoaded) {
    console.warn("Search Pro is already loaded. Skipping initialization.");
    return;
  }

  // Enhanced playlist detection utilities
  const PlaylistUtils = {
    /**
     * Get the main playlist with comprehensive fallback detection
     * @param {Object} tour - Tour instance to check
     * @returns {Object|null} - Main playlist or null if not found
     */
    getMainPlayList(tour = null) {
      const tourToCheck = tour || window.tour || window.tourInstance;

      if (!tourToCheck) return null;

      // Method 1: Direct mainPlayList access (most common)
      if (
        tourToCheck.mainPlayList?.get &&
        tourToCheck.mainPlayList.get("items")?.length
      ) {
        Logger.debug("Found mainPlayList via direct access");
        return tourToCheck.mainPlayList;
      }

      // Method 2: Search through all playlists for mainPlayList (robust fallback)
      if (tourToCheck.player?.getByClassName) {
        try {
          const allPlaylists = tourToCheck.player.getByClassName("PlayList");
          const found = allPlaylists.find(
            (pl) => pl.get && pl.get("id") === "mainPlayList",
          );
          if (found?.get("items")?.length) {
            Logger.debug("Found mainPlayList via getByClassName search");
            return found;
          }
        } catch (e) {
          Logger.debug("getByClassName search for mainPlayList failed:", e);
        }
      }

      return null;
    },

    /**
     * Get the root player playlist for enhanced 3D content
     * @param {Object} tour - Tour instance to check
     * @returns {Object|null} - Root player playlist or null if not found
     */
    getRootPlayerPlayList(tour = null) {
      const tourToCheck = tour || window.tour || window.tourInstance;

      if (!tourToCheck) return null;

      try {
        if (
          tourToCheck.locManager?.rootPlayer?.mainPlayList?.get &&
          tourToCheck.locManager.rootPlayer.mainPlayList.get("items")?.length
        ) {
          Logger.debug("Found rootPlayer mainPlayList");
          return tourToCheck.locManager.rootPlayer.mainPlayList;
        }
      } catch (e) {
        Logger.debug("Root player playlist access failed:", e);
      }

      return null;
    },

    /**
     * Get both playlists with comprehensive detection
     * @param {Object} tour - Tour instance to check
     * @returns {Object} - Object containing main and root playlists
     */
    getAllPlayLists(tour = null) {
      return {
        main: this.getMainPlayList(tour),
        root: this.getRootPlayerPlayList(tour),
      };
    },
  };

  // [3.0.7] Mark as loaded
  window._searchProLoaded = true;

  // [3.0.8] Define search markup template
  // [DELETE COMMENT] Replace the SEARCH_MARKUP around line 360 with this corrected version:
  const SEARCH_MARKUP = `
    <div id="searchContainer" class="search-container">
        <!-- Search input field -->
        <div class="search-field">
            <input type="text" id="tourSearch" placeholder="Search tour locations... (* for all)" autocomplete="off">
            <div class="icon-container">
                <!-- Search icon -->
                <div class="search-icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
                <!-- Clear search button -->
                <button class="clear-button" aria-label="Clear search" style="display: none;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>
        <!-- Search results container -->
        <div class="search-results" role="listbox" style="display: none;">
            <div class="results-section">
            </div>
            <!-- No results message -->
            <div class="no-results" role="status" aria-live="polite" style="display: none;">
                <div class="no-results-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                        <line x1="9" y1="9" x2="9.01" y2="9"></line>
                        <line x1="15" y1="9" x2="15.01" y2="9"></line>
                    </svg>
                </div>
                No matching results
            </div>
        </div>
    </div>
`;

  // [3.0.9] Dependency loader
  function loadDependencies() {
    return new Promise((resolve, reject) => {
      // [3.0.9.1] Try to detect if Fuse.js is already loaded
      if (typeof Fuse !== "undefined") {
        console.log("Fuse.js already loaded, skipping load");
        resolve();
        return;
      }

      // [3.0.9.2] Try to load local Fuse.js first
      const fuseScript = document.createElement("script");
      fuseScript.src = "search-pro-non-mod/fuse.js/dist/fuse.min.js"; // must have the correct folder location name
      fuseScript.async = true;

      fuseScript.onload = () => {
        console.log("Local Fuse.js loaded successfully");
        resolve();
      };

      fuseScript.onerror = () => {
        console.warn(
          "Local Fuse.js failed to load, attempting to load from CDN...",
        );

        // [3.0.9.3] Fallback to CDN
        const fuseCDN = document.createElement("script");
        fuseCDN.src =
          "https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js";
        fuseCDN.async = true;

        fuseCDN.onload = () => {
          console.log("Fuse.js loaded successfully from CDN");
          resolve();
        };

        fuseCDN.onerror = () => {
          const error = new Error(
            "Both local and CDN versions of Fuse.js failed to load",
          );
          console.error(error);
          reject(error);
        };

        document.body.appendChild(fuseCDN);
      };

      document.body.appendChild(fuseScript);
    });
  }

  // [3.0.10] Optional debug tools loader
  function loadDebugTools() {
    return new Promise((resolve) => {
      const debugEnabled =
        window.location.search.includes("debug=true") ||
        localStorage.getItem("searchProDebugEnabled") === "true";

      if (!debugEnabled) {
        resolve(false);
        return;
      }

      const debugScript = document.createElement("script");
      debugScript.src = "search-pro-non-mod/js/debug-core-non-mod.js"; // Must have the correct folder location name
      debugScript.async = true;

      debugScript.onload = () => {
        console.log("Search Pro Debug Tools loaded successfully");
        resolve(true);
      };

      debugScript.onerror = () => {
        console.warn("Search Pro Debug Tools failed to load");
        resolve(false);
      };

      document.body.appendChild(debugScript);
    });
  }

  // [3.0.11] CSS Loader
  function loadCSS() {
    return new Promise((resolve) => {
      // Check if CSS is already loaded - make sure sure it has the correct folder location name
      if (
        document.querySelector(
          'link[href="search-pro-non-mod/css/search-01-non-mod.css"]',
        )
      ) {
        resolve();
        return;
      }

      const cssLink = document.createElement("link");
      cssLink.rel = "stylesheet";
      cssLink.href = "search-pro-non-mod/css/search-01-non-mod.css"; // Make sure sure it has the correct folder location name

      cssLink.onload = () => resolve();
      cssLink.onerror = () => {
        console.warn("Failed to load search CSS, styling may be affected");
        resolve(); // Still resolve so we don't block initialization
      };

      document.head.appendChild(cssLink);
    });
  }

  // [3.0.12] DOM initialization
  function initializeDom() {
    // Find the viewer element
    const viewer = document.getElementById("viewer");
    if (!viewer) {
      console.error(
        "Search Pro initialization failed: #viewer element not found",
      );
      return false;
    }

    // Check if search container already exists
    if (document.getElementById("searchContainer")) {
      console.log("Search container already exists, skipping DOM creation");
      return true;
    }

    // Create a temporary container
    const temp = document.createElement("div");
    temp.innerHTML = SEARCH_MARKUP.trim();

    // Append the search container to the viewer
    viewer.appendChild(temp.firstChild);

    return true;
  }

  // [3.0.13] Main initialization function
  async function initialize() {
    try {
      // Load CSS first
      await loadCSS();

      // Initialize DOM
      if (!initializeDom()) {
        return;
      }

      // Load dependencies
      await loadDependencies();

      // Optionally load debug tools
      await loadDebugTools();

      // Wait for the tour to be initialized
      const TourBinding = {
        initialized: false,
        // [3.0.13.1] Main initialization function
        async init() {
          if (this.initialized) {
            Logger.info("Tour binding already initialized");
            return;
          }
          try {
            // Try multiple binding strategies
            await this.bindToTour();
            this.initialized = true;
            Logger.info("Tour binding successful");
          } catch (error) {
            Logger.error("Tour binding failed:", error);
            throw error;
          }
        },
        // [3.0.13.2] Comprehensive tour binding with multiple strategies
        async bindToTour() {
          // Strategy 1: Official 3DVista Events (Preferred)
          if (await this.tryEventBinding()) {
            Logger.info("Using official 3DVista events");
            return;
          }
          // Strategy 2: Direct tour detection with validation
          if (await this.tryDirectBinding()) {
            Logger.info("Using direct tour binding");
            return;
          }
          // Strategy 3: DOM-based detection
          if (await this.tryDOMBinding()) {
            Logger.info("Using DOM-based binding");
            return;
          }
          throw new Error("All tour binding strategies failed");
        },
        // [3.0.13.3] Strategy 1: Official 3DVista Events
        tryEventBinding() {
          return new Promise((resolve, reject) => {
            try {
              // Check if 3DVista event system is available
              if (window.TDV && window.TDV.Tour && window.tour) {
                Logger.debug("3DVista event system detected");
                // Bind to official tour events
                if (window.TDV.Tour.EVENT_TOUR_LOADED) {
                  window.tour.bind(window.TDV.Tour.EVENT_TOUR_LOADED, () => {
                    Logger.debug("EVENT_TOUR_LOADED fired");
                    this.validateAndInitialize().then(resolve).catch(reject);
                  });
                  // Timeout fallback
                  setTimeout(() => {
                    reject(new Error("EVENT_TOUR_LOADED timeout"));
                  }, 15000);
                  return; // Wait for event
                }
              }
              // Event system not available
              reject(new Error("3DVista events not available"));
            } catch (error) {
              reject(error);
            }
          });
        },
        // [3.0.13.4] Strategy 2: Direct tour validation
        tryDirectBinding() {
          return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100; // 20 seconds max
            const poll = () => {
              attempts++;
              if (this.isTourReady()) {
                this.validateAndInitialize().then(resolve).catch(reject);
                return;
              }
              if (attempts >= maxAttempts) {
                reject(new Error("Direct tour binding timeout"));
                return;
              }
              setTimeout(poll, 200);
            };
            poll();
          });
        },
        // [3.0.13.5] Strategy 3: DOM-based detection
        tryDOMBinding() {
          return new Promise((resolve, reject) => {
            // Watch for DOM changes that indicate tour is ready
            const observer = new MutationObserver((mutations) => {
              for (const mutation of mutations) {
                if (mutation.type === "childList") {
                  // Look for tour-specific DOM elements
                  const tourElements = document.querySelectorAll(
                    "[data-name], .PanoramaOverlay, .mainViewer",
                  );
                  if (tourElements.length > 0 && this.isTourReady()) {
                    observer.disconnect();
                    this.validateAndInitialize().then(resolve).catch(reject);
                    return;
                  }
                }
              }
            });
            observer.observe(document.body, {
              childList: true,
              subtree: true,
            });
            // Timeout
            setTimeout(() => {
              observer.disconnect();
              reject(new Error("DOM binding timeout"));
            }, 20000);
          });
        },
        // [3.0.13.6] Comprehensive tour readiness check
        isTourReady() {
          try {
            const tourCandidates = [
              window.tour,
              window.tourInstance,
              window.TDV &&
              window.TDV.PlayerAPI &&
              typeof window.TDV.PlayerAPI.getCurrentPlayer === "function"
                ? window.TDV.PlayerAPI.getCurrentPlayer()
                : null,
            ].filter(Boolean);

            for (const tour of tourCandidates) {
              if (!tour) continue;

              // ENHANCED: Use utility functions for consistent playlist detection
              const playlists = PlaylistUtils.getAllPlayLists(tour);

              // Check if we have at least one valid playlist
              if (!playlists.main && !playlists.root) continue;

              // Validate basic player functionality
              const hasPlayer =
                tour.player && typeof tour.player.getByClassName === "function";
              if (!hasPlayer) continue;

              // Check initialization flag if available
              try {
                if (tour._isInitialized === false) {
                  Logger.debug(
                    "Tour not yet initialized (_isInitialized = false)",
                  );
                  continue;
                }
              } catch (e) {
                // _isInitialized might not exist, that's okay
              }

              // If we get here, the tour appears ready
              const mainCount = playlists.main?.get("items")?.length || 0;
              const rootCount = playlists.root?.get("items")?.length || 0;
              Logger.debug(
                `Tour readiness validated: ${mainCount} main items, ${rootCount} root items`,
              );
              return true;
            }

            Logger.debug("No valid tour found in readiness check");
            return false;
          } catch (error) {
            Logger.debug("Tour readiness check failed:", error);
            return false;
          }
        },
        // [3.0.13.7] Validate tour and initialize search
        async validateAndInitialize() {
          // Double-check everything is ready
          if (!this.isTourReady()) {
            throw new Error("Tour validation failed");
          }
          // Additional validation
          const items = window.tour.mainPlayList.get("items");
          Logger.info(`Tour ready with ${items.length} panoramas`);
          // Initialize search
          if (
            window.tourSearchFunctions &&
            typeof window.tourSearchFunctions.initializeSearch === "function"
          ) {
            window.tourSearchFunctions.initializeSearch(window.tour);
          } else {
            throw new Error("tourSearchFunctions not available");
          }
        },
      };
      // Use the new utility to wait for tour readiness before initializing TourBinding
      initializeSearchWhenTourReady(() => {
        TourBinding.init().catch((error) => {
          Logger.error("Tour binding failed completely during init:", error);
        });
      });
    } catch (error) {
      console.error("Search Pro initialization failed:", error);
    }
  }

  // [3.0.14] TOUR LIFECYCLE BINDING
  const TourLifecycle = {
    // [3.0.14.1] Bind to tour lifecycle events
    bindLifecycle() {
      if (window.tour && window.TDV && window.TDV.Tour) {
        // Bind to tour end event
        if (window.TDV.Tour.EVENT_TOUR_ENDED) {
          window.tour.bind(window.TDV.Tour.EVENT_TOUR_ENDED, () => {
            Logger.info("Tour ended - cleaning up search");
            this.cleanup();
          });
        }
      }

      // Handle page unload
      window.addEventListener("beforeunload", () => {
        this.cleanup();
      });
    },

    // [3.0.14.2] Complete cleanup
    cleanup() {
      try {
        // Clean up event listeners
        _unbindSearchEventListeners();

        // Close cross-window communication
        if (_crossWindowChannel && _crossWindowChannel._channel) {
          _crossWindowChannel.close();
        }

        // Mark as uninitialized
        window.searchListInitialized = false;
        window.searchListInitiinitialized = false;

        Logger.info("Search cleanup completed");
      } catch (error) {
        Logger.warn("Cleanup error:", error);
      }
    },
  };

  // [3.0.15] Initialize lifecycle binding
  TourLifecycle.bindLifecycle();

  // [3.0.16] Start initialization when the DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();

// [3.1] CSV PARSER UTILITY
const Papa = {
  parse: function (csvString, options = {}) {
    const defaults = {
      header: false,
      skipEmptyLines: true,
      dynamicTyping: false,
    };

    const settings = { ...defaults, ...options };
    let lines = csvString.split(/\r\n|\n/);

    // Skip empty lines if requested
    if (settings.skipEmptyLines) {
      lines = lines.filter((line) => line.trim() !== "");
    }

    // Parse header row if requested
    let headers = [];
    if (settings.header && lines.length > 0) {
      const headerLine = lines.shift();
      headers = headerLine.split(",").map((h) => h.trim());
    }

    // Parse data rows
    const data = lines.map((line) => {
      const values = line.split(",").map((val) => {
        let v = val.trim();

        // Apply dynamic typing if requested
        if (settings.dynamicTyping) {
          // Convert to number if it looks like a number
          if (/^[-+]?\d+(\.\d+)?$/.test(v)) {
            return parseFloat(v);
          }
          // Convert to boolean if true/false
          else if (v.toLowerCase() === "true") {
            return true;
          } else if (v.toLowerCase() === "false") {
            return false;
          }
        }
        return v;
      });

      // If we have headers, return an object, otherwise an array
      if (settings.header) {
        const row = {};
        headers.forEach((header, index) => {
          if (index < values.length) {
            row[header] = values[index];
          }
        });
        return row;
      }
      return values;
    });

    return {
      data: data,
      errors: [],
      meta: {
        delimiter: ",",
        linebreak: "\n",
        aborted: false,
        truncated: false,
        cursor: 0,
      },
    };
  },
};

// [4.0] MAIN SEARCH MODULE DEFINITION
window.tourSearchFunctions = (function () {
  // [4.1] CENTRALIZED MODULE-LEVEL VARIABLES
  // [4.1.0] Core search state variables centralized at module level
  let currentSearchTerm = "";
  let fuse = null;
  let performSearch = null; // Will be properly initialized in _initializeSearch

  // [4.1.1] Enhanced playlist detection utilities
  const PlaylistUtils = {
    /**
     * Get the main playlist with comprehensive fallback detection
     * @param {Object} tour - Tour instance to check
     * @returns {Object|null} - Main playlist or null if not found
     */
    getMainPlayList(tour = null) {
      const tourToCheck = tour || window.tour || window.tourInstance;

      if (!tourToCheck) return null;

      // Method 1: Direct mainPlayList access (most common)
      if (
        tourToCheck.mainPlayList?.get &&
        tourToCheck.mainPlayList.get("items")?.length
      ) {
        Logger.debug("Found mainPlayList via direct access");
        return tourToCheck.mainPlayList;
      }

      // Method 2: Search through all playlists for mainPlayList (robust fallback)
      if (tourToCheck.player?.getByClassName) {
        try {
          const allPlaylists = tourToCheck.player.getByClassName("PlayList");
          const found = allPlaylists.find(
            (pl) => pl.get && pl.get("id") === "mainPlayList",
          );
          if (found?.get("items")?.length) {
            Logger.debug("Found mainPlayList via getByClassName search");
            return found;
          }
        } catch (e) {
          Logger.debug("getByClassName search for mainPlayList failed:", e);
        }
      }

      return null;
    },

    /**
     * Get the root player playlist for enhanced 3D content
     * @param {Object} tour - Tour instance to check
     * @returns {Object|null} - Root player playlist or null if not found
     */
    getRootPlayerPlayList(tour = null) {
      const tourToCheck = tour || window.tour || window.tourInstance;

      if (!tourToCheck) return null;

      try {
        if (
          tourToCheck.locManager?.rootPlayer?.mainPlayList?.get &&
          tourToCheck.locManager.rootPlayer.mainPlayList.get("items")?.length
        ) {
          Logger.debug("Found rootPlayer mainPlayList");
          return tourToCheck.locManager.rootPlayer.mainPlayList;
        }
      } catch (e) {
        Logger.debug("Root player playlist access failed:", e);
      }

      return null;
    },

    /**
     * Get both playlists with comprehensive detection
     * @param {Object} tour - Tour instance to check
     * @returns {Object} - Object containing main and root playlists
     */
    getAllPlayLists(tour = null) {
      return {
        main: this.getMainPlayList(tour),
        root: this.getRootPlayerPlayList(tour),
      };
    },
  };

  const keyboardManager = {
    init(searchContainer, searchInput, searchCallback) {
      if (!searchContainer || !searchInput) {
        Logger.error("Invalid parameters for keyboard manager");
        return () => {}; // Return no-op cleanup function
      }

      // removed duplicate declaration of selectedIndex
      let resultItems = [];

      // Store bound handlers for proper cleanup
      const handlers = {
        documentKeydown: null,
        inputKeyup: null,
        inputKeydown: null,
      };

      // [4.1.2.1] updateSelection helper function
      const updateSelection = (newIndex) => {
        resultItems = searchContainer.querySelectorAll(".result-item");
        if (!resultItems.length) return;
        if (selectedIndex >= 0 && selectedIndex < resultItems.length) {
          resultItems[selectedIndex].classList.remove("selected");
          _aria.setSelected(resultItems[selectedIndex], false);
        }
        selectedIndex = newIndex;
        if (selectedIndex >= 0 && selectedIndex < resultItems.length) {
          const selectedItem = resultItems[selectedIndex];
          selectedItem.classList.add("selected");
          _aria.setSelected(selectedItem, true);
          selectedItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
          selectedItem.focus();
        } else {
          searchInput.focus();
        }
      };

      // [4.1.2.2] Event handlers
      handlers.documentKeydown = function (e) {
        if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          _toggleSearch(true);
        }
        if (!searchContainer.classList.contains("visible")) return;
        switch (e.key) {
          case "Escape":
            e.preventDefault();
            if (searchInput.value.trim() !== "") {
              searchInput.value = "";
              searchCallback(); // Use the passed callback instead of direct reference
              selectedIndex = -1;
            } else {
              _toggleSearch(false);
            }
            break;
          case "ArrowDown":
            e.preventDefault();
            updateSelection(
              Math.min(selectedIndex + 1, resultItems.length - 1),
            );
            break;
          case "ArrowUp":
            e.preventDefault();
            updateSelection(Math.max(selectedIndex - 1, -1));
            break;
          case "Enter":
            if (selectedIndex >= 0 && selectedIndex < resultItems.length) {
              e.preventDefault();
              resultItems[selectedIndex].click();
            }
            break;
          case "Tab":
            selectedIndex = -1;
            break;
        }
      };

      // Input keyup handler
      handlers.inputKeyup = _debounce(function () {
        selectedIndex = -1;
      }, 200);

      // Input keydown handler
      handlers.inputKeydown = function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          setTimeout(() => {
            resultItems = searchContainer.querySelectorAll(".result-item");
            if (resultItems.length > 0) {
              resultItems[0].click();
            }
          }, 100);
        }
      };

      // Bind all event handlers
      document.addEventListener("keydown", handlers.documentKeydown);
      searchInput.addEventListener("keyup", handlers.inputKeyup);
      searchInput.addEventListener("keydown", handlers.inputKeydown);

      // Return cleanup function
      return function cleanup() {
        try {
          document.removeEventListener("keydown", handlers.documentKeydown);
          if (searchInput) {
            searchInput.removeEventListener("keyup", handlers.inputKeyup);
            searchInput.removeEventListener("keydown", handlers.inputKeydown);
          }
          Logger.debug("Keyboard manager event listeners cleaned up");
        } catch (error) {
          Logger.warn("Error cleaning up keyboard manager:", error);
        }
      };
    },
  };
  // [4.2] CONSTANTS AND CONFIGURATION
  const BREAKPOINTS = {
    mobile: 768,
    tablet: 1024,
  };

  // [4.2.0] Configuration Builder Class for more maintainable options
  // [IMPORTANT] *** This class is used to build the configuration object
  class ConfigBuilder {
    constructor() {
      // Default configuration
      this.config = {
        autoHide: {
          mobile: false,
          desktop: false,
        },
        mobileBreakpoint: BREAKPOINTS.mobile,
        minSearchChars: 2,
        showTagsInResults: false,
        elementTriggering: {
          initialDelay: 300,
          maxRetries: 3,
          retryInterval: 300,
          maxRetryInterval: 1000,
          baseRetryInterval: 300,
        },

        // *** UPDATED: Enhanced display labels for group headers with 3D support
        displayLabels: {
          Panorama: "Panorama",
          Hotspot: "Hotspot",
          Polygon: "Polygon",
          Video: "Video",
          Webframe: "Webframe",
          Image: "Image",
          Text: "Text",
          ProjectedImage: "Projected Image",
          Element: "Element",
          Business: "Business",
          "3DHotspot": "3D Hotspot",
          "3DModel": "3D Model",
          Model3D: "3D Model",
          "3DModelObject": "3D Model Object",
        },

        // Business data integration
        businessData: {
          useBusinessData: false,
          businessDataFile: "business.json",
          businessDataDir: "business-data",
          matchField: "id",
          fallbackMatchField: "tags",
          replaceTourData: false,
          businessDataUrl: `${window.location.origin}${window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/"))}/search-pro-non-mod/business-data/business.json`,
        },

        // Google Sheets integration
        googleSheets: {
          useGoogleSheetData: false, // *** Controls whether to use Google Sheets data
          includeStandaloneEntries: true,
          googleSheetUrl:
            "https://docs.google.com/spreadsheets/d/e/2PACX-1vQrQ9oy4JjwYAdTG1DKne9cu76PZCrZgtIOCX56sxVoBwRzys36mTqvFMvTE2TB-f-k5yZz_uWwW5Ou/pub?output=csv",
          fetchMode: "csv",
          useAsDataSource: true,
          csvOptions: {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
          },
          caching: {
            enabled: false,
            timeoutMinutes: 60,
            storageKey: "tourGoogleSheetsData",
          },
          progressiveLoading: {
            enabled: false,
            initialFields: ["id", "tag", "name"],
            detailFields: [
              "description",
              "imageUrl",
              "elementType",
              "parentId",
            ],
          },
          authentication: {
            enabled: false,
            authType: "apiKey",
            apiKey: "",
            apiKeyParam: "key",
          },
        },

        // *** UPDATED: Enhanced thumbnail settings with 3D support
        thumbnailSettings: {
          enableThumbnails: false, // *** Controls whether to show thumbnails
          thumbnailSize: "medium",
          thumbnailSizePx: 48,
          borderRadius: 4,
          defaultImagePath: "./search-pro-non-mod/assets/default-thumbnail.jpg",

          defaultImages: {
            Panorama: "./search-pro-non-mod/assets/default-thumbnail.jpg",
            Hotspot: "./search-pro-non-mod/assets/hotspot-default.jpg",
            Polygon: "./search-pro-non-mod/assets/polygon-default.jpg",
            Video: "./search-pro-non-mod/assets/video-default.jpg",
            Webframe: "./search-pro-non-mod/assets/webframe-default.jpg",
            Image: "./search-pro-non-mod/assets/image-default.jpg",
            Text: "./search-pro-non-mod/assets/text-default.jpg",
            ProjectedImage:
              "./search-pro-non-mod/assets/projected-image-default.jpg",
            Element: "./search-pro-non-mod/assets/element-default.jpg",
            Business: "./search-pro-non-mod/assets/business-default.jpg",
            "3DModel": "./search-pro-non-mod/assets/3d-model-default.jpg", // *** NEW
            "3DHotspot": "./search-pro-non-mod/assets/3d-hotspot-default.jpg", // *** NEW
            default: "./search-pro-non-mod/assets/default-thumbnail.jpg",
          },
          alignment: "left",
          groupHeaderAlignment: "left",
          groupHeaderPosition: "top",

          showFor: {
            panorama: true,
            hotspot: true,
            polygon: true,
            video: true,
            webframe: true,
            image: true,
            text: true,
            projectedImage: true,
            element: true,
            business: true,
            "3dmodel": true, // *** NEW
            "3dhotspot": true, // *** NEW
            other: true,
          },
        },
      };
    }

    /* 
    ===================================
      FOR END USERS: DO NOT MODIFY SETTINGS BELOW THIS AREA
      INSTEAD, USE searchFunctions.updateConfig() TO CHANGE SETTINGS
      =================================== 
    */

    // [4.2.0.1] Set display options
    setDisplayOptions(options) {
      this.config.display = {
        showGroupHeaders:
          options?.showGroupHeaders !== undefined
            ? options.showGroupHeaders
            : true,
        showGroupCount:
          options?.showGroupCount !== undefined ? options.showGroupCount : true,
        showIconsInResults:
          options?.showIconsInResults !== undefined
            ? options.showIconsInResults
            : true,
        onlySubtitles:
          options?.onlySubtitles !== undefined ? options.onlySubtitles : false,
        showSubtitlesInResults:
          options?.showSubtitlesInResults !== undefined
            ? options.showSubtitlesInResults
            : true,
        showParentLabel:
          options?.showParentLabel !== undefined
            ? options.showParentLabel
            : true,
        showParentInfo:
          options?.showParentInfo !== undefined ? options.showParentInfo : true,
        showParentTags:
          options?.showParentTags !== undefined ? options.showParentTags : true,
        showParentType:
          options?.showParentType !== undefined ? options.showParentType : true,
      };
      return this;
    }

    // [4.2.0.2] Set content inclusion options
    setContentOptions(options) {
      this.config.includeContent = {
        unlabeledWithSubtitles:
          options?.unlabeledWithSubtitles !== undefined
            ? options.unlabeledWithSubtitles
            : true,
        unlabeledWithTags:
          options?.unlabeledWithTags !== undefined
            ? options.unlabeledWithTags
            : true,
        completelyBlank:
          options?.completelyBlank !== undefined
            ? options.completelyBlank
            : true,
        elements: {
          includeHotspots:
            options?.elements?.includeHotspots !== undefined
              ? options.elements.includeHotspots
              : true,
          includePolygons:
            options?.elements?.includePolygons !== undefined
              ? options.elements.includePolygons
              : true,
          includeVideos:
            options?.elements?.includeVideos !== undefined
              ? options.elements.includeVideos
              : true,
          includeWebframes:
            options?.elements?.includeWebframes !== undefined
              ? options.elements.includeWebframes
              : true,
          includeImages:
            options?.elements?.includeImages !== undefined
              ? options.elements.includeImages
              : true,
          includeText:
            options?.elements?.includeText !== undefined
              ? options.elements.includeText
              : true,
          includeProjectedImages:
            options?.elements?.includeProjectedImages !== undefined
              ? options.elements.includeProjectedImages
              : true,
          includeElements:
            options?.elements?.includeElements !== undefined
              ? options.elements.includeElements
              : true,
          include3DHotspots:
            options?.elements?.include3DHotspots !== undefined
              ? options.elements.include3DHotspots
              : true,
          include3DModels:
            options?.elements?.include3DModels !== undefined
              ? options.elements.include3DModels
              : true,
          include3DModelObjects:
            options?.elements?.include3DModelObjects !== undefined
              ? options.elements.include3DModelObjects
              : true,
          includeBusiness:
            options?.elements?.includeBusiness !== undefined
              ? options.elements.includeBusiness
              : true,
          skipEmptyLabels:
            options?.elements?.skipEmptyLabels !== undefined
              ? options.elements.skipEmptyLabels
              : false,
          minLabelLength:
            options?.elements?.minLabelLength !== undefined
              ? options.elements.minLabelLength
              : 0,
        },
      };
      return this;
    }

    // [4.2.0.3] Set filter options
    setFilterOptions(options) {
      this.config.filter = {
        mode: options?.mode || "none",
        allowedValues: options?.allowedValues || [],
        blacklistedValues: options?.blacklistedValues || [],
        allowedMediaIndexes: options?.allowedMediaIndexes || [],
        blacklistedMediaIndexes: options?.blacklistedMediaIndexes || [],
        elementTypes: {
          mode: options?.elementTypes?.mode || "none",
          allowedTypes: options?.elementTypes?.allowedTypes || [],
          blacklistedTypes: options?.elementTypes?.blacklistedTypes || [],
        },
        elementLabels: {
          mode: options?.elementLabels?.mode || "none",
          allowedValues: options?.elementLabels?.allowedValues || [],
          blacklistedValues: options?.elementLabels?.blacklistedValues || [],
        },
        tagFiltering: {
          mode: options?.tagFiltering?.mode || "none",
          allowedTags: options?.tagFiltering?.allowedTags || [],
          blacklistedTags: options?.tagFiltering?.blacklistedTags || [],
        },
      };
      return this;
    }

    // [4.2.0.4] Set label options
    setLabelOptions(options) {
      this.config.useAsLabel = {
        subtitles: options?.subtitles !== undefined ? options.subtitles : true,
        tags: options?.tags !== undefined ? options.tags : true,
        elementType:
          options?.elementType !== undefined ? options.elementType : true,
        parentWithType:
          options?.parentWithType !== undefined
            ? options.parentWithType
            : false,
        customText: options?.customText || "[Unnamed Item]",
      };
      return this;
    }

    // [4.2.0.5] Set appearance options
    setAppearanceOptions(options) {
      this.config.appearance = {
        searchField: {
          borderRadius: {
            topLeft: options?.searchField?.borderRadius?.topLeft || 35,
            topRight: options?.searchField?.borderRadius?.topRight || 35,
            bottomRight: options?.searchField?.borderRadius?.bottomRight || 35,
            bottomLeft: options?.searchField?.borderRadius?.bottomLeft || 35,
          },
        },
        searchResults: {
          borderRadius: {
            topLeft: options?.searchResults?.borderRadius?.topLeft || 5,
            topRight: options?.searchResults?.borderRadius?.topRight || 5,
            bottomRight: options?.searchResults?.borderRadius?.bottomRight || 5,
            bottomLeft: options?.searchResults?.borderRadius?.bottomLeft || 5,
          },
        },
        colors: {
          searchBackground: options?.colors?.searchBackground || "#f4f3f2",
          searchText: options?.colors?.searchText || "#1a1a1a",
          placeholderText: options?.colors?.placeholderText || "#94a3b8",
          searchIcon: options?.colors?.searchIcon || "#94a3b8",
          clearIcon: options?.colors?.clearIcon || "#94a3b8",
          resultsBackground: options?.colors?.resultsBackground || "#ffffff",
          groupHeaderColor: options?.colors?.groupHeaderColor || "#20293A",
          groupCountColor: options?.colors?.groupCountColor || "#94a3b8",
          resultHover: options?.colors?.resultHover || "#f0f0f0",
          resultBorderLeft: options?.colors?.resultBorderLeft || "#dd0e0e",
          resultText: options?.colors?.resultText || "#1e293b",
          resultSubtitle: options?.colors?.resultSubtitle || "#64748b",
          resultIconColor: options?.colors?.resultIconColor || "#6e85f7",
          resultSubtextColor: options?.colors?.resultSubtextColor || "#000000",
        },
      };
      return this;
    }

    // [4.2.0.6] Set search bar options
    setSearchBarOptions(options) {
      this.config.searchBar = {
        placeholder: options?.placeholder || "Search...",
        width: options?.width || 350,
        position: {
          top: options?.position?.top !== undefined ? options.position.top : 70,
          right:
            options?.position?.right !== undefined
              ? options.position.right
              : 70,
          left:
            options?.position?.left !== undefined
              ? options.position.left
              : null,
          bottom:
            options?.position?.bottom !== undefined
              ? options.position.bottom
              : null,
        },
        useResponsive:
          options?.useResponsive !== undefined ? options.useResponsive : true,
        mobilePosition: {
          top:
            options?.mobilePosition?.top !== undefined
              ? options.mobilePosition.top
              : 60,
          left:
            options?.mobilePosition?.left !== undefined
              ? options.mobilePosition.left
              : 20,
          right:
            options?.mobilePosition?.right !== undefined
              ? options.mobilePosition.right
              : 20,
          bottom:
            options?.mobilePosition?.bottom !== undefined
              ? options.mobilePosition.bottom
              : "auto",
        },
        mobileOverrides: {
          enabled:
            options?.mobileOverrides?.enabled !== undefined
              ? options.mobileOverrides.enabled
              : true,
          breakpoint:
            options?.mobileOverrides?.breakpoint !== undefined
              ? options.mobileOverrides.breakpoint
              : 768,
          width:
            options?.mobileOverrides?.width !== undefined
              ? options.mobileOverrides.width
              : "90%",
          maxWidth:
            options?.mobileOverrides?.maxWidth !== undefined
              ? options.mobileOverrides.maxWidth
              : 350,
          visibility: {
            behavior:
              options?.mobileOverrides?.visibility?.behavior || "dynamic", // 'dynamic', 'fixed', 'toggle'
            showOnScroll:
              options?.mobileOverrides?.visibility?.showOnScroll !== undefined
                ? options.mobileOverrides.visibility.showOnScroll
                : false,
            hideThreshold:
              options?.mobileOverrides?.visibility?.hideThreshold !== undefined
                ? options.mobileOverrides.visibility.hideThreshold
                : 100,
          },
          focusMode:
            options?.mobileOverrides?.focusMode !== undefined
              ? options.mobileOverrides.focusMode
              : false,
          fullScreenResults:
            options?.mobileOverrides?.fullScreenResults !== undefined
              ? options.mobileOverrides.fullScreenResults
              : false,
        },
      };
      return this;
    }

    // [4.2.0.7] Set general options
    setGeneralOptions(options) {
      if (options?.autoHide !== undefined) {
        this.config.autoHide = options.autoHide;
      }
      if (options?.mobileBreakpoint !== undefined) {
        this.config.mobileBreakpoint = options.mobileBreakpoint;
      }
      if (options?.minSearchChars !== undefined) {
        this.config.minSearchChars = options.minSearchChars;
      }
      if (options?.showTagsInResults !== undefined) {
        this.config.showTagsInResults = options.showTagsInResults;
      }
      if (options?.elementTriggering !== undefined) {
        this.config.elementTriggering = {
          ...this.config.elementTriggering,
          ...options.elementTriggering,
        };
      }
      return this;
    }

    // [4.2.0.8] Set custom display labels
    setDisplayLabels(options) {
      if (!options) return this;

      // Merge with defaults
      this.config.displayLabels = {
        ...this.config.displayLabels,
        ...options,
      };
      return this;
    }

    // [4.2.0.9] Set business data options
    setBusinessDataOptions(options) {
      if (!options) return this;

      this.config.businessData = {
        useBusinessData:
          options.useBusinessData !== undefined
            ? options.useBusinessData
            : true,
        businessDataFile: options.businessDataFile || "business.json",
        businessDataDir: options.businessDataDir || "business-data",
        matchField: options.matchField || "id",
        fallbackMatchField: options.fallbackMatchField || "tags",
        // Fix: Add replaceTourData with proper default
        replaceTourData:
          options.replaceTourData !== undefined
            ? options.replaceTourData
            : true,
      };
      return this;
    }

    // [4.2.0.10] Set thumbnail settings
    setThumbnailSettings(options) {
      if (!options) return this;

      // Resolve pixel size based on named size
      let sizePx = this.config.thumbnailSettings.thumbnailSizePx;
      if (options.thumbnailSize) {
        switch (options.thumbnailSize) {
          case "small":
            sizePx = 32;
            break;
          case "medium":
            sizePx = 48;
            break;
          case "large":
            sizePx = 64;
            break;
        }
      } else if (options.thumbnailSizePx) {
        sizePx = options.thumbnailSizePx;
      }

      this.config.thumbnailSettings = {
        enableThumbnails:
          options.enableThumbnails !== undefined
            ? options.enableThumbnails
            : true,
        thumbnailSize: options.thumbnailSize || "medium",
        thumbnailSizePx: sizePx,
        borderRadius:
          options.borderRadius !== undefined ? options.borderRadius : 4,
        defaultImagePath:
          options.defaultImagePath ||
          "./search-pro-non-mod/assets/default-thumbnail.jpg",

        defaultImages: options.defaultImages || {
          Panorama: "./search-pro-non-mod/assets/default-thumbnail.jpg",
          Hotspot: "./search-pro-non-mod/assets/hotspot-default.jpg",
          Polygon: "./search-pro-non-mod/assets/polygon-default.jpg",
          Video: "./search-pro-non-mod/assets/video-default.jpg",
          Webframe: "./search-pro-non-mod/assets/webframe-default.jpg",
          Image: "./search-pro-non-mod/assets/image-default.jpg",
          Text: "./search-pro-non-mod/assets/text-default.jpg",
          ProjectedImage:
            "./search-pro-non-mod/assets/projected-image-default.jpg",
          Element: "./search-pro-non-mod/assets/element-default.jpg",
          Business: "./search-pro-non-mod/assets/business-default.jpg",
          "3DModel": "./search-pro-non-mod/assets/3d-model-default.jpg",
          "3DHotspot": "./search-pro-non-mod/assets/3d-hotspot-default.jpg",
          default: "./search-pro-non-mod/assets/default-thumbnail.jpg",
        },
        alignment: options.alignment === "right" ? "right" : "left",
        groupHeaderAlignment: ["left", "right", "center"].includes(
          options.groupHeaderAlignment,
        )
          ? options.groupHeaderAlignment
          : "left",
        groupHeaderPosition:
          options.groupHeaderPosition === "bottom" ? "bottom" : "top",

        showFor: {
          panorama:
            options.showFor?.panorama !== undefined
              ? options.showFor.panorama
              : true,
          hotspot:
            options.showFor?.hotspot !== undefined
              ? options.showFor.hotspot
              : true,
          polygon:
            options.showFor?.polygon !== undefined
              ? options.showFor.polygon
              : true,
          video:
            options.showFor?.video !== undefined ? options.showFor.video : true,
          webframe:
            options.showFor?.webframe !== undefined
              ? options.showFor.webframe
              : true,
          image:
            options.showFor?.image !== undefined ? options.showFor.image : true,
          text:
            options.showFor?.text !== undefined ? options.showFor.text : true,
          projectedImage:
            options.showFor?.projectedImage !== undefined
              ? options.showFor.projectedImage
              : true,
          element:
            options.showFor?.element !== undefined
              ? options.showFor.element
              : true,
          business:
            options.showFor?.business !== undefined
              ? options.showFor.business
              : true,
          "3dmodel":
            options.showFor?.["3dmodel"] !== undefined
              ? options.showFor["3dmodel"]
              : true,
          "3dhotspot":
            options.showFor?.["3dhotspot"] !== undefined
              ? options.showFor["3dhotspot"]
              : true,
          other:
            options.showFor?.other !== undefined ? options.showFor.other : true,
        },
      };
      return this;
    }

    // [4.2.0.11] Set Google Sheets integration options
    setGoogleSheetsOptions(options) {
      if (!options) return this;

      this.config.googleSheets = {
        useGoogleSheetData:
          options.useGoogleSheetData !== undefined
            ? options.useGoogleSheetData
            : false,
        googleSheetUrl: options.googleSheetUrl || "",
        fetchMode: options.fetchMode || "csv", // 'csv' or 'json'
        useAsDataSource:
          options.useAsDataSource !== undefined
            ? options.useAsDataSource
            : false,
        csvOptions: {
          header:
            options.csvOptions?.header !== undefined
              ? options.csvOptions.header
              : true,
          skipEmptyLines:
            options.csvOptions?.skipEmptyLines !== undefined
              ? options.csvOptions.skipEmptyLines
              : true,
          dynamicTyping:
            options.csvOptions?.dynamicTyping !== undefined
              ? options.csvOptions.dynamicTyping
              : true,
          ...options.csvOptions,
        },
        // Caching options
        caching: {
          enabled:
            options.caching?.enabled !== undefined
              ? options.caching.enabled
              : true,
          timeoutMinutes: options.caching?.timeoutMinutes || 60,
          storageKey: options.caching?.storageKey || "tourGoogleSheetsData",
        },
        // Progressive loading options
        progressiveLoading: {
          enabled:
            options.progressiveLoading?.enabled !== undefined
              ? options.progressiveLoading.enabled
              : false,
          initialFields: options.progressiveLoading?.initialFields || [
            "id",
            "tag",
            "name",
          ],
          detailFields: options.progressiveLoading?.detailFields || [
            "description",
            "imageUrl",
            "elementType",
            "parentId",
          ],
        },
        // Authentication options
        authentication: {
          enabled:
            options.authentication?.enabled !== undefined
              ? options.authentication.enabled
              : false,
          authType: options.authentication?.authType || "apiKey",
          apiKey: options.authentication?.apiKey || "",
          apiKeyParam: options.authentication?.apiKeyParam || "key",
        },
      };
      return this;
    }

    // [4.2.0.12] Build method to return completed config
    build() {
      return this.config;
    }
  }

  // [4.2.1] Create default configuration
  let _config = new ConfigBuilder()
    .setDisplayOptions({})
    .setContentOptions({})
    .setFilterOptions({})
    .setLabelOptions({})
    .setAppearanceOptions({})
    .setSearchBarOptions({})
    .setBusinessDataOptions({}) // Initialize with default business data settings
    .setGoogleSheetsOptions({}) // Initialize with default Google Sheets settings
    .setDisplayLabels({}) // Initialize with default display labels
    .build();

  // [4.3] LOGGING UTILITIES
  const Logger = {
    // Set this to control logging level: 0=debug, 1=info, 2=warn, 3=error, 4=none
    level: 2,

    debug: function (message, ...args) {
      if (this.level <= 0) console.debug(`[Search] ${message}`, ...args);
    },

    info: function (message, ...args) {
      if (this.level <= 1) console.info(`[Search] ${message}`, ...args);
    },

    warn: function (message, ...args) {
      if (this.level <= 2) console.warn(`[Search] ${message}`, ...args);
    },

    error: function (message, ...args) {
      if (this.level <= 3) console.error(`[Search] ${message}`, ...args);
    },
  };

  // [4.4] MODULE STATE VARIABLES
  let _initialized = false;
  let keyboardCleanup = null;
  let _businessData = [];
  let _googleSheetsData = [];

  // [4.5] DOM ELEMENT CACHE
  const _elements = {
    container: null,
    input: null,
    results: null,
    clearButton: null,
    searchIcon: null,
  };

  // [4.6] CROSS-WINDOW COMMUNICATION
  _crossWindowChannel = {
    // Channel instance
    _channel: null,

    // Channel name
    channelName: "tourSearchChannel",

    // [4.6.1] Initialize channel
    init() {
      try {
        if (typeof BroadcastChannel !== "undefined") {
          this._channel = new BroadcastChannel(this.channelName);
          Logger.info(
            "BroadcastChannel initialized for cross-window communication",
          );
          return true;
        } else {
          Logger.warn("BroadcastChannel API not available");
          return false;
        }
      } catch (error) {
        Logger.warn("Failed to initialize BroadcastChannel:", error);
        return false;
      }
    },

    // [4.6.2] Send message to other windows
    send(type, data) {
      try {
        if (!this._channel) {
          if (!this.init()) return false;
        }

        this._channel.postMessage({ type, data, timestamp: Date.now() });
        return true;
      } catch (error) {
        Logger.warn("Error sending message through BroadcastChannel:", error);
        return false;
      }
    },

    // [4.6.3] Listen for messages
    listen(callback) {
      try {
        if (!this._channel) {
          if (!this.init()) return false;
        }

        this._channel.onmessage = (event) => {
          if (event && event.data && typeof callback === "function") {
            callback(event.data);
          }
        };
        return true;
      } catch (error) {
        Logger.warn("Error setting up BroadcastChannel listener:", error);
        return false;
      }
    },

    // [4.6.4] Close channel
    close() {
      try {
        if (this._channel) {
          this._channel.close();
          this._channel = null;
          return true;
        }
        return false;
      } catch (error) {
        Logger.warn("Error closing BroadcastChannel:", error);
        return false;
      }
    },
  };

  // [4.7] UTILITY FUNCTIONS
  // [4.7.1] Debounce function for performance optimization
  function _debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };

      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Normalizes image paths to ensure they're correctly resolved
   * @param {string} path - The image path to normalize
   * @param {boolean} [tryAlternateFormats=true] - Whether to try alternate formats
   * @returns {string} - The normalized image path
   */
  function _normalizeImagePath(path, tryAlternateFormats = true) {
    if (!path) return "";

    // If it's already an absolute URL, return as is
    if (path.startsWith("http") || path.startsWith("//")) {
      return path;
    }

    // Handle relative paths - ensure they're based on the right root
    const baseUrl =
      window.location.origin +
      window.location.pathname.substring(
        0,
        window.location.pathname.lastIndexOf("/"),
      );

    // Clean the path - remove leading slash and relative path indicators
    let cleanPath = path;
    if (cleanPath.startsWith("./")) {
      cleanPath = cleanPath.substring(2);
    } else if (cleanPath.startsWith("/")) {
      cleanPath = cleanPath.substring(1);
    }

    return `${baseUrl}/${cleanPath}`;
  }

  // [4.7.2] Preprocess and normalize search terms
  function _preprocessSearchTerm(term) {
    if (!term) return "";

    // Handle special character search
    if (/[0-9\-_]/.test(term)) {
      return `'${term}`;
    }

    return term;
  }

  // [4.7.3] ARIA and Accessibility Helpers
  const _aria = {
    /**
     * Sets the aria-autocomplete attribute on an element
     * @param {HTMLElement} element - The target element
     * @param {string} value - The value to set (e.g., 'list', 'inline', 'both')
     * @returns {HTMLElement} The element for chaining
     */
    setAutoComplete: function (element, value) {
      if (element && element.setAttribute) {
        element.setAttribute("aria-autocomplete", value);
      }
      return element;
    },
    /**
     * Sets the ARIA role attribute on an element
     * @param {HTMLElement} element - The target element
     * @param {string} role - The ARIA role to set
     * @returns {HTMLElement} The element for chaining
     */
    setRole: (element, role) => {
      if (element && role) {
        element.setAttribute("role", role);
      }
      return element;
    },

    /**
     * Sets the ARIA label on an element
     * @param {HTMLElement} element - The target element
     * @param {string} label - The label text to set
     * @returns {HTMLElement} The element for chaining
     */
    setLabel: (element, label) => {
      if (element && label) {
        element.setAttribute("aria-label", label);
      }
      return element;
    },

    /**
     * Sets the expanded state of an element
     * @param {HTMLElement} element - The target element
     * @param {boolean} isExpanded - Whether the element is expanded
     * @returns {HTMLElement} The element for chaining
     */
    setExpanded: (element, isExpanded) => {
      if (element) {
        element.setAttribute("aria-expanded", String(!!isExpanded));
      }
      return element;
    },

    /**
     * Sets the selected state of an element
     * @param {HTMLElement} element - The target element
     * @param {boolean} isSelected - Whether the element is selected
     * @returns {HTMLElement} The element for chaining
     */
    setSelected: (element, isSelected) => {
      if (element) {
        element.setAttribute("aria-selected", String(!!isSelected));
      }
      return element;
    },

    /**
     * Sets the hidden state of an element
     * @param {HTMLElement} element - The target element
     * @param {boolean} isHidden - Whether the element is hidden
     * @returns {HTMLElement} The element for chaining
     */
    setHidden: (element, isHidden) => {
      if (element) {
        element.setAttribute("aria-hidden", String(!!isHidden));
      }
      return element;
    },

    /**
     * Sets the current state of an element (e.g., 'page' for pagination)
     * @param {HTMLElement} element - The target element
     * @param {string} current - The current state value
     * @returns {HTMLElement} The element for chaining
     */
    setCurrent: (element, current) => {
      if (element && current) {
        element.setAttribute("aria-current", current);
      }
      return element;
    },
  };

  // [4.8] ELEMENT DETECTION AND FILTERING
  function _getElementType(overlay, label) {
    if (!overlay) return "Element";
    try {
      // Enhanced lookup map for overlay classes with 3D support
      const classNameMap = {
        FramePanoramaOverlay: "Webframe",
        QuadVideoPanoramaOverlay: "Video",
        ImagePanoramaOverlay: "Image",
        TextPanoramaOverlay: "Text",
        HotspotPanoramaOverlay: "Hotspot",
        Model3DObject: "3DModel",
        SpriteModel3DObject: "3DHotspot", // Default for 3D sprites
        SpriteHotspotObject: "3DHotspot",
        Sprite3DObject: "3DHotspot",
      };

      // Enhanced lookup map for label patterns
      const labelPatternMap = [
        { pattern: "web", type: "Webframe" },
        { pattern: "video", type: "Video" },
        { pattern: "image", type: "Image" },
        { pattern: "text", type: "Text" },
        { pattern: "polygon", type: "Polygon" },
        { pattern: "goto", type: "Hotspot" },
        { pattern: "info", type: "Hotspot" },
        { pattern: "3d-model", type: "3DModel" },
        { pattern: "model3d", type: "3DModel" },
        { pattern: "3d-hotspot", type: "3DHotspot" },
        { pattern: "sprite", type: "3DHotspot" },
      ];

      // [4.8.1.1] Direct class mapping with enhanced 3D detection
      if (overlay.class && classNameMap[overlay.class]) {
        // Special handling for HotspotPanoramaOverlay
        if (overlay.class === "HotspotPanoramaOverlay") {
          if (overlay.data) {
            if (overlay.data.hasPanoramaAction) return "Hotspot";
            if (overlay.data.hasText) return "Text";
            if (overlay.data.isPolygon) return "Polygon";
          }
          const overlayLabel = (overlay.label || label || "").toLowerCase();
          if (overlayLabel.includes("polygon")) return "Polygon";
          if (overlayLabel === "image") return "Image";
          if (overlayLabel.includes("info-")) return "Hotspot";
          return "Hotspot";
        }

        // Special handling for SpriteModel3DObject - distinguish between regular hotspot and 3D hotspot
        if (overlay.class === "SpriteModel3DObject") {
          const overlayLabel = (overlay.label || label || "").toLowerCase();
          // Check if it's in a 3D context or has 3D-specific labels
          if (
            overlayLabel.includes("3d") ||
            overlayLabel.includes("model") ||
            overlayLabel.includes("sprite")
          ) {
            return "3DHotspot";
          }
          // If it's more like a traditional hotspot, treat it as such
          if (
            overlayLabel.includes("goto") ||
            overlayLabel.includes("info") ||
            overlayLabel.includes("hotspot")
          ) {
            return "Hotspot";
          }
          // Default to 3DHotspot for SpriteModel3DObject
          return "3DHotspot";
        }

        return classNameMap[overlay.class];
      }

      // [4.8.1.2] Try overlay.get('class') if available
      if (typeof overlay.get === "function") {
        try {
          const className = overlay.get("class");
          if (classNameMap[className]) {
            // Apply the same special handling as above
            if (className === "HotspotPanoramaOverlay") {
              const data = overlay.get("data") || {};
              if (data.hasPanoramaAction) return "Hotspot";
              if (data.hasText) return "Text";
              if (data.isPolygon) return "Polygon";
              const overlayLabel = (overlay.label || label || "").toLowerCase();
              if (overlayLabel.includes("polygon")) return "Polygon";
              if (overlayLabel === "image") return "Image";
              if (overlayLabel.includes("info-")) return "Hotspot";
              return "Hotspot";
            }

            if (className === "SpriteModel3DObject") {
              const overlayLabel = (overlay.label || label || "").toLowerCase();
              if (
                overlayLabel.includes("3d") ||
                overlayLabel.includes("model") ||
                overlayLabel.includes("sprite")
              ) {
                return "3DHotspot";
              }
              if (
                overlayLabel.includes("goto") ||
                overlayLabel.includes("info") ||
                overlayLabel.includes("hotspot")
              ) {
                return "Hotspot";
              }
              return "3DHotspot";
            }

            return classNameMap[className];
          }
        } catch (e) {
          Logger.debug("Error getting class via get method:", e);
        }
      }

      // [4.8.1.3] Enhanced property-based detection
      const propertyChecks = [
        { props: ["url", "data.url"], type: "Webframe" },
        { props: ["video", "data.video"], type: "Video" },
        {
          props: ["vertices", "polygon", "data.vertices", "data.polygon"],
          type: "Polygon",
        },
        { props: ["model3d", "data.model3d"], type: "3DModel" },
        { props: ["sprite3d", "data.sprite3d"], type: "3DHotspot" },
      ];

      for (const check of propertyChecks) {
        for (const prop of check.props) {
          if (prop.includes(".")) {
            const [parent, child] = prop.split(".");
            if (overlay[parent] && overlay[parent][child]) {
              return check.type;
            }
          } else if (overlay[prop]) {
            return check.type;
          }
        }
      }

      // [4.8.1.4] Enhanced label pattern mapping
      const overlayLabel = (overlay.label || label || "").toLowerCase();
      if (overlayLabel) {
        for (const { pattern, type } of labelPatternMap) {
          if (overlayLabel === pattern || overlayLabel.includes(pattern)) {
            return type;
          }
        }
      }

      // Default
      return "Element";
    } catch (error) {
      Logger.warn("Error in element type detection:", error);
      return "Element";
    }
  }

  // [4.8.2] Element filtering based on type and properties
  function _shouldIncludeElement(elementType, label, tags) {
    try {
      // [4.8.2.1] Skip empty labels if configured
      if (!label && _config.includeContent.elements.skipEmptyLabels) {
        return false;
      }

      // [4.8.2.2] Check minimum label length
      if (
        label &&
        _config.includeContent.elements.minLabelLength > 0 &&
        label.length < _config.includeContent.elements.minLabelLength
      ) {
        return false;
      }

      // [4.8.2.3] Apply element type filtering
      const typeFilterMode = _config.filter.elementTypes?.mode;
      if (
        typeFilterMode === "whitelist" &&
        Array.isArray(_config.filter.elementTypes?.allowedTypes) &&
        _config.filter.elementTypes.allowedTypes.length > 0
      ) {
        if (!_config.filter.elementTypes.allowedTypes.includes(elementType)) {
          return false;
        }
      } else if (
        typeFilterMode === "blacklist" &&
        Array.isArray(_config.filter.elementTypes?.blacklistedTypes) &&
        _config.filter.elementTypes.blacklistedTypes.length > 0
      ) {
        if (
          _config.filter.elementTypes.blacklistedTypes.includes(elementType)
        ) {
          return false;
        }
      }

      // [4.8.2.4] Apply label filtering
      const labelFilterMode = _config.filter.elementLabels?.mode;
      if (
        label &&
        labelFilterMode === "whitelist" &&
        Array.isArray(_config.filter.elementLabels?.allowedValues) &&
        _config.filter.elementLabels.allowedValues.length > 0
      ) {
        if (
          !_config.filter.elementLabels.allowedValues.some((value) =>
            label.includes(value),
          )
        ) {
          return false;
        }
      } else if (
        label &&
        labelFilterMode === "blacklist" &&
        Array.isArray(_config.filter.elementLabels?.blacklistedValues) &&
        _config.filter.elementLabels.blacklistedValues.length > 0
      ) {
        if (
          _config.filter.elementLabels.blacklistedValues.some((value) =>
            label.includes(value),
          )
        ) {
          return false;
        }
      }

      // [4.8.2.5] Apply tag filtering
      const tagFilterMode = _config.filter.tagFiltering?.mode;
      if (Array.isArray(tags) && tags.length > 0) {
        if (
          tagFilterMode === "whitelist" &&
          Array.isArray(_config.filter.tagFiltering?.allowedTags) &&
          _config.filter.tagFiltering.allowedTags.length > 0
        ) {
          if (
            !tags.some((tag) =>
              _config.filter.tagFiltering.allowedTags.includes(tag),
            )
          ) {
            return false;
          }
        } else if (
          tagFilterMode === "blacklist" &&
          Array.isArray(_config.filter.tagFiltering?.blacklistedTags) &&
          _config.filter.tagFiltering.blacklistedTags.length > 0
        ) {
          if (
            tags.some((tag) =>
              _config.filter.tagFiltering.blacklistedTags.includes(tag),
            )
          ) {
            return false;
          }
        }
      } else if (
        tagFilterMode === "whitelist" &&
        Array.isArray(_config.filter.tagFiltering?.allowedTags) &&
        _config.filter.tagFiltering.allowedTags.length > 0
      ) {
        return false;
      }

      // [4.8.2.6] Enhanced element type checking against configuration
      const elementTypeMap = {
        Hotspot: "includeHotspots",
        Polygon: "includePolygons",
        Video: "includeVideos",
        Webframe: "includeWebframes",
        Image: "includeImages",
        Text: "includeText",
        ProjectedImage: "includeProjectedImages",
        Element: "includeElements",
        "3DHotspot": "include3DHotspots",
        "3DModel": "include3DModels",
        "3DModelObject": "include3DModelObjects",
        Business: "includeBusiness",
      };

      const configKey = elementTypeMap[elementType];
      if (configKey) {
        return _config.includeContent.elements[configKey] !== false;
      }

      // Try pluralized version for custom types
      const pluralizedKey = `include${elementType}s`;
      if (_config.includeContent.elements[pluralizedKey] !== undefined) {
        return _config.includeContent.elements[pluralizedKey];
      }

      // Default to include if not specifically configured
      return true;
    } catch (error) {
      Logger.warn("Error in element filtering:", error);
      return false;
    }
  }

  // [4.9] ELEMENT INTERACTION
  function _triggerElement(tour, elementId, callback, options = {}) {
    if (!tour || !elementId) {
      Logger.warn("Invalid tour or elementId for trigger");
      if (callback) callback(false);
      return;
    }

    // Merge with default config
    const config = {
      ..._config.elementTriggering,
      ...options,
    };

    let retryCount = 0;

    // Use exponential backoff for retries
    const getBackoffTime = (attempt) => {
      const baseTime = config.baseRetryInterval;
      const exponentialTime = baseTime * Math.pow(1.5, attempt);
      return Math.min(exponentialTime, config.maxRetryInterval);
    };

    const attemptTrigger = () => {
      try {
        if (!tour || !tour.player) {
          Logger.warn("Tour or player not available");
          if (callback) callback(false);
          return;
        }

        // Find element using multiple strategies
        const element = findElementById(tour, elementId);

        if (element) {
          Logger.info(`Element found: ${elementId}`);

          // Try multiple trigger methods in sequence
          const triggerMethods = [
            { name: "trigger", fn: (el) => el.trigger("click") },
            { name: "click", fn: (el) => el.click() },
            { name: "onClick", fn: (el) => el.onClick() },
          ];

          for (const method of triggerMethods) {
            try {
              if (
                typeof element[method.name] === "function" ||
                (method.name === "onClick" && element.onClick)
              ) {
                method.fn(element);
                Logger.info(
                  `Element triggered successfully using ${method.name}`,
                );
                if (callback) callback(true);
                return;
              }
            } catch (e) {
              Logger.debug(`Error with ${method.name} method:`, e);
            }
          }

          // All trigger methods failed
          Logger.warn("All trigger methods failed for element:", elementId);
        }

        // Element not found or trigger failed, retry if possible
        retryCount++;
        if (retryCount < config.maxRetries) {
          const backoffTime = getBackoffTime(retryCount);
          Logger.debug(
            `Element trigger attempt ${retryCount} failed, retrying in ${backoffTime}ms...`,
          );
          setTimeout(attemptTrigger, backoffTime);
        } else {
          Logger.warn(
            `Failed to trigger element ${elementId} after ${config.maxRetries} attempts`,
          );
          if (callback) callback(false);
        }
      } catch (error) {
        Logger.warn(`Error in triggerElement: ${error.message}`);
        if (callback) callback(false);
      }
    };

    // [4.9.0.1] Helper to find element by ID using multiple methods
    function findElementById(tour, id) {
      let element = null;

      // Method 1: Direct getById
      try {
        element = tour.player.getById(id);
        if (element) return element;
      } catch (e) {
        Logger.debug("getById method failed:", e);
      }

      // Method 2: get method
      try {
        element = tour.get(id) || tour.player.get(id);
        if (element) return element;
      } catch (e) {
        Logger.debug("get method failed:", e);
      }

      // Method 3: getAllIDs and find
      try {
        if (typeof tour.player.getAllIDs === "function") {
          const allIds = tour.player.getAllIDs();
          if (allIds.includes(id)) {
            return tour.player.getById(id);
          }
        }
      } catch (e) {
        Logger.debug("getAllIDs method failed:", e);
      }

      return null;
    }

    // Start first attempt after initial delay
    setTimeout(attemptTrigger, config.initialDelay);
  }
  /**
   * Enhanced element trigger function that can handle standalone Google Sheets entries
   * @param {Object} searchResult - The search result item that was clicked
   */

  // [4.9.1] Enhanced element trigger function
  function _triggerStandaloneElement(searchResult, tour) {
    // [4.9.1.1] If it's a regular tour item, use the standard trigger
    if (searchResult.item) {
      if (typeof searchResult.item.trigger === "function") {
        searchResult.item.trigger("click");
        return true;
      } else {
        _triggerElement(tour, searchResult.id);
        return true;
      }
    }

    // [4.9.1.2] For standalone Google Sheets entries, try to find a matching tour element
    if (searchResult.sheetsData) {
      const entryId = searchResult.id || searchResult.sheetsData.id;
      const entryTag = searchResult.sheetsData.tag;
      const entryName = searchResult.sheetsData.name;

      Logger.info(
        `Looking for matching tour element for standalone entry: ${entryName || entryId || entryTag}`,
      );

      // Try to find matching tour element by ID, tag or other relationships
      let foundElement = false;

      // [4.9.1.2.1] Method 1: Try to find by ID
      if (entryId) {
        try {
          const element = tour.player.getById(entryId);
          if (element) {
            Logger.info(`Found element by ID: ${entryId}`);
            _triggerElement(tour, entryId);
            return true;
          }
        } catch (e) {
          Logger.debug(`No element found with ID: ${entryId}`);
        }
      }

      // [4.9.1.2.2] Method 2: Try to find by tag matching - this is critical for Google Sheets integration
      if (entryTag) {
        try {
          // First check if tag exists as an ID (common for hotspots)
          const tagElement = tour.player.getById(entryTag);
          if (tagElement) {
            Logger.info(`Found element by tag as ID: ${entryTag}`);
            _triggerElement(tour, entryTag);
            return true;
          }

          // Then look through all items
          const allItems = tour.mainPlayList.get("items");
          if (allItems && allItems.length) {
            for (let i = 0; i < allItems.length; i++) {
              const item = allItems[i];
              // Check media
              if (item.get) {
                const media = item.get("media");
                if (media && media.get && media.get("id") === entryTag) {
                  Logger.info(`Found panorama with media ID: ${entryTag}`);
                  item.trigger("click");
                  return true;
                }

                // Check for matching tag in data.tags array
                const data = media && media.get ? media.get("data") : null;
                if (
                  data &&
                  Array.isArray(data.tags) &&
                  data.tags.includes(entryTag)
                ) {
                  Logger.info(`Found panorama with matching tag: ${entryTag}`);
                  item.trigger("click");
                  return true;
                }
              }
            }
          }
        } catch (e) {
          Logger.debug(`Error searching for element by tag: ${e.message}`);
        }
      }

      // [4.9.1.2.3] Method 3: Try matching by name
      if (entryName) {
        try {
          // Look through all panoramas and try to find a matching name
          const allItems = tour.mainPlayList.get("items");
          if (allItems && allItems.length) {
            for (let i = 0; i < allItems.length; i++) {
              const item = allItems[i];
              if (item.get) {
                const media = item.get("media");
                if (media && media.get) {
                  const data = media.get("data");
                  if (data && data.label && data.label.includes(entryName)) {
                    Logger.info(
                      `Found panorama with matching name: ${entryName}`,
                    );
                    item.trigger("click");
                    return true;
                  }
                }
              }
            }
          }
        } catch (e) {
          Logger.debug(`Error searching for element by name: ${e.message}`);
        }
      }

      // [4.9.1.2.4] Failed to find a matching element
      Logger.warn(
        `Could not find a matching tour element for: ${entryName || entryId || entryTag}`,
      );
      return false;
    }

    return false;
  }
  // [4.9.2] Enhanced Trigger element interaction based on item type
  function _triggerElementRetry(item, tour) {
    try {
      const type = item.type || (item.get ? item.get("type") : undefined);
      const id = item.id || (item.get ? item.get("id") : undefined);

      // [4.9.2.1] Try to get the correct tour reference based on your structure
      let actualTour = tour;
      if (!actualTour || (!actualTour.mainPlayList && !actualTour.player)) {
        // Try different possible tour references
        actualTour =
          window.tour ||
          window.tourInstance ||
          window.player ||
          (window.TDV &&
          window.TDV.PlayerAPI &&
          typeof window.TDV.PlayerAPI.getCurrentPlayer === "function"
            ? window.TDV.PlayerAPI.getCurrentPlayer()
            : null) ||
          item.tour;

        if (!actualTour) {
          Logger.warn("[Search] No valid tour reference found");
          return;
        }
      }

      // [4.9.2.2] Get playlist from the right location
      let playlist = null;
      if (
        actualTour.locManager &&
        actualTour.locManager.rootPlayer &&
        actualTour.locManager.rootPlayer.mainPlayList
      ) {
        playlist = actualTour.locManager.rootPlayer.mainPlayList;
        Logger.debug(
          "Using correct playlist from locManager.rootPlayer.mainPlayList",
        );
      } else if (actualTour.mainPlayList) {
        playlist = actualTour.mainPlayList;
        Logger.debug("Using fallback playlist from tour.mainPlayList");
      } else if (actualTour.player && actualTour.player.mainPlayList) {
        playlist = actualTour.player.mainPlayList;
        Logger.debug("Using fallback playlist from tour.player.mainPlayList");
      } else if (
        actualTour.player &&
        typeof actualTour.player.get === "function"
      ) {
        try {
          playlist = actualTour.player.get("mainPlayList");
          Logger.debug(
            "Using fallback playlist from tour.player.get('mainPlayList')",
          );
        } catch (e) {
          Logger.debug("Could not get mainPlayList from player:", e);
        }
      }

      if (type === "3DModel") {
        Logger.info("Triggering 3DModel interaction for ID: " + id);

        // Method 1: Try direct playlist navigation
        if (
          typeof item.index === "number" &&
          playlist &&
          typeof playlist.set === "function"
        ) {
          Logger.info("Navigating to 3D model at playlist index " + item.index);
          playlist.set("selectedIndex", item.index);
          return;
        }

        // Method 2: Try to get the media and trigger it directly
        const media =
          item.item || item.media || (item.get ? item.get("media") : undefined);
        if (media && typeof media.trigger === "function") {
          Logger.info("Direct triggering 3D model media");
          media.trigger("click");
          return;
        }

        // Method 3: Try to find and trigger by ID using enhanced player detection
        if (id) {
          const players = [
            actualTour.locManager && actualTour.locManager.rootPlayer
              ? actualTour.locManager.rootPlayer
              : null,
            actualTour.player,
            actualTour,
            window.player,
            window.TDV &&
            window.TDV.PlayerAPI &&
            typeof window.TDV.PlayerAPI.getCurrentPlayer === "function"
              ? window.TDV.PlayerAPI.getCurrentPlayer()
              : null,
          ].filter(Boolean);

          for (const player of players) {
            try {
              if (typeof player.getById === "function") {
                const element = player.getById(id);
                if (element && typeof element.trigger === "function") {
                  Logger.info(
                    "Triggering 3D model element by ID: " +
                      id +
                      " using player",
                  );
                  element.trigger("click");
                  return;
                }
              }
            } catch (e) {
              Logger.debug("Player getById failed: " + e.message);
            }
          }
        }

        // [4.9.2.3] Try playlist item trigger
        if (item.item && typeof item.item.trigger === "function") {
          Logger.info("Triggering playlist item for 3D model");
          item.item.trigger("click");
          return;
        }

        Logger.warn("Could not trigger 3D model with ID: " + id);
        return;
      }

      if (type === "3DModelObject") {
        Logger.info("Triggering 3D Model Object interaction for ID: " + id);

        // [4.9.2.4] First navigate to parent model
        if (
          item.parentIndex !== undefined &&
          playlist &&
          typeof playlist.set === "function"
        ) {
          playlist.set("selectedIndex", item.parentIndex);
          Logger.info("Navigated to parent model at index " + item.parentIndex);

          // Then try to activate the specific object after a delay
          setTimeout(function () {
            try {
              if (
                id &&
                actualTour.player &&
                typeof actualTour.player.getById === "function"
              ) {
                const object = actualTour.player.getById(id);
                if (object && typeof object.trigger === "function") {
                  object.trigger("click");
                  Logger.info("Activated 3D model object: " + id);
                } else {
                  Logger.warn(
                    "3D model object not found or not clickable: " + id,
                  );
                }
              }
            } catch (e) {
              Logger.warn("Error activating 3D model object: " + e.message);
            }
          }, 500); // Increased delay for 3D model loading
          return;
        }
      }

      // [4.9.2.5] Default behavior for panoramas and other types
      Logger.info(
        "Triggering element interaction for type: " + type + ", ID: " + id,
      );

      // [4.9.2.5.1] Default panorama navigation
      if (typeof item.index === "number") {
        if (playlist && typeof playlist.set === "function") {
          playlist.set("selectedIndex", item.index);
          Logger.info("Navigated to item at index " + item.index);
          return;
        }
      }

      // [4.9.2.5.2] Handle child elements like hotspots
      if (item.parentIndex !== undefined) {
        if (playlist && typeof playlist.set === "function") {
          playlist.set("selectedIndex", item.parentIndex);
          Logger.info("Navigated to parent item at index " + item.parentIndex);

          // Then try to trigger the element
          if (id) {
            setTimeout(function () {
              attemptTrigger(id, actualTour);
            }, 300);
          }
          return;
        }
      }

      // [4.9.2.5.3] Direct element triggering as fallback
      if (id) {
        attemptTrigger(id, actualTour);
      } else {
        Logger.warn(
          "Could not trigger element of type " + type + " - no ID available",
        );
      }
    } catch (error) {
      Logger.error("Error triggering element interaction:", error);
    }
  }

  // [4.9.3] Helper function for attempting to trigger elements
  function attemptTrigger(id, tour) {
    try {
      // [4.9.3.1] Try multiple tour references
      const tourRefs = [
        tour,
        window.tourInstance,
        window.tour,
        window.player,
        window.TDV &&
        window.TDV.PlayerAPI &&
        typeof window.TDV.PlayerAPI.getCurrentPlayer === "function"
          ? window.TDV.PlayerAPI.getCurrentPlayer()
          : null,
      ].filter(Boolean);

      for (const tourRef of tourRefs) {
        if (
          tourRef &&
          tourRef.player &&
          typeof tourRef.player.getById === "function"
        ) {
          try {
            const element = tourRef.player.getById(id);
            if (element && typeof element.trigger === "function") {
              element.trigger("click");
              Logger.info("Successfully triggered element: " + id);
              return true;
            }
          } catch (e) {
            continue; // Try next tour reference
          }
        }
      }

      Logger.warn("[Search] Tour or player not available");
      Logger.warn("[Search] Failed to trigger element " + id);
      return false;
    } catch (error) {
      Logger.warn("Error in attemptTrigger: " + error.message);
      return false;
    }
  }

  // [4.10] UI MANAGEMENT
  // [4.10.1] Search styling application
  function _applySearchStyling() {
    // First check if container exists
    const searchContainer = document.getElementById("searchContainer");

    if (!searchContainer) {
      Logger.warn("Search container not found, will attempt to create it");

      // Try to create the container
      try {
        // Find the viewer element
        const viewer = document.getElementById("viewer");
        if (!viewer) {
          Logger.error(
            "Cannot create search container: #viewer element not found",
          );
          return;
        }

        // Create container from markup
        const temp = document.createElement("div");
        temp.innerHTML = SEARCH_MARKUP.trim();
        viewer.appendChild(temp.firstChild);

        Logger.info("Search container created successfully");

        // Update element cache with the newly created container
        const newContainer = document.getElementById("searchContainer");
        if (!newContainer) {
          Logger.error("Failed to create search container");
          return;
        }

        // Update the container reference for this function AND the module cache
        _elements.container = newContainer;
        let searchContainer = _elements.container; // Update local reference for continued processing
      } catch (error) {
        Logger.error("Error creating search container:", error);
        return;
      }
    }

    // Now update all element references
    _elements.input = searchContainer.querySelector("#tourSearch");
    _elements.results = searchContainer.querySelector(".search-results");
    _elements.clearButton = searchContainer.querySelector(".clear-button");
    _elements.searchIcon = searchContainer.querySelector(".search-icon");

    // Apply container position based on device
    const position = _config.searchBar.position;
    const isMobile = window.innerWidth <= _config.mobileBreakpoint;

    // Set positioning attribute for CSS targeting
    if (position.left !== null && position.right === null) {
      searchContainer.setAttribute("data-position", "left");
    } else if (position.left !== null && position.left === "50%") {
      searchContainer.setAttribute("data-position", "center");
    } else {
      searchContainer.setAttribute("data-position", "right");
    }

    // [4.10.1.1] Clean up any existing style elements
    const existingStyle = document.getElementById("search-custom-vars");
    if (existingStyle) {
      existingStyle.remove();
    }

    // [4.10.1.2] Create new style element
    const styleElement = document.createElement("style");
    styleElement.id = "search-custom-vars";

    // [4.10.1.3] Generate responsive positioning CSS
    const isMobileOverride =
      isMobile &&
      _config.searchBar.useResponsive &&
      _config.searchBar.mobileOverrides?.enabled;
    const mobilePosition = _config.searchBar.mobilePosition;
    const mobileOverrides = _config.searchBar.mobileOverrides || {};

    // [4.10.1.4] Width calculation based on device type
    const desktopWidth =
      typeof _config.searchBar.width === "number"
        ? `${_config.searchBar.width}px`
        : _config.searchBar.width;
    const mobileWidth = mobileOverrides.width
      ? typeof mobileOverrides.width === "number"
        ? `${mobileOverrides.width}px`
        : mobileOverrides.width
      : `calc(100% - ${(mobilePosition.left || 0) * 2 + (mobilePosition.right || 0) * 2}px)`;

    // [4.10.1.5] Maximum width for mobile if specified
    const mobileMaxWidth = mobileOverrides.maxWidth
      ? typeof mobileOverrides.maxWidth === "number"
        ? `${mobileOverrides.maxWidth}px`
        : mobileOverrides.maxWidth
      : "";

    // [4.10.1.6] Base mobile positioning
    const positionCSS = isMobileOverride
      ? `
                /* Mobile positioning with overrides */
                #searchContainer {
                    position: fixed;
                    ${mobilePosition.top !== null && mobilePosition.top !== undefined ? `top: ${mobilePosition.top}px;` : ""}
                    ${mobilePosition.right !== null && mobilePosition.right !== undefined ? `right: ${mobilePosition.right}px;` : ""}
                    ${mobilePosition.left !== null && mobilePosition.left !== undefined ? `left: ${mobilePosition.left}px;` : ""}
                    ${
                      mobilePosition.bottom !== null &&
                      mobilePosition.bottom !== undefined
                        ? mobilePosition.bottom === "auto"
                          ? "bottom: auto;"
                          : `bottom: ${mobilePosition.bottom}px;`
                        : ""
                    }
                    width: ${mobileWidth};
                    ${mobileMaxWidth ? `max-width: ${mobileMaxWidth};` : ""}
                    z-index: 9999;
                }
                
                /* Apply mobile-specific visibility behavior */
                ${
                  mobileOverrides.visibility?.behavior === "dynamic"
                    ? `
                #searchContainer[data-visibility-behavior="dynamic"] {
                    transition: opacity 0.3s ease, transform 0.3s ease;
                }
                `
                    : ""
                }
                
                ${
                  mobileOverrides.visibility?.behavior === "fixed"
                    ? `
                #searchContainer[data-visibility-behavior="fixed"] {
                    opacity: 1 !important;
                    transform: none !important;
                }
                `
                    : ""
                }
                
                ${
                  mobileOverrides.fullScreenResults
                    ? `
                /* Full-screen results mode for mobile */
                #searchContainer[data-fullscreen-results="true"] .results-container {
                    position: fixed;
                    top: ${(mobilePosition.top || 0) + 50}px;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    width: 100%;
                    max-height: none;
                    border-radius: 0;
                    box-shadow: none;
                    z-index: 9998;
                }
                `
                    : ""
                }
                
                ${
                  mobileOverrides.focusMode
                    ? `
                /* Focus mode - darken background when search is active */
                #searchContainer[data-focus-mode="true"].visible::before {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: -1;
                }
                `
                    : ""
                }
            `
      : `
                /* Desktop positioning */
                #searchContainer {
                    position: fixed;
                    ${position.top !== null ? `top: ${position.top}px;` : ""}
                    ${position.right !== null ? `right: ${position.right}px;` : ""}
                    ${position.left !== null ? `left: ${position.left}px;` : ""}
                    ${position.bottom !== null ? `bottom: ${position.bottom}px;` : ""}
                    width: ${desktopWidth};
                    z-index: 9999;
                }
            `;

    // [4.10.1.7] Apply display-related classes and CSS variables
    const root = document.documentElement;

    // [4.10.1.7.1] Set CSS variables for result tags visibility
    root.style.setProperty(
      "--result-tags-display",
      _config.showTagsInResults ? "block" : "none",
    );

    // [4.10.1.7.2] Apply class-based styling for visibility control
    if (!_config.display.showGroupHeaders) {
      document.body.classList.add("hide-group-headers");
    } else {
      document.body.classList.remove("hide-group-headers");
    }

    if (!_config.display.showGroupCount) {
      document.body.classList.add("hide-group-count");
    } else {
      document.body.classList.remove("hide-group-count");
    }

    if (!_config.display.showIconsInResults) {
      document.body.classList.add("hide-result-icons");
    } else {
      document.body.classList.remove("hide-result-icons");
    }

    // [4.10.1.7.3] Set icon color variable
    root.style.setProperty(
      "--color-result-icon",
      _config.appearance.colors.resultIconColor || "#6e85f7",
    );

    // [4.10.1.8] Set border radius CSS variables
    const fieldRadius = _config.appearance.searchField.borderRadius;
    const resultsRadius = _config.appearance.searchResults.borderRadius;

    // [4.10.1.8.1] Set CSS variables for border radius

    root.style.setProperty(
      "--search-field-radius-top-left",
      Math.min(fieldRadius.topLeft, 50) + "px",
    );
    root.style.setProperty(
      "--search-field-radius-top-right",
      Math.min(fieldRadius.topRight, 50) + "px",
    );
    root.style.setProperty(
      "--search-field-radius-bottom-right",
      Math.min(fieldRadius.bottomRight, 50) + "px",
    );
    root.style.setProperty(
      "--search-field-radius-bottom-left",
      Math.min(fieldRadius.bottomLeft, 50) + "px",
    );

    root.style.setProperty(
      "--search-results-radius-top-left",
      Math.min(resultsRadius.topLeft, 10) + "px",
    );
    root.style.setProperty(
      "--search-results-radius-top-right",
      Math.min(resultsRadius.topRight, 10) + "px",
    );
    root.style.setProperty(
      "--search-results-radius-bottom-right",
      Math.min(resultsRadius.bottomRight, 10) + "px",
    );
    root.style.setProperty(
      "--search-results-radius-bottom-left",
      Math.min(resultsRadius.bottomLeft, 10) + "px",
    );

    // [4.10.1.9] Set color variables for search
    root.style.setProperty(
      "--search-background",
      _config.appearance.colors.searchBackground || "#f4f3f2",
    );
    root.style.setProperty(
      "--search-text",
      _config.appearance.colors.searchText || "#1a1a1a",
    );
    root.style.setProperty(
      "--placeholder-text",
      _config.appearance.colors.placeholderText || "#94a3b8",
    );
    root.style.setProperty(
      "--search-icon",
      _config.appearance.colors.searchIcon || "#94a3b8",
    );
    root.style.setProperty(
      "--clear-icon",
      _config.appearance.colors.clearIcon || "#94a3b8",
    );
    root.style.setProperty(
      "--results-background",
      _config.appearance.colors.resultsBackground || "#ffffff",
    );
    root.style.setProperty(
      "--group-header",
      _config.appearance.colors.groupHeaderColor || "#20293A",
    );
    root.style.setProperty(
      "--group-count",
      _config.appearance.colors.groupCountColor || "#94a3b8",
    );
    root.style.setProperty(
      "--result-hover",
      _config.appearance.colors.resultHover || "#f0f0f0",
    );
    root.style.setProperty(
      "--result-border-left",
      _config.appearance.colors.resultBorderLeft || "#dd0e0e",
    );
    root.style.setProperty(
      "--result-text",
      _config.appearance.colors.resultText || "#1e293b",
    );
    root.style.setProperty(
      "--result-subtitle",
      _config.appearance.colors.resultSubtitle || "#64748b",
    );

    // [4.10.1.10] Icon and group header alignment via data attributes

    // [4.10.1.11] Handle thumbnail alignment from config
    const thumbAlignment =
      _config.thumbnailSettings?.alignment === "right" ? "right" : "left";

    // [4.10.1.11.1] Apply thumbnail alignment to the document body as a data attribute
    document.body.setAttribute("data-thumbnail-align", thumbAlignment);

    // [4.10.1.12] Apply styles to the DOM
    styleElement.textContent = positionCSS;
    document.head.appendChild(styleElement);

    // [4.10.1.13] Cache frequently used elements and apply placeholder text
    _elements.input = _elements.container.querySelector("#tourSearch");
    _elements.results = _elements.container.querySelector(".search-results");
    _elements.clearButton = _elements.container.querySelector(".clear-button");
    _elements.searchIcon = _elements.container.querySelector(".search-icon");

    if (_elements.input) {
      _elements.input.placeholder = _config.searchBar.placeholder;

      // [4.10.1.14] Add accessibility attributes
      _aria.setRole(_elements.input, "searchbox");
      _aria.setLabel(_elements.input, "Search tour");
      _aria.setAutoComplete(_elements.input, "list");
    }

    Logger.info("Search styling applied successfully");
  }
  /**
   * [4.11] Enhanced business data matching that doesn't rely on volatile panorama IDs
   */
  function findBusinessMatch(tourElement) {
    // [4.11.0.1] Skip if no business data or invalid element
    if (!_businessData || !_businessData.length || !tourElement) {
      return null;
    }

    const elementName = tourElement.name || "";
    const elementId = tourElement.id || "";
    const elementTags = Array.isArray(tourElement.tags) ? tourElement.tags : [];

    Logger.debug(
      `[MATCHING] Processing: ${elementName || elementId} (${elementTags.join(",")})`,
    );

    // [4.11.1] Check if any business data entry has matching matchTags
    for (const entry of _businessData) {
      if (entry.matchTags && Array.isArray(entry.matchTags)) {
        for (const tag of elementTags) {
          if (entry.matchTags.includes(tag)) {
            Logger.debug(
              `[MATCH:TAG] Element tag "${tag}" matches business entry with ID: ${entry.id}`,
            );

            const businessMatch = { ...entry };

            Logger.debug("[DEBUG] Before normalization:", {
              imageUrl: businessMatch.imageUrl,
              localImage: businessMatch.localImage,
            });

            // [4.11.1.1] Normalize image paths in business data
            if (businessMatch.imageUrl) {
              businessMatch.imageUrl = _normalizeImagePath(
                businessMatch.imageUrl,
              );
            }

            if (businessMatch.localImage) {
              businessMatch.localImage = _normalizeImagePath(
                businessMatch.localImage,
              );
            }

            // [4.11.1.2] If no imageUrl but has localImage, use localImage as imageUrl
            if (!businessMatch.imageUrl && businessMatch.localImage) {
              businessMatch.imageUrl = businessMatch.localImage;
              console.log(
                "[DEBUG] Using localImage as imageUrl:",
                businessMatch.imageUrl,
              );
            }

            // [4.11.1.3] Debug logging after normalization
            console.log("[DEBUG] After normalization:", {
              imageUrl: businessMatch.imageUrl,
              localImage: businessMatch.localImage,
            });

            return businessMatch;
          }
        }
      }
    }

    // [4.11.2] Traditional matching as fallback

    // [4.11.2.1] Direct ID match (if id is stable, like "Room-1")
    if (elementName) {
      for (const entry of _businessData) {
        if (entry.id === elementName) {
          console.log(
            `[MATCH:NAME] Element name "${elementName}" matches business entry with ID: ${entry.id}`,
          );

          // [4.11.2.1.1] Process and normalize business match data
          const businessMatch = { ...entry };

          console.log("[DEBUG] Before normalization:", {
            imageUrl: businessMatch.imageUrl,
            localImage: businessMatch.localImage,
          });

          // [4.11.1.1] Normalize image paths in business data
          if (businessMatch.imageUrl) {
            businessMatch.imageUrl = _normalizeImagePath(
              businessMatch.imageUrl,
            );
          }

          if (businessMatch.localImage) {
            businessMatch.localImage = _normalizeImagePath(
              businessMatch.localImage,
            );
          }

          // [4.11.1.2] If no imageUrl but has localImage, use localImage as imageUrl
          if (!businessMatch.imageUrl && businessMatch.localImage) {
            businessMatch.imageUrl = businessMatch.localImage;
            console.log(
              "[DEBUG] Using localImage as imageUrl:",
              businessMatch.imageUrl,
            );
          }

          // [4.11.1.3] Debug logging after normalization
          console.log("[DEBUG] After normalization:", {
            imageUrl: businessMatch.imageUrl,
            localImage: businessMatch.localImage,
          });

          return businessMatch;
        }
      }
    }

    // [4.11.2.2] Tag-based match (for entries without matchTags)
    if (elementTags.length > 0) {
      for (const entry of _businessData) {
        if (elementTags.includes(entry.id)) {
          console.log(
            `[MATCH:TAG] Element tag "${entry.id}" matches business entry with ID: ${entry.id}`,
          );

          // [4.11.2.2.1] Process and normalize business match data
          const businessMatch = { ...entry };

          console.log("[DEBUG] Before normalization:", {
            imageUrl: businessMatch.imageUrl,
            localImage: businessMatch.localImage,
          });

          // [4.11.1.1] Normalize image paths in business data
          if (businessMatch.imageUrl) {
            businessMatch.imageUrl = _normalizeImagePath(
              businessMatch.imageUrl,
            );
          }

          if (businessMatch.localImage) {
            businessMatch.localImage = _normalizeImagePath(
              businessMatch.localImage,
            );
          }

          // [4.11.1.2] If no imageUrl but has localImage, use localImage as imageUrl
          if (!businessMatch.imageUrl && businessMatch.localImage) {
            businessMatch.imageUrl = businessMatch.localImage;
            console.log(
              "[DEBUG] Using localImage as imageUrl:",
              businessMatch.imageUrl,
            );
          }

          // [4.11.1.3] Debug logging after normalization
          console.log("[DEBUG] After normalization:", {
            imageUrl: businessMatch.imageUrl,
            localImage: businessMatch.localImage,
          });

          return businessMatch;
        }
      }
    }

    // [4.11.3] No match found
    console.log(
      `[MATCH:NONE] No business match for: ${elementName || elementId}`,
    );
    return null;
  }

  // [4.9] IMPROVED EVENT BINDING with proper cleanup
  function _bindSearchEventListeners(
    searchContainer,
    searchInput,
    clearButton,
    searchIcon,
    searchCallback,
  ) {
    // [4.9.1] First clean up any existing event listeners
    _unbindSearchEventListeners();

    Logger.debug("Binding search event listeners...");

    // [4.9.2] Create a cleanup registry for this session
    const cleanup = [];

    // [4.9.3] Bind input event with device-appropriate debounce
    if (searchInput) {
      const isMobile =
        window.innerWidth <= _config.mobileBreakpoint ||
        "ontouchstart" in window;
      const debounceTime = isMobile ? 300 : 150;

      const debouncedSearch = _debounce(searchCallback, debounceTime);
      const inputHandler = () => debouncedSearch();

      searchInput.addEventListener("input", inputHandler);
      cleanup.push(() =>
        searchInput.removeEventListener("input", inputHandler),
      );

      // [4.9.3.1] Mobile touch optimization
      if ("ontouchstart" in window) {
        const touchHandler = () => searchInput.focus();
        searchInput.addEventListener("touchend", touchHandler);
        cleanup.push(() =>
          searchInput.removeEventListener("touchend", touchHandler),
        );
      }
    }

    // [4.9.4] Bind clear button
    if (clearButton) {
      const clearHandler = (e) => {
        e.stopPropagation();
        if (searchInput) {
          searchInput.value = "";
          searchCallback();
          searchInput.focus();
        }

        if (
          window.innerWidth <= _config.mobileBreakpoint &&
          _config.autoHide.mobile
        ) {
          _toggleSearch(false);
        }
      };

      clearButton.addEventListener("click", clearHandler);
      cleanup.push(() =>
        clearButton.removeEventListener("click", clearHandler),
      );
    }

    // [4.9.5] Bind search icon
    if (searchIcon) {
      if (searchIcon) searchIcon.classList.add("search-icon");
      const iconHandler = () => {
        if (searchInput) {
          searchInput.value = "*";
          searchCallback();
        }
      };

      searchIcon.addEventListener("click", iconHandler);
      cleanup.push(() => searchIcon.removeEventListener("click", iconHandler));
    }

    // [4.9.6] Document click handler for closing search
    const documentClickHandler = (e) => {
      if (!searchContainer.classList.contains("visible")) return;
      if (!searchContainer.contains(e.target)) {
        _toggleSearch(false);
      }
    };

    document.addEventListener("click", documentClickHandler);
    cleanup.push(() =>
      document.removeEventListener("click", documentClickHandler),
    );

    // [4.9.7] Touch handler for mobile
    if ("ontouchstart" in window) {
      const touchStartHandler = (e) => {
        if (
          searchContainer.classList.contains("visible") &&
          !searchContainer.contains(e.target)
        ) {
          _toggleSearch(false);
        }
      };

      document.addEventListener("touchstart", touchStartHandler);
      cleanup.push(() =>
        document.removeEventListener("touchstart", touchStartHandler),
      );
    }

    // [4.9.8] Keyboard navigation
    const keyboardHandler = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        _toggleSearch(true);
      }

      if (!searchContainer.classList.contains("visible")) return;

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          if (searchInput && searchInput.value.trim() !== "") {
            searchInput.value = "";
            performSearch();
            selectedIndex = -1;
          } else {
            _toggleSearch(false);
          }
          break;
      }
    };

    document.addEventListener("keydown", keyboardHandler);
    cleanup.push(() =>
      document.removeEventListener("keydown", keyboardHandler),
    );

    // [4.9.9] Store cleanup functions for later use
    window._searchEventCleanup = cleanup;

    Logger.debug("Search event listeners bound successfully");
    return true;
  }

  // [4.9.10] Improved cleanup function - update the previously declared function
  _unbindSearchEventListeners = function () {
    try {
      if (
        window._searchEventCleanup &&
        Array.isArray(window._searchEventCleanup)
      ) {
        window._searchEventCleanup.forEach((cleanupFn) => {
          try {
            cleanupFn();
          } catch (e) {
            Logger.debug("Event cleanup error:", e);
          }
        });
        window._searchEventCleanup = [];
      }

      Logger.debug("Search event listeners cleaned up");
      return true;
    } catch (error) {
      Logger.warn("Error during event cleanup:", error);
      return false;
    }
  };

  // [5.0] DATA LOADING
  // [5.1] Google Sheets data loading function
  function _loadGoogleSheetsData() {
    // [5.1.1] Skip if Google Sheets data is not enabled
    if (
      !_config.googleSheets.useGoogleSheetData ||
      !_config.googleSheets.googleSheetUrl
    ) {
      Logger.info(
        "Google Sheets integration disabled or URL not provided, skipping load",
      );
      return Promise.resolve([]);
    }

    const sheetUrl = _config.googleSheets.googleSheetUrl;
    const fetchMode = _config.googleSheets.fetchMode || "csv";
    const cachingOptions = _config.googleSheets.caching || {};
    const progressiveOptions = _config.googleSheets.progressiveLoading || {};
    const authOptions = _config.googleSheets.authentication || {};

    Logger.info(
      `Loading Google Sheets data from: ${sheetUrl} in ${fetchMode} mode`,
    );

    // [5.1.2] Check cache first if enabled
    if (cachingOptions.enabled) {
      try {
        const storageKey = cachingOptions.storageKey || "tourGoogleSheetsData";
        const cacheTimeoutMinutes = cachingOptions.timeoutMinutes || 60;

        const cachedData = localStorage.getItem(storageKey);
        const cacheTimestamp = localStorage.getItem(`${storageKey}_timestamp`);

        if (cachedData && cacheTimestamp) {
          const parsedTimestamp = parseInt(cacheTimestamp, 10);
          const now = Date.now();
          const cacheAge = (now - parsedTimestamp) / (1000 * 60); // Convert to minutes

          // If cache is still valid
          if (cacheAge < cacheTimeoutMinutes) {
            try {
              const parsedData = JSON.parse(cachedData);
              Logger.info(
                `Using cached Google Sheets data (${parsedData.length} rows, ${cacheAge.toFixed(1)} minutes old)`,
              );
              _googleSheetsData = parsedData;
              return Promise.resolve(parsedData);
            } catch (parseError) {
              Logger.warn(
                "Error parsing cached data, will fetch fresh data:",
                parseError,
              );
              // Continue with fetch if parse fails
            }
          } else {
            Logger.info(
              `Cached data expired (${cacheAge.toFixed(1)} minutes old), fetching fresh data`,
            );
          }
        }
      } catch (cacheError) {
        Logger.warn("Error checking cache, will fetch fresh data:", cacheError);
      }
    }

    // [5.1.3] Ensure the URL is valid for fetching
    let fetchUrl = sheetUrl;
    if (fetchMode === "csv" && !sheetUrl.includes("/export?format=csv")) {
      // [5.1.3.1] Check if this is a Google Sheets view URL and convert it to a CSV export URL
      if (
        sheetUrl.includes("spreadsheets.google.com/") &&
        !sheetUrl.includes("/export")
      ) {
        // Extract the sheet ID
        let sheetId = "";
        try {
          const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
          if (match && match[1]) {
            sheetId = match[1];
            fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
          }
        } catch (e) {
          Logger.warn(
            "Failed to convert Google Sheets URL to CSV export URL:",
            e,
          );
        }
      }
    }

    Logger.info(`Final fetch URL: ${fetchUrl}`);

    // [5.1.4] Add authentication if enabled
    if (
      authOptions.enabled &&
      authOptions.authType === "apiKey" &&
      authOptions.apiKey
    ) {
      const separator = fetchUrl.includes("?") ? "&" : "?";
      const apiKeyParam = authOptions.apiKeyParam || "key";
      fetchUrl = `${fetchUrl}${separator}${apiKeyParam}=${encodeURIComponent(authOptions.apiKey)}`;
      Logger.debug("Added API key authentication to request");
    }

    // [5.1.5] Fetch the data
    return fetch(fetchUrl)
      .then((response) => {
        Logger.info(`Google Sheets fetch response status: ${response.status}`);
        if (!response.ok) {
          throw new Error(
            `Failed to load Google Sheets data: ${response.status} ${response.statusText}`,
          );
        }
        return response.text();
      })
      .then((text) => {
        Logger.info(`Google Sheets raw data length: ${text.length}`);
        Logger.info(`Google Sheets first 200 chars: ${text.substring(0, 200)}`);

        let data = [];

        try {
          if (fetchMode === "csv") {
            // [5.1.5.1] Simple CSV parsing
            const lines = text.split("\n");
            const headers = lines[0]
              .split(",")
              .map((h) => h.trim().replace(/"/g, ""));

            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;

              const values = line
                .split(",")
                .map((v) => v.trim().replace(/"/g, ""));
              const row = {};

              headers.forEach((header, index) => {
                row[header] = values[index] || "";
              });

              if (row.id || row.tag || row.name) {
                data.push(row);
              }
            }
          } else {
            // [5.1.5.2] Parse as JSON
            data = JSON.parse(text);

            // [5.1.5.3] Handle common Google Sheets JSON API responses
            if (data.feed && data.feed.entry) {
              // [5.1.5.3.1] Handle Google Sheets API v3 format
              data = data.feed.entry.map((entry) => {
                const row = {};
                // [5.1.5.3.1.1] Process each field (gs:cell or content entries)
                Object.keys(entry).forEach((key) => {
                  if (key.startsWith("gsx$")) {
                    const fieldName = key.substr(4);
                    row[fieldName] = entry[key].$t;
                  }
                });
                return row;
              });
            } else if (data.values) {
              // [5.1.5.3.2] Handle Google Sheets API v4 format
              const headers = data.values[0];
              data = data.values.slice(1).map((row) => {
                const rowData = {};
                headers.forEach((header, i) => {
                  rowData[header] = row[i];
                });
                return rowData;
              });
            }
          }

          // [5.1.5.4] Validate the data structure
          if (!Array.isArray(data)) {
            Logger.warn(
              "Google Sheets data is not an array after parsing, converting to array",
            );
            data = [data]; // Convert to array if not already
          }

          // [5.1.5.5] Log diagnostics
          Logger.info(
            `Successfully loaded ${data.length} rows from Google Sheets`,
          );

          // [5.1.5.6] Process data with progressive loading support
          let processedData = [];
          if (progressiveOptions.enabled && data.length > 20) {
            // [5.1.5.6.1] Apply progressive loading for larger datasets
            Logger.info(
              "Progressive loading enabled, processing essential fields first",
            );

            // [5.1.5.6.1.1] Extract just essential fields for initial load
            const essentialFields = progressiveOptions.initialFields || [
              "id",
              "tag",
              "name",
            ];

            // [5.1.5.6.1.2] Create a lightweight version with just essential fields
            processedData = data.map((row) => {
              const essentialData = {};
              essentialFields.forEach((field) => {
                essentialData[field] = row[field] || "";
              });
              return essentialData;
            });

            // [5.1.5.6.1.3] Schedule loading of full data for later
            setTimeout(() => {
              // [5.1.5.6.1.3.1] Process full data in background
              const fullData = data.map((row) => ({
                id: row.id || "",
                tag: row.tag || "",
                name: row.name || "",
                description: row.description || "",
                imageUrl: row.imageUrl || row.image || "",
                elementType: row.elementType || row.type || "",
                parentId: row.parentId || "",
              }));

              // [5.1.5.6.1.3.2] Replace data with full version
              _googleSheetsData = fullData;

              // [5.1.5.6.1.3.3] Update cache with full data if caching is enabled
              if (cachingOptions.enabled) {
                try {
                  const storageKey =
                    cachingOptions.storageKey || "tourGoogleSheetsData";
                  localStorage.setItem(storageKey, JSON.stringify(fullData));
                  localStorage.setItem(
                    `${storageKey}_timestamp`,
                    Date.now().toString(),
                  );
                  Logger.debug("Updated cache with full Google Sheets data");
                } catch (e) {
                  Logger.warn("Failed to cache full Google Sheets data:", e);
                }
              }

              Logger.info(
                "Background loading of detailed Google Sheets data complete",
              );
            }, 2000); // Delay full data processing to avoid blocking UI
          } else {
            // [5.1.5.6.2] Regular (non-progressive) processing
            processedData = data.map((row) => ({
              id: row.id || "",
              tag: row.tag || "",
              name: row.name || "",
              description: row.description || "",
              imageUrl: row.imageUrl || row.image || "",
              elementType: row.elementType || row.type || "",
              parentId: row.parentId || "",
            }));
          }

          // [5.1.5.7] Cache the data if caching is enabled
          if (cachingOptions.enabled) {
            try {
              const storageKey =
                cachingOptions.storageKey || "tourGoogleSheetsData";
              localStorage.setItem(storageKey, JSON.stringify(processedData));
              localStorage.setItem(
                `${storageKey}_timestamp`,
                Date.now().toString(),
              );
              Logger.debug("Cached Google Sheets data successfully");
            } catch (e) {
              Logger.warn("Failed to cache Google Sheets data:", e);
            }
          }

          // [5.1.5.8] Store in module-level variable for future use
          _googleSheetsData = processedData;

          // [5.1.5.9] Output diagnostics about data quality
          const missingIds = processedData.filter((row) => !row.id).length;
          const missingTags = processedData.filter((row) => !row.tag).length;

          if (missingIds > 0 || missingTags > 0) {
            Logger.warn(
              `Data quality issues: ${missingIds} rows missing ID, ${missingTags} rows missing tag`,
            );
          }

          return processedData;
        } catch (e) {
          Logger.error("Error parsing Google Sheets data:", e);
          _googleSheetsData = [];
          return [];
        }
      })
      .catch((error) => {
        Logger.warn(`Error loading Google Sheets data: ${error.message}`);
        _googleSheetsData = [];
        return [];
      });
  }

  // [5.2] Process Google Sheets data and integrate with search index
  function processGoogleSheetsData(fuseData, config) {
    Logger.info(
      `Processing ${_googleSheetsData.length} Google Sheets entries for search index`,
    );

    // [5.2.1] Enhanced tracking for duplicate prevention
    const matchedSheetIds = new Set();
    const matchedSheetTags = new Set();
    const existingLabels = new Map(); // label -> array of items with that label
    const existingIds = new Set();

    // [5.2.2] Track existing items with better context
    fuseData.forEach((item) => {
      if (item.label) {
        const labelKey = item.label.toLowerCase();
        if (!existingLabels.has(labelKey)) {
          existingLabels.set(labelKey, []);
        }
        existingLabels.get(labelKey).push({
          item: item,
          id: item.id,
          type: item.type,
          source: item.source,
          index: item.index,
        });
      }

      if (item.id) {
        existingIds.add(item.id);
      }

      if (item.sheetsData) {
        if (item.sheetsData.id) {
          matchedSheetIds.add(item.sheetsData.id);
        }
        if (item.sheetsData.tag) {
          matchedSheetTags.add(item.sheetsData.tag);
        }
      }
    });

    // Log potential duplicate scenarios
    existingLabels.forEach((items, label) => {
      if (items.length > 1) {
        Logger.warn(
          `[DUPLICATE DETECTION] Found ${items.length} items with label "${label}":`,
        );
        items.forEach(({ item, id, type, source }) => {
          Logger.warn(`  - ${type} (ID: ${id}, Source: ${source})`);
        });
      }
    });

    _googleSheetsData.forEach((sheetsEntry, sheetsIndex) => {
      try {
        if (!sheetsEntry.id && !sheetsEntry.tag && !sheetsEntry.name) {
          return;
        }

        const entryId = sheetsEntry.id;
        const entryTag = sheetsEntry.tag;
        const entryName = sheetsEntry.name;

        Logger.debug(
          `[SHEETS PROCESSING] Processing entry: ${entryName} (ID: ${entryId}, Tag: ${entryTag})`,
        );

        let alreadyMatched = false;
        let matchedTourItems = []; // Can match multiple items

        // Check if already processed
        if (entryId && matchedSheetIds.has(entryId)) {
          alreadyMatched = true;
          Logger.debug(
            `Skipping Google Sheets entry "${entryName}" - ID already matched: ${entryId}`,
          );
        }

        if (entryTag && matchedSheetTags.has(entryTag)) {
          alreadyMatched = true;
          Logger.debug(
            `Skipping Google Sheets entry "${entryName}" - tag already matched: ${entryTag}`,
          );
        }

        if (alreadyMatched) {
          return;
        }

        // ENHANCED: Find ALL potential tour item matches
        fuseData.forEach((item) => {
          if (!item.item) return;

          let isMatch = false;
          let matchReason = "";

          // Method 1: Exact ID match (highest confidence)
          if (entryId && item.id && entryId.toString() === item.id.toString()) {
            isMatch = true;
            matchReason = "exact_id";
          }

          // Method 2: Tag match (medium confidence)
          else if (
            entryTag &&
            Array.isArray(item.tags) &&
            item.tags.includes(entryTag)
          ) {
            isMatch = true;
            matchReason = "tag_match";
          }

          // Method 3: Label match (lower confidence, be careful)
          else if (
            entryName &&
            item.originalLabel &&
            entryName.toLowerCase() === item.originalLabel.toLowerCase()
          ) {
            isMatch = true;
            matchReason = "label_match";
          }

          // Method 4: Media ID match (for items accessed via media)
          else if (entryId && item.item && item.item.get) {
            const media = item.item.get("media");
            if (media && media.get) {
              const mediaId = media.get("id");
              if (mediaId === entryId) {
                isMatch = true;
                matchReason = "media_id";
              }
            }
          }

          if (isMatch) {
            matchedTourItems.push({
              item: item,
              reason: matchReason,
              confidence:
                matchReason === "exact_id"
                  ? 3
                  : matchReason === "tag_match"
                    ? 2
                    : matchReason === "media_id"
                      ? 2
                      : 1,
            });
          }
        });

        if (matchedTourItems.length === 0) {
          // No matches found - create standalone entry if enabled
          if (!config.googleSheets.includeStandaloneEntries) {
            Logger.debug(
              `Skipping standalone Google Sheets entry "${entryName}" - standalone entries disabled`,
            );
            return;
          }

          Logger.debug(`Creating standalone Google Sheets entry: ${entryName}`);
        } else if (matchedTourItems.length === 1) {
          // Single match - straightforward
          const match = matchedTourItems[0];
          Logger.debug(
            `Single match found for "${entryName}": ${match.item.label} (${match.reason})`,
          );

          if (config.googleSheets.useAsDataSource !== true) {
            Logger.debug(
              `Skipping Google Sheets entry "${entryName}" - tour item exists and not using as primary data source`,
            );
            return;
          }
        } else {
          // Multiple matches - need resolution strategy
          Logger.warn(
            `Multiple matches found for Google Sheets entry "${entryName}" (${matchedTourItems.length} matches):`,
          );
          matchedTourItems.forEach((match) => {
            Logger.warn(
              `  - ${match.item.label} (${match.item.type}, ${match.reason}, confidence: ${match.confidence})`,
            );
          });

          // Resolution: Use highest confidence match
          matchedTourItems.sort((a, b) => b.confidence - a.confidence);
          const bestMatch = matchedTourItems[0];

          Logger.warn(
            `Resolved to highest confidence match: ${bestMatch.item.label} (${bestMatch.reason})`,
          );

          if (config.googleSheets.useAsDataSource !== true) {
            Logger.debug(
              `Skipping Google Sheets entry "${entryName}" - tour item exists and not using as primary data source`,
            );
            return;
          }
        }

        const displayLabel =
          sheetsEntry.name || sheetsEntry.id || "Unknown Entry";
        const description = sheetsEntry.description || "";
        const elementType = sheetsEntry.elementType || "Element";

        const elementTags = sheetsEntry.tag ? [sheetsEntry.tag] : [];
        if (!_shouldIncludeElement(elementType, displayLabel, elementTags)) {
          Logger.debug(
            `Filtering out Google Sheets entry ${displayLabel} due to element filter`,
          );
          return;
        }

        // Mark as processed
        if (entryId) matchedSheetIds.add(entryId);
        if (entryTag) matchedSheetTags.add(entryTag);

        // Determine best matched item for context
        const bestMatchedItem =
          matchedTourItems.length > 0
            ? matchedTourItems.sort((a, b) => b.confidence - a.confidence)[0]
                .item
            : null;

        // Create search index entry
        fuseData.push({
          type: elementType,
          source: bestMatchedItem ? bestMatchedItem.source : "sheets",
          label: displayLabel,
          subtitle: description,
          originalLabel: displayLabel,
          tags: elementTags,
          sheetsData: sheetsEntry,
          imageUrl: sheetsEntry.imageUrl || null,
          id: sheetsEntry.id,

          parentIndex: bestMatchedItem ? bestMatchedItem.index : null,
          originalIndex: bestMatchedItem ? bestMatchedItem.originalIndex : null,
          playlistOrder: bestMatchedItem
            ? bestMatchedItem.playlistOrder
            : 10000 + sheetsIndex,
          item: bestMatchedItem ? bestMatchedItem.item : null,

          isStandalone: !bestMatchedItem,
          isEnhanced: !!bestMatchedItem,
          matchedItemsCount: matchedTourItems.length, // Track how many items this matched

          boost: config.googleSheets.useAsDataSource ? 3.0 : 1.5,
          businessName: null,
          businessData: null,
        });

        Logger.debug(
          `Added Google Sheets entry: ${displayLabel} (matched ${matchedTourItems.length} tour items)`,
        );
      } catch (error) {
        Logger.warn(
          `Error processing Google Sheets entry at index ${sheetsIndex}:`,
          error,
        );
      }
    });
  }

  // [4.10.2] Business data loading function
  function _loadBusinessData() {
    // Skip if business data is not enabled
    if (!_config.businessData.useBusinessData) {
      Logger.info("Business data integration disabled, skipping load");
      return Promise.resolve([]);
    }

    // First try to use the businessDataUrl from config if available
    let dataPath;
    if (_config.businessData.businessDataUrl) {
      dataPath = _config.businessData.businessDataUrl;
    } else {
      // Fall back to constructed URL using origin + pathname
      const baseUrl =
        window.location.origin +
        window.location.pathname.substring(
          0,
          window.location.pathname.lastIndexOf("/"),
        );
      const dataDir = _config.businessData.businessDataDir || "business-data";
      const dataFile = _config.businessData.businessDataFile || "business.json";
      const dataPath = `${baseUrl}/search-pro-non-mod/${dataDir}/${dataFile}`;
    }

    Logger.info(`Loading business data from: ${dataPath}`);
    Logger.info("[BUSINESS DATA] Attempting to load from:", dataPath);

    // Fetch the business data file
    return fetch(dataPath)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load business data: ${response.status} ${response.statusText}`,
          );
        }
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          Logger.warn("Business data is not an array, converting to array");
          data = [data];
        }

        // [5.3.1] Add detailed logging
        Logger.info("=== BUSINESS DATA LOADED ===");
        Logger.info(`Successfully loaded ${data.length} business data entries`);

        // [5.3.1.1] Log the first 3 entries to verify structure
        for (let i = 0; i < Math.min(3, data.length); i++) {
          console.log(`Entry ${i + 1}:`, {
            id: data[i].id,
            name: data[i].name,
            elementType: data[i].elementType,
          });
        }

        // [5.3.2] Store in module variable
        _businessData = data;

        // [5.3.3] Also store globally for easy access
        window._businessData = data;

        return data;
      })
      .catch((error) => {
        console.error(`Error loading business data: ${error.message}`);
        _businessData = [];
        return [];
      });
  }

  // [6.0] SEARCH FUNCTIONALITY
  // [6.1] Search initialization
  function _initializeSearch(tour) {
    Logger.info("Initializing enhanced search v2.0...");

    // [6.1.1] Handle case where 'tour' parameter might be rootPlayer instead of tour
    let actualTour = tour;

    // [6.1.1.1] If the passed parameter looks like a rootPlayer, try to get the actual tour
    if (tour && typeof tour.get === "function") {
      try {
        const tourFromContext = tour.get("data")?.tour;
        if (tourFromContext && tourFromContext.mainPlayList) {
          actualTour = tourFromContext;
          Logger.debug(
            "Retrieved tour from rootPlayer context via get('data').tour",
          );
        }
      } catch (e) {
        Logger.debug(
          "Could not extract tour from rootPlayer context, using passed parameter",
        );
      }
    }

    // [6.1.2] Additional fallback detection as per technical notes
    if (!actualTour || !actualTour.mainPlayList) {
      const tourCandidates = [
        tour, // Original parameter
        window.tour,
        window.tourInstance,
        // [6.1.2.1] Try via TDV API if available
        window.TDV &&
        window.TDV.PlayerAPI &&
        typeof window.TDV.PlayerAPI.getCurrentPlayer === "function"
          ? window.TDV.PlayerAPI.getCurrentPlayer()
          : null,
      ].filter(Boolean);

      for (const candidate of tourCandidates) {
        if (
          candidate &&
          candidate.mainPlayList &&
          typeof candidate.mainPlayList.get === "function"
        ) {
          actualTour = candidate;
          Logger.debug("Found valid tour via fallback detection");
          break;
        }
      }
    }
    // [6.1.3] Validate tour has required functionality
    if (!actualTour || !actualTour.mainPlayList) {
      Logger.warn("Could not find valid tour reference with mainPlayList");
    } else if (typeof actualTour.mainPlayList.get !== "function") {
      Logger.warn("Tour found but mainPlayList.get is not a function");
    } else {
      Logger.info(
        `Tour initialized successfully with ${actualTour.mainPlayList.get("items")?.length || 0} panoramas`,
      );
    }
    // [6.1.4] Store the validated tour reference
    window.tourInstance = actualTour;

    // [6.1.5] Reset the module-level search state variables
    currentSearchTerm = ""; // Reset the module-level variable
    fuse = null;

    // [6.1.6] If already initialized, don't reinitialize
    if (_initialized) {
      Logger.info("Search already initialized.");
      return;
    }

    // [6.1.7] Flag as initialized
    _initialized = true;
    window.searchListInitialized = true;

    // [6.1.8] Initialize BroadcastChannel for cross-window communication
    _crossWindowChannel.init();

    // [6.1.9] Create a promise chain to load all external data sources
    const dataPromises = [];

    // [6.1.9.1] Load business data if enabled
    if (_config.businessData.useBusinessData) {
      dataPromises.push(_loadBusinessData());
    }

    // [6.1.9.2] Load Google Sheets data if enabled
    if (_config.googleSheets.useGoogleSheetData) {
      console.log("[DEBUG] Adding Google Sheets data loading to promise chain");
      dataPromises.push(_loadGoogleSheetsData());
    }

    // [6.1.10] When all data sources are loaded (or failed gracefully), prepare the search index
    Promise.all(dataPromises)
      .then(() => {
        Logger.info("All external data sources loaded successfully");
        prepareFuse();
      })
      .catch((error) => {
        Logger.warn("Error loading some external data sources:", error);
        // Still prepare the search index even if some data sources failed
        prepareFuse();
      });

    // [6.1.11] Set up listener for cross-window messages
    _crossWindowChannel.listen(function (message) {
      try {
      } catch (error) {
        Logger.warn("Error handling BroadcastChannel message:", error);
      }
    });

    if (!tour || !tour.mainPlayList) {
      Logger.error(
        "Tour or mainPlayList not available, cannot initialize search",
      );
      return;
    }

    // [6.1.12] Add ARIA attributes to container
    _aria.setRole(_elements.container, "search");
    _aria.setLabel(_elements.container, "Tour search");

    // [6.1.13] Create search UI components if needed
    _createSearchInterface(_elements.container);

    // [6.1.14] Reset module-level search state variables
    currentSearchTerm = ""; // Reset the module-level variable
    fuse = null;

    // [6.2] Enhanced Search index preparation with proper tour detection
    /**
     * Prepares and returns a Fuse.js search index for the tour panoramas and overlays.
     * @param {object} tour - The tour object containing the main playlist.
     * @param {object} config - The search configuration object.
     * @returns {Fuse} The constructed Fuse.js instance for searching.
     */

    function _prepareSearchIndex(tour, config) {
      try {
        Logger.info("Starting hybrid search index preparation...");

        let actualTour = tour;

        // [6.2.1] Use utility functions for robust playlist detection
        const playlists = PlaylistUtils.getAllPlayLists(actualTour);
        let mainPlaylistItems = playlists.main?.get("items");
        let rootPlaylistItems = playlists.root?.get("items");

        // [6.2.2] Validate we have at least one playlist
        if (!mainPlaylistItems && !rootPlaylistItems) {
          // [6.2.2.1] Fallback tour detection if playlists not found
          const tourCandidates = [
            window.tour,
            window.tourInstance,
            window.player,
            window.TDV &&
            window.TDV.PlayerAPI &&
            typeof window.TDV.PlayerAPI.getCurrentPlayer === "function"
              ? window.TDV.PlayerAPI.getCurrentPlayer()
              : null,
          ].filter(Boolean);

          for (const candidate of tourCandidates) {
            if (candidate === actualTour) continue; // Skip already checked tour

            const candidatePlaylists = PlaylistUtils.getAllPlayLists(candidate);
            if (candidatePlaylists.main || candidatePlaylists.root) {
              actualTour = candidate;
              mainPlaylistItems = candidatePlaylists.main?.get("items");
              rootPlaylistItems = candidatePlaylists.root?.get("items");
              Logger.info(`Using fallback tour with playlists from candidate`);
              break;
            }
          }
        }

        if (!mainPlaylistItems && !rootPlaylistItems) {
          throw new Error("No valid playlist found with any method");
        }

        Logger.info(
          `Found playlists - Main: ${mainPlaylistItems?.length || 0}, Root: ${rootPlaylistItems?.length || 0}`,
        );

        const fuseData = [];
        const filterMode = config.filter.mode;
        const allowedValues = config.filter.allowedValues || [];
        const blacklistedValues = config.filter.blacklistedValues || [];
        const allowedMediaIndexes = config.filter.allowedMediaIndexes || [];
        const blacklistedMediaIndexes =
          config.filter.blacklistedMediaIndexes || [];

        // [6.2.3] Process main playlist items (panoramas, basic 3D models)
        if (mainPlaylistItems && mainPlaylistItems.length > 0) {
          Logger.info(
            `Processing ${mainPlaylistItems.length} main playlist items...`,
          );

          mainPlaylistItems.forEach((item, index) => {
            try {
              const itemClass = item.get ? item.get("class") : item.class;
              const media = item.get ? item.get("media") : item.media;
              if (!media) {
                Logger.warn(
                  `No media found for main playlist item at index ${index}`,
                );
                return;
              }

              // [6.2.3.1] Process based on item type
              processPlaylistItem(
                item,
                index,
                media,
                "main",
                fuseData,
                config,
                actualTour,
              );
            } catch (error) {
              Logger.warn(
                `Error processing main playlist item at index ${index}:`,
                error,
              );
            }
          });
        }

        // [6.2.4] Process root player playlist items (detailed 3D model content)
        if (rootPlaylistItems && rootPlaylistItems.length > 0) {
          Logger.info(
            `Processing ${rootPlaylistItems.length} root player playlist items...`,
          );

          rootPlaylistItems.forEach((item, index) => {
            try {
              const itemClass = item.get ? item.get("class") : item.class;
              const media = item.get ? item.get("media") : item.media;
              if (!media) {
                Logger.warn(
                  `No media found for root playlist item at index ${index}`,
                );
                return;
              }

              // [6.2.4.1] Process with different source and offset index to avoid conflicts
              const offsetIndex = (mainPlaylistItems?.length || 0) + index;
              processPlaylistItem(
                item,
                offsetIndex,
                media,
                "root",
                fuseData,
                config,
                actualTour,
              );
            } catch (error) {
              Logger.warn(
                `Error processing root playlist item at index ${index}:`,
                error,
              );
            }
          });
        }

        // [6.2.5] Process Google Sheets data as standalone entries
        if (
          config.googleSheets?.useGoogleSheetData &&
          _googleSheetsData.length > 0
        ) {
          Logger.info(
            `Processing ${_googleSheetsData.length} Google Sheets entries for search index`,
          );

          // [6.2.5.1] Track which Google Sheets entries were already matched to tour items
          const matchedSheetIds = new Set();
          const matchedSheetTags = new Set();
          const existingLabels = new Set();

          // [6.2.5.2] First pass: identify ALL existing entries in the search index
          fuseData.forEach((item) => {
            if (item.label) {
              existingLabels.add(item.label.toLowerCase());
            }

            if (item.sheetsData) {
              if (item.sheetsData.id) {
                matchedSheetIds.add(item.sheetsData.id);
              }
              if (item.sheetsData.tag) {
                matchedSheetTags.add(item.sheetsData.tag);
              }
            }

            if (item.imageUrl && item.imageUrl.includes("unsplash")) {
              if (item.label && item.label.startsWith("** ")) {
                matchedSheetTags.add(item.label.replace("** ", ""));
              }
            }
          });

          _googleSheetsData.forEach((sheetsEntry, sheetsIndex) => {
            try {
              if (!sheetsEntry.id && !sheetsEntry.tag && !sheetsEntry.name) {
                return;
              }

              const entryId = sheetsEntry.id;
              const entryTag = sheetsEntry.tag;
              const entryName = sheetsEntry.name;

              let alreadyMatched = false;
              let matchedTourItem = null;

              // [6.2.5.3] Check by ID
              if (entryId && matchedSheetIds.has(entryId)) {
                alreadyMatched = true;
                Logger.debug(
                  `Skipping Google Sheets entry "${entryName}" - ID already matched: ${entryId}`,
                );
              }

              // [6.2.5.4] Check by tag
              if (entryTag && matchedSheetTags.has(entryTag)) {
                alreadyMatched = true;
                Logger.debug(
                  `Skipping Google Sheets entry "${entryName}" - tag already matched: ${entryTag}`,
                );
              }

              // [6.2.5.5] Check by exact label match (case-insensitive)
              if (entryName && existingLabels.has(entryName.toLowerCase())) {
                alreadyMatched = true;
                Logger.debug(
                  `Skipping Google Sheets entry "${entryName}" - label already exists in search index`,
                );
              }

              // [6.2.5.6] Try to find a matching tour item for navigation
              if (!alreadyMatched && entryTag) {
                const tourItemMatch = fuseData.find((item) => {
                  if (!item.item) return false;

                  if (
                    Array.isArray(item.tags) &&
                    item.tags.includes(entryTag)
                  ) {
                    return true;
                  }

                  if (item.id && item.id === entryTag) {
                    return true;
                  }

                  if (
                    item.originalLabel &&
                    item.originalLabel
                      .toLowerCase()
                      .includes(entryTag.toLowerCase())
                  ) {
                    return true;
                  }

                  if (item.item && item.item.get) {
                    const media = item.item.get("media");
                    if (media && media.get) {
                      const mediaId = media.get("id");
                      if (mediaId === entryTag) {
                        return true;
                      }
                    }
                  }

                  return false;
                });

                if (tourItemMatch) {
                  matchedTourItem = tourItemMatch;
                  Logger.debug(
                    `Found tour item match for Google Sheets entry "${entryName}": enhancing existing item`,
                  );

                  if (config.googleSheets.useAsDataSource !== true) {
                    Logger.debug(
                      `Skipping standalone Google Sheets entry "${entryName}" - tour item exists and not using as primary data source`,
                    );
                    return;
                  }

                  Logger.debug(
                    `Creating enhanced Google Sheets entry "${entryName}" linked to tour item`,
                  );
                }
              }

              if (
                !matchedTourItem &&
                !config.googleSheets.includeStandaloneEntries
              ) {
                Logger.debug(
                  `Skipping standalone Google Sheets entry "${entryName}" - standalone entries disabled`,
                );
                return;
              }

              if (alreadyMatched) {
                return;
              }

              const displayLabel =
                sheetsEntry.name || sheetsEntry.id || "Unknown Entry";
              const description = sheetsEntry.description || "";
              const elementType = sheetsEntry.elementType || "Element";

              const elementTags = sheetsEntry.tag ? [sheetsEntry.tag] : [];
              if (
                !_shouldIncludeElement(elementType, displayLabel, elementTags)
              ) {
                Logger.debug(
                  `Filtering out Google Sheets entry ${displayLabel} due to element filter`,
                );
                return;
              }

              existingLabels.add(displayLabel.toLowerCase());

              // [6.2.5.7] Create search index entry for Google Sheets data
              fuseData.push({
                type: elementType,
                source: matchedTourItem ? matchedTourItem.source : "sheets", // Use matched item's source or "sheets"
                label: displayLabel,
                subtitle: description,
                originalLabel: displayLabel,
                tags: elementTags,
                sheetsData: sheetsEntry,
                imageUrl: sheetsEntry.imageUrl || null,
                id: sheetsEntry.id,

                parentIndex: matchedTourItem ? matchedTourItem.index : null,
                originalIndex: matchedTourItem
                  ? matchedTourItem.originalIndex
                  : null,
                playlistOrder: matchedTourItem
                  ? matchedTourItem.playlistOrder
                  : 10000 + sheetsIndex,
                item: matchedTourItem ? matchedTourItem.item : null,

                isStandalone: !matchedTourItem,
                isEnhanced: !!matchedTourItem,

                boost: config.googleSheets.useAsDataSource ? 3.0 : 1.5,
                businessName: null,
                businessData: null,
              });

              Logger.debug(
                `Added ${matchedTourItem ? "linked" : "standalone"} Google Sheets entry: ${displayLabel}`,
              );
            } catch (error) {
              Logger.warn(
                `Error processing Google Sheets entry at index ${sheetsIndex}:`,
                error,
              );
            }
          });
        }

        // [6.2.6] Create and return Fuse instance
        const fuseInstance = new Fuse(fuseData, {
          keys: [
            { name: "label", weight: 1 },
            { name: "subtitle", weight: 0.8 },
            { name: "tags", weight: 0.6 },
            { name: "parentLabel", weight: 0.3 },
            { name: "businessTag", weight: 0.7 },
            { name: "businessName", weight: 0.9 },
          ],
          includeScore: true,
          threshold: 0.4,
          distance: 40,
          minMatchCharLength: 1,
          useExtendedSearch: true,
          ignoreLocation: true,
          location: 0,
        });

        Logger.info(
          `Hybrid search index created with ${fuseData.length} total items`,
        );
        Logger.info(
          `Main playlist contributed: ${mainPlaylistItems?.length || 0} items`,
        );
        Logger.info(
          `Root playlist contributed: ${rootPlaylistItems?.length || 0} items`,
        );

        return fuseInstance;
      } catch (error) {
        Logger.error("Error preparing hybrid search index:", error);
        return new Fuse([], { keys: ["label"], includeScore: true });
      }
    }

    // [6.3] Helper function to process individual playlist items
    function processPlaylistItem(
      item,
      index,
      media,
      source,
      fuseData,
      config,
      tour,
    ) {
      const itemClass = item.get ? item.get("class") : item.class;

      // [6.3.1] Handle 3D Models
      if (itemClass === "Model3DPlayListItem") {
        const mediaClass = media.get ? media.get("class") : media.class;
        if (mediaClass === "Model3D") {
          process3DModel(item, index, media, source, fuseData, config, tour);
          return;
        }
      }

      // [6.3.2] Handle regular panoramas
      processPanorama(item, index, media, source, fuseData, config, tour);
    }

    // [6.4] Helper function to process 3D models
    function process3DModel(
      item,
      index,
      media,
      source,
      fuseData,
      config,
      tour,
    ) {
      const data = _safeGetData(media);
      const label = data?.label?.trim() || "";
      const subtitle = data?.subtitle?.trim() || "";
      const tags = Array.isArray(data?.tags) ? data.tags : [];

      // [6.4.1] Apply content filtering
      if (
        !_shouldIncludePanorama(
          label,
          subtitle,
          tags,
          index,
          config.filter.mode,
          config.filter.allowedValues,
          config.filter.blacklistedValues,
          config.filter.allowedMediaIndexes,
          config.filter.blacklistedMediaIndexes,
        )
      ) {
        return;
      }

      const displayLabel = _getDisplayLabel(label, subtitle, tags);

      // Get business and sheets matches
      const businessMatch = getBusinessMatch(label, media, tags, config);
      const sheetsMatch = getSheetsMatch(label, media, tags, config);

      // [6.4.3] Add 3D Model to search index
      fuseData.push({
        type: "3DModel",
        source: source, // "main" or "root"
        index,
        originalIndex: index,
        playlistOrder: index,
        label: getResultLabel(displayLabel, businessMatch, sheetsMatch, config),
        originalLabel: label,
        subtitle: getResultDescription(
          subtitle,
          businessMatch,
          sheetsMatch,
          config,
        ),
        tags,
        businessData: businessMatch,
        businessName: businessMatch?.name,
        sheetsData: sheetsMatch,
        imageUrl: businessMatch?.imageUrl || sheetsMatch?.imageUrl || null,
        item,
        boost: businessMatch ? 2.0 : sheetsMatch ? 2.5 : label ? 1.5 : 1.0,
      });

      // [6.4.4] Process objects inside the 3D model
      const objects = media.get ? media.get("objects") : media.objects;
      if (Array.isArray(objects)) {
        objects.forEach((obj, objIdx) => {
          const objData = _safeGetData(obj);
          const objLabel =
            objData?.label?.trim() ||
            (obj.get ? obj.get("label") : obj.label) ||
            (obj.get ? obj.get("id") : obj.id) ||
            "";
          const objTags = Array.isArray(objData?.tags) ? objData.tags : [];

          if (!_shouldIncludeElement("3DModelObject", objLabel, objTags))
            return;

          fuseData.push({
            type: "3DModelObject",
            source: source,
            label: objLabel,
            subtitle: objData?.subtitle || "",
            tags: objTags,
            parentModel: media.get ? media.get("id") : media.id,
            parentLabel: getResultLabel(
              displayLabel,
              businessMatch,
              sheetsMatch,
              config,
            ),
            parentIndex: index,
            playlistOrder: index * 1000 + objIdx,
            id: obj.get ? obj.get("id") : obj.id,
            item: obj,
            parentItem: item, // Reference to the parent 3D model
            boost: 1.0,
          });
        });
      }
    }

    // [6.5] Helper function to process panoramas
    function processPanorama(
      item,
      index,
      media,
      source,
      fuseData,
      config,
      tour,
    ) {
      const data = _safeGetData(media);
      const label = data?.label?.trim() || "";
      const subtitle = data?.subtitle?.trim() || "";
      const tags = Array.isArray(data?.tags) ? data.tags : [];

      // [6.5.1] Apply content filtering
      if (
        !_shouldIncludePanorama(
          label,
          subtitle,
          tags,
          index,
          config.filter.mode,
          config.filter.allowedValues,
          config.filter.blacklistedValues,
          config.filter.allowedMediaIndexes,
          config.filter.blacklistedMediaIndexes,
        )
      ) {
        return;
      }

      const displayLabel = _getDisplayLabel(label, subtitle, tags);

      // Get business and sheets matches
      const businessMatch = getBusinessMatch(label, media, tags, config);
      const sheetsMatch = getSheetsMatch(label, media, tags, config);

      // [6.5.3] Add panorama to search index
      fuseData.push({
        type: "Panorama",
        source: source, // "main" or "root"
        index,
        originalIndex: index,
        playlistOrder: index,
        label: getResultLabel(displayLabel, businessMatch, sheetsMatch, config),
        originalLabel: label,
        subtitle: getResultDescription(
          subtitle,
          businessMatch,
          sheetsMatch,
          config,
        ),
        tags,
        businessData: businessMatch,
        businessName: businessMatch?.name,
        sheetsData: sheetsMatch,
        imageUrl: businessMatch?.imageUrl || sheetsMatch?.imageUrl || null,
        item,
        boost: businessMatch ? 2.0 : sheetsMatch ? 2.5 : label ? 1.5 : 1.0,
      });

      // [6.5.4] Process overlays in the panorama
      const overlays = _getOverlays(media, tour, item);
      _processOverlaysWithSource(
        overlays,
        fuseData,
        index,
        displayLabel,
        source,
        config,
      );
    }

    // [6.6] Overlay processing function with source tracking
    function _processOverlaysWithSource(
      overlays,
      fuseData,
      parentIndex,
      parentLabel,
      source,
      config,
    ) {
      if (!Array.isArray(overlays) || overlays.length === 0) {
        return;
      }

      overlays.forEach((overlay, overlayIndex) => {
        try {
          const overlayData = _safeGetData(overlay);

          // [6.6.1] Get overlay label
          let overlayLabel = "";
          if (overlayData.label) {
            overlayLabel = overlayData.label.trim();
          } else if (overlay.label) {
            overlayLabel = overlay.label.trim();
          } else if (typeof overlay.get === "function") {
            try {
              const label = overlay.get("label");
              if (label) overlayLabel = label.trim();
            } catch {
              // [6.6.1.1] Silent failure if label retrieval fails
            }
          }

          // [6.6.2] Skip if empty label and configured to do so
          if (!overlayLabel && config.includeContent.elements.skipEmptyLabels)
            return;

          // [6.6.3] Get element type and apply filtering
          let elementType = _getElementType(overlay, overlayLabel);
          const elementTags = Array.isArray(overlayData.tags)
            ? overlayData.tags
            : [];

          if (!_shouldIncludeElement(elementType, overlayLabel, elementTags)) {
            return;
          }

          // Get element ID
          let elementId = null;
          if (overlay.id) {
            elementId = overlay.id;
          } else if (typeof overlay.get === "function") {
            try {
              elementId = overlay.get("id");
            } catch {
              // Silent failure
            }
          }

          // [6.6.5] Create display label
          let displayLabel = overlayLabel;
          if (!displayLabel) {
            displayLabel = `${elementType} ${parentIndex}.${overlayIndex}`;
          }

          // [6.6.6] Get business match
          let businessMatch = null;
          if (
            config.businessData?.useBusinessData &&
            _businessData.length > 0
          ) {
            try {
              businessMatch = findBusinessMatch({
                name: overlayLabel,
                id: elementId,
                tags: elementTags,
                type: elementType,
              });
            } catch (error) {
              Logger.warn(
                `Error matching business data for overlay ${overlayLabel}:`,
                error,
              );
            }
          }

          // [6.6.7] Add to search data with source tracking
          fuseData.push({
            type: elementType,
            source: source, // "main" or "root"
            label:
              businessMatch && config.businessData.replaceTourData
                ? businessMatch.name || displayLabel
                : displayLabel,
            subtitle:
              businessMatch && config.businessData.replaceTourData
                ? businessMatch.description || ""
                : "",
            tags: elementTags,
            parentIndex: parentIndex,
            parentLabel: parentLabel,
            playlistOrder: parentIndex * 1000 + overlayIndex,
            id: elementId,
            businessData: businessMatch,
            businessName: businessMatch?.name,
            imageUrl: businessMatch?.imageUrl || null,
            localImage: businessMatch?.localImage || null,
            boost: businessMatch ? 1.5 : 0.8,
          });
        } catch (overlayError) {
          Logger.warn(
            `Error processing overlay at index ${overlayIndex}:`,
            overlayError,
          );
        }
      });
    }

    // [6.7] Enhanced click handler for hybrid search results
    function createHybridClickHandler(result, tour) {
      return function () {
        try {
          Logger.info(
            `Handling click for ${result.item.type} from ${result.item.source} playlist`,
          );

          // [6.7.1] Determine which playlist to use based on source
          let targetPlaylist = null;

          if (result.item.source === "main") {
            // [6.7.1.1] Use the main playlist for navigation
            targetPlaylist = tour.mainPlayList;
            Logger.info("Using main playlist for navigation");
          } else if (result.item.source === "root") {
            // [6.7.1.2] Use the root player playlist for detailed 3D content
            if (
              tour.locManager &&
              tour.locManager.rootPlayer &&
              tour.locManager.rootPlayer.mainPlayList
            ) {
              targetPlaylist = tour.locManager.rootPlayer.mainPlayList;
              Logger.info("Using root player playlist for navigation");
            } else {
              // [6.7.1.3] Fallback to main playlist if root not available
              targetPlaylist = tour.mainPlayList;
              Logger.warn(
                "Root playlist not available, falling back to main playlist",
              );
            }
          }

          if (!targetPlaylist) {
            Logger.error("No valid playlist found for navigation");
            return;
          }

          // [6.7.2] Handle different result types
          if (
            result.item.type === "Panorama" ||
            result.item.type === "3DModel"
          ) {
            // [6.7.2.1] Direct navigation for panoramas and 3D models
            if (typeof result.item.originalIndex === "number") {
              try {
                targetPlaylist.set("selectedIndex", result.item.originalIndex);
                Logger.info(
                  `Navigated to ${result.item.type} at index ${result.item.originalIndex} using ${result.item.source} playlist`,
                );
              } catch (e) {
                Logger.error(
                  `Error navigating to ${result.item.type}: ${e.message}`,
                );
              }
            }
          } else if (result.item.type === "3DModelObject") {
            // [6.7.2.2] For 3D model objects, navigate to parent model first, then trigger object
            if (
              result.item.parentIndex !== undefined &&
              result.item.parentItem
            ) {
              try {
                // [6.7.2.2.1] Navigate to the parent 3D model
                targetPlaylist.set("selectedIndex", result.item.parentIndex);
                Logger.info(
                  `Navigated to parent 3D model at index ${result.item.parentIndex}`,
                );

                // [6.7.2.2.2] Then trigger the specific object after a delay
                setTimeout(() => {
                  if (result.item.id) {
                    _triggerElement(tour, result.item.id, (success) => {
                      if (success) {
                        Logger.info(
                          `Successfully triggered 3D object ${result.item.id}`,
                        );
                      } else {
                        Logger.warn(
                          `Failed to trigger 3D object ${result.item.id}`,
                        );
                      }
                    });
                  }
                }, 500); // Delay for 3D model loading
              } catch (e) {
                Logger.error(
                  `Error navigating to parent 3D model: ${e.message}`,
                );
              }
            }
          } else if (result.item.parentIndex !== undefined) {
            // [6.7.2.3] For other child elements (hotspots, etc.), navigate to parent then trigger
            try {
              targetPlaylist.set("selectedIndex", result.item.parentIndex);
              Logger.info(
                `Navigated to parent panorama at index ${result.item.parentIndex}`,
              );

              if (result.item.id) {
                setTimeout(() => {
                  _triggerElement(tour, result.item.id, (success) => {
                    if (success) {
                      Logger.info(
                        `Successfully triggered element ${result.item.id}`,
                      );
                    } else {
                      Logger.warn(
                        `Failed to trigger element ${result.item.id}`,
                      );
                    }
                  });
                }, 300);
              }
            } catch (e) {
              Logger.error(`Error navigating to parent panorama: ${e.message}`);
            }
          }

          // [6.7.3] Handle standalone Google Sheets entries
          if (result.item.isStandalone && result.item.sheetsData) {
            const success = _triggerStandaloneElement(result.item, tour);
            if (!success) {
              Logger.warn(
                `Could not navigate to standalone entry: ${result.item.label}`,
              );
            }
          }
        } catch (error) {
          Logger.error(`Error in hybrid click handler: ${error.message}`);
        }
      };
    }

    // [6.8] Helper functions for business and sheets matching
    // [6.8.1] Get business data match for tour item
    function getBusinessMatch(label, media, tags, config) {
      if (!config.businessData?.useBusinessData || !_businessData.length)
        return null;

      try {
        return findBusinessMatch({
          name: label,
          id: media.get ? media.get("id") : media.id,
          tags: tags || [],
        });
      } catch (error) {
        Logger.warn(`Error matching business data:`, error);
        return null;
      }
    }

    // [6.8.2] Get Google Sheets match for tour item
    function getSheetsMatch(label, media, tags, config, tourItemContext) {
      if (!config.googleSheets?.useGoogleSheetData || !_googleSheetsData.length)
        return null;

      try {
        const itemId = media.get ? media.get("id") : media.id;

        // [6.8.2.1] Create a comprehensive context for matching
        const matchContext = {
          label: label || "",
          itemId: itemId || "",
          tags: tags || [],
          source: tourItemContext?.source || "unknown",
          index: tourItemContext?.index || -1,
          elementType: tourItemContext?.type || "unknown",
        };

        Logger.debug(
          `[SHEETS MATCH] Looking for match for: ${matchContext.label} (ID: ${matchContext.itemId}, Type: ${matchContext.elementType})`,
        );

        // [6.8.2.2] Find all potential matches
        const potentialMatches = _googleSheetsData.filter((entry) => {
          // [6.8.2.2.1] Method 1: Exact ID match (highest priority)
          if (
            entry.id &&
            matchContext.itemId &&
            entry.id.toString() === matchContext.itemId.toString()
          ) {
            Logger.debug(`[SHEETS MATCH] Found exact ID match: ${entry.id}`);
            return true;
          }

          // [6.8.2.2.2] Method 2: Tag-based matching (medium priority)
          if (
            entry.tag &&
            matchContext.label &&
            matchContext.label.toLowerCase().includes(entry.tag.toLowerCase())
          ) {
            Logger.debug(
              `[SHEETS MATCH] Found tag match: ${entry.tag} in ${matchContext.label}`,
            );
            return true;
          }

          // [6.8.2.2.3] Method 3: Exact name matching (lower priority, but still useful)
          if (
            entry.name &&
            matchContext.label &&
            entry.name.toLowerCase() === matchContext.label.toLowerCase()
          ) {
            Logger.debug(
              `[SHEETS MATCH] Found exact name match: ${entry.name}`,
            );
            return true;
          }

          return false;
        });

        if (potentialMatches.length === 0) {
          Logger.debug(
            `[SHEETS MATCH] No matches found for: ${matchContext.label}`,
          );
          return null;
        }

        if (potentialMatches.length === 1) {
          Logger.debug(
            `[SHEETS MATCH] Single match found: ${potentialMatches[0].name || potentialMatches[0].id}`,
          );
          return potentialMatches[0];
        }

        // [6.8.2.3] Multiple matches found - need to resolve ambiguity
        Logger.warn(
          `[SHEETS MATCH] Multiple matches found for ${matchContext.label} (${potentialMatches.length} matches)`,
        );

        // [6.8.2.3.1] Resolution strategy 1: Prefer exact ID matches
        const exactIdMatches = potentialMatches.filter(
          (entry) =>
            entry.id &&
            matchContext.itemId &&
            entry.id.toString() === matchContext.itemId.toString(),
        );

        if (exactIdMatches.length === 1) {
          Logger.info(
            `[SHEETS MATCH] Resolved to exact ID match: ${exactIdMatches[0].id}`,
          );
          return exactIdMatches[0];
        }

        // [6.8.2.3.2] Resolution strategy 2: Prefer matches that specify element type
        const typeSpecificMatches = potentialMatches.filter(
          (entry) =>
            entry.elementType &&
            entry.elementType.toLowerCase() ===
              matchContext.elementType.toLowerCase(),
        );

        if (typeSpecificMatches.length === 1) {
          Logger.info(
            `[SHEETS MATCH] Resolved to type-specific match: ${typeSpecificMatches[0].name} (${typeSpecificMatches[0].elementType})`,
          );
          return typeSpecificMatches[0];
        }

        // [6.8.2.3.3] Resolution strategy 3: Prefer matches with more specific data
        const detailedMatches = potentialMatches.filter(
          (entry) => entry.description && entry.description.length > 10, // Has substantial description
        );

        if (detailedMatches.length === 1) {
          Logger.info(
            `[SHEETS MATCH] Resolved to detailed match: ${detailedMatches[0].name}`,
          );
          return detailedMatches[0];
        }

        // [6.8.2.3.4] Resolution strategy 4: Log ambiguity and return first match
        Logger.warn(
          `[SHEETS MATCH] Could not resolve ambiguity for ${matchContext.label}. Using first match: ${potentialMatches[0].name}`,
        );
        Logger.warn(
          `[SHEETS MATCH] Consider adding unique IDs or elementType to Google Sheets for better matching`,
        );

        return potentialMatches[0];
      } catch (error) {
        Logger.warn(`[SHEETS MATCH] Error matching Google Sheets data:`, error);
        return null;
      }
    }

    // [6.8.3] Helper to get result label from various data sources
    function getResultLabel(displayLabel, businessMatch, sheetsMatch, config) {
      if (businessMatch && config.businessData.replaceTourData) {
        return businessMatch.name || displayLabel;
      }
      if (sheetsMatch && config.googleSheets.useAsDataSource) {
        return sheetsMatch.name || displayLabel;
      }
      if (businessMatch) {
        return businessMatch.name || displayLabel;
      }
      return displayLabel;
    }

    // [6.8.4] Helper to get result description from various data sources
    function getResultDescription(
      subtitle,
      businessMatch,
      sheetsMatch,
      config,
    ) {
      if (businessMatch && config.businessData.replaceTourData) {
        return businessMatch.description || "";
      }
      if (sheetsMatch && config.googleSheets.useAsDataSource) {
        return sheetsMatch.description || subtitle || "";
      }
      return subtitle || "";
    }

    // [6.9] Initialize search index
    function prepareFuse() {
      fuse = _prepareSearchIndex(tour, _config);
    }

    // [6.10] Helper for safely getting object data
    function _safeGetData(obj) {
      if (!obj) return {};

      try {
        if (obj.data) return obj.data;
        if (typeof obj.get === "function") {
          return obj.get("data") || {};
        }
        return {};
      } catch (error) {
        Logger.debug("Error getting data:", error);
        return {};
      }
    }

    // [6.11] Helper to check if a panorama should be included
    function _shouldIncludePanorama(
      label,
      subtitle,
      tags,
      index,
      filterMode,
      allowedValues,
      blacklistedValues,
      allowedMediaIndexes,
      blacklistedMediaIndexes,
    ) {
      // [6.11.1] Apply whitelist/blacklist filters
      if (filterMode === "whitelist") {
        if (label) {
          if (!allowedValues.includes(label)) {
            if (!subtitle || !allowedValues.includes(subtitle)) return false;
          }
        } else {
          if (subtitle && !allowedValues.includes(subtitle)) return false;
        }
      } else if (filterMode === "blacklist") {
        if (label && blacklistedValues.includes(label)) return false;
        if (subtitle && blacklistedValues.includes(subtitle)) return false;
      }

      // [6.11.2] For completely blank items
      const hasTags = Array.isArray(tags) && tags.length > 0;
      if (!label && !subtitle && !hasTags) {
        // Check media index filtering
        if (filterMode === "whitelist" && allowedMediaIndexes.length > 0) {
          if (!allowedMediaIndexes.includes(index)) return false;
        }
        if (filterMode === "blacklist" && blacklistedMediaIndexes.length > 0) {
          if (blacklistedMediaIndexes.includes(index)) return false;
        }
        if (!_config.includeContent.completelyBlank) return false;
      }

      // [6.11.3] Skip unlabeled items based on configuration
      if (!label) {
        const hasSubtitle = Boolean(subtitle);

        const shouldInclude =
          (hasSubtitle && _config.includeContent.unlabeledWithSubtitles) ||
          (hasTags && _config.includeContent.unlabeledWithTags) ||
          (!hasSubtitle && !hasTags && _config.includeContent.completelyBlank);

        if (!shouldInclude) return false;
      }

      return true;
    }

    // [6.12] Helper to get display label
    function _getDisplayLabel(label, subtitle, tags, itemContext) {
      // [6.12.1] Enhanced display label generation with context awareness
      const context = itemContext || {};
      const elementType = context.type || "Element";
      const itemId = context.id || "";
      const index = context.index !== undefined ? context.index : -1;

      if (_config.display.onlySubtitles && subtitle) {
        return subtitle;
      }

      if (!label) {
        if (subtitle && _config.useAsLabel.subtitles) {
          return subtitle;
        }

        if (Array.isArray(tags) && tags.length > 0 && _config.useAsLabel.tags) {
          return tags.join(", ");
        }

        if (_config.useAsLabel.elementType) {
          // [6.12.2] Make generic labels more specific to avoid duplicates
          if (itemId) {
            return `${elementType} (${itemId})`;
          } else if (index >= 0) {
            return `${elementType} ${index + 1}`;
          } else {
            return elementType;
          }
        }

        // [6.12.3] Make custom text more specific for better identification
        const customText = _config.useAsLabel.customText || "[Unnamed Item]";
        if (itemId) {
          return `${customText} (${itemId})`;
        } else if (index >= 0) {
          return `${customText} ${index + 1}`;
        }

        return customText;
      }

      return label;
    }

    // [6.13] Enhanced function for overlay detection

    function _getOverlays(media, tour, item) {
      const overlays = [];
      const overlayDetectionMethods = [
        // [6.13.1] Method 1: media.get('overlays')
        () => {
          try {
            const mediaOverlays = media.get("overlays");
            if (Array.isArray(mediaOverlays) && mediaOverlays.length > 0) {
              return mediaOverlays;
            }
          } catch (e) {
            Logger.debug("Method 1 overlay detection failed:", e);
          }
          return null;
        },

        // [6.13.2] Method 2: media.overlays
        () => {
          try {
            if (Array.isArray(media.overlays) && media.overlays.length > 0) {
              return media.overlays;
            }
          } catch (e) {
            Logger.debug("Method 2 overlay detection failed:", e);
          }
          return null;
        },

        // [6.13.3] Method 3: item's overlays directly
        () => {
          try {
            if (Array.isArray(item.overlays) && item.overlays.length > 0) {
              return item.overlays;
            }
          } catch (e) {
            Logger.debug("Method 3 overlay detection failed:", e);
          }
          return null;
        },

        // [6.13.4] Method 4: overlaysByTags
        () => {
          try {
            if (typeof media.get === "function") {
              const tagOverlays = media.get("overlaysByTags");
              if (tagOverlays && typeof tagOverlays === "object") {
                const result = [];
                Object.values(tagOverlays).forEach((tagGroup) => {
                  if (Array.isArray(tagGroup)) {
                    result.push(...tagGroup);
                  }
                });
                if (result.length > 0) {
                  return result;
                }
              }
            }
          } catch (e) {
            Logger.debug("Method 4 overlay detection failed:", e);
          }
          return null;
        },

        // [6.13.5] Method 5: Look for SpriteModel3DObject by panorama
        () => {
          try {
            if (
              tour.player &&
              typeof tour.player.getByClassName === "function"
            ) {
              const allSprites = tour.player.getByClassName(
                "SpriteModel3DObject",
              );
              if (Array.isArray(allSprites) && allSprites.length > 0) {
                // Filter sprites that belong to this specific panorama
                const mediaId = media.get ? media.get("id") : media.id;
                const panoramaSprites = allSprites.filter((sprite) => {
                  try {
                    // [6.13.5.1] Check if sprite belongs to this panorama
                    const spriteParent = sprite.get
                      ? sprite.get("parent")
                      : sprite.parent;
                    const parentId =
                      spriteParent && spriteParent.get
                        ? spriteParent.get("id")
                        : spriteParent?.id;

                    // [6.13.5.2] Also check for direct media association
                    const spriteMedia = sprite.get
                      ? sprite.get("media")
                      : sprite.media;
                    const spriteMediaId =
                      spriteMedia && spriteMedia.get
                        ? spriteMedia.get("id")
                        : spriteMedia?.id;

                    return parentId === mediaId || spriteMediaId === mediaId;
                  } catch (e) {
                    // [6.13.5.3] If we can't determine parent, include it anyway for this panorama
                    Logger.debug(
                      "Could not determine sprite parent, including in search:",
                      e,
                    );
                    return true;
                  }
                });

                if (panoramaSprites.length > 0) {
                  Logger.info(
                    `Found ${panoramaSprites.length} SpriteModel3DObject(s) for panorama ${mediaId}`,
                  );
                  return panoramaSprites;
                }
              }
            }
          } catch (e) {
            Logger.debug(
              "Enhanced SpriteModel3DObject overlay detection failed:",
              e,
            );
          }
          return null;
        },

        // [6.13.6] Method 6: FALLBACK - Include all 3D objects for first panorama if none found
        () => {
          try {
            // Only apply this fallback for the first panorama to avoid duplicates
            const currentIndex = item.get ? item.get("index") : 0;
            if (
              currentIndex === 0 &&
              tour.player &&
              typeof tour.player.getByClassName === "function"
            ) {
              const allSprites = tour.player.getByClassName(
                "SpriteModel3DObject",
              );
              if (Array.isArray(allSprites) && allSprites.length > 0) {
                Logger.info(
                  `Fallback: Adding ${allSprites.length} unassigned SpriteModel3DObject(s) to first panorama`,
                );
                return allSprites;
              }
            }
          } catch (e) {
            Logger.debug("Fallback 3D object detection failed:", e);
          }
          return null;
        },

        // [6.13.7] Method 7: Look for other 3D classes
        () => {
          try {
            if (
              tour.player &&
              typeof tour.player.getByClassName === "function"
            ) {
              const all3DObjects = [
                ...tour.player.getByClassName("Model3DObject"),
                ...tour.player.getByClassName("Sprite3DObject"),
                ...tour.player.getByClassName("SpriteHotspotObject"),
              ];

              if (all3DObjects.length > 0) {
                Logger.info(`Found ${all3DObjects.length} other 3D objects`);
                return all3DObjects;
              }
            }
          } catch (e) {
            Logger.debug("Other 3D object detection failed:", e);
          }
          return null;
        },

        // [6.13.8] Method 8: Look for child elements in the tour.player
        () => {
          try {
            if (
              tour.player &&
              typeof tour.player.getByClassName === "function"
            ) {
              const allOverlays = tour.player.getByClassName("PanoramaOverlay");
              if (Array.isArray(allOverlays) && allOverlays.length > 0) {
                // [6.13.8.1] Filter to only get overlays that belong to this panorama
                return allOverlays.filter((overlay) => {
                  try {
                    const parentMedia = overlay.get("media");
                    return (
                      parentMedia && parentMedia.get("id") === media.get("id")
                    );
                  } catch {
                    // [6.13.8.2] If we can't determine parent, include it anyway for this panorama
                    Logger.debug(
                      "Could not determine overlay parent, including in search",
                    );
                    return true;
                  }
                });
              }
            }
          } catch {
            Logger.debug("Method 8 overlay detection failed");
          }
          return null;
        },
      ];

      // [6.13.9] Try each method in sequence
      for (const method of overlayDetectionMethods) {
        const result = method();
        if (result && result.length > 0) {
          overlays.push(...result);
          Logger.debug(
            `Overlay detection method found ${result.length} overlays`,
          );
          break; // Stop after first successful method
        }
      }

      Logger.info(`Total overlays found for panorama: ${overlays.length}`);
      return overlays;
    }

    // [6.14] Process overlay elements
    function _processOverlays(overlays, fuseData, parentIndex, parentLabel) {
      if (!Array.isArray(overlays) || overlays.length === 0) {
        return;
      }

      overlays.forEach((overlay, overlayIndex) => {
        try {
          // [6.14.1] Get overlay data safely
          const overlayData = _safeGetData(overlay);

          // [6.14.2] Get overlay label
          let overlayLabel = "";
          if (overlayData.label) {
            overlayLabel = overlayData.label.trim();
          } else if (overlay.label) {
            overlayLabel = overlay.label.trim();
          } else if (typeof overlay.get === "function") {
            try {
              const label = overlay.get("label");
              if (label) overlayLabel = label.trim();
            } catch {
              // [6.14.2.1] Silent failure for missing label property
            }
          }

          // [6.14.3] If still no label, try to use other properties like text content
          if (!overlayLabel && typeof overlay.get === "function") {
            try {
              const textContent = overlay.get("text");
              if (textContent) {
                overlayLabel = textContent.substring(0, 30);
                if (textContent.length > 30) overlayLabel += "...";
              }
            } catch {
              // [6.14.3.1] Silent failure for missing text property
            }
          }

          // [6.14.4] Skip if empty label and configured to do so
          if (!overlayLabel && _config.includeContent.elements.skipEmptyLabels)
            return;

          // [6.14.5] Get element type
          let elementType = _getElementType(overlay, overlayLabel);
          if (
            overlayLabel.includes("info-") ||
            overlayLabel.includes("info_")
          ) {
            elementType = "Hotspot";
          }

          // [6.14.6] Apply element filtering
          const elementTags = Array.isArray(overlayData.tags)
            ? overlayData.tags
            : [];
          if (!_shouldIncludeElement(elementType, overlayLabel, elementTags)) {
            return;
          }

          // [6.14.7] Get element ID safely
          let elementId = null;
          if (overlay.id) {
            elementId = overlay.id;
          } else if (typeof overlay.get === "function") {
            try {
              elementId = overlay.get("id");
            } catch {
              // [6.14.7.1] Silent failure for missing id property
            }
          }

          // [6.14.8] Create a fallback label if needed
          let displayLabel = overlayLabel;
          if (!displayLabel) {
            displayLabel = `${elementType} ${parentIndex}.${overlayIndex}`;
          }

          let businessMatch = null;
          if (
            _config.businessData?.useBusinessData &&
            _businessData.length > 0
          ) {
            try {
              const elementForMatching = {
                name: overlayLabel,
                id: elementId,
                tags: elementTags,
                type: elementType,
              };
              businessMatch = findBusinessMatch(elementForMatching);
            } catch (error) {
              Logger.warn(
                `Error matching business data for overlay ${overlayLabel}:`,
                error,
              );
            }
          }

          // [6.14.9] Use business data for display if available
          let resultLabel = displayLabel;
          let resultDescription = "";
          if (businessMatch) {
            if (_config.businessData.replaceTourData) {
              resultLabel = businessMatch.name || displayLabel;
              resultDescription = businessMatch.description || "";
            }
          }
          // [6.14.10] Add to search data
          fuseData.push({
            type:
              businessMatch && _config.businessData.replaceTourData
                ? elementType
                : businessMatch
                  ? "Business"
                  : elementType,
            label: resultLabel,
            subtitle: resultDescription,
            tags: elementTags,
            parentIndex: parentIndex,
            parentLabel: parentLabel,
            playlistOrder: parentIndex * 1000 + overlayIndex,
            id: elementId,
            // [6.14.10.1] Include business data for images
            businessData: businessMatch,
            businessName: businessMatch?.name,
            imageUrl: businessMatch?.imageUrl || null,
            localImage: businessMatch?.localImage || null,
            boost: businessMatch ? 1.5 : 0.8,
          });
        } catch (overlayError) {
          Logger.warn(
            `Error processing overlay at index ${overlayIndex}:`,
            overlayError,
          );
        }
      });
    }

    // [6.15] UI BUILDING FUNCTIONS
    /**
     * Creates and inserts the search field into the container if missing.
     * @param {HTMLElement} container
     */
    function _buildSearchField(container) {
      if (!container.querySelector("#tourSearch")) {
        const searchField = document.createElement("div");
        searchField.className = "search-field";
        searchField.innerHTML = `
                    <input type="text" id="tourSearch" placeholder="${_config.searchBar.placeholder}" 
                          autocomplete="off">
                    <div class="icon-container">
                        <div class="search-icon"></div>
                        <button class="clear-button">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                `;

        // Set up ARIA attributes using helpers
        const input = searchField.querySelector("#tourSearch");
        const clearButton = searchField.querySelector(".clear-button");
        const searchIcon = searchField.querySelector(".search-icon");

        _aria.setRole(input, "searchbox");
        _aria.setLabel(input, "Search tour");
        _aria.setRole(searchField, "search");
        _aria.setLabel(clearButton, "Clear search");
        _aria.setHidden(searchIcon, true);

        container.insertBefore(searchField, container.firstChild);
      }
    }

    /**
     * [6.15.2] Creates and returns the no-results message element.
     * @returns {HTMLElement}
     */
    function _buildNoResultsMessage() {
      const noResults = document.createElement("div");
      noResults.className = "no-results";
      noResults.innerHTML = "<p>No results found</p>";
      return noResults;
    }

    /**
     * [6.15.3] Creates and inserts the search results container into the container if missing.
     * @param {HTMLElement} container
     */
    function _buildResultsContainer(container) {
      if (!container.querySelector(".search-results")) {
        const resultsContainer = document.createElement("div");
        resultsContainer.className = "search-results";

        // Set up ARIA attributes using helpers
        _aria.setRole(resultsContainer, "listbox");
        _aria.setLabel(resultsContainer, "Search results");

        // [6.15.3.2] Add results section
        const resultsSection = document.createElement("div");
        resultsSection.className = "results-section";
        resultsContainer.appendChild(resultsSection);

        // [6.15.3.3] Add no-results message
        resultsContainer.appendChild(_buildNoResultsMessage());

        container.appendChild(resultsContainer);
      }
    }

    /**
     * [6.15.4] Orchestrates building the search UI components if not present.
     * @param {HTMLElement} container
     */
    function _createSearchInterface(container) {
      if (!container) {
        Logger.error(
          "Cannot create search interface: container is null or undefined",
        );
        return;
      }

      try {
        _buildSearchField(container);
        _buildResultsContainer(container);
      } catch (error) {
        Logger.error("Error creating search interface:", error);
      }
    }

    // [6.16] Text highlighting with improved safety
    const highlightMatch = (text, term) => {
      if (!text || !term || term === "*") return text || "";

      try {
        // [6.16.1] Sanitize the search term to prevent regex errors
        const sanitizedTerm = term.replace(/[-/^$*+?.()|[\]{}]/g, "\\$&");
        const regex = new RegExp(`(${sanitizedTerm})`, "gi");
        return text.replace(regex, "<mark>$1</mark>");
      } catch (error) {
        Logger.warn("Error highlighting text:", error);
        return text;
      }
    };

    // [6.17] Get icon HTML for element types
    const getTypeIcon = (type) => {
      const icons = {
        Panorama: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                      </svg>`,
        Hotspot: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                         <circle cx="12" cy="12" r="3"></circle>
                         <circle cx="12" cy="12" r="9"></circle>
                      </svg>`,
        Polygon: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                         <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>`,
        "3DHotspot": `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                              <path d="M12 2L2 12h3v8h8v-3h2v3h8v-8h3L12 2z"></path>
                              <circle cx="16" cy="8" r="2"></circle>
                           </svg>`,
        "3DModel": `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                              <path d="M12 2L2 12h3v8h8v-3h2v3h8v-8h3L12 2z"></path>
                              <rect x="9" y="9" width="6" height="6" rx="1"></rect>
                           </svg>`,
        Video: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                       <rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect>
                       <polygon points="10 9 15 12 10 15" fill="currentColor"></polygon>
                    </svg>`,
        Webframe: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                          <rect x="2" y="2" width="20" height="16" rx="2" ry="2"></rect>
                          <line x1="2" y1="6" x2="22" y2="6"></line>
                       </svg>`,
        Image: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                       <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                       <circle cx="8.5" cy="8.5" r="1.5"></circle>
                       <path d="M21 15l-5-5L5 21"></path>
                    </svg>`,
        ProjectedImage: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                               <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                               <circle cx="8.5" cy="8.5" r="1.5"></circle>
                               <path d="M21 15l-5-5L5 21"></path>
                               <line x1="3" y1="3" x2="21" y2="21"></line>
                            </svg>`,
        Text: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <line x1="4" y1="7" x2="20" y2="7"></line>
                      <line x1="4" y1="12" x2="20" y2="12"></line>
                      <line x1="4" y1="17" x2="14" y2="17"></line>
                   </svg>`,
        Element: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                         <circle cx="12" cy="12" r="9"></circle>
                      </svg>`,
        Business: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon business-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                    <line x1="4" y1="7" x2="20" y2="7"></line>
                    <line x1="4" y1="12" x2="20" y2="12"></line>
                    <line x1="4" y1="17" x2="20" y2="17"></line>
                    <line x1="9" y1="7" x2="9" y2="22"></line>
                    <line x1="15" y1="7" x2="15" y2="22"></line>
                  </svg>`,
      };

      // [6.17.1] Return the icon for the specified type, or a default if not found
      return icons[type] || icons["Element"];
    };
    // [6.18] Group and sort search results
    const groupAndSortResults = (matches) => {
      // [6.18.1] Group results by type with business data handling
      const grouped = matches.reduce((acc, match) => {
        // [6.18.1.1] Normalize the type to ensure consistent grouping
        let type = match.item.type;

        // [6.18.1.2] Handle the replaceTourData setting
        if (_config.businessData?.useBusinessData && match.item.businessName) {
          // [6.18.1.2.1] If replaceTourData is true, use the business data type instead of "Business"
          if (_config.businessData.replaceTourData) {
            // [6.18.1.2.2] If business data has an elementType, use that, otherwise keep the original type
            type = match.item.businessData?.elementType || type;
          } else {
            // [6.18.1.2.3] If not replacing tour data, use "Business" as the group
            type = "Business";
          }
        }

        if (!acc[type]) acc[type] = [];
        acc[type].push(match);
        return acc;
      }, {});

      // [6.18.2] Sort items within each group
      Object.keys(grouped).forEach((type) => {
        grouped[type].sort((a, b) => {
          // [6.18.2.1] Primary sort by playlistOrder to respect MainPlaylist order
          if (
            a.item.playlistOrder !== undefined &&
            b.item.playlistOrder !== undefined
          ) {
            return a.item.playlistOrder - b.item.playlistOrder;
          }

          // [6.18.2.2] Secondary sort by label (alphabetical) when playlistOrder isn't available
          const labelCompare = a.item.label.localeCompare(b.item.label);
          if (labelCompare !== 0) return labelCompare;

          // [6.18.2.3] Tertiary sort by parent (if applicable)
          if (a.item.parentLabel && b.item.parentLabel) {
            return a.item.parentLabel.localeCompare(b.item.parentLabel);
          }

          return 0;
        });
      });

      return grouped;
    };

    // [6.19] Main search function with improved error handling
    performSearch = () => {
      // [6.19.1] Main search execution function
      const searchContainer = document.getElementById("searchContainer");
      if (!searchContainer) {
        Logger.error("Search container not found");
        return;
      }

      const searchInput = searchContainer.querySelector("#tourSearch");
      const searchTerm = searchInput ? searchInput.value.trim() : "";
      const clearButton = searchContainer.querySelector(".clear-button");
      const searchIcon = searchContainer.querySelector(".search-icon");
      const resultsList = searchContainer.querySelector(".results-section");
      const noResults = searchContainer.querySelector(".no-results");
      const resultsContainer = searchContainer.querySelector(".search-results");

      if (!resultsContainer || !resultsList || !noResults) {
        Logger.error("Search UI components not found");
        return;
      }

      // [6.19.1.1] Add ARIA attributes for better accessibility
      resultsContainer.setAttribute("aria-live", "polite"); // Announce changes politely
      noResults.setAttribute("role", "status"); // Mark as status for screen readers

      // [6.19.1.2] Update UI based on search term
      if (searchTerm.length > 0) {
        if (clearButton) clearButton.classList.add("visible");
        if (searchIcon) {
          searchIcon.classList.add("icon-hidden"); // Use CSS class for hidden state
          searchIcon.classList.remove("icon-visible");
        }
      } else {
        if (clearButton) clearButton.classList.remove("visible");
        if (searchIcon) {
          searchIcon.classList.add("icon-visible"); // Use CSS class for visible state
          searchIcon.classList.remove("icon-hidden");
        }
      }

      // [6.19.1.3] Skip if search term hasn't changed
      if (searchTerm === currentSearchTerm) return;
      currentSearchTerm = searchTerm;

      // [6.19.1.4] Reset results list
      resultsList.innerHTML = "";

      // [6.19.1.5] Handle empty search - hide results
      if (!searchTerm) {
        searchContainer.classList.remove("has-results");
        noResults.classList.remove("visible");
        noResults.classList.add("hidden");
        resultsContainer.classList.remove("visible");
        resultsContainer.classList.add("hidden");
        resultsList.innerHTML = ""; // No search history feature
        return;
      }

      // [6.19.1.6] Check minimum character requirement
      if (searchTerm !== "*" && searchTerm.length < _config.minSearchChars) {
        noResults.classList.remove("visible");
        noResults.classList.add("hidden");
        resultsContainer.classList.remove("visible");
        resultsContainer.classList.add("hidden");
        resultsList.innerHTML = `
                    <div class="search-min-chars" role="status" aria-live="assertive">
                        <p>Please type at least ${_config.minSearchChars} characters to search</p>
                    </div>
                `;
        return;
      }

      // [6.19.1.7] Show results container initially
      resultsContainer.classList.remove("hidden");
      resultsContainer.classList.add("visible");

      try {
        // [6.19.1.8] Ensure fuse index is initialized
        if (!fuse) {
          Logger.warn("Search index not initialized, preparing now...");
          prepareFuse();
        }

        // [6.19.1.9] Perform search
        let matches;
        if (searchTerm === "*") {
          // [6.19.1.9.1] Wildcard search shows all items
          matches = fuse._docs
            ? fuse._docs.map((item, index) => ({
                item,
                score: 0,
                refIndex: index,
              }))
            : [];
        } else {
          // [6.19.1.9.2] Process search term for special characters
          const processedTerm = _preprocessSearchTerm(searchTerm);

          // [6.19.1.9.3] Allow exact matching with = prefix
          if (
            typeof processedTerm === "string" &&
            processedTerm.startsWith("=")
          ) {
            matches = fuse.search({ $or: [{ label: processedTerm }] });
          } else {
            // [6.19.1.9.4] Use regular fuzzy search
            matches = fuse.search(processedTerm);
          }
        }

        // [6.19.1.10] Handle no results case
        if (!matches || !matches.length) {
          // [6.19.1.10.1] Remove 'has-results' if no matches
          searchContainer.classList.remove("has-results");

          // [6.19.1.10.2] Show 'no results' message
          noResults.classList.remove("hidden");
          noResults.classList.add("visible");
          noResults.setAttribute("role", "status");
          noResults.setAttribute("aria-live", "polite");

          // [6.19.1.10.3] Make results container visible but transparent
          resultsContainer.classList.remove("hidden");
          resultsContainer.classList.add("visible", "no-results-bg");

          // [6.19.1.10.4] Hide results list
          resultsList.classList.add("hidden");

          return;
        } else {
          // [6.19.1.10.5] Show results and hide 'no results'
          searchContainer.classList.add("has-results");
          noResults.classList.remove("visible");
          noResults.classList.add("hidden");
          resultsContainer.classList.remove("no-results-bg", "hidden");
          resultsContainer.classList.add("visible");
          resultsList.classList.remove("hidden");
        }

        // [6.19.1.11] Make results container accessible for screen readers
        resultsContainer.setAttribute("aria-live", "polite");
        resultsContainer.setAttribute("aria-relevant", "additions text");
        noResults.classList.remove("visible");
        noResults.classList.add("hidden");

        // [6.19.1.12] Display results
        resultsList.classList.remove("hidden");
        resultsList.classList.add("visible"); // Use CSS class for visible state
        noResults.classList.remove("visible");
        noResults.classList.add("hidden");

        // [6.19.1.13] Group and sort results
        const groupedResults = groupAndSortResults(matches);

        // [6.19.1.14] Apply type filtering based on config
        if (
          _config.filter.typeFilter?.mode === "whitelist" &&
          Array.isArray(_config.filter.typeFilter?.allowedTypes) &&
          _config.filter.typeFilter.allowedTypes.length > 0
        ) {
          // [6.19.1.14.1] Only keep allowed result types
          Object.keys(groupedResults).forEach((type) => {
            if (!_config.filter.typeFilter.allowedTypes.includes(type)) {
              delete groupedResults[type];
            }
          });
        } else if (
          _config.filter.typeFilter?.mode === "blacklist" &&
          Array.isArray(_config.filter.typeFilter?.blacklistedTypes) &&
          _config.filter.typeFilter.blacklistedTypes.length > 0
        ) {
          // [6.19.1.14.2] Remove blacklisted result types
          Object.keys(groupedResults).forEach((type) => {
            if (_config.filter.typeFilter.blacklistedTypes.includes(type)) {
              delete groupedResults[type];
            }
          });
        }

        // [6.19.1.15] Keep track of result index for ARIA attributes
        let resultIndex = 0;

        // [6.19.1.16] Define priority order for result types
        const typeOrder = [
          "Panorama",
          "Hotspot",
          "3DModel",
          "3DHotspot",
          "Polygon",
          "Video",
          "Webframe",
          "Image",
          "Text",
          "ProjectedImage",
          "Element",
          "Business",
        ];

        // [6.19.1.17] Render each group of results in priority order
        Object.entries(groupedResults)
          .sort(([typeA], [typeB]) => {
            // [6.19.1.17.1] Get index in priority array (default to end if not found)
            const indexA = typeOrder.indexOf(typeA);
            const indexB = typeOrder.indexOf(typeB);

            // [6.19.1.17.2] Handle types not in the priority list
            const valA = indexA !== -1 ? indexA : typeOrder.length;
            const valB = indexB !== -1 ? indexB : typeOrder.length;

            // [6.19.1.17.3] Sort by priority index
            return valA - valB;
          })
          .forEach(([type, results]) => {
            const groupEl = document.createElement("div");
            groupEl.className = "results-group";
            groupEl.setAttribute("data-type", type);
            groupEl.setAttribute(
              "data-header-align",
              _config.thumbnailSettings?.groupHeaderAlignment || "left",
            );
            groupEl.setAttribute(
              "data-header-position",
              _config.thumbnailSettings?.groupHeaderPosition || "top",
            );

            _aria.setRole(groupEl, "group");
            _aria.setLabel(groupEl, `${type} results`);

            // [6.19.1.17.4] Use custom label from config if available, otherwise use the original type
            const customLabel = _config.displayLabels[type] || type;

            // [6.19.1.17.5] Create group header with custom label
            groupEl.innerHTML = `
                        <div class="group-header">
                            <span class="group-title">${customLabel}</span>
                            <span class="group-count">${results.length} result${results.length !== 1 ? "s" : ""}</span>
                        </div>
                    `;

            // [6.19.1.17.6] Render each result item
            results.forEach((result) => {
              resultIndex++;
              const resultItem = document.createElement("div");
              resultItem.className = "result-item";
              _aria.setRole(resultItem, "option");
              resultItem.tabIndex = 0;
              resultItem.setAttribute("aria-posinset", resultIndex);
              _aria.setSelected(resultItem, false);
              resultItem.dataset.type = result.item.type;

              // [6.19.1.17.6.1] Add business data attributes if available
              if (
                _config.businessData?.useBusinessData &&
                result.item.businessName
              ) {
                resultItem.dataset.business = "true";
                resultItem.dataset.businessTag = result.item.businessTag || "";
              }

              // [6.19.1.17.6.2] Add Google Sheets data attributes if available
              if (
                _config.googleSheets?.useGoogleSheetData &&
                result.item.sheetsData
              ) {
                resultItem.dataset.sheets = "true";
                if (result.item.sheetsData.elementType) {
                  resultItem.dataset.sheetsType =
                    result.item.sheetsData.elementType;
                }
              }
              // [6.19.1.17.6.3] ADD CLICK/KEYBOARD HANDLER - Use our enhanced hybrid click handler
              resultItem.addEventListener(
                "click",
                createHybridClickHandler(result, window.tourInstance),
              );

              // [6.19.1.17.6.4] Also handle keyboard enter/space for accessibility
              resultItem.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  resultItem.click();
                }
              });

              resultItem.setAttribute("aria-posinset", resultIndex);
              _aria.setSelected(resultItem, false);
              resultItem.dataset.type = result.item.type;

              // Add business data attributes if available
              if (
                _config.businessData?.useBusinessData &&
                result.item.businessName
              ) {
                resultItem.dataset.business = "true";
                resultItem.dataset.businessTag = result.item.businessTag || "";
              }

              // Add Google Sheets data attributes if available
              if (
                _config.googleSheets?.useGoogleSheetData &&
                result.item.sheetsData
              ) {
                resultItem.dataset.sheets = "true";
                if (result.item.sheetsData.elementType) {
                  resultItem.dataset.sheetsType =
                    result.item.sheetsData.elementType;
                }
              }

              if (result.item.id) {
                resultItem.dataset.id = result.item.id;
              }

              if (result.item.parentIndex !== undefined) {
                resultItem.dataset.parentIndex = result.item.parentIndex;
              }

              if (result.item.index !== undefined) {
                resultItem.dataset.index = result.item.index;
              }

              // [6.19.1.17.6.7] Show parent info for child elements if configured to do so
              const parentInfo =
                result.item.type !== "Panorama" &&
                result.item.parentLabel &&
                _config.display.showParentInfo !== false
                  ? `<div class="result-parent">in ${highlightMatch(result.item.parentLabel, searchTerm)}</div>`
                  : "";

              // [6.19.1.17.6.8] Determine icon - use business icon or sheets-defined type icon as appropriate
              const iconType =
                result.item.type === "Panorama" && result.item.businessName
                  ? "Business"
                  : result.item.sheetsData?.elementType
                    ? result.item.sheetsData.elementType
                    : result.item.type;

              // [6.19.1.17.6.9] Check for available image sources
              const hasGoogleSheetsImage =
                _config.googleSheets?.useGoogleSheetData &&
                result.item.imageUrl;

              // [6.19.1.17.6.10] Extract panorama/element thumbnail URL from tour data if available
              let thumbnailUrl = "";
              try {
                // [6.19.1.17.6.10.1] First priority: Use business data image URL if available
                if (
                  result.item.businessData &&
                  result.item.businessData.imageUrl
                ) {
                  thumbnailUrl = result.item.businessData.imageUrl;
                  Logger.debug(
                    `[Thumbnail] Using business data image for ${result.item.label}: ${thumbnailUrl}`,
                  );
                }
                // [6.19.1.17.6.10.2] Second priority: Use the imageUrl directly on the result item
                else if (result.item.imageUrl) {
                  thumbnailUrl = result.item.imageUrl;
                  Logger.debug(
                    `[Thumbnail] Using direct imageUrl for ${result.item.label}: ${thumbnailUrl}`,
                  );
                }
                // [6.19.1.17.6.10.3] Third priority: Check media for thumbnail
                else if (result.item.media && result.item.media.get) {
                  // [6.19.1.17.6.10.3.1] Try to get thumbnail from media object for panoramas
                  const thumbnail = result.item.media.get("thumbnail");
                  if (thumbnail) {
                    thumbnailUrl = thumbnail;
                    Logger.debug(
                      `[Thumbnail] Found direct thumbnail for ${result.item.label}`,
                    );
                  } else {
                    // [6.19.1.17.6.10.3.2] Try to get first frame or preview image
                    const firstFrame = result.item.media.get("firstFrame");
                    const preview = result.item.media.get("preview");
                    thumbnailUrl = firstFrame || preview || "";

                    if (thumbnailUrl) {
                      Logger.debug(
                        `[Thumbnail] Using fallback image for ${result.item.label}`,
                      );
                    }
                  }
                }
              } catch (error) {
                Logger.warn(
                  `[Thumbnail] Error accessing media for ${result.item.label || "unknown item"}:`,
                  error,
                );
                thumbnailUrl = "";
              }

              // [6.19.1.17.6.11] Get thumbnail URL with business data integration
              if (_config.businessData?.useBusinessData) {
                const businessMatch = findBusinessMatch(result.item);
                console.log(
                  "[DEBUG] Business match for",
                  result.item.label,
                  ":",
                  businessMatch,
                );

                if (businessMatch) {
                  console.log(
                    "[DEBUG] Business match imageUrl:",
                    businessMatch.imageUrl,
                  );
                  console.log(
                    "[DEBUG] Business match localImage:",
                    businessMatch.localImage,
                  );

                  // [6.19.1.17.6.11.1] Use imageUrl from business match (which should now include normalized localImage)
                  if (businessMatch.imageUrl) {
                    thumbnailUrl = businessMatch.imageUrl;
                    console.log(
                      `[IMAGE DEBUG] Using business imageUrl: ${thumbnailUrl}`,
                    );
                  }
                }
              }

              // [6.19.1.17.6.12] Add debug output for URL tracing
              console.log(
                `[IMAGE DEBUG] Result ${result.item.label}: Final Image URL = ${thumbnailUrl}`,
              );

              // [6.19.1.17.6.13] Determine if we should show thumbnail based on config
              const thumbSettings = _config.thumbnailSettings || {};
              let elementTypeLower = "other";

              try {
                elementTypeLower = (result.item.type || "").toLowerCase();
                // [6.19.1.17.6.13.1] Handle empty or invalid types
                if (!elementTypeLower) {
                  elementTypeLower = "other";
                }
              } catch (error) {
                Logger.warn(
                  "[Thumbnail] Error processing element type:",
                  error,
                );
              }

              // [6.19.1.17.6.14] Check if thumbnails are enabled for this element type
              const shouldShowThumbnail =
                thumbSettings.enableThumbnails &&
                ((thumbSettings.showFor &&
                  thumbSettings.showFor[elementTypeLower] === true) ||
                  (elementTypeLower !== "panorama" &&
                    elementTypeLower !== "hotspot" &&
                    thumbSettings.showFor &&
                    thumbSettings.showFor.other === true));

              // [6.19.1.17.6.15] Only show thumbnail if enabled and we have a URL or default path
              const hasThumbnail =
                shouldShowThumbnail &&
                (thumbnailUrl ||
                  (thumbSettings.defaultImagePath &&
                    thumbSettings.defaultImagePath !== ""));

              if (thumbSettings.enableThumbnails && shouldShowThumbnail) {
                Logger.debug(
                  `[Thumbnail] Will ${hasThumbnail ? "show" : "not show"} thumbnail for ${elementTypeLower} element: ${result.item.label}`,
                );
              }

              // [6.19.1.17.6.16] Determine thumbnail size class based on configuration
              let thumbnailSizeClass = "thumbnail-medium";
              if (thumbSettings.thumbnailSize === "small") {
                thumbnailSizeClass = "thumbnail-small";
              } else if (thumbSettings.thumbnailSize === "large") {
                thumbnailSizeClass = "thumbnail-large";
              }

              // [6.19.1.17.6.17] Set the alignment data attribute on the result item for CSS to handle
              if (hasThumbnail) {
                resultItem.setAttribute(
                  "data-thumbnail-align",
                  thumbSettings.alignment === "right" ? "right" : "left",
                );
              }

              // [6.19.1.17.6.18] Update the data-icon-align attribute to match the thumbnail alignment setting
              resultItem.setAttribute(
                "data-icon-align",
                thumbSettings.alignment === "right" ? "right" : "left",
              );

              // [6.19.1.17.6.19] Safely encode attribute values to prevent HTML injection

              const safeEncode = (str) => {
                try {
                  if (!str) return "";
                  return String(str)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;");
                } catch (error) {
                  Logger.warn("[Thumbnail] Error encoding string:", error);
                  return "";
                }
              };

              const safeThumbnailUrl = safeEncode(
                thumbnailUrl || thumbSettings.defaultImagePath || "",
              );
              const safeLabel = safeEncode(
                result.item.label || "Search result",
              );

              // [6.19.1.17.6.20] Build result item content with thumbnail or icon using external CSS
              resultItem.innerHTML = `
    ${
      hasThumbnail
        ? `
    <div class="result-image ${thumbnailSizeClass}">
        <img src="${safeThumbnailUrl}" 
             alt="${safeLabel}" 
             data-original-src="${safeThumbnailUrl}"
             data-tried-formats=""
             loading="lazy"
             onerror="this.handleImageError();">
    </div>`
        : `
    <div class="result-icon">${getTypeIcon(iconType)}</div>`
    }
    <div class="result-content">
        <div class="result-text">${highlightMatch(result.item.label, searchTerm)}</div>
        
        ${
          _config.businessData?.useBusinessData &&
          result.item.businessName &&
          result.item.originalLabel
            ? `
            <div class="result-business-context">
                Location: ${highlightMatch(result.item.originalLabel, searchTerm)}
            </div>
        `
            : ""
        }
        
        ${
          _config.googleSheets?.useGoogleSheetData &&
          result.item.sheetsData &&
          !hasGoogleSheetsImage
            ? `
            <div class="result-sheets-attribution">
                <span class="sheets-indicator">✓</span> Enhanced data
            </div>
        `
            : ""
        }
        ${parentInfo}
        ${
          result.item.tags &&
          result.item.tags.length > 0 &&
          _config.showTagsInResults
            ? `
            <div class="result-tags">
                Tags: ${highlightMatch(Array.isArray(result.item.tags) ? result.item.tags.join(", ") : result.item.tags, searchTerm)}
            </div>
        `
            : ""
        }
        ${
          !_config.display.onlySubtitles &&
          result.item.subtitle &&
          _config.display.showSubtitlesInResults !== false
            ? `
            <div class="result-description">${highlightMatch(result.item.subtitle, searchTerm)}</div>
        `
            : ""
        }
    </div>
`;

              // [6.19.1.17.6.21] Add the handleImageError method to the image
              const imgElement = resultItem.querySelector("img");
              if (imgElement) {
                imgElement.handleImageError = function () {
                  const originalSrc = this.getAttribute("data-original-src");
                  const triedFormats =
                    this.getAttribute("data-tried-formats") || "";

                  // [6.19.1.17.6.21.1] Try different image formats
                  if (originalSrc && !triedFormats.includes("format-switch")) {
                    const path = originalSrc;
                    let newPath = "";

                    // [6.19.1.17.6.21.2] Logic to try different extensions
                    if (
                      path.toLowerCase().endsWith(".jpg") ||
                      path.toLowerCase().endsWith(".jpeg")
                    ) {
                      // Try PNG instead
                      newPath = path.replace(/\.(jpg|jpeg)$/i, ".png");
                      this.setAttribute(
                        "data-tried-formats",
                        triedFormats + ",format-switch",
                      );
                      console.log(
                        "Image not found, trying PNG format:",
                        newPath,
                      );
                      this.src = newPath;
                      return;
                    } else if (path.toLowerCase().endsWith(".png")) {
                      // Try JPG instead
                      newPath = path.replace(/\.png$/i, ".jpg");
                      this.setAttribute(
                        "data-tried-formats",
                        triedFormats + ",format-switch",
                      );
                      console.log(
                        "Image not found, trying JPG format:",
                        newPath,
                      );
                      this.src = newPath;
                      return;
                    }
                  }

                  // [6.19.1.17.6.21.3] If all formats failed or can't determine format, try the default image
                  if (!triedFormats.includes("default")) {
                    this.setAttribute(
                      "data-tried-formats",
                      triedFormats + ",default",
                    );
                    const defaultImage =
                      _config.thumbnailSettings.defaultImages[iconType] ||
                      _config.thumbnailSettings.defaultImages.default ||
                      "./search-pro-non-mod/assets/default-thumbnail.jpg";
                    console.log("Trying default image:", defaultImage);
                    this.src = defaultImage;
                    return;
                  }

                  // [6.19.1.17.6.21.4] If even default image fails, hide the image
                  console.error(
                    "All image formats failed to load:",
                    originalSrc,
                  );
                  this.classList.add("hidden");
                };
              }
              // [6.19.1.17.6.22] Add click handler with improved element triggering
              resultItem.addEventListener("click", () => {
                // [6.19.1.17.6.22.1] Handle different element types
                if (result.item.type === "Panorama") {
                  // [6.19.1.17.6.22.2] Direct navigation for panoramas
                  if (
                    tour &&
                    tour.mainPlayList &&
                    typeof result.item.index === "number"
                  ) {
                    try {
                      tour.mainPlayList.set("selectedIndex", result.item.index);
                      Logger.info(
                        `Navigated to panorama at index ${result.item.index}`,
                      );
                    } catch (e) {
                      Logger.error(
                        `Error navigating to panorama: ${e.message}`,
                      );
                    }
                  }
                } else if (result.item.parentIndex !== undefined) {
                  // [6.19.1.17.6.22.3] For child elements, navigate to parent panorama first
                  if (tour && tour.mainPlayList) {
                    try {
                      tour.mainPlayList.set(
                        "selectedIndex",
                        result.item.parentIndex,
                      );
                      Logger.info(
                        `Navigated to parent panorama at index ${result.item.parentIndex}`,
                      );

                      // [6.19.1.17.6.22.4] Then trigger the element with retry logic
                      if (result.item.id) {
                        _triggerElement(tour, result.item.id, (success) => {
                          if (success) {
                            Logger.info(
                              `Successfully triggered element ${result.item.id}`,
                            );
                          } else {
                            Logger.warn(
                              `Failed to trigger element ${result.item.id}`,
                            );
                          }
                        });
                      }
                    } catch (e) {
                      Logger.error(
                        `Error navigating to parent panorama: ${e.message}`,
                      );
                    }
                  }
                }

                // [6.19.1.17.6.22.5] Clear search input
                if (searchInput) {
                  searchInput.value = "";
                  searchInput.focus();
                }

                // [6.19.1.17.6.22.6] Auto-hide based on configuration
                const isMobile = window.innerWidth <= _config.mobileBreakpoint;
                if (
                  (isMobile && _config.autoHide.mobile) ||
                  (!isMobile && _config.autoHide.desktop)
                ) {
                  _toggleSearch(false);
                }
              });

              // [6.19.1.17.6.23] Add keyboard navigation
              resultItem.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  resultItem.click();
                }
              });

              // [6.19.1.17.6.24] Add to group
              groupEl.appendChild(resultItem);
            });

            // [6.19.1.17.7] Add group to results list
            resultsList.appendChild(groupEl);
          });

        // [6.19.1.18] Update ARIA attribute for total results
        resultsContainer.setAttribute("aria-setsize", resultIndex);
      } catch (error) {
        Logger.error("Search error:", error);
        // [6.19.1.19] Show error message in results
        resultsList.innerHTML = `
                <div class="search-error" role="alert">
                    <p>An error occurred while searching. Please try again.</p>
                    <p class="search-error-details">${error.message}</p>
                </div>
            `;

        // [6.19.1.20] Keep container visible for error messages
        resultsContainer.classList.remove("hidden");
        resultsContainer.classList.add("visible");
        resultsContainer.classList.remove("no-results-bg"); // Use normal background for errors
      }
    };

    // [6.20] Set up keyboard navigation
    // [6.20.1] Initialize the keyboard manager with the search container and input
    keyboardCleanup = keyboardManager.init(
      _elements.container,
      _elements.container.querySelector("#tourSearch"),
      performSearch,
    );

    // [6.21] Bind search event listeners for UI interactions
    _bindSearchEventListeners(
      _elements.container,
      _elements.container.querySelector("#tourSearch"),
      _elements.container.querySelector(".clear-button"),
      _elements.container.querySelector(".search-icon"),
      performSearch, // Pass the module-level performSearch function
    );

    // [6.22] Prepare the search index
    prepareFuse();

    // [6.23] Apply search styling
    _applySearchStyling();

    // [6.24] Apply custom CSS for showing/hiding tags
    let styleElement = document.getElementById("search-custom-styles");
    if (styleElement) {
      styleElement.remove();
    }

    document.body.classList.toggle(
      "show-result-tags",
      _config.showTagsInResults,
    );

    // [6.25] Get key elements
    const searchInput = _elements.container.querySelector("#tourSearch");
    const clearButton = _elements.container.querySelector(".clear-button");
    const searchIcon = _elements.container.querySelector(".search-icon");

    // [6.26] Bind all event listeners
    _bindSearchEventListeners(
      _elements.container,
      searchInput,
      clearButton,
      searchIcon,
      performSearch, // Pass the module-level performSearch function
    );

    // [6.27] Mark initialization as complete
    window.searchListInitialized = true;
    _initialized = true;
    Logger.info("Enhanced search initialized successfully");
  }

  // [7.0] Search visibility toggle
  let _lastToggleTime = 0;
  let _toggleDebounceTime = 300; // ms
  let _isSearchVisible = false; // Track the current state

  // [7.1] Toggle search function to handle rapid toggles
  function _toggleSearch(show) {
    // [7.2] Toggle search visibility
    // [7.2.1] Get current state
    const currentlyVisible =
      _elements.container && _elements.container.classList.contains("visible");
    _isSearchVisible = currentlyVisible;

    // [7.2.2] If 'show' is explicitly specified and matches current state, debounce it
    if (
      show !== undefined &&
      ((show && currentlyVisible) || (!show && !currentlyVisible))
    ) {
      console.log(`[toggleSearch] Ignoring duplicate state request: ${show}`);
      return;
    }
    // [7.2.3] Debounce logic for double-calls from 3DVista toggle button
    const now = Date.now();
    if (now - _lastToggleTime < _toggleDebounceTime) {
      console.log("[toggleSearch] Ignoring rapid toggle call, debouncing");
      return; // Ignore rapid repeated calls
    }
    _lastToggleTime = now;
    // [7.2.4] Enable proper toggle functionality without modifying 3DVista button code
    if (show === undefined) {
      // [7.2.4.1] When no parameter is provided, toggle the current visibility state
      const isCurrentlyVisible =
        _elements.container &&
        _elements.container.classList.contains("visible");
      show = !isCurrentlyVisible;
      console.log(
        "[toggleSearch] Toggle request - changing visibility to:",
        show,
      );
    }

    if (window.searchProDebug?.logSearchToggle) {
      window.searchProDebug.logSearchToggle(show, _elements);
    }
    try {
      const searchContainer = _elements.container;
      const resultsContainer = searchContainer
        ? searchContainer.querySelector(".search-results")
        : null;
      const resultsSection = searchContainer
        ? searchContainer.querySelector(".results-section")
        : null;
      const noResults = searchContainer
        ? searchContainer.querySelector(".no-results")
        : null;
      Logger.debug("[toggleSearch] Called with show =", show);
      if (!searchContainer) {
        Logger.error("[toggleSearch] ERROR: searchContainer not found");
      } else {
        Logger.debug(
          "[toggleSearch] searchContainer display:",
          getComputedStyle(searchContainer).display,
        );
      }
      if (resultsContainer) {
        Logger.debug(
          "[toggleSearch] resultsContainer display:",
          getComputedStyle(resultsContainer).display,
        );
      } else {
        Logger.debug("[toggleSearch] resultsContainer not found");
      }
      if (resultsSection) {
        console.log(
          "[toggleSearch] resultsSection display:",
          getComputedStyle(resultsSection).display,
        );
        console.log(
          "[toggleSearch] resultsSection innerHTML:",
          resultsSection.innerHTML,
        );
      } else {
        console.log("[toggleSearch] resultsSection not found");
      }
      if (noResults) {
        console.log(
          "[toggleSearch] noResults display:",
          getComputedStyle(noResults).display,
        );
      } else {
        console.log("[toggleSearch] noResults not found");
      }
    } catch (err) {
      console.error("[toggleSearch] Diagnostics error:", err);
    }

    // [7.2.5] Validate container exists
    if (!_elements.container) {
      Logger.error("Search container not found");
      return;
    }

    // [7.2.6] Show search

    if (show) {
      console.log("[toggleSearch] Showing search UI");
      // [7.2.6.1] Update display before animation

      _elements.container.classList.remove("hidden");
      _elements.container.classList.add("visible");
      try {
        const resultsSection =
          _elements.container.querySelector(".results-section");
        if (resultsSection) {
          console.log(
            "[toggleSearch] After display block, resultsSection innerHTML:",
            resultsSection.innerHTML,
          );
          console.log(
            "[toggleSearch] After display block, resultsSection display:",
            getComputedStyle(resultsSection).display,
          );
        }
      } catch (err) {
        console.error(
          "[toggleSearch] Error logging resultsSection after display block:",
          err,
        );
      }

      // Set ARIA expanded state
      _aria.setExpanded(_elements.container, true);

      // [7.2.6.3] Ensure it's within viewport bounds
      const viewportHeight = window.innerHeight;
      const searchContainerRect = _elements.container.getBoundingClientRect();
      const searchContainerTop = searchContainerRect.top;
      const searchContainerHeight = searchContainerRect.height;

      // [7.2.6.4] Adjust position if needed to keep within viewport
      if (searchContainerTop + searchContainerHeight > viewportHeight) {
        const newTop = Math.max(
          10,
          viewportHeight - searchContainerHeight - 20,
        );
        _elements.container.style.setProperty("--container-top", `${newTop}px`);
      }

      // [7.2.6.5] Trigger animation on next frame
      requestAnimationFrame(() => {
        _elements.container.classList.add("visible");
        try {
          const resultsSection =
            _elements.container.querySelector(".results-section");
          if (resultsSection) {
            console.log(
              "[toggleSearch] After .visible add, resultsSection innerHTML:",
              resultsSection.innerHTML,
            );
            console.log(
              "[toggleSearch] After .visible add, resultsSection display:",
              getComputedStyle(resultsSection).display,
            );
          }
        } catch (err) {
          console.error(
            "[toggleSearch] Error logging resultsSection after .visible add:",
            err,
          );
        }

        // [7.2.6.5.1] Focus input field
        if (_elements.input) {
          _elements.input.focus();
          Logger.debug("[toggleSearch] Focused search input");
        }
      });
    } else {
      // [7.2.7] Hide search
      _elements.container.classList.remove("visible");
      try {
        const resultsSection =
          _elements.container.querySelector(".results-section");
        if (resultsSection) {
          console.log(
            "[toggleSearch] After .visible remove, resultsSection innerHTML:",
            resultsSection.innerHTML,
          );
          console.log(
            "[toggleSearch] After .visible remove, resultsSection display:",
            getComputedStyle(resultsSection).display,
          );
        }
      } catch (err) {
        console.error(
          "[toggleSearch] Error logging resultsSection after .visible remove:",
          err,
        );
      }

      // [7.2.7.1] Reset search results container
      const resultsContainer =
        _elements.container.querySelector(".search-results");
      if (resultsContainer) {
        resultsContainer.classList.remove("visible", "no-results-bg");
        resultsContainer.classList.add("hidden");
      }

      // Set ARIA expanded state
      _aria.setExpanded(_elements.container, false);

      // [7.2.7.3] Wait for transition to complete before hiding
      setTimeout(() => {
        if (!_elements.container.classList.contains("visible")) {
          _elements.container.classList.remove("visible");
          _elements.container.classList.add("hidden");
          try {
            const resultsSection =
              _elements.container.querySelector(".results-section");
            if (resultsSection) {
              console.log(
                "[toggleSearch] After display none, resultsSection innerHTML:",
                resultsSection.innerHTML,
              );
              console.log(
                "[toggleSearch] After display none, resultsSection display:",
                getComputedStyle(resultsSection).display,
              );
            }
          } catch (err) {
            console.error(
              "[toggleSearch] Error logging resultsSection after display none:",
              err,
            );
          }
        }
      }, 350);

      // [7.2.7.4] Clean up after animation
      setTimeout(() => {
        // [7.2.7.4.1] Reset input and UI
        if (_elements.input) {
          _elements.input.value = "";
          _elements.input.blur();
          Logger.debug("[toggleSearch] Cleared and blurred search input");
        }
      }, 400);

      // [7.2.7.5] Clear UI elements
      setTimeout(() => {
        // [7.2.7.5.1] Update cached elements
        if (_elements.clearButton) {
          _elements.clearButton.classList.remove("visible");
          Logger.debug("[toggleSearch] Cleared clearButton visibility");
        }

        if (_elements.searchIcon) {
          _elements.searchIcon.classList.remove("icon-hidden");
          _elements.searchIcon.classList.add("icon-visible");
          Logger.debug("[toggleSearch] Reset searchIcon opacity");
        }

        // [7.2.7.5.2] Clear results
        if (_elements.results) {
          const resultsList =
            _elements.container.querySelector(".results-section");
          if (resultsList) {
            resultsList.innerHTML = "";
            Logger.debug("[toggleSearch] Cleared resultsSection innerHTML");
          }
        }

        // [7.2.7.5.3] Hide any error messages
        const noResults = _elements.container.querySelector(".no-results");
        if (noResults) {
          noResults.classList.remove("visible");
          noResults.classList.add("hidden");
          console.log("[toggleSearch] Hid noResults");
        }
      }, 200); // Match the CSS transition duration
    }
  }

  // [8.0] PUBLIC API
  return {
    // [8.1] DOM elements cache
    elements: _elements,
    // [8.2] Initialize search functionality
    initializeSearch: function (tour) {
      try {
        if (!tour) {
          throw new Error("Tour instance is required for initialization");
        }

        // [8.2.1] Find the search container if it's not already set
        if (!_elements.container) {
          _elements.container = document.getElementById("searchContainer");
          if (!_elements.container) {
            throw new Error(
              "Search container not found. Element with ID 'searchContainer' is required.",
            );
          }
        }

        _initializeSearch(tour);
      } catch (error) {
        Logger.error("Search initialization failed:", error);
      }
    },

    // [8.3] Toggle search visibility
    toggleSearch: function (show) {
      // Find the search container if it's not already set
      if (!_elements.container) {
        _elements.container = document.getElementById("searchContainer");
        if (!_elements.container) {
          Logger.error(
            "Search container not found. Element with ID 'searchContainer' is required.",
          );
          return;
        }
      }
      _toggleSearch(show);
    },

    // [8.4] Update configuration
    updateConfig: function (newConfig) {
      try {
        // [8.4.1] Validate configuration object
        if (!newConfig || typeof newConfig !== "object") {
          throw new Error("Invalid configuration object");
        }

        // [8.4.2] Deep merge function
        function deepMerge(target, source) {
          // [8.4.2.1] Handle null/undefined values
          if (!source) return target;
          if (!target) return source;

          for (const key in source) {
            // [8.4.2.2] Skip prototype properties and undefined values
            if (
              !Object.prototype.hasOwnProperty.call(source, key) ||
              source[key] === undefined
            ) {
              continue;
            }

            // [8.4.2.3] Deep merge for objects that aren't arrays
            if (
              source[key] &&
              typeof source[key] === "object" &&
              !Array.isArray(source[key])
            ) {
              // [8.4.2.3.1] Create empty target object if needed
              if (!target[key] || typeof target[key] !== "object") {
                target[key] = {};
              }

              // [8.4.2.3.2] Recurse for nested objects
              deepMerge(target[key], source[key]);
            } else {
              // [8.4.2.4] Direct assignment for primitives and arrays
              target[key] = source[key];
            }
          }

          return target;
        }

        // [8.4.3] Use the ConfigBuilder if the format is appropriate
        if (typeof newConfig === "object" && !Array.isArray(newConfig)) {
          if (
            newConfig.display ||
            newConfig.includeContent ||
            newConfig.filter ||
            newConfig.useAsLabel ||
            newConfig.appearance ||
            newConfig.searchBar
          ) {
            // [8.4.3.1] Looks like a configuration object suitable for the builder
            const builder = new ConfigBuilder();

            if (newConfig.display) {
              builder.setDisplayOptions(newConfig.display);
            }

            if (newConfig.includeContent) {
              builder.setContentOptions(newConfig.includeContent);
            }

            if (newConfig.filter) {
              builder.setFilterOptions(newConfig.filter);
            }

            if (newConfig.useAsLabel) {
              builder.setLabelOptions(newConfig.useAsLabel);
            }

            if (newConfig.appearance) {
              builder.setAppearanceOptions(newConfig.appearance);
            }

            if (newConfig.searchBar) {
              builder.setSearchBarOptions(newConfig.searchBar);
            }

            if (newConfig.displayLabels) {
              builder.setDisplayLabels(newConfig.displayLabels);
            }

            // [8.4.3.2] General options
            builder.setGeneralOptions(newConfig);

            // [8.4.3.3] Build the config
            const builtConfig = builder.build();

            // [8.4.3.4] Merge with existing config
            _config = deepMerge(_config, builtConfig);
          } else {
            // [8.4.3.5] Not structured for the builder, just deep merge
            _config = deepMerge(_config, newConfig);
          }
        }

        // [8.4.4] Apply styling updates
        _applySearchStyling();

        // [8.4.5] Reinitialize if already initialized
        if (_initialized && window.tourInstance) {
          _initializeSearch(window.tourInstance);
        }

        // [8.4.6] Debug Google Sheets URL
        console.log(
          "[DEBUG] Google Sheets URL being used:",
          window.searchFunctions.getConfig().googleSheets.googleSheetUrl,
        );

        // [8.4.7] Test the Google Sheets URL manually
        fetch(window.searchFunctions.getConfig().googleSheets.googleSheetUrl)
          .then((response) => {
            console.log(
              "[DEBUG] Google Sheets fetch response status:",
              response.status,
            );
            return response.text();
          })
          .then((text) => {
            console.log(
              "[DEBUG] Google Sheets data preview:",
              text.substring(0, 500),
            );
          })
          .catch((error) => {
            console.error("[DEBUG] Google Sheets fetch error:", error);
          });

        return this.getConfig();
      } catch (error) {
        Logger.error("Error updating configuration:", error);
        return this.getConfig();
      }
    },

    // [8.5] Get current configuration
    getConfig: function () {
      try {
        return JSON.parse(JSON.stringify(_config));
      } catch (error) {
        Logger.error("Error getting configuration:", error);
        return {};
      }
    },

    // [8.6] Search history management
    searchHistory: {
      get() {
        return []; // No history feature
      },
      clear() {
        return true; // No history feature
      },
      save(term) {
        return true; // No history feature
      },
    },

    // [8.7] Logging control
    setLogLevel(level) {
      // Use the centralized Logger's setLevel method instead of directly modifying Logger.level
      return Logger.setLevel(level);
    },

    // [8.8] Utility functions
    utils: {
      debounce: _debounce,
      getElementType: _getElementType,
      triggerElement: _triggerElement,
      normalizeImagePath: _normalizeImagePath,

      // [8.8.1] Utility for image handling
      imageUtils: {
        getImageExtension: function (path) {
          if (!path) return "";
          const match = path.match(/\.([^.]+)$/);
          return match ? match[1].toLowerCase() : "";
        },

        isImagePath: function (path) {
          if (!path) return false;
          const ext = this.getImageExtension(path);
          return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
        },

        getAlternateFormat: function (path) {
          if (!path) return "";
          const ext = this.getImageExtension(path);

          if (ext === "jpg" || ext === "jpeg") {
            return path.replace(/\.(jpg|jpeg)$/i, ".png");
          } else if (ext === "png") {
            return path.replace(/\.png$/i, ".jpg");
          }

          return "";
        },
      },
    },

    // [8.9] Expose Google Sheets data accessor
    _getGoogleSheetsData: function () {
      return _googleSheetsData || [];
    },
    // [8.10] Expose business data accessor
    _getBusinessData: function () {
      return _businessData || [];
    },

    // [8.11] Expose search index accessor
    getSearchIndex: function () {
      return fuse ? fuse._docs || [] : [];
    },

    // [8.12] Expose business matching function
    findBusinessMatch: function (elementData) {
      return findBusinessMatch(elementData);
    },
  };
})();

// [9.0] GLOBAL EXPORTS
window.searchFunctions = window.tourSearchFunctions;

// [9.1] Combined playlist readiness detection utility
function ensurePlaylistsReady(callback) {
  if (
    window.tour &&
    window.tour._isInitialized &&
    window.tour.mainPlayList &&
    typeof window.tour.mainPlayList.get === "function" &&
    window.tour.mainPlayList.get("items") &&
    window.tour.mainPlayList.get("items").length > 0
  ) {
    callback();
    return;
  }
  if (
    window.tour &&
    typeof window.TDV !== "undefined" &&
    window.TDV.Tour &&
    window.TDV.Tour.EVENT_TOUR_LOADED &&
    typeof window.tour.bind === "function"
  ) {
    window.tour.bind(window.TDV.Tour.EVENT_TOUR_LOADED, callback);
  } else {
    setTimeout(() => ensurePlaylistsReady(callback), 100);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // [9.1] Wait for a short time to ensure DOM is stable
  setTimeout(function () {
    if (!window.Logger || typeof window.Logger.debug !== "function") {
      console.warn(
        "[Search] Logger not properly initialized, using console fallback",
      );
      window.Logger = window.Logger || {};
      window.Logger.debug =
        window.Logger.debug ||
        function (msg, ...args) {
          console.debug("[Search] DEBUG:", msg, ...args);
        };
      window.Logger.info =
        window.Logger.info ||
        function (msg, ...args) {
          console.info("[Search] INFO:", msg, ...args);
        };
      window.Logger.warn =
        window.Logger.warn ||
        function (msg, ...args) {
          console.warn("[Search] WARN:", msg, ...args);
        };
      window.Logger.error =
        window.Logger.error ||
        function (msg, ...args) {
          console.error("[Search] ERROR:", msg, ...args);
        };
    }
    // [9.1.1] Find the search container in DOM
    const containerEl = document.getElementById("searchContainer");

    // [9.1.2] If container exists in DOM but not in cache, update the cache
    if (
      containerEl &&
      (!window.searchFunctions || !window.searchFunctions.elements.container)
    ) {
      Logger.debug(
        "[Search] Found existing searchContainer in DOM, updating element cache",
      );

      // [9.1.2.1] Update the elements cache directly
      if (window.searchFunctions && window.searchFunctions.elements) {
        window.searchFunctions.elements.container = containerEl;

        // [9.1.2.1.1] Also update child element references
        window.searchFunctions.elements.input =
          containerEl.querySelector("#tourSearch");
        window.searchFunctions.elements.results =
          containerEl.querySelector(".search-results");
        window.searchFunctions.elements.clearButton =
          containerEl.querySelector(".clear-button");
        window.searchFunctions.elements.searchIcon =
          containerEl.querySelector(".search-icon");
      }
    }

    // [9.1.3] Now update the config - this should work with the updated element references
    if (window.searchFunctions) {
      window.searchFunctions.updateConfig({
        businessData: {
          useBusinessData: false, // *** true or false - Disabled businessData JSON by default
          businessDataFile: "business.json",
          businessDataDir: "business-data",
          matchField: "id",
          businessDataUrl: `${window.location.origin}${window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/"))}/search-pro-non-mod/business-data/business.json`,
        },

        googleSheets: {
          useGoogleSheetData: true, // *** true or false - Disabled Google Sheets by default
          includeStandaloneEntries: true,
          googleSheetUrl:
            "https://docs.google.com/spreadsheets/d/e/2PACX-1vQrQ9oy4JjwYAdTG1DKne9cu76PZCrZgtIOCX56sxVoBwRzys36mTqvFMvTE2TB-f-k5yZz_uWwW5Ou/pub?output=csv",
          fetchMode: "csv",
          useAsDataSource: true,
          csvOptions: {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
          },
          caching: {
            enabled: false,
            timeoutMinutes: 60,
            storageKey: "tourGoogleSheetsData",
          },
        },

        // [9.1.3.1] ENHANCED: Add comprehensive thumbnail support
        thumbnailSettings: {
          enableThumbnails: true, // *** Set to true to enable thumbnails
          thumbnailSize: "medium",
          thumbnailSizePx: 48,
          borderRadius: 4,
          defaultImagePath: "./search-pro-non-mod/assets/default-thumbnail.jpg",
          defaultImages: {
            Panorama: "./search-pro-non-mod/assets/default-thumbnail.jpg",
            Hotspot: "./search-pro-non-mod/assets/hotspot-default.jpg",
            Polygon: "./search-pro-non-mod/assets/polygon-default.jpg",
            Video: "./search-pro-non-mod/assets/video-default.jpg",
            Webframe: "./search-pro-non-mod/assets/webframe-default.jpg",
            Image: "./search-pro-non-mod/assets/image-default.jpg",
            Text: "./search-pro-non-mod/assets/text-default.jpg",
            ProjectedImage:
              "./search-pro-non-mod/assets/projected-image-default.jpg",
            Element: "./search-pro-non-mod/assets/element-default.jpg",
            Business: "./search-pro-non-mod/assets/business-default.jpg",
            "3DModel": "./search-pro-non-mod/assets/3d-model-default.jpg",
            "3DHotspot": "./search-pro-non-mod/assets/3d-hotspot-default.jpg",
            "3DModelObject":
              "./search-pro-non-mod/assets/3d-model-object-default.jpg",
            default: "./search-pro-non-mod/assets/default-thumbnail.jpg",
          },
          alignment: "left",
          groupHeaderAlignment: "left",
          groupHeaderPosition: "top",
          showFor: {
            panorama: true,
            hotspot: true,
            polygon: true,
            video: true,
            webframe: true,
            image: true,
            text: true,
            projectedImage: true,
            element: true,
            business: true,
            "3dmodel": true,
            "3dhotspot": true,
            "3dmodelobject": true,
            other: true,
          },
        },

        // [9.1.3.2] ENHANCED: Add comprehensive element inclusion options
        includeContent: {
          elements: {
            includeHotspots: true,
            includePolygons: true,
            includeVideos: true,
            includeWebframes: true,
            includeImages: true,
            includeText: true,
            includeProjectedImages: true,
            includeElements: true,
            include3DHotspots: true,
            include3DModels: true,
            include3DModelObjects: false,
            includeBusiness: true,
            skipEmptyLabels: false,
            minLabelLength: 0,
          },
        },

        // [9.1.3.3] ENHANCED: Add comprehensive filtering options
        filter: {
          elementTypes: {
            mode: "none", // "none", "whitelist", "blacklist"
            allowedTypes: [], // e.g., ["Panorama", "Hotspot", "3DModel", "3DHotspot"]
            blacklistedTypes: [], // e.g., ["Text", "Element"]
          },
          elementLabels: {
            mode: "none", // "none", "whitelist", "blacklist"
            allowedValues: [], // e.g., ["Room", "Office"]
            blacklistedValues: [], // e.g., ["test", "temp"]
          },
          tagFiltering: {
            mode: "none", // "none", "whitelist", "blacklist"
            allowedTags: [], // e.g., ["important", "featured"]
            blacklistedTags: [], // e.g., ["hidden", "internal"]
          },
        },

        // [9.1.3.4] ENHANCED: Add updated display labels
        displayLabels: {
          Panorama: "Panorama",
          Hotspot: "Hotspot",
          Polygon: "Polygon",
          Video: "Video",
          Webframe: "Webframe",
          Image: "Image",
          Text: "Text",
          ProjectedImage: "Projected Image",
          Element: "Element",
          Business: "Business",
          "3DHotspot": "3D Hotspot",
          "3DModel": "3D Model",
          Model3D: "3D Model",
          "3DModelObject": "3D Model Object",
        },
      });

      // [9.1.4] Add debug logging to verify Google Sheets configuration
      Logger.debug(
        "[DEBUG] Google Sheets Config Applied:",
        window.searchFunctions.getConfig().googleSheets,
      );

      // [9.1.5] Force reinitialization if tour is available
      if (window.tourInstance) {
        Logger.info(
          "[GOOGLE SHEETS] Reinitializing search with updated config",
        );
        window.searchFunctions.initializeSearch(window.tourInstance);
      }
    }
  }, 100);
});
