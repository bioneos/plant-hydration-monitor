'use strict';

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

function closeEditPlantModal() {
  const modal = document.getElementById('edit-plant-modal');
  modal.classList.add('hidden');
  modal.style.display = 'none';

  clearStatusMessage();

  // Unbind statusMessage
  statusMessage.bindedDiv = null;

  detectedMacAddress = null;
}

window.openEditPlantModal = openEditPlantModal;
window.refreshEditSerialDevices = refreshEditSerialDevices;
window.updatePlantInfo = updatePlantInfo;
window.closeEditPlantModal = closeEditPlantModal;