'use strict';

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