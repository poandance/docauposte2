// docauposte2/assets/js/incident-modification-cascading-dropdowns.js
console.log('incident-modification-cascading-dropdowns.js loaded');

// Import necessary functions from other modules
import { getEntityData } from './server-variable.js';
import { filterData, populateDropdown, resetDropdowns } from './dropdown-utils.js';

document.addEventListener('DOMContentLoaded', function () {
    fetchIncidentDropdownData();
});

async function fetchIncidentDropdownData() {
    getEntityData(true)
        .then((data) => {
            console.log('event turbo frame load for incident cascading dropdowns', new Date().toLocaleTimeString());
            console.log('Fetched entity data for incident cascading dropdowns:', data);
            // Assign fetched data to variables
            const incidentZoneData = data.zones;
            const incidentProductLinesData = data.productLines;


            initIncidentCascadingDropdowns(incidentZoneData, incidentProductLinesData);
            resetDropdowns(
                document.getElementById("incident_zone"),
                document.getElementById("incident_productLine"),
            );
            // Preselect if IDs exist
            if (typeof zoneIdFromServer !== 'undefined') {
                preselectIncidentDropdowns(incidentZoneData, incidentProductLinesData);
            }
        })
        .catch((error) => {
            console.error('Error fetching entity data:', error);
        });
}




function initIncidentCascadingDropdowns(incidentZoneData, incidentProductLinesData,) {
    const zoneDropdown = document.getElementById("incident_zone");
    const productLineDropdown = document.getElementById("incident_productLine");

    if (!zoneDropdown || !productLineDropdown) return;

    // Populate zone dropdown
    populateDropdown(zoneDropdown, incidentZoneData, {
        defaultText: 'Choisir une Zone',
    });

    // Zone change handler
    zoneDropdown.addEventListener("change", (event) => {
        const selectedValue = Number.parseInt(event.target.value);
        const filteredProductLines = filterData(incidentProductLinesData, "zone_id", selectedValue);

        populateDropdown(productLineDropdown, filteredProductLines, {
            defaultText: 'Sélectionner une Ligne',
            textFormatter: (text) => text.split(".")[0].toUpperCase(),
        });

        // Sync with Symfony form
        const symfonySelect = document.querySelector('select[name="incident[productLine]"]');
        if (symfonySelect) {
            symfonySelect.innerHTML = productLineDropdown.innerHTML;
        }
    });

    // ProductLine change handler - sync with Symfony form
    productLineDropdown.addEventListener("change", (event) => {
        const symfonySelect = document.querySelector('select[name="incident[productLine]"]');
        if (symfonySelect) {
            symfonySelect.value = event.target.value;
        }
    });

}


function preselectIncidentDropdowns(incidentZoneData, incidentProductLinesData) {
    const zoneDropdown = document.getElementById("incident_zone");
    const productLineDropdown = document.getElementById("incident_productLine");

    if (zoneIdFromServer && zoneDropdown) {
        zoneDropdown.value = zoneIdFromServer;

        const filteredProductLines = filterData(incidentProductLinesData, "zone_id", Number.parseInt(zoneIdFromServer));
        populateDropdown(productLineDropdown, filteredProductLines, {
            selectedId: productLineIdFromServer,
            defaultText: 'Sélectionner une Ligne',
            textFormatter: (text) => text.split(".")[0].toUpperCase(),
        });

        // Sync with Symfony form
        const symfonySelect = document.querySelector('select[name="incident[productLine]"]');
        if (symfonySelect && productLineIdFromServer) {
            symfonySelect.value = productLineIdFromServer;
        }
    }
}



/**
 * Event listener for modifying an incident form.
 */
let modifyIncidentForm = document.querySelector("#modifyIncidentForm");
if (modifyIncidentForm) {

    console.log('modifyIncidentForm zoneIdFromServer', zoneIdFromServer);
    console.log('modifyIncidentForm productLineIdFromServer', productLineIdFromServer);

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
            let productLineValue = Number.parseInt(
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
            let autoDisplayPriorityValue = Number.parseInt(
                autoDisplayPriority.value,
                6  // Default value if parsing fails
            );
            formData.append("incident[autoDisplayPriority]", autoDisplayPriorityValue);
        }

        // Get and append incident category
        let incidentCategory = document.getElementById("incident_incidentCategory");
        if (incidentCategory) {
            let incidentCategoryValue = Number.parseInt(
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
