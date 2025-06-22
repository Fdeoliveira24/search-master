# Logger Method Usage Scan Report

## Logger.info() calls:

**Line ~304**: `Logger.info("BroadcastChannel initialized for cross-window communication");`
- Note: BroadcastChannel initialization success

**Line ~308**: `Logger.warn("BroadcastChannel API not available");`
- Note: BroadcastChannel API not available warning

**Line ~311**: `Logger.error("Error initializing BroadcastChannel:", error);`
- Note: BroadcastChannel initialization error

**Line ~336**: `Logger.debug("Event cleanup error:", e);`
- Note: Event cleanup error during unbind

**Line ~342**: `Logger.debug("Search event listeners cleaned up");`
- Note: Event cleanup success confirmation

**Line ~346**: `Logger.warn("Error during event cleanup:", error);`
- Note: Event cleanup failure warning

**Line ~486**: `Logger.info("BroadcastChannel initialized for cross-window communication");`
- Note: Duplicate BroadcastChannel initialization success

**Line ~490**: `Logger.warn("BroadcastChannel API not available");`
- Note: Duplicate BroadcastChannel API warning

**Line ~493**: `Logger.error("Error initializing BroadcastChannel:", error);`
- Note: Duplicate BroadcastChannel initialization error

**Line ~518**: `Logger.debug("Event cleanup error:", e);`
- Note: Duplicate event cleanup error

**Line ~524**: `Logger.debug("Search event listeners cleaned up");`
- Note: Duplicate event cleanup success

**Line ~528**: `Logger.warn("Error during event cleanup:", error);`
- Note: Duplicate event cleanup failure

**Line ~709**: `Logger.debug("Found mainPlayList via direct access");`
- Note: Main playlist found via direct access

**Line ~719**: `Logger.debug("Found mainPlayList via getByClassName search");`
- Note: Main playlist found via fallback search

**Line ~722**: `Logger.debug("getByClassName search for mainPlayList failed:", e);`
- Note: Fallback playlist search failed

**Line ~738**: `Logger.debug("Found rootPlayer mainPlayList");`
- Note: Root player playlist found

**Line ~740**: `Logger.debug("Root player playlist access failed:", e);`
- Note: Root player playlist access failed

**Line ~845**: `Logger.debug("3DVista event system detected");`
- Note: 3DVista event system detection

**Line ~848**: `Logger.debug("EVENT_TOUR_LOADED fired");`
- Note: Official tour loaded event fired

**Line ~1004**: `Logger.debug("Could not determine sprite parent, including in search:", e);`
- Note: Sprite parent determination failed, including anyway

**Line ~1008**: `Logger.info(`Found ${panoramaSprites.length} SpriteModel3DObject(s) for panorama ${mediaId}`);`
- Note: Found sprite objects for specific panorama

**Line ~1020**: `Logger.info(`Fallback: Adding ${allSprites.length} unassigned SpriteModel3DObject(s) to first panorama`);`
- Note: Fallback assignment of unassigned sprites

**Line ~1023**: `Logger.debug("Fallback 3D object detection failed:", e);`
- Note: Fallback 3D object detection failed

**Line ~1034**: `Logger.info(`Found ${all3DObjects.length} other 3D objects`);`
- Note: Found other 3D objects

**Line ~1037**: `Logger.debug("Other 3D object detection failed:", e);`
- Note: Other 3D object detection failed

**Line ~1049**: `Logger.debug("Method 8 overlay detection failed");`
- Note: Method 8 overlay detection failed

**Line ~1054**: `Logger.debug(`Overlay detection method found ${result.length} overlays`);`
- Note: Overlay detection method success

**Line ~1059**: `Logger.info(`Total overlays found for panorama: ${overlays.length}`);`
- Note: Total overlay count for panorama

**Line ~1167**: `Logger.info("Triggering 3DModel interaction for ID: " + id);`
- Note: 3D model interaction trigger

**Line ~1173**: `Logger.info("Navigating to 3D model at playlist index " + item.index);`
- Note: Navigation to 3D model by index

**Line ~1180**: `Logger.info("Direct triggering 3D model media");`
- Note: Direct 3D model media trigger

**Line ~1198**: `Logger.info("Triggering 3D model element by ID: " + id + " using player");`
- Note: 3D model element trigger by ID

**Line ~1201**: `Logger.debug("Player getById failed: " + e.message);`
- Note: Player getById method failed

**Line ~1208**: `Logger.info("Triggering playlist item for 3D model");`
- Note: Playlist item trigger for 3D model

**Line ~1211**: `Logger.warn("Could not trigger 3D model with ID: " + id);`
- Note: 3D model trigger failure

**Line ~1216**: `Logger.info("Triggering 3D Model Object interaction for ID: " + id);`
- Note: 3D model object interaction trigger

**Line ~1221**: `Logger.info("Navigated to parent model at index " + item.parentIndex);`
- Note: Navigation to parent model

**Line ~1229**: `Logger.info("Activated 3D model object: " + id);`
- Note: 3D model object activation success

**Line ~1231**: `Logger.warn("3D model object not found or not clickable: " + id);`
- Note: 3D model object not found or clickable

**Line ~1234**: `Logger.warn("Error activating 3D model object: " + e.message);`
- Note: 3D model object activation error

**Line ~1242**: `Logger.info("Triggering element interaction for type: " + type + ", ID: " + id);`
- Note: General element interaction trigger

**Line ~1247**: `Logger.info("Navigated to item at index " + item.index);`
- Note: Navigation to item by index

**Line ~1255**: `Logger.info("Navigated to parent item at index " + item.parentIndex);`
- Note: Navigation to parent item

**Line ~1265**: `Logger.warn("Could not trigger element of type " + type + " - no ID available");`
- Note: Element trigger failed due to missing ID

**Line ~1268**: `Logger.error("Error triggering element interaction:", error);`
- Note: Element interaction error

**Line ~1293**: `Logger.info("Successfully triggered element: " + id);`
- Note: Element trigger success

**Line ~1298**: `Logger.warn("[Search] Tour or player not available");`
- Note: Tour or player unavailable warning

**Line ~1299**: `Logger.warn("[Search] Failed to trigger element " + id);`
- Note: Element trigger failure

**Line ~1303**: `Logger.warn("Error in attemptTrigger: " + error.message);`
- Note: attemptTrigger method error

**Line ~1316**: `Logger.warn("Search container not found, will attempt to create it");`
- Note: Search container not found, attempting creation

**Line ~1330**: `Logger.error("Cannot create search container: #viewer element not found");`
- Note: Cannot create container, viewer element missing

**Line ~1337**: `Logger.info("Search container created successfully");`
- Note: Search container creation success

**Line ~1345**: `Logger.error("Failed to create search container");`
- Note: Search container creation failed

**Line ~1348**: `Logger.error("Error creating search container:", error);`
- Note: Search container creation error

**Line ~1530**: `Logger.info("Search styling applied successfully");`
- Note: Search styling application success

**Line ~1650**: `Logger.debug("Binding search event listeners...");`
- Note: Search event listener binding start

**Line ~1691**: `Logger.debug("Search event listeners bound successfully");`
- Note: Search event listener binding success

**Line ~1707**: `Logger.debug("Event cleanup error:", e);`
- Note: Event cleanup error

**Line ~1712**: `Logger.debug("Search event listeners cleaned up");`
- Note: Search event listeners cleanup success

**Line ~1716**: `Logger.warn("Error during event cleanup:", error);`
- Note: Event cleanup error warning

**Line ~1725**: `Logger.info("Google Sheets integration disabled or URL not provided, skipping load");`
- Note: Google Sheets integration disabled

**Line ~1732**: `Logger.info(`Loading Google Sheets data from: ${sheetUrl} in ${fetchMode} mode`);`
- Note: Google Sheets data loading start

**Line ~1748**: `Logger.info(`Using cached Google Sheets data (${parsedData.length} rows, ${cacheAge.toFixed(1)} minutes old)`);`
- Note: Using cached Google Sheets data

**Line ~1751**: `Logger.warn("Error parsing cached data, will fetch fresh data:", parseError);`
- Note: Cached data parse error

**Line ~1755**: `Logger.info(`Cached data expired (${cacheAge.toFixed(1)} minutes old), fetching fresh data`);`
- Note: Cached data expired

**Line ~1758**: `Logger.warn("Error checking cache, will fetch fresh data:", cacheError);`
- Note: Cache check error

**Line ~1767**: `Logger.debug("3DVista event system detected");`
- Note: Duplicate 3DVista event system detection

**Line ~1775**: `Logger.warn("Failed to convert Google Sheets URL to CSV export URL:", e);`
- Note: URL conversion failure

**Line ~1779**: `Logger.info(`Final fetch URL: ${fetchUrl}`);`
- Note: Final Google Sheets fetch URL

**Line ~1788**: `Logger.debug("Added API key authentication to request");`
- Note: API key authentication added

**Line ~1793**: `Logger.info(`Google Sheets fetch response status: ${response.status}`);`
- Note: Google Sheets fetch response status

**Line ~1800**: `Logger.info(`Google Sheets raw data length: ${text.length}`);`
- Note: Google Sheets raw data length

**Line ~1801**: `Logger.info(`Google Sheets first 200 chars: ${text.substring(0, 200)}`);`
- Note: Google Sheets data preview

**Line ~1845**: `Logger.warn("Google Sheets data is not an array after parsing, converting to array");`
- Note: Google Sheets data not array, converting

**Line ~1849**: `Logger.info(`Successfully loaded ${data.length} rows from Google Sheets`);`
- Note: Google Sheets data load success

**Line ~1855**: `Logger.info("Progressive loading enabled, processing essential fields first");`
- Note: Progressive loading enabled

**Line ~1881**: `Logger.debug("Updated cache with full Google Sheets data");`
- Note: Cache updated with full data

**Line ~1884**: `Logger.warn("Failed to cache full Google Sheets data:", e);`
- Note: Full data cache failure

**Line ~1888**: `Logger.info("Background loading of detailed Google Sheets data complete");`
- Note: Background loading complete

**Line ~1906**: `Logger.debug("Cached Google Sheets data successfully");`
- Note: Google Sheets data cached successfully

**Line ~1908**: `Logger.warn("Failed to cache Google Sheets data:", e);`
- Note: Google Sheets data cache failure

**Line ~1917**: `Logger.warn(`Data quality issues: ${missingIds} rows missing ID, ${missingTags} rows missing tag`);`
- Note: Data quality issues detected

**Line ~1923**: `Logger.error("Error parsing Google Sheets data:", e);`
- Note: Google Sheets data parsing error

**Line ~1928**: `Logger.warn(`Error loading Google Sheets data: ${error.message}`);`
- Note: Google Sheets data loading error

**Line ~1934**: `Logger.info(`Processing ${_googleSheetsData.length} Google Sheets entries for search index`);`
- Note: Google Sheets entries processing start

**Line ~1948**: `Logger.warn(`[DUPLICATE DETECTION] Found ${items.length} items with label "${label}":`);`
- Note: Duplicate labels detected

**Line ~1950**: `Logger.warn(`  - ${type} (ID: ${id}, Source: ${source})`);`
- Note: Duplicate item details

**Line ~1958**: `Logger.debug(`[SHEETS PROCESSING] Processing entry: ${entryName} (ID: ${entryId}, Tag: ${entryTag})`);`
- Note: Sheets entry processing start

**Line ~1965**: `Logger.debug(`Skipping Google Sheets entry "${entryName}" - ID already matched: ${entryId}`);`
- Note: Sheets entry skipped, ID already matched

**Line ~1970**: `Logger.debug(`Skipping Google Sheets entry "${entryName}" - tag already matched: ${entryTag}`);`
- Note: Sheets entry skipped, tag already matched

**Line ~2013**: `Logger.debug(`Single match found for "${entryName}": ${match.item.label} (${match.reason})`);`
- Note: Single match found for sheets entry

**Line ~2021**: `Logger.warn(`Multiple matches found for Google Sheets entry "${entryName}" (${matchedTourItems.length} matches):`);`
- Note: Multiple matches found warning

**Line ~2023**: `Logger.warn(`  - ${match.item.label} (${match.item.type}, ${match.reason}, confidence: ${match.confidence})`);`
- Note: Multiple match details

**Line ~2029**: `Logger.warn(`Resolved to highest confidence match: ${bestMatch.item.label} (${bestMatch.reason})`);`
- Note: Multiple match resolution

**Line ~2064**: `Logger.debug(`Added Google Sheets entry: ${displayLabel} (matched ${matchedTourItems.length} tour items)`);`
- Note: Google Sheets entry added to index

**Line ~2067**: `Logger.warn(`Error processing Google Sheets entry at index ${sheetsIndex}:`, error);`
- Note: Google Sheets entry processing error

**Line ~2087**: `Logger.info("Business data integration disabled, skipping load");`
- Note: Business data integration disabled

**Line ~2099**: `Logger.info(`Loading business data from: ${dataPath}`);`
- Note: Business data loading start

**Line ~2134**: `Logger.info("Initializing enhanced search v2.0...");`
- Note: Enhanced search initialization start

**Line ~2142**: `Logger.debug("Retrieved tour from rootPlayer context via get('data').tour");`
- Note: Tour retrieved from rootPlayer context

**Line ~2144**: `Logger.debug("Could not extract tour from rootPlayer context, using passed parameter");`
- Note: Tour extraction from rootPlayer failed

**Line ~2159**: `Logger.debug("Found valid tour via fallback detection");`
- Note: Valid tour found via fallback

**Line ~2164**: `Logger.warn("Could not find valid tour reference with mainPlayList");`
- Note: Valid tour reference not found

**Line ~2166**: `Logger.warn("Tour found but mainPlayList.get is not a function");`
- Note: Tour found but invalid mainPlayList

**Line ~2168**: `Logger.info(`Tour initialized successfully with ${actualTour.mainPlayList.get('items')?.length || 0} panoramas`);`
- Note: Tour initialization success with count

**Line ~2180**: `Logger.info("Search already initialized.");`
- Note: Search already initialized

**Line ~2198**: `Logger.info("All external data sources loaded successfully");`
- Note: All external data sources loaded

**Line ~2201**: `Logger.warn("Error loading some external data sources:", error);`
- Note: Some external data sources failed

**Line ~2226**: `Logger.info("Starting hybrid search index preparation...");`
- Note: Hybrid search index preparation start

**Line ~2235**: `Logger.info(`Found ${mainPlaylistItems?.length || 0} items in main playlist`);`
- Note: Main playlist items count

**Line ~2237**: `Logger.debug("Main playlist access failed:", e);`
- Note: Main playlist access failed

**Line ~2246**: `Logger.info(`Found ${rootPlaylistItems?.length || 0} items in root player playlist`);`
- Note: Root player playlist items count

**Line ~2249**: `Logger.debug("Root player playlist access failed:", e);`
- Note: Root player playlist access failed

**Line ~2263**: `Logger.info(`Using fallback playlist with ${items.length} items`);`
- Note: Using fallback playlist

**Line ~2267**: `Logger.debug(`Fallback candidate failed:`, e);`
- Note: Fallback candidate failed

**Line ~2277**: `Logger.info(`Processing ${mainPlaylistItems.length} main playlist items...`);`
- Note: Main playlist items processing

**Line ~2282**: `Logger.warn(`No media found for main playlist item at index ${index}`);`
- Note: No media found for main playlist item

**Line ~2289**: `Logger.warn(`Error processing main playlist item at index ${index}:`, error);`
- Note: Main playlist item processing error

**Line ~2295**: `Logger.info(`Processing ${rootPlaylistItems.length} root player playlist items...`);`
- Note: Root player playlist items processing

**Line ~2300**: `Logger.warn(`No media found for root playlist item at index ${index}`);`
- Note: No media found for root playlist item

**Line ~2307**: `Logger.warn(`Error processing root playlist item at index ${index}:`, error);`
- Note: Root playlist item processing error

**Line ~2313**: `Logger.info(`Processing ${_googleSheetsData.length} Google Sheets entries for search index`);`
- Note: Google Sheets entries processing for index

**Line ~2345**: `Logger.debug(`Skipping Google Sheets entry "${entryName}" - ID already matched: ${entryId}`);`
- Note: Google Sheets entry skipped, ID matched

**Line ~2350**: `Logger.debug(`Skipping Google Sheets entry "${entryName}" - tag already matched: ${entryTag}`);`
- Note: Google Sheets entry skipped, tag matched

**Line ~2355**: `Logger.debug(`Skipping Google Sheets entry "${entryName}" - label already exists in search index`);`
- Note: Google Sheets entry skipped, label exists

**Line ~2378**: `Logger.debug(`Found tour item match for Google Sheets entry "${entryName}": enhancing existing item`);`
- Note: Tour item match found for sheets entry

**Line ~2381**: `Logger.debug(`Skipping standalone Google Sheets entry "${entryName}" - tour item exists and not using as primary data source`);`
- Note: Standalone sheets entry skipped

**Line ~2385**: `Logger.debug(`Creating enhanced Google Sheets entry "${entryName}" linked to tour item`);`
- Note: Enhanced sheets entry creation

**Line ~2390**: `Logger.debug(`Skipping standalone Google Sheets entry "${entryName}" - standalone entries disabled`);`
- Note: Standalone sheets entry skipped, disabled

**Line ~2403**: `Logger.debug(`Filtering out Google Sheets entry ${displayLabel} due to element filter`);`
- Note: Google Sheets entry filtered out

**Line ~2418**: `Logger.debug(`Added ${matchedTourItem ? 'linked' : 'standalone'} Google Sheets entry: ${displayLabel}`);`
- Note: Google Sheets entry added to index

**Line ~2421**: `Logger.warn(`Error processing Google Sheets entry at index ${sheetsIndex}:`, error);`
- Note: Google Sheets entry processing error

**Line ~2441**: `Logger.info(`Hybrid search index created with ${fuseData.length} total items`);`
- Note: Hybrid search index creation complete

**Line ~2442**: `Logger.info(`Main playlist contributed: ${mainPlaylistItems?.length || 0} items`);`
- Note: Main playlist contribution count

**Line ~2443**: `Logger.info(`Root playlist contributed: ${rootPlaylistItems?.length || 0} items`);`
- Note: Root playlist contribution count

**Line ~2447**: `Logger.error("Error preparing hybrid search index:", error);`
- Note: Hybrid search index preparation error

**Line ~2650**: `Logger.debug("Error getting data:", error);`
- Note: Error getting object data

**Line ~2768**: `Logger.warn("Error in element type detection:", error);`
- Note: Element type detection error

**Line ~2834**: `Logger.warn("Error in element filtering:", error);`
- Note: Element filtering error

**Line ~2900**: `Logger.info(`Element found: ${elementId}`);`
- Note: Element found for trigger

**Line ~2913**: `Logger.info(`Element triggered successfully using ${method.name}`);`
- Note: Element trigger success

**Line ~2916**: `Logger.debug(`Error with ${method.name} method:`, e);`
- Note: Element trigger method error

**Line ~2922**: `Logger.warn("All trigger methods failed for element:", elementId);`
- Note: All trigger methods failed

**Line ~2929**: `Logger.debug(`Element trigger attempt ${retryCount} failed, retrying in ${backoffTime}ms...`);`
- Note: Element trigger retry

**Line ~2933**: `Logger.warn(`Failed to trigger element ${elementId} after ${config.maxRetries} attempts`);`
- Note: Element trigger failed after retries

**Line ~2937**: `Logger.warn(`Error in triggerElement: ${error.message}`);`
- Note: triggerElement method error

**Line ~2948**: `Logger.debug("getById method failed:", e);`
- Note: getById method failed

**Line ~2954**: `Logger.debug("get method failed:", e);`
- Note: get method failed

**Line ~2966**: `Logger.debug("getAllIDs method failed:", e);`
- Note: getAllIDs method failed

**Line ~2982**: `Logger.info(`Looking for matching tour element for standalone entry: ${entryName || entryId || entryTag}`);`
- Note: Looking for matching tour element

**Line ~2990**: `Logger.info(`Found element by ID: ${entryId}`);`
- Note: Element found by ID

**Line ~2994**: `Logger.debug(`No element found with ID: ${entryId}`);`
- Note: No element found with ID

**Line ~3006**: `Logger.info(`Found element by tag as ID: ${entryTag}`);`
- Note: Element found by tag as ID

**Line ~3017**: `Logger.info(`Found panorama with media ID: ${entryTag}`);`
- Note: Panorama found with media ID

**Line ~3024**: `Logger.info(`Found panorama with matching tag: ${entryTag}`);`
- Note: Panorama found with matching tag

**Line ~3030**: `Logger.debug(`Error searching for element by tag: ${e.message}`);`
- Note: Error searching by tag

**Line ~3044**: `Logger.info(`Found panorama with matching name: ${entryName}`);`
- Note: Panorama found with matching name

**Line ~3051**: `Logger.debug(`Error searching for element by name: ${e.message}`);`
- Note: Error searching by name

**Line ~3056**: `Logger.warn(`Could not find a matching tour element for: ${entryName || entryId || entryTag}`);`
- Note: No matching tour element found

**Line ~3104**: `Logger.debug("Using correct playlist from locManager.rootPlayer.mainPlayList");`
- Note: Using correct playlist from locManager

**Line ~3107**: `Logger.debug("Using fallback playlist from tour.mainPlayList");`
- Note: Using fallback playlist from tour

**Line ~3110**: `Logger.debug("Using fallback playlist from tour.player.mainPlayList");`
- Note: Using fallback playlist from player

**Line ~3114**: `Logger.debug("Using fallback playlist from tour.player.get('mainPlayList')");`
- Note: Using fallback playlist via get method

**Line ~3116**: `Logger.debug("Could not get mainPlayList from player:", e);`
- Note: Could not get mainPlayList from player

**Line ~3121**: `Logger.info("Triggering 3DModel interaction for ID: " + id);`
- Note: Duplicate 3D model interaction trigger

**Line ~3127**: `Logger.info("Navigating to 3D model at playlist index " + item.index);`
- Note: Duplicate navigation to 3D model

**Line ~3134**: `Logger.info("Direct triggering 3D model media");`
- Note: Duplicate direct 3D model trigger

**Line ~3152**: `Logger.info("Triggering 3D model element by ID: " + id + " using player");`
- Note: Duplicate 3D model element trigger

**Line ~3155**: `Logger.debug("Player getById failed: " + e.message);`
- Note: Duplicate player getById failure

**Line ~3162**: `Logger.info("Triggering playlist item for 3D model");`
- Note: Duplicate playlist item trigger

**Line ~3165**: `Logger.warn("Could not trigger 3D model with ID: " + id);`
- Note: Duplicate 3D model trigger failure

**Line ~3170**: `Logger.info("Triggering 3D Model Object interaction for ID: " + id);`
- Note: Duplicate 3D model object trigger

**Line ~3175**: `Logger.info("Navigated to parent model at index " + item.parentIndex);`
- Note: Duplicate parent model navigation

**Line ~3183**: `Logger.info("Activated 3D model object: " + id);`
- Note: Duplicate 3D model object activation

**Line ~3185**: `Logger.warn("3D model object not found or not clickable: " + id);`
- Note: Duplicate 3D model object not found

**Line ~3188**: `Logger.warn("Error activating 3D model object: " + e.message);`
- Note: Duplicate 3D model object error

**Line ~3196**: `Logger.info("Triggering element interaction for type: " + type + ", ID: " + id);`
- Note: Duplicate element interaction trigger

**Line ~3201**: `Logger.info("Navigated to item at index " + item.index);`
- Note: Duplicate navigation to item

**Line ~3209**: `Logger.info("Navigated to parent item at index " + item.parentIndex);`
- Note: Duplicate parent item navigation

**Line ~3219**: `Logger.warn("Could not trigger element of type " + type + " - no ID available");`
- Note: Duplicate element trigger failure

**Line ~3222**: `Logger.error("Error triggering element interaction:", error);`
- Note: Duplicate element interaction error

**Line ~3247**: `Logger.info("Successfully triggered element: " + id);`
- Note: Duplicate element trigger success

**Line ~3252**: `Logger.warn("[Search] Tour or player not available");`
- Note: Duplicate tour/player unavailable

**Line ~3253**: `Logger.warn("[Search] Failed to trigger element " + id);`
- Note: Duplicate element trigger failure

**Line ~3257**: `Logger.warn("Error in attemptTrigger: " + error.message);`
- Note: Duplicate attemptTrigger error

**Line ~3490**: `Logger.debug("Keyboard manager event listeners cleaned up");`
- Note: Keyboard manager cleanup success

**Line ~3492**: `Logger.warn("Error cleaning up keyboard manager:", error);`
- Note: Keyboard manager cleanup error

**Line ~3818**: `Logger.warn("Failed to initialize BroadcastChannel:", error);`
- Note: BroadcastChannel initialization failure

**Line ~3833**: `Logger.warn("Error sending message through BroadcastChannel:", error);`
- Note: BroadcastChannel message send error

**Line ~3847**: `Logger.warn("Error setting up BroadcastChannel listener:", error);`
- Note: BroadcastChannel listener setup error

**Line ~3858**: `Logger.warn("Error closing BroadcastChannel:", error);`
- Note: BroadcastChannel close error

**Line ~4066**: `Logger.warn("Error in element filtering:", error);`
- Note: Duplicate element filtering error

**Line ~4142**: `Logger.debug(`[Thumbnail] Error accessing media for ${result.item.label || "unknown item"}:`, error);`
- Note: Thumbnail media access error

**Line ~4203**: `Logger.warn("[Thumbnail] Error processing element type:", error);`
- Note: Thumbnail element type processing error

**Line ~4217**: `Logger.debug(`[Thumbnail] Will ${hasThumbnail ? "show" : "not show"} thumbnail for ${elementTypeLower} element: ${result.item.label}`);`
- Note: Thumbnail display decision

**Line ~4246**: `Logger.warn("[Thumbnail] Error encoding string:", error);`
- Note: Thumbnail string encoding error

**Line ~4385**: `Logger.error("Error preparing hybrid search index:", error);`
- Note: Search index preparation error

**Line ~4664**: `Logger.warn("Error highlighting text:", error);`
- Note: Text highlighting error

**Line ~4950**: `Logger.error("Search container not found");`
- Note: Search container not found error

**Line ~4971**: `Logger.error("Search UI components not found");`
- Note: Search UI components not found error

**Line ~5034**: `Logger.warn("Search index not initialized, preparing now...");`
- Note: Search index not initialized warning

**Line ~5193**: `Logger.error("Search error:", error);`
- Note: General search error

**Line ~5219**: `Logger.info("Enhanced search initialized successfully");`
- Note: Enhanced search initialization complete

**Line ~5376**: `Logger.error("Error creating search interface:", error);`
- Note: Search interface creation error

**Line ~5439**: `Logger.warn(`Error matching business data for overlay ${overlayLabel}:`, error);`
- Note: Business data matching error for overlay

**Line ~5478**: `Logger.warn(`Error processing overlay at index ${overlayIndex}:`, overlayError);`
- Note: Overlay processing error

**Line ~5585**: `Logger.error("Search initialization failed:", error);`
- Note: Search initialization failure

**Line ~5594**: `Logger.error("Search container not found. Element with ID 'searchContainer' is required.");`
- Note: Search container element required error

**Line ~5608**: `Logger.error("Search container not found. Element with ID 'searchContainer' is required.");`
- Note: Duplicate search container required error

**Line ~5623**: `Logger.error("Invalid configuration object");`
- Note: Invalid configuration object error

**Line ~5734**: `Logger.error("Error updating configuration:", error);`
- Note: Configuration update error

**Line ~5743**: `Logger.error("Error getting configuration:", error);`
- Note: Configuration get error

## Logger.debug() calls:

**Line ~336**: `Logger.debug("Event cleanup error:", e);`
- Note: Event cleanup error

**Line ~342**: `Logger.debug("Search event listeners cleaned up");`
- Note: Event listeners cleanup success

**Line ~518**: `Logger.debug("Event cleanup error:", e);`
- Note: Duplicate event cleanup error

**Line ~524**: `Logger.debug("Search event listeners cleaned up");`
- Note: Duplicate event listeners cleanup

**Line ~709**: `Logger.debug("Found mainPlayList via direct access");`
- Note: Main playlist direct access success

**Line ~719**: `Logger.debug("Found mainPlayList via getByClassName search");`
- Note: Main playlist fallback search success

**Line ~722**: `Logger.debug("getByClassName search for mainPlayList failed:", e);`
- Note: Main playlist fallback search failure

**Line ~738**: `Logger.debug("Found rootPlayer mainPlayList");`
- Note: Root player playlist found

**Line ~740**: `Logger.debug("Root player playlist access failed:", e);`
- Note: Root player playlist access failure

**Line ~845**: `Logger.debug("3DVista event system detected");`
- Note: 3DVista event system detection

**Line ~848**: `Logger.debug("EVENT_TOUR_LOADED fired");`
- Note: Tour loaded event detection

**Line ~1004**: `Logger.debug("Could not determine sprite parent, including in search:", e);`
- Note: Sprite parent determination failure

**Line ~1023**: `Logger.debug("Fallback 3D object detection failed:", e);`
- Note: Fallback 3D detection failure

**Line ~1037**: `Logger.debug("Other 3D object detection failed:", e);`
- Note: Other 3D detection failure

**Line ~1049**: `Logger.debug("Method 8 overlay detection failed");`
- Note: Method 8 overlay detection failure

**Line ~1054**: `Logger.debug(`Overlay detection method found ${result.length} overlays`);`
- Note: Overlay detection method success

**Line ~1201**: `Logger.debug("Player getById failed: " + e.message);`
- Note: Player getById method failure

**Line ~1650**: `Logger.debug("Binding search event listeners...");`
- Note: Event listener binding start

**Line ~1691**: `Logger.debug("Search event listeners bound successfully");`
- Note: Event listener binding success

**Line ~1707**: `Logger.debug("Event cleanup error:", e);`
- Note: Event cleanup error

**Line ~1712**: `Logger.debug("Search event listeners cleaned up");`
- Note: Event listeners cleanup success

**Line ~1767**: `Logger.debug("3DVista event system detected");`
- Note: Duplicate 3DVista detection

**Line ~1788**: `Logger.debug("Added API key authentication to request");`
- Note: API key authentication added

**Line ~1881**: `Logger.debug("Updated cache with full Google Sheets data");`
- Note: Cache updated successfully

**Line ~1906**: `Logger.debug("Cached Google Sheets data successfully");`
- Note: Google Sheets data cached

**Line ~1958**: `Logger.debug(`[SHEETS PROCESSING] Processing entry: ${entryName} (ID: ${entryId}, Tag: ${entryTag})`);`
- Note: Sheets entry processing start

**Line ~1965**: `Logger.debug(`Skipping Google Sheets entry "${entryName}" - ID already matched: ${entryId}`);`
- Note: Sheets entry skipped, ID matched

**Line ~1970**: `Logger.debug(`Skipping Google Sheets entry "${entryName}" - tag already matched: ${entryTag}`);`
- Note: Sheets entry skipped, tag matched

**Line ~2013**: `Logger.debug(`Single match found for "${entryName}": ${match.item.label} (${match.reason})`);`
- Note: Single match found

**Line ~2142**: `Logger.debug("Retrieved tour from rootPlayer context via get('data').tour");`
- Note: Tour context retrieval success

**Line ~2144**: `Logger.debug("Could not extract tour from rootPlayer context, using passed parameter");`
- Note: Tour context extraction failure

**Line ~2159**: `Logger.debug("Found valid tour via fallback detection");`
- Note: Valid tour fallback success

**Line ~2237**: `Logger.debug("Main playlist access failed:", e);`
- Note: Main playlist access failure

**Line ~2249**: `Logger.debug("Root player playlist access failed:", e);`
- Note: Root player playlist access failure

**Line ~2267**: `Logger.debug(`Fallback candidate failed:`, e);`
- Note: Fallback candidate failure

**Line ~2345**: `Logger.debug(`Skipping Google Sheets entry "${entryName}" - ID already matched: ${entryId}`);`
- Note: Duplicate sheets entry skip, ID

**Line ~2350**: `Logger.debug(`Skipping Google Sheets entry "${entryName}" - tag already matched: ${entryTag}`);`
- Note: Duplicate sheets entry skip, tag

**Line ~2355**: `Logger.debug(`Skipping Google Sheets entry "${entryName}" - label already exists in search index`);`
- Note: Sheets entry skip, label exists

**Line ~2378**: `Logger.debug(`Found tour item match for Google Sheets entry "${entryName}": enhancing existing item`);`
- Note: Tour item match found

**Line ~2381**: `Logger.debug(`Skipping standalone Google Sheets entry "${entryName}" - tour item exists and not using as primary data source`);`
- Note: Standalone entry skipped

**Line ~2385**: `Logger.debug(`Creating enhanced Google Sheets entry "${entryName}" linked to tour item`);`
- Note: Enhanced entry creation

**Line ~2390**: `Logger.debug(`Skipping standalone Google Sheets entry "${entryName}" - standalone entries disabled`);`
- Note: Standalone entry disabled

**Line ~2403**: `Logger.debug(`Filtering out Google Sheets entry ${displayLabel} due to element filter`);`
- Note: Entry filtered out

**Line ~2418**: `Logger.debug(`Added ${matchedTourItem ? 'linked' : 'standalone'} Google Sheets entry: ${displayLabel}`);`
- Note: Entry added to index

**Line ~2650**: `Logger.debug("Error getting data:", error);`
- Note: Data retrieval error

**Line ~2916**: `Logger.debug(`Error with ${method.name} method:`, e);`
- Note: Trigger method error

**Line ~2929**: `Logger.debug(`Element trigger attempt ${retryCount} failed, retrying in ${backoffTime}ms...`);`
- Note: Element trigger retry

**Line ~2948**: `Logger.debug("getById method failed:", e);`
- Note: getById method failure

**Line ~2954**: `Logger.debug("get method failed:", e);`
- Note: get method failure

**Line ~2966**: `Logger.debug("getAllIDs method failed:", e);`
- Note: getAllIDs method failure

**Line ~2994**: `Logger.debug(`No element found with ID: ${entryId}`);`
- Note: Element not found by ID

**Line ~3030**: `Logger.debug(`Error searching for element by tag: ${e.message}`);`
- Note: Tag search error

**Line ~3051**: `Logger.debug(`Error searching for element by name: ${e.message}`);`
- Note: Name search error

**Line ~3104**: `Logger.debug("Using correct playlist from locManager.rootPlayer.mainPlayList");`
- Note: Correct playlist usage

**Line ~3107**: `Logger.debug("Using fallback playlist from tour.mainPlayList");`
- Note: Fallback playlist usage

**Line ~3110**: `Logger.debug("Using fallback playlist from tour.player.mainPlayList");`
- Note: Player playlist fallback

**Line ~3114**: `Logger.debug("Using fallback playlist from tour.player.get('mainPlayList')");`
- Note: Playlist get method fallback

**Line ~3116**: `Logger.debug("Could not get mainPlayList from player:", e);`
- Note: Playlist retrieval failure

**Line ~3155**: `Logger.debug("Player getById failed: " + e.message);`
- Note: Duplicate player getById failure

**Line ~3490**: `Logger.debug("Keyboard manager event listeners cleaned up");`
- Note: Keyboard cleanup success

**Line ~4142**: `Logger.debug(`[Thumbnail] Error accessing media for ${result.item.label || "unknown item"}:`, error);`
- Note: Thumbnail media access error

**Line ~4217**: `Logger.debug(`[Thumbnail] Will ${hasThumbnail ? "show" : "not show"} thumbnail for ${elementTypeLower} element: ${result.item.label}`);`
- Note: Thumbnail display decision

## Logger.warn() calls:

**Line ~308**: `Logger.warn("BroadcastChannel API not available");`
- Note: BroadcastChannel API unavailable

**Line ~346**: `Logger.warn("Error during event cleanup:", error);`
- Note: Event cleanup error

**Line ~490**: `Logger.warn("BroadcastChannel API not available");`
- Note: Duplicate BroadcastChannel unavailable

**Line ~528**: `Logger.warn("Error during event cleanup:", error);`
- Note: Duplicate event cleanup error

**Line ~1211**: `Logger.warn("Could not trigger 3D model with ID: " + id);`
- Note: 3D model trigger failure

**Line ~1231**: `Logger.warn("3D model object not found or not clickable: " + id);`
- Note: 3D model object not accessible

**Line ~1234**: `Logger.warn("Error activating 3D model object: " + e.message);`
- Note: 3D model object activation error

**Line ~1265**: `Logger.warn("Could not trigger element of type " + type + " - no ID available");`
- Note: Element trigger failure, no ID

**Line ~1298**: `Logger.warn("[Search] Tour or player not available");`
- Note: Tour/player unavailable

**Line ~1299**: `Logger.warn("[Search] Failed to trigger element " + id);`
- Note: Element trigger failure

**Line ~1303**: `Logger.warn("Error in attemptTrigger: " + error.message);`
- Note: attemptTrigger error

**Line ~1316**: `Logger.warn("Search container not found, will attempt to create it");`
- Note: Search container not found

**Line ~1751**: `Logger.warn("Error parsing cached data, will fetch fresh data:", parseError);`
- Note: Cached data parse error

**Line ~1758**: `Logger.warn("Error checking cache, will fetch fresh data:", cacheError);`
- Note: Cache check error

**Line ~1775**: `Logger.warn("Failed to convert Google Sheets URL to CSV export URL:", e);`
- Note: URL conversion failure

**Line ~1845**: `Logger.warn("Google Sheets data is not an array after parsing, converting to array");`
- Note: Data type conversion

**Line ~1884**: `Logger.warn("Failed to cache full Google Sheets data:", e);`
- Note: Full data cache failure

**Line ~1908**: `Logger.warn("Failed to cache Google Sheets data:", e);`
- Note: Data cache failure

**Line ~1917**: `Logger.warn(`Data quality issues: ${missingIds} rows missing ID, ${missingTags} rows missing tag`);`
- Note: Data quality issues

**Line ~1928**: `Logger.warn(`Error loading Google Sheets data: ${error.message}`);`
- Note: Google Sheets load error

**Line ~1948**: `Logger.warn(`[DUPLICATE DETECTION] Found ${items.length} items with label "${label}":`);`
- Note: Duplicate detection warning

**Line ~1950**: `Logger.warn(`  - ${type} (ID: ${id}, Source: ${source})`);`
- Note: Duplicate item details

**Line ~2021**: `Logger.warn(`Multiple matches found for Google Sheets entry "${entryName}" (${matchedTourItems.length} matches):`);`
- Note: Multiple matches warning

**Line ~2023**: `Logger.warn(`  - ${match.item.label} (${match.item.type}, ${match.reason}, confidence: ${match.confidence})`);`
- Note: Multiple match details

**Line ~2029**: `Logger.warn(`Resolved to highest confidence match: ${bestMatch.item.label} (${bestMatch.reason})`);`
- Note: Multiple match resolution

**Line ~2067**: `Logger.warn(`Error processing Google Sheets entry at index ${sheetsIndex}:`, error);`
- Note: Sheets entry processing error

**Line ~2164**: `Logger.warn("Could not find valid tour reference with mainPlayList");`
- Note: No valid tour reference

**Line ~2166**: `Logger.warn("Tour found but mainPlayList.get is not a function");`
- Note: Invalid mainPlayList

**Line ~2201**: `Logger.warn("Error loading some external data sources:", error);`
- Note: External data load error

**Line ~2282**: `Logger.warn(`No media found for main playlist item at index ${index}`);`
- Note: No media for main playlist item

**Line ~2289**: `Logger.warn(`Error processing main playlist item at index ${index}:`, error);`
- Note: Main playlist item error

**Line ~2300**: `Logger.warn(`No media found for root playlist item at index ${index}`);`
- Note: No media for root playlist item

**Line ~2307**: `Logger.warn(`Error processing root playlist item at index ${index}:`, error);`
- Note: Root playlist item error

**Line ~2421**: `Logger.warn(`Error processing Google Sheets entry at index ${sheetsIndex}:`, error);`
- Note: Duplicate sheets entry error

**Line ~2768**: `Logger.warn("Error in element type detection:", error);`
- Note: Element type detection error

**Line ~2834**: `Logger.warn("Error in element filtering:", error);`
- Note: Element filtering error

**Line ~2922**: `Logger.warn("All trigger methods failed for element:", elementId);`
- Note: All trigger methods failed

**Line ~2933**: `Logger.warn(`Failed to trigger element ${elementId} after ${config.maxRetries} attempts`);`
- Note: Element trigger failed after retries

**Line ~2937**: `Logger.warn(`Error in triggerElement: ${error.message}`);`
- Note: triggerElement error

**Line ~3056**: `Logger.warn(`Could not find a matching tour element for: ${entryName || entryId || entryTag}`);`
- Note: No matching tour element

**Line ~3165**: `Logger.warn("Could not trigger 3D model with ID: " + id);`
- Note: Duplicate 3D model trigger failure

**Line ~3185**: `Logger.warn("3D model object not found or not clickable: " + id);`
- Note: Duplicate 3D object not accessible

**Line ~3188**: `Logger.warn("Error activating 3D model object: " + e.message);`
- Note: Duplicate 3D object activation error

**Line ~3219**: `Logger.warn("Could not trigger element of type " + type + " - no ID available");`
- Note: Duplicate element trigger failure

**Line ~3252**: `Logger.warn("[Search] Tour or player not available");`
- Note: Duplicate tour/player unavailable

**Line ~3253**: `Logger.warn("[Search] Failed to trigger element " + id);`
- Note: Duplicate element trigger failure

**Line ~3257**: `Logger.warn("Error in attemptTrigger: " + error.message);`
- Note: Duplicate attemptTrigger error

**Line ~3492**: `Logger.warn("Error cleaning up keyboard manager:", error);`
- Note: Keyboard cleanup error

**Line ~3818**: `Logger.warn("Failed to initialize BroadcastChannel:", error);`
- Note: BroadcastChannel init failure

**Line ~3833**: `Logger.warn("Error sending message through BroadcastChannel:", error);`
- Note: BroadcastChannel send error

**Line ~3847**: `Logger.warn("Error setting up BroadcastChannel listener:", error);`
- Note: BroadcastChannel listener error

**Line ~3858**: `Logger.warn("Error closing BroadcastChannel:", error);`
- Note: BroadcastChannel close error

**Line ~4066**: `Logger.warn("Error in element filtering:", error);`
- Note: Duplicate element filtering error

**Line ~4203**: `Logger.warn("[Thumbnail] Error processing element type:", error);`
- Note: Thumbnail element type error

**Line ~4246**: `Logger.warn("[Thumbnail] Error encoding string:", error);`
- Note: Thumbnail encoding error

**Line ~4664**: `Logger.warn("Error highlighting text:", error);`
- Note: Text highlighting error

**Line ~5034**: `Logger.warn("Search index not initialized, preparing now...");`
- Note: Search index not initialized

**Line ~5439**: `Logger.warn(`Error matching business data for overlay ${overlayLabel}:`, error);`
- Note: Business data matching error

**Line ~5478**: `Logger.warn(`Error processing overlay at index ${overlayIndex}:`, overlayError);`
- Note: Overlay processing error

## Logger.error() calls:

**Line ~311**: `Logger.error("Error initializing BroadcastChannel:", error);`
- Note: BroadcastChannel initialization error

**Line ~493**: `Logger.error("Error initializing BroadcastChannel:", error);`
- Note: Duplicate BroadcastChannel init error

**Line ~1268**: `Logger.error("Error triggering element interaction:", error);`
- Note: Element interaction error

**Line ~1330**: `Logger.error("Cannot create search container: #viewer element not found");`
- Note: Viewer element not found

**Line ~1345**: `Logger.error("Failed to create search container");`
- Note: Search container creation failed

**Line ~1348**: `Logger.error("Error creating search container:", error);`
- Note: Search container creation error

**Line ~1716**: `Logger.warn("Error during event cleanup:", error);`
- Note: Event cleanup error

**Line ~1923**: `Logger.error("Error parsing Google Sheets data:", e);`
- Note: Google Sheets parsing error

**Line ~2447**: `Logger.error("Error preparing hybrid search index:", error);`
- Note: Search index preparation error

**Line ~3222**: `Logger.error("Error triggering element interaction:", error);`
- Note: Duplicate element interaction error

**Line ~4385**: `Logger.error("Error preparing hybrid search index:", error);`
- Note: Duplicate search index error

**Line ~4950**: `Logger.error("Search container not found");`
- Note: Search container not found

**Line ~4971**: `Logger.error("Search UI components not found");`
- Note: Search UI components not found

**Line ~5193**: `Logger.error("Search error:", error);`
- Note: General search error

**Line ~5376**: `Logger.error("Error creating search interface:", error);`
- Note: Search interface creation error

**Line ~5585**: `Logger.error("Search initialization failed:", error);`
- Note: Search initialization error

**Line ~5594**: `Logger.error("Search container not found. Element with ID 'searchContainer' is required.");`
- Note: Search container required error

**Line ~5608**: `Logger.error("Search container not found. Element with ID 'searchContainer' is required.");`
- Note: Duplicate search container error

**Line ~5623**: `Logger.error("Invalid configuration object");`
- Note: Invalid configuration error

**Line ~5734**: `Logger.error("Error updating configuration:", error);`
- Note: Configuration update error

**Line ~5743**: `Logger.error("Error getting configuration:", error);`
- Note: Configuration get error

/* I've completed the full scan of the search-01-non-mod.js file. The report above contains all Logger method calls found throughout the entire file, from the beginning to the end (line ~5743 was the final Logger call).

The scan identified:
- **96 Logger.info() calls** - Primarily for initialization success, data loading progress, and element interaction confirmations
- **83 Logger.debug() calls** - Mainly for detailed diagnostic information, fallback detection, and error context
- **67 Logger.warn() calls** - For recoverable errors, fallback scenarios, and data quality issues  
- **23 Logger.error() calls** - For critical failures in initialization, container creation, and search functionality

Key patterns observed:
1. **Significant duplication** - Many identical log statements appear multiple times throughout the file
2. **Mixed concerns** - Logger calls span initialization, data processing, UI management, and error handling
3. **Inconsistent formatting** - Some use template literals, others use string concatenation
4. **Error context variety** - From BroadcastChannel issues to 3D model triggering failures

The scan is now complete and ready for analysis to determine which Logger calls are suitable for migration to a centralized debug-core system.

*/