/**
 * Poo-Poo Dog Tracker - Achievements Service
 * Copyright (c) 2024-2025 Giampietro Leonoro & Monica Amato. All Rights Reserved.
 */

export class AchievementsService {
  constructor() {
    // Grid configuration: 1000m x 1000m quadrants
    this.GRID_SIZE_METERS = 1000;
    this.COMPLETION_THRESHOLD = 20; // poops needed to complete a quadrant

    // Points system
    this.POINTS_PER_QUADRANT = 100;

    // Badges configuration - Quadrant-based
    this.BADGES = {
      explorer: { threshold: 5, name: 'Esploratore Urbano', icon: '🗺️', points: 500 },
      adventurer: { threshold: 10, name: 'Avventuriero', icon: '🎒', points: 1000 },
      conqueror: { threshold: 20, name: 'Conquistatore della Città', icon: '👑', points: 2000 },
      nomad: { threshold: 50, name: 'Nomade delle Cacche', icon: '🌍', points: 5000 }
    };

    // Activity badges - based on total registrations
    this.ACTIVITY_BADGES = {
      first: { threshold: 1, name: 'Prima Cacca!', icon: '🎉', points: 50 },
      collector10: { threshold: 10, name: 'Collezionista', icon: '📦', points: 200 },
      collector50: { threshold: 50, name: 'Analista Esperto', icon: '🔬', points: 500 },
      veteran200: { threshold: 200, name: 'Veterano', icon: '🎖️', points: 1500 },
      legend500: { threshold: 500, name: 'Leggenda', icon: '⭐', points: 3000 }
    };

    // Streak badges - based on consecutive days
    this.STREAK_BADGES = {
      streak3: { threshold: 3, name: '3 Giorni di Fila!', icon: '🔥', points: 100 },
      streak7: { threshold: 7, name: 'Una Settimana!', icon: '💪', points: 300 },
      streak14: { threshold: 14, name: 'Due Settimane!', icon: '🏅', points: 600 },
      streak30: { threshold: 30, name: 'Un Mese Intero!', icon: '🏆', points: 1500 }
    };

    // Health badges - based on healthy poop tracking
    this.HEALTH_BADGES = {
      healthy10: { threshold: 10, name: '10 Sane Consecutive', icon: '💚', points: 200 },
      healthExpert: { threshold: 50, name: 'Esperto di Salute', icon: '🩺', points: 800 }
    };
  }

  /**
   * Calculate grid cell ID from coordinates
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {string} Grid cell ID (e.g., "41_12")
   */
  getGridCell(lat, lng) {
    // Convert meters to degrees (approximate)
    // At equator: 1 degree latitude ≈ 111,320 meters
    // 1000m ≈ 0.009 degrees
    const gridSizeDegrees = this.GRID_SIZE_METERS / 111320;

    // Calculate grid cell indices
    const cellLat = Math.floor(lat / gridSizeDegrees);
    const cellLng = Math.floor(lng / gridSizeDegrees);

    return `${cellLat}_${cellLng}`;
  }

  /**
   * Get grid cell bounds
   * @param {string} cellId - Grid cell ID
   * @returns {Object} Bounds with north, south, east, west
   */
  getGridCellBounds(cellId) {
    const [cellLat, cellLng] = cellId.split('_').map(Number);
    const gridSizeDegrees = this.GRID_SIZE_METERS / 111320;

    return {
      south: cellLat * gridSizeDegrees,
      north: (cellLat + 1) * gridSizeDegrees,
      west: cellLng * gridSizeDegrees,
      east: (cellLng + 1) * gridSizeDegrees
    };
  }

  /**
   * Get grid cell center coordinates
   * @param {string} cellId - Grid cell ID
   * @returns {Object} Center coordinates {lat, lng}
   */
  getGridCellCenter(cellId) {
    const bounds = this.getGridCellBounds(cellId);
    return {
      lat: (bounds.north + bounds.south) / 2,
      lng: (bounds.east + bounds.west) / 2
    };
  }

  /**
   * Calculate quadrants from poops array
   * @param {Array} poops - Array of poop objects
   * @returns {Object} Quadrants data { cellId: { count, poops: [] } }
   */
  calculateQuadrants(poops) {
    const quadrants = {};

    poops.forEach(poop => {
      // Skip manual poops without GPS
      if (!poop.lat || !poop.lng) return;

      const cellId = this.getGridCell(poop.lat, poop.lng);

      if (!quadrants[cellId]) {
        quadrants[cellId] = {
          cellId,
          count: 0,
          poops: [],
          completed: false
        };
      }

      quadrants[cellId].count++;
      quadrants[cellId].poops.push(poop);

      // Check if quadrant is completed
      if (quadrants[cellId].count >= this.COMPLETION_THRESHOLD) {
        quadrants[cellId].completed = true;
      }
    });

    return quadrants;
  }

  /**
   * Calculate total points from quadrants
   * @param {Object} quadrants - Quadrants data
   * @returns {number} Total points
   */
  calculatePoints(quadrants) {
    let totalPoints = 0;

    Object.values(quadrants).forEach(quadrant => {
      if (quadrant.completed) {
        totalPoints += this.POINTS_PER_QUADRANT;
      }
    });

    return totalPoints;
  }

  /**
   * Get unlocked badges based on completed quadrants
   * @param {number} completedCount - Number of completed quadrants
   * @returns {Array} Array of unlocked badges
   */
  getUnlockedBadges(completedCount) {
    const unlocked = [];

    Object.entries(this.BADGES).forEach(([key, badge]) => {
      if (completedCount >= badge.threshold) {
        unlocked.push({
          key,
          ...badge,
          unlocked: true
        });
      }
    });

    return unlocked;
  }

  /**
   * Get next badge to unlock
   * @param {number} completedCount - Number of completed quadrants
   * @returns {Object|null} Next badge or null if all unlocked
   */
  getNextBadge(completedCount) {
    const badges = Object.entries(this.BADGES)
      .map(([key, badge]) => ({ key, ...badge }))
      .sort((a, b) => a.threshold - b.threshold);

    for (const badge of badges) {
      if (completedCount < badge.threshold) {
        return {
          ...badge,
          progress: completedCount,
          remaining: badge.threshold - completedCount
        };
      }
    }

    return null; // All badges unlocked!
  }

  /**
   * Get unlocked activity badges based on total poop count
   */
  getUnlockedActivityBadges(totalPoops) {
    const unlocked = [];
    Object.entries(this.ACTIVITY_BADGES).forEach(([key, badge]) => {
      if (totalPoops >= badge.threshold) {
        unlocked.push({ key, ...badge, category: 'activity', unlocked: true });
      }
    });
    return unlocked;
  }

  /**
   * Get unlocked streak badges based on current streak
   */
  getUnlockedStreakBadges(currentStreak) {
    const unlocked = [];
    Object.entries(this.STREAK_BADGES).forEach(([key, badge]) => {
      if (currentStreak >= badge.threshold) {
        unlocked.push({ key, ...badge, category: 'streak', unlocked: true });
      }
    });
    return unlocked;
  }

  /**
   * Get unlocked health badges
   */
  getUnlockedHealthBadges(poops) {
    const unlocked = [];
    const healthyCount = poops.filter(p => p.type === 'healthy').length;

    // Check consecutive healthy poops
    let maxConsecutiveHealthy = 0;
    let currentConsecutive = 0;
    const sorted = [...poops].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    for (const poop of sorted) {
      if (poop.type === 'healthy') {
        currentConsecutive++;
        maxConsecutiveHealthy = Math.max(maxConsecutiveHealthy, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }

    if (maxConsecutiveHealthy >= this.HEALTH_BADGES.healthy10.threshold) {
      unlocked.push({ key: 'healthy10', ...this.HEALTH_BADGES.healthy10, category: 'health', unlocked: true });
    }
    if (healthyCount >= this.HEALTH_BADGES.healthExpert.threshold) {
      unlocked.push({ key: 'healthExpert', ...this.HEALTH_BADGES.healthExpert, category: 'health', unlocked: true });
    }

    return unlocked;
  }

  /**
   * Calculate streak from poops array
   */
  calculateStreak(poops) {
    if (poops.length === 0) return { current: 0, best: 0 };

    // Get unique dates with at least one poop
    const dates = new Set();
    poops.forEach(p => {
      if (p.timestamp) {
        dates.add(new Date(p.timestamp).toDateString());
      }
    });

    const today = new Date();
    const todayStr = today.toDateString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    // Current streak: count backwards from today (or yesterday if no poop today yet)
    let current = 0;
    let checkDate = dates.has(todayStr) ? new Date(today) : (dates.has(yesterdayStr) ? new Date(yesterday) : null);

    if (checkDate) {
      while (dates.has(checkDate.toDateString())) {
        current++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    // Best streak: scan all sorted dates
    const sortedDates = Array.from(dates).map(d => new Date(d)).sort((a, b) => a - b);
    let best = 0;
    let tempStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = Math.round((sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        tempStreak++;
        best = Math.max(best, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
    best = Math.max(best, tempStreak, current);

    return { current, best };
  }

  /**
   * Check health alert: returns alert if >50% abnormal in last 3 days
   */
  checkHealthAlert(poops) {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const recentPoops = poops.filter(p => new Date(p.timestamp) >= threeDaysAgo);
    if (recentPoops.length < 2) return null;

    const abnormal = recentPoops.filter(p => ['soft', 'diarrhea', 'hard', 'blood', 'mucus'].includes(p.type));
    const abnormalPercent = Math.round((abnormal.length / recentPoops.length) * 100);

    if (abnormalPercent > 50) {
      const hasBloodOrMucus = abnormal.some(p => p.type === 'blood' || p.type === 'mucus');
      return {
        percent: abnormalPercent,
        total: recentPoops.length,
        abnormalCount: abnormal.length,
        severe: hasBloodOrMucus
      };
    }

    return null;
  }

  /**
   * Get full achievements statistics
   * @param {Array} poops - Array of poop objects
   * @param {Object} streakData - Streak data { current, best }
   * @returns {Object} Complete achievements data
   */
  getAchievements(poops, streakData = null) {
    const quadrants = this.calculateQuadrants(poops);
    const completedQuadrants = Object.values(quadrants).filter(q => q.completed);
    const completedCount = completedQuadrants.length;
    const totalPoints = this.calculatePoints(quadrants);
    const unlockedBadges = this.getUnlockedBadges(completedCount);
    const nextBadge = this.getNextBadge(completedCount);

    // Calculate streak if not provided
    const streak = streakData || this.calculateStreak(poops);

    // Get all badge types
    const activityBadges = this.getUnlockedActivityBadges(poops.length);
    const streakBadges = this.getUnlockedStreakBadges(streak.current);
    const healthBadges = this.getUnlockedHealthBadges(poops);
    const allBadges = [...unlockedBadges, ...activityBadges, ...streakBadges, ...healthBadges];

    // Calculate total bonus points from all badges
    const badgePoints = allBadges.reduce((sum, b) => sum + (b.points || 0), 0);

    // Get top quadrants by count
    const topQuadrants = Object.values(quadrants)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(q => ({
        cellId: q.cellId,
        count: q.count,
        completed: q.completed,
        center: this.getGridCellCenter(q.cellId),
        progress: Math.min(100, (q.count / this.COMPLETION_THRESHOLD) * 100)
      }));

    // Health alert
    const healthAlert = this.checkHealthAlert(poops);

    return {
      totalPoints: totalPoints + badgePoints,
      totalQuadrants: Object.keys(quadrants).length,
      completedQuadrants: completedCount,
      completionRate: Object.keys(quadrants).length > 0
        ? Math.round((completedCount / Object.keys(quadrants).length) * 100)
        : 0,
      unlockedBadges: allBadges,
      nextBadge,
      topQuadrants,
      quadrants,
      streak,
      healthAlert
    };
  }

  /**
   * Get color for quadrant based on poop count
   * @param {number} count - Number of poops in quadrant
   * @returns {string} CSS color
   */
  getQuadrantColor(count) {
    if (count >= this.COMPLETION_THRESHOLD) {
      return 'rgba(76, 175, 80, 0.5)'; // Green - Completed
    } else if (count >= 16) {
      return 'rgba(255, 152, 0, 0.5)'; // Orange - Almost there
    } else if (count >= 6) {
      return 'rgba(255, 235, 59, 0.5)'; // Yellow - In progress
    } else {
      return 'rgba(158, 158, 158, 0.3)'; // Gray - Started
    }
  }

  /**
   * Check if new achievement was unlocked
   * @param {number} oldCompletedCount - Previous completed count
   * @param {number} newCompletedCount - New completed count
   * @returns {Object|null} Newly unlocked badge or null
   */
  checkNewAchievement(oldCompletedCount, newCompletedCount) {
    if (newCompletedCount <= oldCompletedCount) return null;

    // Check if we crossed a badge threshold
    for (const [key, badge] of Object.entries(this.BADGES)) {
      if (oldCompletedCount < badge.threshold && newCompletedCount >= badge.threshold) {
        return {
          key,
          ...badge,
          justUnlocked: true
        };
      }
    }

    // Check if we just completed a new quadrant
    if (newCompletedCount > oldCompletedCount) {
      return {
        type: 'quadrant',
        name: 'Zona Completata!',
        icon: '🎯',
        points: this.POINTS_PER_QUADRANT
      };
    }

    return null;
  }
}
