<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# YourSafeShare V4 - Secure P2P File Sharing & Room-Based Chat

YourSafeShare is a secure, serverless, peer-to-peer (P2P) file-sharing web application with room-based collaboration features. By leveraging WebRTC technology and Firebase for signaling, the application ensures end-to-end encryption and privacy.

## Features

- **P2P File Sharing**: Direct device-to-device transfers with no file size limits
- **Room-Based Chat**: Create or join rooms for real-time messaging and collaboration
- **End-to-End Encryption**: All transfers encrypted using WebRTC DTLS 1.3
- **Firebase Signaling**: Room management and signaling via Firebase Realtime Database
- **Password Protection**: Optional passwords for files and rooms
- **Real-Time Analytics**: Transfer speed graphs and progress tracking

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Configure Firebase:
   - Create a Firebase project at https://console.firebase.google.com/
   - Enable Realtime Database
   - Copy your Firebase config to [.env.local](.env.local)
3. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key (optional)
4. Run the app:
   `npm run dev`

## Architecture

- **Frontend**: React 18 + TypeScript + Vite
- **Signaling**: Firebase Realtime Database (replaces PeerJS in V4)
- **P2P Protocol**: WebRTC for direct connections
- **Styling**: Tailwind CSS

## V4 Changes

- Migrated signaling from PeerJS cloud to Firebase Realtime Database
- Added room-based chat functionality
- Implemented multi-user rooms with real-time messaging
- Enhanced UI with room lobby and chat panels
- Maintained backward compatibility with legacy file transfer mode
