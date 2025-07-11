'use strict';

const cardContainer = document.getElementById('plant-cards');

const getMoistureColor = (percentage) => {
  if (percentage >= 80) return 'blue';
  if (percentage >= 60) return 'green';
  if (percentage >= 40) return 'yellow';
  if (percentage >= 20) return 'amber';
  return 'red';
};

const getMoistureStatus = (percentage) => {
  if (percentage >= 80) return 'Very Wet';
  if (percentage >= 60) return 'Well Watered';
  if (percentage >= 40) return 'Moderate';
  if (percentage >= 20) return 'Low Moisture';
  return 'Very Dry';
};

function createPlantCard(plant, saturationData) {
  const template = document.getElementById('plant-card-template');
  const clone = template.content.cloneNode(true);

  // Handle case where there's no saturation data yet
  let moisturePercentage, moistureColor, moistureStatus;

  if (
    !saturationData ||
    saturationData.moisture === undefined ||
    saturationData.moisture === null
  ) {
    // No data available yet
    moisturePercentage = 0;
    moistureColor = 'gray';
    moistureStatus = 'No Data';
  } else {
    const moistureLevel = saturationData.moisture;
    moisturePercentage = Math.round(((1023 - moistureLevel) / 1023) * 100);
    moistureColor = getMoistureColor(moisturePercentage);
    moistureStatus = getMoistureStatus(moisturePercentage);
  }

  clone.querySelector('[data-field="name"]').textContent = plant.name;
  clone.querySelector('[data-field="percentage"]').textContent =
    moistureStatus === 'No Data' ? '--' : `${moisturePercentage}%`;
  clone.querySelector('[data-field="status"]').textContent = moistureStatus;

  const progressBar = clone.querySelector('[data-field="progress-bar"]');
  if (moistureStatus === 'No Data') {
    progressBar.className = `bg-gray-300 dark:bg-gray-600 h-3 rounded-full transition-all duration-500 ease-in-out`;
    progressBar.style.width = '100%';
  } else {
    progressBar.className = `bg-${moistureColor}-500 h-3 rounded-full transition-all duration-500 ease-in-out`;
    progressBar.style.width = `${moisturePercentage}%`;
  }

  const cardElement = clone.querySelector('div');
  cardElement.dataset.plantId = plant.id; // Store plant ID for deletion
  cardElement.addEventListener('click', (e) => {
    // Don't navigate if delete button was clicked
    if (e.target.closest('[data-field="delete-btn"]')) {
      return;
    }
    console.log(`Clicked on ${plant.name}`);
    window.location.href = `/plant/${plant.id}`;
  });

  cardElement.classList.add(
    'cursor-pointer',
    'hover:shadow-lg',
    'transition-shadow'
  );

  return clone;
}

const fetchPlants = async () => {
  try {
    const plantsResponse = await fetch('/api/plants');
    const plants = await plantsResponse.json();

    // fetch all saturation data in parallel
    const saturationPromises = plants.map((plant) =>
      fetch(`/api/saturation/${plant.id}/last`)
        .then((res) => res.json())
        .catch((error) => {
          console.warn(
            `Failed to fetch saturation for plant ${plant.id}:`,
            error
          );
          return null; // return null for failed requests
        })
    );
    const saturationResults = await Promise.allSettled(saturationPromises);

    cardContainer.innerHTML = '';
    plants.forEach((plant, index) => {
      const saturationResult = saturationResults[index];
      const saturationData =
        saturationResult.status === 'fulfilled' ? saturationResult.value : null;

      const cardElement = createPlantCard(plant, saturationData);
      cardContainer.appendChild(cardElement);
    });
  } catch (error) {
    console.error('Failed to fetch plants:', error);
    cardContainer.innerHTML =
      '<div class="text-red-500">Failed to load plants</div>';
  }
};

$(document).ready(function () {
  // update the last-updated time
  const lastUpdatedElement = document.getElementById('last-updated');
  const updateLastUpdated = () => {
    const now = new Date();
    lastUpdatedElement.textContent = `Last updated: ${now.toLocaleTimeString()}`;
  };
  fetchPlants();
  updateLastUpdated();
  const update = () => {
    fetchPlants();
    updateLastUpdated();
  };
  setInterval(update, 60000);
});

// register plant modal
function openRegisterPlantModal() {
  const modal = document.getElementById('register-plant-modal');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  // clear form
  document.getElementById('register-plant-form').reset();
  // clear any previous status messages
  clearStatusMessage();
  // load available serial devices
  refreshSerialDevices();
}

function closeRegisterPlantModal() {
  const modal = document.getElementById('register-plant-modal');
  modal.classList.add('hidden');
  modal.style.display = 'none';
  clearStatusMessage();

  // reset form
  const form = document.getElementById('register-plant-form');
  if (form) {
    form.reset();
  }

  detectedMacAddress = null;
}

function showStatusMessage(message, isError = false) {
  // Remove any existing status message
  clearStatusMessage();

  const statusDiv = document.createElement('div');
  statusDiv.id = 'status-message';
  statusDiv.className = `mb-4 p-3 rounded-lg text-sm ${
    isError
      ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700'
      : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
  }`;
  statusDiv.textContent = message;

  const form = document.getElementById('register-plant-form');
  form.insertBefore(statusDiv, form.firstChild);
}

function clearStatusMessage() {
  const existingMessage = document.getElementById('status-message');
  if (existingMessage) {
    existingMessage.remove();
  }
}

// serial device management
async function refreshSerialDevices() {
  console.log('Refreshing serial devices...');
  try {
    const refreshBtn = document.getElementById('refresh-devices');
    const refreshIcon = refreshBtn.querySelector('svg');

    refreshBtn.disabled = true;
    // rotation animation with CSS
    refreshIcon.style.transform = 'rotate(0deg)';
    refreshIcon.style.transition = 'transform 0.5s linear';

    // start spinning animation
    let rotation = 0;
    const spinInterval = setInterval(() => {
      rotation += 90;
      refreshIcon.style.transform = `rotate(${rotation}deg)`;
    }, 100);

    const response = await fetch('/api/serial/ports');
    const result = await response.json();
    console.log('Available serial ports:', result);

    const select = document.getElementById('serial-device');
    select.innerHTML = '<option value="">Select a device...</option>';

    if (
      result.success &&
      (result.ports?.length > 0 || result.allPorts?.length > 0)
    ) {
      // Use filtered ports first, fallback to all ports if none filtered
      const portsToUse =
        result.ports && result.ports.length > 0
          ? result.ports
          : result.allPorts || [];

      console.log('Found serial devices:', portsToUse);
      portsToUse.forEach((port) => {
        const option = document.createElement('option');
        option.value = port.path;
        option.textContent =
          port.displayName ||
          `${port.path} (${port.manufacturer || 'Unknown'})`;
        select.appendChild(option);
      });

      // If only one device, auto-select
      if (portsToUse.length === 1) {
        select.value = portsToUse[0].path;
      }
    } else {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No Arduino/ESP8266 devices found';
      option.disabled = true;
      select.appendChild(option);
    }

    // stop spinning
    clearInterval(spinInterval);
    refreshBtn.disabled = false;
    refreshIcon.style.transform = 'rotate(0deg)';
  } catch (error) {
    console.error('Failed to refresh serial devices:', error);
    showStatusMessage(
      'Failed to refresh serial devices. Please try again.',
      true
    );

    const refreshBtn = document.getElementById('refresh-devices');
    const refreshIcon = refreshBtn.querySelector('svg');
    refreshBtn.disabled = false;
    refreshIcon.style.transform = 'rotate(0deg)';
  }
}

// serial communication functionality
let detectedMacAddress = null;

async function configureDevice(formData) {
  try {
    showStatusMessage('Connecting to device and sending configuration...');

    const response = await fetch('/api/serial/configure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ssid: formData.get('wifi-ssid'),
        password: formData.get('wifi-password'),
        plantName: formData.get('plant-name'),
        location: formData.get('plant-location'),
        devicePath: formData.get('serial-device'),
      }),
    });

    const result = await response.json();

    if (result.success) {
      // use the MAC address detected from the device response
      const macAddress = result.detectedMacAddress;

      if (!macAddress) {
        showStatusMessage(
          'Configuration completed but no MAC address was detected from device. Please try again.',
          true
        );
        return;
      }

      detectedMacAddress = macAddress;

      showStatusMessage(
        `Device configured successfully! MAC address: ${macAddress}. Configuration sent: ${result.configSent}`
      );

      // register the plant in the database
      try {
        showStatusMessage('Saving plant to database...');

        const plantResponse = await fetch('/api/plants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.get('plant-name'),
            location: formData.get('plant-location'),
            MAC: macAddress,
          }),
        });

        const plantResult = await plantResponse.json();

        if (plantResponse.ok) {
          showStatusMessage(
            `Plant "${plantResult.name}" successfully registered and configured! MAC Address: ${macAddress}`
          );
        } else {
          showStatusMessage(
            `Device configured but failed to save plant to database: ${
              plantResult.error || 'Unknown error'
            }`,
            true
          );
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        showStatusMessage(
          `Device configured but failed to save plant to database: ${dbError.message}`,
          true
        );
      }

      setTimeout(() => {
        closeRegisterPlantModal();
        fetchPlants(); // fetches plants from db to refresh
      }, 4000);
    } else {
      showStatusMessage(`Configuration failed: ${result.message}`, true);
    }
  } catch (error) {
    console.error('Configuration error:', error);
    showStatusMessage(`Error: ${error.message}`, true);
  }
}

// Form submit handler
document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('register-plant-form');
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const formData = new FormData(form);

      // validate
      const requiredFields = [
        'plant-name',
        'plant-location',
        'serial-device',
        'wifi-ssid',
        'wifi-password',
      ];
      const missingFields = requiredFields.filter(
        (field) => !formData.get(field)?.trim()
      );

      if (missingFields.length > 0) {
        showStatusMessage(
          `Please fill in all required fields: ${missingFields.join(', ')}`,
          true
        );
        return;
      }

      // check if device is selected
      if (!formData.get('serial-device')?.trim()) {
        showStatusMessage('Please select a serial device', true);
        return;
      }

      await configureDevice(formData);
    });
  }
});

// Delete plant functionality
let currentPlantToDelete = null;

function openDeletePlantModal(deleteButton) {
  // Find the plant card container - traverse up to find the card with plant data
  let plantCard = deleteButton.parentElement;

  // Keep going up until we find an element with dataset.plantId
  while (plantCard && !plantCard.dataset.plantId) {
    plantCard = plantCard.parentElement;
    // Safety check to avoid infinite loop
    if (plantCard === document.body) {
      plantCard = null;
      break;
    }
  }

  if (!plantCard) {
    console.error('Could not find plant card container');
    alert('Error: Could not find plant card');
    return;
  }

  const plantNameElement = plantCard.querySelector('[data-field="name"]');

  if (!plantNameElement) {
    console.error('Could not find plant name element in card:', plantCard);
    alert('Error: Could not find plant information');
    return;
  }

  const plantName = plantNameElement.textContent;
  const plantId = plantCard.dataset.plantId;

  console.log('Found plant:', {
    name: plantName,
    id: plantId,
    card: plantCard,
  });

  // Store plant info for deletion
  currentPlantToDelete = {
    name: plantName,
    element: plantCard,
    id: plantId,
  };

  const modal = document.getElementById('delete-plant-modal');
  const nameElement = document.getElementById('delete-plant-name');

  nameElement.textContent = plantName;
  modal.classList.remove('hidden');
  modal.style.display = 'flex';

  // Handle checkbox toggle for device clearing
  const clearCheckbox = document.getElementById('clear-device-eeprom');
  const deviceSection = document.getElementById('delete-serial-device-section');

  clearCheckbox.addEventListener('change', function () {
    if (this.checked) {
      deviceSection.classList.remove('hidden');
      refreshDeleteSerialDevices();
    } else {
      deviceSection.classList.add('hidden');
    }
  });
}

function closeDeletePlantModal() {
  const modal = document.getElementById('delete-plant-modal');
  modal.classList.add('hidden');
  modal.style.display = 'none';

  // Reset form
  document.getElementById('clear-device-eeprom').checked = false;
  document
    .getElementById('delete-serial-device-section')
    .classList.add('hidden');
  currentPlantToDelete = null;
}

async function refreshDeleteSerialDevices() {
  try {
    const refreshBtn = document.getElementById('delete-refresh-devices');
    const refreshIcon = refreshBtn.querySelector('svg');

    refreshBtn.disabled = true;
    refreshIcon.style.transform = 'rotate(0deg)';
    refreshIcon.style.transition = 'transform 0.5s linear';

    let rotation = 0;
    const spinInterval = setInterval(() => {
      rotation += 90;
      refreshIcon.style.transform = `rotate(${rotation}deg)`;
    }, 100);

    const response = await fetch('/api/serial/ports');
    const result = await response.json();

    const select = document.getElementById('delete-serial-device');
    select.innerHTML = '<option value="">Select a device...</option>';

    if (
      result.success &&
      (result.ports?.length > 0 || result.allPorts?.length > 0)
    ) {
      const portsToUse =
        result.ports && result.ports.length > 0
          ? result.ports
          : result.allPorts || [];

      portsToUse.forEach((port) => {
        const option = document.createElement('option');
        option.value = port.path;
        option.textContent =
          port.displayName ||
          `${port.path} (${port.manufacturer || 'Unknown'})`;
        select.appendChild(option);
      });

      // if only one device, auto-select it in the menu
      if (portsToUse.length === 1) {
        select.value = portsToUse[0].path;
      }
    } else {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No Arduino/ESP8266 devices found';
      option.disabled = true;
      select.appendChild(option);
    }

    clearInterval(spinInterval);
    refreshBtn.disabled = false;
    refreshIcon.style.transform = 'rotate(0deg)';
  } catch (error) {
    console.error('Failed to refresh serial devices:', error);
  }
}

async function confirmDeletePlant() {
  if (!currentPlantToDelete) {
    return;
  }

  try {
    const confirmBtn = document.getElementById('confirm-delete-btn');
    const originalText = confirmBtn.textContent;
    confirmBtn.textContent = 'Removing...';
    confirmBtn.disabled = true;

    // Check if we need to clear device EEPROM first
    const clearDevice = document.getElementById('clear-device-eeprom').checked;
    const devicePath = document.getElementById('delete-serial-device').value;

    if (clearDevice && devicePath) {
      console.log('Clearing device EEPROM...');

      try {
        const clearResponse = await fetch('/api/serial/clear-eeprom', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            devicePath: devicePath,
          }),
        });

        const clearResult = await clearResponse.json();

        if (!clearResult.success) {
          throw new Error(
            clearResult.message || 'Failed to clear device EEPROM'
          );
        }

        console.log('Device EEPROM cleared successfully');
      } catch (deviceError) {
        console.error('Device EEPROM clear failed:', deviceError);
        alert(
          `Warning: Failed to clear device EEPROM: ${deviceError.message}\n\nPlant will still be removed from database. You may need to manually clear the device.`
        );
      }
    }

    // Delete plant from database
    const deleteResponse = await fetch(
      `/api/plant/${currentPlantToDelete.id}`,
      {
        method: 'DELETE',
      }
    );

    if (deleteResponse.ok) {
      console.log('Plant deleted successfully');

      // Store plant name before clearing the variable
      const plantName = currentPlantToDelete.name;

      // Remove the plant card from UI
      currentPlantToDelete.element.remove();

      // Close modal (this sets currentPlantToDelete to null)
      closeDeletePlantModal();

      // Refresh plant list
      fetchPlants();

      alert(`Plant "${plantName}" removed successfully!`);
    } else {
      const errorResult = await deleteResponse.json();
      throw new Error(errorResult.error || 'Failed to delete plant');
    }
  } catch (error) {
    console.error('Error deleting plant:', error);
    alert(`Failed to remove plant: ${error.message}`);
  } finally {
    const confirmBtn = document.getElementById('confirm-delete-btn');
    confirmBtn.textContent = 'Remove Plant';
    confirmBtn.disabled = false;
  }
}

window.openRegisterPlantModal = openRegisterPlantModal;
window.closeRegisterPlantModal = closeRegisterPlantModal;
window.refreshSerialDevices = refreshSerialDevices;
window.openDeletePlantModal = openDeletePlantModal;
window.closeDeletePlantModal = closeDeletePlantModal;
window.refreshDeleteSerialDevices = refreshDeleteSerialDevices;
window.confirmDeletePlant = confirmDeletePlant;
