const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const statusBox = document.getElementById('status');
const fileList = document.getElementById('fileList');
const refreshBtn = document.getElementById('refreshBtn');

const DB_NAME = 'FileStorageDB';
const STORE_NAME = 'files';

const formatSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  const value = bytes / 1024 ** i;
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`;
};

const setStatus = (message, isError = false) => {
  statusBox.textContent = message;
  statusBox.style.color = isError ? '#dc2626' : '#5f6c85';
};

const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getFiles = async () => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

const saveFile = async (file) => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const record = {
      name: file.name,
      type: file.type,
      size: file.size,
      createdAt: new Date().toISOString(),
      data: file,
    };

    const request = store.add(record);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const deleteFile = async (id) => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const renderFiles = (files) => {
  if (!files.length) {
    fileList.innerHTML = '<div class="empty-state">Belum ada file yang tersimpan.</div>';
    return;
  }

  fileList.innerHTML = files
    .map(
      (file) => `
        <div class="file-card">
          <div class="file-meta">
            <span class="file-name">${file.name}</span>
            <span class="file-size">${formatSize(file.size)} • ${new Date(file.createdAt).toLocaleString('id-ID')}</span>
          </div>
          <div class="file-actions">
            <button class="download-btn" type="button" data-id="${file.id}">Download</button>
            <button class="delete-btn" type="button" data-id="${file.id}">Hapus</button>
          </div>
        </div>
      `
    )
    .join('');

  document.querySelectorAll('.download-btn').forEach((button) => {
    button.addEventListener('click', () => downloadFile(Number(button.dataset.id)));
  });

  document.querySelectorAll('.delete-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      await deleteSingleFile(Number(button.dataset.id));
    });
  });
};

const downloadFile = async (id) => {
  const files = await getFiles();
  const selected = files.find((file) => file.id === id);

  if (!selected || !selected.data) {
    setStatus('File tidak ditemukan untuk diunduh.', true);
    return;
  }

  const url = URL.createObjectURL(selected.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = selected.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  setStatus(`Mengunduh: ${selected.name}`);
};

const deleteSingleFile = async (id) => {
  try {
    await deleteFile(id);
    setStatus('File berhasil dihapus.');
    await loadFiles();
  } catch (error) {
    setStatus('Gagal menghapus file.', true);
  }
};

const loadFiles = async () => {
  try {
    const files = await getFiles();
    renderFiles(files);
  } catch (error) {
    setStatus('Gagal memuat daftar file.', true);
  }
};

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const selectedFile = fileInput.files[0];
  if (!selectedFile) {
    setStatus('Silakan pilih file terlebih dahulu.', true);
    return;
  }

  try {
    setStatus('Mengunggah file...');
    await saveFile(selectedFile);
    setStatus(`Berhasil: ${selectedFile.name}`);
    uploadForm.reset();
    await loadFiles();
  } catch (error) {
    setStatus('Upload gagal. Coba lagi.', true);
  }
});

refreshBtn.addEventListener('click', loadFiles);

loadFiles();
