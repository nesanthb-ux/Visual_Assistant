# Visual Assistant - Multimodal AI Companion & Translator

**Visual Assistant** is a premium, web-based AI companion designed to provide intelligent visual context and real-time translation services. It leverages the power of **Google Gemini 3.0 Flash** models to "see" via your webcam and respond with human-like understanding.

![Visual Assistant Hero](https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=2000)

## 🌟 Key Features

### 1. Hey Buddy (AI Assistant)
*   **Voice Activation**: Continuous listening for the "Hey Buddy" wake word.
*   **Visual Context**: Periodically captures frames from the webcam to understand what you're looking at.
*   **Intelligent Dialogue**: Powered by Gemini 3.0 Flash via the **Google Agent Development Kit (ADK)**.
*   **Persistent Memory**: Remembers past turns in the conversation to handle follow-up questions.
*   **Speech-to-Speech**: Seamless integration of Web Speech API for natural voice interaction.

### 2. Live Translator
*   **Real-time Translation**: Instant translation of spoken word into multiple target languages (Spanish, French, German, etc.).
*   **Context-Aware**: Uses AI to maintain the nuance and tone of the original speech.
*   **Voice Synthesis**: Ability to speak back the translation or user-typed responses.
*   **Minimalist Interface**: High-contrast, accessibility-focused HUD.

## 🛠 Tech Stack

*   **Frontend**: React 19 + Vite 7 (TypeScript)
*   **Backend**: Express + Node.js (via `tsx`)
*   **AI Engine**: [Google Gemini 3.0 Flash](https://aistudio.google.com/)
*   **Frameworks**: 
    *   **Google ADK**: For agentic workflows and session management.
    *   **Framer Motion**: For fluid, state-driven UI animations.
    *   **TailwindCSS**: For modern, glassmorphic styling.
    *   **Lucide React**: For high-quality iconography.

---

## 🚀 Getting Started

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher)
*   A **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/).

### Installation

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/nesanthb-ux/Visual_Assistant.git
    cd Visual_Assistant
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Create a `.env` file in the root directory:
    ```env
    VITE_GEMINI_API_KEY=your_gemini_api_key_here
    PORT=3001
    ```
    *(Note: You can use `.env.example` as a template)*

### Running the Application

This project uses `concurrently` to run both the frontend and the backend server with a single command:

```bash
npm run dev
```

*   **Frontend**: `http://localhost:5173`
*   **Backend**: `http://localhost:3001`

---

## 📦 Deployment

### Deploying to Google Cloud Run

To deploy this application to Cloud Run, follow these steps:

1.  **Build the Project**:
    ```bash
    npm run build
    ```

2.  **Containerize and Deploy**:
    You can use the Google Cloud CLI or the built-in deployment tools to push the build to a container registry and deploy to Cloud Run. Ensure you set the `VITE_GEMINI_API_KEY` as an environment variable in the Cloud Run service configuration.

---

## 📖 Architecture

The app is divided into two main services:

*   **Vite Frontend**: Handles the UI, Camera access, and Web Speech API (Recognition/Synthesis).
*   **Express Backend**: Uses the **Google Agent Development Kit (ADK)** to manage `LlmAgent` instances for the Buddy and Translator features, providing structured session handling and persistent memory.

### Project Structure
```text
├── server.ts           # Express backend using Google ADK
├── src/
│   ├── components/     # UI Components (Buddy, Translator, Home)
│   ├── hooks/          # Custom hooks for Camera and Speech
│   ├── services/       # API services for communicating with the backend
│   └── App.tsx         # Main application entry point
└── public/             # Static assets
```

## 📜 License
MIT
