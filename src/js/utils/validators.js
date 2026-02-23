/**
 * Poo-Poo Dog Tracker - Validation Functions
 * Copyright (c) 2024-2025 Giampietro Leonoro & Monica Amato. All Rights Reserved.
 */

/**
 * Validate email format
 */
export function isValidEmail(email) {
  if (!email) return true; // Optional field
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate phone number (Italian format)
 */
export function isValidPhone(phone) {
  if (!phone) return true; // Optional field
  const re = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
  return re.test(phone);
}

/**
 * Validate microchip number (15 digits)
 */
export function isValidMicrochip(microchip) {
  if (!microchip) return true; // Optional field
  const re = /^\d{15}$/;
  return re.test(microchip);
}

/**
 * Validate date is not in future
 */
export function isNotFutureDate(date) {
  if (!date) return true;
  return new Date(date) <= new Date();
}

/**
 * Validate positive number
 */
export function isPositiveNumber(value) {
  if (!value) return true; // Optional field
  return !isNaN(value) && parseFloat(value) > 0;
}

/**
 * Validate dog profile
 */
export function validateDogProfile(profile) {
  const errors = [];

  if (!profile.name || profile.name.trim() === '') {
    errors.push('Il nome del cane è obbligatorio');
  }

  if (profile.dogBirthdate && !isNotFutureDate(profile.dogBirthdate)) {
    errors.push('La data di nascita non può essere nel futuro');
  }

  if (profile.dogWeight && !isPositiveNumber(profile.dogWeight)) {
    errors.push('Il peso deve essere un numero positivo');
  }

  if (profile.vetEmail && !isValidEmail(profile.vetEmail)) {
    errors.push('Email veterinario non valida');
  }

  if (profile.vetPhone && !isValidPhone(profile.vetPhone)) {
    errors.push('Telefono veterinario non valido');
  }

  if (profile.dogMicrochip && !isValidMicrochip(profile.dogMicrochip)) {
    errors.push('Il microchip deve contenere 15 cifre');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate poop data
 */
export function validatePoopData(data) {
  const errors = [];

  if (!data.type) {
    errors.push('Il tipo di cacca è obbligatorio');
  }

  if (data.timestamp && !isNotFutureDate(data.timestamp)) {
    errors.push('La data non può essere nel futuro');
  }

  if (data.hoursSinceMeal && !isPositiveNumber(data.hoursSinceMeal)) {
    errors.push('Le ore dal pasto devono essere un numero positivo');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate coordinates
 */
export function isValidCoordinates(lat, lng) {
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Validate file size (in MB)
 */
export function isValidFileSize(file, maxSizeMB = 5) {
  return file.size <= maxSizeMB * 1024 * 1024;
}

/**
 * Validate image file type
 */
export function isValidImageType(file) {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(file.type);
}

/**
 * Validate backup data structure
 * Supports both current format (v2+) and legacy formats
 */
export function isValidBackup(data) {
  try {
    if (!data || typeof data !== 'object') return false;

    // Current format: has version, poops array, dogProfile object
    if ('version' in data && Array.isArray(data.poops)) return true;

    // Legacy format v1: has poops array but no version
    if (Array.isArray(data.poops) && data.poops.length >= 0) return true;

    // Legacy format: poops stored under different key names
    if (Array.isArray(data.records) || Array.isArray(data.data)) return true;

    // Legacy format: top-level array of poops
    if (Array.isArray(data)) return true;

    return false;
  } catch (e) {
    return false;
  }
}
