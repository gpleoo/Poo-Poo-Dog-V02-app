/**
 * Poo-Poo Dog Tracker - Main Application
 * Copyright (c) 2024-2025 Giampietro Leonoro & Monica Amato. All Rights Reserved.
 */

import '../css/styles.css';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import { MapService } from './services/MapService.js';
import { DataService } from './services/DataService.js';
import { NotificationService } from './services/NotificationService.js';
import { ChartService } from './services/ChartService.js';
import { ExportService } from './services/ExportService.js';
import { UIManager } from './services/UIManager.js';
import { AchievementsService } from './services/AchievementsService.js';
import { BoneCollectorService } from './services/BoneCollectorService.js';

import { COPYRIGHT } from './utils/constants.js';
import { debounce } from './utils/helpers.js';

/**
 * Main PoopTracker Application Class
 */
class PoopTracker {
  constructor() {
    // Initialize services
    this.notificationService = new NotificationService();
    this.dataService = new DataService();
    this.mapService = new MapService(this.notificationService);
    this.chartService = new ChartService();
    this.exportService = new ExportService();
    this.uiManager = new UIManager();
    this.achievementsService = new AchievementsService();
    this.boneCollectorService = new BoneCollectorService(this.mapService, this.notificationService);

    // Pending poop data
    this.pendingPoopData = null;

    // Display copyright
    this.displayCopyright();
  }

  /**
   * Initialize application
   */
  async init() {
    try {
      console.log('🚀 Initializing Poo-Poo Dog Tracker...');

      // Load data
      this.dataService.loadAll();

      // Initialize map
      this.mapService.initMap('map');

      // Load map settings
      const mapSettings = this.dataService.getMapSettings();
      this.mapService.setMapSettings(mapSettings);

      // Initialize GPS if enabled
      if (this.dataService.isGPSEnabled()) {
        await this.mapService.initGeolocation();

        // Start bone collector after GPS is available
        this.boneCollectorService.onBoneCollected = (bone, stats) => {
          this.updateBoneCounter(stats);
          this.updateAchievementsUI();
        };
        this.boneCollectorService.start();
      }

      // Initialize UI
      this.uiManager.init();

      // Setup UI callbacks
      this.setupUICallbacks();

      // Setup map callbacks
      this.setupMapCallbacks();

      // Setup button event listeners
      this.setupButtonListeners();

      // Update UI
      this.updateAllUI();

      // Update bone counter
      this.updateBoneCounter(this.boneCollectorService.getStats());

      // Check urgent reminders (after UI is ready)
      this.checkUrgentReminders();

      // Request browser notification permission
      this.notificationService.requestNotificationPermission();

      // Show welcome message if first time
      if (this.dataService.isFirstTime && !this.dataService.dogProfile.name) {
        setTimeout(() => {
          this.uiManager.openModal('dogProfileModal');
          this.notificationService.showInfo('👋 Benvenuto! Inserisci i dati del tuo cane per iniziare');
        }, 1000);
      }

      // Load existing poop markers
      const poops = this.dataService.getAllPoops();
      this.mapService.updatePoopMarkers(poops);

      // Update dog marker
      this.updateDogMarker();

      // Apply dog marker visibility from settings
      const dogMarkerVisible = mapSettings.dogMarkerVisible !== false;
      this.mapService.toggleDogMarkerVisibility(dogMarkerVisible);
      this.updateDogMarkerButton(dogMarkerVisible);

      // Apply quadrants visibility from settings
      const quadrantsVisible = this.dataService.isQuadrantsGridVisible();
      if (quadrantsVisible) {
        // Update quadrants overlay (will be shown if visible)
        this.updateAchievementsUI();
      }
      this.updateQuadrantsButton(quadrantsVisible);

      console.log('✅ Application initialized successfully!');
    } catch (error) {
      console.error('❌ Error initializing application:', error);
      this.notificationService.showError('Errore durante l\'inizializzazione dell\'app');
    }
  }

  /**
   * Display copyright in console
   */
  displayCopyright() {
    console.log(
      `%c© ${COPYRIGHT.year} ${COPYRIGHT.authors.join(' & ')}`,
      'font-size: 14px; font-weight: bold; color: #f093fb; text-shadow: 1px 1px 2px black;'
    );
    console.log(
      `%c${COPYRIGHT.rights}`,
      'font-size: 12px; color: #667eea;'
    );
    console.log(
      '%cUnauthorized use, reproduction or distribution is prohibited.',
      'font-size: 10px; color: #ff6b6b;'
    );
  }

  // ========== UI CALLBACKS ==========

  setupUICallbacks() {
    // Dog Profile
    this.uiManager.onSaveDogProfile = (data) => this.saveDogProfile(data);

    // Dog Photo
    this.uiManager.onSaveDogPhoto = (photoDataUrl) => this.saveDogPhoto(photoDataUrl);
    this.uiManager.onRemoveDogPhoto = () => this.removeDogPhoto();

    // Poop Details
    this.uiManager.onSavePoop = (data) => this.savePoopWithDetails(data);

    // Filters
    this.uiManager.onApplyFilters = (filters) => this.applyFilters(filters);

    // Export
    this.uiManager.onExportPDF = () => this.exportPDF();
    this.uiManager.onExportBackup = () => this.exportBackup();
    this.uiManager.onImportBackup = (backupData) => this.importBackup(backupData);

    // Settings
    this.uiManager.onGPSToggle = (enabled) => this.toggleGPS(enabled);
    this.uiManager.onRequestGPS = () => this.requestGPS();
    this.uiManager.onClearAllData = () => this.clearAllData();

    // Delete poop (global function)
    window.deletePoop = (poopId) => this.deletePoop(poopId);
  }

  setupMapCallbacks() {
    // User marker click - open dog photo modal
    this.mapService.onUserMarkerClick = () => {
      this.uiManager.openModal('dogPhotoModal');
    };

    // Poop marker click
    this.mapService.onMarkerClick = (poop) => {
      console.log('Poop clicked:', poop);
    };
  }

  setupButtonListeners() {
    // Add poop button (with GPS)
    const addPoopBtn = document.getElementById('addPoopBtn');
    if (addPoopBtn) {
      addPoopBtn.addEventListener('click', () => this.addPoop());
    }

    // Add manual poop button (without GPS)
    const addManualPoopBtn = document.getElementById('addManualPoopBtn');
    if (addManualPoopBtn) {
      addManualPoopBtn.addEventListener('click', () => this.addManualPoop());
    }

    // Center map button
    const centerMapBtn = document.getElementById('centerMapBtn');
    if (centerMapBtn) {
      centerMapBtn.addEventListener('click', () => this.mapService.centerOnUser());
    }

    // Toggle dog marker button
    const toggleDogMarkerBtn = document.getElementById('toggleDogMarkerBtn');
    if (toggleDogMarkerBtn) {
      toggleDogMarkerBtn.addEventListener('click', () => this.toggleDogMarker());
    }

    // Toggle quadrants button
    const toggleQuadrantsBtn = document.getElementById('toggleQuadrantsBtn');
    if (toggleQuadrantsBtn) {
      toggleQuadrantsBtn.addEventListener('click', () => this.toggleQuadrants());
    }
  }

  // ========== POOP MANAGEMENT ==========

  /**
   * Add poop with GPS
   */
  addPoop() {
    let userPosition = this.mapService.getUserPosition();

    // If no GPS position, use map center as fallback
    if (!userPosition) {
      const mapCenter = this.mapService.map.getCenter();
      userPosition = {
        lat: mapCenter.lat,
        lng: mapCenter.lng
      };
      this.notificationService.showInfo('📍 GPS non disponibile - usando centro mappa');
    }

    // Play sound
    this.notificationService.playPlopSound();

    // Find free position
    const existingPoops = this.dataService.getAllPoops();
    const position = this.mapService.findNearbyFreePosition(
      userPosition.lat,
      userPosition.lng,
      existingPoops
    );

    this.pendingPoopData = {
      lat: position.lat,
      lng: position.lng,
      isManual: false
    };

    this.uiManager.openPoopDetailsModal(false);
  }

  /**
   * Add manual poop (without GPS)
   */
  addManualPoop() {
    // Play sound
    this.notificationService.playPlopSound();

    this.pendingPoopData = {
      lat: null,
      lng: null,
      isManual: true
    };

    this.uiManager.openPoopDetailsModal(true);
    this.notificationService.showInfo('📝 Inserimento manuale - specifica data e ora');
  }

  /**
   * Save poop with details
   */
  savePoopWithDetails(details) {
    if (!this.pendingPoopData) {
      this.notificationService.showError('Errore: dati mancanti');
      return;
    }

    try {
      const poopData = {
        ...this.pendingPoopData,
        ...details
      };

      // Add poop to data service
      const poop = this.dataService.addPoop(poopData);

      // Save note if requested
      if (details.saveNote && details.notes) {
        this.dataService.saveNote(details.notes);
        this.uiManager.updateSavedNotesDropdown(this.dataService.getSavedNotes());
      }

      // Add marker to map (only if not manual)
      if (!poop.isManual && poop.lat && poop.lng) {
        this.mapService.addPoopMarker(poop);
      }

      // Update UI
      this.updateAllUI();

      // Update achievements and check for new ones
      this.updateAchievementsUI();

      // Show success message
      if (poop.isManual) {
        this.notificationService.showSuccess('📝 Cacca manuale registrata!');
      } else {
        this.notificationService.showSuccess('💩 Cacca registrata con successo!');
      }

      // Close modal
      this.uiManager.closeModal('poopDetailsModal');

      // Clear pending data
      this.pendingPoopData = null;
    } catch (error) {
      console.error('Error saving poop:', error);
      this.notificationService.showError(`Errore: ${error.message}`);
    }
  }

  /**
   * Delete poop
   */
  deletePoop(poopId) {
    try {
      const poop = this.dataService.getPoopById(poopId);
      if (!poop) {
        this.notificationService.showError('Cacca non trovata');
        return;
      }

      if (!confirm('Vuoi davvero cancellare questa cacca?')) {
        return;
      }

      // Remove from data service
      this.dataService.removePoop(poopId);

      // Remove marker from map
      this.mapService.removePoopMarker(poopId);

      // Close any open popups
      this.mapService.closePopups();

      // Update UI
      this.updateAllUI();

      this.notificationService.showSuccess('🗑️ Cacca rimossa con successo!');
    } catch (error) {
      console.error('Error deleting poop:', error);
      this.notificationService.showError(`Errore: ${error.message}`);
    }
  }

  // ========== DOG PROFILE ==========

  saveDogProfile(data) {
    try {
      this.dataService.saveDogProfile(data);

      this.uiManager.updateDogName(data.name);
      this.updateDogMarker();
      this.updateReminders();

      // Check if there are urgent reminders after saving profile
      const urgentReminders = this.dataService.getUrgentReminders();
      if (urgentReminders.length > 0 && urgentReminders.some(r => r.isOverdue)) {
        // Show urgent modal if there are overdue reminders
        setTimeout(() => {
          this.uiManager.showUrgentReminders(urgentReminders);
        }, 500);
      }

      this.notificationService.showSuccess('✅ Profilo salvato con successo!');
      this.uiManager.closeModal('dogProfileModal');
    } catch (error) {
      console.error('Error saving dog profile:', error);
      this.notificationService.showError(`Errore: ${error.message}`);
    }
  }

  saveDogPhoto(photoDataUrl) {
    try {
      this.dataService.saveDogPhoto(photoDataUrl);
      this.uiManager.updateDogPhotoPreview(photoDataUrl);
      this.updateDogMarker();

      this.notificationService.showSuccess('📸 Foto salvata!');
      this.uiManager.closeModal('dogPhotoModal');
    } catch (error) {
      console.error('Error saving dog photo:', error);
      this.notificationService.showError(`Errore: ${error.message}`);
    }
  }

  removeDogPhoto() {
    try {
      this.dataService.removeDogPhoto();
      this.uiManager.updateDogPhotoPreview(null);
      this.updateDogMarker();

      this.notificationService.showInfo('Foto rimossa');
      this.uiManager.closeModal('dogPhotoModal');
    } catch (error) {
      console.error('Error removing dog photo:', error);
      this.notificationService.showError(`Errore: ${error.message}`);
    }
  }

  updateDogMarker() {
    const dogPhoto = this.dataService.getDogPhoto();
    const dogProfile = this.dataService.getDogProfile();
    const dogName = dogProfile.name || 'il tuo cane';

    this.mapService.updateUserMarker(dogPhoto, dogName);
    this.uiManager.updateDogPhotoPreview(dogPhoto);
  }

  // ========== BONE COLLECTOR ==========

  updateBoneCounter(stats) {
    const cookieEl = document.getElementById('cookieCount');
    const chickenEl = document.getElementById('chickenCount');
    const boneEl = document.getElementById('boneCount');
    if (cookieEl) cookieEl.textContent = stats.cookieCollected || 0;
    if (chickenEl) chickenEl.textContent = stats.chickenCollected || 0;
    if (boneEl) boneEl.textContent = stats.boneCollected || 0;
  }

  // ========== FILTERS & STATISTICS ==========

  applyFilters(filters) {
    try {
      const filteredPoops = this.dataService.getFilteredPoops(filters);

      // Update map markers
      this.mapService.updatePoopMarkers(filteredPoops);

      // Update statistics WITH FILTERED DATA
      const stats = this.dataService.calculateStatistics(filteredPoops);
      this.uiManager.updateStats(stats);

      // Update recent list
      this.uiManager.updateRecentPoopsList(filteredPoops);

      // Update charts
      this.updateCharts(filteredPoops);

      this.notificationService.showInfo(`Filtri applicati: ${filteredPoops.length} cacche trovate`);
    } catch (error) {
      console.error('Error applying filters:', error);
      this.notificationService.showError('Errore durante l\'applicazione dei filtri');
    }
  }

  updateCharts(poops = null) {
    const poopsData = poops || this.dataService.getAllPoops();

    if (poopsData.length > 0) {
      this.chartService.createTypeChart('typeChart', poopsData);
      this.chartService.createTimelineChart('timelineChart', poopsData, 30);
      this.chartService.createFoodChart('foodChart', poopsData);
    }
  }

  // ========== EXPORT ==========

  async exportPDF() {
    try {
      const filters = this.uiManager.getFilters();
      const poops = this.dataService.getFilteredPoops(filters);
      const dogProfile = this.dataService.getDogProfile();

      await this.exportService.exportPDF(poops, dogProfile, filters);

      this.notificationService.showSuccess('📄 PDF esportato con successo!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      this.notificationService.showError('Errore durante l\'esportazione del PDF');
    }
  }

  exportBackup() {
    try {
      const backupData = this.dataService.exportBackup();
      const dogProfile = this.dataService.getDogProfile();
      const dogName = dogProfile.name || 'cane';

      this.exportService.exportBackup(backupData, dogName);

      this.notificationService.showSuccess('💾 Backup esportato con successo!');
    } catch (error) {
      console.error('Error exporting backup:', error);
      this.notificationService.showError('Errore durante l\'esportazione del backup');
    }
  }

  importBackup(backupData) {
    try {
      this.dataService.importBackup(backupData);

      // Reload everything
      const poops = this.dataService.getAllPoops();
      this.mapService.updatePoopMarkers(poops);
      this.updateAllUI();

      this.notificationService.showSuccess('📂 Backup importato con successo!');
    } catch (error) {
      console.error('Error importing backup:', error);
      this.notificationService.showError(`Errore: ${error.message}`);
    }
  }

  // ========== SETTINGS ==========

  toggleGPS(enabled) {
    try {
      this.dataService.setGPSEnabled(enabled);
      this.mapService.setGPSEnabled(enabled);

      const status = this.mapService.getGPSStatus();
      this.uiManager.updateGPSStatus(status);

      if (enabled) {
        this.notificationService.showSuccess('GPS attivato');
      } else {
        this.notificationService.showInfo('GPS disattivato');
      }
    } catch (error) {
      console.error('Error toggling GPS:', error);
      this.notificationService.showError('Errore durante il cambio stato GPS');
    }
  }

  async requestGPS() {
    try {
      await this.mapService.initGeolocation();
      const status = this.mapService.getGPSStatus();
      this.uiManager.updateGPSStatus(status);
    } catch (error) {
      console.error('Error requesting GPS:', error);
    }
  }

  clearAllData() {
    try {
      this.dataService.clearAllData();
      this.mapService.clearAllPoopMarkers();
      this.chartService.destroyAllCharts();
      this.updateAllUI();

      this.notificationService.showSuccess('🗑️ Tutti i dati sono stati cancellati!');

      // Reload page to reset everything
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error clearing data:', error);
      this.notificationService.showError('Errore durante la cancellazione dei dati');
    }
  }

  toggleDogMarker() {
    try {
      const currentVisibility = this.mapService.isDogMarkerVisible();
      const newVisibility = !currentVisibility;

      this.mapService.toggleDogMarkerVisibility(newVisibility);
      this.updateDogMarkerButton(newVisibility);

      // Save preference
      const mapSettings = this.mapService.getMapSettings();
      mapSettings.dogMarkerVisible = newVisibility;
      this.dataService.saveMapSettings(mapSettings);

      // Show feedback
      if (newVisibility) {
        this.notificationService.showInfo('🐕 Marker del cane visibile');
      } else {
        this.notificationService.showInfo('🐕 Marker del cane nascosto');
      }
    } catch (error) {
      console.error('Error toggling dog marker:', error);
      this.notificationService.showError('Errore durante il toggle del marker');
    }
  }

  updateDogMarkerButton(isVisible) {
    const btn = document.getElementById('toggleDogMarkerBtn');
    if (btn) {
      if (isVisible) {
        btn.classList.add('active');
        btn.title = 'Nascondi marker del cane';
      } else {
        btn.classList.remove('active');
        btn.title = 'Mostra marker del cane';
      }
    }
  }

  toggleQuadrants() {
    try {
      const currentVisibility = this.mapService.areQuadrantsVisible();
      const newVisibility = !currentVisibility;

      this.mapService.toggleQuadrantsOverlay(newVisibility);
      this.updateQuadrantsButton(newVisibility);

      // Save preference
      this.dataService.setQuadrantsGridVisible(newVisibility);

      // Show feedback
      if (newVisibility) {
        this.notificationService.showInfo('🗺️ Quadranti visibili');
      } else {
        this.notificationService.showInfo('🗺️ Quadranti nascosti');
      }
    } catch (error) {
      console.error('Error toggling quadrants:', error);
      this.notificationService.showError('Errore durante il toggle dei quadranti');
    }
  }

  updateQuadrantsButton(isVisible) {
    const btn = document.getElementById('toggleQuadrantsBtn');
    if (btn) {
      if (isVisible) {
        btn.classList.add('active');
        btn.title = 'Nascondi quadranti';
      } else {
        btn.classList.remove('active');
        btn.title = 'Mostra quadranti';
      }
    }
  }

  updateAchievementsUI() {
    try {
      // Get old completed count before update
      const oldCompletedCount = this.dataService.getCompletedQuadrantsCount();

      // Get current poops
      const poops = this.dataService.getAllPoops();

      // Calculate achievements (includes streak, health alert, all badges)
      const boneStats = this.boneCollectorService ? this.boneCollectorService.getStats() : null;
      const achievementsData = this.achievementsService.getAchievements(poops, null, boneStats);

      // Update UI
      this.uiManager.updateAchievements(achievementsData);

      // Update quadrants overlay if visible
      if (this.mapService.areQuadrantsVisible()) {
        this.mapService.updateQuadrantsOverlay(
          achievementsData.quadrants,
          (count) => this.achievementsService.getQuadrantColor(count)
        );
      }

      // Check for new achievements
      const newAchievement = this.achievementsService.checkNewAchievement(
        oldCompletedCount,
        achievementsData.completedQuadrants
      );

      if (newAchievement) {
        // Show notification
        setTimeout(() => {
          this.uiManager.showAchievementUnlocked(newAchievement);
        }, 1000);
      }

      // Send browser notification for health alert (only once per session)
      if (achievementsData.healthAlert && !this._healthAlertSent) {
        this._healthAlertSent = true;
        const dogProfile = this.dataService.getDogProfile();
        const dogName = dogProfile.name || 'Il tuo cane';
        this.notificationService.showBrowserNotification(
          '⚠️ Attenzione Salute',
          { body: `${dogName}: ${achievementsData.healthAlert.percent}% deiezioni anomale negli ultimi 3 giorni.` }
        );
      }

      // Save completed count
      this.dataService.updateCompletedQuadrants(achievementsData.completedQuadrants);
    } catch (error) {
      console.error('Error updating achievements:', error);
    }
  }

  // ========== UI UPDATES ==========

  updateAllUI() {
    // Update counters
    const poops = this.dataService.getAllPoops();
    this.uiManager.updatePoopCounter(poops.length);

    // Update statistics
    const stats = this.dataService.getStatistics();
    this.uiManager.updateStats(stats);

    // Update food suggestions and filters
    const foodHistory = this.dataService.getFoodHistory();
    this.uiManager.updateFoodSuggestions(foodHistory);
    this.uiManager.updateFoodFilter(foodHistory);

    // Update saved notes
    const savedNotes = this.dataService.getSavedNotes();
    this.uiManager.updateSavedNotesDropdown(savedNotes);

    // Update recent poops list
    this.uiManager.updateRecentPoopsList(poops);

    // Update charts
    this.updateCharts(poops);

    // Update dog name
    const dogProfile = this.dataService.getDogProfile();
    this.uiManager.updateDogName(dogProfile.name);

    // Update dog profile form
    this.uiManager.populateDogProfileForm(dogProfile);

    // Update reminders
    this.updateReminders();

    // Update GPS status
    const gpsStatus = this.mapService.getGPSStatus();
    this.uiManager.updateGPSStatus(gpsStatus);

    // Update achievements
    this.updateAchievementsUI();

    // Save map settings
    const mapSettings = this.mapService.getMapSettings();
    this.dataService.saveMapSettings(mapSettings);
  }

  updateReminders() {
    const dogProfile = this.dataService.getDogProfile();
    this.uiManager.updateReminders(dogProfile);

    // Update icon urgency status
    const hasUrgent = this.dataService.hasOverdueReminders();
    this.uiManager.updateReminderIconUrgency(hasUrgent);
  }

  checkUrgentReminders() {
    // Get urgent reminders from data service
    const urgentReminders = this.dataService.getUrgentReminders();

    if (urgentReminders.length > 0) {
      // Show modal after a short delay to let the UI finish loading
      setTimeout(() => {
        this.uiManager.showUrgentReminders(urgentReminders);
      }, 1500);

      // Send browser notifications for overdue reminders
      const dogProfile = this.dataService.getDogProfile();
      const dogName = dogProfile.name || 'il tuo cane';
      urgentReminders.forEach(reminder => {
        if (reminder.isOverdue) {
          this.notificationService.showBrowserNotification(
            `${reminder.title} scaduto!`,
            { body: `${dogName}: scaduto da ${Math.abs(reminder.daysLeft)} giorni. Prenota una visita!` }
          );
        } else if (reminder.daysLeft <= 3) {
          this.notificationService.showBrowserNotification(
            `${reminder.title} in scadenza`,
            { body: `${dogName}: scade tra ${reminder.daysLeft} giorni.` }
          );
        }
      });
    }
  }

  // ========== CLEANUP ==========

  destroy() {
    this.mapService.destroy();
    this.chartService.destroyAllCharts();
    this.boneCollectorService.destroy();
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new PoopTracker();
  app.init();

  // Store app instance globally for debugging
  window.poopTrackerApp = app;
});

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
