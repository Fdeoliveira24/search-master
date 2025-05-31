/**
 * ui-manager.js - UI and event management for Search Pro
 * Handles keyboard navigation, event handlers, search rendering
 */
window.SearchProModules = window.SearchProModules || {};

window.SearchProModules.UIManager = (function () {
  // [1.0] DEPENDENCIES
  const Utils = window.SearchProModules.Utils || {};
  const Logger = Utils.Logger || console;
  const ARIA = Utils.ARIA || {};
  const EventManager = Utils.EventManager || {};
  const DOMHandler = window.SearchProModules.DOMHandler || {};

  // [1.1] Module-scoped variables for cleanup functions
  let keyboardCleanup = null;

  // [2.0] KEYBOARD NAVIGATION
  const keyboardManager = {
    // [2.1] Initialize keyboard navigation
    init(searchContainer, searchInput, performSearch) {
      if (!searchContainer || !searchInput) {
        Logger.error("Invalid parameters for keyboard manager");
        return () => {}; // Return no-op cleanup function
      }

      let selectedIndex = -1;
      let resultItems = [];

      // [2.2] Store bound handlers for proper cleanup
      const handlers = {
        documentKeydown: null,
        inputKeyup: null,
        inputKeydown: null,
      };

      // [2.3] Update selection helper
      const updateSelection = (newIndex) => {
        resultItems = searchContainer.querySelectorAll(".result-item");
        if (!resultItems.length) return;
        if (selectedIndex >= 0 && selectedIndex < resultItems.length) {
          resultItems[selectedIndex].classList.remove("selected");
          ARIA.setSelected(resultItems[selectedIndex], false);
        }
        selectedIndex = newIndex;
        if (selectedIndex >= 0 && selectedIndex < resultItems.length) {
          const selectedItem = resultItems[selectedIndex];
          selectedItem.classList.add("selected");
          ARIA.setSelected(selectedItem, true);
          selectedItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
          selectedItem.focus();
        } else {
          searchInput.focus();
        }
      };

      // [2.4] Document keydown handler
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

      // [2.5] Input keyup handler
      handlers.inputKeyup = Utils.debounce(function () {
        selectedIndex = -1;
      }, 200);

      // [2.6] Input keydown handler
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

      // [2.7] Bind all event handlers
      document.addEventListener("keydown", handlers.documentKeydown);
      searchInput.addEventListener("keyup", handlers.inputKeyup);
      searchInput.addEventListener("keydown", handlers.inputKeydown);

      // [2.8] Return cleanup function
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

  // [3.0] EVENT LISTENER MANAGEMENT

  // [3.1] Unbind search event listeners (cleanup)
  function _unbindSearchEventListeners() {
    try {
      // [3.1.1] Close BroadcastChannel to prevent memory leaks
      Utils.CrossWindowChannel.close();
      Logger.debug("BroadcastChannel closed");

      // [3.1.2] Clean up keyboard manager event listeners
      if (keyboardCleanup) {
        keyboardCleanup();
        keyboardCleanup = null;
        Logger.debug("Keyboard manager cleanup completed");
      }

      // [3.1.3] Clean up handlers for document
      EventManager.removeAllListeners(document);

      // [3.1.4] Clean up handlers for window
      EventManager.removeAllListeners(window);

      // [3.1.5] Clean up handlers for search container elements
      const elements = window.SearchProModules.elements || {};

      if (elements.container) {
        EventManager.removeAllListeners(elements.container);
      }

      if (elements.input) {
        EventManager.removeAllListeners(elements.input);
      }

      if (elements.clearButton) {
        EventManager.removeAllListeners(elements.clearButton);
      }

      if (elements.searchIcon) {
        EventManager.removeAllListeners(elements.searchIcon);
      }

      Logger.debug("Successfully unbound all search event listeners");
      return true;
    } catch (error) {
      Logger.warn("Error unbinding search event listeners:", error);
      return false;
    }
  }

  // [3.2] Bind search event listeners
  function _bindSearchEventListeners(
    searchContainer,
    searchInput,
    clearButton,
    searchIcon,
    performSearch,
    config,
    toggleSearch,
  ) {
    // [3.2.1] First clean up any existing event listeners to prevent duplicates
    _unbindSearchEventListeners();

    Logger.debug("Binding search event listeners...");

    // [3.2.2] Bind input event with debounce - longer time for mobile devices
    if (searchInput) {
      // Check if device is mobile for appropriate debounce timing
      const isMobile =
        window.innerWidth <= config.mobileBreakpoint ||
        "ontouchstart" in window;
      const debounceTime = isMobile ? 300 : 150; // Longer debounce on mobile for better performance

      Logger.debug(
        `Using ${isMobile ? "mobile" : "desktop"} debounce time: ${debounceTime}ms`,
      );
      const debouncedSearch = Utils.debounce(performSearch, debounceTime);
      EventManager.addListener(searchInput, "input", debouncedSearch);

      // Special handling for mobile touch events
      if ("ontouchstart" in window) {
        EventManager.addListener(searchInput, "touchend", function () {
          this.focus();
        });
      }
    }

    // [3.2.3] Bind clear button
    if (clearButton) {
      EventManager.addListener(clearButton, "click", function (e) {
        e.stopPropagation();
        if (searchInput) {
          searchInput.value = "";
          performSearch();
          searchInput.focus();
        }

        // If on mobile, also close the search completely if configured
        if (
          window.innerWidth <= config.mobileBreakpoint &&
          config.autoHide.mobile
        ) {
          toggleSearch(false);
        }
      });
    }

    // [3.2.4] Bind search icon for wildcard search
    if (searchIcon) {
      searchIcon.style.cursor = "pointer";
      EventManager.addListener(searchIcon, "click", function () {
        if (searchInput) {
          searchInput.value = "*";
          performSearch();
        }
      });
    }

    // [3.2.5] Close search when clicking outside
    EventManager.addListener(document, "click", function (e) {
      // Skip if search isn't visible
      if (!searchContainer.classList.contains("visible")) return;

      // Close if click is outside search container
      if (!searchContainer.contains(e.target)) {
        toggleSearch(false);
      }
    });

    // [3.2.6] Special mobile handling
    if ("ontouchstart" in window) {
      EventManager.addListener(document, "touchstart", function (e) {
        if (
          searchContainer.classList.contains("visible") &&
          !searchContainer.contains(e.target)
        ) {
          toggleSearch(false);
        }
      });
    }

    // [3.2.7] Set up keyboard navigation with proper cleanup tracking
    keyboardCleanup = keyboardManager.init(
      searchContainer,
      searchInput,
      performSearch,
    );

    // Search history-related click events have been removed

    // [3.2.9] Apply window resize handler for styling
    const resizeHandler = Utils.debounce(
      () => DOMHandler.applySearchStyling(config),
      250,
    );
    EventManager.addListener(window, "resize", resizeHandler);

    // [3.2.10] Handle mobile-specific scroll behaviors if enabled
    if (
      config.searchBar?.mobileOverrides?.enabled &&
      config.searchBar?.mobileOverrides?.visibility?.showOnScroll !== undefined
    ) {
      let lastScrollY = window.scrollY;
      const scrollThreshold =
        config.searchBar.mobileOverrides.visibility.hideThreshold || 100;

      // Debounced scroll handler
      const scrollHandler = Utils.debounce(function () {
        // Only apply scroll behavior if we're on a mobile device
        if (
          window.innerWidth <=
          (config.searchBar.mobileOverrides.breakpoint || 768)
        ) {
          const currentScrollY = window.scrollY;
          const scrollingUp = currentScrollY < lastScrollY;
          const beyondThreshold =
            Math.abs(currentScrollY - lastScrollY) > scrollThreshold;

          // Check if the search container is visible and use the appropriate behavior
          if (beyondThreshold) {
            const isVisible = searchContainer.classList.contains("visible");
            if (config.searchBar.mobileOverrides.visibility.showOnScroll) {
              // Show when scrolling up, hide when scrolling down
              if (scrollingUp && !isVisible) {
                toggleSearch(true);
              } else if (
                !scrollingUp &&
                isVisible &&
                document.activeElement !== searchInput
              ) {
                toggleSearch(false);
              }
            } else {
              // If showOnScroll is false, we'll hide it when scrolling down past threshold
              if (
                !scrollingUp &&
                isVisible &&
                document.activeElement !== searchInput
              ) {
                toggleSearch(false);
              }
            }
          }

          lastScrollY = currentScrollY;
        }
      }, 100);

      EventManager.addListener(window, "scroll", scrollHandler);
    }

    Logger.debug("Search event listeners bound successfully");
    return true;
  }

  // [4.0] SEARCH VISIBILITY CONTROL

  // [4.1] Search visibility toggle
  function _toggleSearch(show, elements) {
    // [4.1.1] Validate container exists
    if (!elements || !elements.container) {
      Logger.error("Search container not found");
      return;
    }

    // [4.1.2] Show search
    if (show) {
      // Reset search state to prevent no-results issues
      const searchInput = elements.container.querySelector("#tourSearch");
      const resultsContainer =
        elements.container.querySelector(".search-results");
      if (searchInput && searchInput.value.trim() === "") {
        // Clear any stale results when showing empty search
        if (resultsContainer) {
          resultsContainer.classList.remove("visible");
          resultsContainer.style.display = "none";
        }
      }

      // Update display before animation
      elements.container.style.display = "block";

      // Set ARIA expanded state
      ARIA.setExpanded(elements.container, true);

      // Reset the results visibility state
      if (resultsContainer) {
        // Hide results until search is performed
        resultsContainer.classList.remove("visible");
        resultsContainer.style.display = "none";
      }

      // Clear results section when toggling
      const resultsSection =
        elements.container.querySelector(".results-section");
      if (resultsSection) {
        // Only clear if we don't have an active search
        const searchInput = elements.container.querySelector("#tourSearch");
        if (!searchInput || !searchInput.value.trim()) {
          resultsSection.innerHTML = "";
        }
      }

      // Ensure it's within viewport bounds
      const viewportHeight = window.innerHeight;
      const searchContainerRect = elements.container.getBoundingClientRect();
      const searchContainerTop = searchContainerRect.top;
      const searchContainerHeight = searchContainerRect.height;

      // Adjust position if needed to keep within viewport
      if (searchContainerTop + searchContainerHeight > viewportHeight) {
        const newTop = Math.max(
          10,
          viewportHeight - searchContainerHeight - 20,
        );
        elements.container.style.top = newTop + "px";
      }

      // Trigger animation on next frame
      requestAnimationFrame(() => {
        elements.container.classList.add("visible");

        // Focus input field
        if (elements.input) {
          elements.input.focus();
        }
      });
    } else {
      // [4.1.3] Hide search
      elements.container.classList.remove("visible");

      // Set ARIA expanded state
      ARIA.setExpanded(elements.container, false);

      // Wait for transition to complete before hiding
      setTimeout(() => {
        if (!elements.container.classList.contains("visible")) {
          elements.container.style.display = "none";
        }
      }, 350);

      // Clean up after animation
      setTimeout(() => {
        // Reset input and UI
        if (elements.input) {
          elements.input.value = "";
          elements.input.blur();
        }
      }, 400);

      // Clear UI elements
      setTimeout(() => {
        // Update cached elements
        if (elements.clearButton) {
          elements.clearButton.classList.remove("visible");
        }

        if (elements.searchIcon) {
          elements.searchIcon.style.opacity = "1";
        }

        // Clear results
        if (elements.results) {
          const resultsList =
            elements.container.querySelector(".results-section");
          if (resultsList) {
            resultsList.innerHTML = "";
          }
        }

        // Hide any error messages
        const noResults = elements.container.querySelector(".no-results");
        if (noResults) {
          noResults.style.display = "none";
        }
      }, 200); // Match the CSS transition duration
    }
  }

  // [5.0] SEARCH RESULTS RENDERING

  // [5.1] Render search history - Removed
  function _renderSearchHistory() {
    // Search history functionality has been removed
    return "";
  }

  // [5.2] Group and sort search results
  function _groupAndSortResults(matches, config) {
    // [5.2.1] Create object to hold grouped results
    const grouped = matches.reduce((acc, match) => {
      // Check if this is a business result
      if (config.businessData?.useBusinessData && match.item.businessName) {
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

    // [5.2.2] Sort items within each group alphabetically
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
  }

  // [5.3] Apply settings to tour DOM
  function _applyToTourDOM(settings) {
    // [5.3.1] Wait for both tour and search container to be available
    _waitForElements(settings);
  }

  // [5.4] Wait for elements to be available before applying settings
  function _waitForElements(settings) {
    const maxAttempts = 20;
    let attempts = 0;

    const checkAndApply = () => {
      if (attempts >= maxAttempts) {
        console.warn(
          "[UIManager] Exceeded maximum wait attempts for tour/container",
        );
        return;
      }
      attempts++;
      const container = document.getElementById("searchContainer");
      if (!container) {
        console.log(
          `[UIManager] Waiting for search container (attempt ${attempts}/${maxAttempts})`,
        );
        setTimeout(checkAndApply, 500);
        return;
      }
      _applySettingsToContainer(container, settings);
    };
    checkAndApply();
  }

  // [5.5] Apply settings to the search container
  function _applySettingsToContainer(container, settings) {
    try {
      // [5.5.1] Apply placeholder text
      const input = container.querySelector("#tourSearch");
      if (
        input &&
        settings.searchBar &&
        settings.searchBar.placeholder !== undefined
      ) {
        input.placeholder = settings.searchBar.placeholder;
      }

      // [5.5.2] Apply theme settings
      console.log("[UIManager] Applying theme settings:", {
        themeMode: settings.theme && settings.theme.useDarkMode,
        searchWidth: settings.appearance && settings.appearance.searchWidth,
        maxHeight:
          settings.appearance &&
          settings.appearance.searchResults &&
          settings.appearance.searchResults.maxHeight,
      });

      // [5.5.3] Apply tag text color if available
      if (
        settings.appearance &&
        settings.appearance.colors &&
        settings.appearance.colors.tagTextColor
      ) {
        const tagColor = settings.appearance.colors.tagTextColor;
        container.style.setProperty("--tag-text-color", tagColor, "important");
        document.documentElement.style.setProperty(
          "--tag-text-color",
          tagColor,
          "important",
        );
        document.body.style.setProperty(
          "--tag-text-color",
          tagColor,
          "important",
        );
      }

      // [5.5.4] Apply settings to container - theme, layout, etc.
      Object.keys(settings).forEach((key) => {
        const value = settings[key];
        switch (key) {
          case "theme":
            // Apply theme settings
            container.classList.remove("light", "dark");
            container.classList.add(value);
            break;
          case "layout":
            // Apply layout settings
            container.classList.remove("compact", "full");
            container.classList.add(value);
            break;
          default:
            console.warn(`[UIManager] Unknown setting: ${key}`);
        }
      });

      console.info("[UIManager] Theme settings applied successfully");
    } catch (error) {
      console.error("[UIManager] Error applying settings:", error);
    }
  }

  // [6.0] PUBLIC API
  return {
    KeyboardManager: keyboardManager,
    unbindSearchEventListeners: _unbindSearchEventListeners,
    bindSearchEventListeners: _bindSearchEventListeners,
    toggleSearch: _toggleSearch,
    renderSearchHistory: _renderSearchHistory,
    groupAndSortResults: _groupAndSortResults,
    applyToTourDOM: _applyToTourDOM,
  };
})();
