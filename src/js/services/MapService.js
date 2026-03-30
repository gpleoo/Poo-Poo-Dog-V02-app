/**
 * Poo-Poo Dog Tracker - Map Service
 * Copyright (c) 2024-2025 Giampietro Leonoro & Monica Amato. All Rights Reserved.
 */

import L from 'leaflet';
import 'leaflet.markercluster';
import { MAP_CONFIG, GPS_CONFIG, POOP_TYPES } from '../utils/constants.js';
import { throttle } from '../utils/helpers.js';
import { isValidCoordinates } from '../utils/validators.js';

export class MapService {
  constructor(notificationService) {
    this.map = null;
    this.userMarker = null;
    this.userPosition = null;
    this.watchId = null;
    this.markerClusterGroup = null;
    this.poopMarkers = new Map();
    this.notificationService = notificationService;

    // GPS settings
    this.gpsPermissionStatus = 'unknown';
    this.gpsEnabled = true;

    // Auto-center settings
    this.autoCenter = true;
    this.preferredZoom = MAP_CONFIG.defaultZoom;

    // Position update throttling
    this.isUpdatingPosition = false;
    this.lastPositionUpdate = 0;

    // Quadrants overlay
    this.quadrantsLayer = null;
    this.quadrantsVisible = false;

    // Dog marker data (persisted across GPS updates)
    this.dogPhoto = null;
    this.dogName = 'il tuo cane';

    // Callbacks
    this.onMarkerClick = null;
    this.onUserMarkerClick = null;
  }

  /**
   * Initialize map
   */
  initMap(containerId = 'map') {
    try {
      this.map = L.map(containerId, {
        zoomControl: true,
        attributionControl: false
      }).setView(MAP_CONFIG.defaultCenter, MAP_CONFIG.defaultZoom);

      L.tileLayer(MAP_CONFIG.tileLayerUrl, {
        maxZoom: MAP_CONFIG.maxZoom
      }).addTo(this.map);

      this.map.zoomControl.setPosition('topright');

      // Initialize cluster group
      this.markerClusterGroup = L.markerClusterGroup({
        iconCreateFunction: (cluster) => this.createClusterIcon(cluster),
        maxClusterRadius: MAP_CONFIG.clusterRadius,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true
      });

      this.map.addLayer(this.markerClusterGroup);

      // Setup map event listeners
      this.setupMapListeners();

      console.log('✅ Map initialized');
      return true;
    } catch (error) {
      console.error('❌ Error initializing map:', error);
      throw error;
    }
  }

  /**
   * Setup map event listeners
   */
  setupMapListeners() {
    // Disable auto-center when user drags map
    this.map.on('dragstart', () => {
      if (this.autoCenter) {
        this.autoCenter = false;
        console.log('Auto-center disabled - user moved map');
      }
    });

    // Save zoom preference when user changes zoom
    this.map.on('zoomend', () => {
      if (this.isUpdatingPosition) return;

      const newZoom = this.map.getZoom();
      if (newZoom !== this.preferredZoom) {
        this.preferredZoom = newZoom;
        console.log('Preferred zoom updated:', this.preferredZoom);
      }
    });
  }

  // ========== GPS & GEOLOCATION ==========

  /**
   * Initialize geolocation and start watching position
   */
  async initGeolocation() {
    if (!navigator.geolocation) {
      this.gpsPermissionStatus = 'unsupported';
      this.notificationService?.showError('Geolocalizzazione non supportata dal browser');
      return false;
    }

    if (!this.gpsEnabled) {
      console.log('GPS disabled by user');
      return false;
    }

    try {
      // Request initial position
      const position = await this.getCurrentPosition();
      this.gpsPermissionStatus = 'granted';

      this.userPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      // Set initial view
      this.isUpdatingPosition = true;
      this.map.setView([this.userPosition.lat, this.userPosition.lng], this.preferredZoom);
      setTimeout(() => {
        this.isUpdatingPosition = false;
      }, 500);

      this.updateUserMarker();
      this.notificationService?.showSuccess('Posizione trovata!');

      // Start watching position
      this.startWatchingPosition();

      return true;
    } catch (error) {
      this.handleGeolocationError(error);
      return false;
    }
  }

  /**
   * Get current position (Promise wrapper)
   */
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: GPS_CONFIG.enableHighAccuracy,
          timeout: GPS_CONFIG.timeout,
          maximumAge: GPS_CONFIG.maximumAge
        }
      );
    });
  }

  /**
   * Start watching user position
   */
  startWatchingPosition() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
    }

    const throttledUpdate = throttle((position) => {
      this.userPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      this.updateUserMarker();

      // Auto-center if enabled
      if (this.autoCenter) {
        this.isUpdatingPosition = true;
        this.map.setView(
          [this.userPosition.lat, this.userPosition.lng],
          this.preferredZoom,
          { animate: true, duration: 0.3 }
        );
        setTimeout(() => {
          this.isUpdatingPosition = false;
        }, 500);
      }
    }, GPS_CONFIG.updateThrottle);

    this.watchId = navigator.geolocation.watchPosition(
      throttledUpdate,
      (error) => console.error('Watch position error:', error),
      {
        enableHighAccuracy: GPS_CONFIG.enableHighAccuracy,
        maximumAge: 5000,
        timeout: GPS_CONFIG.timeout
      }
    );
  }

  /**
   * Stop watching position
   */
  stopWatchingPosition() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Handle geolocation errors
   */
  handleGeolocationError(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        this.gpsPermissionStatus = 'denied';
        this.notificationService?.showError('Permesso GPS negato. Vai in Impostazioni per riattivarlo.');
        break;
      case error.POSITION_UNAVAILABLE:
        this.gpsPermissionStatus = 'unavailable';
        this.notificationService?.showWarning('Posizione non disponibile');
        break;
      case error.TIMEOUT:
        this.gpsPermissionStatus = 'timeout';
        this.notificationService?.showWarning('Timeout GPS. Riprova.');
        break;
      default:
        this.gpsPermissionStatus = 'error';
        this.notificationService?.showError('Errore GPS sconosciuto');
    }
  }

  /**
   * Enable GPS
   */
  setGPSEnabled(enabled) {
    this.gpsEnabled = enabled;

    if (enabled) {
      this.initGeolocation();
    } else {
      this.stopWatchingPosition();
    }
  }

  /**
   * Get GPS permission status
   */
  getGPSStatus() {
    return {
      enabled: this.gpsEnabled,
      permission: this.gpsPermissionStatus,
      hasPosition: !!this.userPosition
    };
  }

  // ========== USER MARKER ==========

  /**
   * Update user marker on map
   */
  updateUserMarker(dogPhoto, dogName) {
    // Store dog photo and name when explicitly provided
    if (dogPhoto !== undefined) {
      this.dogPhoto = dogPhoto;
    }
    if (dogName !== undefined) {
      this.dogName = dogName;
    }

    if (!this.userPosition) return;

    // Check if marker existed and was visible before updating
    const hadMarker = !!this.userMarker;
    const wasVisible = hadMarker ? this.isDogMarkerVisible() : true; // Default to visible on first creation

    if (this.userMarker) {
      this.map.removeLayer(this.userMarker);
    }

    const iconHtml = this.dogPhoto
      ? `<div class="dog-marker" style="background-image: url('${this.dogPhoto}'); background-size: cover; background-position: center;"></div>`
      : `<div class="dog-marker" style="display: flex; align-items: center; justify-content: center; font-size: 2em;">🐕</div>`;

    const userIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-user-marker',
      iconSize: [80, 80],
      iconAnchor: [40, 40]
    });

    this.userMarker = L.marker(
      [this.userPosition.lat, this.userPosition.lng],
      {
        icon: userIcon,
        zIndexOffset: 1000
      }
    );

    // Only add to map if it was visible before, or if this is the first time
    if (wasVisible) {
      this.userMarker.addTo(this.map);
    }

    if (this.onUserMarkerClick) {
      this.userMarker.on('click', this.onUserMarkerClick);
    }

    const popupText = this.dogPhoto
      ? `<b>🐕 Tu e ${this.dogName} siete qui!</b><br>Clicca per cambiare la foto`
      : `<b>🐕 Tu e ${this.dogName} siete qui!</b><br>Clicca per aggiungere la foto`;

    this.userMarker.bindPopup(popupText);
  }

  /**
   * Toggle dog marker visibility
   */
  toggleDogMarkerVisibility(show) {
    if (!this.userMarker) return false;

    if (show) {
      if (!this.map.hasLayer(this.userMarker)) {
        this.map.addLayer(this.userMarker);
      }
    } else {
      if (this.map.hasLayer(this.userMarker)) {
        this.map.removeLayer(this.userMarker);
      }
    }
    return show;
  }

  /**
   * Check if dog marker is visible
   */
  isDogMarkerVisible() {
    if (!this.userMarker) return false;
    return this.map.hasLayer(this.userMarker);
  }

  // ========== POOP MARKERS ==========

  /**
   * Add poop marker to map
   */
  addPoopMarker(poop) {
    if (!isValidCoordinates(poop.lat, poop.lng)) {
      console.warn('Invalid coordinates for poop:', poop);
      return null;
    }

    const iconName = this.getPoopIcon(poop.type);
    const poopIcon = L.divIcon({
      html: `<svg class="poop-svg-icon"><use href="#${iconName}"></use></svg>`,
      className: 'custom-poop-marker',
      iconSize: [50, 50],
      iconAnchor: [25, 25]
    });

    const marker = L.marker([poop.lat, poop.lng], {
      icon: poopIcon,
      poopId: poop.id
    });

    const popupContent = this.createPoopPopup(poop);
    marker.bindPopup(popupContent);

    if (this.onMarkerClick) {
      marker.on('click', () => this.onMarkerClick(poop));
    }

    this.markerClusterGroup.addLayer(marker);
    this.poopMarkers.set(poop.id, marker);

    return marker;
  }

  /**
   * Remove poop marker from map
   */
  removePoopMarker(poopId) {
    const marker = this.poopMarkers.get(poopId);
    if (marker) {
      this.markerClusterGroup.removeLayer(marker);
      this.poopMarkers.delete(poopId);
      return true;
    }
    return false;
  }

  /**
   * Clear all poop markers
   */
  clearAllPoopMarkers() {
    this.markerClusterGroup.clearLayers();
    this.poopMarkers.clear();
  }

  /**
   * Update all poop markers (refresh)
   */
  updatePoopMarkers(poops) {
    this.clearAllPoopMarkers();
    poops.forEach(poop => {
      if (poop.lat && poop.lng) {
        this.addPoopMarker(poop);
      }
    });
  }

  /**
   * Get poop icon name based on type
   */
  getPoopIcon(type) {
    return POOP_TYPES[type]?.icon || 'poop-sad';
  }

  /**
   * Create popup content for poop marker
   */
  createPoopPopup(poop) {
    const date = new Date(poop.timestamp);
    const dateStr = date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const typeLabel = POOP_TYPES[poop.type]?.label || poop.type;

    let content = `
      <div style="text-align: center; font-family: 'Fredoka', cursive;">
        <b>💩 Dettagli Cacca</b><br>
        <div style="margin: 10px 0; text-align: left; font-size: 0.95em;">
          <b>Stato:</b> ${typeLabel}<br>
          <b>Dimensione:</b> ${poop.size}<br>
          <b>Colore:</b> ${poop.color}<br>
          <b>Odore:</b> ${poop.smell}<br>`;

    if (poop.food) {
      content += `<b>🍖 Cibo:</b> ${poop.food}<br>`;
    }
    if (poop.hoursSinceMeal) {
      content += `<b>⏰ Ore dal pasto:</b> ${poop.hoursSinceMeal}h<br>`;
    }
    if (poop.notes) {
      content += `<b>Note:</b> ${poop.notes}<br>`;
    }

    content += `
        </div>
        📅 ${dateStr}
      </div>`;

    return content;
  }

  /**
   * Create cluster icon
   */
  createClusterIcon(cluster) {
    const markers = cluster.getAllChildMarkers();
    const count = markers.length;

    // Count poop types in cluster
    const typeCounts = {};
    markers.forEach(marker => {
      const poopType = marker.options.poopType || 'healthy';
      typeCounts[poopType] = (typeCounts[poopType] || 0) + 1;
    });

    // Find most common type
    let mostCommonType = 'healthy';
    let maxCount = 0;
    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonType = type;
      }
    }

    const iconName = this.getPoopIcon(mostCommonType);

    const html = `
      <div class="custom-cluster-icon" style="position: relative;">
        <svg class="poop-svg-icon-cluster" style="width: 60px; height: 60px;">
          <use href="#${iconName}"></use>
        </svg>
        <div class="cluster-count" style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border: 2px solid #333;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 12px;
          color: #333;
          font-family: 'Fredoka', cursive;
        ">${count}</div>
      </div>`;

    return L.divIcon({
      html: html,
      className: 'custom-cluster-marker',
      iconSize: L.point(60, 60),
      iconAnchor: [30, 30]
    });
  }

  // ========== MAP CONTROLS ==========

  /**
   * Center map on user position
   */
  centerOnUser() {
    if (!this.userPosition) {
      this.notificationService?.showWarning('Posizione non ancora rilevata!');
      return false;
    }

    this.autoCenter = true;
    this.isUpdatingPosition = true;

    this.map.setView(
      [this.userPosition.lat, this.userPosition.lng],
      this.preferredZoom,
      { animate: true, duration: 0.5 }
    );

    setTimeout(() => {
      this.isUpdatingPosition = false;
    }, 600);

    this.notificationService?.showInfo('Auto-center attivato!');
    return true;
  }

  /**
   * Find nearby free position (avoid overlapping markers)
   */
  findNearbyFreePosition(lat, lng, existingPoops = []) {
    const MIN_DISTANCE = 0.00003;
    const MAX_ATTEMPTS = 8;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      let testLat = lat;
      let testLng = lng;

      if (i > 0) {
        const angle = (i / MAX_ATTEMPTS) * 2 * Math.PI;
        const distance = MIN_DISTANCE * (1 + i * 0.3);
        testLat += Math.cos(angle) * distance;
        testLng += Math.sin(angle) * distance;
      }

      const isFree = !existingPoops.some(p => {
        if (!p.lat || !p.lng) return false;
        const dist = Math.sqrt(
          Math.pow(p.lat - testLat, 2) +
          Math.pow(p.lng - testLng, 2)
        );
        return dist < MIN_DISTANCE;
      });

      if (isFree) {
        return { lat: testLat, lng: testLng };
      }
    }

    return { lat, lng };
  }

  /**
   * Get current user position
   */
  getUserPosition() {
    return this.userPosition ? { ...this.userPosition } : null;
  }

  /**
   * Get map settings
   */
  getMapSettings() {
    return {
      zoom: this.preferredZoom,
      autoCenter: this.autoCenter
    };
  }

  /**
   * Set map settings
   */
  setMapSettings(settings) {
    if (settings.zoom !== undefined) {
      this.preferredZoom = settings.zoom;
    }
    if (settings.autoCenter !== undefined) {
      this.autoCenter = settings.autoCenter;
    }
  }

  /**
   * Close all popups
   */
  closePopups() {
    this.map.closePopup();
  }

  // ========== QUADRANTS OVERLAY ==========

  /**
   * Update quadrants overlay on map
   * @param {Object} quadrantsData - Quadrants data from AchievementsService
   * @param {Function} getColorFn - Function to get color for quadrant
   */
  updateQuadrantsOverlay(quadrantsData, getColorFn) {
    // Remove existing layer
    if (this.quadrantsLayer) {
      this.map.removeLayer(this.quadrantsLayer);
      this.quadrantsLayer = null;
    }

    // Create new layer group
    this.quadrantsLayer = L.layerGroup();

    // Add rectangles for each quadrant
    Object.values(quadrantsData).forEach(quadrant => {
      const bounds = this.getQuadrantBounds(quadrant.cellId);
      const color = getColorFn(quadrant.count);

      const rectangle = L.rectangle(
        [[bounds.south, bounds.west], [bounds.north, bounds.east]],
        {
          color: quadrant.completed ? '#4CAF50' : '#FFC107',
          weight: 1,
          fillColor: color,
          fillOpacity: 0.4
        }
      );

      // Add popup with info
      const popupContent = `
        <div style="text-align: center;">
          <strong>${quadrant.completed ? '✅' : '🎯'} Zona ${quadrant.cellId}</strong><br>
          <span style="font-size: 1.2em;">${quadrant.count} / 20 cacche</span><br>
          ${quadrant.completed
            ? '<span style="color: #4CAF50; font-weight: bold;">🏆 COMPLETATA!</span>'
            : `<span style="color: #FFC107;">Ancora ${20 - quadrant.count} cacche per completare</span>`
          }
        </div>
      `;

      rectangle.bindPopup(popupContent);
      this.quadrantsLayer.addLayer(rectangle);
    });

    // Add to map if visible
    if (this.quadrantsVisible) {
      this.map.addLayer(this.quadrantsLayer);
    }
  }

  /**
   * Get quadrant bounds from cell ID
   * @param {string} cellId - Cell ID (e.g., "41_12")
   * @returns {Object} Bounds {north, south, east, west}
   */
  getQuadrantBounds(cellId) {
    const [cellLat, cellLng] = cellId.split('_').map(Number);
    const gridSizeDegrees = 1000 / 111320; // 1000m to degrees

    return {
      south: cellLat * gridSizeDegrees,
      north: (cellLat + 1) * gridSizeDegrees,
      west: cellLng * gridSizeDegrees,
      east: (cellLng + 1) * gridSizeDegrees
    };
  }

  /**
   * Toggle quadrants overlay visibility
   * @param {boolean} visible - Show or hide
   * @returns {boolean} New visibility state
   */
  toggleQuadrantsOverlay(visible) {
    this.quadrantsVisible = visible;

    if (!this.quadrantsLayer) return this.quadrantsVisible;

    if (visible) {
      if (!this.map.hasLayer(this.quadrantsLayer)) {
        this.map.addLayer(this.quadrantsLayer);
      }
    } else {
      if (this.map.hasLayer(this.quadrantsLayer)) {
        this.map.removeLayer(this.quadrantsLayer);
      }
    }

    return this.quadrantsVisible;
  }

  /**
   * Check if quadrants overlay is visible
   * @returns {boolean} Visibility state
   */
  areQuadrantsVisible() {
    return this.quadrantsVisible;
  }

  /**
   * Destroy map and cleanup
   */
  destroy() {
    this.stopWatchingPosition();
    this.clearAllPoopMarkers();

    if (this.quadrantsLayer) {
      this.map.removeLayer(this.quadrantsLayer);
      this.quadrantsLayer = null;
    }

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
