'use strict';

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

window.showStatusMessage = showStatusMessage;
window.clearStatusMessage = clearStatusMessage;