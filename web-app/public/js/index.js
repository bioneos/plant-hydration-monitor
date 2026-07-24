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
  const form = document.getElementById('register-plant-form');
  //bind status message to form
  statusMessage.bindedDiv = form;

  const modal = document.getElementById('register-plant-modal');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  // clear form
  form.reset();
  // clear any previous status messages
  clearStatusMessage();
  // load available serial devices
  refreshSerialDevices();

  //Handle show password checkbox
  const passwordInputField = document.getElementById("wifi-password");
  const showPasswordCheckbox = document.getElementById("show-password-checkbox");
  showPasswordCheckbox.addEventListener('change', function () {
    if(this.checked) {
      passwordInputField.type = "text";
    }
    else {
      passwordInputField.type = "password";
    }
  })
}

function closeRegisterPlantModal() {
  const modal = document.getElementById('register-plant-modal');
  modal.classList.add('hidden');
  modal.style.display = 'none';
  clearStatusMessage();
  statusMessage.bindedDiv = null;

  // reset form
  const form = document.getElementById('register-plant-form');
  if (form) {
    form.reset();
  }

  detectedMacAddress = null;
}


const statusMessage = {
  bindedDiv: null,
  okStyling: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700",
  errorStyling: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700"
}

//displays message as first child in bindedDiv
function showStatusMessage(message, isError = false) {
  // Remove any existing status message
  clearStatusMessage();
  if(statusMessage.bindedDiv) {
    const statusDiv = document.createElement('div');
    statusDiv.id = 'status-message';
    statusDiv.className = `mb-4 p-3 rounded-lg text-sm ${
      isError
        ? statusMessage.errorStyling
        : statusMessage.okStyling
    }`;
    statusDiv.textContent = message;

    statusMessage.bindedDiv.insertBefore(statusDiv, statusMessage.bindedDiv.firstChild);
  }
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

async function updatePlantInfo(formData) {
  console.log(formData.get('plant-name'), formData.get('plant-location'), formData.get('serial-device'));
  const response = await fetch(`/api/plant/${formData.get('plantId')}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: formData.get('plant-name'),
      location: formData.get('plant-location'),
      MAC: formData.get('serial-device'),
    }),
  });
  if(!response.ok) {
    showStatusMessage(
      "Failed to update plant",
      true
    )
  }
  else {
    showStatusMessage(
      "Successfully updated plant",
      false
    )
  }
}

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

function openEditPlantModal(editButton) {
  const plantCard = getPlantCardFromChild(editButton);

  if (Error.isError(plantCard)) {
    console.error(plantCard.message);
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

  const modal = document.getElementById('edit-plant-modal');
  const form = document.getElementById('edit-plant-form');
  const header = document.getElementById('edit-plant-modal-header');
  const headerSpan = document.getElementById('edit-plant-modal-header-span');

  const plantNameInput = document.getElementById('edit-plant-name');
  const plantLocationInput = document.getElementById('edit-plant-location');
  const plantDeviceInput = document.getElementById('edit-serial-device');
  
  const configDiv = document.getElementById('config-new-device-div');
  const confirmationCheckbox = document.getElementById('new-serial-device-confirmation-checkbox');
  
  /* Ready form */
  // header
  header.firstChild.textContent = "Editing plant: ";
  headerSpan.textContent = plantName;

  // inject plantId into hidden input
  document.getElementById('edit-hidden-plant-id').value = plantId;

  // Hide configure new device inputs  
  configDiv.classList.add('hidden');

  plantNameInput.addEventListener('focus', (e) => {
    plantNameInput.select();
  });
  plantLocationInput.addEventListener('focus', (e) => {
    plantLocationInput.select();
  });

  // Show new device configuration when anything other than the current device is selected
  plantDeviceInput.addEventListener('change', (e) => {

    const wifiNameInput = document.getElementById('edit-wifi-ssid');
    const wifiPasswordInput = document.getElementById('edit-wifi-password');

    if(plantDeviceInput.value == plantDeviceInput.children[0].value) {
      configDiv.classList.add('hidden');

      //reset checkbox
      confirmationCheckbox.checked = false;

      //remove required attributes
      wifiNameInput.required = false;
      wifiPasswordInput.required = false;
      confirmationCheckbox.required = false;
    }
    else {
      configDiv.classList.remove('hidden');

      //reset confirmation checkbox
      confirmationCheckbox.checked = false;

      // reset wifi inputs
      wifiNameInput.value = null;
      wifiPasswordInput.value = null;

      // add required attributes
      wifiNameInput.required = true;
      wifiPasswordInput.required = true;
      confirmationCheckbox.required = true;


      //Handle show password checkbox
      const showPasswordCheckbox = document.getElementById("edit-show-password-checkbox");
      //reset show password checkbox
      showPasswordCheckbox.checked = false;
      wifiPasswordInput.type = "password";

      showPasswordCheckbox.addEventListener('change', function () {
        if(this.checked) {
          wifiPasswordInput.type = "text";
        }
        else {
          wifiPasswordInput.type = "password";
        }
      })
    }
  });


/* Make form uneditable until the plant is fetched */
  // Make input fields uneditable until plant is fetched
  plantNameInput.readOnly = true;
  plantLocationInput.readOnly = true;
  plantDeviceInput.disabled = true;

  // Add pending color
  plantNameInput.classList.add("text-yellow-600");
  plantLocationInput.classList.add("text-yellow-600");
  plantDeviceInput.classList.add("text-yellow-600");

  // Add Fetching Plant Info text to inputs
  plantNameInput.value = "Fetching Plant Info";
  plantLocationInput.value = "Fetching Plant Info";

  // Add pending Option to select element
  const pendingOption = document.createElement('option');
  pendingOption.textContent = "Fetching Plant Info";
  pendingOption.selected = true;

  plantDeviceInput.prepend(pendingOption);

  // Bind status message
  statusMessage.bindedDiv = form;

  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';

  fetch(`api/plant/${plantId}`)
    .then(response => response.json())
      .catch(err => {
        console.error("Failed to fetch plant info: " + err);
        showStatusMessage("Failed to fetch plant info: " + err, true);
        throw err;
      })
        .then(plant => {
          
          // remove pending option
          plantDeviceInput.removeChild(pendingOption);

          // remove pending color
          plantNameInput.classList.remove("text-yellow-600");
          plantLocationInput.classList.remove("text-yellow-600");
          plantDeviceInput.classList.remove("text-yellow-600");

          // set fields with the fields the plant currently has
          plantNameInput.value = plant.name;
          plantNameInput.placeholder = plant.name;

          plantLocationInput.value = plant.location;
          plantLocationInput.placeholder = plant.location;

          // Set value of current device option and append it.
          plantDeviceInput.children[0].value = "<current" + plant.MAC;
          plantDeviceInput.children[0].textContent = `Current Device: ${plant.MAC}`;
                    

          // allow user to edit form fields
          plantNameInput.readOnly = false;
          plantLocationInput.readOnly = false;
          plantDeviceInput.disabled = false;

          // automatically selects defualt option
          plantDeviceInput.value = plant.MAC;

          // refresh serial devices
          refreshEditSerialDevices();
        })
  
}

// Delete plant functionality
let currentPlantToDelete = null;

function openDeletePlantModal(deleteButton) {
  const plantCard = getPlantCardFromChild(deleteButton);

  if (Error.isError(plantCard)) {
    console.error(plantCard.message);
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

// plant bindings drag functionality
let currentDraggedElement;
let currentBindingSlot;

function unbindedDivDragover(e) {
  //e.preventDefault() allows div to accept dragged elements 
  const unbindedDevicesDiv = document.getElementById('unbinded-devices'); 
  if(!unbindedDevicesDiv.contains(currentDraggedElement)) {
    e.preventDefault();
  }
}
function unbindedDivDrop(e) {
  e.preventDefault();          
  const unbindedDevicesDiv = document.getElementById('unbinded-devices'); 

  if(!unbindedDevicesDiv.contains(currentDraggedElement)) {
    // Set styling to match unbdinded devices div format 
    currentDraggedElement.style.margin = "auto";
    currentDraggedElement.style.marginBottom = "10px"

    currentDraggedElement.remove();
    unbindedDevicesDiv.append(currentDraggedElement);
  }
}

async function openPlantBindingsModal() {
  const modal = document.getElementById('plant-bindings-modal');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';

  const plantBindingTemplate = document.getElementById('plant-binding-template');
  const deviceBindingTemplate = document.getElementById('device-binding-template');

  const bindedDevicesDiv = document.getElementById('binded-devices');
  const unbindedDevicesDiv = document.getElementById('unbinded-devices');

  // bind status message
  statusMessage.bindedDiv = document.getElementById('plant-bindings-status-message');
  
  // setup cancel button
  const controller = new AbortController();
  const signal = controller.signal;

  const cancelButton = document.getElementById('bindings-cancel');
  cancelButton.addEventListener('click', () => {

    // cancel GET requests
    controller.abort("Cancel");

    const modal = document.getElementById('plant-bindings-modal');
    modal.classList.add('hidden');
    modal.style.display = 'none';

    clearStatusMessage();

    // Unbind statusMessage
    statusMessage.bindedDiv = null;

    // Reset modal
    //i>0 skip template
    for(let i = bindedDevicesDiv.children.length - 1; i > 0; i--) {
      bindedDevicesDiv.children[i].remove();
    }
    for(let i = unbindedDevicesDiv.children.length - 1; i > 0; i--) {
      unbindedDevicesDiv.children[i].remove();
    }
  }); 

  // display unbinded devices
  fetch('api/devices', { signal })
    .then(res => {
      if(res.ok) { 
        return res.json() 
      }
      // No ESP8266 devices on network
      throw new Error("No devices found 404");
    })
      .catch(err => {
        if(err.message === 'No devices found 404') {
          throw err;
        }
        if(controller.signal.reason === "Cancel") {
          throw new Error("Aborting GET request for devices");
        }
        showStatusMessage("Failed to find unbinded devices: " + err, true);
        throw new Error("Failed to find unbinded devices: " + err);
      })
      .then(devices => {
        console.log("Found Devices: ", devices);
        devices.forEach((device) => {
          const deviceBindingClone = deviceBindingTemplate.content.cloneNode(true);
          deviceBindingClone.querySelector('[data-field="mac-address"]').textContent = device.mac.toUpperCase();

          const deviceBindingMAC = deviceBindingClone.querySelector('[data-field="mac-address"]');
          deviceBindingMAC.classList.add("text-red-600");
          deviceBindingMAC.classList.add("dark:text-red-400");
          deviceBindingMAC.classList.add("text-red-600");

          deviceBindingClone.children[0].style.marginBottom = "10px";

          deviceBindingClone.children[0].dataset.mac = device.mac.toUpperCase();

          unbindedDevicesDiv.append(deviceBindingClone);
          

        });
        // drag functionality
        // i=1 skip template
        for(let i = 1; i < unbindedDevicesDiv.children.length; i++) {
          const draggableElement = unbindedDevicesDiv.children[i];
          draggableElement.addEventListener('dragstart', e => {
              currentDraggedElement = e.target;
          });
        }
      })
      .catch(err => {
        console.error(err);
      });

  // display binded devices and their plants
  fetch('api/plants', { signal })
    .then(res => {
      if(res.ok) {
        return res.json()
      }
      // No plants created yet
      throw error = new Error("No plants found 404");

    }) 
      .catch(err => {
        if(err.message === "No plants found 404") {
          throw err;
        }
        if(controller.signal.reason === "Cancel") {
          throw new Error("Aborting GET request for plants");
        }
        showStatusMessage("Failed to fetch plants: " + err, true);
        throw new Error("Failed to fetch plants: " + err);
      })
      .then(plants => {

        plants.forEach(plant => {
          const plantBindingClone = plantBindingTemplate.content.cloneNode(true);
          const deviceBindingClone = deviceBindingTemplate.content.cloneNode(true);

          plantBindingClone.querySelector('[data-field="name"]').textContent = (plant.name.length > 13 ? plant.name.substring(0, 13) + "..." : plant.name);

          plantBindingClone.children[0].dataset.plantId = plant.id;
          plantBindingClone.children[0].dataset.fullName = plant.name;
          plantBindingClone.children[0].dataset.location = plant.location;

          deviceBindingClone.querySelector('[data-field="mac-address"]').textContent = plant.MAC;

          deviceBindingClone.children[0].dataset.mac = plant.MAC;
          
          const deviceBindingMAC = deviceBindingClone.querySelector('[data-field="mac-address"]');
          deviceBindingMAC.classList.add("text-green-600");
          deviceBindingMAC.classList.add("dark:text-green-400");
          deviceBindingMAC.classList.add("text-green-600");

          const bindingSlot = plantBindingClone.querySelector('[data-field="binding-slot"]');

          bindedDevicesDiv.append(plantBindingClone);
          bindingSlot.append(deviceBindingClone);
          

        });
        // drag functionality
        // i=1 skip template
        for(let i = 1; i < bindedDevicesDiv.children.length; i++) {
          const draggableElement = bindedDevicesDiv.children[i].querySelector('[data-field="draggable-mac-address"]');
          const droppableBindingSlot = bindedDevicesDiv.children[i].querySelector('[data-field="binding-slot"]');

          draggableElement.addEventListener('dragstart', e => {
            currentDraggedElement = e.target;
          });

          droppableBindingSlot.addEventListener('dragover', e=> {
            if(!droppableBindingSlot.contains(droppableBindingSlot.querySelector('[data-field="draggable-mac-address"]'))) {
              e.preventDefault();
            }
          });
          droppableBindingSlot.addEventListener('drop', e=> {
            // Set styling to match unbdinded devices div format 
            currentDraggedElement.style.marginBottom = "0px"
            currentDraggedElement.style.margin = "auto";

            currentDraggedElement.remove();
            droppableBindingSlot.append(currentDraggedElement);
          });
        }
      })
      .catch(err => {
        console.error(err);
      }); 
}

async function updateBindings() {
  showStatusMessage("Updating bindings");

  const bindedDevicesDiv = document.getElementById('binded-devices');

  let plantsUpdated = [];

  //i=1 skip template
  for(let i = 1; i < bindedDevicesDiv.children.length; i++) {
    const currentBindingCard = bindedDevicesDiv.children[i];

    const plantId = currentBindingCard.dataset.plantId;
    const plantName = currentBindingCard.dataset.fullName;
    const plantLocation = currentBindingCard.dataset.location;
    const bindedMac = currentBindingCard.querySelector('[data-field="draggable-mac-address"]').dataset.mac;

    showStatusMessage("Updating bindings for plant: " + plantName);
    try {
      const response = await fetch(`/api/plant/${plantId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: plantName,
            location: plantLocation,
            MAC: bindedMac,
          }),
        });
      plantsUpdated.push(
        {
          plantName: plantName,
          bindedMac: bindedMac
        }
      );
    } catch(err) {
      console.error("Error attempting to update plant: " + plantName + " with id: " + plantId);
      showStatusMessage("Failed to update bindings for plant: " + plantName, true);
      setTimeout(() => {}, 1000);
    }
  }
  console.log(plantsUpdated);
  let updatedPlantsStr = "Successfully updated plants: ";
  plantsUpdated.forEach(binding => {
    updatedPlantsStr = updatedPlantsStr + binding.plantName + " with MAC Address " + binding.bindedMac + ", ";
  });
  showStatusMessage(updatedPlantsStr);
}

function closeEditPlantModal() {
  const modal = document.getElementById('edit-plant-modal');
  modal.classList.add('hidden');
  modal.style.display = 'none';

  clearStatusMessage();

  // Unbind statusMessage
  statusMessage.bindedDiv = null;

  detectedMacAddress = null;
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

async function refreshEditSerialDevices() {
  try {
    const refreshBtn = document.getElementById('edit-refresh-devices');
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

    const select = document.getElementById('edit-serial-device');

    const defaultOption = select.children[0];
    select.options.length = 0;
    select.appendChild(defaultOption);
    
    // Hide config inputs
    const configDiv = document.getElementById('config-new-device-div');
    configDiv.classList.add('hidden');

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
    }

    clearInterval(spinInterval);
    refreshBtn.disabled = false;
    refreshIcon.style.transform = 'rotate(0deg)';
  } catch (error) {
    console.error('Failed to refresh serial devices:', error);
    showStatusMessage(
      'Failed to refresh serial devices. Please try again.',
      true
    );
  }
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