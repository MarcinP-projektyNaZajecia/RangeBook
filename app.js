import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import bodyParser from 'body-parser';
import { db, collection, addDoc, getDoc, deleteDoc, doc } from './src/firebase.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from 'multer';
import  admin from 'firebase-admin';

import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

dotenv.config();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Konfiguracja Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log("Cloudinary cloud name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("Cloudinary api key:", process.env.CLOUDINARY_API_KEY);
console.log("Cloudinary api secret:", process.env.CLOUDINARY_API_SECRET);

// CORS dla portu 8080
app.use(cors({
    origin: 'http://localhost:8080'
}));

// Middleware do weryfikacji, czy użytkownik jest zalogowany
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Token missing or invalid format' });
  }

  const token = authHeader.split(' ')[1];

  try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken; // Dodajemy zdekodowany token do req.user
      next();
  } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Middleware do parsowania JSON
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Middleware, który ustawia odpowiedni Content-Type dla plików JS
app.use((req, res, next) => {
    if (req.url.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
    }
    next();
});

// Routing (endpointy) - WAŻNE: Najpierw endpointy, potem statyczne pliki!
app.get('/', (req, res) => {
    console.log("Żądanie do /");
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicjalizacja multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Endpoint uploadu wpisu do bazy i storage
app.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
    console.log("Odebrano żądanie /upload");
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);

    try {
        if (!req.file) {
            console.log("Brak pliku w żądaniu");
            return res.status(400).json({ error: "No file provided" });
        }

        const name = req.body.name;
        const addressOrLicense = req.body.address;

        if (!name || !addressOrLicense) {
            console.log("Brak imienia lub adresu w żądaniu");
            return res.status(400).json({ error: "Name and address are required" });
        }

        console.log("Próba uploadu do Cloudinary...");
        const result = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, {
            upload_preset: 'signatures',
            access_mode: 'authenticated'
        });
        console.log("Upload do Cloudinary zakończony sukcesem. Odpowiedź:", result);

        console.log("Próba zapisu do Firestore...");
        const docRef = await addDoc(collection(db, 'book_entries'), {
            name: name,
            address_or_license: addressOrLicense,
            date_and_time: new Date(),
            signature_file_id: result.public_id
        });

        console.log("Dokument dodany do Firestore, ID:", docRef.id);
        console.log("Dane wpisu:", {
            name: name,
            address_or_license: addressOrLicense,
            date_and_time: new Date(),
            signature_file_id: result.public_id
        });
        console.log("Zapis do Firestore zakończony sukcesem. ID dokumentu:", docRef.id);

        res.json({ message: 'File uploaded and entry saved', publicId: result.public_id, docId: docRef.id });
    } catch (error) {
        console.error("Błąd w endpointcie /upload:", error);
        res.status(500).json({ error: "Błąd uploadu pliku" });
    }
});

// Endpoint do usuwania pojedynczego wpisu
app.delete('/delete-entry/:id', requireAuth, async (req, res) => {
  const entryId = req.params.id;

  try {
      const docRef = doc(db, 'book_entries', entryId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
          return res.status(404).json({ error: 'Entry not found' });
      }

      const signatureFileId = docSnap.data().signature_file_id;

      // WAŻNE: Czekamy na usunięcie z Cloudinary *przed* usunięciem z Firestore
      try {
          const cloudinaryResult = await cloudinary.uploader.destroy(signatureFileId);
          console.log("Cloudinary destroy result:", cloudinaryResult);
      } catch (cloudinaryError) {
          console.error("Błąd usuwania z Cloudinary:", cloudinaryError);
          return res.status(500).json({ error: 'Failed to delete signature from Cloudinary' });
      }

      await deleteDoc(docRef); // Usuwamy z Firestore *dopiero po* usunięciu z Cloudinary

      res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
      console.error('Błąd podczas usuwania wpisu:', error);
      res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// Endpoint do usuwania zaznaczonych wpisów (podobna zmiana)
app.delete('/delete-selected', requireAuth, async (req, res) => {
  const entryIds = req.body.entryIds;

  if (!Array.isArray(entryIds)) {
      return res.status(400).json({ error: 'Invalid entry IDs' });
  }

  try {
      for (const entryId of entryIds) {
          const docRef = doc(db, 'book_entries', entryId);
          const docSnap = await getDoc(docRef);

          if (!docSnap.exists()) {
              console.error(`Entry ${entryId} not found`);
              continue;
          }

          const signatureFileId = docSnap.data().signature_file_id;

          try {
              const cloudinaryResult = await cloudinary.uploader.destroy(signatureFileId);
              console.log("Cloudinary destroy result for", entryId, ":", cloudinaryResult);
          } catch (cloudinaryError) {
              console.error("Błąd usuwania z Cloudinary dla", entryId, ":", cloudinaryError);
          }

          await deleteDoc(docRef);
      }

      res.json({ message: 'Selected entries deleted successfully' });
  } catch (error) {
      console.error('Błąd podczas usuwania zaznaczonych wpisów:', error);
      res.status(500).json({ error: 'Failed to delete selected entries' });
  }
});

// Funkcja do generowania signed URL z Cloudinary
function generateSignedUrl(publicId) {
  console.log("generateSignedUrl() wywołana z publicId:", publicId);

  try {
      const timestamp = Math.round(new Date().getTime() / 1000);
      const url = cloudinary.url(publicId, {
          sign_url: true,
          type: 'authenticated',
          resource_type: 'image',
          timestamp: timestamp
      });

      console.log("Wygenerowany URL:", url);
      return url;

  } catch (error) {
      console.error("Błąd generowania signed URL:", error);
      return null;
  }
}

// Endpoint do pobierania obrazu po signed URL
app.get('/signed-url/:publicId', async (req, res) => {
  console.log("Żądanie dotarło do /signed-url/:publicId, publicId:", req.params.publicId);
  const publicId = req.params.publicId;

  if (!publicId) {
      console.log("Brak publicId");
      return res.status(400).json({ error: "Public ID is required" });
  }

  try {
      const signedUrl = generateSignedUrl(publicId);

      if (!signedUrl) {
          console.log("Błąd generowania signed URL dla publicId:", publicId);
          return res.status(404).json({ error: "Signed URL could not be generated" });
      }

      console.log("Wygenerowany signedUrl:", signedUrl);
      res.json({ url: signedUrl });

  } catch (error) {
      console.error("Błąd generowania signed URL:", error);
      return res.status(500).json({ error: "Error generating signed URL" });

  } finally {
      console.log("Odpowiedź serwera:", res.statusCode, res.statusMessage);
  }
});

app.get('*', (req, res) => { // "Catch-all"
    console.log("Żądanie do *");
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware do statycznych plików
app.use(express.static(path.join(__dirname, 'public')));
app.use('/src', express.static(path.join(__dirname, 'src')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// Logi serwera (opcjonalne)
app.use((req, res, next) => {
    console.log(`Żądanie: ${req.method} ${req.url}`);
    next();
});

// Start serwera
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});