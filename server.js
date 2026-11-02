const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const uploadDir = path.join(__dirname, 'uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, safeName);
  },
});

const upload = multer({ storage });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/files', (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      return res.status(500).json({ message: 'Gagal membaca file dari penyimpanan.' });
    }

    const allFiles = files
      .map((file) => {
        const fullPath = path.join(uploadDir, file);
        const stats = fs.statSync(fullPath);

        return {
          filename: file,
          originalName: file.replace(/^\d+-/, ''),
          size: stats.size,
          createdAt: stats.mtime,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(allFiles);
  });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Pilih file terlebih dahulu.' });
  }

  res.status(201).json({
    message: 'File berhasil diupload.',
    file: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
    },
  });
});

app.get('/api/download/:filename', (req, res) => {
  const targetPath = path.join(uploadDir, req.params.filename);

  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ message: 'File tidak ditemukan.' });
  }

  res.download(targetPath);
});

app.delete('/api/files/:filename', (req, res) => {
  const targetPath = path.join(uploadDir, req.params.filename);

  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ message: 'File tidak ditemukan.' });
  }

  fs.unlinkSync(targetPath);
  res.json({ message: 'File berhasil dihapus.' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
