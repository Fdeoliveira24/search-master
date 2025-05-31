// search_v1.4.js
/*
====================================
3DVista Enhanced Search Script
Version: 1.5.0
Last Updated: 03/31/2025
Notes: 
-- Added skip items with an empty label so they never go into fuseData
-- Whitelabel implementation - Only include specific panoramas in search results
-- Blacklabel implementation - Skip if label or Panorama Title is blacklisted
-- Option to hide the search interface immediately after clicking a result
-- Configurable auto-hide feature for both mobile and desktop devices
-- Minimum character count feature (default: 2 characters)
-- Intelligent positioning to prevent overflow on different screen sizes
-- Flexible positioning options (left, right, center) via CSS
-- Improved search accuracy with optimized Fuse.js configuration:
   * More weight to labels (1.0) than subtitles (0.8) and tags (0.6)
   * Configurable threshold for more precise or flexible matching
   * Location-aware matching for words in any position
   * Case-insensitive search
   * Improved matching for terms with numbers or special characters

New in version 1.4.0:
-- Added option to include panoramas without labels but with subtitle or tag content
-- New configuration parameter: includeUnlabeledItems (default: false)
-- Subtitles are now searchable with higher weight (0.8) than tags (0.6)
-- Unlabeled panoramas display their subtitle or tag text in search results
-- Long subtitles are automatically truncated for better display
-- Lower boost (1.0) for unlabeled items compared to labeled items (1.5)
-- Compatible with whitelist and blacklist filtering methods
-- Reorganized configuration structure for better clarity and organization
-- Added separate sections for title, subtitle, tag, and blank panorama options
-- Enhanced whitelist to check both title and subtitle values
-- Enhanced blacklist to exclude panoramas based on both title and subtitle values
-- Added placeholder label option for completely blank items
-- Added completelyBlank option to control inclusion of panoramas with no content
-- Improved documentation with clearer, more detailed comments
-- Removed description references that weren't applicable to the tour data
====================================
*/
// [1.0] MAIN SEARCH MODULE DEFINITION
window.tourSearchFunctions = {
    
    // SEARCH CONFIGURATION OPTIONS
config: {
    // Core display and behavior settings
    autoHide: {
        mobile: true,      // Automatically hide search after selection on mobile devices
        desktop: false     // Automatically hide search after selection on desktop devices
    },
    mobileBreakpoint: 768, // Screen width threshold for mobile detection (in pixels)
    minSearchChars: 2,     // Minimum characters required to trigger search
    
    // CONTENT DISPLAY OPTIONS
    // ----------------------
    // Controls what content is shown in search results
    showTagsInResults: false,  // Whether to show tags in search results below the panorama title
    
    // CONTENT INCLUSION OPTIONS
    // ------------------------
    // Controls which panoramas are included in search based on their content
    includeContent: {
        // SUBTITLE OPTIONS
        // ---------------
        // Controls inclusion of panoramas with subtitles but no titles
        unlabeledWithSubtitles: true,  // Include panoramas that have subtitles but NO title
        
        // TAG OPTIONS
        // ----------
        // Controls inclusion of panoramas with tags but no titles
        unlabeledWithTags: false,      // Include panoramas that have tags but NO title
        
        // BLANK PANORAMA OPTIONS
        // --------------------
        // Controls inclusion of panoramas with no content
        completelyBlank: false,        // Include panoramas with no title, subtitle, or tags
    },
    
    // DISPLAY FALLBACK OPTIONS
    // ----------------------
    // Controls what content is used as the display label when title is missing
    useAsLabel: {
        // SUBTITLE FALLBACK
        // ---------------
        // Controls using subtitle as display text when title is missing
        subtitles: true,  // Use subtitle as displayed label when title is blank
        
        // TAG FALLBACK
        // ----------
        // Controls using tags as display text when both title and subtitle are missing
        tags: false,      // Use tags as displayed label when title and subtitle are blank
    }
},
    
    // [1.1] SEARCH HISTORY MANAGEMENT
    searchHistory: {
        // [1.1.1] Configuration constants
        maxItems: 5,
        storageKey: 'tourSearchHistory',

        // [1.1.2] Save search term to history
        save(term) {
            // [1.1.2.1] Get current history
            const history = this.get();
            const termLower = term.toLowerCase();
            const index = history.findIndex(h => h.toLowerCase() === termLower);
            // [1.1.2.2] Remove existing term if present
            if (index > -1) {
                history.splice(index, 1);
            }
            // [1.1.2.3] Add new term at the beginning
            history.unshift(term);
            // [1.1.2.4] Maintain maximum items limit
            if (history.length > this.maxItems) {
                history.pop();
            }
            // [1.1.2.5] Save to localStorage
            localStorage.setItem(this.storageKey, JSON.stringify(history));
        },
        
        // [1.1.3] Retrieve search history
        get() {
            try {
                // [1.1.3.1] Attempt to get and parse history
                return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
            } catch {
                // [1.1.3.2] Return empty array if error occurs
                return [];
            }
        },
        
        // [1.1.4] Clear search history
        clear() {
            localStorage.removeItem(this.storageKey);
        }
    },

    // [1.2] KEYBOARD NAVIGATION MANAGEMENT
    keyboardManager: {
        // [1.2.1] Initialize keyboard navigation
        init(searchContainer, searchInput, performSearch) {
            // [1.2.1.1] Initialize state variables
            let selectedIndex = -1;
            let resultItems = [];
            
            // [1.2.2] Update selected item in results
            const updateSelection = (newIndex) => {
                // [1.2.2.1] Get current result items
                resultItems = searchContainer.querySelectorAll('.result-item');
                if (resultItems.length === 0) return;
                // [1.2.2.2] Remove previous selection
                if (selectedIndex >= 0 && selectedIndex < resultItems.length) {
                    resultItems[selectedIndex].classList.remove('selected');
                    resultItems[selectedIndex].setAttribute('aria-selected', 'false');
                }
                // [1.2.2.3] Update index
                selectedIndex = newIndex;
                // [1.2.2.4] Apply new selection
                if (selectedIndex >= 0 && selectedIndex < resultItems.length) {
                    const selectedItem = resultItems[selectedIndex];
                    selectedItem.classList.add('selected');
                    selectedItem.setAttribute('aria-selected', 'true');
                    selectedItem.scrollIntoView({ block: 'nearest' });
                    // **Set focus to the selected item**
                    selectedItem.focus();
                } else {
                    // **If no item is selected, focus the search input**
                    searchInput.focus();
                }
            };
            
            // [1.2.3] Keyboard event handling
            document.addEventListener('keydown', (e) => {
                // [1.2.3.1] Global search shortcut (Ctrl+K or Cmd+K)
                if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    window.tourSearchFunctions.toggleSearch(true);
                }

                // [1.2.3.2] Skip if search not visible
                if (!searchContainer.classList.contains('visible')) return;

                // [1.2.3.4] Handle navigation keys (excluding Tab)
                switch(e.key) {
                    case 'Escape':
                        e.preventDefault();
                        searchInput.value = '';
                        performSearch();
                        selectedIndex = -1;
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        updateSelection(Math.min(selectedIndex + 1, resultItems.length - 1));
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        updateSelection(Math.max(selectedIndex - 1, -1));
                        if (selectedIndex === -1) searchInput.focus();
                        break;
                    case 'Enter':
                        e.preventDefault();
                        if (selectedIndex >= 0 && selectedIndex < resultItems.length) {
                            resultItems[selectedIndex].click();
                        }
                        break;
                }
            });

            // [1.2.4] Keyup event handling for search input
            searchInput.addEventListener('keyup', window.tourSearchFunctions.debounce(() => {
                // [1.2.4.1] Reset selection index when typing
                selectedIndex = -1;
            }, 200));

            // [1.2.5] Enter key handling in search input
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    // [1.2.5.1] Get the result items
                    resultItems = searchContainer.querySelectorAll('.result-item');
                    // [1.2.5.2] If there are results, select the first one
                    if (resultItems.length > 0) {
                        resultItems[0].click();
                    }
                }
            });
        }
    },
    // [1.3] UTILITY FUNCTIONS
    debounce: function(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    },

    // Add this with your utility functions
    preprocessSearchTerm: function(term) {
        // If the term contains numbers or special characters, make the matching exact
        if (/[0-9\-_]/.test(term)) {
           // return `="${term}"`;  // Use exact matching syntax for Fuse.js
            return `'${term}`; // Use Fuse.js prefix-search for better partial matches
        }
        return term;
    },

    // [2.0] MAIN SEARCH INITIALIZATION
    initializeSearch: function(tour) {
        console.log('Initializing enhanced search...');
        if (window.searchListInitiinitialized) return;
        // [2.1] Basic initialization and validation
        const searchContainer = document.getElementById('searchContainer');
        if (!searchContainer || !tour || !tour.mainPlayList) {
            console.warn('Search initialization failed: missing requirements');
            return;
        }

        // [2.2] Search field creation
        if (!searchContainer.querySelector('#tourSearch')) {
            const searchField = document.createElement('div');
            searchField.className = 'search-field';
            searchField.innerHTML = `
                <input type="text" id="tourSearch" placeholder="Search tour..." autocomplete="off">
                <div class="icon-container">
                    <div class="search-icon" aria-hidden="true"></div>
                    <button class="clear-button" aria-label="Clear search">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            `;
            searchContainer.insertBefore(searchField, searchContainer.firstChild);
        }

        let currentSearchTerm = '';
        let fuse;

// [2.3] Search Configuration (WHITELIST IMPLEMENTATION and BLACKLIST CONFIGURATION)       
/* 
============================================================
WHITELIST IMPLEMENTATION GUIDE
============================================================
This section enables whitelist functionality. Only items with a label or
subtitle that appears in the allowedValues array will be indexed for search.
Items with neither label nor subtitle in the allowed list will be skipped.

TO ENABLE WHITELIST:
1. Remove the comment markers around this entire whitelist block.
2. Customize the allowedValues array with the exact panorama titles or subtitles you want.
   For example, change:
       const allowedValues = ['Room-1', 'Room-3'];
   to:
       const allowedValues = ['East View', 'South-East View', 'Building A'];
3. IMPORTANT: Disable the default (generic) prepareFuse function (the one below this block) to avoid conflicts.
============================================================
*/
// --- Begin Whitelist Block (Uncomment to enable whitelist) ---
/*  // <-- Remove this opening marker (The * and the / symbols) when enabling whitelist

// [2.3.1] Search Configuration (WHITELIST IMPLEMENTATION)
const prepareFuse = () => {
    // Data preparation for whitelist
    const items = tour.mainPlayList.get('items');
    const fuseData = [];

    // Define allowed labels and subtitles - items matching these values will be indexed
    const allowedValues = [
        'Room-1',    // Change 'Room-1' to 'Kitchen' or to desired panorama title/subtitle
        'Room-2',    // Change 'Room-2' to 'Master Bedroom' or to desired panorama title/subtitle
        'Room-3',    // Change 'Room-3' to 'Bathroom' or to desired panorama title/subtitle
    ];

    items.forEach((item, index) => {
        try {
            const media = item.get('media');
            const data = media.get('data');
            const label = data?.label?.trim(); // Remove extra whitespace
            const subtitle = data?.subtitle?.trim();

            // Handle items with no label
            if (!label) {
                // Determine if this unlabeled item should be included
                const hasSubtitle = Boolean(subtitle);
                const hasTags = Array.isArray(data?.tags) && data.tags.length > 0;
                
                // Check if we should include this item based on what content it has
                const shouldInclude = 
                    (hasSubtitle && window.tourSearchFunctions.config.includeContent.unlabeledWithSubtitles) ||
                    (hasTags && window.tourSearchFunctions.config.includeContent.unlabeledWithTags) ||
                    (!hasSubtitle && !hasTags && window.tourSearchFunctions.config.includeContent.completelyBlank);
                
                // Skip if we shouldn't include this item
                if (!shouldInclude) return;
                
                // Check if subtitle is in the whitelist
                if (hasSubtitle && !allowedValues.includes(subtitle)) {
                    console.log(`Skipping unlabeled item with non-whitelisted subtitle: ${subtitle}`);
                    return;
                }
            } else {
                // If the label is not in the allowed list, check subtitle
                if (!allowedValues.includes(label)) {
                    // Also check if subtitle is in whitelist
                    if (!subtitle || !allowedValues.includes(subtitle)) {
                        console.log(`Skipping non-whitelisted item: ${label || subtitle || 'Untitled'}`);
                        return;
                    }
                }
            }

            // Determine display label
            let displayLabel = label || '';
            
            // If no label, try to use alternative content as label based on configuration
            if (!label) {
                if (subtitle && window.tourSearchFunctions.config.useAsLabel.subtitles) {
                    displayLabel = subtitle;
                } else if (Array.isArray(data?.tags) && data.tags.length > 0 && 
                           window.tourSearchFunctions.config.useAsLabel.tags) {
                    displayLabel = data.tags.join(', ');
                } else {
                    // For completely blank items, use a placeholder label
                    displayLabel = "[Untitled Item]";
                }
                
                // Truncate if too long
                if (displayLabel.length > 40) {
                    displayLabel = displayLabel.substring(0, 40) + '...';
                }
            }

            fuseData.push({
                type: 'media',
                index,
                label: displayLabel,
                originalLabel: (data && data.label) || '',
                subtitle: subtitle || '',
                tags: Array.isArray(data?.tags) ? data.tags : [],
                item,
                boost: label ? 1.5 : 1.0  // Give slightly lower boost to unlabeled items
            });
        } catch (error) {
            console.warn(`Error processing item at index ${index}:`, error);
        }
    });

    // Fuse configuration
    fuse = new Fuse(fuseData, {
        keys: [
            { name: 'label', weight: 1 },
            { name: 'subtitle', weight: 0.8 },  // Add subtitle with high weight
            { name: 'tags', weight: 0.6 },      // Increased from 0.2 to 0.6
        ],
        includeScore: true,
        threshold: 0.4,         // Higher threshold allows more matches
        distance: 40,           // Better partial matching
        minMatchCharLength: 1,  // Even single characters can match
        useExtendedSearch: true,
        ignoreLocation: true,  // Match from beginning of words
        location: 0
    });
};

 */ // <-- Remove this closing marker (The / and the * symbols) when enabling whitelist
// --- End Whitelist Block ---

/* 
IMPORTANT: If you enable the whitelist block above, please comment out or remove the 
generic [2.3.2] Search Configuration block below (which includes blacklist options) to avoid conflicts.
*/

/* 
============================================================
BLACKLIST IMPLEMENTATION GUIDE (Optional)
============================================================
This section enables blacklist functionality. Items with labels or subtitles
in the blacklistedValues array will be excluded from the search index.

TO ENABLE BLACKLIST:
1. Remove the comment markers around this entire blacklist block.
2. Customize the blacklistedValues array with the panorama titles or subtitles you want to exclude.
   For example, change:
       const blacklistedValues = ['Room-1', 'Room-2'];
   to:
       const blacklistedValues = ['Kitchen', 'Bathroom', 'Building A'];
3. Ensure that only one search configuration (whitelist OR blacklist) is active.
============================================================
*/

// --- Begin Blacklist Block (Uncomment to enable blacklist) ---
// [2.3.2] Search Configuration (BLACKLIST VERSION)
// Uncomment the following block to enable blacklist functionality instead:

/*  // <-- Remove this opening marker (The / and the * symbols) when enabling blacklist

const prepareFuse = () => {
    const items = tour.mainPlayList.get('items');
    const fuseData = [];

    // Define blacklisted labels and subtitles
    const blacklistedValues = [
        'Room-1',    // Panorama to exclude from search
        'Room-2',    // Panorama to exclude from search
        'Building A' // Panorama with subtitle "Building A" to exclude
    ];

    items.forEach((item, index) => {
        try {
            const media = item.get('media');
            const data = media.get('data');
            const label = data?.label?.trim();
            const subtitle = data?.subtitle?.trim();
            
            // Handle items with no label
            if (!label) {
                // Determine if this unlabeled item should be included
                const hasSubtitle = Boolean(subtitle);
                const hasTags = Array.isArray(data?.tags) && data.tags.length > 0;
                
                // Check if we should include this item based on what content it has
                const shouldInclude = 
                    (hasSubtitle && window.tourSearchFunctions.config.includeContent.unlabeledWithSubtitles) ||
                    (hasTags && window.tourSearchFunctions.config.includeContent.unlabeledWithTags) ||
                    (!hasSubtitle && !hasTags && window.tourSearchFunctions.config.includeContent.completelyBlank);
                
                // Skip if we shouldn't include this item
                if (!shouldInclude) return;
                
                // Check if subtitle is blacklisted (for unlabeled items)
                if (hasSubtitle && blacklistedValues.includes(subtitle)) {
                    console.log(`Skipping blacklisted subtitle: ${subtitle}`);
                    return;
                }
            } else {
                // Check if labeled item's title is in blacklist
                if (blacklistedValues.includes(label)) {
                    console.log(`Skipping blacklisted label: ${label}`);
                    return;
                }
                
                // Also check if subtitle is blacklisted
                if (subtitle && blacklistedValues.includes(subtitle)) {
                    console.log(`Skipping item with blacklisted subtitle: ${subtitle}`);
                    return;
                }
            }

            // Determine display label
            let displayLabel = label || '';
            
            // If no label, try to use alternative content as label based on configuration
            if (!label) {
                if (subtitle && window.tourSearchFunctions.config.useAsLabel.subtitles) {
                    displayLabel = subtitle;
                } else if (Array.isArray(data?.tags) && data.tags.length > 0 && 
                           window.tourSearchFunctions.config.useAsLabel.tags) {
                    displayLabel = data.tags.join(', ');
                } else {
                    // For completely blank items, use a placeholder label
                    displayLabel = "[Untitled Item]";
                }
                
                // Truncate if too long
                if (displayLabel.length > 40) {
                    displayLabel = displayLabel.substring(0, 40) + '...';
                }
            }

            fuseData.push({
                type: 'media',
                index,
                label: displayLabel,
                originalLabel: (data && data.label) || '',
                subtitle: subtitle || '',
                tags: Array.isArray(data?.tags) ? data.tags : [],
                item,
                boost: label ? 1.5 : 1.0  // Give slightly lower boost to unlabeled items
            });
        } catch (error) {
            console.warn(`Error processing item at index ${index}:`, error);
        }
    });

    fuse = new Fuse(fuseData, {
        keys: [
            { name: 'label', weight: 1 },
            { name: 'subtitle', weight: 0.8 },  // Add subtitle with high weight
            { name: 'tags', weight: 0.6 },      // Increased from 0.2 to 0.6
        ],
        includeScore: true,
        threshold: 0.4,         // Higher threshold allows more matches
        distance: 40,           // Better partial matching
        minMatchCharLength: 1,  // Even single characters can match
        useExtendedSearch: true,
        ignoreLocation: true,  // Match from beginning of words
        location: 0
    });
};

// IMPORTANT: If you enable the blacklist block above, please comment out or remove the generic [2.3.1] Search Configuration block below (which includes white options) to avoid conflicts.

*/ // <-- Remove this closing marker (The / and the * symbols) when enabling blacklist
// --- End Blacklist Block ---

/* 
VERY IMPORTANT: If you enable either WHITELIST or BLACKLIST block above, please comment out or remove the 
entire block  [2.3.3] Fuse configuration block below to avoid conflicts.
*/
// [2.3.3] Fuse configuration
const prepareFuse = () => {
    const items = tour.mainPlayList.get('items');
    const fuseData = [];
    
    items.forEach((item, index) => {
        try {
            const media = item.get('media');
            const data = media.get('data');
            const label = data?.label?.trim();
            
            // Handle items with no label
            // Handle items with no label
if (!label) {
    // Determine if this unlabeled item should be included
    const hasSubtitle = Boolean(data?.subtitle);
    const hasTags = Array.isArray(data?.tags) && data.tags.length > 0;
    
    // Check if we should include this item based on what content it has
    const shouldInclude = 
        (hasSubtitle && window.tourSearchFunctions.config.includeContent.unlabeledWithSubtitles) ||
        (hasTags && window.tourSearchFunctions.config.includeContent.unlabeledWithTags) ||
        (!hasSubtitle && !hasTags && window.tourSearchFunctions.config.includeContent.completelyBlank);
    
    // Skip if we shouldn't include this item
    if (!shouldInclude) return;
}

// Determine display label
let displayLabel = label || '';

// If no label, try to use alternative content as label based on configuration
if (!label) {
    if (data?.subtitle && window.tourSearchFunctions.config.useAsLabel.subtitles) {
        displayLabel = data.subtitle.trim();
    } else if (Array.isArray(data?.tags) && data.tags.length > 0 && 
              window.tourSearchFunctions.config.useAsLabel.tags) {
        displayLabel = data.tags.join(', ');
    } else {
        // For completely blank items, use a placeholder label
        displayLabel = "[Untitled Item]";
    }
    
    // Truncate if too long
    if (displayLabel.length > 40) {
        displayLabel = displayLabel.substring(0, 40) + '...';
    }
}
            
            fuseData.push({
                type: 'media',
                index,
                label: displayLabel,
                originalLabel: (data && data.label) || '',
                subtitle: data?.subtitle || '',
                tags: Array.isArray(data?.tags) ? data.tags : [],
                item,
                boost: label ? 1.5 : 1.0  // Give slightly lower boost to unlabeled items
            });
        } catch (error) {
            console.warn(`Error processing item at index ${index}:`, error);
        }
    });

    // Fuse configuration
    fuse = new Fuse(fuseData, {
        keys: [
            { name: 'label', weight: 1 },
            { name: 'subtitle', weight: 0.8 },  // Add subtitle with high weight
            { name: 'tags', weight: 0.6 },      // Increased from 0.2 to 0.6
        ],
        includeScore: true,
        threshold: 0.4,         // Higher threshold allows more matches
        distance: 40,           // Better partial matching
        minMatchCharLength: 1,  // Even single characters can match
        useExtendedSearch: true,
        ignoreLocation: true,   // Match from beginning of words
        location: 0
    });
};

        // [2.4] Utility Functions
        const highlightMatch = (text, term) => {
            if (!term) return text;
            const regex = new RegExp(`(${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
            return text.replace(regex, '<mark>$1</mark>');
        };

        // [2.5] UI Components - Change the svg for new icons
        const getTypeIcon = (type) => {
            const icons = {
                media: `<svg xmlns="http://www.w3.org/2000/svg" class="search-result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
</svg>`
            };
            return icons[type] || '';
        };

        // [2.6] History UI Component
        const renderSearchHistory = () => {
            const history = this.searchHistory.get();
            if (history.length === 0) return '';

            return `
                <div class="search-history">
                    <div class="history-header">
                        <h3>Recent Searches</h3>
                        <button class="clear-history">Clear</button>
                    </div>
                    <div class="history-items">
                        ${history.map(term => `
                            <button class="history-item">
                                <svg class="history-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10s10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8s8 3.589 8 8s-3.589 8-8 8zm1-8h4v2h-6V7h2v5z"/>
                                </svg>
                                ${term}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        };

        // [2.7] Shortcuts UI Component
        const renderShortcuts = () => `
            <div class="search-shortcuts">
                <div class="shortcut">
                    <kbd>↑</kbd><kbd>↓</kbd>
                    <span>to navigate</span>
                </div>
                <div class="shortcut">
                    <kbd>Enter</kbd>
                    <span>to select</span>
                </div>
                <div class="shortcut">
                    <kbd>Esc</kbd>
                    <span>to close</span>
                </div>
            </div>
        `;

        // [2.8] Results Processing
        const groupAndSortResults = (matches) => {
            const grouped = matches.reduce((acc, match) => {
                const type = match.item.type;
                if (!acc[type]) acc[type] = [];
                acc[type].push(match);
                return acc;
            }, {});

            Object.keys(grouped).forEach(type => {
                grouped[type].sort((a, b) => {
                    return a.item.label.localeCompare(b.item.label);
                });
            });

            return grouped;
        };

        // [3.0] MAIN SEARCH FUNCTION
        const performSearch = () => {
            // [3.1] Initialize DOM elements
            const searchInput = searchContainer.querySelector('#tourSearch');
            const searchTerm = searchInput.value.trim();
            const clearButton = searchContainer.querySelector('.clear-button');
            const searchIcon = searchContainer.querySelector('.search-icon');
            const resultsList = searchContainer.querySelector('.results-section');
            const noResults = searchContainer.querySelector('.no-results');
            const resultsContainer = searchContainer.querySelector('.search-results');

            // [3.2] Handle search input visibility states
            if (searchTerm.length > 0) {
                clearButton.classList.add('visible');
                searchIcon.style.opacity = '0';
            } else {
                clearButton.classList.remove('visible');
                searchIcon.style.opacity = '1';
            }
            // [3.3] Check for search term changes
            if (searchTerm === currentSearchTerm) return;
            currentSearchTerm = searchTerm;
            // [3.4] Reset results list
            resultsList.innerHTML = '';
            // [3.5] Handle empty search state
            if (!searchTerm) {
                noResults.style.display = 'none';
                resultsContainer.classList.remove('visible');
                resultsList.innerHTML = renderSearchHistory();
                return;
            }
            // [3.5.1] Check minimum character requirement (except for wildcard searches)
            if (searchTerm !== '*' && searchTerm.length < window.tourSearchFunctions.config.minSearchChars) {
                noResults.style.display = 'none';
                resultsContainer.classList.remove('visible');
                resultsList.innerHTML = `
                    <div class="search-min-chars">
                        <p>Please type at least ${window.tourSearchFunctions.config.minSearchChars} characters to search</p>
                    </div>
                `;
                return;
            }
            // [3.6] Show results container with animation
            resultsContainer.style.display = 'block';
            setTimeout(() => resultsContainer.classList.add('visible'), 10);
            
            try {
                // [3.7] Perform search operation
                let matches;
                if (searchTerm === '*') {
                    // [3.7.1] Handle wildcard search
                    matches = fuse._docs.map((item, index) => ({
                        item,
                        score: 0,
                        refIndex: index
                    }));
                } else {
                    // [3.7.2] Process and perform fuzzy search using the new utility function
                    const processedTerm = window.tourSearchFunctions.preprocessSearchTerm(searchTerm);
                    matches = typeof processedTerm === 'string' && processedTerm.startsWith('=') 
                        ? fuse.search({ $or: [{ label: processedTerm }] })
                        : fuse.search(processedTerm);
                }

                console.log('Search matches:', matches.map(match => ({
                    item: match.item,
                    score: match.score,
                    matched: match.matchedOn // May not be available depending on Fuse.js version
                })));


                // [3.8] Handle no results state
                if (matches.length === 0) {
                    resultsList.style.display = 'none';
                    noResults.style.display = 'flex';
                    return;
                }
                // [3.9] Display search results
                resultsList.style.display = 'block';
                noResults.style.display = 'none';
                // [3.10] Process and group results
                const groupedResults = groupAndSortResults(matches);
                // [3.11] Render result groups
                Object.entries(groupedResults).forEach(([type, results]) => {
                    // [3.11.1] Create group container
                    const groupEl = document.createElement('div');
                    groupEl.className = 'results-group';
                    groupEl.innerHTML = `
                        <div class="group-header">
                            <span class="group-title">${type}</span>
                            <span class="group-count">${results.length} result${results.length !== 1 ? 's' : ''}</span>
                        </div>
                    `;
                    // [3.11.2] Process individual results
                    results.forEach((result) => {
                        // [3.11.3] Create result item
                        const resultItem = document.createElement('div');
                        resultItem.className = 'result-item';
                        resultItem.setAttribute('role', 'option');
                        resultItem.setAttribute('tabindex', '0');
                        resultItem.dataset.type = result.item.type;
                        // [3.11.4] Set result item content
                        resultItem.innerHTML = `
                            <div class="result-icon">${getTypeIcon(result.item.type)}</div>
                            <div class="result-content">
                                <div class="result-text">${highlightMatch(result.item.label, searchTerm)}</div>
                                ${result.item.tags && result.item.tags.length > 0 ? `
                                    <div class="result-tags">
                                        Tags: ${highlightMatch(Array.isArray(result.item.tags) 
                                        ? result.item.tags.join(', ') 
                                        : result.item.tags, searchTerm)}
                                    </div>
                                ` : ''}
                                ${result.item.description ? `
                                    <div class="result-description">${highlightMatch(result.item.description, searchTerm)}</div>
                                ` : ''}
                            </div>
                        `;
                // [3.11.5] Add click handler
                    resultItem.addEventListener('click', () => {
                            tour.mainPlayList.set('selectedIndex', result.item.index);
                            window.tourSearchFunctions.searchHistory.save(searchTerm);
                            searchInput.value = '';
                            searchInput.focus();
                    
                        // [3.11.6] Auto-hide Search
                        // Check if device is mobile before auto-hiding
                        const isMobile = window.innerWidth <= window.tourSearchFunctions.config.mobileBreakpoint;
    
                        // Check configuration to determine if search should be hidden
                        if ((isMobile && window.tourSearchFunctions.config.autoHide.mobile) || 
                            (!isMobile && window.tourSearchFunctions.config.autoHide.desktop)) {
                            window.tourSearchFunctions.toggleSearch(false);
                        }
                    });
                    
                    groupEl.appendChild(resultItem);
                                        }); // This closes the results.forEach loop
                                        
                                        resultsList.appendChild(groupEl);
                                    }); // This closes the Object.entries(groupedResults).forEach loop
                    
                                    // [3.12] Add keyboard shortcuts guide
                                    resultsList.insertAdjacentHTML('beforeend', renderShortcuts());
                                    // [3.13] Error handling
                                } catch (error) {
                                    console.warn('Search error:', error);
                                }
                            };

        // [4.0] INITIALIZATION AND EVENT BINDING
        prepareFuse();

        // Add custom CSS for hiding tags
        const style = document.createElement('style');
        style.textContent = `.result-tags { display: ${window.tourSearchFunctions.config.showTagsInResults ? 'block' : 'none'}; }`;
        if (!document.getElementById('search-custom-styles')) {
            style.id = 'search-custom-styles';
            document.head.appendChild(style);
        }
        // [4.1] Element Selection
        const searchInput = searchContainer.querySelector('#tourSearch');
        const clearButton = searchContainer.querySelector('.clear-button');
        
        
        // [4.2] Event Listeners
        // [4.2.1] Input handling
        searchInput.addEventListener('input', this.debounce(performSearch, 100));
        
        // [4.2.2] Clear button
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                searchInput.value = '';
                performSearch();
                searchInput.focus();
            });
        }

        // [4.2.3] Search icon
        const searchIcon = searchContainer.querySelector('.search-icon');
        if (searchIcon) {
            searchIcon.style.cursor = 'pointer';
            searchIcon.addEventListener('click', () => {
                searchInput.value = '*';
                performSearch();
            });
        }

        // [4.3] Keyboard Navigation Setup
        this.keyboardManager.init(searchContainer, searchInput, performSearch);

        // [4.4] Container Click Events
        searchContainer.addEventListener('click', (e) => {
            // [4.4.1] History item click
            if (e.target.closest('.history-item')) {
                const term = e.target.closest('.history-item').textContent.trim();
                searchInput.value = term;
                performSearch();
            }
            // [4.4.2] Clear history click
            if (e.target.closest('.clear-history')) {
                this.searchHistory.clear();
                performSearch();
            }
        });
        // [4.5] Initialization Complete
        window.searchListInitiinitialized = true;
        console.log('Enhanced search initialized successfully');
    },

    // [5.0] SEARCH VISIBILITY TOGGLE
toggleSearch: function(show) {
    // [5.1] Element Selection
    const searchContainer = document.getElementById('searchContainer');
    if (!searchContainer) return;

    const resultsContainer = searchContainer.querySelector('.search-results');
    const searchInput = searchContainer.querySelector('#tourSearch');
    const clearButton = searchContainer.querySelector('.clear-button');
    const searchIcon = searchContainer.querySelector('.search-icon');
    
    // [5.2] Show Search
    if (show) {
        searchContainer.style.display = 'block';
        
        // Add viewport-aware positioning
        const viewportHeight = window.innerHeight;
        const searchContainerRect = searchContainer.getBoundingClientRect();
        const searchContainerTop = searchContainerRect.top;
        const searchContainerHeight = searchContainerRect.height;
        
        // If the container would go off-screen, adjust its position
        if (searchContainerTop + searchContainerHeight > viewportHeight) {
            const newTop = Math.max(10, viewportHeight - searchContainerHeight - 20);
            searchContainer.style.top = newTop + 'px';
        }
        
        requestAnimationFrame(() => {
            searchContainer.classList.add('visible');
            if (searchInput) {
                searchInput.focus();
                searchInput.dispatchEvent(new Event('input'));
            }
        });
        
    // [5.3] Hide Search
    } else {
        searchContainer.classList.remove('visible');
        if (resultsContainer) {
            resultsContainer.classList.remove('visible');
        }
        setTimeout(() => {
            searchContainer.style.display = 'none';
            if (searchInput) {
                searchInput.value = '';
            }
            if (clearButton) {
                clearButton.classList.remove('visible');
            }
            if (searchIcon) {
                searchIcon.style.opacity = '1';
            }
            
            // Reset the top position when hiding
            searchContainer.style.top = ''; // This resets to the CSS default
            
        }, 200);
    }
}
};
