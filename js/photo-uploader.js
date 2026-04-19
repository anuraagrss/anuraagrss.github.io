
  const fileInput   = document.getElementById('file-input');
  const dropzone    = document.getElementById('dropzone');
  const grid        = document.getElementById('photo-grid');
  const emptyState  = document.getElementById('empty-state');
  const uploadBtn   = document.getElementById('upload-btn');
  const countLabel  = document.getElementById('count-label');
  const progressWrap= document.getElementById('progress-wrap');
  const progressBar = document.getElementById('progress-bar');

  let queue = []; // [{file, id, cardEl, statusEl}]

  // ── Drag & drop ──────────────────────────────────────────────────────────
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('drag');
    addFiles([...e.dataTransfer.files]);
  });
  fileInput.addEventListener('change', () => addFiles([...fileInput.files]));

  // ── Add files to queue ───────────────────────────────────────────────────
  function addFiles(files) {
    files = files.filter(f => f.type.startsWith('image/'));
    if (!files.length) return;

    emptyState.style.display = 'none';
    grid.style.display = 'grid';

    files.forEach(file => {
      const id  = `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const url = URL.createObjectURL(file);

      const card = document.createElement('div');
      card.className = 'photo-card';
      card.id = id;
      card.innerHTML = `
        <img src="${url}" alt="${file.name}" loading="lazy"/>
        <div class="thumb-overlay">
          <span>${file.name}</span>
          <span style="color:var(--muted)">${(file.size/1024/1024).toFixed(1)} MB</span>
        </div>
        <div class="card-meta">
          <div class="card-title">${file.name.replace(/\.[^.]+$/, '')}</div>
          <div class="card-status status-pending" id="status-${id}">⏳ Pending</div>
        </div>
      `;

      grid.appendChild(card);
      queue.push({ file, id, cardEl: card, statusEl: document.getElementById(`status-${id}`) });
    });

    updateCount();
    uploadBtn.disabled = false;
  }

  function updateCount() {
    countLabel.textContent = `${queue.length} photo${queue.length !== 1 ? 's' : ''}`;
  }

  // ── Upload ───────────────────────────────────────────────────────────────
  uploadBtn.addEventListener('click', async () => {
    if (!window._uploadPhoto) {
      toast('⚠️ Firebase not configured. Set your firebaseConfig first.', true);
      return;
    }
    uploadBtn.disabled = true;
    progressWrap.style.display = 'block';

    const meta = {
      location:   document.getElementById('f-location').value.trim(),
      country_id: document.getElementById('f-country').value.trim().toUpperCase() || 'US',
      element:    document.getElementById('f-element').value,
      story:      document.getElementById('f-story').value.trim(),
      camera:     document.getElementById('f-camera').value.trim(),
      lens:       document.getElementById('f-lens').value.trim(),
      settings:   document.getElementById('f-settings').value.trim(),
      featured:   document.getElementById('f-featured').checked,
      date:       new Date().toISOString().split('T')[0],
    };

    let done = 0;
    const total = queue.length;

    for (const item of queue) {
      const { file, statusEl } = item;

      setStatus(statusEl, 'uploading', '⬆ Uploading…');

      try {
        const result = await window._uploadPhoto(file, meta, msg => {
          setStatus(statusEl, 'uploading', `⬆ ${msg}`);
        });
        setStatus(statusEl, 'done', `✓ Saved`);
        item.cardEl.querySelector('.card-title').textContent = result.title;
      } catch (err) {
        console.error(err);
        setStatus(statusEl, 'error', `✗ ${err.message || 'Failed'}`);
      }

      done++;
      progressBar.style.width = `${(done / total) * 100}%`;
    }

    toast(`✓ ${done} of ${total} photos uploaded`);
    uploadBtn.textContent = 'Upload Complete';
  });

  function setStatus(el, type, text) {
    el.className = `card-status status-${type}`;
    el.textContent = text;
  }

  // ── Toast ────────────────────────────────────────────────────────────────
  function toast(msg, isError = false) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `show${isError ? ' error' : ''}`;
    setTimeout(() => t.className = '', 3500);
  }
