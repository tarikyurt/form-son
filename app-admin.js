const API_URL = 'api';

// Auth State
// Auth State
let token = localStorage.getItem('token');
let permissions = JSON.parse(localStorage.getItem('permissions') || '[]');

// Elements
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

// Sections
const sections = {
    'forms-list': document.getElementById('forms-list-section'),
    'create-form': document.getElementById('create-form-section'),
    'forms-list': document.getElementById('forms-list-section'),
    'create-form': document.getElementById('create-form-section'),
    'form-details': document.getElementById('form-details-section'),
    'users-list': document.getElementById('users-list-section'),
    'create-user': document.getElementById('create-user-section')
};

// --- Initialization ---
function init() {
    if (token) {
        if (isUserAdmin()) {
            showDashboard();
        } else {
            window.location.href = 'form_view.html';
        }
    } else {
        showLogin();
    }
}

// --- Helper ---
function isUserAdmin() {
    // Defines what makes a user an "Admin" (access to dashboard)
    // If user has 'edit' or 'delete', they are admin.
    // If user only has 'fill', they are a standard user.
    return permissions.includes('edit') || permissions.includes('delete');
}

// --- Navigation ---
function showLogin() {
    loginView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
}

function showDashboard() {
    loginView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    loadForms(); // Initial load
    showSection('forms-list');
    applyPermissions();
}

function showSection(sectionId) {
    Object.values(sections).forEach(el => el.classList.add('hidden'));
    sections[sectionId].classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    // Reset Create Form if switching to it manually (not via Edit)
    if (sectionId === 'create-form') {
        // If we clicked the menu item "Create New Form", we should reset edit mode
        // But we need to distinguish between menu click and "Edit" button click. 
        // Simple hack: We'll reset it every time, and "Edit" button will call a separate populate function after.
        resetCreateForm();
    }
    updateSidebar(sectionId);
}

function updateSidebar(sectionId) {
    // Reset all
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navItems = document.querySelectorAll('.nav-item');

    if (sectionId === 'forms-list' || sectionId === 'form-details') navItems[0].classList.add('active');
    if (sectionId === 'create-form') navItems[1].classList.add('active');
    if (sectionId === 'users-list' || sectionId === 'create-user') navItems[2].classList.add('active');
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('permissions');
    token = null;
    permissions = [];
    showLogin();
}

// --- Auth ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch(`${API_URL}/auth.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok) {
            token = data.token;
            permissions = data.permissions || [];
            localStorage.setItem('token', token);
            localStorage.setItem('username', data.username); // Save username
            localStorage.setItem('permissions', JSON.stringify(permissions));
            
            if (isUserAdmin()) {
                showDashboard();
            } else {
                window.location.href = 'form_view.html';
            }
            loginError.classList.add('hidden');
        } else {
            loginError.textContent = data.message;
            loginError.classList.remove('hidden');
        }
    } catch (err) {
        loginError.textContent = 'Login error';
        loginError.classList.remove('hidden');
    }
});

// --- Forms Management ---
async function loadForms() {
    try {
        const res = await fetch(`${API_URL}/forms.php`);
        const forms = await res.json();

        const tbody = document.getElementById('forms-table-body');
        tbody.innerHTML = '';

        forms.forEach(form => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${form.title}</td>
                <td>${new Date(form.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-secondary" onclick="viewSubmissions(${form.id})" style="font-size: 0.8rem;">Submissions</button>
                    <button class="btn btn-primary" onclick="editForm(${form.id})" style="font-size: 0.8rem; background: var(--secondary); margin-left: 0.5rem;">Edit</button>
                    <a href="form_view.html?id=${form.id}" target="_blank" class="btn btn-secondary" style="font-size: 0.8rem; margin-left: 0.5rem;">View Live</a>
                    <button class="btn btn-danger" onclick="deleteForm(${form.id})" style="font-size: 0.8rem; margin-left: 0.5rem;">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        applyPermissions();
    } catch (err) {
        console.error('Error loading forms:', err);
    }
}

async function deleteForm(id) {
    if (!confirm('Are you sure? This will delete all submissions for this form.')) return;

    try {
        const res = await fetch(`${API_URL}/forms.php?id=${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) loadForms();
    } catch (err) {
        console.error(err);
    }
}

// --- Create / Edit Form Logic ---
let fields = [];
let editingFormId = null;

function resetCreateForm() {
    editingFormId = null;
    document.getElementById('form-title').value = '';
    document.getElementById('form-description').value = '';
    document.getElementById('header-image-input').value = '';
    document.getElementById('form-fields-container').innerHTML = '';
    document.querySelector('#create-form-section .card-title').textContent = 'Create New Form';
    document.querySelector('#create-form-form button[type="submit"]').textContent = 'Create Form';
}

async function editForm(id) {
    editingFormId = id;
    showSection('create-form'); // Switches view
    document.querySelector('#create-form-section .card-title').textContent = 'Edit Form';
    document.querySelector('#create-form-form button[type="submit"]').textContent = 'Update Form';

    // Fetch details
    try {
        const res = await fetch(`${API_URL}/get_form.php?id=${id}`);
        const data = await res.json();

        document.getElementById('form-title').value = data.title;
        document.getElementById('form-description').value = data.description || '';

        const container = document.getElementById('form-fields-container');
        container.innerHTML = '';

        data.fields.forEach(field => {
            // Re-create field UI
            addField(field);
        });

    } catch (err) {
        console.error(err);
        alert('Error loading form for edit');
    }
}

function addField(existingData = null) {
    const fieldId = existingData ? existingData.id : Date.now();
    const container = document.getElementById('form-fields-container');

    const div = document.createElement('div');
    div.className = 'field-item';
    // If existing, store real ID to handle updates
    div.dataset.id = fieldId;
    if (existingData) div.dataset.server_id = existingData.id;

    div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
            <strong>${existingData ? 'Edit Field' : 'New Field'}</strong>
            <button type="button" class="btn btn-danger" style="padding: 0.2rem 0.5rem; font-size: 0.8rem;" onclick="removeField(this)">Remove</button>
        </div>
        <div class="form-group">
            <label>Question Label</label>
            <input type="text" class="form-control field-label" required value="${existingData ? existingData.label : ''}">
        </div>
        <div class="form-group">
            <label>Type</label>
            <select class="form-control field-type" onchange="handleTypeChange(this)">
                <option value="text">Short Text</option>
                <option value="textarea">Long Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="checkbox">Checkbox</option>
                <option value="radio">Multiple Choice (Radio)</option>
                <option value="select">Dropdown</option>
            </select>
        </div>
        <div class="field-options hidden">
            <label>Options (comma separated)</label>
            <input type="text" class="form-control field-options-input" placeholder="Option 1, Option 2, Option 3">
        </div>
        
        <!-- NEW: Extra Actions -->
        <div style="display: flex; gap: 1.5rem; margin-top: 1rem;">
             <label><input type="checkbox" class="field-required"> Required</label>
             <label class="details-option hidden"><input type="checkbox" class="field-has-details"> Enable Comment/Detail Box?</label>
        </div>
    `;

    container.appendChild(div);

    // Populate Type & Options
    const typeSelect = div.querySelector('.field-type');
    if (existingData) {
        typeSelect.value = existingData.field_type;
        div.querySelector('.field-required').checked = existingData.required == 1;

        // Handle Options
        handleTypeChange(typeSelect); // Show/Hide option input
        if (['radio', 'checkbox', 'select'].includes(existingData.field_type)) {
            const opts = existingData.options || [];
            div.querySelector('.field-options-input').value = opts.join(', ');

            if (existingData.has_details == 1) {
                div.querySelector('.field-has-details').checked = true;
            }
        }
    } else {
        // Default
        handleTypeChange(typeSelect);
    }
}

function removeField(btn) {
    btn.closest('.field-item').remove();
}

function handleTypeChange(select) {
    const type = select.value;
    const parent = select.closest('.field-item');
    const optionsDiv = parent.querySelector('.field-options');
    const detailsOption = parent.querySelector('.details-option');

    if (['radio', 'checkbox', 'select'].includes(type)) {
        optionsDiv.classList.remove('hidden');
    } else {
        optionsDiv.classList.add('hidden');
    }

    // Only allow detail box for choice-based inputs where it makes sense
    if (['radio', 'checkbox'].includes(type)) {
        detailsOption.classList.remove('hidden');
    } else {
        detailsOption.classList.add('hidden');
    }
}

// Updated Form Submit (FormData for File Upload)
document.getElementById('create-form-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();
    if (editingFormId) formData.append('form_id', editingFormId);

    formData.append('title', document.getElementById('form-title').value);
    formData.append('description', document.getElementById('form-description').value);

    // Header Image
    const imageInput = document.getElementById('header-image-input');
    if (imageInput.files[0]) {
        formData.append('header_image', imageInput.files[0]);
    }

    const fieldItems = document.querySelectorAll('.field-item');
    const fieldsData = Array.from(fieldItems).map(item => {
        const type = item.querySelector('.field-type').value;
        let options = null;

        if (['radio', 'checkbox', 'select'].includes(type)) {
            const rawOpts = item.querySelector('.field-options-input').value;
            options = rawOpts.split(',').map(s => s.trim()).filter(s => s);
        }

        return {
            id: item.dataset.server_id || null, // Pass ID if updating existing field
            label: item.querySelector('.field-label').value,
            type: type,
            options: options,
            required: item.querySelector('.field-required').checked,
            has_details: item.querySelector('.field-has-details') ? item.querySelector('.field-has-details').checked : false
        };
    });

    formData.append('fields', JSON.stringify(fieldsData));

    try {
        const res = await fetch(`${API_URL}/forms.php`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (res.ok) {
            alert(editingFormId ? 'Form updated!' : 'Form created!');
            resetCreateForm();
            showSection('forms-list');
            loadForms();
        } else {
            const err = await res.json();
            alert('Error: ' + (err.error || 'Unknown'));
        }
    } catch (err) {
        console.error(err);
    }
});

// --- View Submissions ---
async function viewSubmissions(formId) {
    try {
        const res = await fetch(`${API_URL}/submissions.php?form_id=${formId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.message);

        showSection('form-details');

        document.getElementById('export-btn').onclick = () => {
            window.location.href = `${API_URL}/export.php?form_id=${formId}`;
        };

        const thead = document.querySelector('#submissions-table thead');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th>ID</th><th>Date</th>';
        data.fields.forEach(f => {
            const th = document.createElement('th');
            th.textContent = f.label;
            headerRow.appendChild(th);
        });
        thead.innerHTML = '';
        thead.appendChild(headerRow);

        const tbody = document.querySelector('#submissions-table tbody');
        tbody.innerHTML = '';
        data.submissions.forEach(sub => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${sub.id}</td><td>${new Date(sub.submitted_at).toLocaleString()}</td>`;

            data.fields.forEach(f => {
                const td = document.createElement('td');
                const val = sub.answers[f.id] || '-';
                td.textContent = val;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error(err);
        alert('Could not load submissions');
    }
}

// --- User Management ---
async function loadUsers() {
    try {
        const res = await fetch(`${API_URL}/users.php`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await res.json();

        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';

        users.forEach(user => {
            const tr = document.createElement('tr');
            // Assuming admin user (id 1 or name 'admin') cannot be deleted/edited by others easily or at least we show it
            const permsString = user.permissions.join(', ') || 'None';

            tr.innerHTML = `
                <td>${user.username}</td>
                <td>${permsString}</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-secondary" onclick="editUser(${user.id}, '${user.username}', '${escapeJs(JSON.stringify(user.permissions))}')" style="font-size: 0.8rem;">Edit</button>
                    ${user.username !== 'admin' ? `<button class="btn btn-danger" onclick="deleteUser(${user.id})" style="font-size: 0.8rem; margin-left: 0.5rem;">Delete</button>` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading users:', err);
    }
}

// Simple escape for inline JS
function escapeJs(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

let editingUserId = null;

function showCreateUserModal() {
    editingUserId = null;
    document.getElementById('user-form-title').textContent = 'Create New User';
    document.getElementById('user-id').value = '';
    document.getElementById('user-username').value = '';
    document.getElementById('user-password').value = '';
    document.querySelectorAll('.user-permission').forEach(cb => cb.checked = false);

    showSection('create-user');
}

function editUser(id, username, permsJson) {
    editingUserId = id;
    const perms = typeof permsJson === 'string' ? JSON.parse(permsJson) : permsJson; // Handle both if passed loosely

    document.getElementById('user-form-title').textContent = 'Edit User';
    document.getElementById('user-id').value = id;
    document.getElementById('user-username').value = username;
    document.getElementById('user-password').value = ''; // Don't show password

    document.querySelectorAll('.user-permission').forEach(cb => {
        cb.checked = perms.includes(cb.value);
    });

    showSection('create-user');
}

async function deleteUser(id) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        const res = await fetch(`${API_URL}/users.php?id=${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            loadUsers();
        } else {
            alert('Failed to delete user');
        }
    } catch (err) {
        console.error(err);
    }
}

document.getElementById('create-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('user-id').value;
    const username = document.getElementById('user-username').value;
    const password = document.getElementById('user-password').value;

    const selectedPerms = Array.from(document.querySelectorAll('.user-permission:checked')).map(cb => cb.value);

    const payload = {
        username,
        permissions: selectedPerms
    };

    if (password) payload.password = password;
    if (id) payload.id = id;

    const method = id ? 'PUT' : 'POST';

    try {
        const res = await fetch(`${API_URL}/users.php${id ? '?id=' + id : ''}`, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert(id ? 'User updated!' : 'User created!');
            showSection('users-list');
            loadUsers();
        } else {
            const data = await res.json();
            alert('Error: ' + data.error);
        }
    } catch (err) {
        console.error(err);
        alert('Request failed');
    }
});

// Hook into showSection to load users if needed
const originalShowSection = showSection;
showSection = function (sectionId) {
    // Call original
    Object.values(sections).forEach(el => el.classList.add('hidden'));
    sections[sectionId].classList.remove('hidden');
    updateSidebar(sectionId); // Use new sidebar updater

    // Custom logic
    if (sectionId === 'create-form') {
        // We handle reset check above in original logic, but let's replicate or just use the override carefully.
        // Actually, since I replaced updateSidebar logic inside the original showSection replacement block above, 
        // I should have completely replaced showSection in the previous replacement tool call if I wanted to be clean.
        // But here I am appending. Let's just fix the section specific loading.
    }

    if (sectionId === 'users-list') {
        loadUsers();
    }

    // Re-apply permissions just in case views changed
    applyPermissions();
};

function applyPermissions() {
    // If no permissions loaded (or empty), assume no access?
    // Admin (username 'admin') usually gets all, but we rely on permissions array.
    // In migration, we gave admin all permissions.

    // 1. Manage Users Section Access
    // We didn't define a "manage_users" permission, we only have fill, edit, delete.
    // Implicitly, maybe only 'admin' or special user can see 'Manage Users'.
    // Or we can add a 'manage_users' permission.
    // For now, let's say if you have ANY permission you can login, but only if you have 'edit' or 'delete' maybe you are staff?
    // Requirement: "Admin kullanıcılara oturum açarak yetki verebilmeli" -> The super admin does this.
    // Let's assume only "admin" user can see "Manage Users" nav item for now to be safe, or add a permission.
    // The prompt says: "Admin kullanıcılara oturum açarak yetki verebilmeli yetkiler ise şu şekilde; *form doldurma *form düzenleme *form silme"
    // It doesn't explicitly say there's a "manage users" permission.
    // I'll hide "Manage Users" link if not 'admin' username for now to be safe, or check if user has all permissions.
    // Let's use a simpler check: if (permissions.includes('admin'))? No.
    // I'll check if username is 'admin'.

    // We didn't store username in localStorage! logic error.
    // Let's rely on the fact that we sent it in the login response, but we need to store it.
    // I'll update the login logic to store username too in the ReplaceFileContent above? I missed it.
    // Actually I can decode the token if it was a JWT, but it's not.
    // I will add username to localStorage in the login logic below (I'll add a small fix tool call for that or just assume it is stored).
    // Wait, I can just update the code right now to store it.

    // Hide/Show Edit buttons
    const canEdit = permissions.includes('edit');
    document.querySelectorAll('.btn-primary').forEach(btn => {
        if (btn.textContent === 'Edit') { // Fragile check but works for this simple app
            btn.style.display = canEdit ? 'inline-block' : 'none';
        }
    });

    // Hide/Show Delete buttons
    const canDelete = permissions.includes('delete');
    document.querySelectorAll('.btn-danger').forEach(btn => {
        if (btn.textContent === 'Delete') {
            btn.style.display = canDelete ? 'inline-block' : 'none';
        }
    });

    // Hide/Show Create New Form button
    // Assuming 'edit' allows creating? Usually yes.
    const createBtn = document.querySelector('button[onclick="showSection(\'create-form\')"]');
    if (createBtn) createBtn.style.display = canEdit ? 'inline-block' : 'none';

    // Sidebar items
    const navItems = document.querySelectorAll('.nav-item');
    // 0: My Forms (Everyone)
    // 1: Create New Form (Edit)
    if (navItems[1]) navItems[1].style.display = canEdit ? 'block' : 'none';

    // 2: Manage Users - Only if ALL permissions
    // Previously we checked username 'admin', now we check capabilities as requested.
    // "tüm 3 rolü de olan kişiye gözüksün" -> fill, edit, delete
    const hasAll = permissions.includes('fill') && permissions.includes('edit') && permissions.includes('delete');

    if (navItems[2]) navItems[2].style.display = hasAll ? 'block' : 'none';

    // Update "View Live" link to point to form_view.html instead of index.html
    document.querySelectorAll('a.btn-secondary').forEach(link => {
        if (link.textContent.trim() === 'View Live') {
            link.href = link.href.replace('index.html', 'form_view.html');
        }
    });
}

init();
