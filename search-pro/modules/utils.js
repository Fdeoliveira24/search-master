/**
 * utils.js - Core utilities for Search Pro
 * Contains logging, events, helpers, and cross-window communication
 */
window.SearchProModules = window.SearchProModules || {};

window.SearchProModules.Utils = (function () {
  // [1.2] LOGGING UTILITIES
  const Logger = {
    // Set this to control logging level: 0=debug, 1=info, 2=warn, 3=error, 4=none
    level: 2,

    debug: function (message, ...args) {
      if (this.level <= 0) window.searchProDebugLogger.debug(message, ...args);
    },

    info: function (message, ...args) {
      if (this.level <= 1) window.searchProDebugLogger.info(message, ...args); 
    },

    warn: function (message, ...args) {
      if (this.level <= 2) window.searchProDebugLogger.warn(message, ...args);
    },

    error: function (message, ...args) {
      if (this.level <= 3) window.searchProDebugLogger.error(message, ...args);
    },
  };

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

  return {
    Logger: Logger,
    debounce: _debounce,
    preprocessSearchTerm: _preprocessSearchTerm,
    safelyGetProperty: _safelyGetProperty,
    applyTheme: _applyTheme,
    EventManager: _eventManager,
    ARIA: _aria,
    CrossWindowChannel: _crossWindowChannel,
    Papa: Papa,
  };
})();
