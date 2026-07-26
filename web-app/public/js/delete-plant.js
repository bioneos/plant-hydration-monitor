'use strict';

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

window.openDeletePlantModal = openDeletePlantModal;
window.closeDeletePlantModal = closeDeletePlantModal;
window.refreshDeleteSerialDevices = refreshDeleteSerialDevices;
window.confirmDeletePlant = confirmDeletePlant;