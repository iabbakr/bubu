// services/streamService.ts - UPDATED WITH RETRY LOGIC
import { StreamVideoClient, Call } from '@stream-io/video-react-native-sdk';

const STREAM_API_KEY = process.env.EXPO_PUBLIC_STREAM_API_KEY;
// Replace with your actual deployed backend URL
const BACKEND_URL = 'https://bubustream-b5o7.onrender.com'; 

if (!STREAM_API_KEY) console.error('❌ CRITICAL: Stream API key is not configured!');

/**
 * Initialize Stream Video Client
 */
export const initStreamClient = async (
  userId: string,
  userName: string,
  userImageUrl?: string
): Promise<StreamVideoClient> => {
  try {
    const url = `${BACKEND_URL}/stream/token`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get Stream token: ${errorText}`);
    }

    const { token } = await response.json();

    return new StreamVideoClient({
      apiKey: STREAM_API_KEY!,
      user: {
        id: userId,
        name: userName,
        image: userImageUrl,
      },
      token,
    });
  } catch (error: any) {
    console.error('❌ Stream client init failed:', error);
    throw new Error(`Could not initialize video client: ${error.message}`);
  }
};

/**
 * Create Call Session (Hits Backend)
 */
export const createCallSession = async (
  bookingId: string,
  professionalId: string,
  patientId: string,
  professionalName: string,
  patientName: string
): Promise<string> => {
  try {
    const url = `${BACKEND_URL}/stream/create-call`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId,
        professionalId,
        patientId,
        professionalName,
        patientName,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend Error: ${errorText}`);
    }

    const data = await response.json();
    if (!data.callId) throw new Error('No callId returned from backend');
    
    return data.callId;
  } catch (error: any) {
    console.error('❌ Create Call Error:', error);
    throw error;
  }
};

/**
 * ✅ JOIN VIDEO CALL - WITH RETRY LOGIC
 * Solves "Call not found" by waiting for propagation.
 */
export const joinVideoCall = async (
  client: StreamVideoClient,
  callId: string
): Promise<Call> => {
  const call = client.call('default', callId);

  const MAX_RETRIES = 5;
  const BASE_DELAY = 1000; // 1 second

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      console.log(`📞 Joining call ${callId} (Attempt ${i + 1}/${MAX_RETRIES})`);
      
      // Attempt to join. 'create: false' expects the call to exist.
      await call.join({ create: false });
      
      console.log('✅ Successfully joined call');
      return call;

    } catch (error: any) {
      const message = error?.message || '';
      
      // Check for specific "Not Found" error codes (Stream often uses code 16 or 404 status)
      const isNotFoundError = message.includes("Can't find call") || error.code === 16 || error.status === 404;

      if (isNotFoundError && i < MAX_RETRIES - 1) {
        console.warn(`⚠️ Call not found yet. Retrying in ${BASE_DELAY}ms...`);
        // Wait before retrying
        await new Promise(res => setTimeout(res, BASE_DELAY));
        continue;
      }

      console.error('❌ Failed to join call permanently:', error);
      throw error;
    }
  }

  throw new Error("Connection timed out. The call could not be found.");
};

export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
};

export const endVideoCall = async (callId: string): Promise<void> => {
  try {
    await fetch(`${BACKEND_URL}/stream/end-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId }),
    });
  } catch (error) {
    console.error('Failed to end call:', error);
  }
};