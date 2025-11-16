// docauposte2/assets/js/incident-cascading-dropdowns.js
console.log('incident-cascading-dropdowns.js loaded');

/* global zoneIdFromServer, productLineIdFromServer */

// Import necessary functions from other modules
import { getEntityData, resetEntityData } from './server-variable.js';
import { filterData, populateDropdown, resetDropdowns, preselectValues } from './dropdown-utils.js';

// Declare variables to hold data fetched from the server
let incidentZoneData = null;
let incidentProductLinesData = null;
let incidentCategoriesData = null;

// Event listener for when the page loads via Turbo
/**
 * Event listener for when the page loads via Turbo.
 * Fetches data from the server, initializes cascading dropdown menus,
 * resets dropdowns, and preselects dropdown values based on server data.
 */
document.addEventListener("turbo:frame-load", (e) => {
  // Only process the relevant frame
  const frame = e.target;
  console.log('turbo frame load event', frame);

  // Only run this logic if the correct frame is being loaded.
  if (frame?.id !== 'incident_management_view') {
    return;
  }

  console.log('turbo frame load for incident cascading dropdowns start', new Date().toLocaleTimeString());
  getEntityData(true)
    .then((data) => {
      console.log('event turbo frame load for incident cascading dropdowns', new Date().toLocaleTimeString());
      console.log('Fetched entity data for incident cascading dropdowns:', data);
      // Assign fetched data to variables using optional chaining
      incidentZoneData = data?.zones;
      incidentProductLinesData = data?.productLines;
      incidentCategoriesData = data?.incidentCategories;

      // Initialize dropdowns and reset them
      initCascadingDropdowns();
      resetDropdowns(
        document.getElementById("incident_zone"),
        document.getElementById("incident_productLine"),
      );
      // Preselect dropdown values based on server data
      preselectDropdownValues();
    })
    .catch((error) => {
      console.error('Error fetching entity data:', error);
    });
});

/**
 * Initializes cascading dropdown menus for zones, product lines, and incident categories.
 *
 * @function initCascadingDropdowns
 * @returns {void}
 */
function initCascadingDropdowns() {
  const zoneDropdown = document.getElementById("incident_zone");
  const productLineDropdown = document.getElementById("incident_productLine");
  const incidentCategoryDropdown = document.getElementById("incident_incidentCategory");

  console.log('init incident cascading dropdowns', new Date().toLocaleTimeString());
  console.log('zoneDropdown', zoneDropdown);
  console.log('productLineDropdown', productLineDropdown);
  console.log('incidentCategoryDropdown', incidentCategoryDropdown);

  // Check if all dropdown elements are available
  if (zoneDropdown && productLineDropdown && incidentCategoryDropdown) {
    // Populate zone dropdown with data
    populateDropdown(zoneDropdown, incidentZoneData, {
      defaultText: 'Sélectionner une Zone',
    });

    // Get the selected index of incidentCategoryDropdown using optional chaining
    let incidentCategoryValue = Number.parseInt(incidentCategoryDropdown?.options?.selectedIndex ?? 0, 10);

    // If no incident category is selected, populate incident category dropdown
    if (incidentCategoryValue === 0) {
      populateDropdown(incidentCategoryDropdown, incidentCategoriesData, {
        defaultText: 'Sélectionner une Catégorie d\'Incident',
        textFormatter: (text) => text?.split(".")[0]?.charAt(0)?.toUpperCase() + text?.split(".")[0]?.slice(1),
      });
    }

    // Event listener for when the zone dropdown value changes
    zoneDropdown.addEventListener("change", (event) => {
      // Get the selected value from the zone dropdown using optional chaining
      const selectedValue = Number.parseInt(event.target?.value ?? 0);

      // Filter product lines based on selected zone
      const filteredProductLines = filterData(incidentProductLinesData, "zone_id", selectedValue);

      // Populate product line dropdown based on selected zone
      populateDropdown(productLineDropdown, filteredProductLines, {
        defaultText: 'Sélectionner une Ligne',
        textFormatter: (text) => text?.split(".")[0]?.charAt(0)?.toUpperCase() + text?.split(".")[0]?.slice(1),
      });

      // Reset dependent dropdowns
      resetDropdowns(productLineDropdown);
    });
  }
}

/**
 * Preselects dropdown values based on data from the server.
 *
 * @function preselectDropdownValues
 * @returns {void}
 */
function preselectDropdownValues() {
  /**
   * The dropdown element for selecting zones.
   * @type {HTMLSelectElement}
   */
  const zoneDropdown = document.getElementById("incident_zone");

  /**
   * The dropdown element for selecting product lines.
   * @type {HTMLSelectElement}
   */
  const productLineDropdown = document.getElementById("incident_productLine");

  console.log('preselect dropdown stuff', new Date().toLocaleTimeString());

  console.log('zoneIdFromServer', zoneIdFromServer);
  console.log('productLineIdFromServer', productLineIdFromServer);

  preselectValues([
    {
      dropdown: zoneDropdown,
      data: incidentZoneData,
      id: zoneIdFromServer,
      options: { defaultText: 'Sélectionner une Zone' },
    },
  ]);

  if (zoneIdFromServer && productLineDropdown) {
    const filteredProductLines = filterData(incidentProductLinesData, "zone_id", Number.parseInt(zoneIdFromServer));
    populateDropdown(productLineDropdown, filteredProductLines, {
      selectedId: productLineIdFromServer,
      defaultText: 'Choisissez d\'abord une Zone',
      textFormatter: (text) => text?.split(".")[0]?.charAt(0)?.toUpperCase() + text?.split(".")[0]?.slice(1),
    });
  }
}




/**
 * Checks if the incident category button should be initialized
 * @param {HTMLElement} frame - The turbo frame element
 * @returns {HTMLElement|null} The button element if it should be initialized, null otherwise
 */
function getIncidentCategoryButton(frame) {
  if (frame?.id !== 'incident_management_view') {
    return null;
  }

  const button = frame.querySelector("#create_incident_incidentCategory");

  if (!button || button.dataset?.incidentInit === '1') {
    return null;
  }

  return button;
}

/**
 * Handles the XHR response for incident category creation
 * @param {XMLHttpRequest} xhr - The XMLHttpRequest object
 * @param {HTMLElement} frame - The turbo frame element
 * @param {HTMLButtonElement} button - The submit button
 */
function handleIncidentCategoryResponse(xhr, frame, button) {
  button.disabled = false;

  if (xhr.status < 200 || xhr.status >= 300) {
    console.error("The request failed!");
    return;
  }

  let response;
  try {
    response = JSON.parse(xhr.responseText);
  } catch (err) {
    console.error('Invalid JSON response', err);
    return;
  }

  alert(response?.message ?? '');

  if (response?.success) {
    handleSuccessfulCreation(frame);
  } else {
    console.error(response?.message);
  }
}

/**
 * Handles successful incident category creation
 * @param {HTMLElement} frame - The turbo frame element
 */
function handleSuccessfulCreation(frame) {
  // Clear input
  const nameInput = frame.querySelector("#incident_incidentCategory_name");
  if (nameInput) {
    nameInput.value = "";
  }

  // Force refresh of entity data
  resetEntityData();

  // Reload the frame
  reloadIncidentFrame();
}

/**
 * Reloads the incident management frame
 */
function reloadIncidentFrame() {
  const parentFrame = document.getElementById('incident_management_view');
  const srcUrl = parentFrame?.getAttribute('src');

  if (parentFrame && srcUrl) {
    const url = new URL(srcUrl, globalThis.location.origin);
    url.searchParams.set('_ts', Date.now());
    parentFrame.setAttribute('src', url.toString());
  } else if (globalThis.Turbo) {
    Turbo.visit(globalThis.location.href);
  } else {
    location.reload();
  }
}

/**
 * Creates and sends XHR request for incident category creation
 * @param {string} categoryName - The name of the incident category
 * @param {HTMLElement} frame - The turbo frame element
 * @param {HTMLButtonElement} button - The submit button
 */
function sendIncidentCategoryRequest(categoryName, frame, button) {
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/docauposte/incident/incident_incidentCategory_creation");
  xhr.setRequestHeader("Content-Type", "application/json");

  xhr.onload = () => handleIncidentCategoryResponse(xhr, frame, button);

  xhr.onerror = () => {
    button.disabled = false;
    console.error("The request could not be made!");
  };

  xhr.send(JSON.stringify({ incident_incidentCategory_name: categoryName }));
}

/**
 * Handles the click event for creating a new incident category
 * @param {Event} evt - The click event
 * @param {HTMLElement} frame - The turbo frame element
 * @param {HTMLButtonElement} button - The submit button
 */
function handleIncidentCategoryCreation(evt, frame, button) {
  evt.preventDefault();

  // Prevent double submission
  button.disabled = true;

  // Get and validate input
  const incidentCategoryName = frame.querySelector("#incident_incidentCategory_name")?.value?.trim() ?? "";

  if (!incidentCategoryName) {
    button.disabled = false;
    alert("Veuillez entrer un nom de catégorie");
    return;
  }

  sendIncidentCategoryRequest(incidentCategoryName, frame, button);
}

/**
 * Initializes the incident category creation button
 * @param {HTMLElement} frame - The turbo frame element
 */
function initializeIncidentCategoryButton(frame) {
  const button = getIncidentCategoryButton(frame);

  if (!button) {
    return;
  }

  // Mark button as initialized
  button.dataset.incidentInit = '1';

  // Add click event listener
  button.addEventListener("click", (evt) => {
    handleIncidentCategoryCreation(evt, frame, button);
  });

  console.log('Incident category button initialized');
}

/**
 * Event listener for the "turbo:frame-load" event that sets up incident category creation
 * @listens turbo:frame-load
 */
document.addEventListener("turbo:frame-load", (e) => {
  initializeIncidentCategoryButton(e.target);
});
