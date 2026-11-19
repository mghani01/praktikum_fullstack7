const API_BASE = 'backend';

// State aplikasi
let daftarMahasiswa = [];
let idAkanDihapus = null;

// Selektor DOM
const form = document.getElementById('mahasiswa-form');
const modePill = document.getElementById('mode-pill');
const formTitle = document.getElementById('form-title');
const formSubtitle = document.getElementById('form-subtitle');
const inputId = document.getElementById('mahasiswa-id');
const inputNama = document.getElementById('nama');
const inputNim = document.getElementById('nim');
const btnSubmit = document.getElementById('btn-submit');
const btnCancel = document.getElementById('btn-cancel');
const searchInput = document.getElementById('search-input');
const tabelBody = document.getElementById('tabel-mahasiswa');
const totalCount = document.getElementById('total-count');

// Modal & Toast
const deleteModal = document.getElementById('delete-modal');
const modalDesc = document.getElementById('modal-desc');
const btnModalCancel = document.getElementById('btn-modal-cancel');
const btnModalConfirm = document.getElementById('btn-modal-confirm');
const toastContainer = document.getElementById('toast-container');

// Utilitas: Toast Notifikasi
function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : ''}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

// Utilitas: Sanitasi HTML & Format Teks
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function getInitials(nama) {
  const parts = nama.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatWaktu(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp.replace(' ', 'T'));
  if (isNaN(date.getTime())) return timestamp;
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Render Tabel Mahasiswa
function renderTable(data) {
  totalCount.textContent = daftarMahasiswa.length;

  if (data.length === 0) {
    const pesan = daftarMahasiswa.length === 0
      ? 'Belum ada data mahasiswa. Silakan tambah melalui formulir di samping.'
      : 'Data yang cocok dengan pencarian tidak ditemukan.';
    tabelBody.innerHTML = `<tr><td colspan="5" class="empty-state">${pesan}</td></tr>`;
    return;
  }

  tabelBody.innerHTML = data.map((mhs, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>
        <div class="student-cell">
          <span class="avatar">${escapeHtml(getInitials(mhs.nama))}</span>
          <span class="student-name">${escapeHtml(mhs.nama)}</span>
        </div>
      </td>
      <td><span class="nim-badge">${escapeHtml(mhs.nim)}</span></td>
      <td><span class="time-text">${escapeHtml(formatWaktu(mhs.created_at))}</span></td>
      <td class="text-right">
        <div class="action-group">
          <button type="button" class="btn-icon" data-action="edit" data-id="${mhs.id}">Edit</button>
          <button type="button" class="btn-icon delete" data-action="delete" data-id="${mhs.id}">Hapus</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Ambil Data dari backend/read.php
async function loadMahasiswa() {
  try {
    const response = await axios.get(`${API_BASE}/read.php`);
    daftarMahasiswa = response.data.data || [];
    filterDanRender();
  } catch (error) {
    tabelBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">Gagal terhubung ke server PHP. Pastikan Apache &amp; MySQL aktif.</td>
      </tr>
    `;
  }
}

// Filter Pencarian Live
function filterDanRender() {
  const keyword = searchInput.value.trim().toLowerCase();
  if (!keyword) {
    renderTable(daftarMahasiswa);
    return;
  }
  const hasil = daftarMahasiswa.filter(
    (item) =>
      item.nama.toLowerCase().includes(keyword) ||
      item.nim.toLowerCase().includes(keyword)
  );
  renderTable(hasil);
}

searchInput.addEventListener('input', filterDanRender);

// Mode Form: Tambah vs Edit
function setEditMode(mhs) {
  inputId.value = mhs.id;
  inputNama.value = mhs.nama;
  inputNim.value = mhs.nim;

  modePill.textContent = 'Mode Edit';
  modePill.classList.add('is-editing');
  formTitle.textContent = 'Perbarui Data Mahasiswa';
  formSubtitle.textContent = `Mengubah data untuk NIM ${mhs.nim}`;
  btnSubmit.textContent = 'Simpan Perubahan';
  btnCancel.classList.remove('hidden');
  inputNama.focus();
}

function resetForm() {
  inputId.value = '';
  form.reset();

  modePill.textContent = 'Tambah Baru';
  modePill.classList.remove('is-editing');
  formTitle.textContent = 'Input Data Mahasiswa';
  formSubtitle.textContent = 'Lengkapi nama lengkap dan NIM untuk menyimpan ke database.';
  btnSubmit.textContent = 'Simpan Data';
  btnCancel.classList.add('hidden');
}

btnCancel.addEventListener('click', resetForm);

// Submit Form (Create / Update)
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = inputId.value.trim();
  const nama = inputNama.value.trim();
  const nim = inputNim.value.trim();

  if (!nama || !nim) {
    showToast('Nama dan NIM wajib diisi.', true);
    return;
  }

  btnSubmit.disabled = true;
  const teksAsli = btnSubmit.textContent;
  btnSubmit.textContent = 'Menyimpan...';

  try {
    if (id === '') {
      const res = await axios.post(`${API_BASE}/create.php`, { nama, nim });
      showToast(res.data.message || 'Data berhasil disimpan');
    } else {
      const res = await axios.put(`${API_BASE}/update.php`, {
        id: Number(id),
        nama,
        nim,
      });
      showToast(res.data.message || 'Data berhasil diperbarui');
      resetForm();
    }

    form.reset();
    await loadMahasiswa();
  } catch (error) {
    const pesanError = error.response?.data?.message || 'Gagal memproses permintaan ke server';
    showToast(pesanError, true);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = inputId.value ? 'Simpan Perubahan' : 'Simpan Data';
  }
});

// Event Delegation untuk Tombol Edit & Hapus di Tabel
tabelBody.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const id = Number(btn.dataset.id);
  const targetMhs = daftarMahasiswa.find((item) => Number(item.id) === id);
  if (!targetMhs) return;

  if (action === 'edit') {
    setEditMode(targetMhs);
  } else if (action === 'delete') {
    idAkanDihapus = id;
    modalDesc.textContent = `Anda akan menghapus data "${targetMhs.nama}" (${targetMhs.nim}). Tindakan ini permanen.`;
    deleteModal.classList.remove('hidden');
  }
});

// Modal Konfirmasi Hapus
function tutupModal() {
  idAkanDihapus = null;
  deleteModal.classList.add('hidden');
}

btnModalCancel.addEventListener('click', tutupModal);
deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) tutupModal();
});

btnModalConfirm.addEventListener('click', async () => {
  if (!idAkanDihapus) return;

  try {
    const res = await axios.delete(`${API_BASE}/delete.php`, {
      data: { id: idAkanDihapus },
    });
    showToast(res.data.message || 'Data berhasil dihapus');
    if (Number(inputId.value) === idAkanDihapus) resetForm();
    await loadMahasiswa();
  } catch (error) {
    const pesanError = error.response?.data?.message || 'Gagal menghapus data';
    showToast(pesanError, true);
  } finally {
    tutupModal();
  }
});

// Tutup modal atau batalkan edit dengan tombol Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!deleteModal.classList.contains('hidden')) tutupModal();
    else if (inputId.value !== '') resetForm();
  }
});

// Muat data saat halaman siap
document.addEventListener('DOMContentLoaded', loadMahasiswa);