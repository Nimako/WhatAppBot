// Get session ID from URL
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('session');

if (!sessionId) {
    alert('Invalid session. Please access this page through the WhatsApp bot.');
    window.location.href = '/';
}

// Initialize Socket.IO
const socket = io();
let currentState = 'MENU';
let currentFormData = {};
let currentFieldIndex = 0;
const formFields = [
    { key: 'phoneNumber', label: 'Phone Number', required: true },
    { key: 'meterNumber', label: 'Meter Number', required: true },
    { key: 'accountNumber', label: 'Account Number', required: false }
];

// Join session room
socket.emit('join-session', sessionId);

// Socket event listeners
socket.on('message', (data) => {
    handleBotMessage(data.text);
});

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    showToast('Connection lost. Please refresh the page.');
});

// Load initial session state
async function loadSession() {
    try {
        const response = await fetch(`/api/web/session/${sessionId}`);
        const data = await response.json();
        
        if (data.success) {
            currentState = data.session.currentState;
            currentFormData = data.session.sessionData || {};
            
            if (currentState === 'MENU') {
                showScreen('menuScreen');
            } else {
                // Handle other states
                handleState(currentState);
            }
        }
    } catch (error) {
        console.error('Error loading session:', error);
        showToast('Error loading session');
    }
}

// Show screen
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    
    // Show/hide back button
    const backBtn = document.getElementById('backBtn');
    if (screenId === 'menuScreen') {
        backBtn.style.display = 'none';
    } else {
        backBtn.style.display = 'flex';
    }
}

// Select menu option
async function selectOption(option) {
    if (option === '3') {
        showToast('Charge Status feature coming soon');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('/api/web/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: sessionId,
                message: option
            })
        });
        
        const data = await response.json();
        showLoading(false);
        
        if (data.success) {
            if (option === '1' || option === '2') {
                currentFieldIndex = 0;
                showFormScreen();
            }
        } else {
            showToast(data.error || 'Error processing request');
        }
    } catch (error) {
        showLoading(false);
        showToast('Error sending request');
    }
}

// Show form screen
function showFormScreen() {
    showScreen('formScreen');
    renderFormField();
}

// Render current form field
function renderFormField() {
    const formContent = document.getElementById('formContent');
    const formStep = document.getElementById('currentStep');
    
    if (currentFieldIndex >= formFields.length) {
        // All fields collected, submit
        submitForm();
        return;
    }
    
    const field = formFields[currentFieldIndex];
    const isOptional = !field.required;
    
    formStep.textContent = `Step ${currentFieldIndex + 1} of ${formFields.length}`;
    
    formContent.innerHTML = `
        <h2>${field.label}</h2>
        <div class="form-group">
            <label>${field.label}${isOptional ? ' (Optional)' : ''}</label>
            <input 
                type="text" 
                id="formInput" 
                placeholder="Enter ${field.label.toLowerCase()}"
                value="${currentFormData[field.key] || ''}"
                autocomplete="off"
            >
        </div>
        <div class="form-actions">
            ${isOptional ? '<button class="btn btn-secondary" onclick="skipField()">Skip</button>' : ''}
            <button class="btn btn-primary" onclick="nextField()">Next</button>
        </div>
    `;
    
    // Focus input
    setTimeout(() => {
        const input = document.getElementById('formInput');
        if (input) {
            input.focus();
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    nextField();
                }
            });
        }
    }, 100);
}

// Next field
async function nextField() {
    const input = document.getElementById('formInput');
    const value = input.value.trim();
    
    if (!value && formFields[currentFieldIndex].required) {
        showToast('This field is required');
        return;
    }
    
    currentFormData[formFields[currentFieldIndex].key] = value;
    currentFieldIndex++;
    
    if (currentFieldIndex < formFields.length) {
        renderFormField();
    } else {
        // All fields collected
        submitForm();
    }
}

// Skip field
function skipField() {
    currentFieldIndex++;
    renderFormField();
}

// Submit form
async function submitForm() {
    showLoading(true);
    
    // Send all collected data as messages
    for (let i = 0; i < formFields.length; i++) {
        const field = formFields[i];
        const value = currentFormData[field.key];
        
        if (value || field.required) {
            try {
                await fetch('/api/web/message', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sessionId: sessionId,
                        message: value || 'SKIP'
                    })
                });
            } catch (error) {
                console.error('Error sending field:', error);
            }
        }
    }
    
    showLoading(false);
    showToast('Processing your request...');
}

// Handle bot message
function handleBotMessage(text) {
    // Check if it's a menu
    if (text.includes('ECG Credit Purchase Bot') || text.includes('Please select an option')) {
        currentState = 'MENU';
        showScreen('menuScreen');
        return;
    }
    
    // Check if it's asking for input
    if (text.includes('Please provide') || text.includes('Please enter')) {
        // Extract field name
        const fieldMatch = text.match(/\*([^*]+)\*/);
        if (fieldMatch) {
            const fieldName = fieldMatch[1];
            const field = formFields.find(f => f.label === fieldName);
            if (field) {
                currentFieldIndex = formFields.indexOf(field);
                showFormScreen();
            }
        }
        return;
    }
    
    // Check if it's enquiry results
    if (text.includes('Account Enquiry Results') || text.includes('Customer Name')) {
        showResultScreen(text);
        return;
    }
    
    // Check if it's confirmation
    if (text.includes('Would you like to proceed') || text.includes('confirm')) {
        showConfirmationScreen(text);
        return;
    }
    
    // Show toast for other messages
    showToast(text.replace(/\*/g, '').substring(0, 50));
}

// Show result screen
function showResultScreen(text) {
    showScreen('resultScreen');
    const container = document.getElementById('resultContainer');
    
    // Parse text to extract information
    const lines = text.split('\n');
    const items = [];
    
    lines.forEach(line => {
        if (line.includes(':')) {
            const [label, value] = line.split(':').map(s => s.trim());
            if (label && value) {
                items.push({ label: label.replace(/\*/g, ''), value });
            }
        }
    });
    
    let html = '<h2>Account Details</h2>';
    items.forEach(item => {
        html += `
            <div class="result-item">
                <span class="result-item-label">${item.label}</span>
                <span class="result-item-value">${item.value}</span>
            </div>
        `;
    });
    
    html += `
        <div class="form-actions" style="margin-top: 30px;">
            <button class="btn btn-secondary" onclick="cancelTransaction()">Cancel</button>
            <button class="btn btn-primary" onclick="confirmTransaction()">Confirm</button>
        </div>
    `;
    
    container.innerHTML = html;
}

// Show confirmation screen
function showConfirmationScreen(text) {
    showScreen('resultScreen');
    const container = document.getElementById('resultContainer');
    
    container.innerHTML = `
        <h2>Confirm Transaction</h2>
        <p style="color: #666; margin: 20px 0;">${text.replace(/\*/g, '')}</p>
        <div class="form-actions">
            <button class="btn btn-secondary" onclick="cancelTransaction()">No</button>
            <button class="btn btn-primary" onclick="confirmTransaction()">Yes</button>
        </div>
    `;
}

// Confirm transaction
async function confirmTransaction() {
    showLoading(true);
    
    try {
        const response = await fetch('/api/web/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: sessionId,
                message: 'YES'
            })
        });
        
        const data = await response.json();
        showLoading(false);
        
        if (data.success) {
            showToast('Transaction confirmed!');
            setTimeout(() => {
                showScreen('menuScreen');
            }, 2000);
        }
    } catch (error) {
        showLoading(false);
        showToast('Error confirming transaction');
    }
}

// Cancel transaction
async function cancelTransaction() {
    showLoading(true);
    
    try {
        const response = await fetch('/api/web/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: sessionId,
                message: 'NO'
            })
        });
        
        showLoading(false);
        showScreen('menuScreen');
    } catch (error) {
        showLoading(false);
        showToast('Error cancelling transaction');
    }
}

// Go back
function goBack() {
    if (currentState === 'MENU') {
        showScreen('menuScreen');
    } else {
        // Reset to menu
        fetch(`/api/web/reset/${sessionId}`, { method: 'POST' })
            .then(() => {
                showScreen('menuScreen');
                currentState = 'MENU';
            });
    }
}

// Switch to web interface
function switchToWeb() {
    window.location.href = `/web?session=${sessionId}`;
}

// Show loading
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

// Show toast
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Handle state
function handleState(state) {
    // Implementation for handling different states
    if (state.includes('METER_INFO')) {
        showFormScreen();
    } else if (state === 'MENU') {
        showScreen('menuScreen');
    }
}

// Initialize
loadSession();

