
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
  import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
  import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

  // ── PASTE YOUR FIREBASE CONFIG HERE ──────────────────────────────────────
  const firebaseConfig = {
    apiKey:            "YOUR_API_KEY",
    authDomain:        "YOUR_AUTH_DOMAIN",
    projectId:         "nomad-404",
    storageBucket:     "nomad-404.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId:             "YOUR_APP_ID",
  };
  // ─────────────────────────────────────────────────────────────────────────

  const app  = initializeApp(firebaseConfig);
  const db   = getFirestore(app);
  const stor = getStorage(app);

  // Hardcode your user ID (same as addedBy in Firestore)
  const USER_ID = "9aHUiUedgBUn09RH5NnW9lqhX9G2";

  // ── EXIF reader (pure JS, no deps) ──────────────────────────────────────
  function readExif(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const view = new DataView(e.target.result);
          if (view.getUint16(0) !== 0xFFD8) return resolve({});
          let offset = 2;
          while (offset < view.byteLength) {
            const marker = view.getUint16(offset);
            const length = view.getUint16(offset + 2);
            if (marker === 0xFFE1) {
              // EXIF APP1 — we just surface what we can simply
              resolve({});   // full IFD parsing is heavy; EXIF.js handles it below
              return;
            }
            offset += 2 + length;
          }
          resolve({});
        } catch { resolve({}); }
      };
      reader.readAsArrayBuffer(file.slice(0, 65536));
    });
  }

  // We use exif-js for richer extraction
  async function getExifData(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = function(e) {
        const arr = new Uint8Array(e.target.result);
        // Try to read common EXIF tags via manual IFD walk
        resolve(parseExif(arr));
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function parseExif(arr) {
    const view = new DataView(arr.buffer || arr);
    if (view.getUint16(0) !== 0xFFD8) return {};
    let offset = 2;
    while (offset < view.byteLength - 2) {
      if (view.getUint16(offset) === 0xFFE1) {
        return readIFD(view, offset + 10);
      }
      offset += 2 + view.getUint16(offset + 2);
    }
    return {};
  }

  const TAG = {
    0x010F: 'Make', 0x0110: 'Model', 0x0112: 'Orientation',
    0x829A: 'ExposureTime', 0x829D: 'FNumber',
    0x8827: 'ISOSpeedRatings', 0x9003: 'DateTimeOriginal',
    0x920A: 'FocalLength', 0xA405: 'FocalLengthIn35mmFilm',
  };

  function readIFD(view, start) {
    try {
      const little = view.getUint16(start) === 0x4949;
      const ifdOffset = view.getUint32(start + 4, little);
      const count = view.getUint16(start + ifdOffset, little);
      const result = {};
      for (let i = 0; i < count; i++) {
        const off = start + ifdOffset + 2 + i * 12;
        const tag  = view.getUint16(off, little);
        const type = view.getUint16(off + 2, little);
        const num  = view.getUint32(off + 4, little);
        if (!TAG[tag]) continue;
        let val;
        if (type === 2) { // ASCII
          const valOff = num > 4 ? view.getUint32(off + 8, little) + start : off + 8;
          val = String.fromCharCode(...new Uint8Array(view.buffer, valOff, num - 1)).trim();
        } else if (type === 3) { // SHORT
          val = view.getUint16(off + 8, little);
        } else if (type === 5) { // RATIONAL
          const valOff = view.getUint32(off + 8, little) + start;
          val = view.getUint32(valOff, little) / view.getUint32(valOff + 4, little);
        }
        if (val !== undefined) result[TAG[tag]] = val;
      }
      return result;
    } catch { return {}; }
  }

  // ── Upload one photo ─────────────────────────────────────────────────────
  async function uploadPhoto(file, meta, onProgress) {
    const ts   = Date.now();
    const path = `photos/${ts}_${file.name}`;
    const sRef = ref(stor, path);

    onProgress('Uploading image…');
    await uploadBytes(sRef, file);
    const image_url = await getDownloadURL(sRef);

    const exif = await getExifData(file);

    // Build camera string from EXIF (fall back to user-provided)
    const cameraExif = [exif.Make, exif.Model].filter(Boolean).join(' ') || meta.camera;
    const fNumber    = exif.FNumber  ? `f/${exif.FNumber.toFixed(1)}` : meta.settings;
    const focalLen   = exif.FocalLength ? `${Math.round(exif.FocalLength)}mm` : meta.lens;

    // Date from EXIF or today
    let date = meta.date;
    if (exif.DateTimeOriginal) {
      const d = exif.DateTimeOriginal.split(' ')[0].replace(/:/g, '-');
      if (d) date = d;
    }

    const doc = {
      addedAt:   serverTimestamp(),
      addedBy:   USER_ID,
      country_id: meta.country_id || 'US',
      date,
      element:   meta.element || 'fire',
      exif: {
        camera:   cameraExif || '',
        lens:     focalLen   || '',
        settings: fNumber    || '',
      },
      featured:  meta.featured ?? false,
      image_url,
      location:  meta.location || '',
      story:     meta.story    || '',
      title:     meta.title    || file.name.replace(/\.[^.]+$/, ''),
      trip_id:   null,
    };

    onProgress('Saving to Firestore…');
    const docRef = await addDoc(collection(db, 'photos'), doc);
    return { id: docRef.id, image_url, title: doc.title };
  }

  // ── Expose to non-module global scope ────────────────────────────────────
  window._uploadPhoto = uploadPhoto;
