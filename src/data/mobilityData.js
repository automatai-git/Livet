// Mobility routine data for the /mobility page.
// Existing fields: order, name, sets, load, purpose, cue.
// Added in A0:
//   - tags: string[]            body-region labels lifted out of the in-caps suffixes in `purpose`
//   - asymmetric: boolean       true when the cue calls for extra work on one side
//   - weakSide: 'left' | 'right' optional, where the asymmetry is known
//   - shoulderManaged: boolean  flags exercises directly managing the right-shoulder issue
// Parsing of `sets` (set count, rep target, hold seconds, each-side) lives in src/lib/mobility.js.

export const MOBILITY_DATA = {
  monday: {
    name: 'Monday - Strength',
    routines: {
      'pre-workout': {
        name: 'Pre-Workout Support',
        exercises: [
          { order: 1, name: 'Ankle Circles', sets: '10 each direction/foot', load: 'None', purpose: 'Ankle mobility', cue: 'Slow, full ROM', tags: ['ANKLES'] },
          { order: 2, name: 'Hip Airplane', sets: '2x5 each side', load: 'None', purpose: 'Hip control through ROM', cue: 'Hinge at hip, rotate pelvis', tags: ['HIPS'] },
          { order: 3, name: 'Dead Bug', sets: '2x8 each side', load: 'None', purpose: 'Core anti-extension', cue: 'Press low back into floor', tags: ['CORE'] },
          { order: 4, name: '90/90 Hip Transition', sets: '5 transitions', load: 'None', purpose: 'Hip internal/external rotation', cue: 'Keep chest tall', tags: ['HIPS'] },
          { order: 5, name: 'Goblet Squat Hold', sets: '2x20s', load: '12-16kg', purpose: 'Squat pattern prep', cue: 'Elbows push knees out' },
        ],
      },
      'post-workout': {
        name: 'Post-Workout Support',
        exercises: [
          { order: 1, name: 'Glute Bridge w/ Posterior Tilt', sets: '2x12', load: 'None', purpose: 'End-range glute control', cue: 'Squeeze + tuck pelvis under', tags: ['BUTT WINK'] },
          { order: 2, name: 'Jefferson Curl', sets: '2x8', load: '5-10kg', purpose: 'Posterior chain mobility', cue: 'Segment by segment' },
        ],
      },
    },
  },
  tuesday: {
    name: 'Tuesday - Run',
    routines: {
      'pre-run': {
        name: 'Pre-Run Support',
        exercises: [
          { order: 1, name: 'Ankle Circles', sets: '10 each direction/foot', load: 'None', purpose: 'Ankle prep', cue: 'Full ROM', tags: ['ANKLES'] },
          { order: 2, name: 'Calf Raises (slow eccentric)', sets: '2x10', load: 'Bodyweight', purpose: 'Calf activation', cue: '3s down', tags: ['ANKLES'] },
          { order: 3, name: 'Leg Swings (front/back)', sets: '10 each leg', load: 'None', purpose: 'Hip flexor/hamstring prep', cue: 'Controlled swing', tags: ['HIPS'] },
          { order: 4, name: 'ATG Split Squat Hold', sets: '30s each side', load: 'None', purpose: 'Hip flexor + ankle stretch', cue: 'Back knee to floor', tags: ['HIPS', 'ANKLES'] },
        ],
      },
      'post-run': {
        name: 'Post-Run Support',
        exercises: [
          { order: 1, name: 'Wall Ankle Stretch (weighted)', sets: '3x30s each', load: '5-10kg plate on knee', purpose: 'Dorsiflexion improvement', cue: 'Knee over 2nd toe', tags: ['ANKLES'] },
          { order: 2, name: 'Cossack Squat', sets: '2x8 each side', load: 'Goblet 8-12kg', purpose: 'Adductor stretch + ankle', cue: 'Heel stays down', tags: ['GROIN', 'ANKLES'] },
          { order: 3, name: '90/90 Flow', sets: '2x5 transitions', load: 'None', purpose: 'Hip mobility cooldown', cue: 'Breathe into tight spots', tags: ['HIPS'] },
        ],
      },
    },
  },
  wednesday: {
    name: 'Wednesday - Mobility',
    routines: {
      'full-session': {
        name: 'Full Corrective Session',
        exercises: [
          { order: 1, name: 'Foam Roller T-Spine Extension', sets: '2x10', load: 'None', purpose: 'Thoracic mobility', cue: 'Extend over roller at each segment', tags: ['T-SPINE'] },
          { order: 2, name: 'Dead Bug (full)', sets: '3x10/side', load: 'None', purpose: 'Core anti-extension (BUTT WINK)', cue: 'Low back STAYS on floor', tags: ['CORE', 'BUTT WINK'] },
          { order: 3, name: 'Pallof Press', sets: '3x10/side', load: 'Band/Cable', purpose: 'Core anti-rotation (BUTT WINK)', cue: 'No rotation, brace hard', tags: ['CORE', 'BUTT WINK'] },
          { order: 4, name: 'Copenhagen Plank', sets: '3x8-12/side', load: 'Bodyweight', purpose: 'Adductor strength (GROIN)', cue: 'Progress: bent → straight leg', tags: ['GROIN'] },
          { order: 5, name: '90/90 Flow + Holds', sets: '3x5 transitions + 30s hold weak side', load: 'None', purpose: 'Hip rotation (HIPS)', cue: 'Extra time on left', tags: ['HIPS'], asymmetric: true, weakSide: 'left' },
          { order: 6, name: 'Wall Ankle Stretch (weighted)', sets: '3x45s each', load: '10kg plate', purpose: 'Dorsiflexion (ANKLES)', cue: 'Track knee over toe', tags: ['ANKLES'] },
          { order: 7, name: 'Tibialis Raise', sets: '3x15', load: 'Bodyweight or band', purpose: 'Anterior ankle strength (ANKLES)', cue: 'Toes up, control down', tags: ['ANKLES'] },
          { order: 8, name: 'Jefferson Curl', sets: '3x8', load: '10-15kg', purpose: 'Posterior chain under load', cue: 'Slow, segmental' },
          { order: 9, name: 'Cossack Squat', sets: '3x8 each', load: 'Goblet 12-16kg', purpose: 'Adductors + ankle (GROIN/ANKLES)', cue: 'Heel down, chest up', tags: ['GROIN', 'ANKLES'] },
          { order: 10, name: 'ATG Split Squat', sets: '3x8 each', load: 'DBs 5-10kg', purpose: 'Hip flexor length (HIPS/BUTT WINK)', cue: 'Back knee touches floor', tags: ['HIPS', 'BUTT WINK'] },
          { order: 11, name: 'Goblet Squat Hold + Pulses', sets: '2x30s + 10 pulses', load: '16-20kg', purpose: 'End-range squat strength', cue: 'Elbows push knees, stay deep' },
          { order: 12, name: 'Glute Bridge w/ Posterior Tilt', sets: '3x12', load: 'None', purpose: 'Glute control at end-range (BUTT WINK)', cue: 'Tuck pelvis, squeeze top', tags: ['BUTT WINK'] },
        ],
      },
    },
  },
  thursday: {
    name: 'Thursday - Run',
    routines: {
      'pre-run': {
        name: 'Pre-Run Support',
        exercises: [
          { order: 1, name: 'Ankle Circles', sets: '10 each direction/foot', load: 'None', purpose: 'Ankle prep', cue: 'Full ROM', tags: ['ANKLES'] },
          { order: 2, name: 'Calf Raises (slow eccentric)', sets: '2x10', load: 'Bodyweight', purpose: 'Calf activation', cue: '3s down', tags: ['ANKLES'] },
          { order: 3, name: 'Leg Swings (front/back)', sets: '10 each leg', load: 'None', purpose: 'Hip flexor/hamstring prep', cue: 'Controlled swing', tags: ['HIPS'] },
          { order: 4, name: 'ATG Split Squat Hold', sets: '30s each side', load: 'None', purpose: 'Hip flexor + ankle stretch', cue: 'Back knee to floor', tags: ['HIPS', 'ANKLES'] },
        ],
      },
      'post-run': {
        name: 'Post-Run Support',
        exercises: [
          { order: 1, name: 'Wall Ankle Stretch (weighted)', sets: '3x30s each', load: '5-10kg plate on knee', purpose: 'Dorsiflexion improvement', cue: 'Knee over 2nd toe', tags: ['ANKLES'] },
          { order: 2, name: 'Cossack Squat', sets: '2x8 each side', load: 'Goblet 8-12kg', purpose: 'Adductor stretch + ankle', cue: 'Heel stays down', tags: ['GROIN', 'ANKLES'] },
          { order: 3, name: '90/90 Flow', sets: '2x5 transitions', load: 'None', purpose: 'Hip mobility cooldown', cue: 'Breathe into tight spots', tags: ['HIPS'] },
        ],
      },
    },
  },
  friday: {
    name: 'Friday - Strength (Upper)',
    routines: {
      'pre-workout': {
        name: 'Pre-Workout Support',
        exercises: [
          { order: 1, name: 'Arm Circles (forward/back)', sets: '2 x 10 each direction', load: 'None', purpose: 'Shoulder warm-up', cue: 'Small, controlled circles', tags: ['SHOULDER'] },
          { order: 2, name: 'Banded Shoulder Dislocates', sets: '2 x 10', load: 'Band or dowel', purpose: 'Shoulder mobility (right shoulder management)', cue: 'Move arms overhead and behind, no pain', tags: ['SHOULDER'], shoulderManaged: true },
          { order: 3, name: 'Banded Pull-Aparts', sets: '2 x 10', load: 'Light band', purpose: 'Scapular activation', cue: 'Pull at chest level, squeeze blades', tags: ['SHOULDER'] },
          { order: 4, name: 'Band External Rotation', sets: '2 x 10 each arm', load: 'Light band', purpose: 'Rotator cuff prep', cue: 'Elbow at side, rotate forearm out', tags: ['SHOULDER'], shoulderManaged: true },
          { order: 5, name: 'Wall Slides', sets: '2x8', load: 'None', purpose: 'Shoulder + T-spine', cue: 'Back stays on wall', tags: ['SHOULDER', 'T-SPINE'] },
          { order: 6, name: 'Dead Bug', sets: '2x8 each side', load: 'None', purpose: 'Core anti-extension', cue: 'Press low back into floor', tags: ['CORE'] },
        ],
      },
      'post-workout': {
        name: 'Post-Workout Support',
        exercises: [
          { order: 1, name: 'Prone Y-T-W', sets: '2x8 each position', load: 'None or 1-2kg', purpose: 'Thoracic extension + posture', cue: 'Squeeze at top', tags: ['SHOULDER', 'T-SPINE'], shoulderManaged: true },
          { order: 2, name: 'Jefferson Curl', sets: '2x8', load: '5-10kg', purpose: 'Posterior chain', cue: 'Slow' },
        ],
      },
    },
  },
  saturday: {
    name: 'Saturday - Flex / Sport',
    routines: {
      'pre-sport': {
        name: 'Pre-Sport Activation',
        exercises: [
          { order: 1, name: 'Ankle Circles', sets: '10 each direction/foot', load: 'None', purpose: 'General prep', cue: 'Full ROM', tags: ['ANKLES'] },
          { order: 2, name: 'Leg Swings (lateral)', sets: '10 each leg', load: 'None', purpose: 'Adductor prep', cue: 'Controlled', tags: ['GROIN'] },
          { order: 3, name: 'Walking Lunges', sets: '10 each leg', load: 'None', purpose: 'Hip activation', cue: 'Upright torso', tags: ['HIPS'] },
          { order: 4, name: 'Calf Raises', sets: '2x10', load: 'Bodyweight', purpose: 'Calf activation', cue: 'Full ROM', tags: ['ANKLES'] },
        ],
      },
    },
  },
  sunday: {
    name: 'Sunday - Long Run',
    routines: {
      'pre-run': {
        name: 'Pre-Long-Run Activation',
        exercises: [
          { order: 1, name: 'Ankle Circles', sets: '10 each direction/foot', load: 'None', purpose: 'Ankle prep', cue: 'Slow, full ROM', tags: ['ANKLES'] },
          { order: 2, name: 'Hip Airplane', sets: '2x5 each side', load: 'None', purpose: 'Hip control through ROM', cue: 'Hinge at hip, rotate pelvis', tags: ['HIPS'] },
          { order: 3, name: 'Leg Swings (front/back)', sets: '10 each leg', load: 'None', purpose: 'Hip flexor/hamstring prep', cue: 'Controlled swing', tags: ['HIPS'] },
          { order: 4, name: 'ATG Split Squat Hold', sets: '30s each side', load: 'None', purpose: 'Hip flexor + ankle stretch', cue: 'Back knee to floor', tags: ['HIPS', 'ANKLES'] },
        ],
      },
      'post-run': {
        name: 'Post-Long-Run Cooldown',
        exercises: [
          { order: 1, name: 'Wall Ankle Stretch (weighted)', sets: '3x45s each', load: '10kg plate', purpose: 'Dorsiflexion (ANKLES)', cue: 'Knee tracks over toe', tags: ['ANKLES'] },
          { order: 2, name: 'Cossack Squat', sets: '3x8 each', load: 'Goblet 12kg', purpose: 'Adductors (GROIN)', cue: 'Heel down', tags: ['GROIN'] },
          { order: 3, name: '90/90 Flow', sets: '3x5 transitions', load: 'None', purpose: 'Hip rotation (HIPS)', cue: 'Breathe into stretch', tags: ['HIPS'] },
          { order: 4, name: 'ATG Split Squat', sets: '2x8 each + 1 extra left', load: 'Bodyweight', purpose: 'Hip flexors (HIPS asymmetry)', cue: 'Extra left side', tags: ['HIPS'], asymmetric: true, weakSide: 'left' },
          { order: 5, name: 'Jefferson Curl', sets: '2x8', load: '5-10kg', purpose: 'Hamstring cooldown', cue: 'Slow' },
        ],
      },
    },
  },
};

export const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
