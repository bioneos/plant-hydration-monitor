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

  const moistureLevel = saturationData?.moisture ?? 0;
  const moisturePercentage = Math.round(((1023 - moistureLevel) / 1023) * 100);
  const moistureColor = getMoistureColor(moisturePercentage);
  const moistureStatus = getMoistureStatus(moisturePercentage);

  clone.querySelector('[data-field="name"]').textContent = plant.name;
  clone.querySelector(
    '[data-field="percentage"]'
  ).textContent = `${moisturePercentage}%`;
  clone.querySelector('[data-field="status"]').textContent = moistureStatus;

  const progressBar = clone.querySelector('[data-field="progress-bar"]');
  progressBar.className = `bg-${moistureColor}-500 h-3 rounded-full transition-all duration-500 ease-in-out`;
  progressBar.style.width = `${moisturePercentage}%`;

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
