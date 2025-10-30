// docauposte2/assets/js/incident-cascading-dropdowns.js
console.log('incident-cascading-dropdowns.js loaded');

/* global zoneIdFromServer, productLineIdFromServer */

// Import necessary functions from other modules
import { getEntityData } from './server-variable.js';
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
document.addEventListener("turbo:frame-load", () => {
  getEntityData()
    .then((data) => {
      console.log('event turbo frame load for incident cascading dropdowns', new Date().toLocaleTimeString());
      console.log('Fetched entity data for incident cascading dropdowns:', data);
      // Assign fetched data to variables
      incidentZoneData = data.zones;
      incidentProductLinesData = data.productLines;
      incidentCategoriesData = data.incidentCategories;

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
 */
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

    // Get the selected index of incidentCategoryDropdown
    let incidentCategoryValue = parseInt(incidentCategoryDropdown.options.selectedIndex, 10);

    // If no incident category is selected, populate incident category dropdown
    if (incidentCategoryValue === 0) {
      populateDropdown(incidentCategoryDropdown, incidentCategoriesData, {
        defaultText: 'Sélectionner une Catégorie d\'Incident',
        textFormatter: (text) => text.split(".")[0].charAt(0).toUpperCase() + text.split(".")[0].slice(1),
      });
    }

    // Event listener for when the zone dropdown value changes
    zoneDropdown.addEventListener("change", (event) => {
      // Get the selected value from the zone dropdown
      const selectedValue = parseInt(event.target.value);

      // Filter product lines based on selected zone
      const filteredProductLines = filterData(incidentProductLinesData, "zone_id", selectedValue);

      // Populate product line dropdown based on selected zone
      populateDropdown(productLineDropdown, filteredProductLines, {
        defaultText: 'Sélectionner une Ligne',
        textFormatter: (text) => text.split(".")[0].charAt(0).toUpperCase() + text.split(".")[0].slice(1),
      });

      // Reset dependent dropdowns
      resetDropdowns(productLineDropdown);
    });
  }
}

/**
 * Preselects dropdown values based on data from the server.
 */
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

  console.log('preselect dropdown stuff', Date.now("hh:mm:ss"));

  console.log('zoneIdFromServer', zoneIdFromServer);
  console.log('productLineIdFromServer', productLineIdFromServer);
  console.log('categoryIdFromServer', categoryIdFromServer);
  console.log('buttonIdFromServer', buttonIdFromServer);

  preselectValues([
    {
      dropdown: zoneDropdown,
      data: incidentZoneData,
      id: zoneIdFromServer,
      options: { defaultText: 'Sélectionner une Zone' },
    },
  ]);

  if (zoneIdFromServer && productLineDropdown) {
    const filteredProductLines = filterData(incidentProductLinesData, "zone_id", parseInt(zoneIdFromServer));
    populateDropdown(productLineDropdown, filteredProductLines, {
      selectedId: productLineIdFromServer,
      defaultText: 'Choisissez d\'abord une Zone',
      textFormatter: (text) => text.split(".")[0].charAt(0).toUpperCase() + text.split(".")[0].slice(1),
    });
  }
}

/**
 * Event listener for creating a new incident category.
 */
/**
 * Event listener for the "turbo:load" event that sets up a click handler for creating a new incident category.
 * The function sends an AJAX POST request to create a new incident category and handles the response.
 *
 * @listens turbo:frame-load
 */
document.addEventListener("turbo:frame-load", function (e) {
  // Ne traiter que le frame concerné
  const frame = e.target;
  if (!frame || frame.id !== 'incident_management_view') return;

  // Cherche le bouton à l'intérieur du frame
  const createIncidentCategoryButton = frame.querySelector("#create_incident_incidentCategory");
  console.log('createIncidentCategoryButton', createIncidentCategoryButton);

  // Si le bouton n'existe pas ou si on a déjà initialisé, on sort
  if (!createIncidentCategoryButton || createIncidentCategoryButton.dataset.incidentInit === '1') {
    return;
  }

  // Marque le bouton comme initialisé (sera réinitialisé à chaque reload du frame car l'élément est recréé)
  createIncidentCategoryButton.dataset.incidentInit = '1';

  createIncidentCategoryButton.addEventListener("click", function (evt) {
    evt.preventDefault();

    // Empêche double envoi en désactivant le bouton
    createIncidentCategoryButton.disabled = true;

    // Récupère la valeur dans le frame (pas dans le document parent)
    const nameInput = frame.querySelector("#incident_incidentCategory_name");
    const incidentCategoryName = nameInput ? nameInput.value.trim() : "";

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/docauposte/incident/incident_incidentCategory_creation");
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onload = function () {
      // Réactive le bouton quoi qu'il arrive
      createIncidentCategoryButton.disabled = false;

      if (xhr.status >= 200 && xhr.status < 300) {
        let response;
        try {
          response = JSON.parse(xhr.responseText);
        } catch (err) {
          console.error('Invalid JSON response', err);
          return;
        }

        alert(response.message || '');

        if (response.success) {
          // Clear input
          if (nameInput) nameInput.value = "";

          // Reload uniquement le turbo-frame avec cache-buster
          const parentFrame = document.getElementById('incident_management_view');
          if (parentFrame && parentFrame.getAttribute('src')) {
            const srcUrl = new URL(parentFrame.getAttribute('src'), window.location.origin);
            srcUrl.searchParams.set('_ts', Date.now());
            parentFrame.setAttribute('src', srcUrl.toString());
          } else if (window.Turbo) {
            Turbo.visit(window.location.href);
          } else {
            location.reload();
          }
        } else {
          console.error(response.message);
        }
      } else {
        console.error("The request failed!");
      }
    };

    xhr.onerror = function () {
      createIncidentCategoryButton.disabled = false;
      console.error("The request could not be made!");
    };

    xhr.send(JSON.stringify({ incident_incidentCategory_name: incidentCategoryName }));
  });
});





/**
 * Event listener for modifying an incident form.
 */
let modifyIncidentForm = document.querySelector("#modifyIncidentForm");
if (modifyIncidentForm) {
  console.log('modifyIncidentForm exist', new Date().toLocaleTimeString());

  /**
   * Handles the submission of the modify incident form.
   * Prevents the default form submission, gathers form data including file uploads,
   * CSRF token, and selected dropdown values, and sends the data to the server via a POST request.
   * Reloads the page upon successful submission or logs an error if the request fails.
   *
   * @param {Event} event - The event object representing the form submission event.
   * @returns {void}
   */
  modifyIncidentForm.addEventListener("submit", function (event) {
    event.preventDefault();
    console.log('modifyIncidentForm submit', new Date().toLocaleTimeString());
    // Create a new FormData object
    let formData = new FormData();

    // Get the file input element
    let fileInput = document.querySelector("#incident_file");

    // Get the CSRF token
    let csrfTokenInput = document.querySelector("#incident__token");
    let csrfTokenValue = csrfTokenInput.value;

    // Add the CSRF token to formData
    formData.append("incident[_token]", csrfTokenValue);

    if (fileInput.files.length > 0) {
      // A file was selected; add it to formData
      let file = fileInput.files[0];
      formData.append("incident[file]", file);
    }

    // Get the dropdown elements and name input
    let incidentProductLineDropdown = document.getElementById("incident_productLine");
    let nameInput = document.getElementById("incident_name");

    // Get and append the selected values
    if (incidentProductLineDropdown) {
      let productLineValue = parseInt(
        incidentProductLineDropdown.value,
        10
      );
      formData.append("incident[productLine]", productLineValue);
    }

    // Get the name value
    let nameValue = nameInput.value;
    if (nameValue) {
      formData.append("incident[name]", nameValue);
    }

    // Get and append auto display priority
    let autoDisplayPriority = document.getElementById("incident_autoDisplayPriority");
    if (autoDisplayPriority) {
      let autoDisplayPriorityValue = parseInt(
        autoDisplayPriority.value,
        6  // Default value if parsing fails
      );
      formData.append("incident[autoDisplayPriority]", autoDisplayPriorityValue);
    }

    // Get and append incident category
    let incidentCategory = document.getElementById("incident_incidentCategory");
    if (incidentCategory) {
      let incidentCategoryValue = parseInt(
        incidentCategory.value,
        10
      );
      formData.append("incident[incidentCategory]", incidentCategoryValue);
    }

    // Get the action URL from the form's action attribute
    let form = document.getElementById("modifyIncidentForm");
    let actionUrl = form.getAttribute("action");

    // Send formData to server
    fetch(actionUrl, {
      method: "POST",
      body: formData,
    })
      .then(() => {
        window.location.reload(true);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  });
}
