// services/streamService.ts
import { StreamVideoClient } from '@stream-io/video-react-native-sdk';

const STREAM_API_KEY = 'EXPO_PUBLIC_STREAM_API_KEY'; // Replace with your actual Stream API key
const BACKEND_URL = 'https://bubustream-b5o7.onrender.com'; // Replace with your backend URL

export interface VideoCallData {
  callId: string;
  token?: string;
}

/**
 * Initialize Stream Video Client
 */
export const initStreamClient = async (
  userId: string,
  userName: string,
  userImageUrl?: string
): Promise<StreamVideoClient> => {
  try {
    // Get token from your backend
    const response = await fetch(`${BACKEND_URL}/stream/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, userName }),
    });

    if (!response.ok) {
      throw new Error('Failed to get Stream token');
    }

    const { token } = await response.json();

    // Initialize Stream client
    const client = new StreamVideoClient({
      apiKey: STREAM_API_KEY,
      user: {
        id: userId,
        name: userName,
        image: userImageUrl,
      },
      token,
    });

    return client;
  } catch (error) {
    console.error('Stream client initialization failed:', error);
    throw new Error('Could not initialize video client');
  }
};

/**
 * Create a video call
 */
export const createVideoCall = async (
  bookingId: string,
  professionalId: string,
  patientId: string,
  professionalName: string,
  patientName: string
): Promise<VideoCallData> => {
  try {
    const response = await fetch(`${BACKEND_URL}/stream/create-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId,
        professionalId,
        patientId,
        professionalName,
        patientName,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create video call');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Video call creation failed:', error);
    throw new Error('Could not create video call');
  }
};

/**
 * Check backend health
 */
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
};

/**
 * End a video call
 */
export const endVideoCall = async (callId: string): Promise<void> => {
  try {
    await fetch(`${BACKEND_URL}/stream/end-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ callId }),
    });
  } catch (error) {
    console.error('Failed to end call:', error);
  }
};

/**
 * Backend Server Setup Instructions:
 * 
 * You need to create a backend server (Node.js/Express) with these endpoints:
 * 
 * 1. POST /stream/token
 *    - Receives: { userId, userName }
 *    - Returns: { token: string }
 *    - Generates a Stream user token using Stream's server SDK
 * 
 * 2. POST /stream/create-call
 *    - Receives: { bookingId, professionalId, patientId, professionalName, patientName }
 *    - Returns: { callId: string, token: string }
 *    - Creates a video call and returns call details
 * 
 * 3. POST /stream/end-call
 *    - Receives: { callId }
 *    - Ends the video call and logs it
 * 
 * 4. GET /health
 *    - Returns: { status: 'ok' }
 *    - Health check endpoint
 * 
 * Example backend implementation (Node.js/Express):
 * 
 * ```javascript
 * const express = require('express');
 * const { StreamClient } = require('@stream-io/node-sdk');
 * 
 * const app = express();
 * app.use(express.json());
 * 
 * const streamClient = new StreamClient(
 *   'YOUR_STREAM_API_KEY',
 *   'YOUR_STREAM_SECRET'
 * );
 * 
 * app.post('/stream/token', async (req, res) => {
 *   const { userId, userName } = req.body;
 *   const token = streamClient.createToken(userId);
 *   res.json({ token });
 * });
 * 
 * app.post('/stream/create-call', async (req, res) => {
 *   const { bookingId, professionalId, patientId } = req.body;
 *   const callId = `consultation_${bookingId}`;
 *   
 *   // Create call on Stream
 *   const call = streamClient.video.call('video', callId);
 *   await call.create({
 *     data: {
 *       members: [
 *         { user_id: professionalId },
 *         { user_id: patientId }
 *       ]
 *     }
 *   });
 *   
 *   res.json({ callId });
 * });
 * 
 * app.post('/stream/end-call', async (req, res) => {
 *   const { callId } = req.body;
 *   // Log call ended
 *   console.log(`Call ${callId} ended`);
 *   res.json({ success: true });
 * });
 * 
 * app.get('/health', (req, res) => {
 *   res.json({ status: 'ok' });
 * });
 * 
 * app.listen(3000, () => {
 *   console.log('Backend running on port 3000');
 * });
 * ```
 */