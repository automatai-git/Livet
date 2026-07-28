import React, { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShellV3 from '../../components/AppShellV3';
import { travelService } from '../../services/travelService';
import { listDestinations } from '../../data/destinations';

const NewTripForm = () => {
  const navigate = useNavigate();
  const destinations = listDestinations();
  const [destKey, setDestKey] = useState(destinations[0]?.key ?? '');
  const [name, setName] = useState(destinations[0]?.name ?? '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const nameId = useId();
  const destId = useId();
  const startId = useId();
  const endId = useId();

  const handleDestChange = (key) => {
    const dest = destinations.find((d) => d.key === key);
    setDestKey(key);
    // Prefill the trip name with the destination name on first change so the
    // user has a reasonable default; they can edit it.
    if (dest) setName(dest.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!destKey || !name.trim()) {
      setError('Pick a destination and give the trip a name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const trip = await travelService.createTrip({
        destinationKey: destKey,
        name: name.trim(),
        startDate: startDate || null,
        endDate: endDate || null,
      });
      navigate(`/travel/${trip.id}`, { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not create trip.');
      setSaving(false);
    }
  };

  return (
    <AppShellV3 app="travel" title="New trip" back="/travel">
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18, maxWidth: 480 }}>
        <div>
          <label htmlFor={destId} style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Destination</label>
          <select
            id={destId}
            value={destKey}
            onChange={(e) => handleDestChange(e.target.value)}
            style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          >
            {destinations.map((d) => (
              <option key={d.key} value={d.key}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={nameId} style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Trip name</label>
          <input
            id={nameId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Hawaii 2026"
            style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label htmlFor={startId} style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Start date</label>
            <input id={startId} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          </div>
          <div>
            <label htmlFor={endId} style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>End date</label>
            <input id={endId} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          </div>
        </div>

        {error && <p style={{ color: 'var(--accent-decision)', fontSize: '0.9rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => navigate('/travel')}
            style={{ flex: 1, padding: 12, minHeight: 44, borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{ flex: 2, padding: 12, minHeight: 44, borderRadius: 12, border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}
          >
            {saving ? 'Creating…' : 'Create trip'}
          </button>
        </div>
      </form>
    </AppShellV3>
  );
};

export default NewTripForm;
