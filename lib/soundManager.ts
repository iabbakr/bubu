// src/lib/soundManager.ts
import { Audio } from 'expo-av';

export type SoundKey =
  | 'signup'
  | 'signin'
  | 'deposit'
  | 'debit'
  | 'orderPlaced'
  | 'acknowledged'
  | 'enroute'
  | 'ready'
  | 'delivered';

const Sounds: Record<SoundKey, any> = {
  signup: require('../assets/sounds/welcome_man.wav'),
  signin: require('../assets/sounds/welcome_girl.wav'),
  deposit: require('../assets/sounds/test.wav'),
  debit: require('../assets/sounds/test.wav'),
  orderPlaced: require('../assets/sounds/test.wav'),
  acknowledged: require('../assets/sounds/test.wav'),
  enroute: require('../assets/sounds/test.wav'),
  ready: require('../assets/sounds/test.wav'),
  delivered: require('../assets/sounds/test.wav'),
};

class SoundManager {
  private sounds: Partial<Record<SoundKey, import('expo-av').Audio.Sound>> = {};
  private initialized = false;

  async init() {
    if (this.initialized) return;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      for (const [key, asset] of Object.entries(Sounds) as [SoundKey, any][]) {
        const { sound } = await Audio.Sound.createAsync(asset, { shouldPlay: false });
        this.sounds[key] = sound;
      }

      this.initialized = true;
      console.log('SoundManager: All 9 sounds loaded successfully'); // ← FIXED!
    } catch (error) {
      console.warn('SoundManager: Failed to load sounds (likely on web or missing files)', error);
    }
  }

  async play(key: SoundKey) {
    const sound = this.sounds[key];
    if (!sound || !this.initialized) {
      console.log(`SoundManager: Cannot play '${key}' — not loaded`);
      return;
    }

    try {
      await sound.replayAsync(); // Best method
    } catch (error) {
      console.warn(`Failed to play sound: ${key}`, error);
    }
  }

  async stopAll() {
    for (const sound of Object.values(this.sounds)) {
      try {
        await sound?.stopAsync();
      } catch {}
    }
  }

  async unload() {
    await this.stopAll();
    for (const sound of Object.values(this.sounds)) {
      try {
        await sound?.unloadAsync();
      } catch {}
    }
    this.sounds = {};
    this.initialized = false;
  }
}

export const soundManager = new SoundManager();
