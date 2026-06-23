document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const typingIndicator = document.getElementById('typingIndicator');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const chips = document.querySelectorAll('.chip');
    
    // Settings Modal Elements Removed for Vercel Deployment

    // Agent Milestone 2 UI Elements
    const agentStatus = document.getElementById('agentStatus');
    const memoryText = document.getElementById('memoryText');
    const sidebarList = document.getElementById('sidebarList');
    const newChatBtn = document.getElementById('newChatBtn');

    let lastStockData = null; // Used to pass stock data to the UI card

    // User Search History (Sessions)
    let chatSessions = JSON.parse(localStorage.getItem('stocksage_sessions')) || [];
    let currentSessionId = null;

    // Agent Memory State
    let userMemory = JSON.parse(localStorage.getItem('market_mentor_memory')) || {
        riskTolerance: "Unknown",
        interests: []
    };
    // Instantly prune any bloated memory left over from before the fix
    if (userMemory.interests && userMemory.interests.length > 3) {
        userMemory.interests = userMemory.interests.slice(-3);
        localStorage.setItem('market_mentor_memory', JSON.stringify(userMemory));
    }

    function updateMemoryDisplay() {
        if (!memoryText) return;
        const risk = userMemory.riskTolerance || "Unknown";
        const interests = userMemory.interests && userMemory.interests.length > 0 
            ? userMemory.interests.join(", ") 
            : "None";
        memoryText.innerHTML = `Risk: <strong>${risk}</strong> | Interests: <strong>${interests}</strong>`;
    }
    updateMemoryDisplay();

    // --- Sidebar & Sessions Logic ---
    function renderSidebar() {
        if (!sidebarList) return;
        sidebarList.innerHTML = '';
        chatSessions.forEach(session => {
            const div = document.createElement('div');
            div.classList.add('history-item');
            if (session.id === currentSessionId) div.style.borderColor = 'var(--primary-color)';
            
            const span = document.createElement('span');
            span.classList.add('history-item-text');
            span.textContent = session.title;
            
            const delBtn = document.createElement('button');
            delBtn.classList.add('history-delete-btn');
            delBtn.textContent = '🗑️';
            delBtn.title = "Delete Chat";
            
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent loading chat
                chatSessions = chatSessions.filter(s => s.id !== session.id);
                localStorage.setItem('stocksage_sessions', JSON.stringify(chatSessions));
                if (currentSessionId === session.id) startNewChat();
                renderSidebar();
            });
            
            div.addEventListener('click', () => {
                loadSession(session.id);
            });
            
            div.appendChild(span);
            div.appendChild(delBtn);
            sidebarList.appendChild(div);
        });
    }

    function startNewChat() {
        // Automatically wipe Agent Memory for a fresh start!
        userMemory = { riskTolerance: "Unknown", interests: [] };
        localStorage.setItem('market_mentor_memory', JSON.stringify(userMemory));
        updateMemoryDisplay();

        currentSessionId = null;
        chatHistory = [];
        chatMessages.innerHTML = `
            <div class="message ai">
                <div class="message-bubble">
                    <div class="message-header-row">
                        <div style="width: 100%;"><p>Hello! I am StockSage. How can I help you learn about the stock market today?</p></div>
                        <button class="voice-btn" title="Read Aloud" onclick="speakText(this)" data-text="Hello! I am StockSage. How can I help you learn about the stock market today?">🔊</button>
                    </div>
                </div>
            </div>
        `;
        renderSidebar();
    }

    function loadSession(id) {
        const session = chatSessions.find(s => s.id === id);
        if (!session) return;
        currentSessionId = id;
        chatHistory = [];
        chatMessages.innerHTML = '';
        session.messages.forEach(msg => {
            if (msg.sender === 'user') {
                addMessage(msg.text, 'user');
                chatHistory.push({ sender: 'user', text: msg.text });
            } else {
                // Restore card data if it exists
                if (msg.cardData) lastStockData = msg.cardData;
                addMessage(msg.text, 'ai');
                chatHistory.push({ sender: 'ai', text: msg.text });
            }
        });
        renderSidebar();
    }

    newChatBtn.addEventListener('click', startNewChat);

    function setAgentStatus(status) {
        if (!agentStatus) return;
        const statusMap = {
            'idle': '🟢 Status: Idle',
            'planning': '🟡 Status: Planning...',
            'executing': '🔵 Status: Executing Tool...',
            'done': '🟢 Status: Done'
        };
        agentStatus.textContent = statusMap[status] || statusMap['idle'];
    }

    // System Prompt for Gemini
    const SYSTEM_PROMPT = `You are StockSage — an educational stock-market assistant. Your core workflow: Analyze stock concepts → Explain → Educate users. You must never provide personalized buy/sell recommendations, portfolio allocation, timing guidance, or any actionable financial advice. If a user requests such advice, refuse politely and offer educational alternatives (definitions, general principles, historical examples, evaluation methods, and exercises).

Plan:
- Analyze the user’s question and infer context and knowledge level.
- Produce layered explanations (brief summary → medium detail → deep dive) with clear definitions, examples, and illustrative calculations.
- Provide educational follow-ups (exercises, suggested reading, interactive calculators, quizzes).

Tool usage:
- CRITICAL RULE: YOU HAVE ACCESS TO LIVE MARKET DATA via your tools. If the user asks for a stock price (e.g., 'What is Apple's price?' or 'Tech Mahindra share price'), you MUST call the fetchStockPrice tool. Do NOT say you don't have access. You DO have access. Use the tool!
- DO NOT hallucinate raw string tags like <FUNCTION=fetchStockPrice>. You MUST use the official JSON tool calling array.
- Data to fetch: current price, percent change, market cap, volume, common ratios (P/E, dividend yield), and basic historical series (intraday, 1D/1W/1M/1Y).
- Cache short-term to limit API calls and handle errors/fallbacks gracefully; always indicate staleness if data is cached.

Memory & Personalization:
- Remember and use only these per-user items: risk tolerance (conservative / moderate / aggressive), interests (sectors/companies/topics), and optionally knowledge level (beginner/intermediate/advanced).
- Use memory solely to tailor educational content and examples — never to generate personalized investment advice.
- Allow users to view, edit, delete, or opt out of memory; disclose what is stored.

Safety & Responses:
- NO FINANCIAL ADVICE: If the user asks for personalized investment advice (like "Should I buy AAPL?" or "Is this good for low-risk?"), you MUST refuse to give advice. However, you SHOULD still fetch the stock price if they asked for it, and then explain the concept educationally.
- OFF-TOPIC RULE: If the user asks about completely non-finance topics (like freelancing, cooking, coding), refuse to answer. Do NOT confuse valid stock questions for off-topic questions!
- Present live data with clear source and timestamp, and explain what each metric means in plain language.
- Log and flag repeated requests for advice for monitoring.

Tone & UX:
- Professional, neutral, educational, and unbiased.
- Offer explanation depth controls (brief/detailed/step-by-step) and suggest follow-ups.
- When showing examples, prefer hypothetical or anonymized scenarios.`;

    // API Key Management (Securely loaded via Environment Variables)
    let apiKey = '';
    try {
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            apiKey = import.meta.env.VITE_GROQ_API_KEY || '';
        }
    } catch (e) {
        // Handle environments where import.meta is not available
    }
    
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

    // Helper to add a message to the chat UI
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.classList.add('message-bubble');

        if (sender === 'ai') {
            // Check if we have stock data to render a Stock Card
            let cardHtml = '';
            if (lastStockData && lastStockData.current_price) {
                const isUp = lastStockData.current_price >= lastStockData.open_price;
                cardHtml = `
                    <div class="stock-card">
                        <div class="stock-card-title">📈 ${lastStockData.symbol}</div>
                        <div class="stock-card-price">$${lastStockData.current_price}</div>
                        <div class="stock-card-stats">
                            <span class="${isUp ? 'stat-up' : 'stat-down'}">H: $${lastStockData.high_of_day}</span>
                            <span class="${isUp ? 'stat-up' : 'stat-down'}">L: $${lastStockData.low_of_day}</span>
                        </div>
                    </div>
                `;
            }

            const parsedText = DOMPurify.sanitize(marked.parse(text));
            
            // Build the header row with the text and the voice button
            bubbleDiv.innerHTML = `
                <div class="message-header-row">
                    <div style="width: 100%;">${cardHtml} ${parsedText}</div>
                    <button class="voice-btn" title="Read Aloud" onclick="speakText(this)">🔊</button>
                </div>
            `;
            // Attach the raw text to the button for the speech synthesis to read
            const btn = bubbleDiv.querySelector('.voice-btn');
            if(btn) btn.dataset.text = text;

            // Clear global stock data after consuming
            lastStockData = null;
        } else {
            const p = document.createElement('p');
            p.textContent = text;
            bubbleDiv.appendChild(p);
        }

        messageDiv.appendChild(bubbleDiv);
        chatMessages.appendChild(messageDiv);
        setTimeout(scrollToBottom, 100);
    }

    // Global function for TTS with Toggle functionality
    window.speakText = function(btn) {
        if (!('speechSynthesis' in window)) {
            alert("Sorry, your browser doesn't support Text-to-Speech!");
            return;
        }

        // If currently speaking, toggle it off
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            btn.textContent = '🔊';
            btn.title = 'Read Aloud';
            return;
        }

        const textToRead = btn.dataset.text || "I have nothing to read.";
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.rate = 1.0;
        
        utterance.onend = () => {
            btn.textContent = '🔊';
            btn.title = 'Read Aloud';
        };

        btn.textContent = '🔇';
        btn.title = 'Stop Reading';
        window.speechSynthesis.speak(utterance);
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

    // Tool: Fetch Live Stock Price (Yahoo Finance + CORS Proxy)
    async function fetchStockPrice(ticker) {
        try {
            // Strip out hallucinations like AAPL:US or TECHM:NSE
            let symbol = ticker.toUpperCase().split(':')[0];
            
            // If it's not a major US stock and doesn't already have a dot, assume Indian NSE
            if (!symbol.includes('.') && !['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'META', 'AMZN', 'NVDA', 'NFLX'].includes(symbol)) {
                symbol = symbol + '.NS';
            }

            // Route the request through our new Vite proxy (defined in vite.config.js) to bypass CORS blocks!
            const proxyUrl = `/api/yahoo/v8/finance/chart/${symbol}?interval=1d`;
            
            const res = await fetch(proxyUrl);
            
            if (!res.ok) {
                // If it's 404, it might mean Vite proxy isn't running or the ticker is invalid
                return JSON.stringify({ error: `Server returned ${res.status}. If this is a 404, please make sure you restarted your terminal server after the vite.config.js update!` });
            }
            const data = await res.json();
            
            if (!data.chart || data.chart.error) {
                return JSON.stringify({ error: (data.chart && data.chart.error && data.chart.error.description) || "Failed to fetch data." });
            }
            
            const result = data.chart.result[0];
            const meta = result.meta;
            
            return JSON.stringify({
                symbol: meta.symbol,
                current_price: meta.regularMarketPrice.toFixed(2),
                high_of_day: meta.regularMarketDayHigh.toFixed(2),
                low_of_day: meta.regularMarketDayLow.toFixed(2),
                open_price: meta.chartPreviousClose.toFixed(2),
                previous_close: meta.chartPreviousClose.toFixed(2),
                data_source: "Yahoo Finance API",
                timestamp: new Date().toISOString()
            });
        } catch (e) {
            return JSON.stringify({ error: "Stock data API is temporarily unreachable. Please try again later." });
        }
    }

    function updateUserMemory(riskTolerance, newInterests) {
        if (riskTolerance) userMemory.riskTolerance = riskTolerance;
        if (newInterests && Array.isArray(newInterests)) {
            // Dynamically overwrite to exactly what the AI detects in the current question
            userMemory.interests = newInterests.slice(0, 3);
        }
        localStorage.setItem('market_mentor_memory', JSON.stringify(userMemory));
        updateMemoryDisplay();
        return "Memory updated successfully.";
    }

    // Call Groq API with Agentic Loop
    async function fetchAIResponse(userText) {
        const url = `https://api.groq.com/openai/v1/chat/completions`;
        const messages = [];
        
        // Inject system prompt with dynamic memory
        const dynamicPrompt = `${SYSTEM_PROMPT}\n\nUSER PROFILE MEMORY:\n- Risk Tolerance: ${userMemory.riskTolerance}\n- Interests: ${userMemory.interests.join(", ")}\nCRITICAL INSTRUCTION: If the user states a new risk tolerance (e.g. 'I am high risk') or new interests, YOU MUST IMMEDIATELY CALL the updateUserMemory tool before replying!`;

        messages.push({ role: 'system', content: dynamicPrompt });
        
        // Restored conversational memory for the live demo!
        const recentHistory = chatHistory.length > 6 
            ? [chatHistory[0], ...chatHistory.slice(-5)] 
            : chatHistory;
            
        recentHistory.forEach(msg => {
            messages.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text });
        });

        messages.push({ role: 'user', content: userText });

        const tools = [
            {
                type: "function",
                function: {
                    name: "fetchStockPrice",
                    description: "Fetch the current stock price and daily high/low for a given stock. Use this tool WHENEVER the user asks for the current price, share price, or live data of a company or stock. If they provide a company name (e.g. Apple, Tech Mahindra), infer the correct ticker symbol (e.g. AAPL, TECHM). For Indian companies, ALWAYS append ':NSE' to the inferred ticker (e.g., 'TECHM:NSE', 'RELIANCE:NSE').",
                    parameters: {
                        type: "object",
                        properties: {
                            ticker: { type: "string", description: "The stock ticker symbol (e.g., AAPL, TSLA)" }
                        },
                        required: ["ticker"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "updateUserMemory",
                    description: "Update the user's risk tolerance or financial interests in their profile. CRITICAL INSTRUCTION: You MUST call this tool WHENEVER the user's prompt implies a risk tolerance (e.g. 'Is it good for low-risk?' -> riskTolerance: 'Low') or mentions new interests.",
                    parameters: {
                        type: "object",
                        properties: {
                            riskTolerance: { type: "string", description: "Risk tolerance level (e.g., Low, Medium, High)" },
                            interests: { type: "array", items: { type: "string" }, description: "Topics of interest (e.g., Crypto, Dividends, Tech)" }
                        }
                    }
                }
            }
        ];

        async function makeGroqRequest(msgArray) {
            const requestBody = {
                model: "llama-3.1-8b-instant",
                messages: msgArray,
                temperature: 0.7,
                max_tokens: 1000,
                tools: tools,
                tool_choice: "auto"
            };
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData?.error?.message || "Unknown API error");
            }
            return await response.json();
        }

        try {
            console.log("Sending initial request to Groq...");
            let data = await makeGroqRequest(messages);
            let responseMessage = data.choices[0].message;

            // Check if AI wants to call a tool
            if (responseMessage.tool_calls) {
                setAgentStatus('executing');
                messages.push(responseMessage); // Append assistant tool call

                for (const toolCall of responseMessage.tool_calls) {
                    const functionName = toolCall.function.name;
                    const functionArgs = JSON.parse(toolCall.function.arguments);
                    console.log(`AI called tool: ${functionName} with args:`, functionArgs);

                    let functionResponse = "";
                    if (functionName === "fetchStockPrice") {
                        functionResponse = await fetchStockPrice(functionArgs.ticker);
                        lastStockData = JSON.parse(functionResponse); // Save for UI card
                    } else if (functionName === "updateUserMemory") {
                        functionResponse = updateUserMemory(functionArgs.riskTolerance, functionArgs.interests);
                    }

                    messages.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: functionName,
                        content: functionResponse,
                    });
                }
                
                // Make second request to get final synthesis
                console.log("Sending tool results back to Groq for final answer...");
                setAgentStatus('planning'); // Change status back to planning while generating final answer
                data = await makeGroqRequest(messages);
                responseMessage = data.choices[0].message;
            }

            let finalContent = responseMessage.content || "";
            // Clean up any raw tool-call hallucinations from Llama 3
            finalContent = finalContent.replace(/<FUNCTION=[^>]+>.*?\}/g, '').trim();
            
            if (!finalContent) {
                return "I'm sorry, I encountered an internal communication error while fetching that data. This usually happens if the AI gets stuck. Could you please ask your question again?";
            }
            
            return finalContent;

        } catch (error) {
            console.error("Agent Error:", error);
            if (error.message && error.message.includes("Rate limit reached")) {
                return "Hold on! ⏳ You are asking questions a bit too fast for the free AI tier. Please wait 15 seconds for the Agent to catch its breath, and then try again!";
            }
            return `Oops! Something went wrong: ${error.message}`;
        }   
    }
    // Handle sending message
    async function handleSend(textParam) {
        const text = (textParam || userInput.value).trim();
        if (!text) return;

        // --- UNBREAKABLE DEMO FALLBACK ---
        // Just in case Llama 3 hits a rate limit or ignores the tool call, we forcibly update the UI
        const lowerText = text.toLowerCase();
        
        let detectedRisk = userMemory.riskTolerance;
        if (lowerText.includes('low risk') || lowerText.includes('low-risk') || lowerText.includes('conservative')) {
            detectedRisk = 'Low';
        } else if (lowerText.includes('high risk') || lowerText.includes('high-risk') || lowerText.includes('aggressive')) {
            detectedRisk = 'High';
        } else if (lowerText.includes('medium risk') || lowerText.includes('medium-risk')) {
            detectedRisk = 'Medium';
        }

        let detectedInterests = [...(userMemory.interests || [])];
        if (lowerText.includes('aapl') || lowerText.includes('apple')) {
            if (!detectedInterests.includes('Apple')) detectedInterests.push('Apple');
            if (!detectedInterests.includes('Tech')) detectedInterests.push('Tech');
        }
        if (lowerText.includes('tsla') || lowerText.includes('tesla')) {
            if (!detectedInterests.includes('Tesla')) detectedInterests.push('Tesla');
            if (!detectedInterests.includes('EV')) detectedInterests.push('EV');
        }
        if (lowerText.includes('msft') || lowerText.includes('microsoft')) {
            if (!detectedInterests.includes('Microsoft')) detectedInterests.push('Microsoft');
        }

        // Only update if something was detected
        if (detectedRisk !== userMemory.riskTolerance || detectedInterests.length > userMemory.interests.length) {
            updateUserMemory(detectedRisk, detectedInterests);
        }
        // ---------------------------------

        // Reset input
        userInput.value = '';
        userInput.style.height = 'auto';
        userInput.focus();

        // Display user message
        addMessage(text, 'user');
        chatHistory.push({ sender: 'user', text: text });

        // Save to Session Storage
        if (!currentSessionId) {
            currentSessionId = Date.now().toString();
            chatSessions.unshift({ id: currentSessionId, title: text, messages: [] });
        }
        
        let session = chatSessions.find(s => s.id === currentSessionId);
        if (session) {
            session.messages.push({ sender: 'user', text: text });
            localStorage.setItem('stocksage_sessions', JSON.stringify(chatSessions));
            renderSidebar();
        }

        // Remove welcome screen if it exists
        const welcomeScreen = document.getElementById('welcomeScreen');
        if (welcomeScreen) {
            welcomeScreen.remove();
        }

        // Show typing and status
        setTyping(true);
        sendBtn.disabled = true;
        setAgentStatus('planning');

        // Fetch AI Response
        const aiResponse = await fetchAIResponse(text);

        // Hide typing and show response
        setTyping(false);
        setAgentStatus('done');
        setTimeout(() => setAgentStatus('idle'), 2000);
        // Backup stock data before addMessage consumes it
        let lastStockDataBackup = null;
        if (lastStockData) {
            lastStockDataBackup = JSON.parse(JSON.stringify(lastStockData));
        }
        
        addMessage(aiResponse, 'ai');
        chatHistory.push({ sender: 'ai', text: aiResponse });
        // Save AI Response to Session Storage
        let currentSess = chatSessions.find(s => s.id === currentSessionId);
        if (currentSess) {
            let aiMsg = { sender: 'ai', text: aiResponse };
            if (lastStockDataBackup) aiMsg.cardData = lastStockDataBackup;
            currentSess.messages.push(aiMsg);
            localStorage.setItem('stocksage_sessions', JSON.stringify(chatSessions));
        }

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

    clearChatBtn.addEventListener('click', startNewChat);

    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', () => {
            const element = document.getElementById('chatMessages');
            
            // Add a temporary class to fix html2pdf CSS variable issues
            element.classList.add('pdf-export');

            const opt = {
                margin:       0.5,
                filename:     'MarketMentor_Study_Guide.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 3, useCORS: true, backgroundColor: '#ffffff' },
                jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
            };
            
            html2pdf().set(opt).from(element).save().then(() => {
                // Remove the class after PDF is generated
                element.classList.remove('pdf-export');
            });
        });
    }

    // Init App State
    renderSidebar();
    startNewChat();
    userInput.focus();
});