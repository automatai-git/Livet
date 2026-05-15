import { supabase } from './supabase';

// All trip-aware Supabase calls. Pages should go through this module
// rather than touching supabase.from('trips' / 'travel_plans') directly.

export const travelService = {
  async listTrips() {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .neq('status', 'archived')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('[travelService] listTrips failed:', error.message);
      return [];
    }
    return data || [];
  },

  async listArchivedTrips() {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('status', 'archived')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  },

  async getTrip(tripId) {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .maybeSingle();
    if (error) {
      console.warn('[travelService] getTrip failed:', error.message);
      return null;
    }
    return data;
  },

  async createTrip({ destinationKey, name, startDate = null, endDate = null }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('not authenticated');

    const { data, error } = await supabase
      .from('trips')
      .insert({
        user_id: user.id,
        destination_key: destinationKey,
        name,
        start_date: startDate,
        end_date: endDate,
        status: 'planning',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateTrip(tripId, patch) {
    const { data, error } = await supabase
      .from('trips')
      .update(patch)
      .eq('id', tripId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async archiveTrip(tripId) {
    return this.updateTrip(tripId, { status: 'archived' });
  },

  async deleteTrip(tripId) {
    const { error } = await supabase.from('trips').delete().eq('id', tripId);
    if (error) throw error;
  },

  // travel_plans — scoped to a trip.
  async listPlans(tripId) {
    const { data, error } = await supabase
      .from('travel_plans')
      .select('*')
      .eq('trip_id', tripId);
    if (error) {
      console.warn('[travelService] listPlans failed:', error.message);
      return [];
    }
    return data || [];
  },

  async addPlan({ tripId, experienceId, destinationKey, status = 'planned' }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('not authenticated');

    const { data, error } = await supabase
      .from('travel_plans')
      .insert({
        user_id: user.id,
        trip_id: tripId,
        destination_id: destinationKey,
        experience_id: experienceId,
        status,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removePlan(planId) {
    const { error } = await supabase.from('travel_plans').delete().eq('id', planId);
    if (error) throw error;
  },

  async updatePlanStatus(planId, status) {
    const { error } = await supabase
      .from('travel_plans')
      .update({ status })
      .eq('id', planId);
    if (error) throw error;
  },
};
