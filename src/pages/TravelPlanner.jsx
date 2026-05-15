import React from 'react';
import { Routes, Route } from 'react-router-dom';
import TripList from './travel/TripList';
import NewTripForm from './travel/NewTripForm';
import TripDetail from './travel/TripDetail';

// Routing shell. /travel is the trip list; /travel/new creates a new trip;
// /travel/:tripId is the per-trip detail view (the old single-page UI,
// scoped to one trip + its destination template).
const TravelPlanner = () => (
  <Routes>
    <Route index element={<TripList />} />
    <Route path="new" element={<NewTripForm />} />
    <Route path=":tripId" element={<TripDetail />} />
  </Routes>
);

export default TravelPlanner;
