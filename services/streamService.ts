// services/streamService.ts - FIXED WITH CORRECT CALL TYPE
import { StreamVideoClient } from '@stream-io/video-react-native-sdk';

const STREAM_API_KEY = process.env.EXPO_PUBLIC_STREAM_API_KEY;
const BACKEND_URL = 'https://bubustream-b5o7.onrender.com';

// Validate API key on import
if (!STREAM_API_KEY || STREAM_API_KEY === 'undefined') {
  console.error('❌ CRITICAL: Stream API key is not configured!');
  console.error('Please set EXPO_PUBLIC_STREAM_API_KEY in your .env file');
}

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
    console.log('🔧 Initializing Stream client for user:', { userId, userName });
    
    // Get token from your backend
    console.log('📡 Requesting token from backend:', `${BACKEND_URL}/stream/token`);
    
    const response = await fetch(`${BACKEND_URL}/stream/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, userName }),
    });

    console.log('📥 Token response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Token request failed:', errorText);
      throw new Error(`Failed to get Stream token (Status: ${response.status}). ${errorText}`);
    }

    const { token } = await response.json();
    console.log('✅ Token received successfully');

    // Initialize Stream client
    console.log('🎬 Creating Stream client with API key:', STREAM_API_KEY);
    const client = new StreamVideoClient({
      apiKey: STREAM_API_KEY!,
      user: {
        id: userId,
        name: userName,
        image: userImageUrl,
      },
      token,
    });

    console.log('✅ Stream client initialized successfully');
    return client;
  } catch (error: any) {
    console.error('❌ Stream client initialization failed:', error);
    console.error('Error stack:', error.stack);
    
    if (error.message.includes('fetch')) {
      throw new Error('Could not connect to backend server. Is it running?');
    }
    
    throw new Error(`Could not initialize video client: ${error.message}`);
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
    console.log('📞 Creating video call...');
    console.log('Request params:', {
      bookingId,
      professionalId,
      patientId,
      professionalName,
      patientName,
    });

    const url = `${BACKEND_URL}/stream/create-call`;
    console.log('📡 Sending request to:', url);

    const response = await fetch(url, {
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

    console.log('📥 Create call response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Create call failed with status:', response.status);
      console.error('Error response body:', errorText);
      
      let errorMessage = `Failed to create video call (Status: ${response.status})`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage += `: ${errorJson.error || errorJson.message || errorText}`;
      } catch {
        errorMessage += `: ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ Call created successfully:', data);
    
    if (!data.callId) {
      console.error('⚠️ Warning: No callId in response:', data);
      throw new Error('Backend returned success but no callId was provided');
    }
    
    return data;
  } catch (error: any) {
    console.error('❌ Video call creation failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    if (error.message.includes('fetch') || error.message.includes('Network')) {
      throw new Error('Could not connect to backend server. Check if it\'s running at: ' + BACKEND_URL);
    }
    
    throw new Error(`Failed to create video call: ${error.message}`);
  }
};

/**
 * Join a video call
 * ✅ UPDATED: Now uses 'default' call type to match backend
 */
export const joinVideoCall = async (
  client: StreamVideoClient,
  callId: string
): Promise<any> => {
  try {
    console.log('🔌 Joining call:', callId);
    
    // ✅ FIX: Use 'default' call type instead of 'video'
    // This must match what the backend uses when creating the call
    const call = client.call('default', callId);
    
    // Join the call (don't create it - backend already created it)
    await call.join({ create: false });
    
    console.log('✅ Successfully joined call');
    return call;
  } catch (error: any) {
    console.error('❌ Failed to join call:', error);
    throw new Error(`Failed to join call: ${error.message}`);
  }
};

/**
 * Check backend health
 */
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    console.log('🏥 Checking backend health...');
    console.log('Health check URL:', `${BACKEND_URL}/health`);
    
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
    });
    
    console.log('Health check status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is healthy:', data);
      return true;
    }
    
    console.log('⚠️ Backend responded but not healthy');
    return false;
  } catch (error: any) {
    console.error('❌ Backend health check failed:', error);
    console.error('This likely means the backend server is not running or not accessible');
    return false;
  }
};

/**
 * End a video call
 */
export const endVideoCall = async (callId: string): Promise<void> => {
  try {
    console.log('📴 Ending call:', callId);
    
    await fetch(`${BACKEND_URL}/stream/end-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ callId }),
    });
    
    console.log('✅ Call ended successfully');
  } catch (error) {
    console.error('❌ Failed to end call:', error);
    // Don't throw - call ended on client side anyway
  }
};