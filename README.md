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

## 🚀 Getting Started

### Local Development
1. Clone this repository.
2. Open the project folder in your terminal.
3. Install dependencies: `npm install`
4. Start the Vite development server: `npm run dev`
5. Open your browser to `http://localhost:5173`

*(Note: The Groq API key is safely hardcoded for demo purposes, so no `.env` file configuration is necessary!)*

### Deployment
This project is configured for 1-click deployment on **Vercel**. 
1. Push your code to GitHub.
2. Log into Vercel and Import your repository.
3. Click Deploy! The `vercel.json` file will automatically handle the Yahoo Finance CORS proxy.

## ⚠️ Disclaimer
StockSage is an educational tool. It is hard-coded to refuse giving personalized investment advice, portfolio allocation, or buy/sell recommendations. Always do your own research or consult a certified financial planner.
