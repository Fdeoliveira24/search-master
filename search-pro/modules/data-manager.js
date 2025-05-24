/**
 * data-manager.js - Data loading and history management for Search Pro
 * Handles search history, external data sources (Google Sheets, business data)
 */
window.SearchProModules = window.SearchProModules || {};

window.SearchProModules.DataManager = (function () {
  // [1.0] DEPENDENCIES
  const Utils = window.SearchProModules.Utils || {};
  const Logger = window.searchProDebugLogger || console;
  const CrossWindowChannel = Utils.CrossWindowChannel || {};

  // [2.0] SEARCH HISTORY MANAGEMENT
  const _searchHistory = {
    maxItems: 5,
    storageKey: "tourSearchHistory",

    // [2.1] Save search term to history
    save(term) {
      if (!term || typeof term !== "string" || term.trim() === "") {
        return false;
      }

      try {
        // [2.1.1] Check if localStorage is available
        if (!this._isStorageAvailable()) {
          return false;
        }

        let history = this.get();
        const termLower = term.toLowerCase().trim();
        const index = history.findIndex((h) => h.toLowerCase() === termLower);

        if (index > -1) {
          history.splice(index, 1);
        }

        // [2.1.2] Add the term to the beginning of the history
        history.unshift(term.trim());

        // [2.1.3] Remove duplicates
        history = [...new Set(history)];

        // [2.1.4] Limit the size of history
        if (history.length > this.maxItems) {
          history.length = this.maxItems;
        }

        // [2.1.5] Check storage size before saving
        const serialized = JSON.stringify(history);
        if (serialized.length > 5000) {
          // Trim history if too large
          history.length = Math.max(1, history.length - 2);
        }

        try {
          localStorage.setItem(this.storageKey, JSON.stringify(history));

          // [2.1.6] Broadcast history change to other windows/tabs
          CrossWindowChannel.send("historyUpdate", {
            action: "save",
            history,
          });

          return true;
        } catch (e) {
          // [2.1.7] Handle quota exceeded error
          if (e.name === "QuotaExceededError") {
            // Try removing the oldest item and save again
            if (history.length > 1) {
              history.pop();
              localStorage.setItem(this.storageKey, JSON.stringify(history));

              // Broadcast history change to other windows/tabs
              CrossWindowChannel.send("historyUpdate", {
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

    // [2.2] Retrieve search history
    get() {
      try {
        // [2.2.1] Check storage availability
        if (!this._isStorageAvailable()) {
          return [];
        }

        const stored = localStorage.getItem(this.storageKey);
        if (!stored) return [];

        const parsed = JSON.parse(stored);

        // [2.2.2] Validate parsed data is an array
        if (!Array.isArray(parsed)) {
          Logger.warn("Invalid search history format, resetting");
          this.clear();
          return [];
        }

        // [2.2.3] Filter out any invalid entries
        return parsed.filter(
          (item) => typeof item === "string" && item.trim() !== "",
        );
      } catch (error) {
        Logger.warn("Failed to retrieve search history:", error);
        return [];
      }
    },

    // [2.3] Clear search history
    clear() {
      try {
        if (this._isStorageAvailable()) {
          localStorage.removeItem(this.storageKey);

          // [2.3.1] Broadcast clear action to other windows/tabs
          CrossWindowChannel.send("historyUpdate", { action: "clear" });
        }
        return true;
      } catch (error) {
        Logger.warn("Failed to clear search history:", error);
        return false;
      }
    },

    // [2.4] Check if localStorage is available
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

  // [3.0] BUSINESS DATA MANAGEMENT
  let _businessData = [];

  // [4.0] GOOGLE SHEETS DATA MANAGEMENT
  let _googleSheetsData = [];

  // [5.0] BUSINESS DATA LOADING
  function _loadBusinessData(config) {
    // [5.1] Skip if business data is not enabled
    if (!config.businessData.useBusinessData) {
      Logger.info("Business data integration disabled, skipping load");
      return Promise.resolve([]);
    }

    // [5.2] Construct the path to the business data file
    const baseUrl = window.location.pathname.substring(
      0,
      window.location.pathname.lastIndexOf("/"),
    );
    const dataDir = config.businessData.businessDataDir || "business-data";
    const dataFile = config.businessData.businessDataFile || "business.json";
    const dataPath = `${baseUrl}/search-pro/${dataDir}/${dataFile}`;

    Logger.info(`Loading business data from: ${dataPath}`);

    // [5.3] Fetch the business data file
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
        // [5.4] Validate and process data
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

  // [6.0] GOOGLE SHEETS DATA LOADING
  function _loadGoogleSheetsData(config) {
    // [6.1] Skip if Google Sheets data is not enabled
    if (
      !config.googleSheets.useGoogleSheetData ||
      !config.googleSheets.googleSheetUrl
    ) {
      Logger.info(
        "Google Sheets integration disabled or URL not provided, skipping load",
      );
      return Promise.resolve([]);
    }

    const sheetUrl = config.googleSheets.googleSheetUrl;
    const fetchMode = config.googleSheets.fetchMode || "csv";
    const cachingOptions = config.googleSheets.caching || {};
    const progressiveOptions = config.googleSheets.progressiveLoading || {};
    const authOptions = config.googleSheets.authentication || {};

    Logger.info(
      `Loading Google Sheets data from: ${sheetUrl} in ${fetchMode} mode`,
    );

    // [6.2] Check cache first if enabled
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

          // [6.2.1] If cache is still valid
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

    // [6.3] Ensure the URL is valid for fetching
    let fetchUrl = sheetUrl;
    if (fetchMode === "csv" && !sheetUrl.includes("/export?format=csv")) {
      // [6.3.1] Check if this is a Google Sheets view URL and convert it to a CSV export URL
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

    // [6.4] Add authentication if enabled
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

    // [6.5] Fetch the data
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
            // [6.5.1] Parse CSV using our Papa Parse implementation
            const result = Utils.Papa.parse(
              text,
              config.googleSheets.csvOptions,
            );
            if (result.errors && result.errors.length > 0) {
              Logger.warn("CSV parsing errors:", result.errors);
            }
            data = result.data;
          } else {
            // [6.5.2] Parse as JSON
            data = JSON.parse(text);

            // Handle common Google Sheets JSON API responses
            if (data.feed && data.feed.entry) {
              // Handle Google Sheets API v3 format
              data = data.feed.entry.map((entry) => {
                const row = {};
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

          // [6.5.3] Validate the data structure
          if (!Array.isArray(data)) {
            Logger.warn(
              "Google Sheets data is not an array after parsing, converting to array",
            );
            data = [data]; // Convert to array if not already
          }

          Logger.info(
            `Successfully loaded ${data.length} rows from Google Sheets`,
          );

          // [6.5.4] Implement progressive loading if enabled
          let processedData = [];
          if (progressiveOptions.enabled && data.length > 20) {
            Logger.info(
              "Progressive loading enabled, processing essential fields first",
            );

            const essentialFields = progressiveOptions.initialFields || [
              "id",
              "tag",
              "name",
            ];

            processedData = data.map((row) => {
              const essentialData = {};
              essentialFields.forEach((field) => {
                essentialData[field] = row[field] || "";
              });
              return essentialData;
            });

            setTimeout(() => {
              const fullData = data.map((row) => ({
                id: row.id || "",
                tag: row.tag || "",
                name: row.name || "",
                description: row.description || "",
                imageUrl: row.imageUrl || row.image || "",
                elementType: row.elementType || row.type || "",
                parentId: row.parentId || "",
              }));

              _googleSheetsData = fullData;

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
            }, 2000);
          } else {
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

          _googleSheetsData = processedData;

          Logger.info(`Loaded Google Sheets rows:`, data);
          if (!Array.isArray(data) || data.length === 0) {
            Logger.warn("Google Sheets data is empty or failed to load.");
            alert("No data found in the Google Sheet. Please check the Sheet URL and ensure data is present.");
          }

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
          return [];
        }
      })
      .catch((error) => {
        Logger.warn(`Error loading Google Sheets data: ${error.message}`);
        _googleSheetsData = [];
        return [];
      });
  }

  // [7.0] GETTERS FOR DATA
  function _getBusinessData() {
    return _businessData;
  }

  function _getGoogleSheetsData() {
    return _googleSheetsData;
  }

  // [8.0] PUBLIC API
  return {
    searchHistory: _searchHistory,
    loadBusinessData: _loadBusinessData,
    loadGoogleSheetsData: _loadGoogleSheetsData,
    getBusinessData: _getBusinessData,
    getGoogleSheetsData: _getGoogleSheetsData,
  };
})();
