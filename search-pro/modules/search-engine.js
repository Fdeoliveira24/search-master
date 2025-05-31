/**
 * search-engine.js - Search indexing and processing for Search Pro
 * Handles element detection, indexing, and filtering logic
 */

// New centralized mode management
const DataSourceModes = {
  TOUR: "tour",
  BUSINESS: "business",
  GOOGLE_SHEETS: "googleSheets",
  CUSTOM_THUMBNAILS: "customThumbnails",

  // Get active mode from config
  getActiveMode: function (config) {
    // Check modes in priority order
    if (config?.businessData?.useAsDataSource === true) {
      return this.BUSINESS;
    }
    if (config?.googleSheets?.useAsDataSource === true) {
      return this.GOOGLE_SHEETS;
    }
    if (config?.customThumbnails?.useAsDataSource === true) {
      return this.CUSTOM_THUMBNAILS;
    }
    return this.TOUR; // Default
  },

  // Set mode and ensure mutual exclusivity
  setMode: function (config, mode) {
    // Reset all modes
    if (config.businessData) config.businessData.useAsDataSource = false;
    if (config.googleSheets) config.googleSheets.useAsDataSource = false;
    if (config.customThumbnails)
      config.customThumbnails.useAsDataSource = false;

    // Set the requested mode
    switch (mode) {
      case this.BUSINESS:
        if (!config.businessData) config.businessData = {};
        config.businessData.useAsDataSource = true;
        config.businessData.useBusinessData = true;
        break;
      case this.GOOGLE_SHEETS:
        if (!config.googleSheets) config.googleSheets = {};
        config.googleSheets.useAsDataSource = true;
        config.googleSheets.useGoogleSheetData = true;
        break;
      case this.CUSTOM_THUMBNAILS:
        if (!config.customThumbnails) config.customThumbnails = {};
        config.customThumbnails.useAsDataSource = true;
        break;
      // Tour mode (default) - all useAsDataSource are false
    }

    return config;
  },
};

window.SearchProModules = window.SearchProModules || {};

window.SearchProModules.SearchEngine = (function () {
  // [1.0] DEPENDENCIES
  const Utils = window.SearchProModules.Utils || {};
  const Logger = Utils.Logger || console;

  // [2.0] ELEMENT TYPE DETECTION
  function _getElementType(overlay, label) {
    if (!overlay) return "Element";
    try {
      // [2.1] Lookup map for overlay classes
      const classNameMap = {
        FramePanoramaOverlay: "Webframe",
        QuadVideoPanoramaOverlay: "Video",
        ImagePanoramaOverlay: "Image",
        TextPanoramaOverlay: "Text",
        HotspotPanoramaOverlay: "Hotspot",
      };
      // [2.2] Lookup map for label patterns
      const labelPatternMap = [
        { pattern: "web", type: "Webframe" },
        { pattern: "video", type: "Video" },
        { pattern: "image", type: "Image" },
        { pattern: "text", type: "Text" },
        { pattern: "polygon", type: "Polygon" },
        { pattern: "goto", type: "Hotspot" },
        { pattern: "info", type: "Hotspot" },
      ];
      // [2.3] Direct class mapping
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
      // [2.4] Try overlay.get('class') if available
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
      // [2.5] Property-based detection (Webframe, Video, Polygon)
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
      // [2.6] Label pattern mapping
      const overlayLabel = (overlay.label || label || "").toLowerCase();
      if (overlayLabel) {
        for (const { pattern, type } of labelPatternMap) {
          if (overlayLabel === pattern || overlayLabel.includes(pattern)) {
            return type;
          }
        }
      }
      // [2.7] Default
      return "Element";
    } catch (error) {
      Logger.warn("Error in element type detection:", error);
      return "Element";
    }
  }

  // [3.0] ELEMENT FILTERING
  function _shouldIncludeElement(elementType, label, tags, config) {
    try {
      // [3.1] Skip empty labels if configured
      if (!label && config.includeContent.elements.skipEmptyLabels) {
        return false;
      }

      // [3.2] Check minimum label length
      if (
        label &&
        config.includeContent.elements.minLabelLength > 0 &&
        label.length < config.includeContent.elements.minLabelLength
      ) {
        return false;
      }

      // [3.3] Apply element type filtering
      const typeFilterMode = config.filter.elementTypes?.mode;
      if (
        typeFilterMode === "whitelist" &&
        Array.isArray(config.filter.elementTypes?.allowedTypes) &&
        config.filter.elementTypes.allowedTypes.length > 0
      ) {
        if (!config.filter.elementTypes.allowedTypes.includes(elementType)) {
          return false;
        }
      } else if (
        typeFilterMode === "blacklist" &&
        Array.isArray(config.filter.elementTypes?.blacklistedTypes) &&
        config.filter.elementTypes.blacklistedTypes.length > 0
      ) {
        if (config.filter.elementTypes.blacklistedTypes.includes(elementType)) {
          return false;
        }
      }

      // [3.4] Apply label filtering
      const labelFilterMode = config.filter.elementLabels?.mode;
      if (
        label &&
        labelFilterMode === "whitelist" &&
        Array.isArray(config.filter.elementLabels?.allowedValues) &&
        config.filter.elementLabels.allowedValues.length > 0
      ) {
        if (
          !config.filter.elementLabels.allowedValues.some((value) =>
            label.includes(value),
          )
        ) {
          return false;
        }
      } else if (
        label &&
        labelFilterMode === "blacklist" &&
        Array.isArray(config.filter.elementLabels?.blacklistedValues) &&
        config.filter.elementLabels.blacklistedValues.length > 0
      ) {
        if (
          config.filter.elementLabels.blacklistedValues.some((value) =>
            label.includes(value),
          )
        ) {
          return false;
        }
      }

      // [3.5] Apply tag filtering
      const tagFilterMode = config.filter.tagFiltering?.mode;
      if (Array.isArray(tags) && tags.length > 0) {
        if (
          tagFilterMode === "whitelist" &&
          Array.isArray(config.filter.tagFiltering?.allowedTags) &&
          config.filter.tagFiltering.allowedTags.length > 0
        ) {
          if (
            !tags.some((tag) =>
              config.filter.tagFiltering.allowedTags.includes(tag),
            )
          ) {
            return false;
          }
        } else if (
          tagFilterMode === "blacklist" &&
          Array.isArray(config.filter.tagFiltering?.blacklistedTags) &&
          config.filter.tagFiltering.blacklistedTags.length > 0
        ) {
          if (
            tags.some((tag) =>
              config.filter.tagFiltering.blacklistedTags.includes(tag),
            )
          ) {
            return false;
          }
        }
      } else if (
        tagFilterMode === "whitelist" &&
        Array.isArray(config.filter.tagFiltering?.allowedTags) &&
        config.filter.tagFiltering.allowedTags.length > 0
      ) {
        return false;
      }

      // [3.6] Check element type against configuration
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
        return config.includeContent.elements[configKey] !== false;
      }

      // [3.7] Try pluralized version for custom types
      const pluralizedKey = `include${elementType}s`;
      if (config.includeContent.elements[pluralizedKey] !== undefined) {
        return config.includeContent.elements[pluralizedKey];
      }

      // [3.8] Default to include if not specifically configured
      return true;
    } catch (error) {
      Logger.warn("Error in element filtering:", error);
      return false;
    }
  }

  // [4.0] ELEMENT TRIGGERING
  function _triggerElement(tour, elementId, callback, options = {}, config) {
    if (!tour || !elementId) {
      Logger.warn("Invalid tour or elementId for trigger");
      if (callback) callback(false);
      return;
    }

    // [4.1] Merge with default config
    const triggerConfig = {
      ...(config ? config.elementTriggering : {}),
      ...options,
    };

    let retryCount = 0;

    // [4.2] Use exponential backoff for retries
    const getBackoffTime = (attempt) => {
      const baseTime = triggerConfig.baseRetryInterval;
      const exponentialTime = baseTime * Math.pow(1.5, attempt);
      return Math.min(exponentialTime, triggerConfig.maxRetryInterval);
    };

    const attemptTrigger = () => {
      try {
        if (!tour || !tour.player) {
          Logger.warn("Tour or player not available");
          if (callback) callback(false);
          return;
        }

        // [4.3] Find element using multiple strategies
        const element = findElementById(tour, elementId);

        if (element) {
          Logger.info(`Element found: ${elementId}`);

          // [4.4] Try multiple trigger methods in sequence
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

          // [4.5] All trigger methods failed
          Logger.warn("All trigger methods failed for element:", elementId);
        }

        // [4.6] Element not found or trigger failed, retry if possible
        retryCount++;
        if (retryCount < triggerConfig.maxRetries) {
          const backoffTime = getBackoffTime(retryCount);
          Logger.debug(
            `Element trigger attempt ${retryCount} failed, retrying in ${backoffTime}ms...`,
          );
          setTimeout(attemptTrigger, backoffTime);
        } else {
          Logger.warn(
            `Failed to trigger element ${elementId} after ${triggerConfig.maxRetries} attempts`,
          );
          if (callback) callback(false);
        }
      } catch (error) {
        Logger.warn(`Error in triggerElement: ${error.message}`);
        if (callback) callback(false);
      }
    };

    // [4.7] Helper to find element by ID using multiple methods
    function findElementById(tour, id) {
      let element = null;

      // [4.7.1] Method 1: Direct getById
      try {
        element = tour.player.getById(id);
        if (element) return element;
      } catch (e) {
        Logger.debug("getById method failed:", e);
      }

      // [4.7.2] Method 2: get method
      try {
        element = tour.get(id) || tour.player.get(id);
        if (element) return element;
      } catch (e) {
        Logger.debug("get method failed:", e);
      }

      // [4.7.3] Method 3: getAllIDs and find
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

    // [4.8] Start first attempt after initial delay
    setTimeout(attemptTrigger, triggerConfig.initialDelay);
  }

  // [5.0] UTILITY FUNCTIONS

  // [5.1] Helper for safely getting object data
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

  // [5.2] Helper to check if a panorama should be included
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
    config,
  ) {
    // [5.2.1] Apply whitelist/blacklist filters
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

    // [5.2.2] For completely blank items
    const hasTags = Array.isArray(tags) && tags.length > 0;
    if (!label && !subtitle && !hasTags) {
      // Check media index filtering
      if (filterMode === "whitelist" && allowedMediaIndexes.length > 0) {
        if (!allowedMediaIndexes.includes(index)) return false;
      }
      if (filterMode === "blacklist" && blacklistedMediaIndexes.length > 0) {
        if (blacklistedMediaIndexes.includes(index)) return false;
      }
      if (!config.includeContent.completelyBlank) return false;
    }

    // [5.2.3] Skip unlabeled items based on configuration
    if (!label) {
      const hasSubtitle = Boolean(subtitle);

      const shouldInclude =
        (hasSubtitle && config.includeContent.unlabeledWithSubtitles) ||
        (hasTags && config.includeContent.unlabeledWithTags) ||
        (!hasSubtitle && !hasTags && config.includeContent.completelyBlank);

      if (!shouldInclude) return true;
    }

    return true;
  }

  // [5.3] Helper to get display label
  function _getDisplayLabel(label, subtitle, tags, config) {
    if (config.display.onlySubtitles && subtitle) {
      return subtitle;
    }

    if (!label) {
      if (subtitle && config.useAsLabel.subtitles) {
        return subtitle;
      }

      if (Array.isArray(tags) && tags.length > 0 && config.useAsLabel.tags) {
        return tags.join(", ");
      }

      if (config.useAsLabel.elementType) {
        return "Panorama";
      }

      return config.useAsLabel.customText;
    }

    return label;
  }

  // [5.4] Helper to get overlays from multiple sources
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
          if (tour.player && typeof tour.player.getByClassName === "function") {
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

  // [5.5] Process overlay elements
  function _processOverlays(
    overlays,
    fuseData,
    parentIndex,
    parentLabel,
    config,
    sheetsLookup,
    sourceMode = "tour",
  ) {
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
        if (!overlayLabel && config.includeContent.elements.skipEmptyLabels)
          return;

        // Get element type
        let elementType = _getElementType(overlay, overlayLabel);
        if (overlayLabel.includes("info-") || overlayLabel.includes("info_")) {
          elementType = "Hotspot";
        }

        // Apply element filtering
        const elementTags = Array.isArray(overlayData.tags)
          ? overlayData.tags
          : [];
        if (
          !_shouldIncludeElement(elementType, overlayLabel, elementTags, config)
        ) {
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

        // Check for Google Sheets enhancement for overlays (only in tour mode)
        let sheetsMatch = null;
        if (
          sourceMode === "tour" &&
          elementId &&
          sheetsLookup &&
          sheetsLookup.has(elementId)
        ) {
          sheetsMatch = sheetsLookup.get(elementId);
          Logger.debug(
            "✨ Found Google Sheets match for overlay:",
            elementId,
            sheetsMatch,
          );
        }

        // Create a fallback label if needed
        let displayLabel = overlayLabel;
        if (!displayLabel) {
          displayLabel = `${elementType} ${parentIndex}.${overlayIndex}`;
        }

        // Debug: log overlay processing and type detection
        Logger.debug(
          `Processing overlay: ${overlayLabel}, Type detected: ${elementType}, Source mode: ${sourceMode}`,
        );

        // Create overlay item with source mode awareness
        const overlayItem = {
          type: elementType,
          label: sheetsMatch?.name || displayLabel,
          originalLabel: overlayLabel,
          tags: elementTags,
          parentIndex: parentIndex,
          parentLabel: parentLabel,
          id: elementId,
          boost: 0.8,
          dataSource:
            sourceMode === "tour"
              ? sheetsMatch
                ? "enhanced"
                : "tour"
              : sourceMode,
          sourceMode: sourceMode,
        };

        // Enhance overlay with Google Sheets data if available (only in tour mode)
        if (sourceMode === "tour" && sheetsMatch) {
          overlayItem.imageUrl = sheetsMatch.imageUrl;
          overlayItem.description = sheetsMatch.description;
          overlayItem.sheetsData = sheetsMatch;
          overlayItem.enhanced = true;
          overlayItem.enhancedBy = "googleSheets";
          Logger.debug(
            "✨ Enhanced overlay with Google Sheets data:",
            overlayItem.label,
          );
        }

        // Add to search data
        fuseData.push(overlayItem);
      } catch (overlayError) {
        Logger.warn(
          `Error processing overlay at index ${overlayIndex}:`,
          overlayError,
        );
      }
    });
  }

  // [6.0] SEARCH INDEX PREPARATION
  /**
   *  The _prepareSearchIndex and helper functions
   * Implements mutually exclusive data sources with priority order:
   * 1. Tour Only (default when no ONLY modes enabled)
   * 2. Business Data Only (businessData.useAsDataSource = true)
   * 3. Custom Thumbnails Only (customThumbnails.useAsDataSource = true)
   * 4. Google Sheets Only (googleSheets.useAsDataSource = true)
   */

  /**
   * Main search index preparation function with mutually exclusive data sources
   */
  function _prepareSearchIndex(tour, config, businessData, googleSheetsData) {
    try {
      // =============================================================================
      // STEP 1: DETECT ACTIVE DATA SOURCE MODE USING PRIORITY ORDER
      // =============================================================================

      // Check for ONLY modes in priority order
      const isBusinessDataOnly = config.businessData?.useAsDataSource === true; // Business data only mode
      const isCustomThumbnailsOnly =
        config.customThumbnails?.useAsDataSource === true; // Custom thumbnails only mode
      const isGoogleSheetsOnly = config.googleSheets?.useAsDataSource === true; // Google Sheets only mode

      // Determine active mode based on priority
      let activeMode = "tour"; // Default
      if (isBusinessDataOnly) activeMode = "business";
      else if (isCustomThumbnailsOnly) activeMode = "customThumbnails";
      else if (isGoogleSheetsOnly) activeMode = "googleSheets";

      // Log configuration state for debugging
      Logger.info("=== SEARCH INDEX DATA SOURCE ANALYSIS ===");
      Logger.info(`🔍 Checking data source flags:`);
      Logger.info(`  Business Data Only: ${isBusinessDataOnly}`);
      Logger.info(`  Custom Thumbnails Only: ${isCustomThumbnailsOnly}`);
      Logger.info(`  Google Sheets Only: ${isGoogleSheetsOnly}`);
      Logger.info(`🎯 ACTIVE MODE: ${activeMode.toUpperCase()}`);

      // Warn if multiple ONLY modes are configured (configuration error)
      const enabledOnlyModes = [
        isBusinessDataOnly && "Business Data",
        isCustomThumbnailsOnly && "Custom Thumbnails",
        isGoogleSheetsOnly && "Google Sheets",
      ].filter(Boolean);

      if (enabledOnlyModes.length > 1) {
        Logger.error(
          `❌ CONFIGURATION ERROR: Multiple ONLY modes detected: [${enabledOnlyModes.join(", ")}]`,
        );
        Logger.error(
          `🔧 Priority order will be enforced: Business > Custom Thumbnails > Google Sheets`,
        );
      }

      // =============================================================================
      // STEP 2: BUILD INDEX BASED ON ACTIVE MODE
      // =============================================================================

      switch (activeMode) {
        case "tour":
          return _buildTourOnlyIndex(tour, config);

        case "business":
          return _buildBusinessDataOnlyIndex(businessData, config);

        case "customThumbnails":
          return _buildCustomThumbnailsOnlyIndex(config);

        case "googleSheets":
          return _buildGoogleSheetsOnlyIndex(googleSheetsData, config);

        default:
          Logger.error(`❌ CRITICAL ERROR: Unknown active mode: ${activeMode}`);
          return new Fuse([], { keys: ["label"], includeScore: true });
      }
    } catch (error) {
      Logger.error("❌ CRITICAL ERROR in _prepareSearchIndex:", error);
      // Return empty but functional Fuse index on error
      return new Fuse([], { keys: ["label"], includeScore: true });
    }
  }

  // =============================================================================
  // MODE-SPECIFIC INDEX BUILDERS
  // =============================================================================

  /**
   * PRIORITY 1: Tour Only Mode - Default when no ONLY modes are enabled
   * Builds search index exclusively from tour data (panoramas + overlays)
   */
  function _buildTourOnlyIndex(tour, config) {
    Logger.info(
      "🏛️ [TOUR ONLY] Building search index from tour data exclusively",
    );
    Logger.info(
      "🚫 Ignoring all external data sources (Business, Custom Thumbnails, Google Sheets)",
    );

    // Validate tour data availability
    let items = null;
    if (tour?.mainPlayList && typeof tour.mainPlayList.get === "function") {
      items = tour.mainPlayList.get("items");
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      Logger.warn(
        "⚠️ Tour playlist items not available or empty - returning empty index",
      );
      return new Fuse([], { keys: ["label"], includeScore: true });
    }

    const fuseData = [];
    let panoramaCount = 0;
    let overlayCount = 0;

    // Process all tour items (panoramas and their overlays)
    items.forEach((item, index) => {
      let media =
        item && typeof item.get === "function" ? item.get("media") : null;
      if (!media) return;

      const data = _safeGetData(media);
      const label = data?.label?.trim() || "";
      const subtitle = data?.subtitle?.trim() || "";
      const displayLabel = _getDisplayLabel(
        label,
        subtitle,
        data?.tags,
        config,
      );
      const mediaId =
        data?.label ||
        displayLabel ||
        (media.get && media.get("id")) ||
        `panorama_${index}`;

      // Apply panorama filtering
      if (
        !_shouldIncludePanorama(
          label,
          subtitle,
          data?.tags,
          index,
          config.filter?.mode || "none",
          config.filter?.allowedValues || [],
          config.filter?.blacklistedValues || [],
          config.filter?.allowedMediaIndexes || [],
          config.filter?.blacklistedMediaIndexes || [],
          config,
        )
      ) {
        return;
      }

      // Create panorama item
      const panoramaItem = {
        type: "Panorama",
        index,
        id: mediaId,
        label: displayLabel,
        originalLabel: label,
        subtitle: subtitle,
        tags: Array.isArray(data?.tags) ? data.tags : [],
        item,
        media,
        boost: label ? 1.5 : 1.0,
        dataSource: "tour",
        sourceMode: "tourOnly",
      };
      fuseData.push(panoramaItem);
      panoramaCount++;

      // Process overlays for this panorama
      const overlays = _getOverlays(media, tour, item);
      const overlaysBefore = fuseData.length;
      _processOverlays(
        overlays,
        fuseData,
        index,
        displayLabel,
        config,
        null,
        "tourOnly",
      );
      overlayCount += fuseData.length - overlaysBefore - 1; // -1 for the panorama we just added
    });

    const fuse = new Fuse(fuseData, _getFuseOptions());
    Logger.info(
      `✅ [TOUR ONLY] Successfully indexed ${fuseData.length} total items:`,
    );
    Logger.info(`   📍 ${panoramaCount} panoramas`);
    Logger.info(`   🎯 ${overlayCount} overlays`);
    return fuse;
  }

  /**
   * PRIORITY 2: Business Data Only Mode
   * Builds search index exclusively from business data, ignoring tour completely
   */
  function _buildBusinessDataOnlyIndex(businessData, config) {
    Logger.info(
      "🏢 [BUSINESS DATA ONLY] Building search index from business data exclusively",
    );
    Logger.info(
      "🚫 Ignoring tour data, custom thumbnails, and Google Sheets data",
    );

    if (!Array.isArray(businessData) || businessData.length === 0) {
      Logger.warn(
        "⚠️ Business data not available or empty - returning empty index",
      );
      return new Fuse([], { keys: ["label"], includeScore: true });
    }

    const fuseData = businessData
      .map((business, index) => {
        // Normalize business data to standard search item format
        const businessItem = {
          id:
            business.id ||
            business.name ||
            business.businessName ||
            `business_${index}`,
          label:
            business.name ||
            business.businessName ||
            business.title ||
            "Unnamed Business",
          subtitle:
            business.description || business.address || business.summary || "",
          type: "Business",
          imageUrl: business.imageUrl || business.logo || business.image || "",
          parentLabel:
            business.category || business.location || business.area || "",
          tags: _normalizeTagsArray(business.tags || business.categories || []),
          // Preserve original business data
          businessData: business,
          // Search optimization
          boost: business.name ? 1.2 : 1.0,
          // Source tracking
          dataSource: "business",
          sourceMode: "businessOnly",
        };

        // Apply business data filtering if configured
        if (
          config.filter?.elementTypes?.mode === "blacklist" &&
          config.filter.elementTypes.blacklistedTypes?.includes("Business")
        ) {
          return null; // Will be filtered out
        }

        return businessItem;
      })
      .filter(Boolean); // Remove null entries

    const fuse = new Fuse(fuseData, _getFuseOptions());
    Logger.info(
      `✅ [BUSINESS DATA ONLY] Successfully indexed ${fuseData.length} business items`,
    );
    return fuse;
  }

  /**
   * PRIORITY 3: Custom Thumbnails Only Mode
   * Builds search index exclusively from custom thumbnails data (Future implementation)
   */
  function _buildCustomThumbnailsOnlyIndex(config) {
    Logger.info(
      "🖼️ [CUSTOM THUMBNAILS ONLY] Building search index from custom thumbnails data exclusively",
    );
    Logger.info("🚫 Ignoring tour data, business data, and Google Sheets data");

    // TODO: Implement custom thumbnails data source
    // This would load from a custom thumbnails JSON file or API
    const fuseData = [];

    // Placeholder for future implementation:
    // const customThumbnailsData = await loadCustomThumbnailsData(config);
    // fuseData = customThumbnailsData.map(thumbnail => ({
    //   id: thumbnail.id,
    //   label: thumbnail.title || thumbnail.name,
    //   subtitle: thumbnail.description,
    //   type: thumbnail.type || "CustomThumbnail",
    //   imageUrl: thumbnail.url,
    //   tags: thumbnail.tags || [],
    //   thumbnailData: thumbnail,
    //   dataSource: "customThumbnails",
    //   sourceMode: "customThumbnailsOnly"
    // }));

    const fuse = new Fuse(fuseData, _getFuseOptions());
    Logger.warn(
      `⚠️ [CUSTOM THUMBNAILS ONLY] Feature not yet implemented - indexed 0 items`,
    );
    Logger.info(`ℹ️ This mode will be available in a future version`);
    return fuse;
  }

  /**
   * PRIORITY 4: Google Sheets Only Mode
   * Builds search index exclusively from Google Sheets data, ignoring tour completely
   */
  function _buildGoogleSheetsOnlyIndex(googleSheetsData, config) {
    Logger.info(
      "📊 [GOOGLE SHEETS ONLY] Building search index from Google Sheets data exclusively",
    );
    Logger.info(
      "🚫 Ignoring tour data, business data, and custom thumbnails data",
    );

    if (!Array.isArray(googleSheetsData) || googleSheetsData.length === 0) {
      Logger.warn(
        "⚠️ Google Sheets data not available or empty - returning empty index",
      );
      return new Fuse([], { keys: ["label"], includeScore: true });
    }

    const fuseData = googleSheetsData
      .map((row, index) => {
        // Normalize Google Sheets row to standard search item format
        const sheetItem = {
          id: row.id || row.name || `sheet_row_${index}`,
          label: row.name || row.title || row.label || row.id || "Unnamed Item",
          subtitle: row.description || row.summary || row.details || "",
          type: _normalizeElementType(row.elementType || row.type) || "Element",
          imageUrl: row.imageUrl || row.image || row.thumbnail || "",
          parentLabel: row.parentId || row.parent || row.category || "",
          tags: _normalizeTagsArray(
            row.tag || row.tags || row.categories || [],
          ),
          // Preserve original sheets data
          sheetsData: row,
          // Search optimization
          boost: row.name ? 1.0 : 0.8,
          // Source tracking
          dataSource: "googleSheets",
          sourceMode: "googleSheetsOnly",
        };

        // Apply sheets data filtering if configured
        if (
          config.filter?.elementTypes?.mode === "blacklist" &&
          config.filter.elementTypes.blacklistedTypes?.includes(sheetItem.type)
        ) {
          return null; // Will be filtered out
        }

        return sheetItem;
      })
      .filter(Boolean); // Remove null entries

    const fuse = new Fuse(fuseData, _getFuseOptions());
    Logger.info(
      `✅ [GOOGLE SHEETS ONLY] Successfully indexed ${fuseData.length} sheet items`,
    );
    return fuse;
  }

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  /**
   * Returns standardized Fuse.js options for consistent search behavior
   * across all data source modes.
   */
  function _getFuseOptions() {
    return {
      keys: [
        { name: "label", weight: 1.0 },
        { name: "subtitle", weight: 0.8 },
        { name: "tags", weight: 0.6 },
        { name: "parentLabel", weight: 0.3 },
      ],
      includeScore: true,
      threshold: 0.4,
      distance: 40,
      minMatchCharLength: 1,
      useExtendedSearch: true,
      ignoreLocation: true,
      location: 0,
    };
  }

  /**
   * Normalizes element types to standard values
   */
  function _normalizeElementType(elementType) {
    if (!elementType) return "Element";

    const typeMap = {
      hotspot: "Hotspot",
      video: "Video",
      webframe: "Webframe",
      image: "Image",
      text: "Text",
      polygon: "Polygon",
      business: "Business",
      panorama: "Panorama",
    };

    const normalized = elementType.toLowerCase();
    return typeMap[normalized] || elementType;
  }

  /**
   * Normalizes tags to a consistent array format
   */
  function _normalizeTagsArray(tags) {
    if (!tags) return [];
    if (Array.isArray(tags))
      return tags.filter((t) => t && typeof t === "string");
    if (typeof tags === "string")
      return tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);
    return [];
  }

  // [7.0] PUBLIC API
  return {
    getElementType: _getElementType,
    shouldIncludeElement: _shouldIncludeElement,
    triggerElement: _triggerElement,
    safeGetData: _safeGetData,
    shouldIncludePanorama: _shouldIncludePanorama,
    getDisplayLabel: _getDisplayLabel,
    getOverlays: _getOverlays,
    processOverlays: _processOverlays,
    prepareSearchIndex: _prepareSearchIndex,
  };
})();
