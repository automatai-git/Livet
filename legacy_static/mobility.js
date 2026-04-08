// Mobility Tracker - Main Application Logic

class MobilityTracker {
    constructor() {
        this.selectedDay = null;
        this.selectedRoutine = null;
        this.completedExercises = new Set();
        this.workoutHistory = this.loadHistory();
        
        this.initElements();
        this.bindEvents();
        this.renderHistory();
        this.setDefaultDates();
        this.autoSelectToday();
    }

    initElements() {
        // Day selector
        this.dayGrid = document.getElementById('dayGrid');
        this.dayButtons = document.querySelectorAll('.day-btn');
        
        // Routine selector
        this.routineSelector = document.getElementById('routineSelector');
        this.routineGrid = document.getElementById('routineGrid');
        
        // Exercise section
        this.exerciseSection = document.getElementById('exerciseSection');
        this.routineTitle = document.getElementById('routineTitle');
        this.exerciseList = document.getElementById('exerciseList');
        this.progressText = document.getElementById('progressText');
        this.progressFill = document.getElementById('progressFill');
        
        // Buttons
        this.completeWorkoutBtn = document.getElementById('completeWorkoutBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.exportBtn = document.getElementById('exportBtn');
        
        // History
        this.historyList = document.getElementById('historyList');
        
        // Modal
        this.exportModal = document.getElementById('exportModal');
        this.exportFrom = document.getElementById('exportFrom');
        this.exportTo = document.getElementById('exportTo');
        this.cancelExport = document.getElementById('cancelExport');
        this.confirmExport = document.getElementById('confirmExport');
    }

    bindEvents() {
        // Day selection
        this.dayButtons.forEach(btn => {
            btn.addEventListener('click', () => this.selectDay(btn.dataset.day));
        });

        // Complete workout
        this.completeWorkoutBtn.addEventListener('click', () => this.completeWorkout());
        
        // Reset
        this.resetBtn.addEventListener('click', () => this.resetWorkout());
        
        // Export
        this.exportBtn.addEventListener('click', () => this.showExportModal());
        this.cancelExport.addEventListener('click', () => this.hideExportModal());
        this.confirmExport.addEventListener('click', () => this.exportData());
        
        // Close modal on overlay click
        this.exportModal.addEventListener('click', (e) => {
            if (e.target === this.exportModal) this.hideExportModal();
        });
    }

    autoSelectToday() {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = days[new Date().getDay()];
        this.selectDay(today);
    }

    selectDay(day) {
        this.selectedDay = day;
        this.selectedRoutine = null;
        this.completedExercises.clear();
        
        // Update day buttons
        this.dayButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.day === day);
        });
        
        // Show routine selector
        this.renderRoutines();
        this.routineSelector.style.display = 'block';
        this.exerciseSection.style.display = 'none';
    }

    renderRoutines() {
        const dayData = MOBILITY_DATA[this.selectedDay];
        if (!dayData) return;
        
        this.routineGrid.innerHTML = '';
        
        Object.entries(dayData.routines).forEach(([key, routine]) => {
            const btn = document.createElement('button');
            btn.className = 'routine-btn';
            btn.dataset.routine = key;
            btn.innerHTML = `
                <span class="routine-name">${routine.name}</span>
                <span class="routine-count">${routine.exercises.length} exercises</span>
            `;
            btn.addEventListener('click', () => this.selectRoutine(key));
            this.routineGrid.appendChild(btn);
        });
    }

    selectRoutine(routineKey) {
        this.selectedRoutine = routineKey;
        this.completedExercises.clear();
        
        // Update routine buttons
        const routineButtons = this.routineGrid.querySelectorAll('.routine-btn');
        routineButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.routine === routineKey);
        });
        
        // Show exercises
        this.renderExercises();
        this.exerciseSection.style.display = 'block';
        
        // Scroll to exercises
        setTimeout(() => {
            this.exerciseSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    renderExercises() {
        const dayData = MOBILITY_DATA[this.selectedDay];
        const routine = dayData.routines[this.selectedRoutine];
        
        this.routineTitle.textContent = routine.name;
        this.exerciseList.innerHTML = '';
        
        routine.exercises.forEach((exercise, index) => {
            const item = document.createElement('div');
            item.className = 'exercise-item';
            item.dataset.index = index;
            if (exercise.cue) {
                item.dataset.cue = exercise.cue;
            }
            
            item.innerHTML = `
                <div class="exercise-checkbox"></div>
                <div class="exercise-details">
                    <div class="exercise-name">${exercise.name}</div>
                    <div class="exercise-meta">
                        <span>${exercise.sets}</span>
                        ${exercise.load !== 'None' ? `<span>${exercise.load}</span>` : ''}
                    </div>
                    ${exercise.cue ? `<div class="exercise-cue" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem; font-style: italic;">💡 ${exercise.cue}</div>` : ''}
                </div>
                <div class="exercise-purpose">${exercise.purpose}</div>
            `;
            
            item.addEventListener('click', () => this.toggleExercise(index, item));
            this.exerciseList.appendChild(item);
        });
        
        this.updateProgress();
    }

    toggleExercise(index, element) {
        if (this.completedExercises.has(index)) {
            this.completedExercises.delete(index);
            element.classList.remove('completed');
        } else {
            this.completedExercises.add(index);
            element.classList.add('completed', 'just-completed');
            setTimeout(() => element.classList.remove('just-completed'), 300);
        }
        
        this.updateProgress();
    }

    updateProgress() {
        const dayData = MOBILITY_DATA[this.selectedDay];
        const routine = dayData.routines[this.selectedRoutine];
        const total = routine.exercises.length;
        const completed = this.completedExercises.size;
        
        this.progressText.textContent = `${completed}/${total}`;
        this.progressFill.style.width = `${(completed / total) * 100}%`;
        
        // Enable/disable complete button
        this.completeWorkoutBtn.disabled = completed === 0;
    }

    resetWorkout() {
        this.completedExercises.clear();
        const items = this.exerciseList.querySelectorAll('.exercise-item');
        items.forEach(item => item.classList.remove('completed'));
        this.updateProgress();
    }

    completeWorkout() {
        const dayData = MOBILITY_DATA[this.selectedDay];
        const routine = dayData.routines[this.selectedRoutine];
        const today = new Date();
        
        // Build exercise lists
        const completedNames = [];
        const skippedNames = [];
        
        routine.exercises.forEach((exercise, index) => {
            if (this.completedExercises.has(index)) {
                completedNames.push(exercise.name);
            } else {
                skippedNames.push(exercise.name);
            }
        });
        
        // Create history entry
        const entry = {
            id: Date.now(),
            date: today.toISOString(),
            dateFormatted: today.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            }),
            block: getTrainingBlock(today),
            week: getWeekNumber(today),
            day: this.selectedDay.charAt(0).toUpperCase() + this.selectedDay.slice(1),
            dayType: dayData.name,
            routine: routine.name,
            exercisesCompleted: completedNames,
            exercisesNotCompleted: skippedNames,
            completedCount: completedNames.length,
            totalCount: routine.exercises.length
        };
        
        // Save to history
        this.workoutHistory.unshift(entry);
        this.saveHistory();
        this.renderHistory();
        
        // Reset current workout
        this.resetWorkout();
        
        // Show success feedback
        this.showSuccessMessage();
    }

    showSuccessMessage() {
        const msg = document.createElement('div');
        msg.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, var(--accent-sage), var(--accent-green));
            color: var(--bg-dark);
            padding: 1.5rem 2.5rem;
            border-radius: 16px;
            font-size: 1.2rem;
            font-weight: 600;
            z-index: 1001;
            animation: fadeIn 0.3s ease;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
        `;
        msg.textContent = '✓ Workout Logged!';
        document.body.appendChild(msg);
        
        setTimeout(() => {
            msg.style.opacity = '0';
            msg.style.transition = 'opacity 0.3s ease';
            setTimeout(() => msg.remove(), 300);
        }, 1500);
    }

    // History Management
    loadHistory() {
        const saved = localStorage.getItem('mobilityHistory');
        return saved ? JSON.parse(saved) : [];
    }

    saveHistory() {
        localStorage.setItem('mobilityHistory', JSON.stringify(this.workoutHistory));
    }

    renderHistory() {
        if (this.workoutHistory.length === 0) {
            this.historyList.innerHTML = '<p class="empty-history">No sessions logged yet</p>';
            return;
        }
        
        // Show last 10 entries
        const recent = this.workoutHistory.slice(0, 10);
        
        this.historyList.innerHTML = recent.map(entry => `
            <div class="history-item">
                <div>
                    <div class="history-date">${entry.dateFormatted}</div>
                    <div class="history-routine">${entry.routine}</div>
                </div>
                <div class="history-stats">
                    <span class="history-completed">✓ ${entry.completedCount}</span>
                    <span class="history-skipped">○ ${entry.totalCount - entry.completedCount}</span>
                </div>
            </div>
        `).join('');
    }

    // Export Functionality
    setDefaultDates() {
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        this.exportTo.value = today.toISOString().split('T')[0];
        this.exportFrom.value = thirtyDaysAgo.toISOString().split('T')[0];
    }

    showExportModal() {
        this.exportModal.style.display = 'flex';
    }

    hideExportModal() {
        this.exportModal.style.display = 'none';
    }

    exportData() {
        const fromDate = new Date(this.exportFrom.value);
        const toDate = new Date(this.exportTo.value);
        toDate.setHours(23, 59, 59); // Include full end day
        
        const format = document.querySelector('input[name="format"]:checked').value;
        
        // Filter history by date range
        const filtered = this.workoutHistory.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= fromDate && entryDate <= toDate;
        });
        
        if (filtered.length === 0) {
            alert('No workout data found in the selected date range.');
            return;
        }
        
        if (format === 'csv') {
            this.exportCSV(filtered);
        } else {
            this.exportJSON(filtered);
        }
        
        this.hideExportModal();
    }

    exportCSV(data) {
        // CSV columns: date, block, week, day, routine, exercises completed, not completed
        const headers = ['Date', 'Block', 'Week', 'Day', 'Routine', 'Exercises Completed', 'Exercises Not Completed'];
        
        const rows = data.map(entry => [
            entry.dateFormatted,
            entry.block,
            entry.week,
            entry.day,
            entry.routine,
            entry.exercisesCompleted.join('; '),
            entry.exercisesNotCompleted.join('; ')
        ]);
        
        // Build CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        this.downloadFile(csvContent, 'mobility-history.csv', 'text/csv');
    }

    exportJSON(data) {
        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, 'mobility-history.json', 'application/json');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.mobilityTracker = new MobilityTracker();
});
