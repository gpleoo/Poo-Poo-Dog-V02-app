/**
 * Poo-Poo Dog Tracker - UI Manager
 * Copyright (c) 2024-2025 Giampietro Leonoro & Monica Amato. All Rights Reserved.
 */

import { formatDate, formatDateForInput, formatTimeForInput, readFileAsDataURL, getAgeString } from '../utils/helpers.js';
import { POOP_TYPES, POOP_SIZES, POOP_COLORS, POOP_SMELLS, FILTER_PERIODS, REMINDER_DAYS_BEFORE } from '../utils/constants.js';

export class UIManager {
  constructor() {
    this.modals = new Map();
    this.currentModal = null;

    // Callbacks
    this.onSavePoop = null;
    this.onSaveDogProfile = null;
    this.onSaveDogPhoto = null;
    this.onRemoveDogPhoto = null;
    this.onApplyFilters = null;
    this.onExportPDF = null;
    this.onExportBackup = null;
    this.onImportBackup = null;
    this.onClearAllData = null;
    this.onGPSToggle = null;
    this.onRequestGPS = null;
    this.onDeletePoop = null;
  }

  /**
   * Initialize UI elements
   */
  init() {
    this.setupModals();
    this.setupEventListeners();
    console.log('✅ UI Manager initialized');
  }

  /**
   * Setup modals
   */
  setupModals() {
    const modalIds = [
      'dogProfileModal',
      'dogPhotoModal',
      'poopDetailsModal',
      'filtersModal',
      'settingsModal',
      'remindersModal',
      'urgentRemindersModal',
      'achievementsModal'
    ];

    modalIds.forEach(id => {
      const modal = document.getElementById(id);
      if (modal) {
        this.modals.set(id, modal);

        // Close on background click
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            this.closeModal(id);
          }
        });
      }
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Dog Profile
    this.setupDogProfileListeners();

    // Dog Photo
    this.setupDogPhotoListeners();

    // Poop Details
    this.setupPoopDetailsListeners();

    // Filters
    this.setupFiltersListeners();

    // Settings
    this.setupSettingsListeners();

    // Reminders
    this.setupRemindersListeners();

    // Achievements
    this.setupAchievementsListeners();
  }

  // ========== MODAL MANAGEMENT ==========

  /**
   * Open modal
   */
  openModal(modalId) {
    const modal = this.modals.get(modalId);
    if (modal) {
      modal.style.display = 'flex';
      this.currentModal = modalId;

      // Add ARIA attributes
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * Close modal
   */
  closeModal(modalId) {
    const modal = this.modals.get(modalId);
    if (modal) {
      modal.style.display = 'none';
      this.currentModal = null;

      // Remove ARIA attributes
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  /**
   * Close current modal
   */
  closeCurrentModal() {
    if (this.currentModal) {
      this.closeModal(this.currentModal);
    }
  }

  // ========== DOG PROFILE ==========

  setupDogProfileListeners() {
    const btn = document.getElementById('dogProfileBtn');
    const form = document.getElementById('dogProfileForm');
    const cancelBtn = document.getElementById('cancelDogProfile');

    if (btn) {
      btn.addEventListener('click', () => this.openModal('dogProfileModal'));
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = this.getDogProfileFormData();
        if (this.onSaveDogProfile) {
          this.onSaveDogProfile(data);
        }
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeModal('dogProfileModal'));
    }
  }

  /**
   * Get dog profile form data
   */
  getDogProfileFormData() {
    return {
      name: document.getElementById('dogName')?.value || '',
      dogBirthdate: document.getElementById('dogBirthdate')?.value || '',
      dogWeight: document.getElementById('dogWeight')?.value || '',
      dogBreed: document.getElementById('dogBreed')?.value || '',
      dogGender: document.getElementById('dogGender')?.value || '',
      dogColor: document.getElementById('dogColor')?.value || '',
      dogMicrochip: document.getElementById('dogMicrochip')?.value || '',
      dogChronicDiseases: document.getElementById('dogChronicDiseases')?.value || '',
      dogFoodAllergies: document.getElementById('dogFoodAllergies')?.value || '',
      dogMedicineAllergies: document.getElementById('dogMedicineAllergies')?.value || '',
      dogCurrentMedicine: document.getElementById('dogCurrentMedicine')?.value || '',
      dogSurgeries: document.getElementById('dogSurgeries')?.value || '',
      vetName: document.getElementById('vetName')?.value || '',
      vetPhone: document.getElementById('vetPhone')?.value || '',
      vetEmail: document.getElementById('vetEmail')?.value || '',
      vetAddress: document.getElementById('vetAddress')?.value || '',
      lastVaccination: document.getElementById('lastVaccination')?.value || '',
      nextVaccination: document.getElementById('nextVaccination')?.value || '',
      lastAntiparasitic: document.getElementById('lastAntiparasitic')?.value || '',
      nextAntiparasitic: document.getElementById('nextAntiparasitic')?.value || '',
      lastFleaTick: document.getElementById('lastFleaTick')?.value || '',
      nextFleaTick: document.getElementById('nextFleaTick')?.value || '',
      vaccinationNotes: document.getElementById('vaccinationNotes')?.value || '',
      dogGeneralNotes: document.getElementById('dogGeneralNotes')?.value || ''
    };
  }

  /**
   * Populate dog profile form
   */
  populateDogProfileForm(profile) {
    if (!profile) return;

    Object.entries(profile).forEach(([key, value]) => {
      const element = document.getElementById(key);
      if (element) {
        element.value = value || '';
      }
    });
  }

  // ========== DOG PHOTO ==========

  setupDogPhotoListeners() {
    const preview = document.getElementById('dogPhotoPreview');
    const input = document.getElementById('dogPhotoInput');
    const saveBtn = document.getElementById('saveDogPhoto');
    const removeBtn = document.getElementById('removeDogPhoto');

    if (preview && input) {
      preview.addEventListener('click', () => input.click());

      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const dataUrl = await readFileAsDataURL(file);
            this.updateDogPhotoPreview(dataUrl);
          } catch (error) {
            console.error('Error reading photo:', error);
          }
        }
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const preview = document.getElementById('dogPhotoPreview');
        const img = preview?.querySelector('img');
        if (img && this.onSaveDogPhoto) {
          this.onSaveDogPhoto(img.src);
        }
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        if (this.onRemoveDogPhoto) {
          this.onRemoveDogPhoto();
        }
      });
    }
  }

  /**
   * Update dog photo preview
   */
  updateDogPhotoPreview(photoDataUrl) {
    const preview = document.getElementById('dogPhotoPreview');
    if (preview) {
      if (photoDataUrl) {
        preview.innerHTML = `<img src="${photoDataUrl}" alt="Dog photo" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
      } else {
        preview.innerHTML = '<span class="placeholder-text">Clicca per aggiungere foto 🐕</span>';
      }
    }
  }

  // ========== POOP DETAILS ==========

  setupPoopDetailsListeners() {
    const form = document.getElementById('poopDetailsForm');
    const cancelBtn = document.getElementById('cancelPoopDetails');
    const savedNotesSelect = document.getElementById('savedNotes');
    const notesTextarea = document.getElementById('poopNotes');

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = this.getPoopDetailsFormData();
        if (this.onSavePoop) {
          this.onSavePoop(data);
        }
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeModal('poopDetailsModal'));
    }

    // Saved notes selector
    if (savedNotesSelect && notesTextarea) {
      savedNotesSelect.addEventListener('change', (e) => {
        if (e.target.value) {
          notesTextarea.value = e.target.value;
        }
      });
    }
  }

  /**
   * Get poop details form data
   */
  getPoopDetailsFormData() {
    const data = {
      type: document.getElementById('poopType')?.value || 'healthy',
      size: document.getElementById('poopSize')?.value || 'medium',
      color: document.getElementById('poopColor')?.value || 'normal',
      smell: document.getElementById('poopSmell')?.value || 'normal',
      food: document.getElementById('poopFood')?.value || '',
      hoursSinceMeal: document.getElementById('poopHoursSinceMeal')?.value || '',
      notes: document.getElementById('poopNotes')?.value || '',
      saveNote: document.getElementById('saveNote')?.checked || false
    };

    // Check if manual entry (date/time fields visible)
    const manualSection = document.getElementById('manualDateTimeSection');
    if (manualSection && manualSection.style.display !== 'none') {
      const date = document.getElementById('poopDate')?.value;
      const time = document.getElementById('poopTime')?.value;
      if (date && time) {
        data.timestamp = new Date(`${date}T${time}`).toISOString();
      }
    }

    return data;
  }

  /**
   * Open poop details modal
   */
  openPoopDetailsModal(isManual = false) {
    // Reset form
    document.getElementById('poopDetailsForm')?.reset();

    // Show/hide manual date/time section
    const manualSection = document.getElementById('manualDateTimeSection');
    if (manualSection) {
      manualSection.style.display = isManual ? 'block' : 'none';

      if (isManual) {
        // Set default date/time to now
        const now = new Date();
        const dateInput = document.getElementById('poopDate');
        const timeInput = document.getElementById('poopTime');
        if (dateInput) dateInput.value = formatDateForInput(now);
        if (timeInput) timeInput.value = formatTimeForInput(now);
      }
    }

    this.openModal('poopDetailsModal');
  }

  /**
   * Update saved notes dropdown
   */
  updateSavedNotesDropdown(savedNotes) {
    const select = document.getElementById('savedNotes');
    if (!select) return;

    // Clear existing options (except first)
    while (select.options.length > 1) {
      select.remove(1);
    }

    // Add saved notes
    savedNotes.forEach(note => {
      const option = document.createElement('option');
      option.value = note;
      option.textContent = note.length > 50 ? note.substring(0, 50) + '...' : note;
      select.appendChild(option);
    });
  }

  /**
   * Update food suggestions datalist
   */
  updateFoodSuggestions(foodHistory) {
    const datalist = document.getElementById('foodSuggestions');
    if (!datalist) return;

    datalist.innerHTML = '';
    foodHistory.forEach(food => {
      const option = document.createElement('option');
      option.value = food;
      datalist.appendChild(option);
    });
  }

  // ========== FILTERS & STATS ==========

  setupFiltersListeners() {
    const openBtn = document.getElementById('filterBtn');
    const applyBtn = document.getElementById('applyFilters');
    const resetBtn = document.getElementById('resetFilters');
    const exportBtn = document.getElementById('exportPdfBtn');
    const closeBtn = document.getElementById('closeFilters');

    if (openBtn) {
      openBtn.addEventListener('click', () => this.openModal('filtersModal'));
    }

    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const filters = this.getFilters();
        if (this.onApplyFilters) {
          this.onApplyFilters(filters);
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetFilters();
        if (this.onApplyFilters) {
          this.onApplyFilters({ period: 'all', type: 'all', food: 'all' });
        }
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        if (this.onExportPDF) {
          this.onExportPDF();
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal('filtersModal'));
    }
  }

  /**
   * Get current filters
   */
  getFilters() {
    return {
      period: document.getElementById('filterPeriod')?.value || 'all',
      type: document.getElementById('filterType')?.value || 'all',
      food: document.getElementById('filterFood')?.value || 'all'
    };
  }

  /**
   * Reset filters
   */
  resetFilters() {
    const periodSelect = document.getElementById('filterPeriod');
    const typeSelect = document.getElementById('filterType');
    const foodSelect = document.getElementById('filterFood');

    if (periodSelect) periodSelect.value = 'all';
    if (typeSelect) typeSelect.value = 'all';
    if (foodSelect) foodSelect.value = 'all';
  }

  /**
   * Update statistics display
   */
  updateStats(stats) {
    const totalElem = document.getElementById('totalPoops');
    const healthyElem = document.getElementById('healthyPoops');
    const problemsElem = document.getElementById('problemPoops');

    if (totalElem) totalElem.textContent = stats.total || 0;
    if (healthyElem) healthyElem.textContent = stats.healthy || 0;
    if (problemsElem) problemsElem.textContent = stats.problems || 0;
  }

  /**
   * Update recent poops list
   */
  updateRecentPoopsList(poops) {
    const list = document.getElementById('recentPoopsList');
    if (!list) return;

    if (poops.length === 0) {
      list.innerHTML = '<p style="text-align: center; color: #999;">Nessuna cacca registrata</p>';
      return;
    }

    // Show last 10 poops
    const recentPoops = poops.slice(-10).reverse();

    list.innerHTML = recentPoops.map(poop => {
      const date = formatDate(new Date(poop.timestamp), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const typeLabel = POOP_TYPES[poop.type]?.label || poop.type;

      return `
        <div class="recent-poop-item" data-poop-id="${poop.id}">
          <div class="recent-poop-date">${date}</div>
          <div class="recent-poop-type">${typeLabel}</div>
          ${poop.food ? `<div class="recent-poop-food">🍖 ${poop.food}</div>` : ''}
          <button class="btn-delete-poop" onclick="window.deletePoop('${poop.id}')" title="Elimina">🗑️</button>
        </div>
      `;
    }).join('');
  }

  /**
   * Update food filter options
   */
  updateFoodFilter(foodHistory) {
    const select = document.getElementById('filterFood');
    if (!select) return;

    // Clear existing options (except first)
    while (select.options.length > 1) {
      select.remove(1);
    }

    // Add food options
    foodHistory.forEach(food => {
      const option = document.createElement('option');
      option.value = food;
      option.textContent = food;
      select.appendChild(option);
    });
  }

  // ========== SETTINGS ==========

  setupSettingsListeners() {
    const openBtn = document.getElementById('settingsBtn');
    const closeBtn = document.getElementById('closeSettings');
    const gpsToggle = document.getElementById('gpsToggle');
    const requestGPSBtn = document.getElementById('requestGPSBtn');
    const exportBackupBtn = document.getElementById('exportBackupBtn');
    const importBackupBtn = document.getElementById('importBackupBtn');
    const importBackupInput = document.getElementById('importBackupInput');
    const clearAllDataBtn = document.getElementById('clearAllDataBtn');

    if (openBtn) {
      openBtn.addEventListener('click', () => this.openModal('settingsModal'));
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal('settingsModal'));
    }

    if (gpsToggle) {
      gpsToggle.addEventListener('change', (e) => {
        if (this.onGPSToggle) {
          this.onGPSToggle(e.target.checked);
        }
      });
    }

    if (requestGPSBtn) {
      requestGPSBtn.addEventListener('click', () => {
        if (this.onRequestGPS) {
          this.onRequestGPS();
        }
      });
    }

    if (exportBackupBtn) {
      exportBackupBtn.addEventListener('click', () => {
        if (this.onExportBackup) {
          this.onExportBackup();
        }
      });
    }

    if (importBackupBtn && importBackupInput) {
      importBackupBtn.addEventListener('click', () => importBackupInput.click());

      importBackupInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file && this.onImportBackup) {
          try {
            const text = await file.text();
            this.onImportBackup(text);
          } catch (error) {
            console.error('Error reading backup file:', error);
          }
        }
        e.target.value = ''; // Reset input
      });
    }

    if (clearAllDataBtn) {
      clearAllDataBtn.addEventListener('click', () => {
        if (confirm('⚠️ Sei sicuro di voler cancellare TUTTI i dati? Questa azione non è reversibile!')) {
          if (this.onClearAllData) {
            this.onClearAllData();
          }
        }
      });
    }
  }

  /**
   * Update GPS status display
   */
  updateGPSStatus(status) {
    const iconElem = document.getElementById('gpsStatusIcon');
    const textElem = document.getElementById('gpsStatusText');
    const toggle = document.getElementById('gpsToggle');
    const requestBtn = document.getElementById('requestGPSBtn');
    const instructions = document.getElementById('gpsInstructions');

    if (toggle) {
      toggle.checked = status.enabled;
    }

    let icon = '📍';
    let text = 'Stato GPS: ';
    let showRequestBtn = false;
    let showInstructions = false;

    switch (status.permission) {
      case 'granted':
        icon = '✅';
        text += 'Attivo';
        break;
      case 'denied':
        icon = '❌';
        text += 'Negato';
        showInstructions = true;
        break;
      case 'timeout':
        icon = '⏱️';
        text += 'Timeout';
        showRequestBtn = true;
        break;
      case 'unavailable':
        icon = '⚠️';
        text += 'Non disponibile';
        break;
      case 'unsupported':
        icon = '🚫';
        text += 'Non supportato';
        break;
      default:
        icon = '📍';
        text += 'In attesa...';
        showRequestBtn = true;
    }

    if (iconElem) iconElem.textContent = icon;
    if (textElem) textElem.textContent = text;
    if (requestBtn) requestBtn.style.display = showRequestBtn ? 'block' : 'none';
    if (instructions) instructions.style.display = showInstructions ? 'block' : 'none';
  }

  // ========== REMINDERS ==========

  setupRemindersListeners() {
    const openBtn = document.getElementById('remindersBtn');
    const closeBtn = document.getElementById('closeReminders');
    const openProfileBtn = document.getElementById('openProfileFromReminders');

    if (openBtn) {
      openBtn.addEventListener('click', () => this.openModal('remindersModal'));
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal('remindersModal'));
    }

    if (openProfileBtn) {
      openProfileBtn.addEventListener('click', () => {
        this.closeModal('remindersModal');
        this.openModal('dogProfileModal');
      });
    }

    // Urgent reminders modal listeners
    const closeUrgentBtn = document.getElementById('closeUrgentReminders');
    const goToProfileBtn = document.getElementById('goToProfileFromUrgent');

    if (closeUrgentBtn) {
      closeUrgentBtn.addEventListener('click', () => this.closeModal('urgentRemindersModal'));
    }

    if (goToProfileBtn) {
      goToProfileBtn.addEventListener('click', () => {
        this.closeModal('urgentRemindersModal');
        this.openModal('dogProfileModal');
      });
    }
  }

  /**
   * Update reminders
   */
  updateReminders(dogProfile) {
    const list = document.getElementById('remindersList');
    const badge = document.getElementById('remindersBadge');

    if (!list) return;

    const reminders = this.calculateReminders(dogProfile);
    const upcomingCount = reminders.filter(r => r.daysLeft <= REMINDER_DAYS_BEFORE && r.daysLeft >= 0).length;

    // Update badge
    if (badge) {
      if (upcomingCount > 0) {
        badge.textContent = upcomingCount;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }

    // Update list
    if (reminders.length === 0) {
      list.innerHTML = '<p style="text-align: center; color: #999;">Nessun promemoria configurato</p>';
      return;
    }

    list.innerHTML = reminders.map(reminder => {
      let statusClass = 'reminder-ok';
      let statusIcon = '✅';

      if (reminder.daysLeft < 0) {
        statusClass = 'reminder-overdue';
        statusIcon = '🔴';
      } else if (reminder.daysLeft <= REMINDER_DAYS_BEFORE) {
        statusClass = 'reminder-warning';
        statusIcon = '⚠️';
      }

      const daysText = reminder.daysLeft < 0
        ? `Scaduto da ${Math.abs(reminder.daysLeft)} giorni`
        : reminder.daysLeft === 0
        ? 'Scade oggi!'
        : `Tra ${reminder.daysLeft} giorni`;

      return `
        <div class="reminder-item ${statusClass}">
          <div class="reminder-icon">${statusIcon}</div>
          <div class="reminder-content">
            <div class="reminder-title">${reminder.title}</div>
            <div class="reminder-date">${formatDate(new Date(reminder.date), { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div class="reminder-days">${daysText}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Calculate reminders from dog profile
   */
  calculateReminders(dogProfile) {
    const reminders = [];
    const now = new Date();

    if (dogProfile.nextVaccination) {
      const date = new Date(dogProfile.nextVaccination);
      const daysLeft = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
      reminders.push({
        title: '💉 Prossima Vaccinazione',
        date: dogProfile.nextVaccination,
        daysLeft
      });
    }

    if (dogProfile.nextAntiparasitic) {
      const date = new Date(dogProfile.nextAntiparasitic);
      const daysLeft = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
      reminders.push({
        title: '🐛 Prossimo Antiparassitario',
        date: dogProfile.nextAntiparasitic,
        daysLeft
      });
    }

    if (dogProfile.nextFleaTick) {
      const date = new Date(dogProfile.nextFleaTick);
      const daysLeft = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
      reminders.push({
        title: '🦟 Prossimo Antipulci/Zecche',
        date: dogProfile.nextFleaTick,
        daysLeft
      });
    }

    // Sort by days left
    return reminders.sort((a, b) => a.daysLeft - b.daysLeft);
  }

  /**
   * Show urgent reminders modal
   */
  showUrgentReminders(urgentReminders) {
    const list = document.getElementById('urgentRemindersList');
    if (!list) return;

    if (urgentReminders.length === 0) {
      return; // Don't show modal if no urgent reminders
    }

    // Populate the list
    list.innerHTML = urgentReminders.map(reminder => {
      const statusIcon = reminder.isOverdue ? '🔴' : '⚠️';
      const statusClass = reminder.isOverdue ? 'reminder-overdue' : 'reminder-warning';

      const daysText = reminder.isOverdue
        ? `<strong>Scaduto da ${Math.abs(reminder.daysLeft)} giorni!</strong>`
        : reminder.daysLeft === 0
        ? '<strong>Scade OGGI!</strong>'
        : `<strong>Scade tra ${reminder.daysLeft} giorni</strong>`;

      return `
        <div class="reminder-item ${statusClass}">
          <div class="reminder-icon">${statusIcon}</div>
          <div class="reminder-content">
            <div class="reminder-title">${reminder.title}</div>
            <div class="reminder-date">${formatDate(new Date(reminder.dueDate), { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div class="reminder-days">${daysText}</div>
          </div>
        </div>
      `;
    }).join('');

    // Open the modal
    this.openModal('urgentRemindersModal');
  }

  /**
   * Update reminder icon urgency status
   */
  updateReminderIconUrgency(hasUrgent) {
    const btn = document.getElementById('remindersBtn');
    if (btn) {
      if (hasUrgent) {
        btn.classList.add('urgent');
      } else {
        btn.classList.remove('urgent');
      }
    }
  }

  // ========== ACHIEVEMENTS ==========

  setupAchievementsListeners() {
    const openBtn = document.getElementById('achievementsBtn');
    const closeBtn = document.getElementById('closeAchievements');

    if (openBtn) {
      openBtn.addEventListener('click', () => this.openModal('achievementsModal'));
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal('achievementsModal'));
    }
  }

  /**
   * Update achievements display
   */
  updateAchievements(achievementsData) {
    if (!achievementsData) return;

    // Update summary stats
    document.getElementById('totalPoints').textContent = achievementsData.totalPoints || 0;
    document.getElementById('completedZones').textContent = achievementsData.completedQuadrants || 0;
    document.getElementById('totalZones').textContent = achievementsData.totalQuadrants || 0;

    // Update streak display
    if (achievementsData.streak) {
      const currentEl = document.getElementById('currentStreak');
      const bestEl = document.getElementById('bestStreak');
      if (currentEl) currentEl.textContent = achievementsData.streak.current || 0;
      if (bestEl) bestEl.textContent = achievementsData.streak.best || 0;
    }

    // Update health alert banner
    this.updateHealthAlert(achievementsData.healthAlert);

    // Update badge counter
    const badge = document.getElementById('achievementsBadge');
    if (badge) {
      const badgeCount = (achievementsData.unlockedBadges || []).length;
      if (badgeCount > 0) {
        badge.textContent = badgeCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }

    // Update badges list
    this.updateBadgesList(achievementsData.unlockedBadges || []);

    // Update next badge
    this.updateNextBadge(achievementsData.nextBadge);

    // Update top zones
    this.updateTopZones(achievementsData.topQuadrants || []);
  }

  /**
   * Update health alert banner
   */
  updateHealthAlert(healthAlert) {
    const banner = document.getElementById('healthAlertBanner');
    if (!banner) return;

    if (!healthAlert) {
      banner.style.display = 'none';
      return;
    }

    const severity = healthAlert.severe ? 'severe' : 'warning';
    const message = healthAlert.severe
      ? `🚨 Attenzione: ${healthAlert.percent}% delle deiezioni degli ultimi 3 giorni risulta anomalo, con presenza di sangue o muco. <strong>Consigliamo una visita veterinaria urgente.</strong>`
      : `⚠️ Attenzione: ${healthAlert.percent}% delle deiezioni degli ultimi 3 giorni (${healthAlert.abnormalCount}/${healthAlert.total}) risulta anomalo. Considera una visita dal veterinario.`;

    banner.className = `health-alert-banner ${severity}`;
    banner.innerHTML = message;
    banner.style.display = 'block';
  }

  /**
   * Update badges list with categories
   */
  updateBadgesList(badges) {
    const list = document.getElementById('badgesList');
    if (!list) return;

    if (badges.length === 0) {
      list.innerHTML = '<div class="badges-list empty">Nessun badge sbloccato ancora. Continua ad esplorare!</div>';
      return;
    }

    // Group by category
    const categories = {
      undefined: { label: '🗺️ Esplorazione', badges: [] },
      activity: { label: '📦 Attività', badges: [] },
      streak: { label: '🔥 Streak', badges: [] },
      health: { label: '💚 Salute', badges: [] },
      cookies: { label: '🍪 Biscottini', badges: [] },
      chicken: { label: '🍗 Cosce di Pollo', badges: [] },
      bones: { label: '🦴 Ossetti', badges: [] }
    };

    badges.forEach(badge => {
      const cat = badge.category || 'undefined';
      if (categories[cat]) categories[cat].badges.push(badge);
    });

    let html = '';
    for (const cat of Object.values(categories)) {
      if (cat.badges.length === 0) continue;
      html += `<div class="badge-category-label">${cat.label}</div>`;
      html += cat.badges.map(badge => `
        <div class="badge-item">
          <div class="badge-icon">${badge.icon}</div>
          <div class="badge-name">${badge.name}</div>
          <div class="badge-points">+${badge.points} punti</div>
        </div>
      `).join('');
    }

    list.innerHTML = html;
  }

  /**
   * Update next badge
   */
  updateNextBadge(nextBadge) {
    const container = document.getElementById('nextBadge');
    if (!container) return;

    if (!nextBadge) {
      container.innerHTML = '<div style="text-align: center; padding: 20px; color: white;">🎉 Hai sbloccato tutti i badge! Sei un campione!</div>';
      return;
    }

    const progressPercent = Math.round((nextBadge.progress / nextBadge.threshold) * 100);

    container.innerHTML = `
      <div class="next-badge-name">${nextBadge.icon} ${nextBadge.name}</div>
      <div class="next-badge-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progressPercent}%">
            ${progressPercent}%
          </div>
        </div>
        <div class="progress-text">
          ${nextBadge.progress}/${nextBadge.threshold} zone completate
          (ancora ${nextBadge.remaining} per sbloccare)
        </div>
      </div>
    `;
  }

  /**
   * Update top zones
   */
  updateTopZones(topZones) {
    const list = document.getElementById('topZones');
    if (!list) return;

    if (topZones.length === 0) {
      list.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">Nessuna zona esplorata ancora</div>';
      return;
    }

    list.innerHTML = topZones.map(zone => `
      <div class="zone-item ${zone.completed ? 'completed' : ''}">
        <div class="zone-info">
          <div class="zone-name">Zona ${zone.cellId}</div>
          <div class="zone-progress-bar">
            <div class="zone-progress-fill" style="width: ${zone.progress}%"></div>
          </div>
        </div>
        <div class="zone-count">${zone.count}/20</div>
      </div>
    `).join('');
  }

  /**
   * Show achievement unlocked notification
   */
  showAchievementUnlocked(achievement) {
    if (!achievement) return;

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'achievement-unlocked';
    notification.innerHTML = `
      <div class="achievement-unlocked-content">
        <div class="achievement-unlocked-icon">${achievement.icon || '🏆'}</div>
        <div class="achievement-unlocked-text">
          <div class="achievement-unlocked-title">${achievement.type === 'quadrant' ? 'Zona Completata!' : 'Nuovo Badge!'}</div>
          <div class="achievement-unlocked-name">${achievement.name}</div>
          ${achievement.points ? `<div class="achievement-unlocked-points">+${achievement.points} punti</div>` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('show'), 100);

    // Remove after 4 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 500);
    }, 4000);
  }

  // ========== GENERAL UI UPDATES ==========

  /**
   * Update poop counter
   */
  updatePoopCounter(count) {
    const counter = document.getElementById('poopCount');
    if (counter) {
      counter.textContent = count;
    }
  }

  /**
   * Update dog name in title
   */
  updateDogName(dogName) {
    const title = document.getElementById('appTitle');
    if (title && dogName) {
      title.textContent = `🐕 ${dogName}'s Poo-Poo Tracker 💩`;
    } else if (title) {
      title.textContent = '🐕 Poo-Poo Dog Tracker 💩';
    }
  }
}
