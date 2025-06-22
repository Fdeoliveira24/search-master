/**
 * Search Pro Control Panel
 * Professional-grade configuration management for 3DVista search system
 * Version: 2.0.0
 */

class SearchProControlPanel {
  constructor() {
    this.initializeEventListeners();
    this.initializeTabs();
    this.initializeDataSourceToggling();
    this.initializeRangeInputs();
    this.loadDefaultValues();

    console.log("Search Pro Control Panel initialized");
  }

  /**
   * Initialize all event listeners with null checks
   */
  initializeEventListeners() {
    // Main action buttons with null checks
    const applyBtn = document.getElementById("applyToTour");
    const downloadBtn = document.getElementById("downloadConfig");
    const loadBtn = document.getElementById("loadConfig");
    const resetBtn = document.getElementById("resetDefaults");

    if (applyBtn) applyBtn.addEventListener("click", () => this.applyToTour());
    if (downloadBtn)
      downloadBtn.addEventListener("click", () => this.downloadConfig());
    if (loadBtn) loadBtn.addEventListener("click", () => this.loadConfig());
    if (resetBtn)
      resetBtn.addEventListener("click", () => this.showResetModal());

    // Reset modal buttons with null checks
    const confirmResetBtn = document.getElementById("confirmReset");
    const cancelResetBtn = document.getElementById("cancelReset");

    if (confirmResetBtn)
      confirmResetBtn.addEventListener("click", () => this.resetToDefaults());
    if (cancelResetBtn)
      cancelResetBtn.addEventListener("click", () => this.hideResetModal());

    // File input with null check
    const fileInput = document.getElementById("fileInput");
    if (fileInput)
      fileInput.addEventListener("change", (e) => this.handleFileLoad(e));

    // Data source toggles with null checks
    const businessDataToggle = document.getElementById("useBusinessData");
    const googleSheetsToggle = document.getElementById("useGoogleSheetData");

    if (businessDataToggle)
      businessDataToggle.addEventListener("change", () =>
        this.handleDataSourceToggle(),
      );
    if (googleSheetsToggle)
      googleSheetsToggle.addEventListener("change", () =>
        this.handleDataSourceToggle(),
      );
  }

  /**
   * Initialize tab functionality
   */
  initializeTabs() {
    const tabs = document.querySelectorAll(".tab");
    const tabContents = document.querySelectorAll(".tab-content");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        // Remove active class from all tabs and contents
        tabs.forEach((t) => t.classList.remove("active"));
        tabContents.forEach((content) => content.classList.remove("active"));

        // Add active class to clicked tab
        tab.classList.add("active");

        // Show corresponding content
        const targetTab = tab.getAttribute("data-tab");
        const targetContent = document.getElementById(targetTab);
        if (targetContent) {
          targetContent.classList.add("active");
        }
      });
    });
  }

  /**
   * Initialize range input value displays
   */
  initializeRangeInputs() {
    const ranges = [
      { id: "searchThreshold", displayId: "thresholdValue" },
      { id: "labelWeight", displayId: "labelWeightValue" },
      { id: "businessNameWeight", displayId: "businessNameWeightValue" },
      { id: "subtitleWeight", displayId: "subtitleWeightValue" },
      { id: "tagsWeight", displayId: "tagsWeightValue" },
      { id: "parentLabelWeight", displayId: "parentLabelWeightValue" },
      { id: "businessTagWeight", displayId: "businessTagWeightValue" },
      { id: "businessMatchBoost", displayId: "businessMatchBoostValue" },
      { id: "sheetsMatchBoost", displayId: "sheetsMatchBoostValue" },
      { id: "labeledItemBoost", displayId: "labeledItemBoostValue" },
      { id: "unlabeledItemBoost", displayId: "unlabeledItemBoostValue" },
      { id: "childElementBoost", displayId: "childElementBoostValue" },
    ];

    ranges.forEach((range) => {
      const input = document.getElementById(range.id);
      const display = document.getElementById(range.displayId);

      if (input && display) {
        input.addEventListener("input", () => {
          display.textContent = input.value;
        });
      }
    });
  }

  /**
   * Handle mutual exclusion between data sources
   */
  initializeDataSourceToggling() {
    this.handleDataSourceToggle(); // Set initial state
  }

  /**
   * Handle data source toggle logic
   */
  handleDataSourceToggle() {
    const useBusinessData = document.getElementById("useBusinessData").checked;
    const useGoogleSheets =
      document.getElementById("useGoogleSheetData").checked;

    const businessSection = document.getElementById("businessDataSection");
    const sheetsSection = document.getElementById("googleSheetsSection");

    // Update visual states
    if (useBusinessData) {
      businessSection.classList.add("active");
      sheetsSection.classList.remove("active");
      sheetsSection.classList.add("disabled");

      // Disable Google Sheets
      document.getElementById("useGoogleSheetData").checked = false;
      this.setFieldsDisabled("googleSheetsSection", true);
    } else if (useGoogleSheets) {
      sheetsSection.classList.add("active");
      businessSection.classList.remove("active");
      businessSection.classList.add("disabled");

      // Disable Business Data
      document.getElementById("useBusinessData").checked = false;
      this.setFieldsDisabled("businessDataSection", true);
    } else {
      // Neither is active
      businessSection.classList.remove("active", "disabled");
      sheetsSection.classList.remove("active", "disabled");
      this.setFieldsDisabled("businessDataSection", false);
      this.setFieldsDisabled("googleSheetsSection", false);
    }
  }

  /**
   * Enable/disable fields in a section
   */
  setFieldsDisabled(sectionId, disabled) {
    const section = document.getElementById(sectionId);
    const inputs = section.querySelectorAll("input, select, textarea");

    inputs.forEach((input) => {
      if (
        input.type !== "checkbox" ||
        (input.id !== "useBusinessData" && input.id !== "useGoogleSheetData")
      ) {
        input.disabled = disabled;
        if (disabled) {
          input.classList.add("disabled");
        } else {
          input.classList.remove("disabled");
        }
      }
    });
  }

  /**
   * Load default values into form
   */
  loadDefaultValues() {
    // Default values are already set in HTML, this method can be extended
    // for more complex default loading logic
    console.log("Default values loaded");
  }

  /**
   * Build complete configuration object from form values
   */
  buildConfigFromForm() {
    return {
      businessData: {
        useBusinessData: document.getElementById("useBusinessData").checked,
        replaceTourData: document.getElementById("replaceTourData").checked,
        includeStandaloneEntries: document.getElementById(
          "businessStandaloneEntries",
        ).checked,
        businessDataFile: document
          .getElementById("businessDataFile")
          .value.trim(),
        businessDataDir: document
          .getElementById("businessDataDir")
          .value.trim(),
        matchField: document.getElementById("matchField").value.trim(),
        businessDataUrl: this.buildBusinessDataUrl(),
      },

      googleSheets: {
        useGoogleSheetData:
          document.getElementById("useGoogleSheetData").checked,
        includeStandaloneEntries: document.getElementById(
          "sheetsStandaloneEntries",
        ).checked,
        useAsDataSource: document.getElementById("useAsDataSource").checked,
        useLocalCSV: document.getElementById("useLocalCSV").checked,
        localCSVFile: document.getElementById("localCSVFile").value.trim(),
        localCSVDir: document.getElementById("localCSVDir").value.trim(),
        localCSVUrl: this.buildLocalCSVUrl(),
        fetchMode: document.getElementById("fetchMode").value,
        csvOptions: {
          header: document.getElementById("csvHeader").checked,
          skipEmptyLines: document.getElementById("csvSkipEmptyLines").checked,
          dynamicTyping: document.getElementById("csvDynamicTyping").checked,
        },
        caching: {
          enabled: document.getElementById("enableCaching").checked,
          timeoutMinutes:
            parseInt(document.getElementById("cacheTimeout").value) || 60,
          storageKey: document.getElementById("cacheStorageKey").value.trim(),
        },
        googleSheetUrl: this.processGoogleSheetUrl(
          document.getElementById("googleSheetUrl")?.value?.trim() || "",
        ),
      },

      thumbnailSettings: {
        enableThumbnails: document.getElementById("enableThumbnails").checked,
        thumbnailSize: document.getElementById("thumbnailSize").value,
        thumbnailSizePx:
          parseInt(document.getElementById("thumbnailSizePx").value) || 120,
        borderRadius:
          parseInt(document.getElementById("thumbnailBorderRadius").value) ||
          100,
        borderColor: document.getElementById("thumbnailBorderColor").value,
        borderWidth:
          parseInt(document.getElementById("thumbnailBorderWidth").value) || 4,
        defaultImagePath: "./search-pro-non-mod/assets/default-thumbnail.jpg",
        defaultImages: this.buildDefaultImages(),
        alignment: document.getElementById("thumbnailAlignment").value,
        groupHeaderAlignment: "left",
        groupHeaderPosition: "top",
        showFor: {
          panorama: document.getElementById("showThumbnailsPanorama").checked,
          hotspot: document.getElementById("showThumbnailsHotspot").checked,
          polygon: document.getElementById("showThumbnailsPolygon").checked,
          video: document.getElementById("showThumbnailsVideo").checked,
          webframe: document.getElementById("showThumbnailsWebframe").checked,
          image: document.getElementById("showThumbnailsImage").checked,
          text: document.getElementById("showThumbnailsText").checked,
          projectedimage: document.getElementById(
            "showThumbnailsProjectedImage",
          ).checked,
          element: document.getElementById("showThumbnailsElement").checked,
          business: document.getElementById("showThumbnailsBusiness").checked,
          "3dmodel": document.getElementById("showThumbnails3DModel").checked,
          "3dhotspot": document.getElementById("showThumbnails3DHotspot")
            .checked,
          "3dmodelobject": document.getElementById(
            "showThumbnails3DModelObject",
          ).checked,
          other: document.getElementById("showThumbnailsOther").checked,
        },
      },

      includeContent: {
        unlabeledWithSubtitles: document.getElementById(
          "unlabeledWithSubtitles",
        ).checked,
        unlabeledWithTags: document.getElementById("unlabeledWithTags").checked,
        completelyBlank: document.getElementById("completelyBlank").checked,
        elements: {
          includePanoramas: document.getElementById("includePanoramas").checked,
          includeHotspots: document.getElementById("includeHotspots").checked,
          includePolygons: document.getElementById("includePolygons").checked,
          includeVideos: document.getElementById("includeVideos").checked,
          includeWebframes: document.getElementById("includeWebframes").checked,
          includeImages: document.getElementById("includeImages").checked,
          includeText: document.getElementById("includeText").checked,
          includeProjectedImages: document.getElementById(
            "includeProjectedImages",
          ).checked,
          include3DHotspots:
            document.getElementById("include3DHotspots").checked,
          include3DModels: document.getElementById("include3DModels").checked,
          include3DModelObjects: document.getElementById(
            "include3DModelObjects",
          ).checked,
          includeBusiness: document.getElementById("includeBusiness").checked,
          skipEmptyLabels: document.getElementById("skipEmptyLabels").checked,
          minLabelLength:
            parseInt(document.getElementById("minLabelLength").value) || 0,
        },
      },

      filter: {
        mode: document.getElementById("filterMode").value,
        allowedValues: this.parseCommaSeparated(
          document.getElementById("allowedValues").value,
        ),
        blacklistedValues: this.parseCommaSeparated(
          document.getElementById("blacklistedValues").value,
        ),
        allowedMediaIndexes: [],
        blacklistedMediaIndexes: [],
        elementTypes: {
          mode: document.getElementById("elementTypeMode").value,
          allowedTypes: this.parseCommaSeparated(
            document.getElementById("allowedTypes").value,
          ),
          blacklistedTypes: this.parseCommaSeparated(
            document.getElementById("blacklistedTypes").value,
          ),
        },
        elementLabels: {
          mode: "none",
          allowedValues: [],
          blacklistedValues: [],
        },
        tagFiltering: {
          mode: document.getElementById("tagFilterMode").value,
          allowedTags: this.parseCommaSeparated(
            document.getElementById("allowedTags").value,
          ),
          blacklistedTags: this.parseCommaSeparated(
            document.getElementById("blacklistedTags").value,
          ),
        },
        uniqueNames: {
          mode: document.getElementById("nameFilterMode").value,
          allowedNames: this.parseCommaSeparated(
            document.getElementById("allowedNames").value,
          ),
          blacklistedNames: this.parseCommaSeparated(
            document.getElementById("blacklistedNames").value,
          ),
        },
      },

      displayLabels: {
        Panorama:
          document.getElementById("labelPanorama").value.trim() || "Panorama",
        Hotspot:
          document.getElementById("labelHotspot").value.trim() || "Hotspot",
        Polygon:
          document.getElementById("labelPolygon").value.trim() || "Polygon",
        Video: document.getElementById("labelVideo").value.trim() || "Video",
        Webframe:
          document.getElementById("labelWebframe").value.trim() || "Webframe",
        Image: document.getElementById("labelImage").value.trim() || "Image",
        Text: document.getElementById("labelText").value.trim() || "Text",
        ProjectedImage:
          document.getElementById("labelProjectedImage").value.trim() ||
          "Projected Image",
        Element:
          document.getElementById("labelElement").value.trim() || "Element",
        Business:
          document.getElementById("labelBusiness").value.trim() || "Business",
        "3DHotspot":
          document.getElementById("label3DHotspot").value.trim() ||
          "3D Hotspot",
        "3DModel":
          document.getElementById("label3DModel").value.trim() || "3D Model",
        "3DModelObject":
          document.getElementById("label3DModelObject").value.trim() ||
          "3D Model Object",
      },

      appearance: {
        searchField: {
          borderRadius: {
            topLeft:
              parseInt(document.getElementById("searchFieldRadius").value) ||
              35,
            topRight:
              parseInt(document.getElementById("searchFieldRadius").value) ||
              35,
            bottomRight:
              parseInt(document.getElementById("searchFieldRadius").value) ||
              35,
            bottomLeft:
              parseInt(document.getElementById("searchFieldRadius").value) ||
              35,
          },
        },
        searchResults: {
          borderRadius: {
            topLeft:
              parseInt(document.getElementById("resultsRadius").value) || 5,
            topRight:
              parseInt(document.getElementById("resultsRadius").value) || 5,
            bottomRight:
              parseInt(document.getElementById("resultsRadius").value) || 5,
            bottomLeft:
              parseInt(document.getElementById("resultsRadius").value) || 5,
          },
        },
        colors: {
          searchBackground: document.getElementById("searchBackground").value,
          searchText: document.getElementById("searchText").value,
          placeholderText: document.getElementById("placeholderText").value,
          searchIcon: document.getElementById("searchIcon").value,
          clearIcon: document.getElementById("clearIconColor").value,
          resultsBackground: document.getElementById("resultsBackground").value,
          groupHeaderColor: document.getElementById("groupHeaderColor").value,
          groupCountColor:
            document.getElementById("groupCountColor")?.value || "#94a3b8",
          resultHover: document.getElementById("resultHover").value,
          resultBorderLeft:
            document.getElementById("resultBorderLeft")?.value || "#ebebeb",
          resultText: document.getElementById("resultText").value,
          resultSubtitle:
            document.getElementById("resultSubtitle")?.value || "#64748b",
          resultIconColor:
            document.getElementById("resultIconColor")?.value || "#6e85f7",
          resultSubtextColor:
            document.getElementById("resultSubtextColor").value,
          tagBackground: document.getElementById("tagBackground").value,
          tagText: document.getElementById("tagText").value,
          tagBorder: document.getElementById("tagBorder").value,
        },
        tags: {
          borderRadius:
            parseInt(document.getElementById("tagRadius").value) || 16,
          fontSize: document.getElementById("tagFontSize").value,
          padding: "3px 10px",
          margin: "2px",
          fontWeight: "600",
          textTransform: document.getElementById("tagTextTransform").value,
          showBorder: document.getElementById("showTagBorder").checked,
          borderWidth: "1px",
        },
      },

      searchBar: {
        placeholder: document.getElementById("searchPlaceholder").value.trim(),
        width: parseInt(document.getElementById("searchWidth").value) || 350,
        position: {
          top: parseInt(document.getElementById("positionTop").value) || 70,
          right: parseInt(document.getElementById("positionRight").value) || 70,
          left: null,
          bottom: null,
        },
        useResponsive: document.getElementById("useResponsive").checked,
        mobilePosition: {
          top: parseInt(document.getElementById("mobileTop").value) || 60,
          left: parseInt(document.getElementById("mobileLeft").value) || 20,
          right: parseInt(document.getElementById("mobileRight").value) || 20,
          bottom: "auto",
        },
        mobileOverrides: {
          enabled: true,
          breakpoint:
            parseInt(document.getElementById("mobileBreakpoint").value) || 768,
          width: document.getElementById("mobileWidth").value || "90%",
          maxWidth: 350,
          visibility: {
            behavior:
              document.getElementById("mobileVisibilityBehavior").value ||
              "dynamic",
            showOnScroll: false,
            hideThreshold: 100,
          },
          focusMode: document.getElementById("mobileFocusMode").checked,
          fullScreenResults:
            document.getElementById("fullScreenResults").checked,
        },
      },

      display: {
        showGroupHeaders: document.getElementById("showGroupHeaders").checked,
        showGroupCount: document.getElementById("showGroupCount").checked,
        showIconsInResults:
          document.getElementById("showIconsInResults").checked,
        onlySubtitles: document.getElementById("onlySubtitles").checked,
        showSubtitlesInResults: document.getElementById(
          "showSubtitlesInResults",
        ).checked,
        showParentLabel: document.getElementById("showParentLabel").checked,
        showParentInfo: document.getElementById("showParentInfo").checked,
        showParentTags: document.getElementById("showParentTags").checked,
        showParentType: document.getElementById("showParentType").checked,
      },

      useAsLabel: {
        subtitles: document.getElementById("useSubtitles").checked,
        tags: document.getElementById("useTags").checked,
        elementType: document.getElementById("useElementType").checked,
        parentWithType: false,
        customText:
          document.getElementById("customText").value || "[Unnamed Item]",
      },

      autoHide: {
        mobile: document.getElementById("autoHideMobile").checked,
        desktop: document.getElementById("autoHideDesktop").checked,
      },

      mobileBreakpoint:
        parseInt(document.getElementById("mobileBreakpoint").value) || 768,
      minSearchChars:
        parseInt(document.getElementById("minSearchChars").value) || 2,
      showTagsInResults: document.getElementById("showTagsInResults").checked,

      elementTriggering: {
        initialDelay:
          parseInt(document.getElementById("initialDelay").value) || 300,
        maxRetries: parseInt(document.getElementById("maxRetries").value) || 3,
        retryInterval:
          parseInt(document.getElementById("retryInterval").value) || 300,
        maxRetryInterval:
          parseInt(document.getElementById("maxRetryInterval").value) || 1000,
        baseRetryInterval:
          parseInt(document.getElementById("baseRetryInterval").value) || 300,
      },

      animations: {
        enabled: document.getElementById("enableAnimations")?.checked || false,
        duration: { fast: 150, normal: 250, slow: 400 },
        easing: "ease-out",
        searchBar: { openDuration: 300, closeDuration: 200, scaleEffect: true },
        results: { fadeInDuration: 200, slideDistance: 8, staggerDelay: 30 },
        reducedMotion: { respectPreference: false, fallbackDuration: 80 },
      },

      searchSettings: {
        fieldWeights: {
          label:
            parseFloat(document.getElementById("labelWeight").value) || 1.0,
          businessName:
            parseFloat(document.getElementById("businessNameWeight").value) ||
            0.9,
          subtitle:
            parseFloat(document.getElementById("subtitleWeight").value) || 0.8,
          businessTag:
            parseFloat(document.getElementById("businessTagWeight").value) ||
            1.0,
          tags: parseFloat(document.getElementById("tagsWeight").value) || 0.6,
          parentLabel:
            parseFloat(document.getElementById("parentLabelWeight").value) ||
            0.3,
        },
        behavior: {
          threshold:
            parseFloat(document.getElementById("searchThreshold").value) || 0.4,
          distance:
            parseInt(document.getElementById("searchDistance").value) || 40,
          minMatchCharLength:
            parseInt(document.getElementById("minMatchCharLength").value) || 1,
          useExtendedSearch:
            document.getElementById("useExtendedSearch").checked,
          ignoreLocation: document.getElementById("ignoreLocation").checked,
          location:
            parseInt(document.getElementById("searchLocation").value) || 0,
          includeScore: document.getElementById("includeScore").checked,
        },
        boostValues: {
          businessMatch:
            parseFloat(document.getElementById("businessMatchBoost").value) ||
            2.0,
          sheetsMatch:
            parseFloat(document.getElementById("sheetsMatchBoost").value) ||
            2.5,
          labeledItem:
            parseFloat(document.getElementById("labeledItemBoost").value) ||
            1.5,
          unlabeledItem:
            parseFloat(document.getElementById("unlabeledItemBoost").value) ||
            1.0,
          childElement:
            parseFloat(document.getElementById("childElementBoost").value) ||
            0.8,
        },
      },

      // Update elementTriggering with the baseRetryInterval field
      elementTriggering: {
        initialDelay:
          parseInt(document.getElementById("initialDelay")?.value) || 300,
        maxRetries: parseInt(document.getElementById("maxRetries")?.value) || 3,
        retryInterval:
          parseInt(document.getElementById("retryInterval")?.value) || 300,
        maxRetryInterval:
          parseInt(document.getElementById("maxRetryInterval")?.value) || 1000,
        baseRetryInterval:
          parseInt(document.getElementById("baseRetryInterval")?.value) || 300,
      },

      // Update animations with detailed settings
      animations: {
        enabled: document.getElementById("enableAnimations").checked,
        duration: {
          fast:
            parseInt(document.getElementById("animationFastDuration").value) ||
            150,
          normal:
            parseInt(
              document.getElementById("animationNormalDuration").value,
            ) || 250,
          slow:
            parseInt(document.getElementById("animationSlowDuration").value) ||
            400,
        },
        easing: document.getElementById("animationEasing").value,
        searchBar: {
          openDuration:
            parseInt(document.getElementById("animationOpenDuration").value) ||
            300,
          closeDuration:
            parseInt(document.getElementById("animationCloseDuration").value) ||
            200,
          scaleEffect: document.getElementById("searchBarScaleEffect").checked,
        },
        results: {
          fadeInDuration:
            parseInt(document.getElementById("resultsFadeInDuration").value) ||
            200,
          slideDistance:
            parseInt(document.getElementById("resultsSlideDistance").value) ||
            8,
          staggerDelay:
            parseInt(document.getElementById("resultsStaggerDelay").value) ||
            30,
        },
        reducedMotion: {
          respectPreference: document.getElementById("respectReducedMotion")
            .checked,
          fallbackDuration:
            parseInt(document.getElementById("reducedMotionFallback").value) ||
            80,
        },
      },

      // Update useAsLabel with parentWithType
      useAsLabel: {
        subtitles: document.getElementById("useSubtitles").checked,
        tags: document.getElementById("useTags").checked,
        elementType: document.getElementById("useElementType").checked,
        parentWithType: document.getElementById("parentWithType").checked,
        customText:
          document.getElementById("customText").value || "[Unnamed Item]",
      },

      // Add global settings
      showTagsInResults: document.getElementById("showTagsInResults").checked,
    };
  }

  /**
   * Helper methods for building config sections
   */
  buildBusinessDataUrl() {
    const dir = document.getElementById("businessDataDir").value.trim();
    const file = document.getElementById("businessDataFile").value.trim();
    if (!dir || !file) return "";

    return `${window.location.origin}${window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/"))}/search-pro-non-mod/${dir}/${file}`;
  }

  buildLocalCSVUrl() {
    const dir = document.getElementById("localCSVDir").value.trim();
    const file = document.getElementById("localCSVFile").value.trim();
    if (!dir || !file) return "";

    return `${window.location.origin}${window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/"))}/search-pro-non-mod/${dir}/${file}`;
  }

  processGoogleSheetUrl(url) {
    if (!url) return "";

    // Convert share URL to CSV export URL if needed
    if (url.includes("/edit") && !url.includes("/export")) {
      return url
        .replace("/edit#gid=0", "/export?format=csv")
        .replace("/edit", "/export?format=csv");
    }

    return url;
  }

  buildDefaultImages() {
    const basePath = "./search-pro-non-mod/assets/";
    return {
      Panorama: `${basePath}default-thumbnail.jpg`,
      Hotspot: `${basePath}hotspot-default.jpg`,
      Polygon: `${basePath}polygon-default.jpg`,
      Video: `${basePath}video-default.jpg`,
      Webframe: `${basePath}webframe-default.jpg`,
      Image: `${basePath}image-default.jpg`,
      Text: `${basePath}text-default.jpg`,
      ProjectedImage: `${basePath}projected-image-default.jpg`,
      Element: `${basePath}element-default.jpg`,
      Business: `${basePath}business-default.jpg`,
      "3DModel": `${basePath}3d-model-default.jpg`,
      "3DHotspot": `${basePath}3d-hotspot-default.jpg`,
      "3DModelObject": `${basePath}3d-model-object-default.jpg`,
      default: `${basePath}default-thumbnail.jpg`,
    };
  }

  buildThumbnailShowFor() {
    return {
      panorama: document.getElementById("includePanoramas").checked,
      hotspot: document.getElementById("includeHotspots").checked,
      polygon: document.getElementById("includePolygons").checked,
      video: document.getElementById("includeVideos").checked,
      webframe: document.getElementById("includeWebframes").checked,
      image: document.getElementById("includeImages").checked,
      text: document.getElementById("includeText").checked,
      projectedImage: document.getElementById("includeProjectedImages").checked,
      element: true,
      business: document.getElementById("includeBusiness").checked,
      "3dmodel": document.getElementById("include3DModels").checked,
      "3dhotspot": document.getElementById("include3DHotspots").checked,
      "3dmodelobject": document.getElementById("include3DModelObjects").checked,
      other: true,
    };
  }

  buildAnimationDuration() {
    const selected = document.getElementById("animationDuration").value;
    switch (selected) {
      case "fast":
        return { fast: 150, normal: 150, slow: 150 };
      case "slow":
        return { fast: 400, normal: 400, slow: 400 };
      default:
        return { fast: 150, normal: 250, slow: 400 };
    }
  }

  parseCommaSeparated(value) {
    if (!value || typeof value !== "string") return [];
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  /**
   * Validate configuration before applying/saving
   */
  validateConfig(config) {
    const errors = [];

    // Validate URLs
    if (
      config.googleSheets.useGoogleSheetData &&
      config.googleSheets.googleSheetUrl
    ) {
      try {
        new URL(config.googleSheets.googleSheetUrl);
      } catch {
        errors.push("Invalid Google Sheets URL format");
      }
    }

    // Validate numeric ranges
    if (
      config.searchSettings.behavior.threshold < 0 ||
      config.searchSettings.behavior.threshold > 1
    ) {
      errors.push("Search threshold must be between 0 and 1");
    }

    if (
      config.searchSettings.behavior.distance < 10 ||
      config.searchSettings.behavior.distance > 100
    ) {
      errors.push("Search distance must be between 10 and 100");
    }

    // Validate required fields
    if (
      config.businessData.useBusinessData &&
      !config.businessData.businessDataFile
    ) {
      errors.push(
        "Business data file is required when business data is enabled",
      );
    }

    if (config.googleSheets.useLocalCSV && !config.googleSheets.localCSVFile) {
      errors.push("Local CSV file is required when local CSV is enabled");
    }

    return errors;
  }

  /**
   * Apply settings to tour (live preview)
   */
  applyToTour() {
    try {
      const config = this.buildConfigFromForm();
      const errors = this.validateConfig(config);

      if (errors.length > 0) {
        this.showStatus(`Validation errors: ${errors.join(", ")}`, "error");
        return;
      }

      // Store in localStorage for tour to pick up
      localStorage.setItem("searchProLiveConfig", JSON.stringify(config));

      this.showStatus(
        "Settings applied to tour! Refresh your tour page to see changes.",
        "success",
      );

      console.log("Applied configuration:", config);
    } catch (error) {
      console.error("Error applying settings:", error);
      this.showStatus(
        "Error applying settings. Check console for details.",
        "error",
      );
    }
  }

  /**
   * Generate and download configuration file
   */
  downloadConfig() {
    try {
      const config = this.buildConfigFromForm();
      const errors = this.validateConfig(config);

      if (errors.length > 0) {
        this.showStatus(`Validation errors: ${errors.join(", ")}`, "error");
        return;
      }

      const configFile = this.generateConfigFile(config);
      this.downloadFile(configFile, "search-pro-config.js");

      this.showStatus("Configuration file downloaded successfully!", "success");
    } catch (error) {
      console.error("Error generating config:", error);
      this.showStatus(
        "Error generating configuration file. Check console for details.",
        "error",
      );
    }
  }

  /**
   * Generate the complete configuration file content
   */
  generateConfigFile(config) {
    const timestamp = new Date().toISOString();

    return `// Search Pro Configuration
// Generated by Search Pro Control Panel on ${timestamp}
// This file contains your complete search system configuration

window.searchProConfig = ${JSON.stringify(config, null, 2)};

// Auto-application logic with robust error handling
(function() {
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds total
    
    function applyConfig() {
        attempts++;
        
        if (window.searchFunctions && window.searchFunctions.updateConfig) {
            try {
                window.searchFunctions.updateConfig(window.searchProConfig);
                console.log('[Search Pro] Configuration applied successfully from generated config file');
                console.log('[Search Pro] Applied config:', window.searchProConfig);
                return true;
            } catch (error) {
                console.error('[Search Pro] Error applying config:', error);
                return false;
            }
        }
        
        if (attempts >= maxAttempts) {
            console.warn('[Search Pro] Max attempts reached. Search functions may not be available yet.');
            return false;
        }
        
        return false;
    }
    
    // Try immediate application
    if (applyConfig()) {
        return;
    }
    
    // DOM ready application
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(() => {
                if (!applyConfig()) {
                    // Retry with interval
                    const interval = setInterval(() => {
                        if (applyConfig() || attempts >= maxAttempts) {
                            clearInterval(interval);
                        }
                    }, 500);
                }
            }, 500);
        });
    } else {
        // Document already ready, start retry loop
        const interval = setInterval(() => {
            if (applyConfig() || attempts >= maxAttempts) {
                clearInterval(interval);
            }
        }, 500);
    }
})();

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.searchProConfig;
}`;
  }

  /**
   * Download file helper
   */
  downloadFile(content, filename) {
    const blob = new Blob([content], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Load configuration from file
   */
  loadConfig() {
    document.getElementById("fileInput").click();
  }

  /**
   * Handle file loading
   */
  handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let content = e.target.result;

        // Extract config object from JavaScript file
        if (file.name.endsWith(".js")) {
          // Try to extract the config object
          const configMatch = content.match(
            /window\.searchProConfig\s*=\s*({[\s\S]*?});/,
          );
          if (configMatch) {
            content = configMatch[1];
          } else {
            throw new Error(
              "Could not find searchProConfig in JavaScript file",
            );
          }
        }

        const config = JSON.parse(content);
        this.populateFormFromConfig(config);
        this.showStatus("Configuration loaded successfully!", "success");

        // Reset file input
        event.target.value = "";
      } catch (error) {
        console.error("Error loading config:", error);
        this.showStatus(
          "Error loading configuration file. Please check the file format.",
          "error",
        );
        event.target.value = "";
      }
    };

    reader.readAsText(file);
  }

  /**
   * Populate form from configuration object
   */
  populateFormFromConfig(config) {
    try {
      // Business Data
      if (config.businessData) {
        this.setCheckbox(
          "useBusinessData",
          config.businessData.useBusinessData,
        );
        this.setCheckbox(
          "replaceTourData",
          config.businessData.replaceTourData,
        );
        this.setCheckbox(
          "includeStandaloneEntries",
          config.businessData.includeStandaloneEntries,
        );
        this.setValue("businessDataFile", config.businessData.businessDataFile);
        this.setValue("businessDataDir", config.businessData.businessDataDir);
        this.setValue("matchField", config.businessData.matchField);
      }

      // Google Sheets
      if (config.googleSheets) {
        this.setCheckbox(
          "useGoogleSheetData",
          config.googleSheets.useGoogleSheetData,
        );
        this.setCheckbox(
          "useAsDataSource",
          config.googleSheets.useAsDataSource,
        );
        this.setCheckbox(
          "sheetsStandaloneEntries",
          config.googleSheets.includeStandaloneEntries,
        );
        this.setValue("googleSheetUrl", config.googleSheets.googleSheetUrl);
        this.setCheckbox("useLocalCSV", config.googleSheets.useLocalCSV);
        this.setValue("localCSVFile", config.googleSheets.localCSVFile);
        this.setValue("localCSVDir", config.googleSheets.localCSVDir);
        this.setValue(
          "cacheStorageKey",
          config.googleSheets.caching.storageKey,
        );

        if (config.googleSheets.caching) {
          this.setCheckbox(
            "enableCaching",
            config.googleSheets.caching.enabled,
          );
          this.setValue(
            "cacheTimeout",
            config.googleSheets.caching.timeoutMinutes,
          );
        }
      }

      // Search Bar
      if (config.searchBar) {
        this.setValue("placeholder", config.searchBar.placeholder);
        this.setValue("searchWidth", config.searchBar.width);
        this.setCheckbox("useResponsive", config.searchBar.useResponsive);

        if (config.searchBar.position) {
          this.setValue("positionTop", config.searchBar.position.top);
          this.setValue("positionRight", config.searchBar.position.right);
        }

        if (config.searchBar.mobileOverrides) {
          this.setCheckbox(
            "mobileFocusMode",
            config.searchBar.mobileOverrides.focusMode,
          );
        }
      }

      // Appearance
      if (config.appearance) {
        if (config.appearance.colors) {
          this.setValue(
            "searchBackground",
            config.appearance.colors.searchBackground,
          );
          this.setValue("searchText", config.appearance.colors.searchText);
          this.setValue(
            "placeholderText",
            config.appearance.colors.placeholderText,
          );
          this.setValue("searchIcon", config.appearance.colors.searchIcon);
          this.setValue(
            "resultsBackground",
            config.appearance.colors.resultsBackground,
          );
          this.setValue("resultHover", config.appearance.colors.resultHover);
          this.setValue(
            "groupHeaderColor",
            config.appearance.colors.groupHeaderColor,
          );
          this.setValue("resultText", config.appearance.colors.resultText);
          this.setValue(
            "tagBackground",
            config.appearance.colors.tagBackground,
          );
          this.setValue("tagText", config.appearance.colors.tagText);
          this.setValue("tagBorder", config.appearance.colors.tagBorder);
        }

        if (
          config.appearance.searchField &&
          config.appearance.searchField.borderRadius
        ) {
          this.setValue(
            "searchFieldRadius",
            config.appearance.searchField.borderRadius.topLeft,
          );
        }

        if (
          config.appearance.searchResults &&
          config.appearance.searchResults.borderRadius
        ) {
          this.setValue(
            "resultsRadius",
            config.appearance.searchResults.borderRadius.topLeft,
          );
        }

        if (config.appearance.tags) {
          this.setValue("tagRadius", config.appearance.tags.borderRadius);
          this.setValue("tagFontSize", config.appearance.tags.fontSize);
          this.setValue(
            "tagTextTransform",
            config.appearance.tags.textTransform,
          );
          this.setCheckbox("showTagBorder", config.appearance.tags.showBorder);
        }
      }

      // Thumbnails
      if (config.thumbnailSettings) {
        this.setCheckbox(
          "enableThumbnails",
          config.thumbnailSettings.enableThumbnails,
        );
        this.setValue("thumbnailSize", config.thumbnailSettings.thumbnailSize);
        this.setValue(
          "thumbnailSizePx",
          config.thumbnailSettings.thumbnailSizePx,
        );
        this.setValue(
          "thumbnailBorderRadius",
          config.thumbnailSettings.borderRadius,
        );
        this.setValue(
          "thumbnailBorderColor",
          config.thumbnailSettings.borderColor,
        );
        this.setValue(
          "thumbnailBorderWidth",
          config.thumbnailSettings.borderWidth,
        );
        this.setValue("thumbnailAlignment", config.thumbnailSettings.alignment);
      }

      // Display settings
      if (config.display) {
        this.setCheckbox("showGroupHeaders", config.display.showGroupHeaders);
        this.setCheckbox("showGroupCount", config.display.showGroupCount);
        this.setCheckbox(
          "showIconsInResults",
          config.display.showIconsInResults,
        );
        this.setCheckbox("onlySubtitles", config.display.onlySubtitles);
        this.setCheckbox(
          "showSubtitlesInResults",
          config.display.showSubtitlesInResults,
        );
        this.setCheckbox("showParentLabel", config.display.showParentLabel);
        this.setCheckbox("showParentInfo", config.display.showParentInfo);
        this.setCheckbox("showParentTags", config.display.showParentTags);
        this.setCheckbox("showParentType", config.display.showParentType);
      }

      // Include Content
      if (config.includeContent) {
        this.setCheckbox(
          "unlabeledWithSubtitles",
          config.includeContent.unlabeledWithSubtitles,
        );
        this.setCheckbox(
          "unlabeledWithTags",
          config.includeContent.unlabeledWithTags,
        );
        this.setCheckbox(
          "completelyBlank",
          config.includeContent.completelyBlank,
        );

        if (config.includeContent.elements) {
          this.setCheckbox(
            "includePanoramas",
            config.includeContent.elements.includePanoramas,
          );
          this.setCheckbox(
            "includeHotspots",
            config.includeContent.elements.includeHotspots,
          );
          this.setCheckbox(
            "includePolygons",
            config.includeContent.elements.includePolygons,
          );
          this.setCheckbox(
            "includeVideos",
            config.includeContent.elements.includeVideos,
          );
          this.setCheckbox(
            "includeWebframes",
            config.includeContent.elements.includeWebframes,
          );
          this.setCheckbox(
            "includeImages",
            config.includeContent.elements.includeImages,
          );
          this.setCheckbox(
            "includeText",
            config.includeContent.elements.includeText,
          );
          this.setCheckbox(
            "includeProjectedImages",
            config.includeContent.elements.includeProjectedImages,
          );
          this.setCheckbox(
            "include3DHotspots",
            config.includeContent.elements.include3DHotspots,
          );
          this.setCheckbox(
            "include3DModels",
            config.includeContent.elements.include3DModels,
          );
          this.setCheckbox(
            "include3DModelObjects",
            config.includeContent.elements.include3DModelObjects,
          );
          this.setCheckbox(
            "includeBusiness",
            config.includeContent.elements.includeBusiness,
          );
          this.setCheckbox(
            "skipEmptyLabels",
            config.includeContent.elements.skipEmptyLabels,
          );
          this.setValue(
            "minLabelLength",
            config.includeContent.elements.minLabelLength,
          );
        }
      }

      // Use as Label
      if (config.useAsLabel) {
        this.setCheckbox("useSubtitles", config.useAsLabel.subtitles);
        this.setCheckbox("useTags", config.useAsLabel.tags);
        this.setCheckbox("useElementType", config.useAsLabel.elementType);
        this.setValue("customText", config.useAsLabel.customText);
      }

      // Auto Hide
      if (config.autoHide) {
        this.setCheckbox("autoHideMobile", config.autoHide.mobile);
        this.setCheckbox("autoHideDesktop", config.autoHide.desktop);
      }

      // General settings
      this.setValue("mobileBreakpoint", config.mobileBreakpoint);
      this.setValue("minSearchChars", config.minSearchChars);
      this.setCheckbox("showTagsInResults", config.showTagsInResults);

      // Element Triggering
      if (config.elementTriggering) {
        this.setValue("initialDelay", config.elementTriggering.initialDelay);
        this.setValue("maxRetries", config.elementTriggering.maxRetries);
        this.setValue("retryInterval", config.elementTriggering.retryInterval);
        this.setValue(
          "baseRetryInterval",
          config.elementTriggering.baseRetryInterval,
        );
        this.setValue(
          "maxRetryInterval",
          config.elementTriggering.maxRetryInterval,
        );
      }

      // Animations
      if (config.animations) {
        this.setCheckbox("enableAnimations", config.animations.enabled);
        this.setValue("animationEasing", config.animations.easing);

        if (config.animations.reducedMotion) {
          this.setCheckbox(
            "respectReducedMotion",
            config.animations.reducedMotion.respectPreference,
          );
        }
      }

      // Display Labels
      if (config.displayLabels) {
        this.setValue("labelPanorama", config.displayLabels.Panorama);
        this.setValue("labelHotspot", config.displayLabels.Hotspot);
        this.setValue("labelPolygon", config.displayLabels.Polygon);
        this.setValue("labelVideo", config.displayLabels.Video);
        this.setValue("labelWebframe", config.displayLabels.Webframe);
        this.setValue("labelImage", config.displayLabels.Image);
        this.setValue("labelText", config.displayLabels.Text);
        this.setValue(
          "labelProjectedImage",
          config.displayLabels.ProjectedImage,
        );
        this.setValue("labelElement", config.displayLabels.Element);
        this.setValue("labelBusiness", config.displayLabels.Business);
        this.setValue("label3DHotspot", config.displayLabels["3DHotspot"]);
        this.setValue("label3DModel", config.displayLabels["3DModel"]);
        this.setValue(
          "label3DModelObject",
          config.displayLabels["3DModelObject"],
        );
      }

      // Search Settings
      if (config.searchSettings) {
        if (config.searchSettings.fieldWeights) {
          this.setValue(
            "businessTagWeight",
            config.searchSettings.fieldWeights.businessTag,
          );
        }
        if (config.searchSettings.behavior) {
          this.setValue(
            "minMatchCharLength",
            config.searchSettings.behavior.minMatchCharLength,
          );
          this.setValue(
            "searchLocation",
            config.searchSettings.behavior.location,
          );
          this.setCheckbox(
            "includeScore",
            config.searchSettings.behavior.includeScore,
          );
        }
        if (config.searchSettings.boostValues) {
          this.setValue(
            "businessMatchBoost",
            config.searchSettings.boostValues.businessMatch,
          );
          this.setValue(
            "sheetsMatchBoost",
            config.searchSettings.boostValues.sheetsMatch,
          );
          this.setValue(
            "labeledItemBoost",
            config.searchSettings.boostValues.labeledItem,
          );
          this.setValue(
            "unlabeledItemBoost",
            config.searchSettings.boostValues.unlabeledItem,
          );
          this.setValue(
            "childElementBoost",
            config.searchSettings.boostValues.childElement,
          );
        }
      }

      // Filtering
      if (config.filter) {
        this.setValue("filterMode", config.filter.mode);
        this.setValue("allowedValues", config.filter.allowedValues.join(", "));
        this.setValue(
          "blacklistedValues",
          config.filter.blacklistedValues.join(", "),
        );

        if (config.filter.elementTypes) {
          this.setValue("elementTypeMode", config.filter.elementTypes.mode);
          this.setValue(
            "allowedTypes",
            config.filter.elementTypes.allowedTypes.join(", "),
          );
          this.setValue(
            "blacklistedTypes",
            config.filter.elementTypes.blacklistedTypes.join(", "),
          );
        }

        if (config.filter.tagFiltering) {
          this.setValue("tagFilterMode", config.filter.tagFiltering.mode);
          this.setValue(
            "allowedTags",
            config.filter.tagFiltering.allowedTags.join(", "),
          );
          this.setValue(
            "blacklistedTags",
            config.filter.tagFiltering.blacklistedTags.join(", "),
          );
        }

        if (config.filter.uniqueNames) {
          this.setValue("nameFilterMode", config.filter.uniqueNames.mode);
          this.setValue(
            "allowedNames",
            config.filter.uniqueNames.allowedNames.join(", "),
          );
          this.setValue(
            "blacklistedNames",
            config.filter.uniqueNames.blacklistedNames.join(", "),
          );
        }
      }

      // Update data source toggles
      this.handleDataSourceToggle();

      // Update range value displays
      this.updateRangeDisplays();
    } catch (error) {
      console.error("Error populating form:", error);
      throw error;
    }
  }

  /**
   * Helper methods for form population
   */
  setValue(id, value) {
    const element = document.getElementById(id);
    if (element && value !== undefined && value !== null) {
      element.value = value;
    }
  }

  setCheckbox(id, checked) {
    const element = document.getElementById(id);
    if (element && typeof checked === "boolean") {
      element.checked = checked;
    }
  }

  updateRangeDisplays() {
    const ranges = [
      { id: "searchThreshold", displayId: "thresholdValue" },
      { id: "labelWeight", displayId: "labelWeightValue" },
      { id: "subtitleWeight", displayId: "subtitleWeightValue" },
      { id: "tagsWeight", displayId: "tagsWeightValue" },
      { id: "businessNameWeight", displayId: "businessNameWeightValue" },
      { id: "businessTagWeight", displayId: "businessTagWeightValue" },
      { id: "parentLabelWeight", displayId: "parentLabelWeightValue" },
      { id: "businessMatchBoost", displayId: "businessMatchBoostValue" },
      { id: "sheetsMatchBoost", displayId: "sheetsMatchBoostValue" },
      { id: "labeledItemBoost", displayId: "labeledItemBoostValue" },
      { id: "childElementBoost", displayId: "childElementBoostValue" },
    ];

    ranges.forEach((range) => {
      const input = document.getElementById(range.id);
      const display = document.getElementById(range.displayId);

      if (input && display) {
        display.textContent = input.value;
      }
    });
  }

  /**
   * Reset all settings to defaults
   */
  showResetModal() {
    document.getElementById("resetModal").classList.add("active");
  }

  hideResetModal() {
    document.getElementById("resetModal").classList.remove("active");
  }

  resetToDefaults() {
    // Reset all form controls to their default values
    const form = document.querySelector(".container");
    const inputs = form.querySelectorAll("input, select, textarea");

    inputs.forEach((input) => {
      if (input.type === "checkbox") {
        // Set default checked states
        const defaultChecked = this.getDefaultCheckedState(input.id);
        input.checked = defaultChecked;
      } else if (input.type === "color") {
        // Set default colors
        const defaultColor = this.getDefaultColor(input.id);
        input.value = defaultColor;
      } else if (input.type === "number" || input.type === "range") {
        // Set default numbers
        const defaultValue = this.getDefaultNumber(input.id);
        input.value = defaultValue;
      } else if (input.tagName === "SELECT") {
        // Set default select values
        const defaultValue = this.getDefaultSelect(input.id);
        input.value = defaultValue;
      } else {
        // Set default text values
        const defaultValue = this.getDefaultText(input.id);
        input.value = defaultValue;
      }
    });

    // Update data source toggles
    this.handleDataSourceToggle();

    // Update range displays
    this.updateRangeDisplays();

    this.hideResetModal();
    this.showStatus("All settings have been reset to default values.", "info");
  }

  /**
   * Default value getters
   */
  getDefaultCheckedState(id) {
    const defaults = {
      // Most checkboxes default to true (enabled)
      useBusinessData: false,
      replaceTourData: false,
      includeStandaloneEntries: false,
      useGoogleSheetData: false,
      useLocalCSV: false,
      enableCaching: false,
      autoHideMobile: false,
      autoHideDesktop: false,
      mobileFocusMode: false,
      onlySubtitles: false,
      useElementType: false,
      skipEmptyLabels: false,
      // All others default to true
    };

    return defaults.hasOwnProperty(id) ? defaults[id] : true;
  }

  getDefaultColor(id) {
    const defaults = {
      searchBackground: "#f4f3f2",
      searchText: "#1a1a1a",
      placeholderText: "#94a3b8",
      searchIcon: "#94a3b8",
      resultsBackground: "#ffffff",
      resultHover: "#f0f0f0",
      groupHeaderColor: "#20293A",
      resultText: "#1e293b",
      tagBackground: "#e0f2fe",
      tagText: "#0369a1",
      tagBorder: "#0891b2",
      thumbnailBorderColor: "#F9D849",
      groupCountColor: "#94a3b8",
      resultSubtitle: "#64748b",
      resultIconColor: "#6e85f7",
      resultBorderLeft: "#ebebeb",
    };

    return defaults[id] || "#000000";
  }

  getDefaultNumber(id) {
    const defaults = {
      searchWidth: 350,
      minSearchChars: 2,
      mobileBreakpoint: 768,
      positionTop: 70,
      positionRight: 70,
      cacheTimeout: 60,
      searchFieldRadius: 35,
      resultsRadius: 5,
      tagRadius: 16,
      thumbnailSizePx: 120,
      thumbnailBorderRadius: 100,
      thumbnailBorderWidth: 4,
      minLabelLength: 0,
      searchThreshold: 0.4,
      searchDistance: 40,
      labelWeight: 1.0,
      subtitleWeight: 0.8,
      tagsWeight: 0.6,
      businessNameWeight: 0.9,
      initialDelay: 300,
      maxRetries: 3,
      retryInterval: 300,
      maxRetryInterval: 1000,
      minMatchCharLength: 1,
      businessMatchBoost: 2.0,
      sheetsMatchBoost: 2.5,
      labeledItemBoost: 1.5,
      childElementBoost: 0.8,
    };

    return defaults[id] || 0;
  }

  getDefaultSelect(id) {
    const defaults = {
      thumbnailSize: "medium",
      thumbnailAlignment: "left",
      tagFontSize: "11px",
      tagTextTransform: "uppercase",
      filterMode: "none",
      elementTypeMode: "none",
      tagFilterMode: "none",
      nameFilterMode: "none",
      animationDuration: "normal",
      animationEasing: "ease-out",
    };

    return defaults[id] || "";
  }

  getDefaultText(id) {
    const defaults = {
      placeholder: "Search... Type * for all",
      businessDataFile: "business.json",
      businessDataDir: "business-data",
      matchField: "id",
      localCSVFile: "search-data.csv",
      localCSVDir: "business-data",
      customText: "[Unnamed Item]",
      allowedValues: "",
      blacklistedValues: "",
      allowedTypes: "",
      blacklistedTypes: "",
      allowedTags: "",
      blacklistedTags: "",
      allowedNames: "",
      blacklistedNames: "",
      googleSheetUrl: "",
    };

    return defaults[id] || "";
  }

  /**
   * Show status message with improved styling and auto-hide
   */
  showStatus(message, type = "info") {
    const statusEl = document.getElementById("statusMessage");
    const statusText = document.getElementById("statusText");

    if (!statusEl || !statusText) {
      console.warn("Status elements not found, using console log:", message);
      console.log(`[${type.toUpperCase()}] ${message}`);
      return;
    }

    statusText.textContent = message;
    statusEl.className = `status-message status-message--${type}`;
    statusEl.style.display = "flex";

    // Add animation class
    statusEl.style.animation = "slideInDown 0.3s ease-out";

    // Auto-hide timing based on message type and length
    let timeout;
    switch (type) {
      case "error":
        timeout = Math.max(8000, message.length * 50); // Longer for errors
        break;
      case "warning":
        timeout = 6000;
        break;
      case "success":
        timeout = 4000;
        break;
      default:
        timeout = 5000;
    }

    setTimeout(() => {
      if (statusEl.style.display !== "none") {
        statusEl.style.animation = "slideOutUp 0.3s ease-out";
        setTimeout(() => {
          statusEl.style.display = "none";
        }, 300);
      }
    }, timeout);
  }
}

// Initialize with better error handling and DOM ready check
function initializeControlPanel() {
  try {
    window.searchProControlPanel = new SearchProControlPanel();
  } catch (error) {
    console.error("Failed to initialize Search Pro Control Panel:", error);

    // Show error in a basic alert if status system isn't available
    const errorMsg = `Failed to initialize control panel: ${error.message}`;

    // Try to show in status, fallback to alert
    const statusEl = document.getElementById("statusMessage");
    if (statusEl) {
      const statusText = document.getElementById("statusText");
      if (statusText) {
        statusText.textContent = errorMsg;
        statusEl.className = "status-message status-message--error";
        statusEl.style.display = "flex";
      }
    } else {
      alert(errorMsg);
    }
  }
}

// Multiple initialization strategies for better compatibility
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeControlPanel);
} else if (
  document.readyState === "interactive" ||
  document.readyState === "complete"
) {
  initializeControlPanel();
} else {
  // Fallback for edge cases
  window.addEventListener("load", initializeControlPanel);
}
