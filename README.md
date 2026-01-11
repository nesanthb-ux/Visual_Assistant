# Hey Buddy - Multimodal AI Assistant

**Hey Buddy** is a web-based AI assistant that uses voice and video to interact with users. It listens for the wake word "Hey Buddy", and when asked questions, it can see what you see via your webcam and respond intelligently using the **Google Gemini API**.

## Features

*   **Voice Activation**: Continuously listens for "Hey Buddy" to wake up.
*   **Visual Understanding**: Captures meaningful frames from the webcam to provide context-aware answers.
*   **Conversational AI**: Powered by Google's Gemini Multimodal models for natural, helpful responses.
*   **Voice Response**: Speaks back to the user using synthesized speech.
*   **Immersive Design**: A "Jarvis-like" HUD that visualizes the assistant's state (Idle, Listening, Processing, Speaking).

## Architecture & Tech Stack

The application is built with a modern frontend stack designed for performance and aesthetics:

*   **Frontend**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
    *   Fast, responsive UI with hot module replacement.
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
    *   Type-safe code for better maintainability.
*   **Styling**: [TailwindCSS](https://tailwindcss.com/)
    *   Utility-first CSS for rapid UI development.
*   **Animations**: [Framer Motion](https://www.framer.com/motion/)
    *   Fluid animations for UI states (pulsing circles, transitions).
*   **AI Integration**: [Google Generative AI SDK](https://www.npmjs.com/package/@google/generative-ai)
    *   Direct integration with Gemini 1.5 Flash models.
*   **Speech Services**:
    *   **STT (Speech-to-Text)**: Browser's native `SpeechRecognition` API.
    *   **TTS (Text-to-Speech)**: Browser's native `SpeechSynthesis` API.

### Key Components

*   `src/components/AssistantInterface.tsx`: The main visual component handling the UI states and feedback loop.
*   `src/hooks/useCamera.ts`: Manages webcam access and frame capture.
*   `src/hooks/useSpeechRecognition.ts`: Handles wake word detection and voice transcription.
*   `src/services/aiService.ts`: Communicates with Google Gemini API to generate responses.

## UI/UX Design

The design philosophy focuses on a "Science Fiction" aesthetic:

*   **Dark Mode**: A deep black background puts focus on the content and the "AI" visualizer.
*   **Glassmorphism**: Translucent overlays over the camera feed create a sense of depth.
*   **Dynamic Visualizer**:
    *   **Red Pulse**: Listening/Recording.
    *   **Blue Pulse**: Processing/Thinking.
    *   **Green Wave**: Speaking/Responding.

## How to Use

### Prerequisites

*   Node.js installed.
*   A **Google Gemini API Key**. You can get one from [Google AI Studio](https://aistudio.google.com/).

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/YOUR_USERNAME/ecliptic-magnetosphere.git
    cd ecliptic-magnetosphere
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure API Key:
    *   Create a `.env` file in the root directory.
    *   Add your Gemini API key:
        ```
        VITE_GEMINI_API_KEY=your_api_key_here
        ```

4.  Start the app:
    ```bash
    npm run dev
    ```

### Running the App

1.  Open the local URL (e.g., `http://localhost:5173`) in Chrome or Edge (browsers with best Web Speech API support).
2.  **Allow Permissions**: Grant access to your Camera and Microphone when prompted.
3.  **Say "Hey Buddy"**: The red indicator will pulse.
4.  **Ask a Question**:
    *   *Voice only*: "Tell me a joke."
    *   *Multimodal*: Hold an object to the camera and say, "What is this?"
5.  The assistant will process your input and speak the response.

## License

MIT
