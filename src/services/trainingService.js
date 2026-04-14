import { supabase } from './supabase';

export const trainingService = {
  /**
   * Fetches the training start date from Supabase
   * @returns {Promise<string|null>} The date string (YYYY-MM-DD) or null
   */
  getStartDate: async () => {
    try {
      const { data, error } = await supabase
        .from('relevant_dates')
        .select('date_value')
        .eq('date_label', 'training_start')
        .maybeSingle();
      
      if (error) throw error;
      return data?.date_value || null;
    } catch (err) {
      console.error('Error fetching start date:', err);
      return null;
    }
  },

  /**
   * Updates the training start date in Supabase
   * @param {string} dateStr The date string (YYYY-MM-DD)
   */
  setStartDate: async (dateStr) => {
    try {
      const { error } = await supabase
        .from('relevant_dates')
        .upsert({ date_label: 'training_start', date_value: dateStr }, { onConflict: 'date_label' });
      
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error setting start date:', err);
      return false;
    }
  },

  /**
   * Calculates the current program position (Week and Day) based on a start date
   * @param {string} startDateStr Start date in YYYY-MM-DD format
   * @returns {{week: number, dayName: string, dayIndex: number}} 
   */
  calculateProgramPosition: (startDateStr) => {
    if (!startDateStr) return null;

    const start = new Date(startDateStr);
    const today = new Date();
    
    // Check for invalid date
    if (isNaN(start.getTime())) return null;

    // Reset times to midnight for accurate day calculation
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffInMs = today.getTime() - start.getTime();
    if (diffInMs < 0) return null; // Future start date

    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    const week = Math.floor(diffInDays / 7) + 1;
    
    // Safety check for NaN
    if (isNaN(week)) return null;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentCalendarDayName = days[today.getDay()];

    return {
      week,
      dayName: currentCalendarDayName,
      daysElapsed: diffInDays
    };
  }
};
