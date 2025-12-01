// src/lib/soundManager.ts
import { Audio } from 'expo-av';

export type SoundKey =
  | 'signup'
  | 'signin'
  | 'deposit'
  | 'debit'
  | 'addToCart'
  | 'orderPlaced'
  | 'acknowledged'
  | 'enroute'
  | 'ready'
  | 'delivered'
  | 'productAdded'
  | 'dispute';

const Sounds: Record<SoundKey, any> = {
  signup: require('../assets/sounds/welcome_man.wav'),
  signin: require('../assets/sounds/welcome_man.wav'),
  deposit: require('../assets/sounds/coins.wav'),
  debit: require('../assets/sounds/test.wav'),
  addToCart: require('../assets/sounds/delivered.wav'),
  orderPlaced: require('../assets/sounds/test.wav'),
  acknowledged: require('../assets/sounds/delivered.wav'),
  enroute: require('../assets/sounds/delivered.wav'),
  ready: require('../assets/sounds/delivered.wav'),
  delivered: require('../assets/sounds/delivered.wav'),
  dispute: require('../assets/sounds/test.wav'),
  productAdded: require('../assets/sounds/delivered.wav'),
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
      console.log('SoundManager: All 11 sounds loaded successfully');
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
      await sound.replayAsync();
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