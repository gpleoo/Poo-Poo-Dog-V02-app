/**
 * Poo-Poo Dog Tracker - Data Service
 * Copyright (c) 2024-2025 Giampietro Leonoro & Monica Amato. All Rights Reserved.
 */

import { STORAGE_KEYS, COPYRIGHT } from '../utils/constants.js';
import { generateId, deepClone } from '../utils/helpers.js';
import { validatePoopData, validateDogProfile, isValidBackup } from '../utils/validators.js';

export class DataService {
  constructor() {
    this.poops = [];
    this.dogProfile = {};
    this.dogPhoto = null;
    this.savedNotes = [];
    this.foodHistory = [];
    this.gpsEnabled = true;
    this.mapSettings = {
      zoom: 16,
      autoCenter: true
    };
    this.isFirstTime = true;
    this.achievements = {
      completedQuadrants: 0,
      quadrantsGridVisible: false
    };
  }

  /**
   * Initialize and load all data from localStorage
   */
  loadAll() {
    try {
      this.poops = this._loadFromStorage(STORAGE_KEYS.poops, []);
      this.dogProfile = this._loadFromStorage(STORAGE_KEYS.dogProfile, {});
      this.dogPhoto = this._loadFromStorage(STORAGE_KEYS.dogPhoto, null);
      this.savedNotes = this._loadFromStorage(STORAGE_KEYS.savedNotes, []);
      this.foodHistory = this._loadFromStorage(STORAGE_KEYS.foodHistory, []);
      this.gpsEnabled = this._loadFromStorage(STORAGE_KEYS.gpsEnabled, true);
      this.mapSettings = this._loadFromStorage(STORAGE_KEYS.mapSettings, { zoom: 16, autoCenter: true, dogMarkerVisible: true });
      this.isFirstTime = this._loadFromStorage(STORAGE_KEYS.firstTime, true);
      this.achievements = this._loadFromStorage(STORAGE_KEYS.achievements, { completedQuadrants: 0, quadrantsGridVisible: false });

      console.log('✅ Data loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Error loading data:', error);
      return false;
    }
  }

  /**
   * Load data from localStorage with error handling
   */
  _loadFromStorage(key, defaultValue) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error(`Error loading ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Save data to localStorage with error handling
   */
  _saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      return false;
    }
  }

  // ========== POOPS MANAGEMENT ==========

  /**
   * Add new poop
   */
  addPoop(poopData) {
    const validation = validatePoopData(poopData);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    const poop = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      ...poopData
    };

    this.poops.push(poop);
    this._saveToStorage(STORAGE_KEYS.poops, this.poops);

    // Update food history
    if (poop.food && !this.foodHistory.includes(poop.food)) {
      this.foodHistory.push(poop.food);
      this._saveToStorage(STORAGE_KEYS.foodHistory, this.foodHistory);
    }

    return poop;
  }

  /**
   * Update existing poop
   */
  updatePoop(poopId, updates) {
    const index = this.poops.findIndex(p => p.id === poopId);
    if (index === -1) {
      throw new Error('Poop not found');
    }

    this.poops[index] = { ...this.poops[index], ...updates };
    this._saveToStorage(STORAGE_KEYS.poops, this.poops);

    return this.poops[index];
  }

  /**
   * Remove poop
   */
  removePoop(poopId) {
    const index = this.poops.findIndex(p => p.id === poopId);
    if (index === -1) {
      throw new Error('Poop not found');
    }

    this.poops.splice(index, 1);
    this._saveToStorage(STORAGE_KEYS.poops, this.poops);

    return true;
  }

  /**
   * Get all poops
   */
  getAllPoops() {
    return deepClone(this.poops);
  }

  /**
   * Get poop by ID
   */
  getPoopById(poopId) {
    const poop = this.poops.find(p => p.id === poopId);
    return poop ? deepClone(poop) : null;
  }

  /**
   * Get filtered poops
   */
  getFilteredPoops(filters) {
    return this.poops.filter(poop => {
      // Filter by type
      if (filters.type && filters.type !== 'all' && poop.type !== filters.type) {
        return false;
      }

      // Filter by food
      if (filters.food && filters.food !== 'all' && poop.food !== filters.food) {
        return false;
      }

      // Filter by period
      if (filters.period && filters.period !== 'all') {
        const poopDate = new Date(poop.timestamp);
        const now = new Date();

        switch (filters.period) {
          case 'today':
            if (poopDate.toDateString() !== now.toDateString()) return false;
            break;
          case 'yesterday':
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            if (poopDate.toDateString() !== yesterday.toDateString()) return false;
            break;
          case 'week':
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            if (poopDate < weekAgo) return false;
            break;
          case 'month':
            const monthAgo = new Date(now);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            if (poopDate < monthAgo) return false;
            break;
        }
      }

      return true;
    });
  }

  /**
   * Clear all poops
   */
  clearAllPoops() {
    this.poops = [];
    this._saveToStorage(STORAGE_KEYS.poops, this.poops);
    return true;
  }

  // ========== DOG PROFILE MANAGEMENT ==========

  /**
   * Save dog profile
   */
  saveDogProfile(profile) {
    const validation = validateDogProfile(profile);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    this.dogProfile = { ...profile };
    this._saveToStorage(STORAGE_KEYS.dogProfile, this.dogProfile);

    // Mark as not first time anymore
    if (this.isFirstTime) {
      this.isFirstTime = false;
      this._saveToStorage(STORAGE_KEYS.firstTime, false);
    }

    return true;
  }

  /**
   * Get dog profile
   */
  getDogProfile() {
    return deepClone(this.dogProfile);
  }

  /**
   * Save dog photo
   */
  saveDogPhoto(photoDataUrl) {
    this.dogPhoto = photoDataUrl;
    this._saveToStorage(STORAGE_KEYS.dogPhoto, this.dogPhoto);
    return true;
  }

  /**
   * Get dog photo
   */
  getDogPhoto() {
    return this.dogPhoto;
  }

  /**
   * Remove dog photo
   */
  removeDogPhoto() {
    this.dogPhoto = null;
    this._saveToStorage(STORAGE_KEYS.dogPhoto, null);
    return true;
  }

  // ========== NOTES MANAGEMENT ==========

  /**
   * Save note for reuse
   */
  saveNote(note) {
    if (!note || note.trim() === '') return false;

    if (!this.savedNotes.includes(note)) {
      this.savedNotes.push(note);
      this._saveToStorage(STORAGE_KEYS.savedNotes, this.savedNotes);
    }

    return true;
  }

  /**
   * Get all saved notes
   */
  getSavedNotes() {
    return [...this.savedNotes];
  }

  /**
   * Remove saved note
   */
  removeNote(note) {
    const index = this.savedNotes.indexOf(note);
    if (index > -1) {
      this.savedNotes.splice(index, 1);
      this._saveToStorage(STORAGE_KEYS.savedNotes, this.savedNotes);
      return true;
    }
    return false;
  }

  // ========== SETTINGS MANAGEMENT ==========

  /**
   * Save GPS setting
   */
  setGPSEnabled(enabled) {
    this.gpsEnabled = enabled;
    this._saveToStorage(STORAGE_KEYS.gpsEnabled, this.gpsEnabled);
    return true;
  }

  /**
   * Get GPS setting
   */
  isGPSEnabled() {
    return this.gpsEnabled;
  }

  /**
   * Save map settings
   */
  saveMapSettings(settings) {
    this.mapSettings = { ...this.mapSettings, ...settings };
    this._saveToStorage(STORAGE_KEYS.mapSettings, this.mapSettings);
    return true;
  }

  /**
   * Get map settings
   */
  getMapSettings() {
    return deepClone(this.mapSettings);
  }

  // ========== ACHIEVEMENTS ==========

  /**
   * Save achievements data
   */
  saveAchievements(achievementsData) {
    this.achievements = { ...this.achievements, ...achievementsData };
    this._saveToStorage(STORAGE_KEYS.achievements, this.achievements);
    return true;
  }

  /**
   * Get achievements data
   */
  getAchievements() {
    return deepClone(this.achievements);
  }

  /**
   * Update completed quadrants count
   */
  updateCompletedQuadrants(count) {
    this.achievements.completedQuadrants = count;
    this._saveToStorage(STORAGE_KEYS.achievements, this.achievements);
    return true;
  }

  /**
   * Get completed quadrants count
   */
  getCompletedQuadrantsCount() {
    return this.achievements.completedQuadrants || 0;
  }

  /**
   * Save quadrants grid visibility
   */
  setQuadrantsGridVisible(visible) {
    this.achievements.quadrantsGridVisible = visible;
    this._saveToStorage(STORAGE_KEYS.achievements, this.achievements);
    return true;
  }

  /**
   * Get quadrants grid visibility
   */
  isQuadrantsGridVisible() {
    return this.achievements.quadrantsGridVisible || false;
  }

  // ========== BACKUP & RESTORE ==========

  /**
   * Export all data as backup
   */
  exportBackup() {
    const backup = {
      version: COPYRIGHT.version,
      timestamp: new Date().toISOString(),
      poops: this.poops,
      dogProfile: this.dogProfile,
      dogPhoto: this.dogPhoto,
      savedNotes: this.savedNotes,
      foodHistory: this.foodHistory,
      mapSettings: this.mapSettings,
      achievements: this.achievements
    };

    return JSON.stringify(backup, null, 2);
  }

  /**
   * Import backup data
   * Supports current format (v2+) and legacy formats from older app versions
   */
  importBackup(backupData) {
    let data;

    try {
      data = typeof backupData === 'string' ? JSON.parse(backupData) : backupData;
    } catch (error) {
      throw new Error('File non valido: formato JSON non riconosciuto');
    }

    if (!isValidBackup(data)) {
      throw new Error('Struttura del backup non riconosciuta');
    }

    // Migrate legacy format: top-level array of poops
    if (Array.isArray(data)) {
      data = { poops: data, dogProfile: {} };
    }

    // Migrate legacy format: poops under different keys
    if (!data.poops && Array.isArray(data.records)) {
      data.poops = data.records;
    } else if (!data.poops && Array.isArray(data.data)) {
      data.poops = data.data;
    }

    // Normalize each poop record for compatibility with old field names
    const normalizedPoops = (data.poops || []).map(poop => this._normalizePoop(poop));

    // Restore data with defaults for missing fields
    this.poops = normalizedPoops;
    this.dogProfile = data.dogProfile || data.dog || data.profile || {};
    this.dogPhoto = data.dogPhoto || data.photo || null;
    this.savedNotes = data.savedNotes || data.notes || [];
    this.foodHistory = data.foodHistory || data.foods || [];
    this.mapSettings = data.mapSettings || { zoom: 16, autoCenter: true, dogMarkerVisible: true };
    this.achievements = data.achievements || { completedQuadrants: 0, quadrantsGridVisible: false };

    // Save to localStorage
    this._saveToStorage(STORAGE_KEYS.poops, this.poops);
    this._saveToStorage(STORAGE_KEYS.dogProfile, this.dogProfile);
    this._saveToStorage(STORAGE_KEYS.dogPhoto, this.dogPhoto);
    this._saveToStorage(STORAGE_KEYS.savedNotes, this.savedNotes);
    this._saveToStorage(STORAGE_KEYS.foodHistory, this.foodHistory);
    this._saveToStorage(STORAGE_KEYS.mapSettings, this.mapSettings);
    this._saveToStorage(STORAGE_KEYS.achievements, this.achievements);

    console.log(`✅ Imported ${this.poops.length} poop records`);
    return true;
  }

  /**
   * Normalize a poop record from any legacy format to current schema
   */
  _normalizePoop(poop) {
    if (!poop || typeof poop !== 'object') return null;

    return {
      // ID: use existing or generate new
      id: poop.id || poop._id || generateId(),
      // Timestamp: try different field names
      timestamp: poop.timestamp || poop.date || poop.time || poop.createdAt || new Date().toISOString(),
      // Coordinates
      lat: poop.lat ?? poop.latitude ?? poop.coords?.lat ?? null,
      lng: poop.lng ?? poop.longitude ?? poop.coords?.lng ?? null,
      // Status flags
      isManual: poop.isManual ?? poop.manual ?? false,
      // Health data - map legacy field names
      type: poop.type || poop.stato || poop.status || poop.consistency || 'healthy',
      size: poop.size || poop.dimensione || poop.dimension || 'medium',
      color: poop.color || poop.colore || poop.colour || 'normal',
      smell: poop.smell || poop.odore || poop.odor || 'normal',
      // Optional fields
      food: poop.food || poop.cibo || poop.alimento || '',
      hoursSinceMeal: poop.hoursSinceMeal || poop.ore || poop.hours || '',
      notes: poop.notes || poop.note || poop.description || ''
    };
  }

  /**
   * Clear all data
   */
  clearAllData() {
    this.poops = [];
    this.dogProfile = {};
    this.dogPhoto = null;
    this.savedNotes = [];
    this.foodHistory = [];
    this.gpsEnabled = true;
    this.mapSettings = { zoom: 16, autoCenter: true, dogMarkerVisible: true };
    this.isFirstTime = true;
    this.achievements = { completedQuadrants: 0, quadrantsGridVisible: false };

    // Clear localStorage
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });

    return true;
  }

  // ========== STATISTICS ==========

  /**
   * Get statistics
   */
  getStatistics() {
    return this.calculateStatistics(this.poops);
  }

  /**
   * Calculate statistics from specific poops array
   */
  calculateStatistics(poops) {
    const total = poops.length;
    const healthy = poops.filter(p => p.type === 'healthy').length;
    const problems = poops.filter(p => ['soft', 'diarrhea', 'hard', 'blood', 'mucus'].includes(p.type)).length;

    const typeDistribution = poops.reduce((acc, poop) => {
      acc[poop.type] = (acc[poop.type] || 0) + 1;
      return acc;
    }, {});

    const foodDistribution = poops.reduce((acc, poop) => {
      if (poop.food) {
        acc[poop.food] = (acc[poop.food] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      total,
      healthy,
      problems,
      typeDistribution,
      foodDistribution
    };
  }

  /**
   * Get food history
   */
  getFoodHistory() {
    return [...this.foodHistory];
  }

  /**
   * Get urgent reminders (overdue or expiring soon)
   */
  getUrgentReminders() {
    const profile = this.dogProfile;
    const urgentReminders = [];
    const now = new Date();

    const reminders = [
      { type: 'vaccination', date: profile.nextVaccination, title: '💉 Vaccinazione' },
      { type: 'antiparasitic', date: profile.nextAntiparasitic, title: '🐛 Antiparassitario' },
      { type: 'fleaTick', date: profile.nextFleaTick, title: '🦟 Antipulci/Zecche' }
    ];

    reminders.forEach(reminder => {
      if (!reminder.date) return;

      const dueDate = new Date(reminder.date);
      const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

      // Only include overdue or expiring within 7 days
      if (daysLeft <= 7) {
        urgentReminders.push({
          ...reminder,
          dueDate: dueDate,
          daysLeft: daysLeft,
          isOverdue: daysLeft < 0
        });
      }
    });

    // Sort by urgency (overdue first, then by days left)
    urgentReminders.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.daysLeft - b.daysLeft;
    });

    return urgentReminders;
  }

  /**
   * Check if there are overdue reminders
   */
  hasOverdueReminders() {
    const urgentReminders = this.getUrgentReminders();
    return urgentReminders.some(r => r.isOverdue);
  }
}
