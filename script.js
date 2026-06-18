document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const typingIndicator = document.getElementById('typingIndicator');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const chips = document.querySelectorAll('.chip');
    
    // Settings Modal Elements
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveKeyBtn = document.getElementById('saveKeyBtn');

    // System Prompt for Gemini
    const SYSTEM_PROMPT = `You are StockSage, a stock market educator.
Strict Rules:
1. Stay strictly within stock market education.
2. Refuse off-topic questions politely.
3. NEVER give buy, sell, or hold recommendations for any specific stock, asset, or security.
4. Explain concepts using beginner-friendly language.
5. Use headings, bullet points, and tables when helpful.
6. Include practical examples wherever possible.
7. End every educational response exactly with this phrase: "Remember: Learning the market is the first step toward making informed financial decisions."`;

    // API Key Management
    let apiKey = localStorage.getItem('gemini_api_key') || '';
    try {
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
            apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        }
    } catch (e) {
        // Handle environments where import.meta is not available
    }
    
    function toggleModal(show) {
        if (show) {
            apiKeyInput.value = apiKey;
            settingsModal.classList.remove('hidden');
        } else {
            settingsModal.classList.add('hidden');
        }
    }

    settingsBtn.addEventListener('click', () => toggleModal(true));
    closeModalBtn.addEventListener('click', () => toggleModal(false));
    saveKeyBtn.addEventListener('click', async () => {
        apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem('gemini_api_key', apiKey);
            console.log("Checking available models for your API key...");
            try {
                const checkUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
                const res = await fetch(checkUrl);
                const data = await res.json();
                alert(
                    data.models
                        .map(model => model.name)
                        .join('\n')
                );
                if(data.error) {
                    console.error("API Key Error:", data.error.message);
                    alert("API Key Error: " + data.error.message);
                } else {
                    alert("API Key Saved and Validated! Check console for supported models.");
                }
            } catch(e) {
                console.error(e);
            }
        } else {
            localStorage.removeItem('gemini_api_key');
        }
        toggleModal(false);
    });

    // Chat History Array for context
    let chatHistory = [];

    // Auto-resize textarea
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value.trim() === '') {
            this.style.height = 'auto';
        }
    });

    // Scroll to bottom
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Add message to UI
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);

        const bubbleDiv = document.createElement('div');
        bubbleDiv.classList.add('message-bubble');

        if (sender === 'ai') {
            // Render markdown for AI
            bubbleDiv.innerHTML = DOMPurify.sanitize(marked.parse(text));
        } else {
            // Plain text for user
            const p = document.createElement('p');
            p.textContent = text;
            bubbleDiv.appendChild(p);
        }

        messageDiv.appendChild(bubbleDiv);
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    // Show/Hide Typing Indicator
    function setTyping(isTyping) {
        if (isTyping) {
            typingIndicator.classList.remove('hidden');
            chatMessages.appendChild(typingIndicator); // Move to bottom
            scrollToBottom();
        } else {
            typingIndicator.classList.add('hidden');
        }
    }

    // Call Gemini API
    async function fetchAIResponse(userText) {
        if (!apiKey) {
            toggleModal(true);
            return "Please set your Gemini API key in settings first.";
        }


        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const contents = [];
        
        // Inject system prompt as the first exchange
        contents.push({
            role: 'user',
            parts: [{ text: SYSTEM_PROMPT }]
        });
        contents.push({
            role: 'model',
            parts: [{ text: 'Understood. I will act strictly as StockSage, focusing on stock market education without giving investment advice, and I will always end my responses with the required disclaimer.' }]
        });

        // Add actual chat history
        chatHistory.forEach(msg => {
            contents.push({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            });
        });

        // Add new user message
        contents.push({
            role: 'user',
            parts: [{ text: userText }]
        });

     const requestBody = {
    contents: contents,
    generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
    }
};

console.log("Request URL:", url);

try {
    console.log("Sending request to Gemini...");
    console.log("URL:", url);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    console.log("Response received:", response.status);

    if (!response.ok) {
        const errData = await response.json();
        console.error("API Error:", errData);

        return `API Error: ${
            errData?.error?.message || "Unknown error"
        }`;
    }

    const data = await response.json();

    if (
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0]
    ) {
        return data.candidates[0].content.parts[0].text;
    }

    console.log("Unexpected response:", data);
    return "I received an unexpected response format.";

} catch (error) {
    console.error("Fetch Error:", error);
    return "Oops! Something went wrong with your network connection. Please check your internet and try again.";
}   
}
    // Handle sending message
    async function handleSend(text) {
        const trimmed = text.trim();
        if (!trimmed) return;

        // Reset input
        userInput.value = '';
        userInput.style.height = 'auto';
        userInput.focus();

        // Display user message
        addMessage(trimmed, 'user');
        chatHistory.push({ sender: 'user', text: trimmed });

        // Show typing
        setTyping(true);
        sendBtn.disabled = true;

        // Fetch AI Response
        const aiResponse = await fetchAIResponse(trimmed);

        // Hide typing and show response
        setTyping(false);
        addMessage(aiResponse, 'ai');
        chatHistory.push({ sender: 'ai', text: aiResponse });
        sendBtn.disabled = false;
    }

    // Event Listeners
    sendBtn.addEventListener('click', () => handleSend(userInput.value));

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(userInput.value);
        }
    });

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            handleSend(chip.textContent);
        });
    });

    clearChatBtn.addEventListener('click', () => {
        chatHistory = [];
        chatMessages.innerHTML = `
            <div class="message ai">
                <div class="message-bubble">
                    <p>Hello! I am StockSage. How can I help you learn about the stock market today?</p>
                </div>
            </div>
        `;
    });

    // Init focus
    userInput.focus();
});