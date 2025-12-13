// src/lib/soundManager.ts - FINAL CORRECTED VERSION
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
  | 'dispute'
  | 'click'
  | 'ringtone'; // ✅ ADDED 'ringtone' back to SoundKey

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
  productAdded: require('../assets/sounds/delivered.wav'),
  dispute: require('../assets/sounds/test.wav'),
  click: require('../assets/sounds/click.wav'),
  ringtone: require('../assets/sounds/ringtone.wav'), // ✅ Mapped 'ringtone' to an asset (Adjust path if needed)
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
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: 1,        // Do not mix
        interruptionModeAndroid: 2,    // Duck others
      });

      // Load custom sounds
      for (const [key, asset] of Object.entries(Sounds) as [SoundKey, any][]) {
        const { sound } = await Audio.Sound.createAsync(asset, { shouldPlay: false });
        this.sounds[key] = sound;
      }
      
      this.initialized = true;
      console.log('SoundManager: Loaded custom sounds');
    } catch (error) {
      console.warn('SoundManager init failed:', error);
    }
  }

  async play(key: SoundKey, options?: { loop?: boolean }) {
    const sound = this.sounds[key];
    if (!sound || !this.initialized) {
      console.log(`Cannot play '${key}' — not loaded`);
      return;
    }
    try {
      await sound.stopAsync(); // Stop previous instance if running
      if (options?.loop !== undefined) {
        await sound.setIsLoopingAsync(!!options.loop);
      }
      await sound.replayAsync();
    } catch (error) {
      console.warn(`Failed to play ${key}:`, error);
    }
  }

  async stop(key: SoundKey) {
    const sound = this.sounds[key];
    if (!sound) return;
    try {
      await sound.stopAsync();
    } catch {}
  }

  async stopAll() {
    // Stop custom sounds
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