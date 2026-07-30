'use strict';

class PlantDetailView {
  constructor() {
    this.plantId = this.getPlantIdFromUrl();
    this.moistureChart = null;
  }

  getPlantIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const idFromQuery = urlParams.get('id');

    if (idFromQuery) {
      return idFromQuery;
    }

    // fallback, get from path
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1];
  }

  async init() {
    try {
      console.log(`Loading plant details for ID: ${this.plantId}`);
      await this.loadPlantData();
      await this.loadChartData();
      this.showContent();
    } catch (error) {
      console.error('Failed to load plant data:', error);
      this.showError();
    }
  }

  async loadPlantData() {
    try {
      const plantResponse = await fetch(`/api/plant/${this.plantId}`);
      if (!plantResponse.ok) throw new Error('Plant not found');
      const plant = await plantResponse.json();

      const saturationResponse = await fetch(
        `/api/saturation/${this.plantId}/last`
      );
      let latestSaturation = null;
      if (saturationResponse.ok) {
        latestSaturation = await saturationResponse.json();
      }

      this.updatePlantInfo(plant, latestSaturation);
    } catch (error) {
      console.error('Error loading plant data:', error);
    }
  }

  updatePlantInfo(plant, latestSaturation) {
    const moisture = latestSaturation.moisture;
    const humidity = latestSaturation.humidity;
    const temperature = latestSaturation.temperature;

    document.getElementById('plant-name').textContent =
      plant.name || 'Plant Details';
    document.getElementById('plant-location').textContent =
      plant.location || 'Not specified';
    document.getElementById('plant-mac').textContent = plant.MAC || 'Unknown';


    if (moisture) {
      const moisturePercentage = Math.round(
        ((1023 - moisture) / 1023) * 100
      );
      document.getElementById('current-moisture').textContent =
        moisturePercentage;

      const status = this.getMoistureStatus(moisturePercentage);
      const statusElement = document.getElementById('moisture-status');
      statusElement.textContent = status;
      statusElement.className = `mt-2 text-sm font-medium ${this.getStatusColor(
        moisturePercentage
      )}`;

      const lastUpdated = new Date(latestSaturation.createdAt);
      document.getElementById('last-updated').textContent =
        lastUpdated.toLocaleString();
    } else {
      document.getElementById('current-moisture').textContent = '--';
      document.getElementById('moisture-status').textContent = 'No Data';
      document.getElementById('last-updated').textContent = 'Never';
    }
    
    if (humidity != null) {
      const humidityPercentage = humidity;
      document.getElementById('current-humidity').textContent =
        humidityPercentage

      const status = this.getHumidityStatus(humidityPercentage);
      const statusElement = document.getElementById('humidity-status');
      statusElement.textContent = status;
      statusElement.className = `mt-2 text-sm font-medium ${this.getStatusColor(
        humidityPercentage
      )}`;

    } else {
      document.getElementById('current-humidity').textContent = '--';
      document.getElementById('humidity-status').textContent = 'No Data';
    }

    if (temperature != null) {
      // Lower temperatures are blue, higher temperatures are red
      const maxTemperature= 37.8;
      const temperaturePercentage = Math.round((1 - temperature / maxTemperature) * 100);
      document.getElementById('current-temperature').textContent =
        temperature;

      const status = this.getTemperatureFarenheit(temperature)  + "°F";
      const statusElement = document.getElementById('temperature-status');
      statusElement.textContent = status;
      statusElement.className = `mt-2 text-sm font-medium ${this.getStatusColor(
        temperaturePercentage
      )}`;

    } else {
      document.getElementById('current-temperature').textContent = '--';
      document.getElementById('temperature-status').textContent = 'No Data';
    }
  }

  async loadChartData() {
    try {
      // load all saturation data for this plant
      const response = await fetch(`/api/saturation/${this.plantId}`);
      let allSaturationData;

      if (response.ok) {
        allSaturationData = await response.json();
        console.log('Loaded saturation data:', allSaturationData);
      } else {
        console.warn('No saturation data found');
      }

      this.createMoistureChart(allSaturationData.data);
      this.populateReadingsTable(allSaturationData.data);
    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  }

  createMoistureChart(data) {
    const ctx = document.getElementById('moistureChart').getContext('2d');

    const chartData = data.map((reading) => ({
      x: new Date(reading.createdAt),
      y: Math.round(((1023 - reading.moisture) / 1023) * 100),
    }));

    const isDarkMode = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;

    const gridColor = isDarkMode ? '#374151' : '#e5e7eb'; // gray-700 : gray-200
    const textColor = isDarkMode ? '#d1d5db' : '#374151'; // gray-300 : gray-700

    this.moistureChart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Moisture Level (%)',
            data: chartData,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 2,
            pointHoverRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'hour',
              displayFormats: {
                hour: 'MMM dd HH:mm',
              },
            },
            title: {
              display: true,
              text: 'Time',
              color: textColor,
            },
            ticks: {
              color: textColor,
            },
            grid: {
              color: gridColor,
              borderColor: gridColor,
            },
          },
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Moisture (%)',
              color: textColor,
            },
            ticks: {
              color: textColor,
              callback: function (value) {
                return value + '%';
              },
            },
            grid: {
              color: gridColor,
              borderColor: gridColor,
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: textColor,
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `Moisture: ${context.parsed.y}%`;
              },
            },
          },
        },
      },
    });
  }

  populateReadingsTable(readings) {

    const tbody = document.getElementById('readings-table');
    tbody.innerHTML = '';

    if (!readings || readings.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="px-6 py-4 text-center text-gray-500">
            No readings available
          </td>
        </tr>
      `;
      return;
    }

    // There are the same amount of temperature and humidity readings as moisture readings 
    // Iterate backwards to display newest readings first
    for(let i = readings.length - 1; i >= 0; i--) {
      const moisture = readings[i].moisture;
      const humidity = readings[i].humidity;
      const temperature = readings[i].temperature;

      const moisturePercentage = Math.round(
        ((1023 - moisture) / 1023) * 100
      );
      const status = this.getMoistureStatus(moisturePercentage);
      const statusColor = this.getStatusColor(moisturePercentage);

      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
          ${new Date(readings[i].createdAt).toLocaleString()}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
          ${moisture}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
          ${moisturePercentage}%
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
          ${humidity == null ? "No Data" : humidity + "%"}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
          ${temperature == null ? "No Data" : temperature + "°C"}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="text-sm font-medium ${statusColor}">${status}</span>
        </td>
      `;

      row.className =
        'hover:bg-gray-50 hover:shadow-md dark:hover:shadow-zinc-600 dark:hover:bg-zinc-700 transition duration-200 ease-in';

      tbody.appendChild(row);
    };
  }

  getMoistureStatus(percentage) {
    if (percentage >= 80) return 'Very Wet';
    if (percentage >= 60) return 'Well Watered';
    if (percentage >= 40) return 'Moderate';
    if (percentage >= 20) return 'Low Moisture';
    return 'Very Dry';
  }
  getHumidityStatus(percentage) {
    if (percentage >= 80) return 'Very Humid';
    if (percentage >= 60) return 'Quite Humid';
    if (percentage >= 40) return 'Moderately Humid';
    if (percentage >= 20) return 'Low Humidity';
    return 'Very Dry';
  }
  getTemperatureFarenheit(temperatureCelsius) {
    return Math.round((temperatureCelsius * 1.8) + 32);
  }

  getStatusColor(percentage) {
    if (percentage >= 80) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 60) return 'text-green-600 dark:text-green-400';
    if (percentage >= 40) return 'text-yellow-600 dark:text-yellow-400';
    if (percentage >= 20) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  }

  showContent() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('plant-content').classList.remove('hidden');
  }

  showError() {
    document.getElementById('loading').innerHTML = `
      <div class="text-center py-8">
        <p class="text-red-600">Failed to load plant data</p>
        <a href="/" class="mt-4 inline-block text-blue-600 hover:text-blue-800">← Back to Dashboard</a>
      </div>
    `;
  }

  // refresh only the data without full page reload
  async refreshData() {
    try {
      console.log('Refreshing plant data...');

      // Update plant info and get latest (single) saturation
      await this.loadPlantData();

      // chart data
      const response = await fetch(`/api/saturation/${this.plantId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch saturation data', response.statusText);
      }

      const readings = await response.json();
      console.log(readings);
      if (this.moistureChart) {
        const chartData = readings.data.map((reading) => ({
          x: new Date(reading.createdAt),
          y: Math.round(((1023 - reading.moisture) / 1023) * 100),
        }));

        this.moistureChart.data.datasets[0].data = chartData;
        this.moistureChart.update('none'); // no animation
      }

      this.populateReadingsTable(readings);

      console.log('Plant data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing plant data:', error);
    }
  }

  startAutoRefresh() {
    setInterval(() => {
      this.refreshData();
    }, 60000);
  }
}

$(document).ready(() => {
  const plantDetail = new PlantDetailView();
  plantDetail.init().then(() => {
    plantDetail.startAutoRefresh();
  });
});
