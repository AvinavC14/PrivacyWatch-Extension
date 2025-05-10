// Initialize popup
document.addEventListener('DOMContentLoaded', function() {
  // Request current alerts from background script
  chrome.runtime.sendMessage({ action: 'getAlerts' }, function(response) {
    if (response && response.alerts) {
      displayAlerts(response.alerts);
    }
  });
  
  // Set up clear button
  document.getElementById('clearBtn').addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'clearAlerts' }, function(response) {
      if (response && response.success) {
        document.getElementById('alertsList').innerHTML = 
          '<div class="empty-state">No privacy alerts detected</div>';
      }
    });
  });
});

// Listen for real-time updates from background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'updateAlerts') {
    displayAlerts(request.alerts);
  }
});

// Display alerts in the popup
function displayAlerts(alerts) {
  const alertsList = document.getElementById('alertsList');
  
  if (!alerts || alerts.length === 0) {
    alertsList.innerHTML = '<div class="empty-state">No privacy alerts detected</div>';
    return;
  }
  
  // Clear existing alerts
  alertsList.innerHTML = '';
  
  // Add alerts in reverse chronological order (newest first)
  alerts.slice().reverse().forEach(function(alert) {
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${alert.type.toLowerCase().replace(' ', '-')}`;
    
    alertElement.innerHTML = `
      <div class="alert-header">
        <span class="alert-type">${alert.type}</span>
        <span class="alert-time">${alert.timestamp}</span>
      </div>
      <div class="alert-message">${alert.details}</div>
    `;
    
    alertsList.appendChild(alertElement);
  });
  
  // Update badge with count of alerts
  chrome.action.setBadgeText({text: alerts.length.toString()});
  chrome.action.setBadgeBackgroundColor({color: '#f44336'});
}