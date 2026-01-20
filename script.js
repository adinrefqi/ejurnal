// SUPABASE CLIENT INITIALIZATION
// PENTING: Ganti URL dan KEY di bawah ini dengan project Anda setelah dibuat
const SUPABASE_URL = 'https://ewaeajttfzysftysjkar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3YWVhanR0Znp5c2Z0eXNqa2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NTk0NTYsImV4cCI6MjA4MzAzNTQ1Nn0.n9JcoTjBZQyEdelIoOHnAmkSW3Fbv94XMklzGSb2QRE';

// Inisialisasi Supabase dengan Error Handling
let supabase = null;
try {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
        console.error('Window.supabase undefined. Script mungkin belum termuat.');
    }
} catch (err) {
    console.error('Gagal inisialisasi Supabase:', err);
}

// STATIC DATA
const INITIAL_HAFALAN_JUZ30 = [
    { id: 114, name: 'An-Naas' },
    { id: 113, name: 'Al-Falaq' },
    { id: 112, name: 'Al-Ikhlas' },
    { id: 111, name: 'Al-Lahab' },
    { id: 110, name: 'An-Nasr' },
    { id: 109, name: 'Al-Kafirun' },
    { id: 108, name: 'Al-Kautsar' },
    { id: 107, name: 'Al-Ma\'un' },
    { id: 106, name: 'Quraisy' },
    { id: 105, name: 'Al-Fiil' },
    { id: 104, name: 'Al-Humazah' },
    { id: 103, name: 'Al-Ashr' },
    { id: 102, name: 'At-Takatsur' },
    { id: 101, name: 'Al-Qari\'ah' },
    { id: 100, name: 'Al-Adiyat' },
    { id: 99, name: 'Al-Zalzalah' },
    { id: 98, name: 'Al-Bayyinah' },
    { id: 97, name: 'Al-Qadr' },
    { id: 96, name: 'Al-Alaq' },
    { id: 95, name: 'At-Tin' },
    { id: 94, name: 'Al-Insyirah' },
    { id: 93, name: 'Ad-Dhuha' }
];

const BACAAN_SALAT = [
    'Niat Salat Subuh', 'Niat Salat Zuhur', 'Niat Salat Asar', 'Niat Salat Magrib', 'Niat Salat Isya',
    'Doa Iftitah', 'Surah Al-Fatihah', 'Bacaan Ruku', 'Bacaan Iktidal',
    'Bacaan Sujud', 'Bacaan Duduk Antara Dua Sujud', 'Tasyahud Awal', 'Tasyahud Akhir'
];

// STATE MANAGEMENT
let currentUser = null;
let currentDate = new Date().toISOString().split('T')[0];

// APP INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    // Cek koneksi
    if (!supabase) {
        alert('Gagal memuat library database. Mohon cek koneksi internet Anda atau refresh halaman.');
    }
    initApp();
});

function initApp() {
    // Load saved theme
    loadTheme();

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
    const dateEl = document.getElementById('current-date-display');
    if (dateEl) dateEl.textContent = dateStr;
}

// LOGIN LOGIC
function switchLoginTab(role) {
    console.log('Switching tab to:', role);
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.login-form').forEach(form => form.classList.remove('active'));

    const btnIndex = role === 'student' ? 0 : 1;
    const btns = document.querySelectorAll('.tab-btn');
    if (btns[btnIndex]) btns[btnIndex].classList.add('active');

    const form = document.getElementById(`${role}-login-form`);
    if (form) form.classList.add('active');
}

async function handleLogin(e, role) {
    e.preventDefault();

    if (!supabase) {
        alert('Tidak dapat terhubung ke database. Cek internet.');
        return;
    }

    const submitBtn = e.target.querySelector('button');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Memuat...';
    submitBtn.disabled = true;

    try {
        let userToCheck = null;
        let idInput = '';
        let passInput = '';

        if (role === 'student') {
            idInput = document.getElementById('student-nisn').value.trim();
            // Query Supabase for student
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', idInput)
                .eq('role', 'student')
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    alert(`NISN "${idInput}" tidak ditemukan (atau bukan akun Siswa).`);
                } else {
                    throw error;
                }
                return;
            }
            userToCheck = data;

        } else {
            idInput = document.getElementById('teacher-id').value.trim();
            passInput = document.getElementById('teacher-password').value.trim();

            // 1. Cek dulu apakah ID Guru ada
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', idInput)
                .eq('role', 'teacher')
                .single();

            if (userError) {
                if (userError.code === 'PGRST116') {
                    alert(`ID Guru "${idInput}" tidak ditemukan.`);
                } else {
                    throw userError;
                }
                return;
            }

            // 2. Cek Password secara manual (lebih aman untuk debug)
            if (userData.pin !== passInput) {
                // DEBUG MODE: Tampilkan perbandingan agar user tahu salahnya dimana
                alert(`Password salah! \nInput Anda: "${passInput}" \nPassword di Database: "${userData.pin}"`);
                return;
            }

            userToCheck = userData;
        }

        if (userToCheck) {
            currentUser = userToCheck;
            localStorage.setItem('ejurnal_session', JSON.stringify(currentUser));
            showToast('Login Berhasil');
            showApp();
        }

    } catch (err) {
        console.error('Login Error:', err);
        alert('Terjadi kesalahan sistem: ' + (err.message || JSON.stringify(err)));
    } finally {
        submitBtn.textContent = originalText;
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

    // Pastikan role bersih dari spasi
    const role = (currentUser.role || '').trim().toLowerCase();

    // Reset View State: Sembunyikan semua dashboard dulu
    document.getElementById('student-dashboard').classList.add('hidden');
    document.getElementById('teacher-dashboard').classList.add('hidden');

    // Bottom nav default tampil, hide jika guru
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) bottomNav.classList.remove('hidden');

    if (role === 'teacher') {
        if (bottomNav) bottomNav.classList.add('hidden');
        document.getElementById('teacher-dashboard').classList.remove('hidden');
        document.getElementById('user-name-display').textContent = currentUser.name;
        loadTeacherDashboard();
    } else {
        // Default to student
        document.getElementById('student-dashboard').classList.remove('hidden');
        document.getElementById('user-name-display').textContent = currentUser.name;
        document.getElementById('profile-name').innerHTML = currentUser.name;
        // Handle null class_name for robustness
        const className = currentUser.class_name || '-';
        document.getElementById('profile-role').innerHTML = `Siswa Kelas ${className}`;
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
        // FIX: Cek role untuk menentukan dashboard mana yang dibuka
        const role = (currentUser && currentUser.role) ? currentUser.role.trim().toLowerCase() : 'student';

        if (role === 'teacher') {
            document.getElementById('teacher-dashboard').classList.remove('hidden');
            loadTeacherDashboard();
        } else {
            document.getElementById('student-dashboard').classList.remove('hidden');
            loadStudentDashboard();
        }
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
async function loadStudentDashboard() {
    if (!supabase) return;

    // 1. Get today's sholat count
    const { data: todayData } = await supabase
        .from('journal_sholat')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', currentDate)
        .single();

    let todayCount = 0;
    if (todayData) {
        if (todayData.subuh) todayCount++;
        if (todayData.zuhur) todayCount++;
        if (todayData.asar) todayCount++;
        if (todayData.magrib) todayCount++;
        if (todayData.isya) todayCount++;
    }
    const todayEl = document.getElementById('today-sholat-count');
    if (todayEl) todayEl.textContent = `${todayCount}/5`;

    // 2. Calculate Monthly Percentage
    calculateMonthlyStats();
}

async function calculateMonthlyStats() {
    // Get first day of current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const { data: monthLogs, error } = await supabase
        .from('journal_sholat')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('date', firstDay);

    if (error) {
        console.error('Stats Error', error);
        return;
    }

    // Logic: 
    // Total Possible Prayer Points = (Days passed so far) * 5.
    // Score = (Sum of ticks) / Total Possible * 100.

    const daysSoFar = now.getDate();
    const totalPossible = daysSoFar * 5;

    let totalScore = 0;
    if (monthLogs) {
        monthLogs.forEach(log => {
            if (log.subuh) totalScore++;
            if (log.zuhur) totalScore++;
            if (log.asar) totalScore++;
            if (log.magrib) totalScore++;
            if (log.isya) totalScore++;
        });
    }

    // Prevent division by zero
    const percentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

    // Update UI
    const pctEl = document.getElementById('monthly-percentage');
    const statusEl = document.getElementById('exam-status');

    if (pctEl) pctEl.textContent = `${percentage}%`;

    if (statusEl) {
        if (percentage >= 75) {
            statusEl.textContent = 'Boleh Ujian';
            statusEl.style.background = '#DCFCE7'; // green
            statusEl.style.color = '#166534';
        } else {
            statusEl.textContent = 'Belum Cukup';
            statusEl.style.background = '#FEE2E2'; // red
            statusEl.style.color = '#991B1B';
        }
    }
}


// --- SIGNATURE PAD UTILS ---
const signatures = {
    sholat: { canvas: null, ctx: null, drawing: false, hasData: false },
    tadarus: { canvas: null, ctx: null, drawing: false, hasData: false }
};

function initSignaturePads() {
    ['sholat', 'tadarus'].forEach(id => {
        const canvas = document.getElementById(`sig-canvas-${id}`);
        if (!canvas) return;

        // Resize canvas resolution
        // We use a timeout to ensure container is visible/layout calc is correct
        setTimeout(() => {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = 150;

            const ctx = canvas.getContext('2d');
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 2;
            ctx.lineCap = "round";

            signatures[id].canvas = canvas;
            signatures[id].ctx = ctx;
            signatures[id].hasData = false;

            // Clear just in case
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }, 100);

        // Remove old listeners to avoid duplicates (naive approach)
        // Better: just add new ones, browser handles logic.

        // EVENTS
        const start = (e) => startDraw(e, id);
        const move = (e) => draw(e, id);
        const end = () => stopDraw(id);

        // Mouse
        canvas.onmousedown = start;
        canvas.onmousemove = move;
        canvas.onmouseup = end;
        canvas.onmouseout = end;

        // Touch
        canvas.ontouchstart = start;
        canvas.ontouchmove = move;
        canvas.ontouchend = end;
    });
}

function getPointerPos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function startDraw(e, id) {
    if (e.type !== 'mousedown') e.preventDefault(); // prevent scroll on touch

    if (!signatures[id].canvas) return;
    signatures[id].drawing = true;
    signatures[id].hasData = true;
    signatures[id].ctx.beginPath();

    const pos = getPointerPos(e, signatures[id].canvas);
    signatures[id].ctx.moveTo(pos.x, pos.y);
}

function draw(e, id) {
    if (e.type !== 'mousemove') e.preventDefault();

    if (!signatures[id].drawing) return;

    const pos = getPointerPos(e, signatures[id].canvas);
    signatures[id].ctx.lineTo(pos.x, pos.y);
    signatures[id].ctx.stroke();
}

function stopDraw(id) {
    if (signatures[id].drawing) {
        signatures[id].drawing = false;
        signatures[id].ctx.closePath();
    }
}

function clearSignature(id) {
    const s = signatures[id];
    if (s.canvas && s.ctx) {
        s.ctx.clearRect(0, 0, s.canvas.width, s.canvas.height);
        s.hasData = false;
    }
}

// --- SHOLAT LOGIC ---
async function saveSholatSignature() {
    if (!supabase) return;

    const s = signatures['sholat'];
    if (!s.hasData) {
        alert('Silakan tanda tangan orang tua terlebih dahulu.');
        return;
    }

    const dataUrl = s.canvas.toDataURL('image/png');

    // Save to DB
    const updateData = {
        user_id: currentUser.id,
        date: currentDate,
        parent_valid: true,
        parent_signature: dataUrl
    };

    const btn = document.querySelector('button[onclick="saveSholatSignature()"]');
    const originalText = btn.textContent;
    btn.textContent = 'Menyimpan...';
    btn.disabled = true;

    const { error } = await supabase
        .from('journal_sholat')
        .upsert(updateData, { onConflict: 'user_id, date' });

    btn.textContent = originalText;
    btn.disabled = false;

    if (error) {
        alert('Gagal menyimpan: ' + error.message);
    } else {
        showToast('Validasi Orang Tua Tersimpan!');
        loadSholatData();
    }
}

// Updated loadSholatData 
async function loadSholatData() {
    // Reset inputs
    document.querySelectorAll('input[name="sholat"]').forEach(el => {
        el.checked = false;
        el.disabled = false;
    });
    // Don't clear signature canvas immediately if we want to show it, 
    // but usually new session starts blank or we indicate it's done.
    clearSignature('sholat');

    // UI Date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateDisplay = document.getElementById('current-date-display');
    if (dateDisplay) dateDisplay.textContent = new Date().toLocaleDateString('id-ID', options);

    if (!supabase) return;

    const { data, error } = await supabase
        .from('journal_sholat')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', currentDate)
        .single();

    // Init pads when view loads
    initSignaturePads();

    if (error) {
        if (error.code !== 'PGRST116') console.error(error);
        return;
    }

    if (data) {
        if (data.subuh) document.querySelector('input[value="subuh"]').checked = true;
        if (data.zuhur) document.querySelector('input[value="zuhur"]').checked = true;
        if (data.asar) document.querySelector('input[value="asar"]').checked = true;
        if (data.magrib) document.querySelector('input[value="magrib"]').checked = true;
        if (data.isya) document.querySelector('input[value="isya"]').checked = true;

        const statusEl = document.getElementById('sholat-valid-indicator');
        if (statusEl) {
            if (data.parent_valid) {
                statusEl.innerHTML = '<span style="color:#10B981; font-weight:bold;"><i class="fas fa-check-circle"></i> Sudah Valid</span>';

                // If signature exists, maybe disable saving again today?
                // Or let them overwrite.
                // We could also attempt to load the image into the canvas if desired, 
                // but usually signatures are write-only for inputs.
            } else {
                statusEl.textContent = 'Belum TTD';
            }
        }
    }
}

async function saveSholat(checkbox) {
    // Normal Checkbox logic for prayers
    if (!supabase) return;

    const field = checkbox.value;
    const isChecked = checkbox.checked;

    if (field === 'parent_valid') return; // Handled by signature now

    const updateData = {};
    updateData[field] = isChecked;
    updateData['user_id'] = currentUser.id;
    updateData['date'] = currentDate;

    const { error } = await supabase
        .from('journal_sholat')
        .upsert(updateData, { onConflict: 'user_id, date' });

    if (error) {
        alert('Gagal menyimpan: ' + error.message);
        checkbox.checked = !isChecked;
    } else {
        showToast('Tersimpan');
        loadStudentDashboard(); // Refresh dashboard stats after saving
    }
}


// 2. TADARUS LOGIC
async function handleTadarusSubmit(e) {
    e.preventDefault();
    if (!supabase) return;

    // Check Signature
    const s = signatures['tadarus'];
    if (!s.hasData) {
        alert('Tanda tangan orang tua wajib diisi untuk validasi.');
        return;
    }
    const signatureImg = s.canvas.toDataURL('image/png');

    const date = document.getElementById('tadarus-date').value;
    const surah = document.getElementById('tadarus-surah').value;
    const ayat = document.getElementById('tadarus-ayat').value;

    // Get radio value
    let duration = 5;
    document.querySelectorAll('input[name="duration"]').forEach(r => {
        if (r.checked) duration = r.value;
    });

    const submitBtn = e.target.querySelector('button');
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    submitBtn.disabled = true;

    const { error } = await supabase
        .from('journal_tadarus')
        .insert({
            user_id: currentUser.id,
            date: date,
            surah: surah,
            ayat: ayat,
            duration: parseInt(duration),
            parent_valid: true,
            parent_signature: signatureImg
        });

    submitBtn.innerHTML = 'Simpan Laporan';
    submitBtn.disabled = false;

    if (error) {
        alert('Gagal menyimpan: ' + error.message);
    } else {
        showToast('Laporan Tadarus Terkirim!');
        e.target.reset();
        clearSignature('tadarus');

        document.getElementById('tadarus-date').valueAsDate = new Date();
        document.getElementById('d5').checked = true;
        loadTadarusHistory();
    }
}

async function loadTadarusHistory() {
    if (!supabase) return;
    const list = document.getElementById('tadarus-history');
    list.innerHTML = 'Loading...';

    // Init pads as well just in case tab refreshed
    initSignaturePads();

    const { data: logs, error } = await supabase
        .from('journal_tadarus')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('date', { ascending: false })
        .limit(5);

    if (!logs || logs.length === 0) {
        list.innerHTML = '<p class="text-muted text-center text-sm">Belum ada riwayat.</p>';
        return;
    }

    list.innerHTML = logs.map(item => `
        <div class="card mb-2 p-2" style="border-left: 3px solid ${item.parent_valid ? '#10B981' : '#E5E7EB'}">
            <div style="display:flex; justify-content:space-between; align-items:flex-start">
                <div>
                    <strong>QS. ${item.surah}</strong>
                    <div class="text-sm">${item.duration}m • ${new Date(item.date).toLocaleDateString('id-ID')}</div>
                </div>
                ${item.parent_signature ? `<img src="${item.parent_signature}" class="signature-thumb" alt="Paraf">` : ''}
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
    if (!supabase) return;
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
    juz30Container.innerHTML = '<div class="hafalan-container">' + INITIAL_HAFALAN_JUZ30.map(surah => {
        const itemKey = `juz30_${surah.name}`;
        const status = progressMap[itemKey] || 'Belum';

        let statusClass = 'belum';
        let iconClass = 'fa-book-open';
        let statusIcon = 'fa-circle'; // small dot

        if (status === 'Lancar') {
            statusClass = 'lancar';
            iconClass = 'fa-check-circle';
            statusIcon = 'fa-check';
        } else if (status === 'Mengulang') {
            statusClass = 'mengulang';
            iconClass = 'fa-sync-alt';
            statusIcon = 'fa-history';
        }

        return `
            <div class="hafalan-card">
                <div class="hafalan-icon">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="hafalan-content">
                    <h4>${surah.name}</h4>
                    <span class="status-badge ${statusClass}">
                        <i class="fas ${statusIcon}" style="font-size:0.7em"></i> ${status}
                    </span>
                </div>
            </div>
        `;
    }).join('') + '</div>';

    // Bacaan Salat Render
    const bacaanContainer = document.getElementById('bacaan-list');
    bacaanContainer.innerHTML = '<div class="hafalan-container">' + BACAAN_SALAT.map((bacaan) => {
        const itemKey = `bacaan_salat_${bacaan}`;
        const status = progressMap[itemKey] || 'Belum';

        // Similar logic
        let statusClass = 'belum';
        let iconClass = 'fa-hands-praying'; // modern fontawesome might be fa-praying-hands
        if (status === 'Lancar') {
            statusClass = 'lancar';
            iconClass = 'fa-check-circle';
        } else if (status === 'Cukup') { // Treat 'Cukup' as warning/mengulang level
            statusClass = 'mengulang';
        }

        return `
            <div class="hafalan-card">
                <div class="hafalan-icon">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="hafalan-content">
                    <h4>${bacaan}</h4>
                    <span class="status-badge ${statusClass}">
                       ${status}
                    </span>
                </div>
            </div>
         `;
    }).join('') + '</div>';

    // IQRA RENDER (Student View)
    const iqraVol = progressMap['iqra_volume'] || '-';
    const iqraPage = progressMap['iqra_page'] || '-';

    const iqraVolEl = document.getElementById('iqra-volume');
    const iqraPageEl = document.getElementById('iqra-page');
    if (iqraVolEl) iqraVolEl.textContent = iqraVol;
    if (iqraPageEl) iqraPageEl.textContent = iqraPage;
}



// --- TEACHER FEATURES ---
// Global variable to track selected student in detailed view
let currentDetailStudent = null;
let currentHafalanFilter = 'juz30';

async function loadTeacherDashboard() {
    if (!supabase) return;
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
        document.getElementById('teacher-total-students').textContent = '0';
        return;
    }

    document.getElementById('teacher-total-students').textContent = students.length;

    // 2. Get Sholat Logs for Today AND Monthly stats
    const studentIds = students.map(s => s.id);

    // Get Date boundaries
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    // Bulk fetch monthly logs for all students in this class
    const { data: allLogs } = await supabase
        .from('journal_sholat')
        .select('*')
        .in('user_id', studentIds)
        .gte('date', firstDay);

    // Process logs
    const todayMap = {};
    const monthStats = {}; // { userId: percentage }

    // Init stats for all students
    const daysSoFar = now.getDate();
    const totalPossible = daysSoFar * 5;

    studentIds.forEach(id => {
        monthStats[id] = 0; // total score
    });

    if (allLogs) {
        allLogs.forEach(log => {
            // Count score
            let score = 0;
            if (log.subuh) score++;
            if (log.zuhur) score++;
            if (log.asar) score++;
            if (log.magrib) score++;
            if (log.isya) score++;

            if (monthStats[log.user_id] !== undefined) {
                monthStats[log.user_id] += score;
            }

            // If today, also add to todayMap
            if (log.date === currentDate) {
                todayMap[log.user_id] = log;
            }
        });
    }

    listContainer.innerHTML = students.map(student => {
        const log = todayMap[student.id] || {};
        // Today count
        let count = 0;
        if (log.subuh) count++;
        if (log.zuhur) count++;
        if (log.asar) count++;
        if (log.magrib) count++;
        if (log.isya) count++;

        // Month Percentage
        const totalScore = monthStats[student.id] || 0;
        const percentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

        let pctColor = '#F59E0B'; // yellow
        if (percentage >= 75) pctColor = '#10B981'; // green
        if (percentage < 50) pctColor = '#EF4444'; // red

        return `
            <div class="student-list-item" onclick="openStudentDetail('${student.id}')" style="cursor:pointer">
                <div>
                    <strong>${student.name}</strong><br>
                    <small>NISN: ${student.id}</small>
                </div>
                <div class="text-right" style="display:flex; align-items:center; gap:15px;">
                    <div style="text-align:right;">
                        <span class="label" style="font-size:0.65rem; color:#6B7280; display:block;">Bulan Ini</span>
                        <strong style="color:${pctColor}; font-size:1.1rem;">${percentage}%</strong>
                    </div>
                    <div style="width:1px; height:30px; background:#E5E7EB;"></div>
                    <div style="text-align:right;">
                        <span class="label" style="font-size:0.65rem; color:#6B7280; display:block;">Hari Ini</span>
                        <h3 style="color: ${count === 5 ? '#10B981' : '#F59E0B'}; font-size:1.1rem; margin:0;">${count}/5</h3>
                    </div>
                    <i class="fas fa-chevron-right text-muted" style="margin-left:5px;"></i>
                </div>
            </div>
        `;
    }).join('');
}

function loadClassData() {
    loadTeacherDashboard();
}

// TEACHER: DETAIL VIEW LOGIC
async function openStudentDetail(studentId) {
    if (!supabase) return;

    // Switch View
    document.querySelectorAll('.content-view').forEach(el => el.classList.add('hidden'));
    document.getElementById('teacher-detail-view').classList.remove('hidden');

    // Fetch Student Info
    const { data: student } = await supabase
        .from('users')
        .select('*')
        .eq('id', studentId)
        .single();

    if (!student) return;
    currentDetailStudent = student;

    document.getElementById('detail-student-name').textContent = student.name;
    document.getElementById('detail-student-id').textContent = student.id;

    // Default Tab
    switchDetailTab('d-sholat');
}

function switchDetailTab(tabId) {
    const container = document.getElementById('teacher-detail-view');

    // 1. Update Tab Buttons State
    container.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (tabId === 'd-sholat') container.querySelector('.tab-btn:nth-child(1)').classList.add('active');
    if (tabId === 'd-tadarus') container.querySelector('.tab-btn:nth-child(2)').classList.add('active');
    if (tabId === 'd-hafalan') container.querySelector('.tab-btn:nth-child(3)').classList.add('active');

    // 2. Update Content Visibility
    // We must handle both 'hidden' utility and 'active' class used in CSS
    container.querySelectorAll('.detail-content').forEach(c => {
        c.classList.remove('active');
        c.classList.add('hidden');
    });

    const activeContent = document.getElementById(`tab-${tabId}`);
    if (activeContent) {
        activeContent.classList.add('active');
        activeContent.classList.remove('hidden');
    }

    // 3. Load Data
    if (tabId === 'd-sholat') loadDetailSholat();
    if (tabId === 'd-tadarus') loadDetailTadarus();
    if (tabId === 'd-hafalan') loadDetailHafalan();
}

async function loadDetailSholat() {
    const list = document.getElementById('detail-sholat-list');
    list.innerHTML = 'Loading...';

    // Get last 7 days logs
    const { data: logs } = await supabase
        .from('journal_sholat')
        .select('*')
        .eq('user_id', currentDetailStudent.id)
        .order('date', { ascending: false })
        .limit(7);

    if (!logs || logs.length === 0) {
        list.innerHTML = '<p class="text-muted text-center">Belum ada data salat.</p>';
        return;
    }

    let html = '<div class="sholat-log-list">';
    logs.forEach(log => {
        const d = new Date(log.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        // Initial of prayer names
        const prayers = [
            { k: 'S', v: log.subuh },
            { k: 'Z', v: log.zuhur },
            { k: 'A', v: log.asar },
            { k: 'M', v: log.magrib },
            { k: 'I', v: log.isya }
        ];

        const prayersHtml = prayers.map(p => `
            <div class="p-dot ${p.v ? 'done' : ''}" title="${p.k === 'S' ? 'Subuh' : p.k === 'Z' ? 'Zuhur' : p.k === 'A' ? 'Asar' : p.k === 'M' ? 'Magrib' : 'Isya'}">${p.k}</div>
        `).join('');

        const validHtml = log.parent_valid
            ? '<i class="fas fa-check-circle" style="color:#10B981; font-size:1.1rem;"></i>'
            : '<i class="fas fa-times-circle" style="color:#E5E7EB; font-size:1.1rem;"></i>';

        html += `
            <div class="sholat-log-card">
                <div class="log-main-row">
                    <div class="log-date">${d}</div>
                    <div class="log-prayers">
                        ${prayersHtml}
                    </div>
                    <div class="log-valid">
                        ${validHtml}
                    </div>
                </div>
                <div class="log-actions-row">
                    <button class="action-btn-full edit" onclick="editSholatLog(${log.id}, '${log.date}', ${log.subuh}, ${log.zuhur}, ${log.asar}, ${log.magrib}, ${log.isya})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn-full delete" onclick="deleteSholatLog(${log.id})">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    list.innerHTML = html;
}

async function loadDetailTadarus() {
    const list = document.getElementById('detail-tadarus-list');
    list.innerHTML = 'Loading...';

    const { data: logs } = await supabase
        .from('journal_tadarus')
        .select('*')
        .eq('user_id', currentDetailStudent.id)
        .order('date', { ascending: false });

    if (!logs || logs.length === 0) {
        list.innerHTML = '<p class="text-muted text-center mt-4">Belum ada riwayat tadarus.</p>';
        return;
    }

    list.innerHTML = logs.map(item => `
        <div class="tadarus-log-card">
            <div class="tadarus-content">
                <div class="tadarus-title">
                    <strong>QS. ${item.surah}</strong> <small>(${item.ayat || '-'})</small>
                </div>
                <div class="tadarus-meta">
                    <span><i class="far fa-calendar"></i> ${new Date(item.date).toLocaleDateString('id-ID')}</span>
                    <span><i class="far fa-clock"></i> ${item.duration} Mnt</span>
                    ${item.parent_valid ? '<span class="validated"><i class="fas fa-check-circle"></i> Valid</span>' : ''}
                </div>
            </div>
            <div class="log-actions-row">
                <button class="action-btn-full edit" onclick="editTadarusLog(${item.id}, '${item.date}', '${item.surah}', '${item.ayat || ''}', ${item.duration})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn-full delete" onclick="deleteTadarusLog(${item.id})">
                    <i class="fas fa-trash"></i> Hapus
                </button>
            </div>
        </div>
    `).join('');
}

function switchTeacherHafalanFilter(filter) {
    currentHafalanFilter = filter;

    document.querySelectorAll('.hafalan-tabs .h-tab').forEach(btn => btn.classList.remove('active'));
    // Simple logic match text
    if (filter === 'juz30') document.querySelector('.hafalan-tabs .h-tab:nth-child(1)').classList.add('active');
    if (filter === 'iqra') document.querySelector('.hafalan-tabs .h-tab:nth-child(2)').classList.add('active');
    if (filter === 'bacaan') document.querySelector('.hafalan-tabs .h-tab:nth-child(3)').classList.add('active');

    loadDetailHafalan();
}

async function loadDetailHafalan() {
    const list = document.getElementById('detail-hafalan-list');
    list.innerHTML = 'Loading...';

    // Fetch user progress
    const { data: progress } = await supabase
        .from('hafalan_progress')
        .select('*')
        .eq('user_id', currentDetailStudent.id);

    const progressMap = {};
    if (progress) progress.forEach(p => progressMap[`${p.category}_${p.item_name}`] = p.status);

    // SPECIAL HANDLING FOR IQRA
    if (currentHafalanFilter === 'iqra') {
        const currentVol = progressMap['iqra_volume'] || '1';
        const currentPage = progressMap['iqra_page'] || '1';

        // ensure tempIqraVol is synced
        tempIqraVol = currentVol;

        list.innerHTML = `
            <div class="card" style="padding:15px; display:flex; flex-direction:column; gap:15px; text-align:center;">
                <h4 style="margin:0; color:#4B5563; font-size:1rem;">Update Pencapaian Iqra'</h4>
                
                <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:15px; align-items:flex-end;">
                    
                    <!-- Jilid Selection -->
                    <div class="form-group" style="margin:0;">
                        <label style="display:block; text-align:center; font-weight:600; margin-bottom:5px; font-size:0.75rem; color:#6B7280;">Jilid</label>
                        <div style="display:flex; gap:3px;">
                            ${[1, 2, 3, 4, 5, 6].map(v => `
                                <button onclick="updateIqraVolume('${v}')" class="status-btn ${currentVol == v ? 'active' : ''}" style="border:1px solid #E2E8F0; width:30px; height:35px; font-size:0.9rem; padding:0;">${v}</button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Page Input -->
                    <div class="form-group" style="margin:0;">
                        <label style="display:block; text-align:center; font-weight:600; margin-bottom:5px; font-size:0.75rem; color:#6B7280;">Hal. Terakhir</label>
                        <div style="display:flex; align-items:center; justify-content:center; gap:5px;">
                             <button onclick="updateIqraPage(${parseInt(currentPage) - 1})" 
                                 style="width:28px; height:28px; border-radius:50%; background:#F3F4F6; border:1px solid #E5E7EB; font-size:0.8rem; color:#6B7280; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                                 <i class="fas fa-minus" style="font-size:0.6rem;"></i>
                             </button>
                             
                             <input type="number" id="input-iqra-page" value="${currentPage}" min="1" onchange="updateIqraPage(this.value)"
                                 style="width:50px; text-align:center; font-weight:700; font-size:1.1rem; border:1px solid #E5E7EB; border-radius:6px; background:white; color:#1F2937; -moz-appearance: textfield; padding:2px 0;">
                             
                             <button onclick="updateIqraPage(${parseInt(currentPage) + 1})" 
                                 style="width:28px; height:28px; border-radius:50%; background:#10B981; border:none; font-size:0.8rem; color:white; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 2px 4px -1px rgba(16, 185, 129, 0.4);">
                                 <i class="fas fa-plus" style="font-size:0.6rem;"></i>
                             </button>
                        </div>
                    </div>

                </div>

                <button onclick="saveIqraProgress()" class="btn-primary full-width" style="padding:10px; font-size:0.9rem;">
                    <i class="fas fa-save"></i> Simpan
                </button>
            </div>
        `;
        return;
    }

    // Determine Items List
    let items = [];
    if (currentHafalanFilter === 'juz30') {
        items = INITIAL_HAFALAN_JUZ30.map(s => ({ name: s.name, key: 'juz30' }));
    } else {
        items = BACAAN_SALAT.map(s => ({ name: s, key: 'bacaan_salat' }));
    }

    list.innerHTML = items.map(item => {
        const fullKey = `${item.key}_${item.name}`; // e.g juz30_An-Naas
        const status = progressMap[fullKey] || 'Belum';

        const btnClass = (s) => status === s ? 'active' : '';

        return `
            <div class="edit-hafalan-item">
                <span class="item-name">${item.name}</span>
                <div class="edit-controls">
                    <button class="status-btn btn-belum ${btnClass('Belum')}" onclick="updateStudentHafalan('${item.key}', '${item.name}', 'Belum')">
                        <i class="fas fa-times-circle"></i> Belum
                    </button>
                    <button class="status-btn btn-ulang ${btnClass('Mengulang')}" onclick="updateStudentHafalan('${item.key}', '${item.name}', 'Mengulang')">
                        <i class="fas fa-history"></i> Ulang
                    </button>
                    <button class="status-btn btn-lancar ${btnClass('Lancar')}" onclick="updateStudentHafalan('${item.key}', '${item.name}', 'Lancar')">
                        <i class="fas fa-check-circle"></i> Lancar
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// IQRA UTILS FOR TEACHER
let tempIqraVol = null;
function updateIqraVolume(v) {
    tempIqraVol = v;
    // Visually update buttons
    const container = document.getElementById('detail-hafalan-list');
    container.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
    // We just clicked one, add active to it. event.target might be the button
    // But since event is global in inline handler context...
    // Let's rely on finding by text content if possible or just careful DOM transversal
    // Simpler: just re-render is wasteful. Let's assume the button passed 'this' but it didn't.
    // Use event.target
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

function updateIqraPage(val) {
    if (val < 1) val = 1;
    document.getElementById('input-iqra-page').value = val;
}

async function saveIqraProgress() {
    const page = document.getElementById('input-iqra-page').value;
    let vol = tempIqraVol;

    // Safety check if user didn't click any volume button (kept existing)
    if (!vol) {
        // This happens if I didn't click volume but clicked save.
        // tempIqraVol is set in loadDetailHafalan initially
    }

    if (!vol) vol = "1";

    const updates = [
        { user_id: currentDetailStudent.id, category: 'iqra', item_name: 'volume', status: vol.toString() },
        { user_id: currentDetailStudent.id, category: 'iqra', item_name: 'page', status: page.toString() }
    ];

    const { error } = await supabase.from('hafalan_progress').upsert(updates, { onConflict: 'user_id, category, item_name' });

    if (error) alert('Gagal: ' + error.message);
    else showToast('Pencapaian Iqra Tersimpan');
}


async function updateStudentHafalan(category, itemName, newStatus) {
    // Optimistic UI could be added but let's just reload for safety or simple CSS toggle.
    // Actually full reload is cleanest to ensure sync.

    const { error } = await supabase
        .from('hafalan_progress')
        .upsert({
            user_id: currentDetailStudent.id,
            category: category,
            item_name: itemName,
            status: newStatus
        }, { onConflict: 'user_id, category, item_name' });

    if (error) {
        alert('Gagal update status: ' + error.message);
    } else {
        // Refresh just this part
        loadDetailHafalan();
    }
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

// ========== THEME TOGGLE ==========
function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('theme-icon');

    if (body.classList.contains('dark-theme')) {
        // Switch to light mode
        body.classList.remove('dark-theme');
        if (icon) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
        localStorage.setItem('ejurnal_theme', 'light');
        showToast('Tema Terang Aktif');
    } else {
        // Switch to dark mode
        body.classList.add('dark-theme');
        if (icon) {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
        localStorage.setItem('ejurnal_theme', 'dark');
        showToast('Tema Gelap Aktif');
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('ejurnal_theme');
    const icon = document.getElementById('theme-icon');

    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (icon) {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    } else {
        document.body.classList.remove('dark-theme');
        if (icon) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    }
}

// ========== EDIT & DELETE FUNCTIONS (GURU/ADMIN ONLY) ==========

// --- SHOLAT ---
function editSholatLog(id, date, subuh, zuhur, asar, magrib, isya) {
    const formattedDate = new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const modalHtml = `
        <div id="edit-modal" class="edit-modal-overlay" onclick="closeEditModal(event)">
            <div class="edit-modal-content" onclick="event.stopPropagation()">
                <div class="edit-modal-header">
                    <h3><i class="fas fa-edit"></i> Edit Jurnal Salat</h3>
                    <button class="close-modal-btn" onclick="closeEditModal()"><i class="fas fa-times"></i></button>
                </div>
                <p class="edit-date-label"><i class="far fa-calendar"></i> ${formattedDate}</p>
                <form id="edit-sholat-form" class="edit-form">
                    <div class="edit-checkbox-group">
                        <label class="edit-checkbox">
                            <input type="checkbox" name="subuh" ${subuh ? 'checked' : ''}>
                            <span>Subuh</span>
                        </label>
                        <label class="edit-checkbox">
                            <input type="checkbox" name="zuhur" ${zuhur ? 'checked' : ''}>
                            <span>Zuhur</span>
                        </label>
                        <label class="edit-checkbox">
                            <input type="checkbox" name="asar" ${asar ? 'checked' : ''}>
                            <span>Asar</span>
                        </label>
                        <label class="edit-checkbox">
                            <input type="checkbox" name="magrib" ${magrib ? 'checked' : ''}>
                            <span>Magrib</span>
                        </label>
                        <label class="edit-checkbox">
                            <input type="checkbox" name="isya" ${isya ? 'checked' : ''}>
                            <span>Isya</span>
                        </label>
                    </div>
                    <div class="edit-modal-actions">
                        <button type="button" class="btn-cancel" onclick="closeEditModal()">Batal</button>
                        <button type="button" class="btn-primary" onclick="saveSholatEdit(${id})">
                            <i class="fas fa-save"></i> Simpan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function saveSholatEdit(id) {
    const form = document.getElementById('edit-sholat-form');
    const updateData = {
        subuh: form.querySelector('input[name="subuh"]').checked,
        zuhur: form.querySelector('input[name="zuhur"]').checked,
        asar: form.querySelector('input[name="asar"]').checked,
        magrib: form.querySelector('input[name="magrib"]').checked,
        isya: form.querySelector('input[name="isya"]').checked
    };

    const { error } = await supabase
        .from('journal_sholat')
        .update(updateData)
        .eq('id', id);

    if (error) {
        alert('Gagal menyimpan: ' + error.message);
    } else {
        showToast('Jurnal Salat Diperbarui');
        closeEditModal();
        loadDetailSholat();
    }
}

async function deleteSholatLog(id) {
    if (!confirm('Yakin ingin menghapus data salat ini?')) return;

    const { error } = await supabase
        .from('journal_sholat')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Gagal menghapus: ' + error.message);
    } else {
        showToast('Data Salat Dihapus');
        loadDetailSholat();
    }
}

// --- TADARUS ---
function editTadarusLog(id, date, surah, ayat, duration) {
    const formattedDate = new Date(date).toISOString().split('T')[0];

    const modalHtml = `
        <div id="edit-modal" class="edit-modal-overlay" onclick="closeEditModal(event)">
            <div class="edit-modal-content" onclick="event.stopPropagation()">
                <div class="edit-modal-header">
                    <h3><i class="fas fa-edit"></i> Edit Jurnal Tadarus</h3>
                    <button class="close-modal-btn" onclick="closeEditModal()"><i class="fas fa-times"></i></button>
                </div>
                <form id="edit-tadarus-form" class="edit-form">
                    <div class="form-group">
                        <label>Tanggal</label>
                        <input type="date" name="date" value="${formattedDate}" required>
                    </div>
                    <div class="form-group">
                        <label>Nama Surah</label>
                        <input type="text" name="surah" value="${surah}" required>
                    </div>
                    <div class="form-group">
                        <label>Ayat</label>
                        <input type="text" name="ayat" value="${ayat}" placeholder="Contoh: 1-10">
                    </div>
                    <div class="form-group">
                        <label>Durasi (menit)</label>
                        <input type="number" name="duration" value="${duration}" min="1" required>
                    </div>
                    <div class="edit-modal-actions">
                        <button type="button" class="btn-cancel" onclick="closeEditModal()">Batal</button>
                        <button type="button" class="btn-primary" onclick="saveTadarusEdit(${id})">
                            <i class="fas fa-save"></i> Simpan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function saveTadarusEdit(id) {
    const form = document.getElementById('edit-tadarus-form');
    const updateData = {
        date: form.querySelector('input[name="date"]').value,
        surah: form.querySelector('input[name="surah"]').value,
        ayat: form.querySelector('input[name="ayat"]').value,
        duration: parseInt(form.querySelector('input[name="duration"]').value)
    };

    const { error } = await supabase
        .from('journal_tadarus')
        .update(updateData)
        .eq('id', id);

    if (error) {
        alert('Gagal menyimpan: ' + error.message);
    } else {
        showToast('Jurnal Tadarus Diperbarui');
        closeEditModal();
        loadDetailTadarus();
    }
}

async function deleteTadarusLog(id) {
    if (!confirm('Yakin ingin menghapus data tadarus ini?')) return;

    const { error } = await supabase
        .from('journal_tadarus')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Gagal menghapus: ' + error.message);
    } else {
        showToast('Data Tadarus Dihapus');
        loadDetailTadarus();
    }
}

// --- MODAL UTILS ---
function closeEditModal(event) {
    if (event && event.target.id !== 'edit-modal') return;
    const modal = document.getElementById('edit-modal');
    if (modal) modal.remove();
}
