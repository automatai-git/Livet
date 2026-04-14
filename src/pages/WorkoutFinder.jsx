import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { trainingService } from '../services/trainingService';

const InlineTimer = ({ initialSeconds = 60 }) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
       setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'var(--bg)', padding: '10px 20px', borderRadius: '12px', marginTop: '15px', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 600, width: '60px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
        {mins}:{secs < 10 ? '0'+secs : secs}
      </div>
      <button onClick={() => setIsRunning(!isRunning)} style={{ background: isRunning ? '#c48b47' : 'var(--primary)', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
        {isRunning ? 'Pause' : 'Start'}
      </button>
      <button onClick={() => { setIsRunning(false); setTimeLeft(initialSeconds); }} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
        Reset
      </button>
      <div style={{ flex: 1, display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
         <button onClick={() => setTimeLeft(60)} style={{background: 'var(--card)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer'}}>1m</button>
         <button onClick={() => setTimeLeft(120)} style={{background: 'var(--card)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer'}}>2m</button>
      </div>
    </div>
  );
};

const WorkoutFinder = () => {
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [programPosition, setProgramPosition] = useState(null);
  const [startDate, setStartDate] = useState(null);

  useEffect(() => {
    const fetchWorkouts = async () => {
      setLoading(true);
      
      // Fetch highlights/start date info
      const storedDate = await trainingService.getStartDate();
      setStartDate(storedDate);
      const pos = trainingService.calculateProgramPosition(storedDate);
      setProgramPosition(pos);

      const { data, error } = await supabase.from('workouts').select('*').order('week_num', { ascending: true }).order('date', { ascending: true });
      if (!error && data && data.length > 0) {
        const map = {};
        data.forEach(w => {
          if (!map[w.week_num]) {
             map[w.week_num] = { week: w.week_num, startDate: w.start_date, endDate: w.end_date, phase: w.phase, days: [] };
          }
          map[w.week_num].days.push({ 
            day: w.day_name, date: w.date, session: w.session_type, 
            mainWorkout: w.main_workout, support: w.support, 
            rpe: w.rpe, notes: w.notes, comments: w.comments 
          });
        });
        setWeeks(Object.values(map));
      }
      setLoading(false);
    };
    fetchWorkouts();
  }, []);

  const handleSetStartDate = async () => {
    const newDate = prompt("Enter training start date (YYYY-MM-DD):", startDate || new Date().toISOString().split('T')[0]);
    if (newDate) {
      const success = await trainingService.setStartDate(newDate);
      if (success) {
        setStartDate(newDate);
        setProgramPosition(trainingService.calculateProgramPosition(newDate));
        alert("Start date updated!");
      }
    }
  };

  if (selectedDay) {
    return (
      <div>
        <div className="sticky-header">
          <div className="header-row">
            <button className="back-btn" onClick={() => setSelectedDay(null)} style={{background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600}}>
              ← Back to Week
            </button>
            <h1 className="heading-serif">Workout Details</h1>
            <div style={{width: '80px'}}></div>
          </div>
        </div>
        <div style={{padding: '20px'}}>
          <div style={{fontSize: '1.2rem', fontWeight: 600, marginBottom: '20px'}}>{selectedDay.day}, {selectedDay.date}</div>
          <div className="app-card" style={{padding: '25px', border: '2px solid var(--primary)'}}>
            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
               <div style={{borderBottom: '1px solid var(--border)', paddingBottom: '15px'}}>
                 <div style={{fontWeight: 600, color: 'var(--text-muted)'}}>Session Type</div>
                 <div style={{fontSize: '1.1rem'}}>{selectedDay.session}</div>
               </div>
               
               <div style={{borderBottom: '1px solid var(--border)', paddingBottom: '15px'}}>
                 <div style={{fontWeight: 600, color: 'var(--text-muted)'}}>Rest Timer</div>
                 <InlineTimer initialSeconds={60} />
               </div>

               <div style={{borderBottom: '1px solid var(--border)', paddingBottom: '15px'}}>
                 <div style={{fontWeight: 600, color: 'var(--text-muted)'}}>Main Workout</div>
                 <div>{selectedDay.mainWorkout}</div>
               </div>
               <div style={{borderBottom: '1px solid var(--border)', paddingBottom: '15px'}}>
                 <div style={{fontWeight: 600, color: 'var(--text-muted)'}}>Support Protocol</div>
                 <div>{selectedDay.support}</div>
               </div>
               <div style={{borderBottom: '1px solid var(--border)', paddingBottom: '15px'}}>
                 <div style={{fontWeight: 600, color: 'var(--text-muted)'}}>Target RPE</div>
                 <div style={{padding: '6px 12px', background: 'var(--primary)', color: 'white', display: 'inline-block', borderRadius: '8px', fontWeight: 600}}>{selectedDay.rpe}</div>
               </div>
               <div style={{borderBottom: '1px solid var(--border)', paddingBottom: '15px'}}>
                 <div style={{fontWeight: 600, color: 'var(--text-muted)'}}>Phase</div>
                 <div style={{padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'inline-block', borderRadius: '20px'}}>{selectedWeek.phase}</div>
               </div>
               {selectedDay.notes && (
                 <div style={{borderBottom: '1px solid var(--border)', paddingBottom: '15px'}}>
                   <div style={{fontWeight: 600, color: 'var(--text-muted)'}}>Notes</div>
                   <div>{selectedDay.notes}</div>
                 </div>
               )}
               {selectedDay.comments && (
                 <div>
                   <div style={{fontWeight: 600, color: 'var(--text-muted)'}}>Comments</div>
                   <div>{selectedDay.comments}</div>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedWeek) {
    return (
      <div>
        <div className="sticky-header">
          <div className="header-row">
            <button className="back-btn" onClick={() => setSelectedWeek(null)} style={{background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600}}>
               ← Back to Weeks
            </button>
            <h1 className="heading-serif">Week {selectedWeek.week}</h1>
            <div style={{width: '80px'}}></div>
          </div>
        </div>
        <div style={{padding: '20px'}}>
           <div style={{textAlign: 'center', marginBottom: '20px', color: 'var(--text-muted)'}}>
             {selectedWeek.startDate} - {selectedWeek.endDate} ({selectedWeek.phase})
           </div>
           {selectedWeek.days.map((day, i) => {
             const isCurrentDay = programPosition && programPosition.week === selectedWeek.week && programPosition.dayName === day.day;
             return (
               <div key={i} className="app-card" style={{borderLeft: isCurrentDay ? '6px solid var(--success)' : '4px solid var(--primary)', marginBottom: '12px', cursor: 'pointer', padding: '20px', background: isCurrentDay ? 'var(--bg)' : 'var(--card)' }} onClick={() => setSelectedDay(day)}>
                 <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                   <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                     <strong style={{fontSize: '1.1rem'}}>{day.day}</strong>
                     {isCurrentDay && <span style={{fontSize: '0.7rem', background: 'var(--success)', color: 'white', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase'}}>Current Day</span>}
                   </div>
                   <span style={{color: 'var(--text-muted)'}}>{day.date}</span>
                 </div>
                 <div style={{marginBottom: '8px'}}>
                   <span style={{padding: '4px 12px', background: 'var(--primary)', color: 'white', borderRadius: '20px', fontSize: '0.85rem', marginRight: '8px'}}>
                     {day.session}
                   </span>
                   <span style={{fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)'}}>RPE {day.rpe}</span>
                 </div>
                 <div style={{color: 'var(--text)'}}>{day.mainWorkout}</div>
               </div>
             );
           })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky-header">
        <div className="header-row">
          <Link to="/" className="back-home">← Dashboard</Link>
          <h1 className="heading-serif">Workout Finder</h1>
          <div style={{width: '80px'}}></div>
        </div>
      </div>

      <div style={{padding: '20px'}}>
        <div style={{textAlign: 'center', marginBottom: '30px', color: 'var(--text-muted)'}}>
          Block 3 Training Plan 
          {loading && <div>Loading database...</div>}
        </div>
        
        {!loading && weeks.length === 0 && (
          <div style={{textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px'}}>
            No workouts found in Supabase. Have you migrated your data?
          </div>
        )}

         <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px'}}>
           {weeks.map(week => {
             const isCurrentWeek = programPosition && programPosition.week === week.week;
             return (
               <div 
                 key={week.week} 
                 className="app-card"
                 onClick={() => setSelectedWeek(week)}
                 style={{
                   cursor: 'pointer', 
                   textAlign: 'center', 
                   padding: '15px', 
                   border: isCurrentWeek ? '2px solid var(--success)' : '1px solid var(--border)',
                   position: 'relative',
                   overflow: 'hidden'
                 }}
               >
                  {isCurrentWeek && <div style={{position: 'absolute', top: 0, right: 0, background: 'var(--success)', color: 'white', fontSize: '0.6rem', padding: '2px 8px', borderRadius: '0 0 0 8px', fontWeight: 700}}>CURRENT</div>}
                  <div style={{fontWeight: 600, fontSize: '1.1rem', marginBottom: '5px'}}>Week {week.week}</div>
                  <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                    {week.startDate.slice(0, 5)} - {week.endDate.slice(0, 5)}
                  </div>
               </div>
             );
           })}
         </div>

         <div style={{marginTop: '40px', textAlign: 'center'}}>
            <button 
              onClick={handleSetStartDate}
              style={{background: 'var(--card)', border: '1px solid var(--border)', padding: '12px 20px', borderRadius: '12px', color: 'var(--text)', cursor: 'pointer', fontWeight: 600}}
            >
export default WorkoutFinder;
