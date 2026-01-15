// Basic Auth Check
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'index.html';
}
// End Auth Check

const API_URL = 'api';

// Elements
const formsListView = document.getElementById('forms-list-view');
const formView = document.getElementById('form-view');
const successView = document.getElementById('success-view');

const urlParams = new URLSearchParams(window.location.search);
const formId = urlParams.get('id');

function init() {
    checkAdminAccess();
    if (formId) {
        loadForm(formId);
    } else {
        loadFormsList();
    }
}

function checkAdminAccess() {
    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
    const isAdmin = permissions.includes('edit') || permissions.includes('delete');

    if (isAdmin) {
        const adminBtn = document.getElementById('admin-panel-btn');
        if (adminBtn) adminBtn.classList.remove('hidden');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('permissions');
    localStorage.removeItem('username');
    window.location.href = 'index.html';
}

// --- List Forms ---
async function loadFormsList() {
    formsListView.classList.remove('hidden');
    formView.classList.add('hidden');
    successView.classList.add('hidden');

    try {
        const res = await fetch(`${API_URL}/forms.php`);
        const forms = await res.json();

        const container = document.getElementById('forms-list-container');
        container.innerHTML = '';

        if (forms.length === 0) {
            container.innerHTML = '<p>No active forms available.</p>';
            return;
        }

        forms.forEach(form => {
            const card = document.createElement('div');
            card.className = 'card interactive';
            card.style.cursor = 'pointer';
            card.onclick = () => window.location.href = `?id=${form.id}`;
            card.innerHTML = `
                <h3 class="card-title">${form.title}</h3>
                <p style="color: var(--text-light); margin-top: 0.5rem;">${form.description || 'No description'}</p>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        document.getElementById('forms-list-container').innerHTML = '<p class="alert alert-error">Error loading forms.</p>';
    }
}

// --- Load Single Form ---
async function loadForm(id) {
    formsListView.classList.add('hidden');
    formView.classList.remove('hidden');
    successView.classList.add('hidden');

    try {
        const res = await fetch(`${API_URL}/get_form.php?id=${id}`);
        if (!res.ok) {
            formView.innerHTML = '<div class="alert alert-error">Form not found or deleted.</div>';
            return;
        }

        const data = await res.json();

        // Render Header Image ? 
        const headerSection = document.querySelector('.card-header');

        // Clear previous image if any
        const existingImg = headerSection.querySelector('.form-header-img');
        if (existingImg) existingImg.remove();

        if (data.header_image) {
            const img = document.createElement('img');
            img.src = data.header_image;
            img.className = 'form-header-img';
            img.style.maxWidth = '60%';
            img.style.display = 'block';
            img.style.marginLeft = 'auto';
            img.style.marginRight = 'auto';
            img.style.borderRadius = 'var(--radius-md)';
            img.style.marginBottom = '1.5rem';
            headerSection.insertBefore(img, headerSection.firstChild);
        }

        document.getElementById('form-title').textContent = data.title;
        document.getElementById('form-description').textContent = data.description || '';

        // Render Fields
        const container = document.getElementById('form-fields');
        container.innerHTML = '';

        data.fields.forEach(field => {
            const div = document.createElement('div');
            div.className = 'form-group';
            div.dataset.fieldId = field.id;
            div.dataset.fieldType = field.field_type;

            const label = document.createElement('label');
            label.className = 'form-label';
            label.textContent = field.label + (field.required ? ' *' : '');
            div.appendChild(label);

            let input;

            if (field.field_type === 'textarea') {
                input = document.createElement('textarea');
                input.className = 'form-control';
                input.rows = 4;
            } else if (['text', 'number', 'date', 'file'].includes(field.field_type)) {
                input = document.createElement('input');
                input.type = field.field_type;
                input.className = 'form-control';
            } else if (field.field_type === 'select') {
                input = document.createElement('select');
                input.className = 'form-control';
                const opts = field.options || [];
                opts.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt;
                    input.appendChild(option);
                });
            } else if (['radio', 'checkbox'].includes(field.field_type)) {
                input = document.createElement('div');
                const opts = field.options || [];
                opts.forEach(opt => {
                    const wrapper = document.createElement('div');
                    wrapper.style.marginBottom = '0.5rem';

                    const inp = document.createElement('input');
                    inp.type = field.field_type;
                    inp.name = `field_${field.id}`;
                    inp.value = opt;
                    inp.style.marginRight = '0.5rem';

                    const lbl = document.createElement('label');
                    lbl.textContent = opt;

                    wrapper.appendChild(inp);
                    wrapper.appendChild(lbl);

                    // Conditional Detail Input?
                    if (field.has_details) {
                        const detailInput = document.createElement('input');
                        detailInput.type = 'text';
                        detailInput.className = 'form-control detail-input hidden';
                        detailInput.placeholder = 'Please specify details (e.g. count, note)';
                        detailInput.style.marginTop = '0.25rem';
                        detailInput.style.fontSize = '0.9rem';
                        detailInput.style.width = '80%';
                        detailInput.style.marginLeft = '1.5rem';

                        wrapper.appendChild(detailInput);

                        // Event Listener
                        inp.addEventListener('change', () => {
                            if (field.field_type === 'checkbox') {
                                if (inp.checked) detailInput.classList.remove('hidden');
                                else detailInput.classList.add('hidden');
                            } else {
                                // Radio Logic: Hide all others in group, show this one
                                const allDetails = div.querySelectorAll('.detail-input');
                                allDetails.forEach(d => d.classList.add('hidden'));
                                if (inp.checked) detailInput.classList.remove('hidden');
                            }
                        });
                    }

                    input.appendChild(wrapper);
                });
            }

            if (field.required && !['radio', 'checkbox'].includes(field.field_type)) {
                input.required = true;
            }

            div.appendChild(input);
            container.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        formView.innerHTML = '<div class="alert alert-error">Error loading form details.</div>';
    }
}

// --- Submit Logic (Updated for Details) ---
document.getElementById('submission-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const fieldDivs = document.querySelectorAll('#form-fields .form-group');
    const answers = [];

    fieldDivs.forEach(div => {
        const fieldId = div.dataset.fieldId;
        const fieldType = div.dataset.fieldType;
        let value = null;

        if (['text', 'textarea', 'number', 'date', 'select'].includes(fieldType)) {
            value = div.querySelector('.form-control').value;
        } else if (fieldType === 'radio') {
            const checked = div.querySelector('input[type="radio"]:checked');
            if (checked) {
                value = checked.value;
                // Append Detail if exists
                const wrapper = checked.parentElement;
                const detail = wrapper.querySelector('.detail-input');
                if (detail && !detail.classList.contains('hidden') && detail.value) {
                    value += ` (${detail.value})`;
                }
            }
        } else if (fieldType === 'checkbox') {
            const checkedList = div.querySelectorAll('input[type="checkbox"]:checked');
            if (checkedList.length > 0) {
                value = [];
                checkedList.forEach(c => {
                    let val = c.value;
                    const wrapper = c.parentElement;
                    const detail = wrapper.querySelector('.detail-input');
                    if (detail && !detail.classList.contains('hidden') && detail.value) {
                        val += ` (${detail.value})`;
                    }
                    value.push(val);
                });
            }
        }

        if (value !== null && value !== '' && (Array.isArray(value) ? value.length > 0 : true)) {
            answers.push({ field_id: fieldId, value: value });
        }
    });

    try {
        const res = await fetch(`${API_URL}/submit.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ form_id: formId, answers })
        });

        if (res.ok) {
            formView.classList.add('hidden');
            successView.classList.remove('hidden');
        } else {
            alert('Error submitting form');
        }
    } catch (err) {
        console.error(err);
        alert('Error submitting form');
    }
});

init();
