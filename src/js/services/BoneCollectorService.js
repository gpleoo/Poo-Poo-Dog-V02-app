/**
 * Poo-Poo Dog Tracker - Collectible Service
 * Copyright (c) 2024-2025 Giampietro Leonoro & Monica Amato. All Rights Reserved.
 *
 * Spawns collectible treats on the map near the user's position:
 * 🍪 Biscottini (common), 🍗 Cosce di pollo (medium), 🦴 Ossetti (rare)
 */

import { STORAGE_KEYS } from '../utils/constants.js';

export class BoneCollectorService {
  constructor(mapService, notificationService) {
    this.mapService = mapService;
    this.notificationService = notificationService;

    // Configuration
    this.SPAWN_INTERVAL_MS = 150000;      // Spawn new items every 2.5 minutes
    this.SPAWN_RADIUS_MIN = 50;           // Minimum spawn distance (meters)
    this.SPAWN_RADIUS_MAX = 400;          // Maximum spawn distance (meters)
    this.ITEMS_PER_SPAWN = 4;             // Items per spawn cycle
    this.MAX_ITEMS_ON_MAP = 12;           // Max items visible at once
    this.DAILY_LIMIT = 30;                // Max items collectible per day
    this.COLLECT_RADIUS = 30;             // Meters to collect an item
    this.DESPAWN_TIME_MS = 600000;        // Items despawn after 10 minutes
    this.GOLDEN_CHANCE = 0.05;            // 5% chance of golden bone (only for bones)

    // Collectible types with rarity weights and point values
    // Rarity: cookie 60%, chicken 30%, bone 10%
    this.COLLECTIBLE_TYPES = {
      cookie:  { emoji: '🍪', name: 'Biscottino', namePlural: 'Biscottini', points: 1, weight: 60, cssClass: 'cookie-marker' },
      chicken: { emoji: '🍗', name: 'Coscia di Pollo', namePlural: 'Cosce di Pollo', points: 3, weight: 30, cssClass: 'chicken-marker' },
      bone:    { emoji: '🦴', name: 'Ossetto', namePlural: 'Ossetti', points: 5, weight: 10, cssClass: 'bone-marker' }
    };
    this.GOLDEN_MULTIPLIER = 5;           // Golden bones worth 5x

    // State
    this.bones = new Map();               // Active items on map { id: itemData }
    this.boneMarkers = new Map();         // Leaflet markers for items
    this.spawnTimer = null;
    this.enabled = false;

    // Stats (persisted)
    this.stats = {
      collectedToday: 0,
      totalCollected: 0,
      goldenCollected: 0,
      cookieCollected: 0,
      chickenCollected: 0,
      boneCollected: 0,
      lastCollectionDate: null,
      wheelSpinsAvailable: 0
    };

    this.loadStats();
  }

  // ========== PERSISTENCE ==========

  loadStats() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.boneStats);
      if (data) {
        this.stats = { ...this.stats, ...JSON.parse(data) };
      }
      // Reset daily counter if it's a new day
      this._checkDayReset();
    } catch (e) {
      console.error('Error loading bone stats:', e);
    }
  }

  saveStats() {
    try {
      localStorage.setItem(STORAGE_KEYS.boneStats, JSON.stringify(this.stats));
    } catch (e) {
      console.error('Error saving bone stats:', e);
    }
  }

  _checkDayReset() {
    const today = new Date().toDateString();
    if (this.stats.lastCollectionDate !== today) {
      this.stats.collectedToday = 0;
      this.stats.lastCollectionDate = today;
      this.saveStats();
    }
  }

  // ========== CORE LOGIC ==========

  /**
   * Start the bone collector system
   */
  start() {
    if (this.enabled) return;
    this.enabled = true;
    this._checkDayReset();

    // Initial spawn
    this.spawnBones();

    // Set interval for periodic spawning
    this.spawnTimer = setInterval(() => {
      this.spawnBones();
    }, this.SPAWN_INTERVAL_MS);

    console.log('🦴 Bone Collector started');
  }

  /**
   * Stop the bone collector system
   */
  stop() {
    this.enabled = false;
    if (this.spawnTimer) {
      clearInterval(this.spawnTimer);
      this.spawnTimer = null;
    }
    this.clearAllBones();
    console.log('🦴 Bone Collector stopped');
  }

  /**
   * Spawn new bones near the user's position
   */
  spawnBones() {
    const userPos = this.mapService.getUserPosition();
    if (!userPos) return;

    // Don't spawn if map has enough items
    if (this.bones.size >= this.MAX_ITEMS_ON_MAP) return;

    // Don't spawn if daily limit reached
    if (this.stats.collectedToday >= this.DAILY_LIMIT) return;

    const itemsToSpawn = Math.min(
      this.ITEMS_PER_SPAWN,
      this.MAX_ITEMS_ON_MAP - this.bones.size
    );

    for (let i = 0; i < itemsToSpawn; i++) {
      this._spawnSingleBone(userPos);
    }
  }

  /**
   * Pick a random collectible type based on rarity weights
   */
  _pickRandomType() {
    const types = Object.entries(this.COLLECTIBLE_TYPES);
    const totalWeight = types.reduce((sum, [, t]) => sum + t.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const [key, type] of types) {
      roll -= type.weight;
      if (roll <= 0) return key;
    }
    return 'cookie'; // fallback
  }

  /**
   * Spawn a single collectible at a random position near user
   */
  _spawnSingleBone(userPos) {
    const id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Random angle and distance
    const angle = Math.random() * 2 * Math.PI;
    const distance = this.SPAWN_RADIUS_MIN +
      Math.random() * (this.SPAWN_RADIUS_MAX - this.SPAWN_RADIUS_MIN);

    // Convert meters to approximate degrees
    const dLat = (distance * Math.cos(angle)) / 111320;
    const dLng = (distance * Math.sin(angle)) / (111320 * Math.cos(userPos.lat * Math.PI / 180));

    const collectibleType = this._pickRandomType();
    const typeConfig = this.COLLECTIBLE_TYPES[collectibleType];

    // Golden variant only for bones
    const isGolden = collectibleType === 'bone' && Math.random() < this.GOLDEN_CHANCE;

    const bone = {
      id,
      lat: userPos.lat + dLat,
      lng: userPos.lng + dLng,
      collectibleType,
      typeConfig,
      isGolden,
      spawnTime: Date.now(),
      value: isGolden ? typeConfig.points * this.GOLDEN_MULTIPLIER : typeConfig.points
    };

    this.bones.set(id, bone);
    this._addBoneMarker(bone);

    // Set despawn timer
    setTimeout(() => {
      this._despawnBone(id);
    }, this.DESPAWN_TIME_MS);
  }

  /**
   * Add a Leaflet marker for a collectible
   */
  _addBoneMarker(bone) {
    if (!this.mapService.map) return;

    let iconClass = bone.typeConfig.cssClass;
    let emoji = bone.typeConfig.emoji;

    if (bone.isGolden) {
      iconClass = 'bone-marker golden';
      emoji = '✨🦴✨';
    }

    const icon = L.divIcon({
      html: `<div class="${iconClass}">${emoji}</div>`,
      className: 'bone-marker-container',
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    const marker = L.marker([bone.lat, bone.lng], {
      icon,
      zIndexOffset: 500,
      interactive: true
    });

    marker.on('click', () => {
      this.tryCollectBone(bone.id);
    });

    marker.addTo(this.mapService.map);
    this.boneMarkers.set(bone.id, marker);
  }

  /**
   * Try to collect a bone (checks distance)
   */
  tryCollectBone(boneId) {
    const bone = this.bones.get(boneId);
    if (!bone) return;

    const userPos = this.mapService.getUserPosition();
    if (!userPos) {
      this.notificationService.showInfo('📍 GPS necessario per raccogliere i premi');
      return;
    }

    // Check daily limit
    if (this.stats.collectedToday >= this.DAILY_LIMIT) {
      this.notificationService.showInfo(`🎒 Hai raggiunto il limite giornaliero di ${this.DAILY_LIMIT} premi. Torna domani!`);
      return;
    }

    // Calculate distance
    const distance = this._getDistanceMeters(
      userPos.lat, userPos.lng,
      bone.lat, bone.lng
    );

    if (distance > this.COLLECT_RADIUS) {
      const remaining = Math.round(distance - this.COLLECT_RADIUS);
      this.notificationService.showInfo(`${bone.typeConfig.emoji} Avvicinati ancora ${remaining}m per raccogliere!`);
      return;
    }

    // Collect the bone!
    this._collectBone(bone);
  }

  /**
   * Collect a collectible — update stats, remove marker, show feedback
   */
  _collectBone(bone) {
    // Update stats
    this.stats.collectedToday++;
    this.stats.totalCollected++;
    if (bone.isGolden) {
      this.stats.goldenCollected++;
    }

    // Track per-type stats
    if (bone.collectibleType === 'cookie') this.stats.cookieCollected++;
    else if (bone.collectibleType === 'chicken') this.stats.chickenCollected++;
    else if (bone.collectibleType === 'bone') this.stats.boneCollected++;

    // Award wheel spin every 5 items
    const prevSpinThreshold = Math.floor((this.stats.totalCollected - 1) / 5);
    const newSpinThreshold = Math.floor(this.stats.totalCollected / 5);
    if (newSpinThreshold > prevSpinThreshold) {
      this.stats.wheelSpinsAvailable++;
    }

    this.saveStats();

    // Remove from map
    this._removeBoneMarker(bone.id);
    this.bones.delete(bone.id);

    // Show feedback
    const todayLabel = `(${this.stats.collectedToday}/${this.DAILY_LIMIT} oggi)`;
    if (bone.isGolden) {
      this.notificationService.showSuccess(`✨ Osso dorato raccolto! +${bone.value} punti! ${todayLabel}`);
    } else {
      this.notificationService.showSuccess(`${bone.typeConfig.emoji} ${bone.typeConfig.name} raccolto! +${bone.value} pt ${todayLabel}`);
    }

    // Trigger callback for UI update
    if (this.onBoneCollected) {
      this.onBoneCollected(bone, this.stats);
    }
  }

  /**
   * Despawn a bone (timeout)
   */
  _despawnBone(boneId) {
    if (!this.bones.has(boneId)) return;
    this._removeBoneMarker(boneId);
    this.bones.delete(boneId);
  }

  /**
   * Remove bone marker from map
   */
  _removeBoneMarker(boneId) {
    const marker = this.boneMarkers.get(boneId);
    if (marker && this.mapService.map) {
      this.mapService.map.removeLayer(marker);
    }
    this.boneMarkers.delete(boneId);
  }

  /**
   * Clear all bones from map
   */
  clearAllBones() {
    this.boneMarkers.forEach((marker) => {
      if (this.mapService.map) {
        this.mapService.map.removeLayer(marker);
      }
    });
    this.boneMarkers.clear();
    this.bones.clear();
  }

  // ========== GETTERS ==========

  getStats() {
    this._checkDayReset();
    return { ...this.stats };
  }

  getRemainingToday() {
    this._checkDayReset();
    return Math.max(0, this.DAILY_LIMIT - this.stats.collectedToday);
  }

  // ========== UTILITIES ==========

  /**
   * Haversine formula — distance in meters between two GPS points
   */
  _getDistanceMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Destroy the service
   */
  destroy() {
    this.stop();
  }
}
