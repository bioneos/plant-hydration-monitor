'use strict';

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
  const bindedDevicesDiv = document.getElementById('binded-devices');

  //i=1 skip template
  for(let i = 1; i < bindedDevicesDiv.children.length; i++) {
    const currentBindingSlot = bindedDevicesDiv.children[i];

    if(!currentBindingSlot.querySelector('[data-field="draggable-mac-address"]')) {
      showStatusMessage("Make sure all plants have a binded MAC Address", true);
      return;
    }
  }

  showStatusMessage("Updating bindings");

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

window.openPlantBindingsModal = openPlantBindingsModal;
window.unbindedDivDragover = unbindedDivDragover;
window.unbindedDivDrop = unbindedDivDrop;
window.updateBindings = updateBindings;
