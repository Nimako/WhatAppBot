// Get session ID from URL
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('session');

if (!sessionId) {
    alert('Invalid session. Please access this page through the WhatsApp bot.');
    window.location.href = '/';
}

// Initialize Socket.IO
const socket = io();
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.querySelector('.send-btn');

// Join session room
socket.emit('join-session', sessionId);

// Load initial session state
async function loadSession() {
    try {
        const response = await fetch(`/api/web/session/${sessionId}`);
        const data = await response.json();
        
        if (data.success) {
            // If in MENU state, show menu with URL
            if (data.session.currentState === 'MENU') {
                // Use current origin for web interface (client-side)
                const baseUrl = window.location.origin;
                const webUrl = `${baseUrl}/web?session=${sessionId}`;
                addMessage('bot', `*ECG Credit Purchase Bot*\n\nPlease select an option:\n1️⃣ Prepaid\n2️⃣ Postpaid\n3️⃣ Charge Status\n4️⃣ By from Web : ${webUrl}\n\nReply with the number of your choice.\n\n*Tip:* Type  *STOP*,  or *CANCEL* at any time to cancel and start over.`);
            }
        }
        return true;
    } catch (error) {
        console.error('Error loading session:', error);
        addMessage('bot', 'Error loading session. Please refresh the page.');
        return false;
    }
}

// Socket event listeners
socket.on('message', (data) => {
    addMessage(data.type, data.text);
});

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    addMessage('bot', 'Connection lost. Please refresh the page.');
});

// Add message to chat
function addMessage(type, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const textP = document.createElement('p');
    // Format text (convert *bold* to <strong>)
    textP.innerHTML = formatMessage(text);
    contentDiv.appendChild(textP);
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = getTimeString();
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeSpan);
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
    
    // If menu was just shown, ensure input is visible on mobile
    if (type === 'bot' && text.includes('ECG Credit Purchase Bot')) {
        setTimeout(() => {
            ensureInputVisible();
        }, 100);
    }
}

// Format message text (convert WhatsApp formatting)
function formatMessage(text) {
    if (!text) return '';
    
    // Convert *bold* to <strong>bold</strong>
    text = text.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
    
    // Convert emojis (basic support)
    // You can expand this with more emoji conversions
    
    // Preserve line breaks
    text = text.replace(/\n/g, '<br>');
    
    return text;
}

// Get current time string
function getTimeString() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

// Scroll to bottom of messages
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send message
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Add user message to UI immediately
    addMessage('user', message);
    messageInput.value = '';
    sendBtn.disabled = true;
    
    // Show loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot-message';
    loadingDiv.innerHTML = '<div class="message-content"><p><span class="loading"></span> Processing...</p></div>';
    messagesContainer.appendChild(loadingDiv);
    scrollToBottom();
    
    try {
        const response = await fetch('/api/web/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: sessionId,
                message: message
            })
        });
        
        const data = await response.json();
        
        // Remove loading indicator
        loadingDiv.remove();
        
        if (data.success) {
            // Message will be received via WebSocket, so don't add it here to avoid duplicates
            // WebSocket is the primary method for real-time updates
        } else {
            addMessage('bot', `Error: ${data.error || 'Failed to send message'}`);
        }
    } catch (error) {
        console.error('Error sending message:', error);
        loadingDiv.remove();
        addMessage('bot', 'Error sending message. Please try again.');
    } finally {
        sendBtn.disabled = false;
        messageInput.focus();
    }
}

// Handle Enter key press
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Show menu
async function showMenu() {
    try {
        const response = await fetch(`/api/web/reset/${sessionId}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        // Menu message will be received via WebSocket, so don't add it here to avoid duplicates
        if (!data.success) {
            addMessage('bot', 'Error loading menu. Please try again.');
        }
    } catch (error) {
        console.error('Error showing menu:', error);
        addMessage('bot', 'Error loading menu. Please try again.');
    }
}

// Switch to mobile interface
function switchToMobile() {
    window.location.href = `/mobile?session=${sessionId}`;
}

// Ensure input is visible and focused after menu loads
function ensureInputVisible() {
    // Scroll to bottom to show input
    scrollToBottom();
    
    // Focus input after a short delay to ensure it's visible
    setTimeout(() => {
        if (messageInput) {
            messageInput.focus();
            // Scroll input into view on mobile
            if (window.innerWidth <= 480) {
                messageInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, 300);
}

// Initialize on page load
loadSession().then(() => {
    ensureInputVisible();
}).catch(() => {
    // Even if loadSession fails, try to show input
    ensureInputVisible();
});

