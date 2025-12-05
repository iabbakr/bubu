// services/streamService.ts
import { StreamVideoClient, User as StreamUser } from '@stream-io/video-react-native-sdk';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Constants from 'expo-constants';

const STREAM_API_KEY = process.env.EXPO_PUBLIC_STREAM_API_KEY || '';

const BACKEND_URL = __DEV__
  ? 'http://192.168.100.125:3000'
  : 'https://bubustream-b5o7.onrender.com';

export const generateStreamToken = async (userId: string): Promise<string> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/stream-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Backend error: ${error}`);
    }

    const data = await response.json();
    return data.token;
  } catch (error: any) {
    throw new Error(`Token fetch failed: ${error.message}`);
  }
};

export const initStreamClient = async (
  userId: string,
  userName: string,
  userImage?: string
): Promise<StreamVideoClient> => {
  if (!STREAM_API_KEY) throw new Error('STREAM_API_KEY missing');

  const token = await generateStreamToken(userId);

  const user: StreamUser = {
    id: userId,
    name: userName,
    image: userImage,
  };

  return new StreamVideoClient({ apiKey: STREAM_API_KEY, token, user });
};

export const createVideoCall = async (
  bookingId: string,
  professionalId: string,
  patientId: string,
  professionalName: string,
  patientName: string
) => {
  const callId = `video_${bookingId}`;

  await setDoc(doc(db, 'videoCalls', bookingId), {
    callId,
    professionalId,
    patientId,
    professionalName,
    patientName,
    status: 'waiting',
    createdAt: new Date(),
  });

  return { callId };
};

export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${BACKEND_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
};