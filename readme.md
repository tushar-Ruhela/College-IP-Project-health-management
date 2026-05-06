# Health Management System AI – Your Agentic Health Guardian

Health Management System AI is an **agentic healthcare platform for India** that works across rural and urban settings. It uses **voice agents, multilingual video calls, smart device data, and persistent health memory** to remove language and access barriers.

---

## Core Modules

### 1. `Rural_Agent.js` – Call-Based AI Health Agent

For users without smartphones or internet, Health Management System provides a **phone-call based AI agent in local languages**.

**What users can do**

- **Triage and synopsis**: Call and describe symptoms. The agent creates a summary and suggests which specialist to visit.
- **Book appointments**: “Book me a slot with a doctor” — the agent checks availability and confirms.
- **Voice reminders**:  
  Example: “Health Management System, subah 8 baje yaad karwana ki mujhe BP ki dawai leni hai” (Health Management System, remind me at 8 AM to take my BP medicine). The agent schedules a callback.
- **Medicine availability**: Check stock in rural pharmacies on call.

**Tech**

- Twilio
- Intervox
- ElevenLabs
- LangGraph
- Gemini
- Node.js

---

### 2. Doctor Dashboard – Intelligent Scheduling & Monitoring

Web panel for doctors to manage **slots, bookings, and automated follow-ups**.

**Key features**

- **Slot management**: Define weekly OPD/teleconsultation hours.
- **Booking management**: Accept, reschedule, or cancel appointments from rural calls and urban app.
- **Intelligent scheduling**:  
  Instead of calling patients manually, doctors create a scheduler:  
  “Call this patient twice a week, ask: ‘Are you taking your BP medicine?’, ‘Any chest pain?’, ‘Blood sugar reading today?’  
  If response is different (e.g., “Yes” to chest pain, high sugar), flag and alert me.”  
  The agent makes automated calls, logs responses, and alerts the doctor only when needed.
- **Patient context**: View full medical history, previous visits, and AI summaries in one click.

**Tech**

- React
- Node.js
- Express
- MongoDB

---

### 3. Urban App – AI Triage + Multilingual Video Consults

Modern **mobile/web app** with AI-powered features for smartphone users.

#### AI Calling & Image Triage

- User taps **“Call Health Management System AI”**, describes symptoms, and can upload a photo (e.g. rash, allergy).
- AI creates a synopsis, checks risk, and suggests a specialist.  
  Example: User uploads a red skin patch and says “Itching since yesterday.”  
  AI: “This looks like contact dermatitis. Avoid scratching, apply cool compress, consult dermatologist if worsens. Book now?”

**Tech**

- Android / React Native
- Node.js
- Gemini
- Vision model
- MongoDB

#### Multilingual Video Calls
<img width="1280" height="681" alt="image" src="https://github.com/user-attachments/assets/1ba7d9c8-e53a-4578-9f5f-7a63f7890324" />


Scenario: **Patient (Hindi/Punjabi)** + **Doctor (English/Kannada)** on video call.

- Real-time **STT → translation → captions/audio**.  
- Patient says in Hindi: “Mujhe kal se bukhar hai” (I have fever since yesterday).  
- Doctor sees Kannada caption + hears English audio.  
- Doctor responds in Kannada, patient sees Hindi captions.

**Tech**

- React / WebRTC
- Node.js + Socket.IO
- Python Flask
- Whisper
- Gemini
- TTS

#### Flow Diagram

```text
┌─────────────────────────────────────────────────────────┐
│                   USER A (Patient)                      │
│  React App (Hindi) - Video + Mic + Audio               │
└───────────┬─────────────────────────────┬──────────────┘
            │ WebRTC (Video/Audio)        │ Audio Chunks
            ▼                             ▼
┌───────────────────────┐   ┌──────────────────────────┐
│  Node.js Backend      │   │  Python Translation API  │
│  Socket.IO + Express  │   │  Whisper + Gemini + TTS  │
│  MongoDB              │   │  Input: webm → mp3       │
└───────────┬───────────┘   └──────────────────────────┘
            │ Video                       │ Translated Audio
            ▼                             ▼
┌─────────────────────────────────────────────────────────┐
│                 USER B (Doctor)                         │
│  React App (Kannada) - Video + Captions + Audio        │
└─────────────────────────────────────────────────────────┘
```

---

### Smart Connect – Wearables

- User: “I feel stressed from last 2 days.”
- AI checks **smartwatch data** →  
  “You slept only 4h/night, heart rate elevated, temp 101°F. Rest, hydrate, consult doctor if fever persists.”

**Tech**

- Noise Watch
- NoiseFit
- Strava
- Ngrok
- Node.js
- MongoDB
- LangGraph

---

### Medi Scan – Expiry Tracker

- User: Clicks medicine photo.
- AI: OCR extracts name and expiry.  
  Example: “Metformin 500mg, Expiry: Dec 2025” → reminder in Nov 2025.  
  Already expired → **red alert**.

**Tech**

- OCR
- LangChain / LangGraph
- MongoDB
- Scheduler

---

### AI Health Chatbot – Memory Brain

- User: “When did my last doctor change my BP dose?”
- AI: “Dr. Sharma changed it on March 15, 2025, from 5mg to 10mg.”  
  The chatbot remembers all prescriptions, visits, and joins video calls (with consent) to log decisions.

**Tech**

- LangGraph
- Vector DB
- MongoDB

---

## Tech Stack

- **Backend**: Node.js · Express · MongoDB  
- **Frontend**: React · Next.js · Tailwind · WebRTC · Socket.IO  
- **Mobile**: Java/Kotlin (Android)  
- **AI**: LangGraph · LangChain · Gemini · Whisper · OCR · Vector DB  
- **Voice**: Twilio · Intervox · ElevenLabs  
- **Devices**: Noise Watch · Strava · Ngrok

## deployed links
- https://sanjeevaniapp.vercel.app/
- https://m-app-livid.vercel.app/

## Screenshots

https://drive.google.com/file/d/1RFm8fMxTzeESHpsGXYSjSmbP_ZtXaQ_Q/view?usp=sharing

https://www.youtube.com/embed/ffu7DFClbbc?si=9z06KhIf8Pjp5BZf

https://github.com/user-attachments/assets/007ff21f-94a9-4ea2-8955-e9cb21841915



![WhatsApp Image 2025-11-29 at 10 59 24](https://github.com/user-attachments/assets/ceac32f8-f42e-4170-853c-961f74035622)
![WhatsApp Image 2025-11-29 at 10 59 33](https://github.com/user-attachments/assets/8c08dcde-5b5f-4a20-b031-f80a7196bbe5)
![WhatsApp Image 2025-11-29 at 11 00 57](https://github.com/user-attachments/assets/f2f4b641-7594-4956-9d89-9ce46e966cd8)
![WhatsApp Image 2025-11-29 at 11 01 13](https://github.com/user-attachments/assets/6796155d-8f5e-48e4-aa52-19eccaa67873)
![WhatsApp Image 2025-11-29 at 11 01 31](https://github.com/user-attachments/assets/918f8a86-2b3c-4bfa-8400-733ade78951b)
![WhatsApp Image 2025-11-29 at 11 01 38](https://github.com/user-attachments/assets/29c7f639-b99e-432f-8386-739d4a29ead1)
![WhatsApp Image 2025-11-29 at 11 02 01](https://github.com/user-attachments/assets/ee22bcc7-b403-484a-a753-9d7e00a8431f)

![WhatsApp Image 2025-11-29 at 10 57 40](https://github.com/user-attachments/assets/3bfa5a00-ffbd-434f-a0a3-c5f80f8d4b42)
![WhatsApp Image 2025-11-29 at 10 57 47](https://github.com/user-attachments/assets/9357479f-3f6f-461b-a1a0-a8018a804222)
![WhatsApp Image 2025-11-29 at 10 57 54](https://github.com/user-attachments/assets/99f6f0d2-d4b7-4b97-a41d-0b6042321de6)
![WhatsApp Image 2025-11-29 at 10 58 01](https://github.com/user-attachments/assets/2872f21d-5ca9-4d0a-a4df-5e8f4a4b5b11)
![WhatsApp Image 2025-11-29 at 10 58 07](https://github.com/user-attachments/assets/7e0381c9-ea9e-476b-a391-3db8747ef6fb)





