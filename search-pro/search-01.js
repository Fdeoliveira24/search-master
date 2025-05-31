/*
====================================
3DVista Enhanced Search Script
Version: 2.1.0
Last Updated: 05/29/2025
Description: Core search functionality for 3DVista tours with improved element detection,
filtering options, and better UI interactions. Optimized for both desktop and mobile.
This version implements robust initialization patterns, proper lifecycle management,
and multiple fallback strategies for tour readiness detection.
====================================
*/

// [0.0] SEARCH PRO LIFECYCLE MANAGER
// This self-executing function manages the entire lifecycle of the Search Pro plugin
(function() {
  // [0.1] CORE UTILITIES AND CONSTANTS
  const Logger = window.searchProDebugLogger || console;
  const SCRIPT_VERSION = '2.1.0';
  
  // [0.2] MODULE STATE TRACKING
  const SearchProState = {
    isLoaded: false,        // Script has been loaded
    isInitialized: false,   // Search has been initialized with tour
    isModulesLoaded: false, // All modules are loaded
    pendingInitializations: [], // Queue of initialization requests
    cleanupFunctions: [],   // Functions to run during teardown
    domObserver: null,      // MutationObserver for tour DOM changes
    tourEventListeners: [], // Tour-specific event listeners
    
    // Module loading state
    modules: {
      required: ["Utils", "DOMHandler", "DataManager", "SearchEngine", "UIManager", "RelatedContent"],
      loaded: []
    }
  };
  
  // [0.3] TOUR DETECTION AND READINESS
  
  // [0.3.1] Check if mainPlayList is fully ready (with items)
  function isMainPlayListReady() {
    const tour = window.tour || window.tourInstance;
    return (
      tour &&
      tour.mainPlayList &&
      typeof tour.mainPlayList.get === "function" &&
      Array.isArray(tour.mainPlayList.get("items")) &&
      tour.mainPlayList.get("items").length > 0
    );
  }
  
  // [0.3.2] Promise-based tour readiness detection with multiple strategies
  function waitForTourReady(timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      // If tour is already ready, resolve immediately
      if (isMainPlayListReady()) {
        Logger.info("Tour already ready, proceeding with initialization");
        resolve(window.tour || window.tourInstance);
        return;
      }
      
      // Strategy 1: Use official TDV event if available
      if (window.TDV && window.TDV.Tour && window.TDV.Tour.EVENT_TOUR_LOADED && window.tour) {
        Logger.info("Using TDV.Tour.EVENT_TOUR_LOADED for initialization");
        
        // Add to cleanup functions
        const unbindEvent = () => {
          try {
            window.tour.unbind(window.TDV.Tour.EVENT_TOUR_LOADED, onTourLoaded);
          } catch (e) {
            // Ignore errors during cleanup
          }
        };
        SearchProState.cleanupFunctions.push(unbindEvent);
        
        // Set up event listener
        const onTourLoaded = function() {
          if (isMainPlayListReady()) {
            unbindEvent();
            resolve(window.tour);
          } else {
            // Even after EVENT_TOUR_LOADED, the tour might not be fully ready
            // Fall back to polling
            Logger.info("Tour event fired but mainPlayList not ready, falling back to polling");
            startPolling();
          }
        };
        
        window.tour.bind(window.TDV.Tour.EVENT_TOUR_LOADED, onTourLoaded);
        return;
      }
      
      // Strategy 2: Set up DOM observer for tour changes
      function setupDOMObserver() {
        if (SearchProState.domObserver) return;
        
        const observer = new MutationObserver((mutations) => {
          if (isMainPlayListReady()) {
            observer.disconnect();
            SearchProState.domObserver = null;
            resolve(window.tour || window.tourInstance);
          }
        });
        
        // Observe document body for changes that might indicate tour loading
        observer.observe(document.body, { 
          childList: true, 
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'style']
        });
        
        SearchProState.domObserver = observer;
        SearchProState.cleanupFunctions.push(() => {
          if (SearchProState.domObserver) {
            SearchProState.domObserver.disconnect();
            SearchProState.domObserver = null;
          }
        });
      }
      
      // Strategy 3: Polling with timeout
      function startPolling() {
        const pollInterval = 200;
        const start = Date.now();
        let pollTimer;
        
        const poll = () => {
          if (isMainPlayListReady()) {
            clearTimeout(pollTimer);
            resolve(window.tour || window.tourInstance);
            return;
          }
          
          if (Date.now() - start > timeoutMs) {
            clearTimeout(pollTimer);
            Logger.warn("Tour readiness polling timed out after", timeoutMs, "ms");
            reject(new Error("Tour did not become ready within the timeout period"));
            return;
          }
          
          pollTimer = setTimeout(poll, pollInterval);
        };
        
        poll();
        
        // Add cleanup function
        SearchProState.cleanupFunctions.push(() => {
          clearTimeout(pollTimer);
        });
      }
      
      // Start both strategies in parallel
      setupDOMObserver();
      startPolling();
    });
  }
  
  // [0.4] DEPENDENCY MANAGEMENT
  
  // [0.4.1] Load Fuse.js dependency
  function loadFuseJS() {
    return new Promise((resolve, reject) => {
      // Skip if already loaded
      if (typeof Fuse !== "undefined") {
        Logger.info("Fuse.js already loaded, skipping load");
        resolve();
        return;
      }

      // Try to load local Fuse.js first
      const fuseScript = document.createElement("script");
      fuseScript.src = "search-pro/fuse.js/dist/fuse.min.js";
      fuseScript.async = true;

      fuseScript.onload = () => {
        Logger.info("Local Fuse.js loaded successfully");
        resolve();
      };

      fuseScript.onerror = () => {
        Logger.info("Local Fuse.js failed to load, attempting to load from CDN...");

        // Fallback to CDN
        const fuseCDN = document.createElement("script");
        fuseCDN.src = "https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js";
        fuseCDN.async = true;

        fuseCDN.onload = () => {
          Logger.info("Fuse.js loaded successfully from CDN");
          resolve();
        };

        fuseCDN.onerror = () => {
          const error = new Error("Both local and CDN versions of Fuse.js failed to load");
          Logger.error(error);
          reject(error);
        };

        document.body.appendChild(fuseCDN);
      };

      document.body.appendChild(fuseScript);
    });
  }

  // [0.4.2] Load debug tools if enabled
  function loadDebugTools() {
    return new Promise((resolve) => {
      // Check for debug flag (can be set in URL or localStorage)
      const debugEnabled =
        window.location.search.includes("debug=true") ||
        localStorage.getItem("searchProDebugEnabled") === "true";

      if (!debugEnabled) {
        resolve(false);
        return;
      }

      const debugScript = document.createElement("script");
      debugScript.src = "search-pro/js/debug-core.js";
      debugScript.async = true;

      debugScript.onload = () => {
        Logger.info("Search Pro Debug Tools loaded successfully");
        resolve(true);
      };

      debugScript.onerror = () => {
        Logger.info("Search Pro Debug Tools failed to load");
        resolve(false);
      };

      document.body.appendChild(debugScript);
    });
  }
  
  // [0.4.3] Load all search pro modules
  function loadModules() {
    return new Promise((resolve, reject) => {
      // Skip if modules are already loaded
      if (SearchProState.isModulesLoaded) {
        resolve();
        return;
      }
      
      const moduleNames = [
        "utils",
        "dom-handler",
        "data-manager",
        "search-engine",
        "ui-manager",
        "related-content",
      ];
      
      let modulesLoaded = 0;
      let hasErrors = false;
      
      moduleNames.forEach((moduleName) => {
        // Skip if already loaded
        if (SearchProState.modules.loaded.includes(moduleName)) {
          modulesLoaded++;
          if (modulesLoaded === moduleNames.length) {
            verifyModules();
          }
          return;
        }
        
        const script = document.createElement("script");
        script.src = `search-pro/modules/${moduleName}.js`;
        script.async = false; // Load in sequence to respect dependencies
  
        script.onload = () => {
          modulesLoaded++;
          SearchProState.modules.loaded.push(moduleName);
          Logger.info(`Loaded module: ${moduleName} (${modulesLoaded}/${moduleNames.length})`);
          
          if (modulesLoaded === moduleNames.length) {
            verifyModules();
          }
        };
  
        script.onerror = () => {
          modulesLoaded++;
          hasErrors = true;
          Logger.error(`Failed to load module: ${moduleName}`);
          
          if (modulesLoaded === moduleNames.length) {
            if (hasErrors) {
              reject(new Error("One or more modules failed to load"));
            } else {
              verifyModules();
            }
          }
        };
  
        document.body.appendChild(script);
      });
      
      // Verify all required modules are available
      function verifyModules() {
        const missingModules = SearchProState.modules.required.filter(
          (mod) => !window.SearchProModules?.[mod]
        );
        
        if (missingModules.length > 0) {
          Logger.error("Missing required modules:", missingModules);
          reject(new Error(`Missing required modules: ${missingModules.join(", ")}`));
          return;
        }
        
        SearchProState.isModulesLoaded = true;
        Logger.info("All modules loaded and verified successfully");
        resolve();
      }
    });
  }
  
  // [0.5] INITIALIZATION AND LIFECYCLE MANAGEMENT
  
  // [0.5.1] Initialize all dependencies and prepare for search
  async function initializeDependencies() {
    try {
      // Skip if already initialized
      if (SearchProState.isLoaded) {
        return true;
      }
      
      // Load all modules first
      await loadModules();
      
      // Get essential module references
      const DOMHandler = window.SearchProModules.DOMHandler;
      
      // Load CSS and initialize DOM
      await DOMHandler.loadCSS();
      if (!DOMHandler.initializeDom()) {
        throw new Error("Failed to initialize DOM");
      }
      
      // Load dependencies and debug tools in parallel
      await Promise.all([
        loadFuseJS(),
        loadDebugTools()
      ]);
      
      // Mark as loaded
      SearchProState.isLoaded = true;
      Logger.info("✅ Search Pro dependencies initialized successfully");
      return true;
    } catch (error) {
      Logger.error("Failed to initialize dependencies:", error);
      return false;
    }
  }
  
  // [0.5.2] Main search initialization with tour instance
  async function initializeSearch(tour) {
    // Skip if no tour provided
    if (!tour) {
      Logger.error("No tour instance provided for initialization");
      return false;
    }
    
    try {
      // Initialize dependencies if not already done
      if (!SearchProState.isLoaded) {
        const success = await initializeDependencies();
        if (!success) {
          throw new Error("Failed to initialize dependencies");
        }
      }
      
      // Skip if already initialized with this tour
      if (SearchProState.isInitialized) {
        Logger.info("Search already initialized, skipping initialization");
        return true;
      }
      
      // Initialize search engine with tour
      if (window.SearchProModules?.SearchEngine?.initialize) {
        await window.SearchProModules.SearchEngine.initialize(tour);
        
        // Set initialization flags for backward compatibility
        window.searchListInitialized = true;
        window.searchListInitiinitialized = true; // Maintain typo for compatibility
        SearchProState.isInitialized = true;
        
        Logger.info("✅ Search initialized successfully with tour");
        return true;
      } else {
        throw new Error("SearchEngine module not available");
      }
    } catch (error) {
      Logger.error("Failed to initialize search:", error);
      return false;
    }
  }
  
  // [0.5.3] Cleanup all resources and event listeners
  function cleanup() {
    Logger.info("Cleaning up Search Pro resources");
    
    // Run all registered cleanup functions
    SearchProState.cleanupFunctions.forEach(fn => {
      try {
        fn();
      } catch (e) {
        // Ignore errors during cleanup
      }
    });
    
    // Clear all state
    SearchProState.cleanupFunctions = [];
    SearchProState.pendingInitializations = [];
    SearchProState.isInitialized = false;
    
    // Disconnect DOM observer if active
    if (SearchProState.domObserver) {
      SearchProState.domObserver.disconnect();
      SearchProState.domObserver = null;
    }
    
    // Remove tour event listeners
    SearchProState.tourEventListeners.forEach(({ target, event, listener }) => {
      try {
        if (target && typeof target.unbind === 'function') {
          target.unbind(event, listener);
        }
      } catch (e) {
        // Ignore errors during cleanup
      }
    });
    SearchProState.tourEventListeners = [];
    
    Logger.info("Search Pro cleanup completed");
  }
  
  // [0.6] ENTRY POINT: Initialize search when tour is ready
  async function initializeSearchWhenTourReady() {
    // Skip if already initialized
    if (SearchProState.isInitialized) {
      Logger.info("Search already initialized, skipping initialization");
      return true;
    }
    
    try {
      // Initialize dependencies
      await initializeDependencies();
      
      // Wait for tour to be ready
      const tour = await waitForTourReady();
      
      // Initialize search with tour
      return await initializeSearch(tour);
    } catch (error) {
      Logger.error("Failed to initialize search when tour ready:", error);
      return false;
    }
  }
  
  // [0.7] EXPOSE PUBLIC API
  
  // Create global namespace if it doesn't exist
  window.SearchProModules = window.SearchProModules || {};
  
  // Expose lifecycle management functions
  window.SearchProModules.Lifecycle = {
    initialize: initializeSearch,
    initializeWhenReady: initializeSearchWhenTourReady,
    cleanup: cleanup,
    getState: () => ({ ...SearchProState }),
    version: SCRIPT_VERSION
  };
  
  // [0.8] AUTO-START: Begin loading modules but don't auto-initialize
  if (!window._searchProLoaded) {
    window._searchProLoaded = true;
    initializeDependencies().then(() => {
      Logger.info("✅ Search Pro dependencies loaded. Will initialize when tour is ready or button is clicked.");
    });
  }
})();

// [1.0] CREATE EMPTY SearchProModules OBJECT IF IT DOESN'T EXIST YET
window.SearchProModules = window.SearchProModules || {};

// [2.0] MAIN SEARCH MODULE DEFINITION
window.tourSearchFunctions = (function () {
  // [1.0] MODULE DEPENDENCIES
  const DOMHandler =
    window.SearchProModules && window.SearchProModules.DOMHandler;
  const DataManager =
    window.SearchProModules && window.SearchProModules.DataManager;
  const SearchEngine =
    window.SearchProModules && window.SearchProModules.SearchEngine;
  const DataSourceModes =
    window.SearchProModules && window.SearchProModules.DataSourceModes;
  // Safe logger fallback
  const Logger =
    (window.SearchProModules &&
      window.SearchProModules.Utils &&
      window.SearchProModules.Utils.Logger) ||
    console;

  // [1.1] VALIDATION UTILITIES
  function validateConfig(config) {
    if (!config) config = {};

    // Ensure essential defaults exist
    return {
      businessData: {
        useBusinessData: config.businessData?.useBusinessData || false,
        businessDataFile:
          config.businessData?.businessDataFile || "business.json",
        businessDataDir:
          config.businessData?.businessDataDir || "business-data",
      },
      googleSheets: {
        useGoogleSheetData: config.googleSheets?.useGoogleSheetData || false,
        googleSheetUrl: config.googleSheets?.googleSheetUrl || "",
        fetchMode: config.googleSheets?.fetchMode || "csv",
      },
      ...config,
    };
  }

  // [2.1] CONSTANTS AND CONFIGURATION
  const BREAKPOINTS = {
    mobile: 768,
    tablet: 1024,
  };

  // [2.1.1] Configuration Builder Class for more maintainable options
  class ConfigBuilder {
    constructor() {
      // [2.1.1.1] Default configuration
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
          useBusinessData: false, // Enable or disable business data integration
          useAsDataSource: true, // If true, business data is primary; if false, hybrid enhancement
          businessDataFile: "business.json",
          businessDataDir: "business-data",
        },
        // Google Sheets integration
        googleSheets: {
          useGoogleSheetData: false, // Enable or disable Google Sheets integration
          googleSheetUrl:
            "https://docs.google.com/spreadsheets/d/e/2PACX-1vQrQ9oy4JjwYAdTG1DKne9cu76PZCrZgtIOCX56sxVoBwRzys36mTqvFMvTE2TB-f-k5yZz_uWwW5Ou/pub?output=csv",
          fetchMode: "csv", // 'csv' or 'json'
          useAsDataSource: true, // If true, sheet is primary; if false, hybrid enhancement
          csvOptions: {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
          },
          // Caching options
          caching: {
            enabled: false, // Enable or disable Google Sheets integration caching
            timeoutMinutes: 60, // Cache expiration time
            storageKey: "tourGoogleSheetsData",
          },
          // Progressive loading options
          progressiveLoading: {
            enabled: false, // Enable or disable progressive loading
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
            enabled: false, // Enable or disable authentication
            authType: "apiKey", // 'apiKey' or 'oauth'
            apiKey: "",
            apiKeyParam: "key", // URL parameter name for API key
          },
        },
        // [2.1.1.1] Thumbnail settings
        thumbnailSettings: {
          enableThumbnails: false, // Enable or disable thumbnails
          thumbnailSize: "medium", // 'small', 'medium', 'large'
          thumbnailSizePx: 48, // Resolved px value for quick use
          borderRadius: 4, // in px

          // Type-specific default images
          defaultImages: {
            Panorama: "./search-pro/assets/default-thumbnail.jpg",
            Hotspot: "./search-pro/assets/hotspot-default.jpg",
            Polygon: "./search-pro/assets/polygon-default.jpg",
            Video: "./search-pro/assets/video-default.jpg",
            Webframe: "./search-pro/assets/webframe-default.jpg",
            Image: "./search-pro/assets/image-default.jpg",
            Text: "./search-pro/assets/text-default.jpg",
            ProjectedImage: "./search-pro/assets/projected-image-default.jpg",
            Element: "./search-pro/assets/element-default.jpg",
            Business: "./search-pro/assets/business-default.jpg",
            // Fallback for any undefined types
            default: "./search-pro/assets/default-thumbnail.jpg",
          },

          alignment: "left", // 'left' or 'right'
          showFor: {
            panorama: true,
            hotspot: true,
            polygon: true,
            video: true,
            webframe: true,
            image: true,
            text: true,
            other: true,
          },
        },
      };
    }

    // [2.1.1.2] Setters for different configuration sections
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

    // [2.1.1.3] Set related content options
    setRelatedContentOptions(options) {
      this.config.relatedContent = {
        enabled: options?.enabled !== undefined ? options.enabled : false,
        maxItems: options?.maxItems || 3,
        headerText: options?.headerText || "Related Content",
        defaultExpanded:
          options?.defaultExpanded !== undefined
            ? options.defaultExpanded
            : true,
        collapsible:
          options?.collapsible !== undefined ? options.collapsible : true,
        showHeader:
          options?.showHeader !== undefined ? options.showHeader : true,
        criteria: {
          groupType: {
            enabled:
              options?.criteria?.groupType?.enabled !== undefined
                ? options.criteria.groupType.enabled
                : true,
            weight: options?.criteria?.groupType?.weight || 1.0,
          },
          tags: {
            enabled:
              options?.criteria?.tags?.enabled !== undefined
                ? options.criteria.tags.enabled
                : true,
            weight: options?.criteria?.tags?.weight || 0.8,
          },
          metadata: {
            enabled:
              options?.criteria?.metadata?.enabled !== undefined
                ? options.criteria.metadata.enabled
                : false,
            weight: options?.criteria?.metadata?.weight || 0.5,
          },
        },
      };
      return this;
    }

    // [2.1.1.4] All other configuration setters kept the same
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

    setLabelOptions(options) {
      this.config.useAsLabel = {
        subtitles: options?.subtitles !== undefined ? options.subtitles : true,
        tags: options?.tags !== undefined ? options.tags : true,
        elementType:
          options?.elementType !== undefined ? options.elementType : false,
        parentWithType:
          options?.parentWithType !== undefined
            ? options.parentWithType
            : false,
        customText: options?.customText || "[Unnamed Item]",
      };
      return this;
    }

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

    setDisplayLabels(options) {
      if (!options) return this;

      // Merge with defaults
      this.config.displayLabels = {
        ...this.config.displayLabels,
        ...options,
      };
      return this;
    }

    setBusinessDataOptions(options) {
      if (!options) return this;

      this.config.businessData = {
        useBusinessData:
          options.useBusinessData !== undefined
            ? options.useBusinessData
            : false,
        businessDataFile: options.businessDataFile || "business.json",
        businessDataDir: options.businessDataDir || "business-data",
      };
      return this;
    }

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

      // Enhanced default images configuration with proper fallbacks
      const defaultImages = {
        Panorama: "./search-pro/assets/panorama-default.jpg",
        Hotspot: "./search-pro/assets/hotspot-default.jpg",
        Polygon: "./search-pro/assets/polygon-default.jpg",
        Video: "./search-pro/assets/video-default.jpg",
        Webframe: "./search-pro/assets/webframe-default.jpg",
        Image: "./search-pro/assets/image-default.jpg",
        Text: "./search-pro/assets/text-default.jpg",
        ProjectedImage: "./search-pro/assets/projected-image-default.jpg",
        Element: "./search-pro/assets/element-default.jpg",
        Business: "./search-pro/assets/business-default.jpg",
        Container: "./search-pro/assets/container-default.jpg",
        Audio: "./search-pro/assets/audio-default.jpg",
        Model3D: "./search-pro/assets/model3d-default.jpg",
        default: "./search-pro/assets/default-thumbnail.jpg",
        ...options.defaultImages,
      };

      this.config.thumbnailSettings = {
        enableThumbnails:
          options.enableThumbnails !== undefined
            ? options.enableThumbnails
            : true,
        thumbnailSize: options.thumbnailSize || "medium",
        thumbnailSizePx: sizePx,
        borderRadius:
          options.borderRadius !== undefined ? options.borderRadius : 4,
        defaultImages: defaultImages,
        alignment: options.alignment === "right" ? "right" : "left",
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
              : false,
          video:
            options.showFor?.video !== undefined ? options.showFor.video : true,
          webframe:
            options.showFor?.webframe !== undefined
              ? options.showFor.webframe
              : false,
          image:
            options.showFor?.image !== undefined ? options.showFor.image : true,
          text:
            options.showFor?.text !== undefined ? options.showFor.text : false,
          projectedimage:
            options.showFor?.projectedimage !== undefined
              ? options.showFor.projectedimage
              : false,
          business:
            options.showFor?.business !== undefined
              ? options.showFor.business
              : true,
          other:
            options.showFor?.other !== undefined
              ? options.showFor.other
              : false,
        },
        validateImages:
          options.validateImages !== undefined ? options.validateImages : false,
        showFallbackIcon:
          options.showFallbackIcon !== undefined
            ? options.showFallbackIcon
            : true,
      };
      return this;
    }

    setGoogleSheetsOptions(options) {
      if (!options) return this;

      this.config.googleSheets = {
        useGoogleSheetData:
          options.useGoogleSheetData !== undefined
            ? options.useGoogleSheetData
            : false, // Enable or disable Google Sheets integration
        googleSheetUrl:
          options.googleSheetUrl ||
          "https://docs.google.com/spreadsheets/d/e/2PACX-1vQrQ9oy4JjwYAdTG1DKne9cu76PZCrZgtIOCX56sxVoBwRzys36mTqvFMvTE2TB-f-k5yZz_uWwW5Ou/pub?output=csv",
        fetchMode: options.fetchMode || "csv", // 'csv' or 'json'
        useAsDataSource:
          options.useAsDataSource !== undefined
            ? options.useAsDataSource
            : false, // If true, sheet is primary; if false, hybrid enhancement
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
              : false, // Enable or disable Google Sheets integration caching
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

    build() {
      return this.config;
    }
  }

  // [2.1.2] Create default configuration
  let _config = new ConfigBuilder()
    .setDisplayOptions({})
    .setContentOptions({})
    .setFilterOptions({})
    .setLabelOptions({})
    .setAppearanceOptions({})
    .setSearchBarOptions({})
    .setBusinessDataOptions({})
    .setGoogleSheetsOptions({})
    .setDisplayLabels({})
    .build();

  let _initialized = false;

  // [2.2] DOM ELEMENT CACHE
  const _elements = {
    container: null,
    input: null,
    results: null,
    clearButton: null,
    searchIcon: null,
  };

  // Make elements available to both the direct API and modules
  window.SearchProModules.elements = _elements;

  // New initialization sequence manager
  async function initializeSearch(tour, config) {
    try {
      // 1. Show loading indicator
      DOMHandler.showLoadingState("Initializing search...");

      // 2. Validate tour object
      if (!tour || !tour.mainPlayList) {
        throw new Error("Tour or mainPlayList not available");
      }

      // 3. Ensure configuration is valid
      const validatedConfig = validateConfig(config);

      // 4. Determine active data source mode
      const activeMode = DataSourceModes.getActiveMode(validatedConfig);
      Logger.info(`Initializing search with ${activeMode} mode`);

      // 5. Load only the necessary data for the active mode
      let businessData = [];
      let googleSheetsData = [];

      if (
        activeMode === DataSourceModes.BUSINESS ||
        (activeMode === DataSourceModes.TOUR &&
          validatedConfig.businessData?.useBusinessData)
      ) {
        businessData = await DataManager.loadBusinessData(validatedConfig);
      }

      if (
        activeMode === DataSourceModes.GOOGLE_SHEETS ||
        (activeMode === DataSourceModes.TOUR &&
          validatedConfig.googleSheets?.useGoogleSheetData)
      ) {
        googleSheetsData =
          await DataManager.loadGoogleSheetsData(validatedConfig);
      }

      // 6. Build search index
      const searchIndex = SearchEngine.prepareSearchIndex(
        tour,
        validatedConfig,
        businessData,
        googleSheetsData,
        activeMode,
      );

      // 7. Update UI to reflect mode
      DOMHandler.updateInterfaceForMode(activeMode, validatedConfig);

      // 8. Complete initialization
      window.searchListInitialized = true;
      window.searchListInitiinitialized = true;

      // 9. Hide loading indicator
      DOMHandler.hideLoadingState();

      return searchIndex;
    } catch (error) {
      // Handle initialization errors
      DOMHandler.showErrorState("Search initialization failed", error.message);
      Logger.error("Search initialization failed:", error);
      return null;
    }
  }

  /**
   * Mode switching utility for runtime mode changes
   */
  function switchDataSourceMode(mode) {
    try {
      // 1. Get current configuration
      const currentConfig = window.tourSearchFunctions.getConfig();

      // 2. Update configuration with new mode
      if (!mode) {
        Logger.error("No mode specified for switchDataSourceMode");
        return false;
      }

      // 3. Get DataSourceModes reference
      const SearchEngine = window.SearchProModules?.SearchEngine;
      const DataSourceModes = SearchEngine?.DataSourceModes;
      if (!DataSourceModes) {
        Logger.error("DataSourceModes not available");
        return false;
      }

      // 4. Validate the requested mode
      const validModes = [
        DataSourceModes.TOUR,
        DataSourceModes.BUSINESS,
        DataSourceModes.GOOGLE_SHEETS,
        DataSourceModes.CUSTOM_THUMBNAILS,
      ];
      if (!validModes.includes(mode)) {
        Logger.error(`Invalid mode: ${mode}. Valid modes:`, validModes);
        return false;
      }

      // 5. Update configuration with new mode
      const updatedConfig = DataSourceModes.setMode(currentConfig, mode);
      //const updatedConfig = DataSourceModes.setMode(currentConfig, mode);
      // Tour Only
      // const updatedConfig = DataSourceModes.setMode(currentConfig, DataSourceModes.TOUR);
      // Business Data Only
      // const updatedConfig = DataSourceModes.setMode(currentConfig, DataSourceModes.BUSINESS);
      //Custom Thumbs Only
      // const updatedConfig = DataSourceModes.setMode(currentConfig, DataSourceModes.CUSTOM_THUMBNAILS);
      // Google Sheets Only
      // const updatedConfig = DataSourceModes.setMode(currentConfig, DataSourceModes.GOOGLE_SHEETS);

      // 3. Apply configuration
      window.tourSearchFunctions.updateConfig(updatedConfig);

      // 4. Clear old data
      DataManager.clearDataForMode(mode);

      // 5. Reinitialize search
      const tour = window.tour || window.tourInstance;
      window.searchListInitialized = false;
      window.searchListInitiinitialized = false;

      // 6. Show mode change notification
      DOMHandler.showNotification(`Switched to ${mode} mode`);

      // 7. Initialize with new configuration
      return initializeSearch(tour, updatedConfig);
    } catch (error) {
      Logger.error(`Failed to switch to ${mode} mode:`, error);
      DOMHandler.showErrorState(
        `Failed to switch to ${mode} mode`,
        error.message,
      );
      return false;
    }
  }

  // [2.3] SEARCH INITIALIZATION
  function _initializeSearch(tour) {
    // Get module references
    const Utils = window.SearchProModules?.Utils || {};
    const Logger = Utils.Logger || console;
    const ARIA = Utils.ARIA || {};
    const DOMHandler = window.SearchProModules?.DOMHandler || {};
    const UIManager = window.SearchProModules?.UIManager || {};
    const DataManager = window.SearchProModules?.DataManager || {};
    const SearchEngine = window.SearchProModules?.SearchEngine || {};
    const RelatedContent = window.SearchProModules?.RelatedContent || {};

    Logger.info("Initializing enhanced search v2.0...");
    window.tourInstance = tour;

    // [2.3.1] Prevent duplicate initialization
    if (window.searchListInitialized || window.searchListInitiinitialized) {
      Logger.info("Search already initialized, skipping...");
      return;
    }

    // [2.3.2] SIMPLE VALIDATION LIKE v1.3.0 - MOVED UP
    _elements.container = document.getElementById("searchContainer");

    // ADD DEBUGGING TO SEE WHAT'S MISSING:
    (window.searchProDebugLogger || console).log(
      "🔍 DEBUG - Checking requirements:",
    );
    (window.searchProDebugLogger || console).log(
      "  - Container found:",
      !!_elements.container,
    );
    (window.searchProDebugLogger || console).log("  - Tour object:", !!tour);
    (window.searchProDebugLogger || console).log(
      "  - Tour mainPlayList:",
      !!(tour && tour.mainPlayList),
    );
    if (tour) {
      (window.searchProDebugLogger || console).log(
        "  - Tour properties:",
        Object.keys(tour),
      );
      if (tour.mainPlayList) {
        (window.searchProDebugLogger || console).log(
          "  - MainPlayList type:",
          typeof tour.mainPlayList,
        );
        (window.searchProDebugLogger || console).log(
          "  - MainPlayList get function:",
          typeof tour.mainPlayList.get,
        );
      }
    }

    if (!_elements.container || !tour || !tour.mainPlayList) {
      Logger.warn(
        "Search initialization failed: missing requirements - will retry on next button click",
      );
      return;
    }

    // [2.3.3] DECLARE FUSE VARIABLE LOCALLY LIKE v1.3.0
    let fuse = null;

    // [2.3.4] Initialize BroadcastChannel for cross-window communication
    Utils.CrossWindowChannel.init();

    // [2.3.5] CREATE LOCAL prepareFuse FUNCTION LIKE v1.3.0
    const prepareFuse = () => {
      try {
        fuse = SearchEngine.prepareSearchIndex(
          tour,
          _config,
          DataManager.getBusinessData(),
          DataManager.getGoogleSheetsData(),
        );

        if (!fuse) {
          Logger.error("Failed to create search index");
          return;
        }

        Logger.info("✅ Search index prepared successfully");
      } catch (error) {
        Logger.error("Error preparing Fuse index:", error);
        // Create empty fuse as fallback
        fuse = new Fuse([], { keys: ["label"], includeScore: true });
      }
    };

    // [2.3.6] Create a promise chain to load all external data sources
    const dataPromises = [];

    // Load business data if enabled
    if (_config.businessData.useBusinessData) {
      dataPromises.push(DataManager.loadBusinessData(_config));
    }

    // Load Google Sheets data if enabled
    if (_config.googleSheets.useGoogleSheetData) {
      dataPromises.push(DataManager.loadGoogleSheetsData(_config));
    }

    // [2.3.7] When all data sources are loaded, prepare the search index
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

    // [2.3.8] Set up listener for cross-window messages
    Utils.CrossWindowChannel.listen(function (message) {
      try {
        if (message && message.type === "historyUpdate") {
          const { action, history } = message.data || {};

          // All search history functionality has been removed
          // Just handle UI updates when needed
          if ((action === "clear" || action === "update") && 
              _elements.container &&
              _elements.container.classList.contains("visible")) {
              
            const searchInput = _elements.container.querySelector("#tourSearch");
            if (searchInput && !searchInput.value.trim()) {
              // Trigger search to update the display
              const event = new Event("input");
              searchInput.dispatchEvent(event);
            }
          }
        }
      } catch (error) {
        Logger.warn("Error handling BroadcastChannel message:", error);
      }
    });

    // Add ARIA attributes to container
    ARIA.setRole(_elements.container, "search");
    ARIA.setLabel(_elements.container, "Tour search");

    // Create search UI components if needed
    DOMHandler.createSearchInterface(_elements.container, _config);

    // Core search state
    let currentSearchTerm = "";

    // Main search function with improved error handling
    const performSearch = () => {
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
        if (searchIcon) searchIcon.style.opacity = "0";
      } else {
        if (clearButton) clearButton.classList.remove("visible");
        if (searchIcon) searchIcon.style.opacity = "1";
      }

      // Skip if search term hasn't changed
      if (searchTerm === currentSearchTerm) return;
      currentSearchTerm = searchTerm;

      // Reset results list
      resultsList.innerHTML = "";

      // 🔍 SEARCH DEBUG - Start
      (window.searchProDebugLogger || console).log("🔍 SEARCH DEBUG - Start");
      (window.searchProDebugLogger || console).log(
        "  - Search term:",
        searchTerm,
      );
      (window.searchProDebugLogger || console).log(
        "  - Fuse available:",
        !!fuse,
      );
      (window.searchProDebugLogger || console).log(
        "  - Fuse _docs length:",
        fuse?._docs?.length || 0,
      );
      (window.searchProDebugLogger || console).log(
        "  - Results container:",
        !!resultsContainer,
      );
      (window.searchProDebugLogger || console).log(
        "  - Results list:",
        !!resultsList,
      );
      // Handle empty search - show history
      if (!searchTerm) {
        noResults.style.display = "none";
        resultsContainer.classList.remove("visible");
        resultsContainer.style.display = "none";
        resultsList.innerHTML = UIManager.renderSearchHistory();
        return;
      }

      // Check minimum character requirement
      if (searchTerm !== "*" && searchTerm.length < _config.minSearchChars) {
        noResults.style.display = "none";
        resultsContainer.classList.remove("visible");
        resultsList.innerHTML = `
                    <div class="search-min-chars" role="status" aria-live="assertive">
                        <p>Please type at least ${_config.minSearchChars} characters to search</p>
                    </div>
                `;
        return;
      }
      resultsContainer.style.display = "block";
      setTimeout(() => resultsContainer.classList.add("visible"), 10);

      try {
        // Ensure fuse index is initialized
        if (!fuse) {
          Logger.error(
            "Fuse search index is not initialized. Aborting search.",
          );
          noResults.setAttribute("role", "status");
          noResults.setAttribute("aria-live", "polite");
          noResults.style.display = "flex";
          return;
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
          const processedTerm = Utils.preprocessSearchTerm(searchTerm);

          // Allow exact matching with = prefix
          if (
            typeof processedTerm === "string" &&
            processedTerm.startsWith("=")
          ) {
            if (typeof fuse.search === "function") {
              matches = fuse.search({ $or: [{ label: processedTerm }] });
            } else {
              Logger.error("fuse.search is not a function");
              matches = [];
            }
          } else {
            // Use regular fuzzy search
            if (typeof fuse.search === "function") {
              matches = fuse.search(processedTerm);
            } else {
              Logger.error("fuse.search is not a function");
              matches = [];
            }
          }
        }

        // Handle no results case
        if (!matches || !matches.length) {
          // Make no results message accessible to screen readers
          noResults.setAttribute("role", "status");
          noResults.setAttribute("aria-live", "polite");
          noResults.style.display = "flex";
          return;
        }

        // Make results container accessible for screen readers
        resultsContainer.setAttribute("aria-live", "polite");
        resultsContainer.setAttribute("aria-relevant", "additions text");
        noResults.style.display = "none";

        // Display results
        resultsList.style.display = "block";
        noResults.style.display = "none";

        // Group and sort results
        const groupedResults = UIManager.groupAndSortResults(matches, _config);

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

        // Render each group of results
        // Define group display order (Panorama first, Hotspot second)
        const groupOrder = [
          "Panorama",
          "Hotspot",
          "Business",
          "Video",
          "Webframe",
          "Image",
          "Text",
          "Polygon",
          "Element",
        ];

        // Process groups in specified order
        [
          ...groupOrder.filter((type) => groupedResults[type]),
          ...Object.keys(groupedResults).filter(
            (type) => !groupOrder.includes(type),
          ),
        ].forEach((type) => {
          const results = groupedResults[type];
          const groupEl = document.createElement("div");
          groupEl.className = "results-group";
          groupEl.setAttribute("data-type", type);
          ARIA.setRole(groupEl, "group");
          ARIA.setLabel(groupEl, `${type} results`);

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
            ARIA.setRole(resultItem, "option");
            resultItem.tabIndex = 0;
            resultItem.setAttribute("aria-posinset", resultIndex);
            ARIA.setSelected(resultItem, false);
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
                ? `<div class="result-parent">in ${DOMHandler.highlightMatch(result.item.parentLabel, searchTerm)}</div>`
                : "";

            // [THUMBNAIL SETTINGS] Determine icon - use business icon or sheets-defined type icon as appropriate
            const iconType =
              result.item.type === "Panorama" && result.item.businessName
                ? "Business"
                : result.item.sheetsData?.elementType
                  ? result.item.sheetsData.elementType
                  : result.item.type;

            // [THUMBNAIL SETTINGS] Enhanced thumbnail resolution logic
            function resolveThumbnailUrl(result, config, logger) {
              const thumbSettings = config.thumbnailSettings || {};
              if (
                config.googleSheets?.useGoogleSheetData &&
                result.item.imageUrl
              ) {
                logger?.debug(
                  `[Thumbnail] Using Google Sheets image for ${result.item.label}: ${result.item.imageUrl}`,
                );
                return result.item.imageUrl;
              }
              let thumbnailUrl = "";
              try {
                if (result.item.media && result.item.media.get) {
                  const thumbnailSources = [
                    "thumbnail",
                    "firstFrame",
                    "preview",
                    "image",
                  ];
                  for (const source of thumbnailSources) {
                    const url = result.item.media.get(source);
                    if (url) {
                      thumbnailUrl = url;
                      logger?.debug(
                        `[Thumbnail] Found ${source} from media for ${result.item.label}: ${url}`,
                      );
                      break;
                    }
                  }
                }
              } catch (error) {
                logger?.warn(
                  `[Thumbnail] Error accessing media for ${result.item.label}:`,
                  error,
                );
              }
              if (!thumbnailUrl) {
                thumbnailUrl = getDefaultImageForType(
                  result.item.type,
                  thumbSettings,
                  logger,
                );
              }
              return thumbnailUrl;
            }

            function shouldShowThumbnail(result, thumbSettings) {
              if (!thumbSettings?.enableThumbnails) return false;
              const elementTypeLower = (result.item.type || "").toLowerCase();
              const showFor = thumbSettings.showFor || {};
              if (showFor[elementTypeLower] !== undefined) {
                return showFor[elementTypeLower];
              }
              if (
                elementTypeLower === "business" &&
                showFor.business !== undefined
              ) {
                return showFor.business;
              }
              if (
                elementTypeLower === "projectedimage" &&
                showFor.projectedimage !== undefined
              ) {
                return showFor.projectedimage;
              }
              return showFor.other || false;
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
              Logger.warn("[Thumbnail] Error processing element type:", error);
            }

            // Resolve the thumbnail URL using the enhanced function
            const thumbnailUrl = resolveThumbnailUrl(result, _config, Logger);

            // [1.1.2.4] Check if thumbnails are enabled for this element type using the new helper
            const shouldShowThumb = shouldShowThumbnail(result, thumbSettings);

            // [1.1.2.5] Only show thumbnail if enabled and we have a URL or default path
            const hasThumbnail =
              shouldShowThumb &&
              (thumbnailUrl ||
                (thumbSettings.defaultImages &&
                  Object.keys(thumbSettings.defaultImages).length > 0));

            if (thumbSettings.enableThumbnails && shouldShowThumb) {
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

            // Use thumbnailSizeClass in the next line to fix the warning
            resultItem.setAttribute(
              "data-thumbnail-size",
              thumbnailSizeClass.replace("thumbnail-", ""),
            );

            resultItem.setAttribute(
              "data-thumbnail-align",
              thumbSettings.alignment === "right" ? "right" : "left",
            );

            // Safely encode attribute values to prevent HTML injection
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

            // Normalize element type for consistent thumbnail lookups
            function normalizeElementType(elementType) {
              if (!elementType) return "Element";
              const typeMap = {
                HotspotPanoramaOverlay: "Hotspot",
                FramePanoramaOverlay: "Webframe",
                QuadVideoPanoramaOverlay: "Video",
                ImagePanoramaOverlay: "Image",
                TextPanoramaOverlay: "Text",
                ProjectedImageOverlay: "ProjectedImage",
                PanoramaOverlay: "Element",
              };
              return typeMap[elementType] || elementType;
            }

            // Get type-specific default image with enhanced fallback logic
            function getDefaultImageForType(
              elementType,
              thumbSettings,
              logger,
            ) {
              const defaultImages = thumbSettings?.defaultImages || {};
              const normalizedType = normalizeElementType(elementType);

              if (defaultImages[normalizedType]) {
                logger?.debug(
                  `[Thumbnail] Using type-specific image for ${normalizedType}: ${defaultImages[normalizedType]}`,
                );
                return defaultImages[normalizedType];
              }
              const typeKey = Object.keys(defaultImages).find(
                (key) => key.toLowerCase() === normalizedType.toLowerCase(),
              );
              if (typeKey && defaultImages[typeKey]) {
                logger?.debug(
                  `[Thumbnail] Using case-insensitive match for ${normalizedType}: ${defaultImages[typeKey]}`,
                );
                return defaultImages[typeKey];
              }
              const fallbackMappings = {
                hotspot: "Hotspot",
                polygon: "Polygon",
                video: "Video",
                webframe: "Webframe",
                image: "Image",
                text: "Text",
                panorama: "Panorama",
                business: "Business",
                element: "Element",
              };
              const fallbackType =
                fallbackMappings[normalizedType.toLowerCase()];
              if (fallbackType && defaultImages[fallbackType]) {
                logger?.debug(
                  `[Thumbnail] Using fallback mapping ${normalizedType} -> ${fallbackType}: ${defaultImages[fallbackType]}`,
                );
                return defaultImages[fallbackType];
              }
              const universalDefault =
                defaultImages.default ||
                defaultImages.Element ||
                "./search-pro/assets/default-thumbnail.jpg";
              logger?.debug(
                `[Thumbnail] Using universal default for ${normalizedType}: ${universalDefault}`,
              );
              return universalDefault;
            }

            // [1.1.2.8] Build result item content with enhanced thumbnail system
            const shouldShow = shouldShowThumbnail(result, thumbSettings);

            if (shouldShow) {
              // Use the enhanced thumbnail resolution function
              const resolvedThumbnailUrl = resolveThumbnailUrl(
                result,
                _config,
                Logger,
              );
              const safeResolvedThumbnailUrl = safeEncode(resolvedThumbnailUrl);
              const safeLabel = safeEncode(
                result.item.label || "Search result",
              ); // Add this line to define safeLabel
              let thumbnailSizeClass = "thumbnail-medium";
              if (thumbSettings.thumbnailSize === "small") {
                thumbnailSizeClass = "thumbnail-small";
              } else if (thumbSettings.thumbnailSize === "large") {
                thumbnailSizeClass = "thumbnail-large";
              }
              resultItem.setAttribute(
                "data-thumbnail-size",
                thumbnailSizeClass.replace("thumbnail-", ""),
              );
              resultItem.setAttribute(
                "data-thumbnail-align",
                thumbSettings.alignment === "right" ? "right" : "left",
              );
              const thumbnailHTML = `
                <div class="result-image ${thumbnailSizeClass}">
                  <img src="${safeResolvedThumbnailUrl}" 
                       alt="${safeLabel}" 
                       loading="lazy"
                       onerror="this.style.display='none'; this.parentElement.classList.add('image-error');"
                       onload="this.parentElement.classList.add('image-loaded');">
                  ${
                    thumbSettings.showFallbackIcon
                      ? `
                    <div class="fallback-icon" style="display: none;">
                      ${DOMHandler.getTypeIcon(iconType)}
                    </div>
                  `
                      : ""
                  }
                </div>`;
              if (window.searchProDebug?.logThumbnailAssignment) {
                window.searchProDebug.logThumbnailAssignment(
                  result,
                  thumbSettings,
                  resolvedThumbnailUrl,
                );
              }
              resultItem.innerHTML = `
                ${thumbnailHTML}
                <div class="result-content">
                  <div class="result-text">${DOMHandler.highlightMatch(result.item.label, searchTerm)}</div>
                  
                  ${
                    _config.businessData?.useBusinessData &&
                    result.item.businessName &&
                    result.item.originalLabel
                      ? `
                      <div class="result-business-context">
                          Location: ${DOMHandler.highlightMatch(result.item.originalLabel, searchTerm)}
                      </div>
                  `
                      : ""
                  }
                  
                  ${
                    _config.googleSheets?.useGoogleSheetData &&
                    result.item.sheetsData &&
                    !(
                      result.item.imageUrl &&
                      _config.googleSheets?.useGoogleSheetData
                    )
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
                          Tags: ${DOMHandler.highlightMatch(Array.isArray(result.item.tags) ? result.item.tags.join(", ") : result.item.tags, searchTerm)}
                      </div>
                  `
                      : ""
                  }
                  ${
                    !_config.display.onlySubtitles &&
                    result.item.subtitle &&
                    _config.display.showSubtitlesInResults !== false
                      ? `
                                <div class="result-description">${DOMHandler.highlightMatch(result.item.subtitle, searchTerm)}</div>
                            `
                      : ""
                  }
                        </div>
                        `;
            } else {
              // When thumbnails shouldn't be shown, display the icon instead
              const iconType =
                result.item.type === "Panorama" && result.item.businessName
                  ? "Business"
                  : result.item.sheetsData?.elementType || result.item.type;

              resultItem.innerHTML = `
                <div class="result-icon">${DOMHandler.getTypeIcon(iconType)}</div>
                <div class="result-content">
                  <div class="result-text">${DOMHandler.highlightMatch(result.item.label, searchTerm)}</div>
                  
                  ${
                    _config.businessData?.useBusinessData &&
                    result.item.businessName &&
                    result.item.originalLabel
                      ? `
                      <div class="result-business-context">
                          Location: ${DOMHandler.highlightMatch(result.item.originalLabel, searchTerm)}
                      </div>
                  `
                      : ""
                  }
                  
                  ${
                    _config.googleSheets?.useGoogleSheetData &&
                    result.item.sheetsData &&
                    !(
                      result.item.imageUrl &&
                      _config.googleSheets?.useGoogleSheetData
                    )
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
                          Tags: ${DOMHandler.highlightMatch(Array.isArray(result.item.tags) ? result.item.tags.join(", ") : result.item.tags, searchTerm)}
                      </div>
                  `
                      : ""
                  }
                  ${
                    !_config.display.onlySubtitles &&
                    result.item.subtitle &&
                    _config.display.showSubtitlesInResults !== false
                      ? `
                      <div class="result-description">${DOMHandler.highlightMatch(result.item.subtitle, searchTerm)}</div>
                  `
                      : ""
                  }
                </div>
              `;
            }

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
                    Logger.error(`Error navigating to panorama: ${e.message}`);
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
                      SearchEngine.triggerElement(
                        tour,
                        result.item.id,
                        (success) => {
                          if (success) {
                            Logger.info(
                              `Successfully triggered element ${result.item.id}`,
                            );
                          } else {
                            Logger.warn(
                              `Failed to trigger element ${result.item.id}`,
                            );
                          }
                        },
                        {},
                        _config,
                      );
                    }
                  } catch (e) {
                    Logger.error(
                      `Error navigating to parent panorama: ${e.message}`,
                    );
                  }
                }
              }

              // Search history functionality has been removed

              // Update related content for this result item if enabled
              if (_config.relatedContent && _config.relatedContent.enabled) {
                // Get all available items from the fuse index
                const allItems = fuse._docs || [];
                // Update related content based on the selected item
                RelatedContent.updateRelatedContent(
                  result.item,
                  allItems,
                  _config,
                  tour,
                );
              }

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
      }
    };

    // Apply search styling
    DOMHandler.applySearchStyling(_config);

    // Apply CSS classes for showing/hiding tags instead of injecting a style tag
    if (_config.showTagsInResults) {
      _elements.container.classList.add("show-tags");
      _elements.container.classList.remove("hide-tags");
    } else {
      _elements.container.classList.add("hide-tags");
      _elements.container.classList.remove("show-tags");
    }

    // Get key elements
    const searchInput = _elements.container.querySelector("#tourSearch");
    const clearButton = _elements.container.querySelector(".clear-button");
    const searchIcon = _elements.container.querySelector(".search-icon");

    // Cache frequently used elements
    _elements.input = searchInput;
    _elements.results = _elements.container.querySelector(".search-results");
    _elements.clearButton = clearButton;
    _elements.searchIcon = searchIcon;

    if (_elements.input) {
      _elements.input.placeholder = _config.searchBar.placeholder;

      // Add accessibility attributes
      Utils.ARIA.setRole(_elements.input, "searchbox");
      Utils.ARIA.setLabel(_elements.input, "Search tour");
      Utils.ARIA.setAutoComplete(_elements.input, "list");
    }

    // Bind all event listeners
    UIManager.bindSearchEventListeners(
      _elements.container,
      searchInput,
      clearButton,
      searchIcon,
      performSearch,
      _config,
      _toggleSearch,
    );

    // [2.3.1] Mark initialization as complete
    window.searchListInitialized = true;
    window.searchListInitiinitialized = true;
    _initialized = true;
    Logger.info("Enhanced search initialized successfully");
  }

  // [2.4] SEARCH VISIBILITY TOGGLE
  function _toggleSearch(show) {
    // DIAGNOSTIC: Log state before toggle
    logSearchContainerState(`Before toggle (show: ${show})`, show);
    
    // Get UIManager from modules to avoid direct reference errors
    const UIManager = window.SearchProModules?.UIManager || {};
    
    if (typeof UIManager.toggleSearch === "function") {
      console.log(`🔍 Calling UIManager.toggleSearch(${show})...`);
      UIManager.toggleSearch(show, _elements);
      console.log(`🔍 UIManager.toggleSearch(${show}) completed`);
    } else {
      (window.searchProDebugLogger || console).error(
        "UIManager.toggleSearch is not available",
      );
    }
    
    // Additional logic to ensure search results are properly reset when hiding
    if (!show) {
      const resultsContainer = _elements.container.querySelector(".search-results");
      if (resultsContainer) {
        console.log('🔍 Resetting results container display and classes');
        console.log('🔍 Before reset - resultsContainer:', {
          display: resultsContainer.style.display,
          className: resultsContainer.className,
          computed: window.getComputedStyle(resultsContainer).display
        });
        
        resultsContainer.style.display = "none";
        resultsContainer.classList.remove("visible", "no-results-bg");
        
        console.log('🔍 After reset - resultsContainer:', {
          display: resultsContainer.style.display,
          className: resultsContainer.className,
          computed: window.getComputedStyle(resultsContainer).display
        });
      } else {
        console.warn('🔍 resultsContainer not found when trying to reset!');
      }
    }

    // DIAGNOSTIC: Log state after toggle with a delay to allow transitions
    setTimeout(() => {
      logSearchContainerState(`After toggle (show: ${show})`, show);
    }, 400); // After CSS transition should complete
  }

  // DIAGNOSTIC HELPER FUNCTION - Add this right before the _toggleSearch function
  function logSearchContainerState(action, show = null) {
    console.group(`🔍 Search Container State: ${action}`);

    // Get all relevant elements
    const searchContainer = document.getElementById("searchContainer");
    const resultsContainer = searchContainer?.querySelector(".search-results");
    const resultsSection = searchContainer?.querySelector(".results-section");

    // Log basic state
    console.log('Action:', action, 'Show:', show);
    
    // Check for container existence
    console.log('searchContainer exists:', !!searchContainer);
    console.log('resultsContainer exists:', !!resultsContainer);
    console.log('resultsSection exists:', !!resultsSection);

    if (searchContainer) {
      // Log display/visibility state
      const searchContainerStyle = window.getComputedStyle(searchContainer);
      console.log('searchContainer display:', searchContainerStyle.display);
      console.log('searchContainer visibility:', searchContainerStyle.visibility);
      console.log('searchContainer background:', searchContainerStyle.background);
      console.log('searchContainer classes:', searchContainer.className);
      console.log('searchContainer style.display:', searchContainer.style.display);
      
      // Log dimensions and other critical styles
      console.log('searchContainer computed styles:', {
        width: searchContainerStyle.width,
        height: searchContainerStyle.height,
        position: searchContainerStyle.position,
        top: searchContainerStyle.top,
        left: searchContainerStyle.left,
        zIndex: searchContainerStyle.zIndex,
        opacity: searchContainerStyle.opacity,
        transform: searchContainerStyle.transform,
        transition: searchContainerStyle.transition,
        boxShadow: searchContainerStyle.boxShadow,
        backgroundColor: searchContainerStyle.backgroundColor
      });
    }

    if (resultsContainer) {
      // Log results container state
      const resultsContainerStyle = window.getComputedStyle(resultsContainer);
      console.log('resultsContainer display:', resultsContainerStyle.display);
      console.log('resultsContainer visibility:', resultsContainerStyle.visibility);
      console.log('resultsContainer background:', resultsContainerStyle.background);
      console.log('resultsContainer classes:', resultsContainer.className);
      console.log('resultsContainer style.display:', resultsContainer.style.display);
    }

    if (resultsSection) {
      // Log results section content
      console.log('resultsSection has content:', resultsSection.innerHTML.trim().length > 0);
      console.log('resultsSection child count:', resultsSection.childElementCount);
      if (resultsSection.innerHTML.length > 0) {
        console.log('resultsSection first 100 chars:', resultsSection.innerHTML.substring(0, 100) + '...');
      }
    }

    // Check for duplicate search containers
    const allSearchContainers = document.querySelectorAll("#searchContainer");
    console.log('Total search containers found:', allSearchContainers.length);
    if (allSearchContainers.length > 1) {
      console.warn('⚠️ DUPLICATE SEARCH CONTAINERS DETECTED!');
      allSearchContainers.forEach((container, i) => {
        console.log(`Container #${i+1} - isConnected:`, container.isConnected, 
          'parent:', container.parentElement?.tagName,
          'display:', window.getComputedStyle(container).display);
      });
    }

    // After close, check elements at center of screen
    if (action.includes("After") && show === false) {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      try {
        const elementsAtCenter = document.elementsFromPoint(centerX, centerY);
        console.log('Elements at center point:', centerX, centerY);
        elementsAtCenter.slice(0, 5).forEach((el, i) => {
          console.log(`Element #${i+1}:`, {
            tag: el.tagName,
            id: el.id,
            classes: el.className,
            bg: window.getComputedStyle(el).background,
            display: window.getComputedStyle(el).display,
            zIndex: window.getComputedStyle(el).zIndex,
            position: window.getComputedStyle(el).position
          });
        });
      } catch (err) {
        console.error('Error getting elementsFromPoint:', err);
      }
    }

    console.groupEnd();
  }

  // Add an observer to monitor DOM changes to the search container
  function setupSearchContainerObserver() {
    try {
      console.log('Setting up search container observer...');
      const config = { attributes: true, childList: true, subtree: true };
      
      const callback = function(mutationsList, observer) {
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList') {
            console.log('🔍 DOM childList mutation in search container:', {
              added: mutation.addedNodes.length,
              removed: mutation.removedNodes.length,
              target: mutation.target.tagName + (mutation.target.className ? '.' + mutation.target.className.split(' ').join('.') : '')
            });
            
            if (mutation.addedNodes.length) {
              Array.from(mutation.addedNodes).forEach((node, i) => {
                if (node.nodeType === 1) { // Element node
                  console.log(`Added node #${i+1}:`, {
                    tag: node.tagName,
                    id: node.id,
                    classes: node.className
                  });
                }
              });
            }
          }
          else if (mutation.type === 'attributes') {
            if (mutation.attributeName === 'style' || mutation.attributeName === 'class') {
              const target = mutation.target;
              console.log(`🔍 ${mutation.attributeName} changed for ${target.tagName + (target.id ? '#'+target.id : '')}`, {
                style: target.style?.cssText,
                class: target.className,
                display: window.getComputedStyle(target).display,
                visibility: window.getComputedStyle(target).visibility,
                background: window.getComputedStyle(target).background
              });
            }
          }
        }
      };
      
      // Wait for search container to be available
      setTimeout(() => {
        const searchContainer = document.getElementById('searchContainer');
        if (searchContainer) {
          const observer = new MutationObserver(callback);
          observer.observe(searchContainer, config);
          console.log('✅ Search container observer started');
        } else {
          console.warn('❌ Could not find search container for observer');
        }
      }, 1000);
    } catch (err) {
      console.error('Error setting up observer:', err);
    }
  }

  // Call this after initialization to monitor DOM changes
  setupSearchContainerObserver();

  // [2.5] PUBLIC API
  return {
    // [2.5.1] DOM elements cache
    elements: _elements,
    // [2.5.2] Initialize search functionality
    initializeSearch: function (tour) {
      try {
        if (!tour) {
          throw new Error("Tour instance is required for initialization");
        }

        _initializeSearch(tour);
      } catch (error) {
        if (window.SearchProModules && window.SearchProModules.Utils) {
          window.SearchProModules.Utils.Logger.error(
            "Search initialization failed:",
            error,
          );
        } else {
          (window.searchProDebugLogger || console).error(
            "Search initialization failed:",
            error,
          );
        }
      }
    },

    // [2.5.3] Toggle search visibility
    toggleSearch: function (show) {
      _toggleSearch(show);
    },

    // [2.5.4] Update configuration
    updateConfig: function (newConfig) {
      try {
        // [2.5.4.1] Validate configuration object
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

        // Apply styling updates if DOM handler is available
        if (window.SearchProModules && window.SearchProModules.DOMHandler) {
          window.SearchProModules.DOMHandler.applySearchStyling(_config);
        }

        // Reinitialize if already initialized
        if (_initialized && window.tourInstance) {
          _initializeSearch(window.tourInstance);
        }

        return this.getConfig();
      } catch (error) {
        const errorLogger = window.SearchProModules?.Utils?.Logger || console;
        errorLogger.error("Error updating configuration:", error);
        return this.getConfig();
      }
    },

    // [2.5.5] Get current configuration
    getConfig: function () {
      try {
        return JSON.parse(JSON.stringify(_config));
      } catch (error) {
        const configLogger = window.SearchProModules?.Utils?.Logger || console;
        configLogger.error("Error getting configuration:", error);
        return {};
      }
    },

    // [2.5.6] Search history management - Removed
  };
})();

// [3.0] GLOBAL EXPORTS
// [3.0] API EXPOSURE MANAGEMENT
// This function ensures the search API is properly exposed to the 3DVista tour system
function ensureAPIExposed() {
  // If modules are loaded but API isn't fully initialized, bind them properly
  if (window.SearchProModules) {
    // Expose elements reference if available
    if (
      !window.tourSearchFunctions.elements &&
      window.SearchProModules.elements
    ) {
      window.tourSearchFunctions.elements = window.SearchProModules.elements;
    }

    // Map UI toggle function to the global API required by 3DVista
    if (
      window.SearchProModules.UIManager &&
      !window.tourSearchFunctions.toggleSearch
    ) {
      window.tourSearchFunctions.toggleSearch =
        window.SearchProModules.UIManager.toggleSearch;
    }

    // Map initialization function to the global API
    if (
      !window.tourSearchFunctions.initializeSearch &&
      window.SearchProModules.Lifecycle
    ) {
      // Use the new lifecycle management system
      window.tourSearchFunctions.initializeSearch = function (tour) {
        // Return a promise that resolves when initialization is complete
        return window.SearchProModules.Lifecycle.initialize(tour);
      };
    }
    
    // Fallback if lifecycle management isn't available but SearchEngine is
    if (
      !window.tourSearchFunctions.initializeSearch &&
      window.SearchProModules.SearchEngine
    ) {
      window.tourSearchFunctions.initializeSearch = function (tour) {
        window.searchListInitialized = true;
        window.searchListInitiinitialized = true; // Maintain typo for compatibility
        if (window.SearchProModules.SearchEngine) {
          return window.SearchProModules.SearchEngine.initialize(tour);
        }
      };
    }

    // Expose cleanup function if available
    if (
      window.SearchProModules.Lifecycle &&
      !window.tourSearchFunctions.cleanup
    ) {
      window.tourSearchFunctions.cleanup = window.SearchProModules.Lifecycle.cleanup;
    }
    
    // Add diagnostic function to help with debugging
    if (!window.tourSearchFunctions.getSearchState && window.SearchProModules.Lifecycle) {
      window.tourSearchFunctions.getSearchState = window.SearchProModules.Lifecycle.getState;
    }
  }
}

// [3.1] Run immediately to handle race conditions
ensureAPIExposed();

// [3.2] Also run after a slight delay to ensure modules have time to load if they haven't yet
setTimeout(ensureAPIExposed, 100);

// [3.3] Also run periodically to ensure API is always available
setInterval(ensureAPIExposed, 2000);

// [3.3] Create backwards compatibility layer
window.searchFunctions = window.tourSearchFunctions;

// [3.4] Export fallback function for 3DVista integration
window.openSearchPanelFallback = openSearchPanelFallback;

// [4.0] FALLBACK FUNCTIONS
function openSearchPanelFallback() {
  const Logger = window.searchProDebugLogger || console;
  
  try {
    // Try to ensure API is properly exposed before proceeding
    ensureAPIExposed();

    // Use cached element if available, otherwise query the DOM
    const searchContainer =
      window.tourSearchFunctions?.elements?.container ||
      document.getElementById("searchContainer");

    if (!searchContainer) {
      Logger.error("Search panel not found.");
      return;
    }

    // Check if we need to initialize search first
    const needsInitialization = !window.searchListInitialized;
    
    // Case 1: Full API is available through tourSearchFunctions
    if (
      window.tourSearchFunctions?.initializeSearch &&
      window.tourSearchFunctions?.toggleSearch
    ) {
      // Initialize if needed
      if (needsInitialization) {
        Logger.info("Initializing search via tourSearchFunctions API");
        const tour = window.tour || window.tourInstance;
        window.tourSearchFunctions.initializeSearch(tour);
      }
      
      // Toggle search visibility
      window.tourSearchFunctions.toggleSearch(
        searchContainer.style.display !== "block"
      );
      return;
    }
    
    // Case 2: Lifecycle API is available
    if (window.SearchProModules?.Lifecycle) {
      if (needsInitialization) {
        Logger.info("Initializing search via Lifecycle API");
        const tour = window.tour || window.tourInstance;
        
        // Use the lifecycle API to initialize
        window.SearchProModules.Lifecycle.initialize(tour)
          .then(() => {
            // After initialization, toggle search if UIManager is available
            if (window.SearchProModules?.UIManager?.toggleSearch) {
              window.SearchProModules.UIManager.toggleSearch(
                searchContainer.style.display !== "block"
              );
            }
          })
          .catch(error => {
            Logger.error("Failed to initialize search:", error);
          });
        return;
      }
      
      // Already initialized, just toggle
      if (window.SearchProModules?.UIManager?.toggleSearch) {
        window.SearchProModules.UIManager.toggleSearch(
          searchContainer.style.display !== "block"
        );
        return;
      }
    }
    
    // Case 3: Direct module access as last resort
    if (window.SearchProModules?.UIManager) {
      if (needsInitialization && window.SearchProModules?.SearchEngine) {
        Logger.info("Initializing search via direct module access");
        window.searchListInitialized = true;
        window.searchListInitiinitialized = true; // Maintain typo for compatibility
        
        const tour = window.tour || window.tourInstance;
        window.SearchProModules.SearchEngine.initialize(tour);
      }

      // Toggle search using UIManager directly
      window.SearchProModules.UIManager.toggleSearch(
        searchContainer.style.display !== "block"
      );
      return;
    }
    
    // If we get here, we couldn't find any way to toggle search
    Logger.error("Search modules not fully loaded yet. Cannot toggle search.");
  } catch (error) {
    Logger.error("Error in openSearchPanelFallback:", error);
  }
}
