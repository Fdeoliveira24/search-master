/**
 * dom-handler.js - DOM manipulation for Search Pro
 * Handles element creation, styling, and manipulation
 */
window.SearchProModules = window.SearchProModules || {};

window.SearchProModules.DOMHandler = (function () {
  // [1.0] DEPENDENCIES
  const Utils = window.SearchProModules.Utils || {};
  const Logger = Utils.Logger || console;
  const ARIA = Utils.ARIA || {};

  // [2.0] MARKUP TEMPLATES
  // [2.1] Define search markup template
  const SEARCH_MARKUP = `
        <div id="searchContainer" class="search-container">
            <!-- [2.1.1] Search input field -->
            <div class="search-field">
                <input type="text" id="tourSearch" placeholder="Search tour locations... (* for all)" autocomplete="off">
                <div class="icon-container">
                    <!-- [2.1.2] Search icon -->
                    <div class="search-icon" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </div>
                    <!-- [2.1.3] Clear search button -->
                    <button class="clear-button" aria-label="Clear search">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <!-- [2.1.4] Search results container -->
            <div class="search-results" role="listbox">
                <div class="results-section">
                </div>
                <!-- [2.1.5] No results message -->
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

  // [3.0] RESOURCE LOADING

  // [3.1] CSS Loader
  function _loadCSS() {
    return new Promise((resolve) => {
      // [3.1.1] Only need to load main CSS now
      let loaded = false;
      function fileLoaded() {
        if (!loaded) {
          loaded = true;
          resolve();
        }
      }
      // [3.1.2] Check if main CSS is already loaded
      if (document.querySelector('link[href="search-pro/css/search-01.css"]')) {
        fileLoaded();
      } else {
        // [3.1.3] Load main CSS
        const mainCssLink = document.createElement("link");
        mainCssLink.rel = "stylesheet";
        mainCssLink.href = "search-pro/css/search-01.css";
        mainCssLink.onload = fileLoaded;
        mainCssLink.onerror = () => {
          console.warn(
            "Failed to load main search CSS, styling may be affected",
          );
          fileLoaded();
        };
        document.head.appendChild(mainCssLink);
      }
    });
  }

  // [4.0] DOM INITIALIZATION AND MANIPULATION

  // [4.1] DOM initialization
  function _initializeDom() {
    // [4.1.1] Find the viewer element
    const viewer = document.getElementById("viewer");
    if (!viewer) {
      Logger.error(
        "Search Pro initialization failed: #viewer element not found",
      );
      return false;
    }

    // [4.1.2] Check if search container already exists
    if (document.getElementById("searchContainer")) {
      Logger.log("Search container already exists, skipping DOM creation");
      return true;
    }

    // [4.1.3] Create a temporary container
    const temp = document.createElement("div");
    temp.innerHTML = SEARCH_MARKUP.trim();

    // [4.1.4] Append the search container to the viewer
    viewer.appendChild(temp.firstChild);

    return true;
  }

  // [4.2] Search styling application
  function _applySearchStyling(config) {
    const searchContainer = document.getElementById("searchContainer");
    if (!searchContainer) {
      Logger.warn("Search container not found, styling not applied");
      return;
    }

    // [4.2.1] Apply container position based on device
    const position = config.searchBar.position;
    const isMobile = window.innerWidth <= config.mobileBreakpoint;

    // Set positioning attribute for CSS targeting
    if (position.left !== null && position.right === null) {
      searchContainer.setAttribute("data-position", "left");
    } else if (position.left !== null && position.left === "50%") {
      searchContainer.setAttribute("data-position", "center");
    } else {
      searchContainer.setAttribute("data-position", "right");
    }

    // [4.2.2] Clean up any existing style elements
    const existingStyle = document.getElementById("search-custom-vars");
    if (existingStyle) {
      existingStyle.remove();
    }

    // [4.2.3] Create new style element
    const styleElement = document.createElement("style");
    styleElement.id = "search-custom-vars";

    // [4.2.4] Generate CSS variables from config
    const colors = config.appearance.colors;
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

    // [4.2.5] Generate responsive positioning CSS
    const isMobileOverride =
      isMobile &&
      config.searchBar.useResponsive &&
      config.searchBar.mobileOverrides &&
      config.searchBar.mobileOverrides.enabled;
    const mobilePosition = config.searchBar.mobilePosition;
    const mobileOverrides = config.searchBar.mobileOverrides || {};

    // Width calculation based on device type
    const desktopWidth =
      typeof config.searchBar.width === "number"
        ? `${config.searchBar.width}px`
        : config.searchBar.width;
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

    // [4.2.6] Apply display-related classes and CSS variables
    const root = document.documentElement;

    // Set CSS variables for result tags visibility
    root.style.setProperty(
      "--result-tags-display",
      config.showTagsInResults ? "block" : "none",
    );

    // Apply class-based styling for visibility control
    if (!config.display.showGroupHeaders) {
      document.body.classList.add("hide-group-headers");
    } else {
      document.body.classList.remove("hide-group-headers");
    }

    if (!config.display.showGroupCount) {
      document.body.classList.add("hide-group-count");
    } else {
      document.body.classList.remove("hide-group-count");
    }

    if (!config.display.showIconsInResults) {
      document.body.classList.add("hide-result-icons");
    } else {
      document.body.classList.remove("hide-result-icons");
    }

    // Set icon color variable
    root.style.setProperty(
      "--color-result-icon",
      config.appearance.colors.resultIconColor || "#6e85f7",
    );

    // [4.2.7] Set border radius CSS variables
    const fieldRadius = config.appearance.searchField.borderRadius;
    const resultsRadius = config.appearance.searchResults.borderRadius;

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

    // [4.2.8] Set color variables for search
    root.style.setProperty(
      "--search-background",
      config.appearance.colors.searchBackground || "#f4f3f2",
    );
    root.style.setProperty(
      "--search-text",
      config.appearance.colors.searchText || "#1a1a1a",
    );
    root.style.setProperty(
      "--placeholder-text",
      config.appearance.colors.placeholderText || "#94a3b8",
    );
    root.style.setProperty(
      "--search-icon",
      config.appearance.colors.searchIcon || "#94a3b8",
    );
    root.style.setProperty(
      "--clear-icon",
      config.appearance.colors.clearIcon || "#94a3b8",
    );
    root.style.setProperty(
      "--results-background",
      config.appearance.colors.resultsBackground || "#ffffff",
    );
    root.style.setProperty(
      "--group-header",
      config.appearance.colors.groupHeaderColor || "#20293A",
    );
    root.style.setProperty(
      "--group-count",
      config.appearance.colors.groupCountColor || "#94a3b8",
    );
    root.style.setProperty(
      "--result-hover",
      config.appearance.colors.resultHover || "#f0f0f0",
    );
    root.style.setProperty(
      "--result-border-left",
      config.appearance.colors.resultBorderLeft || "#dd0e0e",
    );
    root.style.setProperty(
      "--result-text",
      config.appearance.colors.resultText || "#1e293b",
    );
    root.style.setProperty(
      "--result-subtitle",
      config.appearance.colors.resultSubtitle || "#64748b",
    );

    // [4.2.9] Handle thumbnail alignment from config
    const thumbAlignment =
      config.thumbnailSettings?.alignment === "right" ? "right" : "left";

    // Apply thumbnail alignment to the document body as a data attribute
    document.body.setAttribute("data-thumbnail-align", thumbAlignment);

    // [4.2.10] Include both CSS variables and positioning CSS
    styleElement.textContent = cssVars + positionCSS;
    document.head.appendChild(styleElement);

    Logger.info("Search styling applied successfully");
  }

  // [5.0] UI COMPONENT BUILDERS

  // [5.1] Create no-results message element
  function _buildNoResultsMessage() {
    const noResults = document.createElement("div");
    noResults.className = "no-results";
    noResults.innerHTML = "<p>No results found</p>";
    return noResults;
  }

  // [5.2] Create search field
  function _buildSearchField(container, config) {
    if (!container.querySelector("#tourSearch")) {
      const searchField = document.createElement("div");
      searchField.className = "search-field";
      searchField.innerHTML = `
                <input type="text" id="tourSearch" placeholder="${config.searchBar.placeholder}" 
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

      ARIA.setRole(input, "searchbox");
      ARIA.setLabel(input, "Search tour");
      ARIA.setRole(searchField, "search");
      ARIA.setLabel(clearButton, "Clear search");
      ARIA.setHidden(searchIcon, true);

      container.insertBefore(searchField, container.firstChild);
    }
  }

  // [5.3] Create results container
  function _buildResultsContainer(container) {
    if (!container.querySelector(".search-results")) {
      const resultsContainer = document.createElement("div");
      resultsContainer.className = "search-results";

      // Set up ARIA attributes using helpers
      ARIA.setRole(resultsContainer, "listbox");
      ARIA.setLabel(resultsContainer, "Search results");

      // Add results section
      const resultsSection = document.createElement("div");
      resultsSection.className = "results-section";
      resultsContainer.appendChild(resultsSection);

      // Add no-results message
      resultsContainer.appendChild(_buildNoResultsMessage());

      container.appendChild(resultsContainer);
    }
  }

  // [5.4] Create search interface
  function _createSearchInterface(container, config) {
    _buildSearchField(container, config);
    _buildResultsContainer(container);
  }

  // [6.0] UTILITY FUNCTIONS

  // [6.1] Get icon HTML for element types
  function _getTypeIcon(type) {
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
  }
  // [6.0] Loading and Error State DOM Functions
  function showLoadingState(message) {
    const container = document.getElementById("searchContainer");
    if (!container) return;

    // Create loading indicator if it doesn't exist
    let loadingEl = container.querySelector(".search-loading");
    if (!loadingEl) {
      loadingEl = document.createElement("div");
      loadingEl.className = "search-loading";
      loadingEl.innerHTML = `
      <div class="search-loading-indicator"></div>
      <div class="search-loading-text"></div>
    `;
      container.appendChild(loadingEl);
    }

    // Update message and show
    loadingEl.querySelector(".search-loading-text").textContent =
      message || "Loading...";
    loadingEl.style.display = "flex";
  }

  function hideLoadingState() {
    const container = document.getElementById("searchContainer");
    if (!container) return;

    const loadingEl = container.querySelector(".search-loading");
    if (loadingEl) {
      loadingEl.style.display = "none";
    }
  }

  function showErrorState(title, message) {
    const container = document.getElementById("searchContainer");
    if (!container) return;

    // Create error message if it doesn't exist
    let errorEl = container.querySelector(".search-error-state");
    if (!errorEl) {
      errorEl = document.createElement("div");
      errorEl.className = "search-error-state";
      errorEl.innerHTML = `
      <div class="search-error-icon">⚠️</div>
      <div class="search-error-title"></div>
      <div class="search-error-message"></div>
    `;
      container.appendChild(errorEl);
    }

    // Update message and show
    errorEl.querySelector(".search-error-title").textContent = title || "Error";
    errorEl.querySelector(".search-error-message").textContent =
      message || "An error occurred";
    errorEl.style.display = "flex";

    // Hide loading state if visible
    hideLoadingState();
  }

  // [6.2] Highlight matches in text
  function _highlightMatch(text, term) {
    if (!text || !term || term === "*") return text || "";

    try {
      // [6.2.1] Sanitize the search term to prevent regex errors
      const sanitizedTerm = term.replace(/[-/^$*+?.()|[\]{}]/g, "\\$&");
      const regex = new RegExp(`(${sanitizedTerm})`, "gi");
      return text.replace(regex, "<mark>$1</mark>");
    } catch (e) {
      Logger.warn("Error highlighting text:", e);
      return text;
    }
  }

  /**
   * Helper function to get display name for different search modes
   */
  function getModeDisplayName(mode) {
    switch (mode) {
      case "business":
        return "Business Data";
      case "googleSheets":
        return "Google Sheets";
      case "customThumbnails":
        return "Custom Thumbnails";
      default:
        return "Tour";
    }
  }

  // New DOM function to update UI for active mode
  function updateInterfaceForMode(mode, config) {
    const container = document.getElementById("searchContainer");
    if (!container) return;

    // 1. Remove old mode classes
    container.classList.remove(
      "mode-tour",
      "mode-business",
      "mode-google-sheets",
      "mode-custom-thumbnails",
    );

    // 2. Add class for current mode
    container.classList.add(`mode-${mode}`);

    // 3. Set data attribute for CSS targeting
    container.setAttribute("data-mode", mode);

    // 4. Update search placeholder text based on mode
    const input = container.querySelector("#tourSearch");
    if (input) {
      switch (mode) {
        case "business":
          input.placeholder =
            config.businessData?.placeholder || "Search businesses...";
          break;
        case "googleSheets":
          input.placeholder =
            config.googleSheets?.placeholder || "Search data...";
          break;
        case "customThumbnails":
          input.placeholder =
            config.customThumbnails?.placeholder || "Search assets...";
          break;
        default:
          input.placeholder = config.searchBar?.placeholder || "Search tour...";
      }
    }

    // 5. Add mode indicator
    const modeIndicator = document.createElement("div");
    modeIndicator.className = "search-mode-indicator";
    modeIndicator.textContent = getModeDisplayName(mode);

    // Replace existing indicator if any
    const existingIndicator = container.querySelector(".search-mode-indicator");
    if (existingIndicator) {
      existingIndicator.replaceWith(modeIndicator);
    } else {
      // Add after search field
      const searchField = container.querySelector(".search-field");
      if (searchField) {
        searchField.insertAdjacentElement("afterend", modeIndicator);
      }
    }
  }

  // [7.0] PUBLIC API
  return {
    loadCSS: _loadCSS,
    initializeDom: _initializeDom,
    applySearchStyling: _applySearchStyling,
    buildSearchField: _buildSearchField,
    buildResultsContainer: _buildResultsContainer,
    buildNoResultsMessage: _buildNoResultsMessage,
    createSearchInterface: _createSearchInterface,
    getTypeIcon: _getTypeIcon,
    highlightMatch: _highlightMatch,
    SEARCH_MARKUP: SEARCH_MARKUP,
    updateInterfaceForMode,
    showLoadingState,
    hideLoadingState,
    showErrorState,
  };
})();
