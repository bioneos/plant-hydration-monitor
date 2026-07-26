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

function createPlantCard(plant, data) {
  const template = document.getElementById('plant-card-template');
  const clone = template.content.cloneNode(true);

  // Handle case where there's no moisture data yet
  let moisturePercentage, moistureColor, moistureStatus;

  if (
    !data.moisture ||
    data.moisture === undefined ||
    data.moisture === null
  ) {
    // No data available yet
    moisturePercentage = 0;
    moistureColor = 'gray';
    moistureStatus = 'No Data';
  } else {
    const moistureLevel = data.moisture;
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
    // Don't navigate if delete button or edit button was clicked
    if (e.target.closest('[data-field="delete-btn"]') || e.target.closest('[data-field="open-edit-modal-btn"]')) {
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
    if(!plantsResponse.ok) {
      throw new Error(
        JSON.stringify({
          status: plantsResponse.status,
          statusText: plantsResponse.statusText,
        })
      );
    }
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
      console.log(saturationResult);
      const data =
        saturationResult.status === 'fulfilled' ? saturationResult.value : null;

      const cardElement = createPlantCard(plant, data);
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



// serial communication functionality
let detectedMacAddress = null;
/*
* @return
* "success" when configured or registered in db. "dbfail" when configured and failed db registration. void otherwise 
*/
async function configureDevice(formData, shouldRegisterInDatabase) {
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

      if(shouldRegisterInDatabase) {
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
            return 'success';
          } else {
            showStatusMessage(
              `Device configured but failed to save plant to database: ${
                plantResult.error || 'Unknown error'
              }`,
              true
            );
            return 'dbfail';
          }
        } catch (dbError) {
          console.error('Database error:', dbError);
          showStatusMessage(
            `Device configured but failed to save plant to database: ${dbError.message}`,
            true
          );
        }
      } else {
        return 'success';
      }
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
  const registerForm = document.getElementById('register-plant-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const formData = new FormData(registerForm);

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

      const response = await configureDevice(formData, true);
      if(response == 'success' || response == 'dbfail') {
        setTimeout(() => {
          closeRegisterPlantModal();
          fetchPlants(); // fetches plants from db to refresh
        }, 4000);
      }
    });
  }
  const editForm = document.getElementById('edit-plant-form');
  if (editForm) {
    editForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const formData = new FormData(editForm);

      // validate
      const requiredFields = [
        'plant-name',
        'plant-location',
        'serial-device'
      ];
      // see if a new device needs to be configured and add required fields if so
      // "<current" violates directory naming
      let shouldConfigure = true;
      const selectValue = formData.get('serial-device');
      if(selectValue.substring(0, 8) != "<current") {
        requiredFields.push('wifi-ssid', 'wifi-password', 'confirmation-checkbox');
      }
      else if(selectValue != null && selectValue != "" && selectValue != "null") {
        // set formData serial device value to MAC address
        formData.set('serial-device', formData.get('serial-device').substring(8, selectValue.length));
        shouldConfigure = false;
      }

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

      console.log(shouldConfigure);
      let configResponse = null;
      if(shouldConfigure) { 
        configResponse = await configureDevice(formData, false);
        formData.set('serial-device', detectedMacAddress);
      }
      if(configResponse == 'dbfail') {
        setTimeout(() => {
          closeRegisterPlantModal();
          fetchPlants(); // fetches plants from db to refresh
        }, 4000);
      }
      if(!shouldConfigure || (shouldConfigure && configResponse == 'success')) {
        await updatePlantInfo(formData);
        setTimeout(() => {
          closeEditPlantModal();
          fetchPlants(); // fetches plants from db to refresh
        }, 4000);
      }
    });
  }
});


// Utility function that returns plant card element of the childElement param
function getPlantCardFromChild(childElement) {
  // Find the plant card container - traverse up to find the card with plant data
  let plantCard = childElement.parentElement;

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
    return new Error("Could not find plant card container");
  }
  return plantCard;
}

window.openRegisterPlantModal = openRegisterPlantModal;
window.closeRegisterPlantModal = closeRegisterPlantModal;
window.refreshSerialDevices = refreshSerialDevices;
window.openDeletePlantModal = openDeletePlantModal;
window.closeDeletePlantModal = closeDeletePlantModal;
window.refreshDeleteSerialDevices = refreshDeleteSerialDevices;
window.confirmDeletePlant = confirmDeletePlant;