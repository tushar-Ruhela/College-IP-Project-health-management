# Health Management System 🏥

A comprehensive, full-stack health management platform built to streamline doctor interactions, intuitively maintain medical records, and provide state-of-the-art AI-driven diagnostics and communication tools.

## 🚀 Key Features

*   **AI-Powered Health Diagnosis**: Utilizes Google Generative AI (Gemini) and LangChain to assist users with preliminary symptom checking, medical condition awareness, and health insights.
*   **Real-Time Chat & Telehealth**: Native real-time messaging implemented through Socket.io for immediate clinical correspondence.
*   **Telephony & Patient Reminders**: Automated voice calls and call history tracking for medical adherence powered by Twilio.
*   **Doctor Directory & Navigation**: Seamlessly explore available doctors, find medical specialists, and manage healthcare practitioners.
*   **Robust Medical Records Management**: Securely store, retrieve, and manage patient medical history using scalable MongoDB architecture.
*   **Cross-Platform Ready**: Packaged securely as Progressive Web Applications and wrapped for Android/iOS native deployment using Capacitor.

## 🛠 Tech Stack

### Frontend App (`/App`)
*   **Architecture**: Next.js 16 with React 19 (App Router)
*   **Styling**: Tailwind CSS (v4) with Framer Motion for premium UI micro-animations and smooth transition flows.
*   **UI Primitives**: Radix UI (accessible, unstyled components).
*   **Mobile Translation**: Capacitor Core & Plugins for Android/iOS generation.
*   **Additional Libraries**: `react-markdown` (for rendering AI outputs), Ultravox Client.

### Backend Server (`/server`)
*   **Runtime & Framework**: Node.js v18+, Express.js
*   **Database Layer**: MongoDB using Mongoose ODM.
*   **AI Integration**: `@google/generative-ai`, `@langchain/google-genai`, Langchain Core.
*   **Real-time Communication**: `socket.io` for bi-directional event passing.
*   **Integrations & Validation**: Twilio API (voice/SMS messaging), Zod (strict schema validation of incoming data).

## 📂 Project Structure

*   `App/` — The Next.js frontend application environment.
*   `server/` — The Express + Node.js backend environment.

## ⚙️ Getting Started

### Prerequisites
*   [Node.js](https://nodejs.org/en/) v18.0.0 or higher
*   A running [MongoDB](https://www.mongodb.com/) cluster/instance
*   A [Twilio](https://www.twilio.com/) account for voice capabilities
*   A Google Gemini API key mapped properly for generative capabilities

### Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone git@github.com:tushar-Ruhela/College-IP-Project-health-management.git
    cd College-IP-Project-health-management
    ```

2.  **Setup the Server:**
    ```bash
    cd server
    npm install
    
    # You MUST configure variables before running:
    # MONGO_URI, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, GOOGLE_GENAI_API_KEY
    # Create a `.env` file referencing your keys.
    
    npm run dev  # Starts the server with file watching
    ```

3.  **Setup the Frontend Client:**
    ```bash
    cd ../App
    npm install
    npm run dev  # Starts Next.js development server
    ```

### Utilities & Scripts
Inside the `server/` directory, helpful scripts exist for setting up development environments:
*   `npm run seed`: Clears and populates the database with initial dummy values for testing.
*   `npm run generate-reminders`: Script to test the voice-reminder functionality.

---
*Created as an Information Practice (IP) College Project.*
