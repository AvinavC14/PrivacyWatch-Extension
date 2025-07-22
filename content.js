
// 1. REGEX PATTERNS TO DETECT PERSONAL DATA

const patterns = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
};


// 2. FUNCTION TO SCAN ENTIRE PAGE TEXT FOR PERSONAL DATA

function scanPageContent() {
  const pageContent = document.body.innerText; 
  let foundData = {}; 
  let foundAny = false; 

  // Loop through each data type (e.g., email, phone)
  Object.entries(patterns).forEach(([dataType, pattern]) => {
    const matches = pageContent.match(pattern); // Try to find matches in page text
    if (matches) {
      foundData[dataType] = matches.length; // Store how many matches found
      foundAny = true;
    }
  });

  // If any personal data was found, proceed to check input fields
  if (foundAny) {
    const inputFields = document.querySelectorAll('input'); // Get all input fields
    const sensitiveInputs = Array.from(inputFields).filter(input => {
      const type = input.type;
      const name = (input.name || '').toLowerCase();
      const id = (input.id || '').toLowerCase();
      const placeholder = (input.placeholder || '').toLowerCase();

      // Return true for fields that may collect personal data
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

    // Send message to background script with details
    chrome.runtime.sendMessage({
      action: 'contentAlert',
      data: {
        url: window.location.href,
        domain: window.location.hostname,
        foundTypes: Object.keys(foundData), // e.g., ["email", "phone"]
        inputFields: sensitiveInputs.length > 0 // Just say whether inputs exist
      }
    });
  }
}


// 3. WATCH FOR DOM CHANGES (e.g., infinite scroll, AJAX loads)

const observer = new MutationObserver(mutations => {
  // Check if any mutation added more than 3 elements — indicates major change
  const bigChanges = mutations.some(mutation => mutation.addedNodes.length > 3);
  if (bigChanges) {
    scanPageContent();
  }
});

// Start observing changes to the entire document
observer.observe(document.body, {
  childList: true,   // Watch for added/removed elements
  subtree: true      // Watch all nested elements, not just body
});


// 4. MONITOR FORM SUBMISSIONS

document.addEventListener('submit', function(e) {
  const form = e.target;
  const inputsInForm = form.querySelectorAll('input');

  // Check if any input field in the form collects sensitive data
  const containsSensitiveInfo = Array.from(inputsInForm).some(input => {
    const inputType = input.type.toLowerCase();
    const inputName = (input.name || '').toLowerCase();

    // Return true if the input seems related to email, phone, name, etc.
    return (
      inputType === 'email' ||
      inputType === 'tel' ||
      inputType === 'password' ||
      inputName.includes('email') ||
      inputName.includes('phone') ||
      inputName.includes('address') ||
      inputName.includes('name')
    );
  });

  // If form has sensitive inputs, send alert to background script
  if (containsSensitiveInfo) {
    chrome.runtime.sendMessage({
      action: 'formSubmission',
      data: {
        url: window.location.href,
        domain: window.location.hostname,
        action: form.action // Where the form is trying to send data
      }
    });
  }
});


// 5. INITIAL PAGE SCAN

setTimeout(scanPageContent, 1000); // Delay a bit to allow content to load


