// SUPABASE CLIENT INITIALIZATION
// PENTING: Ganti URL dan KEY di bawah ini dengan project Anda setelah dibuat
const SUPABASE_URL = 'https://ewaeajttfzysftysjkar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3YWVhanR0Znp5c2Z0eXNqa2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NTk0NTYsImV4cCI6MjA4MzAzNTQ1Nn0.n9JcoTjBZQyEdelIoOHnAmkSW3Fbv94XMklzGSb2QRE';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// STATIC DATA
const INITIAL_HAFALAN_JUZ30 = [
    { id: 1, name: 'An-Naba', ayat: 40 },
    { id: 2, name: 'An-Nazi\'at', ayat: 46 },
    { id: 3, name: 'Abasa', ayat: 42 },
    { id: 4, name: 'At-Takwir', ayat: 29 },
    // Simplified list
    { id: 10, name: 'Ad-Dhuha', ayat: 11 },
    { id: 11, name: 'Al-Insyirah', ayat: 8 }
];

const BACAAN_SALAT = [
    'Doa Iftitah', 'Surah Al-Fatihah', 'Bacaan Ruku', 'Bacaan Iktidal',
    'Bacaan Sujud', 'Bacaan Duduk Antara Dua Sujud', 'Tasyahud Awal', 'Tasyahud Akhir'
];

// STATE MANAGEMENT
let currentUser = null;
let currentDate = new Date().toISOString().split('T')[0];

// APP INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Cek session lokal (agar tidak login ulang setiap refresh)
    const session = localStorage.getItem('ejurnal_session');
    if (session) {
        currentUser = JSON.parse(session);
        showApp();
    } else {
        document.getElementById('login-view').classList.remove('hidden');
    }

    // Set Date
    updateDateDisplay();
}

function updateDateDisplay() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = new Date().toLocaleDateString('id-ID', options);
    document.getElementById('current-date-display').textContent = dateStr;
}

// LOGIN LOGIC
function switchLoginTab(role) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.login-form').forEach(form => form.classList.remove('active'));

    const btnIndex = role === 'student' ? 0 : 1;
    document.querySelectorAll('.tab-btn')[btnIndex].classList.add('active');
    document.getElementById(`${role}-login-form`).classList.add('active');
}

async function handleLogin(e, role) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button');
    submitBtn.textContent = 'Memuat...';
    submitBtn.disabled = true;

    try {
        let userToCheck = null;

        if (role === 'student') {
            const nisn = document.getElementById('student-nisn').value;
            // Query Supabase for student
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', nisn)
                .eq('role', 'student')
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'not found'
            userToCheck = data;
        } else {
            const id = document.getElementById('teacher-id').value;
            const pass = document.getElementById('teacher-password').value;
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .eq('role', 'teacher')
                .eq('pin', pass)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            userToCheck = data;
        }

        if (userToCheck) {
            currentUser = userToCheck;
            localStorage.setItem('ejurnal_session', JSON.stringify(currentUser));
            showApp();
        } else {
            alert('Login Gagal! Data tidak ditemukan.');
        }

    } catch (err) {
        console.error('Login Error:', err);
        alert('Terjadi kesalahan koneksi database.');
    } finally {
        submitBtn.textContent = role === 'student' ? 'Masuk Sebagai Siswa' : 'Masuk Sebagai Guru';
        submitBtn.disabled = false;
    }
}

function handleLogout() {
    localStorage.removeItem('ejurnal_session');
    currentUser = null;
    location.reload();
}

function showApp() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');

    if (currentUser.role === 'teacher') {
        document.querySelector('.bottom-nav').classList.add('hidden');
        document.getElementById('student-dashboard').classList.add('hidden');
        document.getElementById('teacher-dashboard').classList.remove('hidden');
        document.getElementById('user-name-display').textContent = currentUser.name;
        loadTeacherDashboard();
    } else {
        document.getElementById('user-name-display').textContent = currentUser.name;
        document.getElementById('profile-name').innerHTML = currentUser.name;
        document.getElementById('profile-role').innerHTML = `Siswa Kelas ${currentUser.class_name}`;
        loadStudentDashboard();
    }
}

// NAVIGATION
function navigateTo(viewId) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    if (['dashboard', 'sholat', 'tadarus', 'profile'].includes(viewId)) {
        const map = { 'dashboard': 0, 'sholat': 1, 'tadarus': 2, 'profile': 3 };
        const navItems = document.querySelectorAll('.nav-item');
        if (map[viewId] !== undefined && navItems[map[viewId]]) {
            navItems[map[viewId]].classList.add('active');
        }
    }

    document.querySelectorAll('.content-view').forEach(el => el.classList.add('hidden'));

    if (viewId === 'dashboard') {
        document.getElementById('student-dashboard').classList.remove('hidden');
        loadStudentDashboard();
    } else if (viewId === 'sholat') {
        document.getElementById('sholat-view').classList.remove('hidden');
        loadSholatData();
    } else if (viewId === 'tadarus') {
        document.getElementById('tadarus-view').classList.remove('hidden');
        loadTadarusHistory();
    } else if (viewId === 'hafalan') {
        document.getElementById('hafalan-view').classList.remove('hidden');
        loadHafalanData();
    } else if (viewId === 'profile') {
        document.getElementById('profile-view').classList.remove('hidden');
    }
}

// --- STUDENT FEATURES ---

// 1. SHOLAT LOGIC
async function loadSholatData() {
    document.querySelectorAll('input[name="sholat"]').forEach(i => i.disabled = true); // Disable while loading

    const { data, error } = await supabase
        .from('journal_sholat')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', currentDate)
        .single();

    const sholatData = data || {}; // If empty, defaults to false

    document.querySelectorAll('input[name="sholat"]').forEach(input => {
        input.checked = sholatData[input.value] === true;
        input.disabled = false;
    });
}

async function saveSholat(checkbox) {
    const prayerName = checkbox.value;
    const isChecked = checkbox.checked;

    // Optimistic UI update handled by toggle, but verify logic
    // We need to upsert.
    // First, verify if row exists or we create it.

    const updatePayload = {
        user_id: currentUser.id,
        date: currentDate,
        [prayerName]: isChecked
    };

    const { error } = await supabase
        .from('journal_sholat')
        .upsert(updatePayload, { onConflict: 'user_id, date' });

    if (error) {
        console.error('Save Error', error);
        alert('Gagal menyimpan data.');
        checkbox.checked = !isChecked; // Revert
    } else {
        showToast('Tersimpan');
        updateDashboardStats();
    }
}

async function updateDashboardStats() {
    const { data } = await supabase
        .from('journal_sholat')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', currentDate)
        .single();

    if (data) {
        let count = 0;
        if (data.subuh) count++;
        if (data.zuhur) count++;
        if (data.asar) count++;
        if (data.magrib) count++;
        if (data.isya) count++;

        const counterEl = document.getElementById('today-sholat-count');
        if (counterEl) counterEl.textContent = `${count}/5`;
    }
}

// 2. TADARUS LOGIC
async function handleTadarusSubmit(e) {
    e.preventDefault();
    const date = document.getElementById('tadarus-date').value;
    const surah = document.getElementById('tadarus-surah').value;
    const ayat = document.getElementById('tadarus-ayat').value;
    const duration = document.querySelector('input[name="duration"]:checked').value;

    const { error } = await supabase
        .from('journal_tadarus')
        .insert({
            user_id: currentUser.id,
            date: date,
            surah: surah,
            ayat: ayat,
            duration: parseInt(duration)
        });

    if (error) {
        console.error('Tadarus fail', error);
        alert('Gagal menyimpan laporan.');
        return;
    }

    showToast('Laporan Tadarus Terkirim');
    e.target.reset();
    document.getElementById('tadarus-date').valueAsDate = new Date();
    loadTadarusHistory();
}

async function loadTadarusHistory() {
    const container = document.getElementById('tadarus-history');
    container.innerHTML = '<p class="text-sm text-muted">Memuat...</p>';

    const { data, error } = await supabase
        .from('journal_tadarus')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('id', { ascending: false }) // desc ID = latest
        .limit(3);

    if (error) return;

    if (data.length === 0) {
        container.innerHTML = '<p class="text-sm text-muted">Belum ada riwayat.</p>';
        return;
    }

    container.innerHTML = data.map(item => `
        <div class="card" style="margin-bottom:10px; padding:10px;">
            <div style="flex:1">
                <strong>${item.surah}</strong> <small>(${item.ayat || '-'})</small><br>
                <small class="text-muted">${item.date} • ${item.duration} Menit</small>
            </div>
        </div>
    `).join('');

    document.getElementById('tadarus-date').valueAsDate = new Date();
}

// 3. HAFALAN LOGIC
function switchHafalanTab(tab) {
    document.querySelectorAll('.h-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.h-content').forEach(c => c.classList.remove('active'));

    if (tab === 'juz30') document.querySelector('button[onclick="switchHafalanTab(\'juz30\')"]').classList.add('active');
    if (tab === 'iqra') document.querySelector('button[onclick="switchHafalanTab(\'iqra\')"]').classList.add('active');
    if (tab === 'bacaan') document.querySelector('button[onclick="switchHafalanTab(\'bacaan\')"]').classList.add('active');

    document.getElementById(`h-tab-${tab}`).classList.add('active');
}

async function loadHafalanData() {
    // Fetch all progress for this user
    const { data: progressData, error } = await supabase
        .from('hafalan_progress')
        .select('*')
        .eq('user_id', currentUser.id);

    const progressMap = {};
    if (progressData) {
        progressData.forEach(p => {
            progressMap[`${p.category}_${p.item_name}`] = p.status;
        });
    }

    // Juz 30 Render
    const juz30Container = document.getElementById('juz30-list');
    juz30Container.innerHTML = INITIAL_HAFALAN_JUZ30.map(surah => {
        const itemKey = `juz30_${surah.name}`; // using name as key to match logic
        const status = progressMap[itemKey] || 'Belum';
        const colorClass = status === 'Lancar' ? 'status-lancar' : (status === 'Mengulang' ? 'status-mengulang' : 'status-belum');

        return `
            <div class="hafalan-item">
                <div class="hafalan-info">
                    <h4>${surah.name}</h4>
                    <span class="${colorClass}">${status}</span>
                </div>
            </div>
        `;
    }).join('');

    // Bacaan Salat Render
    const bacaanContainer = document.getElementById('bacaan-list');
    bacaanContainer.innerHTML = BACAAN_SALAT.map((bacaan) => {
        const itemKey = `bacaan_salat_${bacaan}`;
        const status = progressMap[itemKey] || 'Belum';
        const colorClass = status === 'Lancar' ? 'status-lancar' : (status === 'Cukup' ? 'status-mengulang' : 'status-belum');

        return `
            <div class="hafalan-item">
                <div class="hafalan-info">
                    <h4>${bacaan}</h4>
                    <span class="${colorClass}">${status}</span>
                </div>
            </div>
         `;
    }).join('');
}


// --- TEACHER FEATURES ---
async function loadTeacherDashboard() {
    const listContainer = document.getElementById('teacher-student-list');
    const selectedClass = document.getElementById('teacher-class-select').value;
    listContainer.innerHTML = '<p class="text-center text-muted mt-4">Memuat data...</p>';

    // 1. Get Students
    const { data: students, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'student')
        .eq('class_name', selectedClass);

    if (!students || students.length === 0) {
        listContainer.innerHTML = '<p class="text-center text-muted mt-4">Tidak ada siswa di kelas ini.</p>';
        return;
    }

    // 2. Get Sholat Logs for Today
    // We can do this efficiently by fetching all logs for these students on this date
    const studentIds = students.map(s => s.id);
    const { data: logs } = await supabase
        .from('journal_sholat')
        .select('*')
        .in('user_id', studentIds)
        .eq('date', currentDate);

    // Map logs to students
    const logsMap = {};
    if (logs) {
        logs.forEach(log => logsMap[log.user_id] = log);
    }

    listContainer.innerHTML = students.map(student => {
        const log = logsMap[student.id] || {};
        let count = 0;
        if (log.subuh) count++;
        if (log.zuhur) count++;
        if (log.asar) count++;
        if (log.magrib) count++;
        if (log.isya) count++;

        return `
            <div class="student-list-item">
                <div>
                    <strong>${student.name}</strong><br>
                    <small>NISN: ${student.id}</small>
                </div>
                <div class="text-center">
                    <span class="label" style="font-size:0.75rem; color:#6B7280">Salat Hari Ini</span>
                    <h3 style="color: ${count === 5 ? '#10B981' : '#F59E0B'}">${count}/5</h3>
                </div>
            </div>
        `;
    }).join('');
}

function loadClassData() {
    loadTeacherDashboard();
}

// UTILITIES
function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2000);
}

function loadStudentDashboard() {
    updateDashboardStats();
}

function createClient(url, key) {
    return window.supabase.createClient(url, key);
}
