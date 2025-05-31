/*
====================================
3DVista Enhanced Search Script
Version: 1.0.6
Last Updated: 05/29/2025 (Non-Modular - working)
Description:
- Core search functionality for 3DVista tours with advanced element detection, filtering, and UI controls.
- Optimized for both desktop and mobile.
- Fully removes search history (recent searches) from both the backend logic and UI.
- Implements robust diagnostics, improved error handling, and idempotent UI/DOM initialization.
- Refactored to ensure all initialization, toggle, and search operations are safe, reliable, and compatible with 3DVista's API lifecycle.

IMPORTANT:
- The ONLY supported entry point for starting search is to call:
      window.tourSearchFunctions.initializeSearch(window.tour)
  AFTER the tour has loaded.
- This script must remain compatible with iframe and cross-window tour communication.

====================================
*/
// [1.0] GLOBAL/MODULE SCOPE VARIABLES
// Simple Logger shim for environments without a custom Logger
const Logger = {
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

// Placeholder markup for search container (replace with real markup as needed)
const SEARCH_MARKUP = '<div id="searchContainer"></div>';

// Cross-window communication channel (BroadcastChannel API)
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

// Cleanup for search event listeners
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

// Shared selection index for search results
let selectedIndex = -1;

// [1.1] CORE INITIALIZATION FUNCTION
function init() {
  if (window.searchListInitialized) {
    // Already initialized, do nothing
    return;
  }

  // [1.1.1] Internal initialization function
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

// Expose init as a public method for robust initialization
window.tourSearchInit = init;

// [2.0] SCRIPT LOADER AND INITIALIZATION
(function () {
  // [2.1] Forward declarations for functions/objects used before definition
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

  // [2.2] Default Configuration
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

  // [2.3] Utility to wait for tour readiness
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

  // [2.4] Simple Logger Definition
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

  // [2.5] Check if script is already loaded
  if (window._searchProLoaded) {
    console.warn("Search Pro is already loaded. Skipping initialization.");
    return;
  }

  // [2.6] Mark as loaded
  window._searchProLoaded = true;

  // [2.7] Define search markup template
  const SEARCH_MARKUP = `
        <div id="searchContainer" class="search-container">
            <!-- [2.7.1] Search input field -->
            <div class="search-field">
                <input type="text" id="tourSearch" placeholder="Search tour locations... (* for all)" autocomplete="off">
                <div class="icon-container">
                    <!-- [2.7.2] Search icon -->
                    <div class="search-icon" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </div>
                    <!-- [2.7.3] Clear search button -->
                    <button class="clear-button" aria-label="Clear search">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <!-- [2.7.4] Search results container -->
            <div class="search-results" role="listbox">
                <div class="results-section">
                </div>
                <!-- [2.7.5] No results message -->
                <div class="no-results" role="status" aria-live="polite">
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

  // [2.8] Dependency loader
  function loadDependencies() {
    return new Promise((resolve, reject) => {
      // [2.8.1] Try to detect if Fuse.js is already loaded
      if (typeof Fuse !== "undefined") {
        console.log("Fuse.js already loaded, skipping load");
        resolve();
        return;
      }

      // [2.8.2] Try to load local Fuse.js first
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

        // [2.8.3] Fallback to CDN
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

  // [2.9] Optional debug tools loader
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

  // [2.10] CSS Loader
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

  // [2.11] DOM initialization
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

  // [2.12] Main initialization function
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
        // [2.12.1] Main initialization function
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
        // [2.12.2] Comprehensive tour binding with multiple strategies
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
        // [2.12.3] Strategy 1: Official 3DVista Events
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
        // [2.12.4] Strategy 2: Direct tour validation
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
        // [2.12.5] Strategy 3: DOM-based detection
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
        // [2.12.6] Comprehensive tour readiness check
        isTourReady() {
          try {
            return (
              window.tour &&
              window.tour.mainPlayList &&
              typeof window.tour.mainPlayList.get === "function" &&
              Array.isArray(window.tour.mainPlayList.get("items")) &&
              window.tour.mainPlayList.get("items").length > 0 &&
              window.tour.player &&
              typeof window.tour.player.getByClassName === "function"
            );
          } catch (error) {
            Logger.debug("Tour readiness check failed:", error);
            return false;
          }
        },
        // [2.12.7] Validate tour and initialize search
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

  // [2.13] TOUR LIFECYCLE BINDING
  const TourLifecycle = {
    // [2.13.1] Bind to tour lifecycle events
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

    // [2.13.2] Complete cleanup
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

  // [2.14] Initialize lifecycle binding
  TourLifecycle.bindLifecycle();

  // [2.15] Start initialization when the DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();

// [3.0] CSV PARSER UTILITY
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
  // Core search state variables centralized at module level
  let currentSearchTerm = "";
  let fuse = null;
  let performSearch = null; // Will be properly initialized in _initializeSearch
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

      // [4.1.1] updateSelection helper function
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

      // [4.1.2] Event handlers
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

  // [4.2.1] Configuration Builder Class for more maintainable options
  class ConfigBuilder {
    constructor() {
      // Default configuration
      this.config = {
        autoHide: {
          mobile: false,
          desktop: true,
        },
        mobileBreakpoint: BREAKPOINTS.mobile,
        minSearchChars: 2,
        showTagsInResults: true,
        elementTriggering: {
          initialDelay: 300,
          maxRetries: 3,
          retryInterval: 300,
          maxRetryInterval: 1000,
          baseRetryInterval: 300,
        },
        // Add default display labels for group headers
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
        },
        // Business data integration
        businessData: {
          useBusinessData: true, // Enable business data JSON file integration true or false
          businessDataFile: "business.json",
          businessDataDir: "business-data",
          matchField: "id", // Default
          fallbackMatchField: "tags",
          replaceTourData: true, // If true, replaces tour data with business data

          businessDataUrl: `${window.location.origin}${window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/"))}/search-pro-non-mod/business-data/business.json`,
        },
        // Google Sheets integration
        googleSheets: {
          useGoogleSheetData: false,
          googleSheetUrl: "",
          fetchMode: "csv", // 'csv' or 'json'
          useAsDataSource: false, // If true, sheet is primary; if false, hybrid enhancement
          csvOptions: {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
          },
          // Caching options
          caching: {
            enabled: false,
            timeoutMinutes: 60, // Cache expiration time
            storageKey: "tourGoogleSheetsData",
          },
          // Progressive loading options
          progressiveLoading: {
            enabled: false,
            initialFields: ["id", "tag", "name"], // Essential fields loaded first
            detailFields: [
              "description",
              "imageUrl",
              "elementType",
              "parentId",
            ],
          },
          // Authentication options
          authentication: {
            enabled: false,
            authType: "apiKey", // 'apiKey' or 'oauth'
            apiKey: "",
            apiKeyParam: "key", // URL parameter name for API key
          },
        },
        // [4.2.1.1] Thumbnail settings for search results
        thumbnailSettings: {
          enableThumbnails: false, // True or False to Enable or disable custom thumbnails
          thumbnailSize: "medium", // 'small', 'medium', 'large'
          thumbnailSizePx: 48, // Resolved px value for quick use
          borderRadius: 4, // in px
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
            default: "./search-pro-non-mod/assets/default-thumbnail.jpg",
          },
          alignment: "left", // 'center' or 'left' or 'right'
          groupHeaderAlignment: "left", // 'left' or 'right'
          groupHeaderPosition: "top", // 'top' or 'bottom'

          showFor: {
            panorama: true, // Show thumbnails for panoramas
            hotspot: true, // Show thumbnails for hotspots
            polygon: true, // Show thumbnails for polygons
            video: true, // Show thumbnails for videos
            webframe: true, // Show thumbnails for webframes
            image: true, // Show thumbnails for images
            text: true, // Show thumbnails for text
            projectedImage: true, // Show thumbnails for projected images
            element: true, // Show thumbnails for elements
            business: true, // Show thumbnails for business elements
            other: true, // Show thumbnails for other elements
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

    // [4.2.1.1] Set display options
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

    // [4.2.1.2] Set content inclusion options
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

    // [4.2.1.3] Set filter options
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

    // [4.2.1.4] Set label options
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

    // [4.2.1.5] Set appearance options
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

    // [4.2.1.6] Set search bar options
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

    // [4.2.1.7] Set general options
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

    // [4.2.1.8] Set custom display labels
    setDisplayLabels(options) {
      if (!options) return this;

      // Merge with defaults
      this.config.displayLabels = {
        ...this.config.displayLabels,
        ...options,
      };
      return this;
    }

    // [4.2.1.9] Set business data options
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
    replaceTourData: options.replaceTourData !== undefined 
      ? options.replaceTourData 
      : true,
  };
  return this;
}

    // [4.2.1.10] Set thumbnail settings
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
            : false,
        thumbnailSize: options.thumbnailSize || "medium",
        thumbnailSizePx: sizePx,
        borderRadius:
          options.borderRadius !== undefined ? options.borderRadius : 4,
        defaultImagePath:
          options.defaultImagePath || "assets/default-thumbnail.png",

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
          default: "./search-pro-non-mod/assets/default-thumbnail.jpg",
        },
        alignment: options.alignment === "right" ? "right" : "left",
        groupHeaderAlignment: ["left", "right", "center"].includes(
          options.groupHeaderAlignment,
        )
          ? options.groupHeaderAlignment
          : "left", // Controls alignment of group headers
        groupHeaderPosition:
          options.groupHeaderPosition === "bottom" ? "bottom" : "top", // Controls position of group headers

        showFor: {
          panorama: true, // Show thumbnails for panoramas
          hotspot: true, // Show thumbnails for hotspots
          polygon: true, // Show thumbnails for polygons
          video: true, // Show thumbnails for videos
          webframe: true, // Show thumbnails for webframes
          image: true, // Show thumbnails for images
          text: true, // Show thumbnails for text
          projectedImage: true, // Show thumbnails for projected images
          element: true, // Show thumbnails for elements
          business: true, // Show thumbnails for business elements
          other: true, // Show thumbnails for other elements
        },
      };
      return this;
    }

    // [4.2.1.11] Set Google Sheets integration options
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

    // [4.2.1.12] Build method to return completed config
    build() {
      return this.config;
    }
  }

  // [4.2.2] Create default configuration
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

  // [4.4] Module state variables
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
  // [4.8.1] Enhanced element type detection
  function _getElementType(overlay, label) {
    if (!overlay) return "Element";
    try {
      // Lookup map for overlay classes
      const classNameMap = {
        FramePanoramaOverlay: "Webframe",
        QuadVideoPanoramaOverlay: "Video",
        ImagePanoramaOverlay: "Image",
        TextPanoramaOverlay: "Text",
        HotspotPanoramaOverlay: "Hotspot",
      };
      // Lookup map for label patterns
      const labelPatternMap = [
        { pattern: "web", type: "Webframe" },
        { pattern: "video", type: "Video" },
        { pattern: "image", type: "Image" },
        { pattern: "text", type: "Text" },
        { pattern: "polygon", type: "Polygon" },
        { pattern: "goto", type: "Hotspot" },
        { pattern: "info", type: "Hotspot" },
      ];
      // 1. Direct class mapping
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
        return classNameMap[overlay.class];
      }
      // 2. Try overlay.get('class') if available
      if (typeof overlay.get === "function") {
        try {
          const className = overlay.get("class");
          if (classNameMap[className]) {
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
            return classNameMap[className];
          }
        } catch (e) {
          Logger.debug("Error getting class via get method:", e);
        }
      }
      // 3. Property-based detection (Webframe, Video, Polygon)
      const propertyChecks = [
        { props: ["url", "data.url"], type: "Webframe" },
        { props: ["video", "data.video"], type: "Video" },
        {
          props: ["vertices", "polygon", "data.vertices", "data.polygon"],
          type: "Polygon",
        },
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
      // 4. Label pattern mapping
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
      // Skip empty labels if configured
      if (!label && _config.includeContent.elements.skipEmptyLabels) {
        return false;
      }

      // Check minimum label length
      if (
        label &&
        _config.includeContent.elements.minLabelLength > 0 &&
        label.length < _config.includeContent.elements.minLabelLength
      ) {
        return false;
      }

      // Apply element type filtering
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

      // Apply label filtering
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

      // Apply tag filtering
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

      // Check element type against configuration
      const elementTypeMap = {
        Hotspot: "includeHotspots",
        Polygon: "includePolygons",
        Video: "includeVideos",
        Webframe: "includeWebframes",
        Image: "includeImages",
        Text: "includeText",
        ProjectedImage: "includeProjectedImages",
        Element: "includeElements",
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
  // [4.9.1] Element triggering with exponential backoff
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

    // [4.9.1.1] Helper to find element by ID using multiple methods
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

    // Clean up any existing style elements
    const existingStyle = document.getElementById("search-custom-vars");
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create new style element
    const styleElement = document.createElement("style");
    styleElement.id = "search-custom-vars";

    // Generate CSS variables from config
    // Removed unused variable: colors

    // Generate responsive positioning CSS
    const isMobileOverride =
      isMobile &&
      _config.searchBar.useResponsive &&
      _config.searchBar.mobileOverrides?.enabled;
    const mobilePosition = _config.searchBar.mobilePosition;
    const mobileOverrides = _config.searchBar.mobileOverrides || {};

    // Width calculation based on device type
    const desktopWidth =
      typeof _config.searchBar.width === "number"
        ? `${_config.searchBar.width}px`
        : _config.searchBar.width;
    const mobileWidth = mobileOverrides.width
      ? typeof mobileOverrides.width === "number"
        ? `${mobileOverrides.width}px`
        : mobileOverrides.width
      : `calc(100% - ${(mobilePosition.left || 0) * 2 + (mobilePosition.right || 0) * 2}px)`;

    // Maximum width for mobile if specified
    const mobileMaxWidth = mobileOverrides.maxWidth
      ? typeof mobileOverrides.maxWidth === "number"
        ? `${mobileOverrides.maxWidth}px`
        : mobileOverrides.maxWidth
      : "";

    // Base mobile positioning
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

    // [2.0.1] Apply display-related classes and CSS variables
    const root = document.documentElement;

    // Set CSS variables for result tags visibility
    root.style.setProperty(
      "--result-tags-display",
      _config.showTagsInResults ? "block" : "none",
    );

    // Apply class-based styling for visibility control
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

    // Set icon color variable
    root.style.setProperty(
      "--color-result-icon",
      _config.appearance.colors.resultIconColor || "#6e85f7",
    );

    // [2.0.2] Set border radius CSS variables
    const fieldRadius = _config.appearance.searchField.borderRadius;
    const resultsRadius = _config.appearance.searchResults.borderRadius;

    // Set CSS variables for border radius

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

    // [2.0.3] Set color variables for search
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

    // Icon and group header alignment is now handled by CSS via data attributes
    // No need to dynamically inject styles anymore

    // [2.0.4] Handle thumbnail alignment from config
    const thumbAlignment =
      _config.thumbnailSettings?.alignment === "right" ? "right" : "left";

    // Apply thumbnail alignment to the document body as a data attribute
    document.body.setAttribute("data-thumbnail-align", thumbAlignment);

    // Only include position-related CSS in the style element now that other styles are in external CSS
    styleElement.textContent = positionCSS;
    document.head.appendChild(styleElement);

    // Cache frequently used elements and apply placeholder text to search input
    _elements.input = _elements.container.querySelector("#tourSearch");
    _elements.results = _elements.container.querySelector(".search-results");
    _elements.clearButton = _elements.container.querySelector(".clear-button");
    _elements.searchIcon = _elements.container.querySelector(".search-icon");

    if (_elements.input) {
      _elements.input.placeholder = _config.searchBar.placeholder;

      // Add accessibility attributes
      _aria.setRole(_elements.input, "searchbox");
      _aria.setLabel(_elements.input, "Search tour");
      _aria.setAutoComplete(_elements.input, "list");
    }

    Logger.info("Search styling applied successfully");
  }
/**
 * Comprehensive business data matching algorithm
 * Handles all cases and is robust for production use where IDs might change
 */
function findBusinessMatch(tourElement) {
  // Skip if no business data or invalid element
  if (!_businessData || !_businessData.length || !tourElement) {
    return null;
  }
  
  const elementName = tourElement.name || '';
  const elementId = tourElement.id || '';
  const elementTags = Array.isArray(tourElement.tags) ? tourElement.tags : [];
  
  console.log(`[MATCHING] Processing: ${elementName || elementId} (${elementTags.join(',')})`);
  
  // STRATEGY 1: Direct ID match with business.id
  if (elementName) {
    const nameMatch = _businessData.find(entry => 
      entry.id && entry.id.toLowerCase() === elementName.toLowerCase());
  
    if (nameMatch) {
      console.log(`[MATCH:NAME] Direct match on name: ${elementName} = ${nameMatch.id}`);
      return nameMatch;
    }
  }
  
  // STRATEGY 2: Direct panorama ID match (for entries explicitly mapped in business data)
  if (elementId) {
    const idMatch = _businessData.find(entry => 
      entry.id && entry.id.toLowerCase() === elementId.toLowerCase());
    
    if (idMatch) {
      console.log(`[MATCH:DIRECT_ID] Direct match on ID: ${elementId}`);
      return idMatch;
    }
  }
  
  // STRATEGY 3: Match by tag (important for panoramas with tags but no names)
  if (elementTags.length > 0) {
    // First try exact tag matches with business data IDs
    for (const tag of elementTags) {
      const tagMatch = _businessData.find(entry => 
        entry.id && entry.id.toLowerCase() === tag.toLowerCase());
      
      if (tagMatch) {
        console.log(`[MATCH:TAG_ID] Tag matches business id: ${tag} = ${tagMatch.id}`);
        return tagMatch;
      }
    }
    
    // Then try match by tag field as string (comma-separated)
    const allTags = elementTags.join(',').toLowerCase();
    for (const entry of _businessData) {
      if (entry.tag) {
        const entryTags = entry.tag.toLowerCase();
        // Check if any tag in business data matches any element tag
        for (const tag of elementTags) {
          if (entryTags.includes(tag.toLowerCase())) {
            console.log(`[MATCH:TAG_STRING] Business tag string contains element tag: ${tag}`);
            return entry;
          }
        }
      }
    }
    
    // Try to match by tags array if available
    for (const tag of elementTags) {
      const tagArrayMatch = _businessData.find(entry => 
        Array.isArray(entry.tags) && entry.tags.some(btag => 
          btag.toLowerCase() === tag.toLowerCase()));
      
      if (tagArrayMatch) {
        console.log(`[MATCH:TAG_ARRAY] Tag found in business tags array: ${tag}`);
        return tagArrayMatch;
      }
    }
  }
  
  // STRATEGY 4: For panoramas with IDs but no names, try flexible substring matching
  if (elementId && elementId.includes('panorama_')) {
    for (const entry of _businessData) {
      // Skip entries that are explicitly panorama IDs (we already checked those)
      if (entry.id && entry.id.startsWith('panorama_')) continue;
      
      // Check if business ID is contained within the panorama ID
      if (entry.id && elementId.toLowerCase().includes(entry.id.toLowerCase())) {
        console.log(`[MATCH:ID_SUBSTRING] ID substring match: ${elementId} contains ${entry.id}`);
        return entry;
      }
      
      // Check if there's any tag overlap between business data tags and element tags
      if (entry.tag && elementTags.length > 0) {
        const entryTagsArr = entry.tag.split(',').map(t => t.trim().toLowerCase());
        for (const tag of elementTags) {
          if (entryTagsArr.includes(tag.toLowerCase())) {
            console.log(`[MATCH:TAG_OVERLAP] Tag overlap: ${tag}`);
            return entry;
          }
        }
      }
    }
  }
  
  // STRATEGY 5: For truly empty panoramas, find "EmptyPanorama" entry if it exists
  if (!elementName && elementTags.length === 0) {
    const emptyMatch = _businessData.find(entry => entry.id === "EmptyPanorama");
    if (emptyMatch) {
      console.log(`[MATCH:EMPTY] Generic entry for empty panorama`);
      return emptyMatch;
    }
  }
  
  // No match found
  console.log(`[MATCH:NONE] No business match for: ${elementName || elementId}`);
  return null;
}

  // [5.4] MAIN SEARCH FUNCTIONALITY

  // [5.1] Keyboard navigation manager
  // Using the centralized keyboardManager object from the top of the module
  // The implementation has been moved to avoid duplicate declarations

  // [5.2] IMPROVED EVENT BINDING with proper cleanup
  function _bindSearchEventListeners(
    searchContainer,
    searchInput,
    clearButton,
    searchIcon,
    searchCallback, // Renamed to avoid shadowing the module-level performSearch variable
  ) {
    // First clean up any existing event listeners
    _unbindSearchEventListeners();

    Logger.debug("Binding search event listeners...");

    // Create a cleanup registry for this session
    const cleanup = [];

    // Bind input event with device-appropriate debounce
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

      // Mobile touch optimization
      if ("ontouchstart" in window) {
        const touchHandler = () => searchInput.focus();
        searchInput.addEventListener("touchend", touchHandler);
        cleanup.push(() =>
          searchInput.removeEventListener("touchend", touchHandler),
        );
      }
    }

    // Bind clear button
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

    // Bind search icon
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

    // Document click handler for closing search
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

    // Touch handler for mobile
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

    // Keyboard navigation
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

    // Store cleanup functions for later use
    window._searchEventCleanup = cleanup;

    Logger.debug("Search event listeners bound successfully");
    return true;
  }

  // Improved cleanup function - update the previously declared function
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

  // [5.3] DATA LOADING
  // [5.3.1] Google Sheets data loading function
  function _loadGoogleSheetsData() {
    // Skip if Google Sheets data is not enabled
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

    // Check cache first if enabled
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
        // Continue with fetch if cache check fails
      }
    }

    // Ensure the URL is valid for fetching
    let fetchUrl = sheetUrl;
    if (fetchMode === "csv" && !sheetUrl.includes("/export?format=csv")) {
      // Check if this is a Google Sheets view URL and convert it to a CSV export URL
      if (
        sheetUrl.includes("spreadsheets.google.com/") &&
        !sheetUrl.includes("/export")
      ) {
        // Extract the sheet ID
        let sheetId = "";
        try {
          // Extract sheet ID from URL
          const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
          if (match && match[1]) {
            sheetId = match[1];
            fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
          }
        } catch (error) {
          Logger.warn(
            "Failed to convert Google Sheets URL to CSV export URL:",
            error,
          );
        }
      }
    }

    // Add authentication if enabled
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

    // Fetch the data
    return fetch(fetchUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load Google Sheets data: ${response.status} ${response.statusText}`,
          );
        }
        return response.text(); // Get as text for both CSV and JSON
      })
      .then((text) => {
        let data = [];

        try {
          if (fetchMode === "csv") {
            // Parse CSV using our Papa Parse implementation
            const result = Papa.parse(text, _config.googleSheets.csvOptions);
            if (result.errors && result.errors.length > 0) {
              Logger.warn("CSV parsing errors:", result.errors);
            }
            data = result.data;
          } else {
            // Parse as JSON
            data = JSON.parse(text);

            // Handle common Google Sheets JSON API responses
            if (data.feed && data.feed.entry) {
              // Handle Google Sheets API v3 format
              data = data.feed.entry.map((entry) => {
                const row = {};
                // Process each field (gs:cell or content entries)
                Object.keys(entry).forEach((key) => {
                  if (key.startsWith("gsx$")) {
                    const fieldName = key.substr(4);
                    row[fieldName] = entry[key].$t;
                  }
                });
                return row;
              });
            } else if (data.values) {
              // Handle Google Sheets API v4 format
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

          // Validate the data structure
          if (!Array.isArray(data)) {
            Logger.warn(
              "Google Sheets data is not an array after parsing, converting to array",
            );
            data = [data]; // Convert to array if not already
          }

          // Log diagnostics
          Logger.info(
            `Successfully loaded ${data.length} rows from Google Sheets`,
          );

          // Implement progressive loading if enabled
          let processedData = [];
          if (progressiveOptions.enabled && data.length > 20) {
            // Apply progressive loading for larger datasets
            Logger.info(
              "Progressive loading enabled, processing essential fields first",
            );

            // Extract just essential fields for initial load
            const essentialFields = progressiveOptions.initialFields || [
              "id",
              "tag",
              "name",
            ];

            // Create a lightweight version with just essential fields
            processedData = data.map((row) => {
              const essentialData = {};
              essentialFields.forEach((field) => {
                essentialData[field] = row[field] || "";
              });
              return essentialData;
            });

            // Schedule loading of full data for later
            setTimeout(() => {
              // Process full data in background
              const fullData = data.map((row) => ({
                id: row.id || "",
                tag: row.tag || "",
                name: row.name || "",
                description: row.description || "",
                imageUrl: row.imageUrl || row.image || "",
                elementType: row.elementType || row.type || "",
                parentId: row.parentId || "",
              }));

              // Replace data with full version
              _googleSheetsData = fullData;

              // Update cache with full data if caching is enabled
              if (cachingOptions.enabled) {
                try {
                  const storageKey = cachingOptions.storageKey || "tourGoogleSheetsData";
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
            // Regular (non-progressive) processing
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

          // Cache the data if caching is enabled
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

          // Store in module-level variable for future use
          _googleSheetsData = processedData;

          // Output diagnostics about data quality
          const missingIds = processedData.filter((row) => !row.id).length;
          const missingTags = processedData.filter((row) => !row.tag).length;
          // removed unused variable: missingNames

          if (missingIds > 0 || missingTags > 0) {
            Logger.warn(
              `Data quality issues: ${missingIds} rows missing ID, ${missingTags} rows missing tag`,
            );
          }

          return processedData;
        } catch (e) {
          Logger.error("Error parsing Google Sheets data:", e);
          return [];
        }
      })
      .catch((error) => {
        Logger.warn(`Error loading Google Sheets data: ${error.message}`);
        _googleSheetsData = []; // Reset to empty array on error
        return []; // Return empty array to allow chaining
      });
  }

  // [5.3.2] Business data loading function
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
      dataPath = `${baseUrl}/search-pro-non-mod/${dataDir}/${dataFile}`;
    }

    Logger.info(`Loading business data from: ${dataPath}`);
    console.log("[BUSINESS DATA] Attempting to load from:", dataPath);

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
        
        // Add detailed logging
        console.log("=== BUSINESS DATA LOADED ===");
        console.log(`Successfully loaded ${data.length} business data entries`);
        
        // Log the first 3 entries to verify structure
        for (let i = 0; i < Math.min(3, data.length); i++) {
          console.log(`Entry ${i+1}:`, {
            id: data[i].id,
            name: data[i].name,
            elementType: data[i].elementType
          });
        }
        
        _businessData = data;
        return data;
      })
      .catch((error) => {
        console.error(`Error loading business data: ${error.message}`);
        _businessData = [];
        return [];
      });
  }

  // [5.4] SEARCH FUNCTIONALITY
  // [5.4.1] Search initialization
  function _initializeSearch(tour) {
    Logger.info("Initializing enhanced search v2.0...");
    window.tourInstance = tour;

    // Reset the module-level search state variables
    currentSearchTerm = ""; // Reset the module-level variable
    fuse = null;

    // If already initialized, don't reinitialize
    if (_initialized) {
      Logger.info("Search already initialized.");
      return;
    }

    // Flag as initialized
    _initialized = true;
    window.searchListInitialized = true;

    // [5.4.1.1] Initialize BroadcastChannel for cross-window communication
    _crossWindowChannel.init();

    // [5.4.1.2] Create a promise chain to load all external data sources
    const dataPromises = [];

    // Load business data if enabled
    if (_config.businessData.useBusinessData) {
      dataPromises.push(_loadBusinessData());
    }

    // Load Google Sheets data if enabled
    if (_config.googleSheets.useGoogleSheetData) {
      dataPromises.push(_loadGoogleSheetsData());
    }

    // [5.4.1.3] When all data sources are loaded (or failed gracefully), prepare the search index
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

    // Set up listener for cross-window messages
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

    // Add ARIA attributes to container
    _aria.setRole(_elements.container, "search");
    _aria.setLabel(_elements.container, "Tour search");

    // Create search UI components if needed
    _createSearchInterface(_elements.container);

    // Reset module-level search state variables
    currentSearchTerm = ""; // Reset the module-level variable
    fuse = null;

    /**
     * Prepares and returns a Fuse.js search index for the tour panoramas and overlays.
     * @param {object} tour - The tour object containing the main playlist.
     * @param {object} config - The search configuration object.
     * @returns {Fuse} The constructed Fuse.js instance for searching.
     */
    // [5.4.1.4] Search index preparation
    function _prepareSearchIndex(tour, config) {
      try {
        const items = tour.mainPlayList.get("items");
        if (!items || !Array.isArray(items) || items.length === 0) {
          throw new Error("Tour playlist items not available or empty");
        }
        const fuseData = [];
        const filterMode = config.filter.mode;
        const allowedValues = config.filter.allowedValues || [];
        const blacklistedValues = config.filter.blacklistedValues || [];
        const allowedMediaIndexes = config.filter.allowedMediaIndexes || [];
        const blacklistedMediaIndexes =
          config.filter.blacklistedMediaIndexes || [];

        // Process each panorama in the tour
        items.forEach((item, index) => {
          try {
            // Get media data safely
            const media = item.get("media");
            if (!media) {
              Logger.warn(`No media found for item at index ${index}`);
              return;
            }
            // Get panorama metadata
            const data = _safeGetData(media);
            const label = data?.label?.trim() || "";
            const subtitle = data?.subtitle?.trim() || "";
            // Apply content filtering
            if (
              !_shouldIncludePanorama(
                label,
                subtitle,
                data?.tags,
                index,
                filterMode,
                allowedValues,
                blacklistedValues,
                allowedMediaIndexes,
                blacklistedMediaIndexes,
              )
            ) {
              return;
            }
            // Determine display label for the panorama
            const displayLabel = _getDisplayLabel(label, subtitle, data?.tags);

            // Check if we have business data for this panorama
            let businessMatch = null;
            let businessTag = null;
            let businessName = null;

            // Check if we have Google Sheets data for this panorama
            let sheetsMatch = null;
            let sheetsData = null;

            // Only look for business match if enabled in config
            if (config.businessData?.useBusinessData && _businessData.length > 0) {
              try {
                // Use the comprehensive matching function
                businessMatch = findBusinessMatch({
                  name: label,
                  id: media.get ? media.get("id") : null,
                  tags: data?.tags || []
                });

                if (businessMatch) {
                  Logger.debug(`Found business match for panorama ${label}: ${businessMatch.name}`);
                  businessTag = businessMatch.tag || null;
                  businessName = businessMatch.name || null;
                }
              } catch (error) {
                Logger.warn(`Error matching business data for panorama ${label}:`, error);
              }
            }

            // Only look for Google Sheets match if enabled in config
            if (
              config.googleSheets?.useGoogleSheetData &&
              _googleSheetsData.length > 0
            ) {
              try {
                // Look for a Google Sheets entry that matches this panorama
                sheetsMatch = _googleSheetsData.find((entry) => {
                  // Try to match by ID first (most accurate)
                  const itemId = media.get("id") || "";
                  if (
                    entry.id &&
                    itemId &&
                    entry.id.toString() === itemId.toString()
                  ) {
                    return true;
                  }

                  // Then try tag matching (like business data)
                  if (
                    entry.tag &&
                    label &&
                    label.toLowerCase().includes(entry.tag.toLowerCase())
                  ) {
                    return true;
                  }

                  // Check element type if specified
                  if (entry.elementType === "Panorama") {
                    // Try exact label match as a fallback
                    if (
                      entry.name &&
                      label &&
                      entry.name.toLowerCase() === label.toLowerCase()
                    ) {
                      return true;
                    }
                  }

                  // No match found
                  return false;
                });

                if (sheetsMatch) {
                  Logger.debug(
                    `Found Google Sheets match for panorama ${label}: ${sheetsMatch.name}`,
                  );
                  sheetsData = { ...sheetsMatch }; // Create a copy of the matched data
                }
              } catch (error) {
                Logger.warn(
                  `Error matching Google Sheets data for panorama ${label}:`,
                  error,
                );
              }
            }

            // Determine what data source to use for the display label
            let resultLabel = displayLabel; // Default to tour's display label
            let resultDescription = subtitle || ""; // Default to tour's subtitle

            // Business data takes precedence if available
            if (businessName) {
              resultLabel = businessName;
            }

            // Google Sheets data overrides everything else if it's configured as primary data source
            if (sheetsData && config.googleSheets.useAsDataSource) {
              resultLabel = sheetsData.name || resultLabel;
              resultDescription = sheetsData.description || resultDescription;
            }
            // Otherwise, Google Sheets data enhances but doesn't override existing data
            else if (sheetsData) {
              // Only use sheet data if the field is empty in tour data
              if (!resultLabel && sheetsData.name) {
                resultLabel = sheetsData.name;
              }
              if (!resultDescription && sheetsData.description) {
                resultDescription = sheetsData.description;
              }
            }

            // Add panorama to search index with all data sources integrated
            // Fix: Use the proper replacement based on config setting
            const useBusiness = businessMatch && _config.businessData.replaceTourData === true;

            // Add panorama to search index with all data sources integrated
            fuseData.push({
              // If replaceTourData is true, use "Panorama" type, otherwise use "Business" type
              type: useBusiness ? "Panorama" : (businessMatch ? "Business" : "Panorama"),
              index,
              playlistOrder: index,
              // Use business data if available and replaceTourData is true
              label: useBusiness ? businessMatch?.name : resultLabel,
              originalLabel: label,
              subtitle: useBusiness ? (businessMatch?.description || "") : resultDescription,
              tags: Array.isArray(data?.tags) ? data.tags : [],
              // Include all business data
              businessData: businessMatch,
              businessName: businessMatch?.name,
              // Image URL prioritization
              imageUrl: businessMatch?.imageUrl || sheetsData?.imageUrl || null,
              item,
              // Boost factors
              boost: businessMatch ? 2.0 : (sheetsData ? 2.5 : (label ? 1.5 : 1.0)),
            });
            // Process overlay elements (hotspots, etc.)
            const overlays = _getOverlays(media, tour, item);
            _processOverlays(overlays, fuseData, index, displayLabel);
          } catch (error) {
            Logger.warn(`Error processing item at index ${index}:`, error);
          }
        });
        // Create Fuse.js search index
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
        Logger.info(`Indexed ${fuseData.length} items for search`);
        return fuseInstance;
      } catch (error) {
        Logger.error("Error preparing Fuse index:", error);
        // Create an empty fuse instance as fallback
        return new Fuse([], {
          keys: ["label"],
          includeScore: true,
        });
      }
    }

    // Initialize search index
    function prepareFuse() {
      fuse = _prepareSearchIndex(tour, _config);
    }

    // Helper for safely getting object data
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

    // Helper to check if a panorama should be included
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
      // Apply whitelist/blacklist filters
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

      // For completely blank items
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

      // Skip unlabeled items based on configuration
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

    // Helper to get display label
    function _getDisplayLabel(label, subtitle, tags) {
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
          return "Panorama";
        }

        return _config.useAsLabel.customText;
      }

      return label;
    }

    // Helper to get overlays from multiple sources
    function _getOverlays(media, tour, item) {
      const overlays = [];
      const overlayDetectionMethods = [
        // Method 1: media.get('overlays')
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

        // Method 2: media.overlays
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

        // Method 3: item's overlays directly
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

        // Method 4: overlaysByTags
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

        // Method 5: Look for child elements in the tour.player
        () => {
          try {
            if (
              tour.player &&
              typeof tour.player.getByClassName === "function"
            ) {
              const allOverlays = tour.player.getByClassName("PanoramaOverlay");
              if (Array.isArray(allOverlays) && allOverlays.length > 0) {
                // Filter to only get overlays that belong to this panorama
                return allOverlays.filter((overlay) => {
                  try {
                    const parentMedia = overlay.get("media");
                    return (
                      parentMedia && parentMedia.get("id") === media.get("id")
                    );
                  } catch {
                    return false;
                  }
                });
              }
            }
          } catch {
            Logger.debug("Method 5 overlay detection failed");
          }
          return null;
        },
      ];

      // Try each method in sequence
      for (const method of overlayDetectionMethods) {
        const result = method();
        if (result) {
          overlays.push(...result);
          break;
        }
      }

      return overlays;
    }

    // [5.4.2] Process overlay elements
    function _processOverlays(overlays, fuseData, parentIndex, parentLabel) {
      if (!Array.isArray(overlays) || overlays.length === 0) {
        return;
      }

      overlays.forEach((overlay, overlayIndex) => {
        try {
          // Get overlay data safely
          const overlayData = _safeGetData(overlay);

          // Get overlay label
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
              // Silent failure for missing label property
            }
          }

          // If still no label, try to use other properties like text content
          if (!overlayLabel && typeof overlay.get === "function") {
            try {
              const textContent = overlay.get("text");
              if (textContent) {
                overlayLabel = textContent.substring(0, 30);
                if (textContent.length > 30) overlayLabel += "...";
              }
            } catch {
              // Silent failure for missing text property
            }
          }

          // Skip if empty label and configured to do so
          if (!overlayLabel && _config.includeContent.elements.skipEmptyLabels)
            return;

          // Get element type
          let elementType = _getElementType(overlay, overlayLabel);
          if (
            overlayLabel.includes("info-") ||
            overlayLabel.includes("info_")
          ) {
            elementType = "Hotspot";
          }

          // Apply element filtering
          const elementTags = Array.isArray(overlayData.tags)
            ? overlayData.tags
            : [];
          if (!_shouldIncludeElement(elementType, overlayLabel, elementTags)) {
            return;
          }

          // Get element ID safely
          let elementId = null;
          if (overlay.id) {
            elementId = overlay.id;
          } else if (typeof overlay.get === "function") {
            try {
              elementId = overlay.get("id");
            } catch {
              // Silent failure for missing id property
            }
          }

          // Create a fallback label if needed
          let displayLabel = overlayLabel;
          if (!displayLabel) {
            displayLabel = `${elementType} ${parentIndex}.${overlayIndex}`;
          }

          // Add to search data
          fuseData.push({
            type: elementType,
            label: displayLabel,
            tags: elementTags,
            parentIndex: parentIndex,
            parentLabel: parentLabel,
            // Maintain order information relative to parent panorama
            playlistOrder: parentIndex * 1000 + overlayIndex, // Ensures panoramas sort before their children
            id: elementId,
            boost: 0.8,
          });
        } catch (overlayError) {
          Logger.warn(
            `Error processing overlay at index ${overlayIndex}:`,
            overlayError,
          );
        }
      });
    }

    // [5.4.3] UI BUILDING FUNCTIONS
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
     * Creates and returns the no-results message element.
     * @returns {HTMLElement}
     */
    function _buildNoResultsMessage() {
      const noResults = document.createElement("div");
      noResults.className = "no-results";
      noResults.innerHTML = "<p>No results found</p>";
      return noResults;
    }

    /**
     * Creates and inserts the search results container into the container if missing.
     * @param {HTMLElement} container
     */
    function _buildResultsContainer(container) {
      if (!container.querySelector(".search-results")) {
        const resultsContainer = document.createElement("div");
        resultsContainer.className = "search-results";

        // Set up ARIA attributes using helpers
        _aria.setRole(resultsContainer, "listbox");
        _aria.setLabel(resultsContainer, "Search results");

        // Add results section
        const resultsSection = document.createElement("div");
        resultsSection.className = "results-section";
        resultsContainer.appendChild(resultsSection);

        // Add no-results message
        resultsContainer.appendChild(_buildNoResultsMessage());

        container.appendChild(resultsContainer);
      }
    }

    /**
     * Orchestrates building the search UI components if not present.
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

    // [5.4.4] Text highlighting with improved safety
    const highlightMatch = (text, term) => {
      if (!text || !term || term === "*") return text || "";

      try {
        // Sanitize the search term to prevent regex errors
        const sanitizedTerm = term.replace(/[-/^$*+?.()|[\]{}]/g, "\\$&");
        const regex = new RegExp(`(${sanitizedTerm})`, "gi");
        return text.replace(regex, "<mark>$1</mark>");
      } catch (error) {
        Logger.warn("Error highlighting text:", error);
        return text;
      }
    };

    // [5.4.5] Get icon HTML for element types
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
                             <path d="M3 3h18v18H3V3z"></path>
                             <path d="M9 21V9"></path>
                          </svg>`,
      };

      // Return the icon for the specified type, or a default if not found
      return icons[type] || icons["Element"];
    };

    // [5.4.6] Group and sort search results
    const groupAndSortResults = (matches) => {
      // Fix: Only create separate Business group if replaceTourData is false
      const grouped = matches.reduce((acc, match) => {
  // Check if this is a business result that should be grouped separately
  if (_config.businessData?.useBusinessData && 
      match.item.businessName && 
      _config.businessData.replaceTourData !== true) {
    // Group business results separately only if NOT replacing tour data
    const type = "Business"; 
    if (!acc[type]) acc[type] = [];
    acc[type].push(match);
  } else {
    // Standard grouping by original type
    const type = match.item.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(match);
  }
  return acc;
}, {});

      // Sort items within each group
      Object.keys(grouped).forEach((type) => {
        grouped[type].sort((a, b) => {
          // Primary sort by playlistOrder to respect MainPlaylist order
          if (
            a.item.playlistOrder !== undefined &&
            b.item.playlistOrder !== undefined
          ) {
            return a.item.playlistOrder - b.item.playlistOrder;
          }

          // Secondary sort by label (alphabetical) when playlistOrder isn't available
          const labelCompare = a.item.label.localeCompare(b.item.label);
          if (labelCompare !== 0) return labelCompare;

          // Tertiary sort by parent (if applicable)
          if (a.item.parentLabel && b.item.parentLabel) {
            return a.item.parentLabel.localeCompare(b.item.parentLabel);
          }

          return 0;
        });
      });

      return grouped;
    };

    // [5.4.7] Main search function with improved error handling
    performSearch = () => {
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

      // Add ARIA attributes for better accessibility
      resultsContainer.setAttribute("aria-live", "polite"); // Announce changes politely
      noResults.setAttribute("role", "status"); // Mark as status for screen readers

      // Update UI based on search term
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

      // Skip if search term hasn't changed
      if (searchTerm === currentSearchTerm) return;
      currentSearchTerm = searchTerm;

      // Reset results list
      resultsList.innerHTML = "";

      // Handle empty search - hide results
      if (!searchTerm) {
        searchContainer.classList.remove("has-results");
        noResults.classList.remove("visible");
        noResults.classList.add("hidden");
        resultsContainer.classList.remove("visible");
        resultsContainer.classList.add("hidden");
        resultsList.innerHTML = ""; // No search history feature
        return;
      }

      // Check minimum character requirement
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

      // Show results container initially
      resultsContainer.classList.remove("hidden");
      resultsContainer.classList.add("visible");

      try {
        // Ensure fuse index is initialized
        if (!fuse) {
          Logger.warn("Search index not initialized, preparing now...");
          prepareFuse();
        }

        // Perform search
        let matches;
        if (searchTerm === "*") {
          // Wildcard search shows all items
          matches = fuse._docs
            ? fuse._docs.map((item, index) => ({
                item,
                score: 0,
                refIndex: index,
              }))
            : [];
        } else {
          // Process search term for special characters
          const processedTerm = _preprocessSearchTerm(searchTerm);

          // Allow exact matching with = prefix
          if (
            typeof processedTerm === "string" &&
            processedTerm.startsWith("=")
          ) {
            matches = fuse.search({ $or: [{ label: processedTerm }] });
          } else {
            // Use regular fuzzy search
            matches = fuse.search(processedTerm);
          }
        }

        // Handle no results case
        if (!matches || !matches.length) {
          // Remove 'has-results' if no matches
          searchContainer.classList.remove("has-results");

          // Show 'no results' message
          noResults.classList.remove("hidden");
          noResults.classList.add("visible");
          noResults.setAttribute("role", "status");
          noResults.setAttribute("aria-live", "polite");

          // Make results container visible but transparent
          resultsContainer.classList.remove("hidden");
          resultsContainer.classList.add("visible", "no-results-bg");

          // Hide results list (optional, if you want the "no results" message to fill space)
          resultsList.classList.add("hidden");

          return;
        } else {
          // Show results and hide 'no results'
          searchContainer.classList.add("has-results");
          noResults.classList.remove("visible");
          noResults.classList.add("hidden");
          resultsContainer.classList.remove("no-results-bg", "hidden");
          resultsContainer.classList.add("visible");
          resultsList.classList.remove("hidden");
        }

        // Make results container accessible for screen readers
        resultsContainer.setAttribute("aria-live", "polite");
        resultsContainer.setAttribute("aria-relevant", "additions text");
        noResults.classList.remove("visible");
        noResults.classList.add("hidden");

        // Display results
        resultsList.classList.remove("hidden");
        resultsList.classList.add("visible"); // Use CSS class for visible state
        noResults.classList.remove("visible");
        noResults.classList.add("hidden");

        // Group and sort results
        const groupedResults = groupAndSortResults(matches);

        // Apply type filtering based on config
        if (
          _config.filter.typeFilter?.mode === "whitelist" &&
          Array.isArray(_config.filter.typeFilter?.allowedTypes) &&
          _config.filter.typeFilter.allowedTypes.length > 0
        ) {
          // Only keep allowed result types
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
          // Remove blacklisted result types
          Object.keys(groupedResults).forEach((type) => {
            if (_config.filter.typeFilter.blacklistedTypes.includes(type)) {
              delete groupedResults[type];
            }
          });
        }

        // Keep track of result index for ARIA attributes
        let resultIndex = 0;

        // Define priority order for result types
        const typeOrder = [
          "Panorama",
          "Hotspot",
          "Polygon",
          "Video",
          "Webframe",
          "Image",
          "Text",
          "ProjectedImage",
          "Element",
          "Business",
        ];

        // Render each group of results in priority order
        Object.entries(groupedResults)
          .sort(([typeA], [typeB]) => {
            // Get index in priority array (default to end if not found)
            const indexA = typeOrder.indexOf(typeA);
            const indexB = typeOrder.indexOf(typeB);

            // Handle types not in the priority list
            const valA = indexA !== -1 ? indexA : typeOrder.length;
            const valB = indexB !== -1 ? indexB : typeOrder.length;

            // Sort by priority index
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

            // Use custom label from config if available, otherwise use the original type
            const customLabel = _config.displayLabels[type] || type;

            // Create group header with custom label
            groupEl.innerHTML = `
                        <div class="group-header">
                            <span class="group-title">${customLabel}</span>
                            <span class="group-count">${results.length} result${results.length !== 1 ? "s" : ""}</span>
                        </div>
                    `;

            // Render each result item
            results.forEach((result) => {
              resultIndex++;
              const resultItem = document.createElement("div");
              resultItem.className = "result-item";
              _aria.setRole(resultItem, "option");
              resultItem.tabIndex = 0;
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

              // Show parent info for child elements if configured to do so
              const parentInfo =
                result.item.type !== "Panorama" &&
                result.item.parentLabel &&
                _config.display.showParentInfo !== false
                  ? `<div class="result-parent">in ${highlightMatch(result.item.parentLabel, searchTerm)}</div>`
                  : "";

              // [THUMBNAIL SETTINGS] Determine icon - use business icon or sheets-defined type icon as appropriate
              const iconType =
                result.item.type === "Panorama" && result.item.businessName
                  ? "Business"
                  : result.item.sheetsData?.elementType
                    ? result.item.sheetsData.elementType
                    : result.item.type;

              // [THUMBNAIL SETTINGS] Check for available image sources
              const hasGoogleSheetsImage =
                _config.googleSheets?.useGoogleSheetData &&
                result.item.imageUrl;

              // [1.1.2.1] Extract panorama/element thumbnail URL from tour data if available
              let thumbnailUrl = "";
              try {
                if (result.item.media && result.item.media.get) {
                  // Try to get thumbnail from media object for panoramas
                  const thumbnail = result.item.media.get("thumbnail");
                  if (thumbnail) {
                    thumbnailUrl = thumbnail;
                    Logger.debug(
                      `[Thumbnail] Found direct thumbnail for ${result.item.label}`,
                    );
                  } else {
                    // Try to get first frame or preview image
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

              // [1.1.2.2] For sheet data, prioritize the image from sheets
              if (hasGoogleSheetsImage) {
                thumbnailUrl = result.item.imageUrl;
                Logger.debug(
                  `[Thumbnail] Using Google Sheets image for ${result.item.label}`,
                );
              }

              // ADD THE FIX HERE - If no thumbnail URL, use the type-specific default
              if (!thumbnailUrl) {
                // Get the element type
                const elementType = result.item.type || "default";

                // Look up the type-specific default image
                if (
                  _config.thumbnailSettings?.defaultImages &&
                  _config.thumbnailSettings.defaultImages[elementType]
                ) {
                  thumbnailUrl =
                    _config.thumbnailSettings.defaultImages[elementType];
                  Logger.debug(
                    `[Thumbnail] Using type-specific default image for ${elementType}`,
                  );
                } else if (
                  _config.thumbnailSettings?.defaultImages &&
                  _config.thumbnailSettings.defaultImages.default
                ) {
                  thumbnailUrl =
                    _config.thumbnailSettings.defaultImages.default;
                  Logger.debug(`[Thumbnail] Using fallback default image`);
                } else {
                  thumbnailUrl =
                    _config.thumbnailSettings?.defaultImagePath || "";
                  Logger.debug(`[Thumbnail] Using legacy default image path`);
                }
              }
              // [1.1.2.3] Determine if we should show thumbnail based on config
              const thumbSettings = _config.thumbnailSettings || {};
              let elementTypeLower = "other";

              try {
                elementTypeLower = (result.item.type || "").toLowerCase();
                // Handle empty or invalid types
                if (!elementTypeLower) {
                  elementTypeLower = "other";
                }
              } catch (error) {
                Logger.warn(
                  "[Thumbnail] Error processing element type:",
                  error,
                );
              }

              // [1.1.2.4] Check if thumbnails are enabled for this element type
              const shouldShowThumbnail =
                thumbSettings.enableThumbnails &&
                ((thumbSettings.showFor &&
                  thumbSettings.showFor[elementTypeLower] === true) ||
                  (elementTypeLower !== "panorama" &&
                    elementTypeLower !== "hotspot" &&
                    thumbSettings.showFor &&
                    thumbSettings.showFor.other === true));

              // [1.1.2.5] Only show thumbnail if enabled and we have a URL or default path
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

              // [1.1.2.6] Determine thumbnail size class based on configuration
              let thumbnailSizeClass = "thumbnail-medium";
              if (thumbSettings.thumbnailSize === "small") {
                thumbnailSizeClass = "thumbnail-small";
              } else if (thumbSettings.thumbnailSize === "large") {
                thumbnailSizeClass = "thumbnail-large";
              }

              // [1.1.2.7] Set the alignment data attribute on the result item for CSS to handle
              if (hasThumbnail) {
                resultItem.setAttribute(
                  "data-thumbnail-align",
                  thumbSettings.alignment === "right" ? "right" : "left",
                );
              }

              // Update the data-icon-align attribute to match the thumbnail alignment setting
              resultItem.setAttribute(
                "data-icon-align",
                thumbSettings.alignment === "right" ? "right" : "left",
              );

              // Safely encode attribute values to prevent HTML injection
              const safeEncode = (str) => {

                if (typeof str === "string") {
                  return str
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#39;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
                }
                return str;
              };

              // Set inner HTML with safe encoding
              resultItem.innerHTML = `
                        <div class="result-content">
                            <div class="result-icon" aria-hidden="true">
                                ${getTypeIcon(iconType)}
                            </div>
                            <div class="result-info">
                                <div class="result-label">${highlightMatch(
                                  safeEncode(result.item.label),
                                  searchTerm,
                                )}</div>
                                <div class="result-subtitle">${highlightMatch(
                                  safeEncode(result.item.subtitle || ""),
                                  searchTerm,
                                )}</div>
                            </div>
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

              // Add click handler with improved element triggering
              resultItem.addEventListener("click", () => {
                // Handle different element types
                if (result.item.type === "Panorama") {
                  // Direct navigation for panoramas
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
                  // For child elements, navigate to parent panorama first
                  if (tour && tour.mainPlayList) {
                    try {
                      tour.mainPlayList.set(
                        "selectedIndex",
                        result.item.parentIndex,
                      );
                      Logger.info(
                        `Navigated to parent panorama at index ${result.item.parentIndex}`,
                      );

                      // Then trigger the element with retry logic
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

                // Save search term to history



                // Clear search input
                if (searchInput) {
                  searchInput.value = "";
                  searchInput.focus();
                }

                // Auto-hide based on configuration
                const isMobile = window.innerWidth <= _config.mobileBreakpoint;
                if (
                  (isMobile && _config.autoHide.mobile) ||
                  (!isMobile && _config.autoHide.desktop)
                ) {
                  _toggleSearch(false);
                }
              });

              // Add keyboard navigation
              resultItem.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  resultItem.click();
                }
              });

              // Add to group
              groupEl.appendChild(resultItem);
            });

            // Add group to results list
            resultsList.appendChild(groupEl);
          });

        // Update ARIA attribute for total results
        resultsContainer.setAttribute("aria-setsize", resultIndex);
      } catch (error) {
        Logger.error("Search error:", error);
        // Show error message in results
        resultsList.innerHTML = `



                <div class="search-error" role="alert">
                    <p>An error occurred while searching. Please try again.</p>
                    <p class="search-error-details">${error.message}</p>
                </div>
            `;

        // FIXED: Keep container visible for error messages
        resultsContainer.classList.remove("hidden");
        resultsContainer.classList.add("visible");
        resultsContainer.classList.remove("no-results-bg"); // Use normal background for errors
      }
    };

    // Set up keyboard navigation
    // Use the centralized keyboardManager from the top of the module
    // Initialize the keyboard manager with the search container and input
    keyboardCleanup = keyboardManager.init(
      _elements.container,
      _elements.container.querySelector("#tourSearch"),
      performSearch,
    );

    // Bind search event listeners for UI interactions
    _bindSearchEventListeners(
      _elements.container,
      _elements.container.querySelector("#tourSearch"),
      _elements.container.querySelector(".clear-button"),
      _elements.container.querySelector(".search-icon"),
      performSearch, // Pass the module-level performSearch function
    );

    // Prepare the search index
    prepareFuse();

    // Apply search styling
    _applySearchStyling();

    // Apply custom CSS for showing/hiding tags
    let styleElement = document.getElementById("search-custom-styles");
    if (styleElement) {
      styleElement.remove();
    }

    document.body.classList.toggle(
      "show-result-tags",
      _config.showTagsInResults,
    );

    // Get key elements
    const searchInput = _elements.container.querySelector("#tourSearch");
    const clearButton = _elements.container.querySelector(".clear-button");
    const searchIcon = _elements.container.querySelector(".search-icon");

    // Bind all event listeners
    _bindSearchEventListeners(
      _elements.container,
      searchInput,
      clearButton,
      searchIcon,
      performSearch, // Pass the module-level performSearch function
    );

    // [5.4.1.1] Mark initialization as complete
    window.searchListInitialized = true;
    _initialized = true;
    Logger.info("Enhanced search initialized successfully");
  }

  // [5.4.2] Search visibility toggle
  let _lastToggleTime = 0;
  let _toggleDebounceTime = 300; // ms
  let _isSearchVisible = false; // Track the current state

  // Then update your _toggleSearch function to handle rapid toggles
  function _toggleSearch(show) {
    // Get current state
    const currentlyVisible =
      _elements.container && _elements.container.classList.contains("visible");
    _isSearchVisible = currentlyVisible;

    // If 'show' is explicitly specified (not undefined) and matches current state, debounce it
    if (
      show !== undefined &&
      ((show && currentlyVisible) || (!show && !currentlyVisible))
    ) {
      console.log(`[toggleSearch] Ignoring duplicate state request: ${show}`);
      return;
    }
    // Debounce logic for double-calls from 3DVista toggle button
    const now = Date.now();
    if (now - _lastToggleTime < _toggleDebounceTime) {
      console.log("[toggleSearch] Ignoring rapid toggle call, debouncing");
      return; // Ignore rapid repeated calls
    }
    _lastToggleTime = now;
    // Add toggle state tracking at the beginning of the function
    // This enables proper toggle functionality without modifying 3DVista button code
    if (show === undefined) {
      // When no parameter is provided, toggle the current visibility state
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
      console.log("[toggleSearch] Called with show =", show);
      if (!searchContainer) {
        console.error("[toggleSearch] ERROR: searchContainer not found");
      } else {
        console.log(
          "[toggleSearch] searchContainer display:",
          getComputedStyle(searchContainer).display,
        );
      }
      if (resultsContainer) {
        console.log(
          "[toggleSearch] resultsContainer display:",
          getComputedStyle(resultsContainer).display,
        );
      } else {
        console.log("[toggleSearch] resultsContainer not found");
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

    // [7.2.1] Validate container exists
    if (!_elements.container) {
      Logger.error("Search container not found");
      return;
    }

    // Show search

    if (show) {
      console.log("[toggleSearch] Showing search UI");
      // Update display before animation

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

      // Ensure it's within viewport bounds
      const viewportHeight = window.innerHeight;
      const searchContainerRect = _elements.container.getBoundingClientRect();
      const searchContainerTop = searchContainerRect.top;
      const searchContainerHeight = searchContainerRect.height;

      // Adjust position if needed to keep within viewport
      if (searchContainerTop + searchContainerHeight > viewportHeight) {
        const newTop = Math.max(
          10,
          viewportHeight - searchContainerHeight - 20,
        );
        _elements.container.style.setProperty("--container-top", `${newTop}px`);
      }

      // Trigger animation on next frame
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

        // Focus input field
        if (_elements.input) {
          _elements.input.focus();
          console.log("[toggleSearch] Focused search input");
        }
      });
    } else {
      // Hide search
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

      // Reset search results container
      const resultsContainer =
        _elements.container.querySelector(".search-results");
      if (resultsContainer) {
        resultsContainer.classList.remove("visible", "no-results-bg");
        resultsContainer.classList.add("hidden");
      }

      // Set ARIA expanded state
      _aria.setExpanded(_elements.container, false);

      // Wait for transition to complete before hiding
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

      // Clean up after animation
      setTimeout(() => {
        // Reset input and UI
        if (_elements.input) {
          _elements.input.value = "";
          _elements.input.blur();
          console.log("[toggleSearch] Cleared and blurred search input");
        }
      }, 400);

      // Clear UI elements
      setTimeout(() => {
        // Update cached elements
        if (_elements.clearButton) {
          _elements.clearButton.classList.remove("visible");
          console.log("[toggleSearch] Cleared clearButton visibility");
        }

        if (_elements.searchIcon) {
          _elements.searchIcon.classList.remove("icon-hidden");
          _elements.searchIcon.classList.add("icon-visible");
          console.log("[toggleSearch] Reset searchIcon opacity");
        }

        // Clear results
        if (_elements.results) {
          const resultsList =
            _elements.container.querySelector(".results-section");
          if (resultsList) {
            resultsList.innerHTML = "";
            console.log("[toggleSearch] Cleared resultsSection innerHTML");
          }
        }

        // Hide any error messages
        const noResults = _elements.container.querySelector(".no-results");
        if (noResults) {
          noResults.classList.remove("visible");
          noResults.classList.add("hidden");
          console.log("[toggleSearch] Hid noResults");
        }
      }, 200); // Match the CSS transition duration
    }
  }

  // [6.0] PUBLIC API
  return {
    // [6.1] DOM elements cache
    elements: _elements,
    // [6.2] Initialize search functionality
    initializeSearch: function (tour) {
      try {
        if (!tour) {
          throw new Error("Tour instance is required for initialization");
        }

        // Find the search container if it's not already set
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

    // [6.3] Toggle search visibility
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

    // [6.4] Update configuration
    updateConfig: function (newConfig) {
      try {
        // [6.4.1] Validate configuration object
        if (!newConfig || typeof newConfig !== "object") {
          throw new Error("Invalid configuration object");
        }

        // Deep merge function
        function deepMerge(target, source) {
          // Handle null/undefined values
          if (!source) return target;
          if (!target) return source;

          for (const key in source) {
            // Skip prototype properties and undefined values
            if (
              !Object.prototype.hasOwnProperty.call(source, key) ||
              source[key] === undefined
            ) {
              continue;
            }

            // Deep merge for objects that aren't arrays
            if (
              source[key] &&
              typeof source[key] === "object" &&
              !Array.isArray(source[key])
            ) {
              // Create empty target object if needed
              if (!target[key] || typeof target[key] !== "object") {
                target[key] = {};
              }

              // Recurse for nested objects
              deepMerge(target[key], source[key]);
            } else {
              // Direct assignment for primitives and arrays
              target[key] = source[key];
            }
          }

          return target;
        }

        // Use the ConfigBuilder if the format is appropriate
        if (typeof newConfig === "object" && !Array.isArray(newConfig)) {
          if (
            newConfig.display ||
            newConfig.includeContent ||
            newConfig.filter ||
            newConfig.useAsLabel ||
            newConfig.appearance ||
            newConfig.searchBar
          ) {
            // Looks like a configuration object suitable for the builder
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

            // General options
            builder.setGeneralOptions(newConfig);

            // Build the config
            const builtConfig = builder.build();

            // Merge with existing config
            _config = deepMerge(_config, builtConfig);
          } else {
            // Not structured for the builder, just deep merge
            _config = deepMerge(_config, newConfig);
          }
        }

        // Apply styling updates
        _applySearchStyling();

        // Reinitialize if already initialized
        if (_initialized && window.tourInstance) {
          _initializeSearch(window.tourInstance);
        }

        return this.getConfig();
      } catch (error) {
        Logger.error("Error updating configuration:", error);
        return this.getConfig();
      }
    },

    // [6.5] Get current configuration
    getConfig: function () {
      try {
        return JSON.parse(JSON.stringify(_config));
      } catch (error) {
        Logger.error("Error getting configuration:", error);
        return {};
      }
    },

    // [6.6] Search history management
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

    // [6.7] Logging control
    setLogLevel(level) {
      if (typeof level === "number" && level >= 0 && level <= 4) {
        Logger.level = level;
        return true;
      }
      return false;
    },

    // [6.8] Utility functions
    utils: {
      debounce: _debounce,
      getElementType: _getElementType,
      triggerElement: _triggerElement,
    },
  };
})();

// [7.0] GLOBAL EXPORTS
window.searchFunctions = window.tourSearchFunctions;

// Initialize with better sequence control
// DOM ready handler for search initialization
document.addEventListener("DOMContentLoaded", function () {
  // Wait for a short time to ensure DOM is stable
  setTimeout(function () {
    // Find the search container in DOM
    const containerEl = document.getElementById("searchContainer");

    // If container exists in DOM but not in cache, update the cache
    if (
      containerEl &&
      (!window.searchFunctions || !window.searchFunctions.elements.container)
    ) {
      console.log(
        "[Search] Found existing searchContainer in DOM, updating element cache",
      );

      // Update the elements cache directly
      if (window.searchFunctions && window.searchFunctions.elements) {
        window.searchFunctions.elements.container = containerEl;

        // Also update child element references
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

    // Now update the config - this should work with the updated element references
    if (window.searchFunctions) {
      window.searchFunctions.updateConfig({
        businessData: {
          useBusinessData: true,
          businessDataFile: "business.json",
          businessDataDir: "business-data",
          matchField: "id",
          businessDataUrl: `${window.location.origin}${window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/"))}/search-pro-non-mod/business-data/business.json`,
        },
      });
      // Then force reinitialization if tour is available
      if (window.tourInstance) {
        console.log(
          "[BUSINESS DATA] Reinitializing search with updated config",
        );
        window.searchFunctions.initializeSearch(window.tourInstance);
      }
    }
  }, 100);
});
