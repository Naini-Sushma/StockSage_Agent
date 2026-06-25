# StockSage - AI Market Mentor 📈

**Built by Naini Sushma**  
**GENAI Internship - Milestone 2**

StockSage is an intelligent, educational stock market chatbot designed to help users learn about the financial markets safely. Powered by the Llama 3 (8B) model via the Groq API, StockSage acts as a personal financial tutor, breaking down complex stock concepts without ever giving direct financial advice.

## ✨ Key Features

- **Real-Time Stock Data:** Integrated with Yahoo Finance API to fetch live stock prices, daily highs, and lows seamlessly. No manual API keys required for stock data!
- **Agentic Memory System:** StockSage intelligently detects and remembers your Risk Tolerance (Low, Medium, High) and Investment Interests (Tech, EV, etc.) throughout your chat session, dynamically tailoring its educational examples to your profile.
- **Conversational Context:** The AI retains short-term conversational history, allowing you to ask follow-up questions seamlessly.
- **Session Management:** All chats are automatically saved to your browser's local storage. You can view, resume, or delete past conversations from the left sidebar.
- **Premium Glassmorphism UI:** Features a sleek, modern, frosted-glass design with dynamic glowing stock cards.
- **Vercel Ready:** Fully configured with a `vercel.json` proxy to ensure live stock data fetching works perfectly in a production environment.

## 🏗️ Architecture

This project is built on a **Serverless, Frontend-Driven Agentic Architecture**:
- **Client Layer:** The entire user interface, state management, and Agentic Loop logic are handled directly in the browser.
- **Proxy Layer:** Vercel acts as a secure reverse proxy to bypass browser CORS restrictions.
- **API Layer:** The system relies entirely on Backend-as-a-Service (BaaS) providers (Groq and Yahoo Finance) for intelligence and data.

## 💻 Tech Stack

- **Frontend & Logic:** Vanilla HTML, CSS3 (Glassmorphism), JavaScript (ES6+)
- **Build Tool:** Vite
- **AI / LLM Engine:** Meta Llama-3 (8B) via the Groq API
- **Live Data Provider:** Yahoo Finance API
- **Deployment & Hosting:** Vercel (Edge network & Serverless Functions)
- **Database / State:** Browser `localStorage`
- **Libraries:** DOMPurify (Security), Marked.js (Markdown Parsing), html2pdf.js (PDF Export)

## 👤 Author

- **Naini Sushma**
- Developed for GENAI Internship - Milestone 2

## ⚠️ Disclaimer
StockSage is an educational tool. It is hard-coded to refuse giving personalized investment advice, portfolio allocation, or buy/sell recommendations. Always do your own research or consult a certified financial planner.
