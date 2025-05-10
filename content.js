// Regular expressions for detecting personal data
const patterns = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g
};

// Function to scan page content
function scanPageContent() {
  const pageContent = document.body.innerText;
  let foundData = {};
  let foundAny = false;
  
  // Check each pattern
  Object.entries(patterns).forEach(([dataType, pattern]) => {
    const matches = pageContent.match(pattern);
    if (matches) {
      foundData[dataType] = matches.length;
      foundAny = true;
    }
  });
  
  // If we found any sensitive data, notify the background script
  if (foundAny) {
    // Check for input fields that might collect this data
    const inputFields = document.querySelectorAll('input');
    const sensitiveInputs = Array.from(inputFields).filter(input => {
      const type = input.type;
      const name = (input.name || '').toLowerCase();
      const id = (input.id || '').toLowerCase();
      const placeholder = (input.placeholder || '').toLowerCase();
      
      return type === 'email' || 
             type === 'tel' ||
             type === 'password' ||
             name.includes('email') ||
             name.includes('phone') ||
             name.includes('zip') ||
             name.includes('credit') ||
             name.includes('card') ||
             id.includes('email') ||
             id.includes('phone') ||
             placeholder.includes('email') ||
             placeholder.includes('phone');
    });
    
    // Send message with details
    chrome.runtime.sendMessage({
      action: 'contentAlert',
      data: {
        url: window.location.href,
        domain: window.location.hostname,
        foundTypes: Object.keys(foundData),
        inputFields: sensitiveInputs.length > 0
      }
    });
  }
}

// Monitor DOM changes for dynamic content
const observer = new MutationObserver(function(mutations) {
  // If there are significant DOM changes, scan again
  if (mutations.some(mutation => mutation.addedNodes.length > 3)) {
    scanPageContent();
  }
});

// Monitor form submissions
document.addEventListener('submit', function(e) {
  const form = e.target;
  const formInputs = form.querySelectorAll('input');
  
  // Check if form has sensitive fields
  const hasSensitiveFields = Array.from(formInputs).some(input => {
    const type = input.type;
    const name = (input.name || '').toLowerCase();
    
    return type === 'email' || 
           type === 'tel' ||
           type === 'password' ||
           name.includes('email') ||
           name.includes('phone') ||
           name.includes('address') ||
           name.includes('name');
  });
  
  if (hasSensitiveFields) {
    chrome.runtime.sendMessage({
      action: 'formSubmission',
      data: {
        url: window.location.href,
        domain: window.location.hostname,
        action: form.action
      }
    });
  }
});

// Run initial scan
setTimeout(scanPageContent, 1000);

// Start observing the document
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false,
  characterData: false
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'scanNow') {
    scanPageContent();
    sendResponse({status: 'scan complete'});
  }
  return true;
});