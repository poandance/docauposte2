// assets/js/server-variable.js
console.log('server-variable.js loaded');

// Variables to store promises for each API call
let entityDataPromise = null;
let userDataPromise = null;
let settingsDataPromise = null;

// Function to get entity data
/**
 * Fetches and returns the entity data from the server.
 * If the data has already been requested, it returns the existing promise.
 *
 * @returns {Promise<Object>} A promise that resolves to the entity data object.
 */
export function getEntityData(forceRefresh = false) {
  if (forceRefresh || !entityDataPromise) {
    entityDataPromise = fetch("/docauposte/api/entity_data")
      .then((response) => response.json());
  }
  return entityDataPromise;
}

// Function to get user data
/**
 * Fetches and returns the user data from the server.
 * If the data has already been requested, it returns the existing promise.
 *
 * @returns {Promise<Object>} A promise that resolves to the user data object.
 */
export function getUserData() {
  if (!userDataPromise) {
    userDataPromise = fetch("/docauposte/api/user_data")
      .then((response) => response.json());
  }
  return userDataPromise;
}

// Function to get settings data
/**
 * Fetches and returns the settings data from the server.
 * If the data has already been requested, it returns the existing promise.
 *
 * @returns {Promise<Object>} A promise that resolves to the settings data object.
 */
export function getSettingsData() {
  if (!settingsDataPromise) {
    settingsDataPromise = fetch("/docauposte/api/settings")
      .then((response) => response.json());
  }
  return settingsDataPromise;
}

/**
 * Resets the cached entity data promise, forcing a refetch on the next call to getEntityData.
 */
export function resetEntityData() {
  entityDataPromise = null;
}