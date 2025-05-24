/*
====================================
3DVista Enhanced Search Script
Version: 2.0.5
Last Updated: 05/19/2025
Description: Core search functionality for 3DVista tours with improved element detection,
filtering options, and better UI interactions. Optimized for both desktop and mobile.
This version refactors the code to include dynamic DOM, markup and script loading.
====================================
*/

// [0.0] SCRIPT LOADER AND INITIALIZATION
(function () {
  // [0.1] Check if script is already loaded
  if (window._searchProLoaded) {
    console.warn("Search Pro is already loaded. Skipping initialization.");
    return;
  }

  // Mark as loaded
  window._searchProLoaded = true;

  // [0.2] Define search markup template
  const SEARCH_MARKUP = `
        <div id="searchContainer" class="search-container">
            <!-- [0.3] Search input field -->
            <div class="search-field">
                <input type="text" id="tourSearch" placeholder="Search tour locations... (* for all)" autocomplete="off">
                <div class="icon-container">
                    <!-- [0.4] Search icon -->
                    <div class="search-icon" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </div>
                    <!-- [0.5] Clear search button -->
                    <button class="clear-button" aria-label="Clear search">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <!-- [0.6] Search results container -->
            <div class="search-results" role="listbox">
                <div class="results-section">
                </div>
                <!-- [0.7] No results message -->
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

  // [0.8] Dependency loader
  function loadDependencies() {
    return new Promise((resolve, reject) => {
      // [0.8.1] Try to detect if Fuse.js is already loaded
      if (typeof Fuse !== "undefined") {
        console.log("Fuse.js already loaded, skipping load");
        resolve();
        return;
      }

      // [0.8.2] Try to load local Fuse.js first
      const fuseScript = document.createElement("script");
      fuseScript.src = "search-pro/fuse.js/dist/fuse.min.js";
      fuseScript.async = true;

      fuseScript.onload = () => {
        console.log("Local Fuse.js loaded successfully");
        resolve();
      };

      fuseScript.onerror = () => {
        console.warn(
          "Local Fuse.js failed to load, attempting to load from CDN...",
        );

        // [0.8.3] Fallback to CDN
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

  // [0.9] Optional debug tools loader
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

  // [0.10] CSS Loader
  function loadCSS() {
    return new Promise((resolve) => {
      // Track number of files to load
      let filesLoaded = 0;
      const totalFiles = 2;

      // Helper function to track file loading completion
      const fileLoaded = () => {
        filesLoaded++;
        if (filesLoaded >= totalFiles) {
          resolve();
        }
      };

      // Check if main CSS is already loaded
      if (document.querySelector('link[href="search-pro/css/search-01.css"]')) {
        fileLoaded();
      } else {
        // Load main CSS
        const mainCssLink = document.createElement("link");
        mainCssLink.rel = "stylesheet";
        mainCssLink.href = "search-pro/css/search-01.css";

        mainCssLink.onload = fileLoaded;
        mainCssLink.onerror = () => {
          console.warn(
            "Failed to load main search CSS, styling may be affected",
          );
          fileLoaded(); // Still count as loaded so we don't block initialization
        };

        document.head.appendChild(mainCssLink);
      }

      // Check if related content CSS is already loaded
      if (
        document.querySelector(
          'link[href="search-pro/css/related-content.css"]',
        )
      ) {
        fileLoaded();
      } else {
        // Load related content CSS
        const relatedCssLink = document.createElement("link");
        relatedCssLink.rel = "stylesheet";
        relatedCssLink.href = "search-pro/css/related-content.css";

        relatedCssLink.onload = fileLoaded;
        relatedCssLink.onerror = () => {
          console.warn(
            "Failed to load related content CSS, related content styling may be affected",
          );
          fileLoaded(); // Still count as loaded so we don't block initialization
        };

        document.head.appendChild(relatedCssLink);
      }
    });
  }

  // [0.11] DOM initialization
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

  // [0.12] Main initialization function
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
      function waitForTour() {
        if (window.tour) {
          // Initialize search after Fuse.js is loaded
          if (
            window.tourSearchFunctions &&
            typeof window.tourSearchFunctions.initializeSearch === "function"
          ) {
            window.tourSearchFunctions.initializeSearch(window.tour);
          } else {
            console.error(
              "Search Pro initialization failed: tourSearchFunctions not available",
            );
          }
        } else {
          // Try again in 100ms
          setTimeout(waitForTour, 100);
        }
      }

      // Start waiting for tour
      waitForTour();
    } catch (error) {
      console.error("Search Pro initialization failed:", error);
    }
  }

  // Start initialization when the DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();

// [1.0] MAIN SEARCH MODULE DEFINITION

// Simple CSV Parser (PapaParse-like functionality)
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

// [1.0] MAIN SEARCH MODULE DEFINITION
window.tourSearchFunctions = (function () {
  // [1.1] CONSTANTS AND CONFIGURATION
  const BREAKPOINTS = {
    mobile: 768,
    tablet: 1024,
  };

  // [1.1.1] Configuration Builder Class for more maintainable options
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
          useBusinessData: false,
          businessDataFile: "business.json",
          businessDataDir: "business-data",
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
            enabled: true,
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
        // [1.1.1.1] Thumbnail settings
        thumbnailSettings: {
          enableThumbnails: false,
          thumbnailSize: "medium", // 'small', 'medium', 'large'
          thumbnailSizePx: 48, // Resolved px value for quick use
          borderRadius: 4, // in px
          defaultImagePath: "assets/default-thumbnail.png",
          alignment: "left", // 'left' or 'right'
          showFor: {
            panorama: true,
            hotspot: true,
            polygon: false,
            video: false,
            webframe: false,
            image: false,
            text: false,
            other: false,
          },
        },
      };
    }

    // Set display options
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

    // Set related content options
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

    // Set content inclusion options
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

    // Set filter options
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

    // Set label options
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

    // Set appearance options
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

    // Set search bar options
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

    // Set general options
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

    // Add new method to set custom display labels
    setDisplayLabels(options) {
      if (!options) return this;

      // Merge with defaults
      this.config.displayLabels = {
        ...this.config.displayLabels,
        ...options,
      };
      return this;
    }

    // Set business data options
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

    // [1.1.1.2] Set thumbnail settings
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
            options.showFor?.video !== undefined
              ? options.showFor.video
              : false,
          webframe:
            options.showFor?.webframe !== undefined
              ? options.showFor.webframe
              : false,
          image:
            options.showFor?.image !== undefined
              ? options.showFor.image
              : false,
          text:
            options.showFor?.text !== undefined ? options.showFor.text : false,
          other:
            options.showFor?.other !== undefined
              ? options.showFor.other
              : false,
        },
      };
      return this;
    }

    // Set Google Sheets integration options
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

    build() {
      return this.config;
    }
  }

  // [1.1.2] Create default configuration
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

  // [1.2] LOGGING UTILITIES
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

  let _initialized = false;

  // Module-scoped variables for cleanup functions
  let keyboardCleanup = null;

  // Module-scoped variable for business data
  let _businessData = [];

  // Module-scoped variable for Google Sheets data
  let _googleSheetsData = [];

  // [1.3] DOM ELEMENT CACHE
  const _elements = {
    container: null,
    input: null,
    results: null,
    clearButton: null,
    searchIcon: null,
  };

  // [2.0] CROSS-WINDOW COMMUNICATION
  const _crossWindowChannel = {
    // Channel instance
    _channel: null,

    // Channel name
    channelName: "tourSearchChannel",

    // Initialize channel
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

    // Send message to other windows
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

    // Listen for messages
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

    // Close channel
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

  // [2.1] SEARCH HISTORY MANAGEMENT
  const _searchHistory = {
    maxItems: 5,
    storageKey: "tourSearchHistory",

    // [2.1.1] Save search term to history
    save(term) {
      if (!term || typeof term !== "string" || term.trim() === "") {
        return false;
      }

      try {
        // Check if localStorage is available
        if (!this._isStorageAvailable()) {
          return false;
        }

        let history = this.get();
        const termLower = term.toLowerCase().trim();
        const index = history.findIndex((h) => h.toLowerCase() === termLower);

        if (index > -1) {
          history.splice(index, 1);
        }

        // [2.1.1.1] Add the term to the beginning of the history
        history.unshift(term.trim());

        // [2.1.1.2] Remove duplicates
        history = [...new Set(history)];

        // [2.1.1.3] Limit the size of history
        if (history.length > this.maxItems) {
          history.length = this.maxItems;
        }

        // [2.1.1.4] Check storage size before saving
        const serialized = JSON.stringify(history);
        if (serialized.length > 5000) {
          // Trim history if too large
          history.length = Math.max(1, history.length - 2);
        }

        try {
          localStorage.setItem(this.storageKey, JSON.stringify(history));

          // [2.1.1.5] Broadcast history change to other windows/tabs
          _crossWindowChannel.send("historyUpdate", {
            action: "save",
            history,
          });

          return true;
        } catch (e) {
          // [2.1.1.6] Handle quota exceeded error
          if (e.name === "QuotaExceededError") {
            // Try removing the oldest item and save again
            if (history.length > 1) {
              history.pop();
              localStorage.setItem(this.storageKey, JSON.stringify(history));

              // Broadcast history change to other windows/tabs
              _crossWindowChannel.send("historyUpdate", {
                action: "save",
                history,
              });

              return true;
            }
          }
          Logger.warn("Failed to save search history:", e);
          return false;
        }
      } catch (error) {
        Logger.warn("Error in search history management:", error);
        return false;
      }
    },

    // [2.1.2] Retrieve search history
    get() {
      try {
        // [2.1.2.1] Check storage availability
        if (!this._isStorageAvailable()) {
          return [];
        }

        const stored = localStorage.getItem(this.storageKey);
        if (!stored) return [];

        const parsed = JSON.parse(stored);

        // Validate parsed data is an array
        if (!Array.isArray(parsed)) {
          Logger.warn("Invalid search history format, resetting");
          this.clear();
          return [];
        }

        // Filter out any invalid entries
        return parsed.filter(
          (item) => typeof item === "string" && item.trim() !== "",
        );
      } catch (error) {
        Logger.warn("Failed to retrieve search history:", error);
        return [];
      }
    },

    // [2.1.3] Clear search history
    clear() {
      try {
        if (this._isStorageAvailable()) {
          localStorage.removeItem(this.storageKey);

          // Broadcast clear action to other windows/tabs
          _crossWindowChannel.send("historyUpdate", { action: "clear" });
        }
        return true;
      } catch (error) {
        Logger.warn("Failed to clear search history:", error);
        return false;
      }
    },

    // [2.1.4] Check if localStorage is available
    _isStorageAvailable() {
      try {
        const test = "__storage_test__";
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch {
        // Intentionally ignored: localStorage may not be available in all environments
        return false;
      }
    },
  };

  // [3.0] UTILITY FUNCTIONS
  // [3.1] Debounce function for performance optimization
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

  // [3.2] Preprocess and normalize search terms
  function _preprocessSearchTerm(term) {
    if (!term) return "";

    // Handle special character search
    if (/[0-9\-_]/.test(term)) {
      return `'${term}`;
    }

    return term;
  }

  // [3.3] Safely access nested object properties
  // eslint-disable-next-line no-unused-vars
  function _safelyGetProperty(obj, path, defaultValue = null) {
    try {
      // Safely navigate object properties
      return path.split(".").reduce((o, p) => o?.[p], obj) ?? defaultValue;
    } catch (error) {
      Logger.debug(`Error accessing property ${path}:`, error);
      return defaultValue;
    }
  }

  // [3.4] Optimize style manipulation with CSS classes
  // eslint-disable-next-line no-unused-vars
  function _applyTheme(container, isDark) {
    try {
      if (!container) return false;
      // Use CSS classes instead of multiple inline styles
      container.classList.remove("light-theme", "dark-theme");
      container.classList.add(isDark ? "dark-theme" : "light-theme");
      return true;
    } catch (e) {
      Logger.debug("Error applying theme:", e);
      return false;
    }
  }

  // [3.5] Event handler management for proper cleanup
  const _eventManager = {
    // Store references to bound event handlers
    _handlers: new Map(),

    // Add event listener with reference tracking
    addListener(element, eventType, handler, options) {
      try {
        if (!element || !eventType || typeof handler !== "function") {
          Logger.warn("Invalid parameters for event listener");
          return false;
        }

        // Create bound handler
        const boundHandler = handler.bind(element);

        // Store reference for later removal
        if (!this._handlers.has(element)) {
          this._handlers.set(element, []);
        }

        this._handlers.get(element).push({
          type: eventType,
          original: handler,
          bound: boundHandler,
        });

        // Add the actual event listener
        element.addEventListener(eventType, boundHandler, options);
        return true;
      } catch (e) {
        Logger.debug("Error adding event listener:", e);
        return false;
      }
    },

    // Remove specific event listener
    removeListener(element, eventType, handler) {
      try {
        if (!element || !this._handlers.has(element)) return false;

        const handlers = this._handlers.get(element);
        const index = handlers.findIndex(
          (h) => h.type === eventType && h.original === handler,
        );

        if (index !== -1) {
          const { bound } = handlers[index];
          element.removeEventListener(eventType, bound);
          handlers.splice(index, 1);
          return true;
        }
        return false;
      } catch (e) {
        Logger.debug("Error removing event listener:", e);
        return false;
      }
    },

    // Remove all event listeners for an element
    removeAllListeners(element) {
      try {
        if (!element || !this._handlers.has(element)) return false;

        const handlers = this._handlers.get(element);
        handlers.forEach(({ type, bound }) => {
          element.removeEventListener(type, bound);
        });

        this._handlers.delete(element);
        return true;
      } catch (e) {
        Logger.debug("Error removing all event listeners:", e);
        return false;
      }
    },

    // Clean up all tracked event listeners
    cleanup() {
      try {
        for (const [element, handlers] of this._handlers.entries()) {
          if (element) {
            // Check if element still exists
            handlers.forEach(({ type, bound }) => {
              element.removeEventListener(type, bound);
            });
          }
        }
        this._handlers.clear();
        return true;
      } catch (e) {
        Logger.debug("Error during event cleanup:", e);
        return false;
      }
    },
  };

  // [3.6] ARIA and Accessibility Helpers
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

  // [4.0] ELEMENT DETECTION AND FILTERING
  // [4.1] Enhanced element type detection
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

  // [4.2] Element filtering based on type and properties
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

  // [5.0] ELEMENT INTERACTION
  // [5.1] Element triggering with exponential backoff
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

    // Helper to find element by ID using multiple methods
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

  // [6.0] UI MANAGEMENT
  // [6.3] Search styling application
  function _applySearchStyling() {
    const searchContainer = document.getElementById("searchContainer");
    if (!searchContainer) {
      Logger.warn("Search container not found, styling not applied");
      return;
    }

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
    const colors = _config.appearance.colors;
    const cssVars = `
            :root {
                --search-background: ${colors.searchBackground};
                --search-text: ${colors.searchText};
                --placeholder-text: ${colors.placeholderText};
                --search-icon: ${colors.searchIcon};
                --clear-icon: ${colors.clearIcon};
                --results-background: ${colors.resultsBackground};
                --group-header-color: ${colors.groupHeaderColor};
                --group-count-color: ${colors.groupCountColor};
                --result-hover: ${colors.resultHover};
                --result-border-left: ${colors.resultBorderLeft};
                --result-text: ${colors.resultText};
                --result-subtitle: ${colors.resultSubtitle};
                --result-icon-color: ${colors.resultIconColor};
                --result-subtext-color: ${colors.resultSubtextColor};
            }
        `;

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

    // Prepare CSS string for positioning only

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

    // [2.0.4] Handle thumbnail alignment from config
    const thumbAlignment =
      _config.thumbnailSettings?.alignment === "right" ? "right" : "left";

    // Apply thumbnail alignment to the document body as a data attribute
    document.body.setAttribute("data-thumbnail-align", thumbAlignment);

    // Include both CSS variables and positioning CSS
    styleElement.textContent = cssVars + positionCSS;
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

  // [6.4] RELATED CONTENT MODULE
  // Manages related content display based on search result selection

  // Module-specific DOM elements
  const _relatedContent = {
    container: null,
    header: null,
    toggle: null,
    itemsContainer: null,
    isExpanded: true,
    selectedItem: null,
  };

  /**
   * Calculates similarity score between two items based on configured criteria
   * @param {Object} selectedItem - The currently selected search result item
   * @param {Object} candidateItem - The item to compare for similarity
   * @returns {number} Similarity score (0-1)
   */
  function _calculateSimilarityScore(selectedItem, candidateItem) {
    if (!selectedItem || !candidateItem || selectedItem === candidateItem) {
      return 0;
    }

    const criteria = _config.relatedContent.criteria;
    let totalScore = 0;
    let totalWeight = 0;

    // Group type similarity
    if (criteria.groupType.enabled && criteria.groupType.weight > 0) {
      const weight = criteria.groupType.weight;
      totalWeight += weight;

      if (selectedItem.type === candidateItem.type) {
        totalScore += weight;
      }
    }

    // Tag similarity
    if (criteria.tags.enabled && criteria.tags.weight > 0) {
      const weight = criteria.tags.weight;
      totalWeight += weight;

      // Calculate tag overlap
      if (
        selectedItem.tags &&
        candidateItem.tags &&
        Array.isArray(selectedItem.tags) &&
        Array.isArray(candidateItem.tags) &&
        selectedItem.tags.length > 0 &&
        candidateItem.tags.length > 0
      ) {
        const selectedTags = selectedItem.tags.map((tag) => tag.toLowerCase());
        const candidateTags = candidateItem.tags.map((tag) =>
          tag.toLowerCase(),
        );

        const intersection = selectedTags.filter((tag) =>
          candidateTags.includes(tag),
        );
        if (intersection.length > 0) {
          const tagSimilarity =
            intersection.length /
            Math.max(selectedTags.length, candidateTags.length);
          totalScore += weight * tagSimilarity;
        }
      }
    }

    // Metadata similarity
    if (criteria.metadata.enabled && criteria.metadata.weight > 0) {
      const weight = criteria.metadata.weight;
      totalWeight += weight;
      totalScore +=
        weight * _calculateMetadataSimilarity(selectedItem, candidateItem);
    }

    // Normalize score based on weights
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Calculates metadata similarity between two items
   * @param {Object} item1 - First item
   * @param {Object} item2 - Second item
   * @returns {number} Similarity score (0-1)
   */
  function _calculateMetadataSimilarity(item1, item2) {
    // Extract available metadata fields
    const metadata1 = item1.metadata || {};
    const metadata2 = item2.metadata || {};

    // Common fields to check (extend as needed)
    const fields = [
      "description",
      "author",
      "category",
      "creationDate",
      "lastModified",
      "location",
      "dimensions",
      "attributes",
    ];

    let matchCount = 0;
    let fieldCount = 0;

    // Compare available fields
    fields.forEach((field) => {
      if (metadata1[field] !== undefined && metadata2[field] !== undefined) {
        fieldCount++;

        // Type-specific comparison
        if (
          typeof metadata1[field] === "string" &&
          typeof metadata2[field] === "string"
        ) {
          // String similarity (case insensitive contains)
          if (
            metadata1[field]
              .toLowerCase()
              .includes(metadata2[field].toLowerCase()) ||
            metadata2[field]
              .toLowerCase()
              .includes(metadata1[field].toLowerCase())
          ) {
            matchCount++;
          }
        } else if (
          Array.isArray(metadata1[field]) &&
          Array.isArray(metadata2[field])
        ) {
          // Array intersection
          const intersection = metadata1[field].filter((x) =>
            metadata2[field].includes(x),
          );
          if (intersection.length > 0) {
            matchCount +=
              intersection.length /
              Math.max(metadata1[field].length, metadata2[field].length);
          }
        } else if (
          typeof metadata1[field] === "number" &&
          typeof metadata2[field] === "number"
        ) {
          // Numeric similarity (within 10% range)
          const max = Math.max(
            Math.abs(metadata1[field]),
            Math.abs(metadata2[field]),
          );
          const diff = Math.abs(metadata1[field] - metadata2[field]);
          if (max === 0 || diff / max < 0.1) {
            matchCount++;
          }
        } else if (metadata1[field] === metadata2[field]) {
          // Direct equality for other types
          matchCount++;
        }
      }
    });

    // Return normalized similarity score (0-1)
    return fieldCount > 0 ? matchCount / fieldCount : 0;
  }

  /**
   * Finds items related to the selected search result
   * @param {Object} selectedItem - The currently selected search result item
   * @param {Array} allItems - All available items to find related ones from
   * @returns {Array} Sorted array of related items with similarity scores
   */
  function _findRelatedItems(selectedItem, allItems) {
    if (!selectedItem || !Array.isArray(allItems) || allItems.length === 0) {
      return [];
    }

    // Calculate similarity for all items
    const scoredItems = allItems
      .filter((item) => item !== selectedItem) // Exclude selected item
      .map((item) => ({
        item,
        score: _calculateSimilarityScore(selectedItem, item),
      }))
      .filter((result) => result.score > 0) // Only keep items with some similarity
      .sort((a, b) => b.score - a.score); // Sort by similarity score (descending)

    // Limit to configured max items
    return scoredItems.slice(0, _config.relatedContent.maxItems);
  }

  /**
   * Creates the related content section DOM structure
   * @returns {HTMLElement} The related content section container
   */
  function _createRelatedContentSection() {
    // Create section container
    const sectionContainer = document.createElement("div");
    sectionContainer.className = "related-content-section";
    sectionContainer.setAttribute(
      "aria-expanded",
      _relatedContent.isExpanded ? "true" : "false",
    );

    // Create header with toggle button
    const header = document.createElement("div");
    header.className = "related-header";

    // Add header text
    const headerTitle = document.createElement("h3");
    headerTitle.textContent = _config.relatedContent.headerText;
    header.appendChild(headerTitle);

    // Add toggle button if collapsible
    if (_config.relatedContent.collapsible) {
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "toggle-related";
      toggleBtn.setAttribute(
        "aria-label",
        _relatedContent.isExpanded
          ? "Collapse related content"
          : "Expand related content",
      );

      // Add toggle icon
      toggleBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather">
          <polyline points="${_relatedContent.isExpanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}"></polyline>
        </svg>
      `;

      // Add click handler for toggling
      toggleBtn.addEventListener("click", _toggleRelatedSection);

      _relatedContent.toggle = toggleBtn;
      header.appendChild(toggleBtn);
    }

    // Create container for related items
    const itemsContainer = document.createElement("div");
    itemsContainer.className = "related-items";
    if (!_relatedContent.isExpanded) {
      itemsContainer.style.display = "none";
    }

    // Store references to DOM elements
    _relatedContent.container = sectionContainer;
    _relatedContent.header = header;
    _relatedContent.itemsContainer = itemsContainer;

    // Assemble the DOM structure
    sectionContainer.appendChild(header);
    sectionContainer.appendChild(itemsContainer);
    return sectionContainer;
  }

  /**
   * Toggles the expansion state of the related content section
   */
  function _toggleRelatedSection() {
    _relatedContent.isExpanded = !_relatedContent.isExpanded;

    // Update ARIA attribute
    if (_relatedContent.container) {
      _relatedContent.container.setAttribute(
        "aria-expanded",
        _relatedContent.isExpanded ? "true" : "false",
      );
    }

    // Update toggle button aria-label and icon
    if (_relatedContent.toggle) {
      _relatedContent.toggle.setAttribute(
        "aria-label",
        _relatedContent.isExpanded
          ? "Collapse related content"
          : "Expand related content",
      );

      // Update icon direction
      const icon = _relatedContent.toggle.querySelector("svg polyline");
      if (icon) {
        icon.setAttribute(
          "points",
          _relatedContent.isExpanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9",
        );
      }
    }

    // Show/hide items container with animation
    if (_relatedContent.itemsContainer) {
      if (_relatedContent.isExpanded) {
        // Show with animation
        _relatedContent.itemsContainer.style.display = "block";
        _relatedContent.itemsContainer.style.maxHeight = "0";

        // Trigger reflow
        _relatedContent.itemsContainer.offsetHeight;

        // Start animation
        _relatedContent.itemsContainer.style.transition =
          "max-height 0.3s ease-in-out";
        _relatedContent.itemsContainer.style.maxHeight =
          _relatedContent.itemsContainer.scrollHeight + "px";

        // Clear max-height after animation completes
        setTimeout(() => {
          _relatedContent.itemsContainer.style.maxHeight = "";
        }, 300);
      } else {
        // Hide with animation
        _relatedContent.itemsContainer.style.maxHeight =
          _relatedContent.itemsContainer.scrollHeight + "px";

        // Trigger reflow
        _relatedContent.itemsContainer.offsetHeight;

        // Start animation
        _relatedContent.itemsContainer.style.transition =
          "max-height 0.3s ease-in-out";
        _relatedContent.itemsContainer.style.maxHeight = "0";

        // Set display:none after animation completes
        setTimeout(() => {
          _relatedContent.itemsContainer.style.display = "none";
        }, 300);
      }
    }
  }

  /**
   * Updates the related content section with items related to the selected item
   * @param {Object} selectedItem - The search result that was selected
   * @param {Array} allItems - All available items to find related ones from (optional)
   */
  function _updateRelatedContent(selectedItem, allItems) {
    // Skip if related content is disabled
    if (!_config.relatedContent || !_config.relatedContent.enabled) {
      return;
    }

    // Log activity
    Logger.info(
      `Updating related content for ${selectedItem.type}: ${selectedItem.title || selectedItem.id}`,
    );

    // Store the selected item for reference
    _relatedContent.selectedItem = selectedItem;

    // Get all items if not provided
    if (!allItems && typeof fuse !== "undefined" && fuse._docs) {
      allItems = fuse._docs;
    }

    if (!Array.isArray(allItems) || allItems.length === 0) {
      Logger.warn("No items available to find related content");
      return;
    }

    // Find related items
    const relatedItems = _findRelatedItems(selectedItem, allItems);

    // Skip if no related items found
    if (relatedItems.length === 0) {
      Logger.info("No related items found for the selected item");
      // Hide related content section
      if (_relatedContent.container) {
        _relatedContent.container.style.display = "none";
      }
      return;
    }

    // Create or update related content section
    let sectionContainer = _relatedContent.container;
    let itemsContainer = _relatedContent.itemsContainer;

    if (!sectionContainer) {
      // Create new section
      sectionContainer = _createRelatedContentSection();
      itemsContainer = _relatedContent.itemsContainer;

      // Find the results container to append related content
      const searchContainer = document.getElementById("searchContainer");
      const resultsContainer = searchContainer
        ? searchContainer.querySelector(".results-container")
        : null;

      if (resultsContainer) {
        resultsContainer.appendChild(sectionContainer);
        Logger.info(
          `Created new related content section with ${relatedItems.length} items`,
        );
      } else {
        Logger.error(
          "Could not find results container to append related content",
        );
        return;
      }
    } else {
      // Show the container if hidden
      sectionContainer.style.display = "";
      Logger.info(
        `Updating existing related content section with ${relatedItems.length} items`,
      );
    }

    // Clear existing related items
    if (itemsContainer) {
      itemsContainer.innerHTML = "";

      // Render new related items
      relatedItems.forEach((relatedItem) => {
        const itemElement = _renderRelatedItem(relatedItem);
        itemsContainer.appendChild(itemElement);
      });

      // Add keyboard navigation support
      _addKeyboardNavigation(sectionContainer);
    }
  }

  /**
   * Adds keyboard navigation support to the related content section
   * @param {HTMLElement} section - The related content section element
   */
  function _addKeyboardNavigation(section) {
    const items = section.querySelectorAll(".related-item");
    if (!items.length) return;

    items.forEach((item, index) => {
      // Make items focusable
      item.setAttribute("tabindex", "0");

      // Add keyboard event listeners
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          // Activate item with Enter or Space
          e.preventDefault();
          item.click();
        } else if (e.key === "ArrowDown") {
          // Move focus to next item
          e.preventDefault();
          const nextItem = items[index + 1] || items[0];
          nextItem.focus();
        } else if (e.key === "ArrowUp") {
          // Move focus to previous item
          e.preventDefault();
          const prevItem = items[index - 1] || items[items.length - 1];
          prevItem.focus();
        }
      });
    });
  }

  /**
   * Renders a single related item
   * @param {Object} relatedItem - Item with similarity score
   * @returns {HTMLElement} The related item element
   */
  function _renderRelatedItem(relatedItem) {
    const { item, score } = relatedItem;

    // Create item container
    const itemElement = document.createElement("div");
    itemElement.className = "related-item";
    itemElement.setAttribute("tabindex", "0");
    itemElement.setAttribute("data-related-score", score.toFixed(2));
    if (item.id) {
      itemElement.setAttribute("data-id", item.id);
    }
    if (item.type) {
      itemElement.setAttribute("data-type", item.type);
    }

    // Create icon based on type
    const iconElement = document.createElement("div");
    iconElement.className = "related-item-icon";
    if (typeof getTypeIcon === "function" && item.type) {
      iconElement.innerHTML = getTypeIcon(item.type);
    } else {
      // Default icon
      iconElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle></svg>`;
    }

    // Create content container
    const contentElement = document.createElement("div");
    contentElement.className = "related-item-content";

    // Add title
    const titleElement = document.createElement("div");
    titleElement.className = "related-item-title";
    titleElement.textContent = item.label || "Unnamed Item";
    contentElement.appendChild(titleElement);

    // Add subtitle with similarity reason
    const subtitleElement = document.createElement("div");
    subtitleElement.className = "related-item-subtitle";

    // Determine relation type for subtitle
    let relationReason = "";

    if (item.type === _relatedContent.selectedItem.type) {
      relationReason = `Same ${item.type} type`;
    } else if (
      item.tags &&
      _relatedContent.selectedItem.tags &&
      Array.isArray(item.tags) &&
      Array.isArray(_relatedContent.selectedItem.tags)
    ) {
      const commonTags = item.tags.filter((tag) =>
        _relatedContent.selectedItem.tags.some(
          (selectedTag) => selectedTag.toLowerCase() === tag.toLowerCase(),
        ),
      );

      if (commonTags.length > 0) {
        relationReason = `Similar tags: ${commonTags.slice(0, 2).join(", ")}${commonTags.length > 2 ? "..." : ""}`;
      }
    }

    if (!relationReason) {
      relationReason = `Related content (${Math.round(score * 100)}% match)`;
    }

    subtitleElement.textContent = relationReason;
    contentElement.appendChild(subtitleElement);

    // Add click handler to navigate to related item
    itemElement.addEventListener("click", () => {
      _handleRelatedItemClick(item);
    });

    // Add keyboard handler for accessibility
    itemElement.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        _handleRelatedItemClick(item);
      }
    });

    // Assemble the item
    itemElement.appendChild(iconElement);
    itemElement.appendChild(contentElement);

    return itemElement;
  }

  /**
   * Handles click on a related item
   * @param {Object} item - The clicked item
   */
  function _handleRelatedItemClick(item) {
    try {
      // Navigate to the panorama if it's a panorama type
      if (
        item.type === "Panorama" &&
        typeof item.index === "number" &&
        tour &&
        tour.mainPlayList
      ) {
        tour.mainPlayList.set("selectedIndex", item.index);
      }
      // For items with parent panoramas, navigate to parent first
      else if (
        typeof item.parentIndex === "number" &&
        tour &&
        tour.mainPlayList
      ) {
        tour.mainPlayList.set("selectedIndex", item.parentIndex);

        // Then trigger the item if it has an ID
        if (item.id) {
          setTimeout(() => {
            _triggerElement(tour, item.id);
          }, 100);
        }
      }
    } catch (error) {
      Logger.error("Error navigating to related item:", error);
    }
  }

  // [7.0] CORE SEARCH FUNCTIONALITY

  // [7.0.0] Keyboard navigation manager

  const keyboardManager = {
    init(searchContainer, searchInput, performSearch) {
      if (!searchContainer || !searchInput) {
        Logger.error("Invalid parameters for keyboard manager");
        return () => {}; // Return no-op cleanup function
      }

      let selectedIndex = -1;
      let resultItems = [];

      // Store bound handlers for proper cleanup
      const handlers = {
        documentKeydown: null,
        inputKeyup: null,
        inputKeydown: null,
      };

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

      // Document keydown handler
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
              performSearch();
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
        } catch (e) {
          Logger.warn("Error cleaning up keyboard manager:", e);
        }
      };
    },
  };

  // [7.0.1] Unbind search event listeners (cleanup)
  function _unbindSearchEventListeners() {
    try {
      // Close BroadcastChannel to prevent memory leaks
      _crossWindowChannel.close();
      Logger.debug("BroadcastChannel closed");

      // Clean up keyboard manager event listeners
      if (keyboardCleanup) {
        keyboardCleanup();
        keyboardCleanup = null;
        Logger.debug("Keyboard manager cleanup completed");
      }

      // Clean up handlers for document
      _eventManager.removeAllListeners(document);

      // Clean up handlers for window
      _eventManager.removeAllListeners(window);

      // Clean up handlers for search container elements
      if (_elements.container) {
        _eventManager.removeAllListeners(_elements.container);
      }

      if (_elements.input) {
        _eventManager.removeAllListeners(_elements.input);
      }

      if (_elements.clearButton) {
        _eventManager.removeAllListeners(_elements.clearButton);
      }

      if (_elements.searchIcon) {
        _eventManager.removeAllListeners(_elements.searchIcon);
      }

      Logger.debug("Successfully unbound all search event listeners");
      return true;
    } catch (error) {
      Logger.warn("Error unbinding search event listeners:", error);
      return false;
    }
  }

  // [7.0.2] Bind search event listeners
  function _bindSearchEventListeners(
    searchContainer,
    searchInput,
    clearButton,
    searchIcon,
    performSearch,
  ) {
    // First clean up any existing event listeners to prevent duplicates
    _unbindSearchEventListeners();

    Logger.debug("Binding search event listeners...");

    // Bind input event with debounce - longer time for mobile devices
    if (searchInput) {
      // Check if device is mobile for appropriate debounce timing
      const isMobile =
        window.innerWidth <= _config.mobileBreakpoint ||
        "ontouchstart" in window;
      const debounceTime = isMobile ? 300 : 150; // Longer debounce on mobile for better performance

      Logger.debug(
        `Using ${isMobile ? "mobile" : "desktop"} debounce time: ${debounceTime}ms`,
      );
      const debouncedSearch = _debounce(performSearch, debounceTime);
      _eventManager.addListener(searchInput, "input", debouncedSearch);

      // Special handling for mobile touch events
      if ("ontouchstart" in window) {
        _eventManager.addListener(searchInput, "touchend", function () {
          this.focus();
        });
      }
    }

    // Bind clear button
    if (clearButton) {
      _eventManager.addListener(clearButton, "click", function (e) {
        e.stopPropagation();
        if (searchInput) {
          searchInput.value = "";
          performSearch();
          searchInput.focus();
        }

        // If on mobile, also close the search completely if configured
        if (
          window.innerWidth <= _config.mobileBreakpoint &&
          _config.autoHide.mobile
        ) {
          _toggleSearch(false);
        }
      });
    }

    // Bind search icon for wildcard search
    if (searchIcon) {
      searchIcon.style.cursor = "pointer";
      _eventManager.addListener(searchIcon, "click", function () {
        if (searchInput) {
          searchInput.value = "*";
          performSearch();
        }
      });
    }

    // Close search when clicking outside
    _eventManager.addListener(document, "click", function (e) {
      // Skip if search isn't visible
      if (!searchContainer.classList.contains("visible")) return;

      // Close if click is outside search container
      if (!searchContainer.contains(e.target)) {
        _toggleSearch(false);
      }
    });

    // Special mobile handling
    if ("ontouchstart" in window) {
      _eventManager.addListener(document, "touchstart", function (e) {
        if (
          searchContainer.classList.contains("visible") &&
          !searchContainer.contains(e.target)
        ) {
          _toggleSearch(false);
        }
      });
    }

    // Set up keyboard navigation with proper cleanup tracking
    keyboardCleanup = keyboardManager.init(
      searchContainer,
      searchInput,
      performSearch,
    );

    // Bind history-related click events
    _eventManager.addListener(searchContainer, "click", function (e) {
      // Handle history item clicks
      if (e.target.closest(".history-item")) {
        const term = e.target.closest(".history-item").textContent.trim();
        if (searchInput) {
          searchInput.value = term;
          performSearch();
        }
      }

      // Handle clear history button
      if (e.target.closest(".clear-history")) {
        _searchHistory.clear();
        performSearch();
      }
    });

    // Apply window resize handler for styling
    const resizeHandler = _debounce(_applySearchStyling, 250);
    _eventManager.addListener(window, "resize", resizeHandler);

    // Handle mobile-specific scroll behaviors if enabled
    if (
      _config.searchBar?.mobileOverrides?.enabled &&
      _config.searchBar?.mobileOverrides?.visibility?.showOnScroll !== undefined
    ) {
      let lastScrollY = window.scrollY;
      // eslint-disable-next-line no-unused-vars
      let scrollTimeout;
      const scrollThreshold =
        _config.searchBar.mobileOverrides.visibility.hideThreshold || 100;

      // Debounced scroll handler
      const scrollHandler = _debounce(function () {
        // Only apply scroll behavior if we're on a mobile device
        if (
          window.innerWidth <=
          (_config.searchBar.mobileOverrides.breakpoint || 768)
        ) {
          const currentScrollY = window.scrollY;
          const scrollingUp = currentScrollY < lastScrollY;
          const beyondThreshold =
            Math.abs(currentScrollY - lastScrollY) > scrollThreshold;

          // Check if the search container is visible and use the appropriate behavior
          if (beyondThreshold) {
            const isVisible = searchContainer.classList.contains("visible");
            if (_config.searchBar.mobileOverrides.visibility.showOnScroll) {
              // Show when scrolling up, hide when scrolling down
              if (scrollingUp && !isVisible) {
                _toggleSearch(true);
              } else if (
                !scrollingUp &&
                isVisible &&
                document.activeElement !== searchInput
              ) {
                _toggleSearch(false);
              }
            } else {
              // If showOnScroll is false, we'll hide it when scrolling down past threshold
              if (
                !scrollingUp &&
                isVisible &&
                document.activeElement !== searchInput
              ) {
                _toggleSearch(false);
              }
            }
          }

          lastScrollY = currentScrollY;
        }
      }, 100);

      _eventManager.addListener(window, "scroll", scrollHandler);
    }

    Logger.debug("Search event listeners bound successfully");
    return true;
  }
  // [6.1] Google Sheets data loading function
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
        } catch (e) {
          Logger.warn(
            "Failed to convert Google Sheets URL to CSV export URL:",
            e,
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
          // eslint-disable-next-line no-unused-vars
          const missingNames = processedData.filter((row) => !row.name).length;

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

  // [6.2] Business data loading function
  function _loadBusinessData() {
    // Skip if business data is not enabled
    if (!_config.businessData.useBusinessData) {
      Logger.info("Business data integration disabled, skipping load");
      return Promise.resolve([]);
    }

    // Construct the path to the business data file
    const baseUrl = window.location.pathname.substring(
      0,
      window.location.pathname.lastIndexOf("/"),
    );
    const dataDir = _config.businessData.businessDataDir || "business-data";
    const dataFile = _config.businessData.businessDataFile || "business.json";
    const dataPath = `${baseUrl}/search-pro/${dataDir}/${dataFile}`;

    Logger.info(`Loading business data from: ${dataPath}`);

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
          data = [data]; // Convert to array if not already
        }

        Logger.info(`Successfully loaded ${data.length} business data entries`);
        _businessData = data;
        return data;
      })
      .catch((error) => {
        Logger.warn(`Error loading business data: ${error.message}`);
        _businessData = []; // Reset to empty array on error
        return []; // Return empty array to allow chaining
      });
  }

  // [7.1] Search initialization
  function _initializeSearch(tour) {
    Logger.info("Initializing enhanced search v2.0...");
    window.tourInstance = tour;

    // [7.1.1] Prevent duplicate initialization
    if (window.searchListInitialized || window.searchListInitiinitialized) {
      Logger.info("Search already initialized, skipping...");
      return;
    }

    // [7.1.2] Validate requirements and initialize element cache
    _elements.container = document.getElementById("searchContainer");
    if (!_elements.container) {
      Logger.error("Search container not found, cannot initialize search");
      return;
    }

    // [7.1.3] Initialize BroadcastChannel for cross-window communication
    _crossWindowChannel.init();

    // [7.1.4] Create a promise chain to load all external data sources
    const dataPromises = [];

    // Load business data if enabled
    if (_config.businessData.useBusinessData) {
      dataPromises.push(_loadBusinessData());
    }

    // Load Google Sheets data if enabled
    if (_config.googleSheets.useGoogleSheetData) {
      dataPromises.push(_loadGoogleSheetsData());
    }

    // [7.1.5] When all data sources are loaded (or failed gracefully), prepare the search index
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
        if (message && message.type === "historyUpdate") {
          const { action, history } = message.data || {};

          // Handle different message actions
          if (action === "clear") {
            // Clear history in this window without broadcasting
            if (_searchHistory._isStorageAvailable()) {
              localStorage.removeItem(_searchHistory.storageKey);
            }

            // Update UI if search is visible
            if (
              _elements.container &&
              _elements.container.classList.contains("visible")
            ) {
              const searchInput =
                _elements.container.querySelector("#tourSearch");
              if (searchInput && !searchInput.value.trim()) {
                // Trigger search to update the empty search display
                const event = new Event("input");
                searchInput.dispatchEvent(event);
              }
            }
          } else if (action === "save" && Array.isArray(history)) {
            // Update local storage without broadcasting
            if (_searchHistory._isStorageAvailable()) {
              localStorage.setItem(
                _searchHistory.storageKey,
                JSON.stringify(history),
              );
            }

            // Update UI if search is visible and showing history
            if (
              _elements.container &&
              _elements.container.classList.contains("visible")
            ) {
              const searchInput =
                _elements.container.querySelector("#tourSearch");
              if (searchInput && !searchInput.value.trim()) {
                // Trigger search to update the empty search display
                const event = new Event("input");
                searchInput.dispatchEvent(event);
              }
            }
          }
        }
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

    // Core search state
    let currentSearchTerm = "";
    let fuse = null;

    /**
     * Prepares and returns a Fuse.js search index for the tour panoramas and overlays.
     * @param {object} tour - The tour object containing the main playlist.
     * @param {object} config - The search configuration object.
     * @returns {Fuse} The constructed Fuse.js instance for searching.
     */
    // [7.1.6] Search index preparation
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
            if (
              config.businessData?.useBusinessData &&
              _businessData.length > 0
            ) {
              try {
                // Look for a business data entry that matches this panorama
                businessMatch = _businessData.find((entry) => {
                  // Match against tag property (primary method)
                  if (
                    entry.tag &&
                    label &&
                    label.toLowerCase().includes(entry.tag.toLowerCase())
                  ) {
                    return true;
                  }

                  // Match against alt tags if specified
                  if (Array.isArray(entry.altTags)) {
                    for (const altTag of entry.altTags) {
                      if (
                        altTag &&
                        label &&
                        label.toLowerCase().includes(altTag.toLowerCase())
                      ) {
                        return true;
                      }
                    }
                  }

                  // Check data.label if available as secondary method
                  const dataLabel = data?.label;
                  if (
                    entry.tag &&
                    dataLabel &&
                    dataLabel.toLowerCase().includes(entry.tag.toLowerCase())
                  ) {
                    return true;
                  }

                  // No match found
                  return false;
                });

                if (businessMatch) {
                  Logger.debug(
                    `Found business match for panorama ${label}: ${businessMatch.name}`,
                  );
                  businessTag = businessMatch.tag || null;
                  businessName = businessMatch.name || null;
                }
              } catch (error) {
                Logger.warn(
                  `Error matching business data for panorama ${label}:`,
                  error,
                );
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
            fuseData.push({
              type: "Panorama",
              index,
              label: resultLabel,
              originalLabel: label,
              subtitle: resultDescription,
              tags: Array.isArray(data?.tags) ? data.tags : [],
              // Business data fields
              businessTag: businessTag,
              businessName: businessName,
              // Google Sheets data fields
              sheetsData: sheetsData, // Store all Google Sheets data for use in rendering
              imageUrl: sheetsData?.imageUrl || null,
              item,
              // Boost factors (Sheet data > Business data > Original data)
              boost: sheetsData ? 2.5 : businessName ? 2.0 : label ? 1.5 : 1.0,
            });
            // Process overlay elements (hotspots, etc.)
            const overlays = _getOverlays(media, tour, item);
            _processOverlays(overlays, fuseData, index, displayLabel);
          } catch (error) {
            Logger.warn(`Error processing item at index ${index}:`, error);
          }
        });
        // Create Fuse.js search index
        const fuse = new Fuse(fuseData, {
          keys: [
            { name: "label", weight: 1 },
            { name: "subtitle", weight: 0.8 },
            { name: "tags", weight: 0.6 },
            { name: "parentLabel", weight: 0.3 },
            { name: "businessTag", weight: 0.7 }, // Add business tag as searchable field
            { name: "businessName", weight: 0.9 }, // Add business name with high weight
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
        return fuse;
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
      } catch (e) {
        Logger.debug("Error getting data:", e);
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
                    // Intentionally ignored: safely handle parent media comparison failure
                    return false;
                  }
                });
              }
            }
          } catch (e) {
            Logger.debug("Method 5 overlay detection failed:", e);
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

    // Process overlay elements
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
              // Safely ignore errors when accessing overlay properties - non-critical operation
            }
          }

          // If still no label, try to use other properties like text content
          if (!overlayLabel && typeof overlay.get === "function") {
            try {
              const textContent = overlay.get("data")[0].text;
              if (textContent) {
                overlayLabel = textContent.substring(0, 30);
                if (textContent.length > 30) overlayLabel += "...";
              }
            } catch {
              // No label found, using fallback label
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
              // Safely ignore errors when getting element ID - alternative ID methods will be tried
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
      _buildSearchField(container);
      _buildResultsContainer(container);
    }

    // Text highlighting with improved safety
    const highlightMatch = (text, term) => {
      if (!text || !term || term === "*") return text || "";

      try {
        // Sanitize the search term to prevent regex errors
        const sanitizedTerm = term.replace(/[-/^$*+?.()|[\]{}]/g, "\\$&");
        const regex = new RegExp(`(${sanitizedTerm})`, "gi");
        return text.replace(regex, "<mark>$1</mark>");
      } catch (e) {
        Logger.warn("Error highlighting text:", e);
        return text;
      }
    };

    // Get icon HTML for element types
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
                             <path d="M3 9h18"></path>
                             <path d="M9 21V9"></path>
                          </svg>`,
      };

      // Return the icon for the specified type, or a default if not found
      return icons[type] || icons["Element"];
    };

    // Render search history
    const renderSearchHistory = () => {
      const history = _searchHistory.get();
      if (!history.length) return "";

      return `
                <div class="search-history">
                    <div class="history-header">
                        <h3>Recent Searches</h3>
                        <button class="clear-history" aria-label="Clear search history">Clear</button>
                    </div>
                    <div class="history-items" role="list">
                        ${history
                          .map(
                            (term) => `
                            <button class="history-item" role="listitem">
                                <svg class="history-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10s10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8s8 3.589-8-8-8 3.589-8-8zm1-8h4v2h-6V7h2v5z"/>
                                </svg>
                                ${term}
                            </button>
                        `,
                          )
                          .join("")}
                    </div>
                </div>
            `;
    };

    // Group and sort search results
    const groupAndSortResults = (matches) => {
      // Create object to hold grouped results
      const grouped = matches.reduce((acc, match) => {
        // Check if this is a business result
        if (_config.businessData?.useBusinessData && match.item.businessName) {
          // Group business results separately if configured
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

      // Sort items within each group alphabetically
      Object.keys(grouped).forEach((type) => {
        grouped[type].sort((a, b) => {
          // Primary sort by label
          const labelCompare = a.item.label.localeCompare(b.item.label);
          if (labelCompare !== 0) return labelCompare;

          // Secondary sort by parent (if applicable)
          if (a.item.parentLabel && b.item.parentLabel) {
            return a.item.parentLabel.localeCompare(b.item.parentLabel);
          }

          return 0;
        });
      });

      return grouped;
    };

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

      // Handle empty search - show history
      if (!searchTerm) {
        noResults.style.display = "none";
        resultsContainer.classList.remove("visible");
        resultsContainer.style.display = "none";
        resultsList.innerHTML = renderSearchHistory();
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

        // Render each group of results
        Object.entries(groupedResults).forEach(([type, results]) => {
          const groupEl = document.createElement("div");
          groupEl.className = "results-group";
          groupEl.setAttribute("data-type", type);
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
              _config.googleSheets?.useGoogleSheetData && result.item.imageUrl;

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

            const safeThumbnailUrl = safeEncode(
              thumbnailUrl || thumbSettings.defaultImagePath || "",
            );
            const safeLabel = safeEncode(result.item.label || "Search result");

            // [1.1.2.8] Build result item content with thumbnail or icon using external CSS
            resultItem.innerHTML = `
                        ${
                          hasThumbnail
                            ? `
                        <div class="result-image ${thumbnailSizeClass}">
                            <img src="${safeThumbnailUrl}" 
                                 alt="${safeLabel}" 
                                 loading="lazy"
                                 onerror="this.style.display='none'">
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
              _searchHistory.save(searchTerm);

              // Update related content for this result item if enabled
              if (_config.relatedContent && _config.relatedContent.enabled) {
                // Get all available items from the fuse index
                const allItems = fuse._docs || [];
                // Update related content based on the selected item
                _updateRelatedContent(result.item, allItems);
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

    // Keyboard navigation is managed elsewhere in the codebase

    // Prepare the search index
    prepareFuse();

    // Apply search styling
    _applySearchStyling();

    // Apply custom CSS for showing/hiding tags
    let styleElement = document.getElementById("search-custom-styles");
    if (styleElement) {
      styleElement.remove();
    }

    styleElement = document.createElement("style");
    styleElement.id = "search-custom-styles";
    styleElement.textContent = `.result-tags { display: ${_config.showTagsInResults ? "block" : "none"}; }`;
    document.head.appendChild(styleElement);

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
      performSearch,
    );

    // [7.1.1] Mark initialization as complete
    window.searchListInitialized = true;
    window.searchListInitiinitialized = true;
    _initialized = true;
    Logger.info("Enhanced search initialized successfully");
  }

  // [7.2] Search visibility toggle
  function _toggleSearch(show) {
    // [7.2.1] Validate container exists
    if (!_elements.container) {
      Logger.error("Search container not found");
      return;
    }

    // Show search

    if (show) {
      // Update display before animation
      _elements.container.style.display = "block";

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
        _elements.container.style.top = newTop + "px";
      }

      // Trigger animation on next frame
      requestAnimationFrame(() => {
        _elements.container.classList.add("visible");

        // Focus input field
        if (_elements.input) {
          _elements.input.focus();
        }
      });
    } else {
      // Hide search
      _elements.container.classList.remove("visible");

      // Set ARIA expanded state
      _aria.setExpanded(_elements.container, false);

      // Wait for transition to complete before hiding
      setTimeout(() => {
        if (!_elements.container.classList.contains("visible")) {
          _elements.container.style.display = "none";
        }
      }, 350);

      // Clean up after animation
      setTimeout(() => {
        // Reset input and UI
        if (_elements.input) {
          _elements.input.value = "";
          _elements.input.blur();
        }
      }, 400);

      // Clear UI elements
      setTimeout(() => {
        // Update cached elements
        if (_elements.clearButton) {
          _elements.clearButton.classList.remove("visible");
        }

        if (_elements.searchIcon) {
          _elements.searchIcon.style.opacity = "1";
        }

        // Clear results
        if (_elements.results) {
          const resultsList =
            _elements.container.querySelector(".results-section");
          if (resultsList) {
            resultsList.innerHTML = "";
          }
        }

        // Hide any error messages
        const noResults = _elements.container.querySelector(".no-results");
        if (noResults) {
          noResults.style.display = "none";
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

        _initializeSearch(tour);
      } catch (error) {
        Logger.error("Search initialization failed:", error);
      }
    },

    // [8.3] Toggle search visibility
    toggleSearch: function (show) {
      _toggleSearch(show);
    },

    // [8.4] Update configuration
    updateConfig: function (newConfig) {
      try {
        // [8.4.1] Validate configuration object
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
      get: function () {
        return _searchHistory.get();
      },
      clear: function () {
        return _searchHistory.clear();
      },
    },
  };
})();

// [9.0] GLOBAL EXPORTS
window.searchFunctions = window.tourSearchFunctions;
// Export fallback function for 3DVista integration
window.openSearchPanelFallback = openSearchPanelFallback;

// [10.0] FALLBACK FUNCTIONS
function openSearchPanelFallback() {
  try {
    // Use cached element if available, otherwise query the DOM
    const searchContainer =
      window.tourSearchFunctions && window.tourSearchFunctions.elements
        ? window.tourSearchFunctions.elements.container
        : document.getElementById("searchContainer");

    if (!searchContainer) {
      alert("Search panel not found.");
      return;
    }
    if (
      !window.tourSearchFunctions ||
      typeof window.tourSearchFunctions.initializeSearch !== "function" ||
      typeof window.tourSearchFunctions.toggleSearch !== "function"
    ) {
      alert("Search functions not available.");
      return;
    }
    if (!window.searchListInitialized) {
      window.tourSearchFunctions.initializeSearch(window.tourInstance);
    }
    window.tourSearchFunctions.toggleSearch(
      searchContainer.style.display !== "block",
    );
  } catch (error) {
    console.error(
      "Button action error - Check if initialization is complete:",
      error,
    );
  }
}
