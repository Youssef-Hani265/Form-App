'use strict';

/* ─── Element refs ────────────────────────────────────────────────────────── */
const form = document.getElementById('applyForm');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');
const responseBanner = document.getElementById('responseBanner');
const fileInput = document.getElementById('cv');
const fileDrop = document.getElementById('fileDrop');
const fileDropTitle = document.getElementById('fileDropTitle');

/* ─── Validation rules ────────────────────────────────────────────────────── */
const PHONE_RE = /^[+\d][\d\s\-().]{6,19}$/;
const URL_RE = /^https?:\/\/.+\..+/i;
const ALLOWED_VALS = ['UI/UX Design', 'Graphic Design', 'Motion Design', 'Brand Identity', 'Illustration', 'Product Design', 'Other'];

function getValidators() {
    return {
        fullName: {
            el: document.getElementById('fullName'),
            validate: v => v.trim().length >= 2 ? null : 'Full name must be at least 2 characters.',
        },
        phone: {
            el: document.getElementById('phone'),
            validate: v => PHONE_RE.test(v.trim()) ? null : 'Enter a valid phone number (digits, spaces, +, hyphens).',
        },
        designField: {
            el: document.getElementById('designField'),
            validate: v => ALLOWED_VALS.includes(v) ? null : 'Please select a design field.',
        },
        portfolioLink: {
            el: document.getElementById('portfolioLink'),
            validate: v => URL_RE.test(v.trim()) ? null : 'Enter a valid URL starting with http:// or https://.',
        },
        cv: {
            el: fileInput,
            validate: () => {
                if (!fileInput.files || fileInput.files.length === 0) return 'Please upload your CV (PDF).';
                const f = fileInput.files[0];
                if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) return 'Only PDF files are accepted.';
                if (f.size > 5 * 1024 * 1024) return 'CV file must be smaller than 5 MB.';
                return null;
            },
        },
    };
}

/* ─── Show / clear field errors ──────────────────────────────────────────── */
function showError(fieldName, message) {
    const errEl = document.getElementById(`err-${fieldName}`);
    const groupEl = document.getElementById(`group-${fieldName}`);
    const fieldEl = fieldName === 'cv' ? fileDrop : document.getElementById(fieldName);
    if (errEl) errEl.textContent = message;
    if (fieldEl) fieldEl.classList.add('is-error');
    if (fieldName === 'cv') fileDrop.classList.add('is-error');
}

function clearError(fieldName) {
    const errEl = document.getElementById(`err-${fieldName}`);
    const fieldEl = fieldName === 'cv' ? fileDrop : document.getElementById(fieldName);
    if (errEl) errEl.textContent = '';
    if (fieldEl) fieldEl.classList.remove('is-error');
    if (fieldName === 'cv') fileDrop.classList.remove('is-error');
}

function markValid(fieldName) {
    const fieldEl = fieldName === 'cv' ? fileDrop : document.getElementById(fieldName);
    if (fieldEl) {
        fieldEl.classList.remove('is-error');
        if (fieldName !== 'cv') fieldEl.classList.add('is-valid');
    }
}

/* ─── Live validation on blur / input ────────────────────────────────────── */
function attachLiveValidation() {
    const validators = getValidators();
    Object.entries(validators).forEach(([name, { el, validate }]) => {
        if (!el) return;
        const trigger = el.tagName === 'SELECT' ? 'change' : 'input';
        el.addEventListener('blur', () => {
            const err = validate(el.value);
            err ? showError(name, err) : (clearError(name), markValid(name));
        });
        if (name !== 'cv') {
            el.addEventListener(trigger, () => {
                if (document.getElementById(`err-${name}`)?.textContent) {
                    const err = validate(el.value);
                    err ? showError(name, err) : (clearError(name), markValid(name));
                }
            });
        }
    });
}

/* ─── File input interactions ─────────────────────────────────────────────── */
function updateFileDrop(file) {
    if (file) {
        fileDrop.classList.add('has-file');
        fileDrop.classList.remove('is-error');
        fileDropTitle.innerHTML = `✅ <strong>${escapeHtml(file.name)}</strong> selected`;
    } else {
        fileDrop.classList.remove('has-file');
        fileDropTitle.innerHTML = 'Drop your CV here or <span class="file-browse">browse</span>';
    }
}

fileInput.addEventListener('change', () => {
    clearError('cv');
    updateFileDrop(fileInput.files[0] ?? null);
});

// Drag-and-drop
['dragenter', 'dragover'].forEach(ev =>
    fileDrop.addEventListener(ev, e => { e.preventDefault(); fileDrop.classList.add('dragover'); }));
['dragleave', 'dragend', 'drop'].forEach(ev =>
    fileDrop.addEventListener(ev, e => { e.preventDefault(); fileDrop.classList.remove('dragover'); }));

fileDrop.addEventListener('drop', e => {
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    clearError('cv');
    updateFileDrop(file);
});

// Keyboard accessibility for file drop label
fileDrop.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});

/* ─── Banner helper ───────────────────────────────────────────────────────── */
function showBanner(type, message) {
    const icon = type === 'success' ? '🎉' : '⚠️';
    responseBanner.className = `response-banner ${type}`;
    responseBanner.innerHTML = `<span class="banner-icon">${icon}</span><span>${escapeHtml(message)}</span>`;
    responseBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function hideBanner() {
    responseBanner.className = 'response-banner hidden';
    responseBanner.innerHTML = '';
}

/* ─── Set loading state ───────────────────────────────────────────────────── */
function setLoading(on) {
    submitBtn.disabled = on;
    if (on) {
        submitBtn.classList.add('loading');
        btnText.textContent = 'Submitting…';
    } else {
        submitBtn.classList.remove('loading');
        btnText.textContent = 'Submit Application';
    }
}

/* ─── Form submit ─────────────────────────────────────────────────────────── */
form.addEventListener('submit', async e => {
    e.preventDefault();
    hideBanner();

    // Client-side validation
    const validators = getValidators();
    let valid = true;
    Object.entries(validators).forEach(([name, { el, validate }]) => {
        const err = validate(el?.value ?? '');
        if (err) { showError(name, err); valid = false; }
        else { clearError(name); }
    });
    if (!valid) return;

    const formData = new FormData(form);
    setLoading(true);

    try {
        const res = await fetch('/api/apply', { method: 'POST', body: formData });
        const json = await res.json();

        if (json.success) {
            showBanner('success', json.message);
            form.reset();
            updateFileDrop(null);
            // clear all valid styles
            form.querySelectorAll('.is-valid').forEach(el => el.classList.remove('is-valid'));
        } else {
            showBanner('error', json.message || 'Something went wrong. Please try again.');
        }
    } catch (err) {
        showBanner('error', 'Network error. Please check your connection and try again.');
    } finally {
        setLoading(false);
    }
});

/* ─── Escape helper ───────────────────────────────────────────────────────── */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* ─── Init ────────────────────────────────────────────────────────────────── */
attachLiveValidation();
