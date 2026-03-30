/**
 * Poo-Poo Dog Tracker - Constants
 * Copyright (c) 2024-2025 Giampietro Leonoro & Monica Amato. All Rights Reserved.
 */

// Application Info
export const COPYRIGHT = {
  year: '2024-2025',
  authors: ['Giampietro Leonoro', 'Monica Amato'],
  rights: 'All Rights Reserved - PROPRIETARY AND CONFIDENTIAL',
  version: '2.0.0'
};

// LocalStorage Keys
export const STORAGE_KEYS = {
  poops: 'poopTracker_poops',
  dogProfile: 'poopTracker_dogProfile',
  dogPhoto: 'poopTracker_dogPhoto',
  savedNotes: 'poopTracker_savedNotes',
  foodHistory: 'poopTracker_foodHistory',
  gpsEnabled: 'poopTracker_gpsEnabled',
  mapSettings: 'poopTracker_mapSettings',
  firstTime: 'poopTracker_firstTime',
  achievements: 'poopTracker_achievements',
  streak: 'poopTracker_streak'
};

// Map Configuration
export const MAP_CONFIG = {
  defaultCenter: [41.9028, 12.4964],
  defaultZoom: 16,
  maxZoom: 19,
  tileLayerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  clusterRadius: 80
};

// GPS Configuration
export const GPS_CONFIG = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
  updateThrottle: 1000
};

// Poop Types
export const POOP_TYPES = {
  healthy: { label: '✅ Sana (Normale)', icon: 'poop-happy', color: '#8B4513' },
  soft: { label: '⚠️ Morbida', icon: 'poop-sad', color: '#D2B48C' },
  diarrhea: { label: '💧 Diarrea', icon: 'poop-sad', color: '#D2B48C' },
  hard: { label: '🪨 Dura/Stitica', icon: 'poop-hard', color: '#3D2817' },
  blood: { label: '🩸 Presenza di Sangue', icon: 'poop-sick', color: '#FF4444' },
  mucus: { label: '🫧 Presenza di Muco', icon: 'poop-sick', color: '#FF4444' }
};

// Chart Colors
export const CHART_COLORS = {
  healthy: '#4CAF50',
  soft: '#FF9800',
  diarrhea: '#F44336',
  hard: '#795548',
  blood: '#E91E63',
  mucus: '#9C27B0'
};

// Poop Sizes
export const POOP_SIZES = {
  small: 'Piccola',
  medium: 'Media',
  large: 'Grande'
};

// Poop Colors
export const POOP_COLORS = {
  normal: 'Marrone Normale',
  light: 'Chiaro',
  dark: 'Scuro',
  green: 'Verdastro',
  yellow: 'Giallastro',
  red: 'Rossastro'
};

// Poop Smells
export const POOP_SMELLS = {
  normal: 'Normale',
  strong: 'Molto Forte',
  unusual: 'Insolito'
};

// Filter Periods
export const FILTER_PERIODS = {
  all: 'Tutte',
  today: 'Oggi',
  yesterday: 'Ieri',
  week: 'Ultima Settimana',
  month: 'Ultimo Mese'
};

// UI Constants
export const TOAST_DURATION = 3000;
export const REMINDER_DAYS_BEFORE = 7;
