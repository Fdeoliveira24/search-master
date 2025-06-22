/**
 * related-content.js - Related content module for Search Pro
 * Handles finding and displaying related search results
 */
window.SearchProModules = window.SearchProModules || {};

window.SearchProModules.RelatedContent = (function () {
  // Get dependencies
  const Utils = window.SearchProModules.Utils || {};
  const Logger = Utils.Logger || console;
  const DOMHandler = window.SearchProModules.DOMHandler || {};
  const SearchEngine = window.SearchProModules.SearchEngine || {};

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
   * @param {Object} config - The configuration object
   * @returns {number} Similarity score (0-1)
   */
  function _calculateSimilarityScore(selectedItem, candidateItem, config) {
    if (!selectedItem || !candidateItem || selectedItem === candidateItem) {
      return 0;
    }

    const criteria = config.relatedContent.criteria;
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
   * @param {Object} config - The configuration object
   * @returns {Array} Sorted array of related items with similarity scores
   */
  function _findRelatedItems(selectedItem, allItems, config) {
    if (!selectedItem || !Array.isArray(allItems) || allItems.length === 0) {
      return [];
    }

    // Calculate similarity for all items
    const scoredItems = allItems
      .filter((item) => item !== selectedItem) // Exclude selected item
      .map((item) => ({
        item,
        score: _calculateSimilarityScore(selectedItem, item, config),
      }))
      .filter((result) => result.score > 0) // Only keep items with some similarity
      .sort((a, b) => b.score - a.score); // Sort by similarity score (descending)

    // Limit to configured max items
    return scoredItems.slice(0, config.relatedContent.maxItems);
  }

  /**
   * Creates the related content section DOM structure
   * @param {Object} config - The configuration object
   * @returns {HTMLElement} The related content section container
   */
  function _createRelatedContentSection(config) {
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
    headerTitle.textContent = config.relatedContent.headerText;
    header.appendChild(headerTitle);

    // Add toggle button if collapsible
    if (config.relatedContent.collapsible) {
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
      toggleBtn.addEventListener("click", () => _toggleRelatedSection(config));

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
   * @param {Object} config - The configuration object
   */
  function _toggleRelatedSection(_config) {
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
   * @param {Object} config - The configuration object
   * @param {Object} tour - The tour object for navigation
   */
  /**
   * Updates the related content section with items related to the selected item
   * @param {Object} selectedItem - The search result that was selected
   * @param {Array} allItems - All available items to find related ones from (optional)
   * @param {Object} config - The configuration object
   * @param {Object} tour - The tour object for navigation
   */
  function _updateRelatedContent(selectedItem, allItems, config, tour) {
    // Skip if related content is disabled
    if (!config.relatedContent || !config.relatedContent.enabled) {
      return;
    }

    // Log activity
    Logger.info(
      `Updating related content for ${selectedItem.type}: ${selectedItem.title || selectedItem.id}`,
    );

    // Store the selected item for reference
    _relatedContent.selectedItem = selectedItem;

    // Get all items if not provided
    if (!allItems && typeof window.fuse !== "undefined" && window.fuse._docs) {
      allItems = window.fuse._docs;
    }

    if (!Array.isArray(allItems) || allItems.length === 0) {
      Logger.warn("No items available to find related content");
      return;
    }

    // Find related items
    const relatedItems = _findRelatedItems(selectedItem, allItems, config);

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
      sectionContainer = _createRelatedContentSection(config);
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
        const itemElement = _renderRelatedItem(relatedItem, config, tour);
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
   * @param {Object} config - The configuration object
   * @param {Object} tour - The tour object for navigation
   * @returns {HTMLElement} The related item element
   */
  function _renderRelatedItem(relatedItem, config, tour) {
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
    if (typeof DOMHandler.getTypeIcon === "function" && item.type) {
      iconElement.innerHTML = DOMHandler.getTypeIcon(item.type);
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
      _handleRelatedItemClick(item, tour);
    });

    // Add keyboard handler for accessibility
    itemElement.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        _handleRelatedItemClick(item, tour);
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
   * @param {Object} tour - The tour object for navigation
   */
  function _handleRelatedItemClick(item, tour) {
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
            SearchEngine.triggerElement(tour, item.id);
          }, 100);
        }
      }
    } catch (error) {
      Logger.error("Error navigating to related item:", error);
    }
  }

  return {
    // Public API
    calculateSimilarityScore: _calculateSimilarityScore,
    calculateMetadataSimilarity: _calculateMetadataSimilarity,
    findRelatedItems: _findRelatedItems,
    createRelatedContentSection: _createRelatedContentSection,
    toggleRelatedSection: _toggleRelatedSection,
    updateRelatedContent: _updateRelatedContent,
    addKeyboardNavigation: _addKeyboardNavigation,
    renderRelatedItem: _renderRelatedItem,
    handleRelatedItemClick: _handleRelatedItemClick,
    // Export related content state
    getState: () => ({ ..._relatedContent }),
  };
})();
