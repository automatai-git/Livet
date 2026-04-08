// Mobility Workout Data - Complete exercise database from training plan
const MOBILITY_DATA = {
    monday: {
        name: "Monday - Strength",
        routines: {
            "pre-workout": {
                name: "Pre-Workout Support",
                exercises: [
                    { order: 1, name: "Ankle Circles", sets: "10 each direction/foot", load: "None", purpose: "Ankle mobility", cue: "Slow, full ROM" },
                    { order: 2, name: "Hip Airplane", sets: "2x5 each side", load: "None", purpose: "Hip control through ROM", cue: "Hinge at hip, rotate pelvis" },
                    { order: 3, name: "Dead Bug", sets: "2x8 each side", load: "None", purpose: "Core anti-extension (butt wink fix)", cue: "Press low back into floor" },
                    { order: 4, name: "90/90 Hip Transition", sets: "5 transitions", load: "None", purpose: "Hip internal/external rotation", cue: "Keep chest tall" },
                    { order: 5, name: "Goblet Squat Hold", sets: "2x20s", load: "12-16kg", purpose: "Squat pattern prep, ankle stretch", cue: "Elbows push knees out" }
                ]
            },
            "post-workout": {
                name: "Post-Workout Support",
                exercises: [
                    { order: 1, name: "Glute Bridge w/ Posterior Tilt", sets: "2x12", load: "None", purpose: "End-range glute control (butt wink)", cue: "Squeeze + tuck pelvis under" },
                    { order: 2, name: "Jefferson Curl", sets: "2x8", load: "5-10kg", purpose: "Posterior chain mobility", cue: "Segment by segment" }
                ]
            }
        }
    },
    tuesday: {
        name: "Tuesday - Run",
        routines: {
            "pre-run": {
                name: "Pre-Run Support",
                exercises: [
                    { order: 1, name: "Ankle Circles", sets: "10 each direction/foot", load: "None", purpose: "Ankle prep", cue: "Full ROM" },
                    { order: 2, name: "Calf Raises (slow eccentric)", sets: "2x10", load: "Bodyweight", purpose: "Calf activation + ankle mobility", cue: "3s down" },
                    { order: 3, name: "Leg Swings (front/back)", sets: "10 each leg", load: "None", purpose: "Hip flexor/hamstring prep", cue: "Controlled swing" },
                    { order: 4, name: "ATG Split Squat Hold", sets: "30s each side", load: "None", purpose: "Hip flexor + ankle stretch", cue: "Back knee to floor" }
                ]
            },
            "post-run": {
                name: "Post-Run Support",
                exercises: [
                    { order: 1, name: "Wall Ankle Stretch (weighted)", sets: "3x30s each", load: "5-10kg plate on knee", purpose: "Dorsiflexion improvement (ankle fix)", cue: "Knee over 2nd toe" },
                    { order: 2, name: "Cossack Squat", sets: "2x8 each side", load: "Goblet 8-12kg", purpose: "Adductor stretch + ankle (groin/ankle)", cue: "Heel stays down" },
                    { order: 3, name: "90/90 Flow", sets: "2x5 transitions", load: "None", purpose: "Hip mobility cooldown", cue: "Breathe into tight spots" }
                ]
            }
        }
    },
    wednesday: {
        name: "Wednesday - Mobility/Support",
        routines: {
            "full-session": {
                name: "Full Mobility Session (45-60 min)",
                exercises: [
                    { order: 1, name: "Foam Roller T-Spine Extension", sets: "2x10 extensions", load: "None", purpose: "Thoracic mobility", cue: "Extend over roller at each segment" },
                    { order: 2, name: "Dead Bug (full)", sets: "3x10 each side", load: "None", purpose: "Core anti-extension (BUTT WINK)", cue: "Low back STAYS on floor" },
                    { order: 3, name: "Pallof Press", sets: "3x10 each side", load: "Band/Cable", purpose: "Core anti-rotation (BUTT WINK)", cue: "No rotation, brace hard" },
                    { order: 4, name: "Copenhagen Plank", sets: "3x8-12 each side", load: "Bodyweight", purpose: "Adductor strength (GROIN)", cue: "Progress: bent->straight leg" },
                    { order: 5, name: "90/90 Flow + Holds", sets: "3x5 transitions + 30s hold weak side", load: "None", purpose: "Hip rotation (HIPS)", cue: "Extra time on left" },
                    { order: 6, name: "Wall Ankle Stretch (weighted)", sets: "3x45s each", load: "10kg plate", purpose: "Dorsiflexion (ANKLES)", cue: "Track knee over toe" },
                    { order: 7, name: "Tibialis Raise", sets: "3x15", load: "Bodyweight or band", purpose: "Anterior ankle strength (ANKLES)", cue: "Toes up, control down" },
                    { order: 8, name: "Jefferson Curl", sets: "3x8", load: "10-15kg", purpose: "Posterior chain under load", cue: "Slow, segmental" },
                    { order: 9, name: "Cossack Squat", sets: "3x8 each side", load: "Goblet 12-16kg", purpose: "Adductors + ankle (GROIN/ANKLES)", cue: "Heel down, chest up" },
                    { order: 10, name: "ATG Split Squat", sets: "3x8 each side", load: "DBs 5-10kg", purpose: "Hip flexor length (HIPS/BUTT WINK)", cue: "Back knee touches floor" },
                    { order: 11, name: "Goblet Squat Hold + Pulses", sets: "2x30s + 10 pulses", load: "16-20kg", purpose: "End-range squat strength", cue: "Elbows push knees, stay deep" },
                    { order: 12, name: "Glute Bridge w/ Posterior Tilt", sets: "3x12", load: "None", purpose: "Glute control at end-range (BUTT WINK)", cue: "Tuck pelvis, squeeze top" }
                ]
            }
        }
    },
    thursday: {
        name: "Thursday - Strength",
        routines: {
            "pre-workout": {
                name: "Pre-Workout Support",
                exercises: [
                    { order: 1, name: "Ankle Circles", sets: "10 each direction/foot", load: "None", purpose: "General prep", cue: "Full ROM" },
                    { order: 2, name: "Wall Slides", sets: "2x8", load: "None", purpose: "Shoulder + T-spine", cue: "Back stays on wall" },
                    { order: 3, name: "Band Pull-Apart", sets: "2x15", load: "Light band", purpose: "Scapular activation", cue: "Squeeze shoulder blades" },
                    { order: 4, name: "Dead Bug", sets: "2x8 each side", load: "None", purpose: "Core activation", cue: "Breath out on extension" }
                ]
            },
            "post-workout": {
                name: "Post-Workout Support",
                exercises: [
                    { order: 1, name: "Prone Y-T-W", sets: "2x8 each position", load: "None or 1-2kg", purpose: "Thoracic extension + posture", cue: "Squeeze at top" },
                    { order: 2, name: "Jefferson Curl", sets: "2x8", load: "5-10kg", purpose: "Posterior chain", cue: "Slow" }
                ]
            }
        }
    },
    friday: {
        name: "Friday - Run (Long)",
        routines: {
            "pre-run": {
                name: "Pre-Run Support",
                exercises: [
                    { order: 1, name: "Ankle Circles", sets: "10 each direction/foot", load: "None", purpose: "Ankle prep", cue: "Full ROM" },
                    { order: 2, name: "Leg Swings (lateral)", sets: "10 each leg", load: "None", purpose: "Adductor prep", cue: "Controlled" },
                    { order: 3, name: "Walking Lunges", sets: "10 each leg", load: "None", purpose: "Hip activation", cue: "Upright torso" },
                    { order: 4, name: "Calf Raises", sets: "2x10", load: "Bodyweight", purpose: "Calf activation", cue: "Full ROM" }
                ]
            },
            "post-run": {
                name: "Post-Run Support (Extended for Long Run)",
                exercises: [
                    { order: 1, name: "Wall Ankle Stretch", sets: "3x45s each", load: "10kg plate", purpose: "Dorsiflexion (ANKLES)", cue: "Knee tracks over toe" },
                    { order: 2, name: "Cossack Squat", sets: "3x8 each", load: "Goblet 12kg", purpose: "Adductors (GROIN)", cue: "Heel down" },
                    { order: 3, name: "90/90 Flow", sets: "3x5 transitions", load: "None", purpose: "Hip rotation (HIPS)", cue: "Breathe into stretch" },
                    { order: 4, name: "ATG Split Squat", sets: "2x8 each + 1 extra left", load: "Bodyweight", purpose: "Hip flexors (HIPS asymmetry)", cue: "Extra left side" },
                    { order: 5, name: "Jefferson Curl", sets: "2x8", load: "5-10kg", purpose: "Hamstring cooldown", cue: "Slow" }
                ]
            }
        }
    },
    saturday: {
        name: "Saturday - Strength",
        routines: {
            "pre-workout": {
                name: "Pre-Workout Support",
                exercises: [
                    { order: 1, name: "Ankle Circles", sets: "10 each direction/foot", load: "None", purpose: "Prep", cue: "Full ROM" },
                    { order: 2, name: "Hip Airplane", sets: "2x5 each side", load: "None", purpose: "Hip control (HIPS)", cue: "Single leg, rotate pelvis" },
                    { order: 3, name: "90/90 Hip Transition", sets: "5 transitions", load: "None", purpose: "Hip rotation (HIPS)", cue: "Chest stays tall" },
                    { order: 4, name: "Dead Bug", sets: "2x8 each side", load: "None", purpose: "Core anti-extension (BUTT WINK)", cue: "Low back on floor" },
                    { order: 5, name: "Goblet Squat Hold", sets: "2x20s", load: "12-16kg", purpose: "Squat prep + ankle", cue: "Push knees out" }
                ]
            },
            "post-workout": {
                name: "Post-Workout Support",
                exercises: [
                    { order: 1, name: "Tibialis Raise", sets: "3x15", load: "Bodyweight", purpose: "Ankle strength (ANKLES)", cue: "Control the negative" },
                    { order: 2, name: "Copenhagen Plank", sets: "2x8-10 each", load: "Bodyweight", purpose: "Adductor strength (GROIN)", cue: "Top leg on bench" },
                    { order: 3, name: "ATG Split Squat", sets: "2x8 each + 1 extra left", load: "DBs 5-8kg", purpose: "Hip flexor + asymmetry (HIPS)", cue: "Back knee to floor" },
                    { order: 4, name: "Glute Bridge w/ Tilt", sets: "2x12", load: "None", purpose: "Glute control (BUTT WINK)", cue: "Squeeze + tuck" },
                    { order: 5, name: "Jefferson Curl", sets: "2x8", load: "10kg", purpose: "Posterior chain", cue: "Segmental" }
                ]
            }
        }
    },
    sunday: {
        name: "Sunday - Rest/Light",
        routines: {
            "light-support": {
                name: "Light Support Only",
                exercises: [
                    { order: 1, name: "Ankle Circles", sets: "10 each direction/foot", load: "None", purpose: "Maintenance", cue: "Light" },
                    { order: 2, name: "Band Pull-Apart", sets: "2x15", load: "Light band", purpose: "Shoulder health", cue: "Squeeze" },
                    { order: 3, name: "Dead Bug", sets: "2x8 each", load: "None", purpose: "Core maintenance (BUTT WINK)", cue: "Quality reps" }
                ]
            }
        }
    }
};

// Helper to get current week number
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Helper to get training block (can be customized)
function getTrainingBlock(date) {
    const weekNum = getWeekNumber(date);
    // Default 4-week mesocycle blocks
    const blockNum = Math.ceil(weekNum / 4);
    return `Block ${blockNum}`;
}
