// Store for privacy alerts
let privacyAlerts = [];

// Helper function to add an alert
function addPrivacyAlert(type, details) {
  const alert = {
    id: Date.now(),
    timestamp: new Date().toLocaleTimeString(),
    type: type,
    details: details
  };
  
  // Add to our alerts array
  privacyAlerts.push(alert);
  
  // Keep only the last 10 alerts
  if (privacyAlerts.length > 10) {
    privacyAlerts.shift();
  }
  
  // Store in chrome storage for persistence
  chrome.storage.local.set({ 'privacyAlerts': privacyAlerts });
  
  // Create notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'privacy.png',
    title: `Privacy Alert: ${type}`,
    message: details,
    priority: 2
  });
  
  // Update any open popups
  updatePopups();
  
  // If this is a high priority alert, open the popup
  if (type === 'Personal Data' || type === 'Third-Party Tracker') {
    openPopup();
  }
}

// Update all open popups with new data
function updatePopups() {
  chrome.runtime.sendMessage({
    action: 'updateAlerts',
    alerts: privacyAlerts
  });
}

// Open the extension popup
function openPopup() {
  chrome.action.openPopup();
}

// On extension startup, load existing alerts
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('privacyAlerts', (data) => {
    if (data.privacyAlerts) {
      privacyAlerts = data.privacyAlerts;
    }
  });
});

// Detect personal data in URLs
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    const personalDataPattern = /email|phone|location|address|ssn|passport|birthdate|name=/i;
    
    if (personalDataPattern.test(details.url)) {
      console.log("Potential personal data being sent: ", details.url);
      
      // Extract what type of data might be shared
      let dataTypes = [];
      if (/email/i.test(details.url)) dataTypes.push("email");
      if (/phone/i.test(details.url)) dataTypes.push("phone");
      if (/location/i.test(details.url)) dataTypes.push("location");
      if (/address/i.test(details.url)) dataTypes.push("address");
      if (/name=/i.test(details.url)) dataTypes.push("name");
      
      const dataTypeStr = dataTypes.join(", ");
      const domain = new URL(details.url).hostname;
      
      addPrivacyAlert('Personal Data', 
        `Potential ${dataTypeStr} data being sent to ${domain}`);
    }
  },
  { urls: ["<all_urls>"] },
  []
);

// Detect third-party trackers
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = details.url;
    const trackers = {
      "doubleclick.net": "Google DoubleClick",
      "googleads": "Google Ads",
      "facebook.com/tr": "Facebook Pixel",
      "analytics.google.com": "Google Analytics",
      "cdn.amplitude.com": "Amplitude",
      "js.intercomcdn.com": "Intercom"
    };
    
    for (const [trackerUrl, trackerName] of Object.entries(trackers)) {
      if (url.includes(trackerUrl)) {
        console.log(`${trackerName} tracker detected:`, url);
        
        addPrivacyAlert('Third-Party Tracker', 
          `${trackerName} is tracking your activity on ${details.initiator || "this site"}`);
        break;
      }
    }
  },
  { urls: ["<all_urls>"] },
  []
);

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getAlerts') {
    sendResponse({ alerts: privacyAlerts });
  } else if (request.action === 'clearAlerts') {
    privacyAlerts = [];
    chrome.storage.local.set({ 'privacyAlerts': [] });
    sendResponse({ success: true });
  } else if (request.action === 'contentAlert') {
    addPrivacyAlert('Content Scan', `Sensitive data detected on ${request.data.domain}`);
    sendResponse({ success: true });

  } else if (request.action === 'formSubmission') {
    addPrivacyAlert('Form Submission', `Form with sensitive data is being sent to ${request.data.action}`);
    sendResponse({ success: true });
  }
  return true; // Keeps the message channel open for async responses
});