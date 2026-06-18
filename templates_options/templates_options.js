// templates_options/templates_options.js

const TEMPLATE_STORAGE_KEY = 'message_templates';

// Initialization of IDs
const templateForm = document.getElementById('template-form');
const templateList = document.getElementById('templates-list');
const noTemplatesMessage = document.getElementById('no-templates');
const saveButton = document.getElementById('save-button');
const cancelButton = document.getElementById('cancel-edit');
const formLegend = document.getElementById('form-legend');

/**
 * Retrieves all templates from Thunderbird 'storage'
 * @returns {Promise<Array>} Array of template objects
 */
async function getTemplates() {
    try {
        const result = await browser.storage.local.get(TEMPLATE_STORAGE_KEY);
        // Returns an empty array if no data is stored
        return result[TEMPLATE_STORAGE_KEY] || []; 
    } catch (error) {
        console.error("Error retrieving templates:", error);
        return [];
    }
}

/**
 * Saves the array of templates to Thunderbird 'storage'
 * @param {Array} templates Array of template objects
 */
async function saveTemplates(templates) {
    try {
        await browser.storage.local.set({ [TEMPLATE_STORAGE_KEY]: templates });
        console.log("Templates successfully saved.");
    } catch (error) {
        console.error("Error saving templates:", error);
    }
}


/**
 * Strips HTML tags and trims template content for use as a list preview
 * @param {string} content Raw template content (may contain HTML)
 * @returns {string} A short, single-line preview
 */
function getPreviewText(content) {
    const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const maxLength = 80;
    return plainText.length > maxLength ? `${plainText.slice(0, maxLength)}…` : plainText;
}

/**
 * Escapes HTML special characters for safe insertion into innerHTML
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Displays templates on the HTML page
 * @param {Array} templates Array of template objects
 */
function renderTemplates(templates) {
    templateList.innerHTML = ''; // Clear the existing list
    
    if (templates.length === 0) {
        templateList.appendChild(noTemplatesMessage);
        noTemplatesMessage.style.display = 'block';
        return;
    }
    noTemplatesMessage.style.display = 'none';

    templates.forEach(template => {
        const item = document.createElement('div');
        item.className = 'template-item';
        item.innerHTML = `
            <div class="template-info">
                <span class="template-name">${escapeHtml(template.name)}</span>
                <span class="template-preview">${escapeHtml(getPreviewText(template.content))}</span>
            </div>
            <div>
                <button data-id="${template.id}" class="edit-btn">Edit</button>
                <button data-id="${template.id}" class="delete-btn">Delete</button>
            </div>
        `;
        templateList.appendChild(item);
    });

    // Adding Listeners for Edit/Delete
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', handleEdit);
    });
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', handleDelete);
    });
}

/**
 * Handles form submission (Add or Save Edited)
 */
templateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('template-id').value;
    const name = document.getElementById('template-name').value;
    const content = document.getElementById('template-content').value;

    let templates = await getTemplates();

    const nameTaken = templates.some(
        t => t.id !== id && t.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (nameTaken) {
        alert(`A template named "${name}" already exists. Please choose a different name.`);
        return;
    }

    if (id) {
        // EDITING EXISTING
        const index = templates.findIndex(t => t.id === id);
        if (index > -1) {
            templates[index] = { id, name, content };
        }
    } else {
        // ADDING NEW
        const newId = Date.now().toString(); // Simple unique ID
        templates.push({ id: newId, name, content });
    }
    
    await saveTemplates(templates);
    renderTemplates(templates);
    resetForm();
});

/**
 * Deletes a template
 */
async function handleDelete(e) {
    if (!confirm('Are you sure you want to delete this template?')) {
        return;
    }
    const idToDelete = e.target.dataset.id;
    let templates = await getTemplates();
    
    // Filter to exclude the template with that ID
    templates = templates.filter(t => t.id !== idToDelete);
    
    await saveTemplates(templates);
    renderTemplates(templates);
}

/**
 * Loads template data into the edit form
 */
async function handleEdit(e) {
    const idToEdit = e.target.dataset.id;
    const templates = await getTemplates();
    const template = templates.find(t => t.id === idToEdit);
    
    if (template) {
        document.getElementById('template-id').value = template.id;
        document.getElementById('template-name').value = template.name;
        document.getElementById('template-content').value = template.content;
        
        // Update UI to signal editing
        formLegend.textContent = 'Edit Template';
        saveButton.textContent = 'Update Template';
        cancelButton.style.display = 'inline';
        
        // Scroll to the top of the form
        window.scrollTo(0, 0);
    }
}

/**
 * Resets the editing state and clears the form
 */
function resetForm() {
    templateForm.reset();
    document.getElementById('template-id').value = '';
    
    formLegend.textContent = 'Add New Template';
    saveButton.textContent = 'Save Template';
    cancelButton.style.display = 'none';
}

cancelButton.addEventListener('click', resetForm);

/**
 * Exports all templates as a downloadable JSON file
 */
async function handleExport() {
    const templates = await getTemplates();
    const exportData = {
        type: 'thunderbird-templates-reply',
        version: 1,
        exportedAt: new Date().toISOString(),
        templates
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `templates-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/**
 * Validates that a parsed object looks like a template
 */
function isValidTemplate(t) {
    return t && typeof t.name === 'string' && typeof t.content === 'string';
}

/**
 * Reads the chosen file, parses it and merges/replaces stored templates
 */
async function handleImportFile(e) {
    const file = e.target.files[0];
    e.target.value = ''; // reset so the same file can be re-selected later
    if (!file) {
        return;
    }

    let parsed;
    try {
        const text = await file.text();
        parsed = JSON.parse(text);
    } catch (error) {
        alert('Selected file is not a valid JSON file.');
        return;
    }

    const importedTemplates = Array.isArray(parsed) ? parsed : parsed.templates;
    if (!Array.isArray(importedTemplates) || !importedTemplates.every(isValidTemplate)) {
        alert('This file does not contain a valid templates export.');
        return;
    }

    const replace = confirm(
        `Found ${importedTemplates.length} template(s) in the file.\n\n` +
        `Click "OK" to MERGE them with your existing templates.\n` +
        `Click "Cancel" to REPLACE all existing templates with the imported ones.`
    );

    const existingTemplates = await getTemplates();
    let finalTemplates;

    if (replace === true) {
        // Merge: keep existing templates, append imported ones with fresh IDs
        // to avoid id collisions, skipping exact name+content duplicates.
        const newOnes = importedTemplates
            .filter(t => !existingTemplates.some(e => e.name === t.name && e.content === t.content))
            .map((t, i) => ({ name: t.name, content: t.content, id: `${Date.now()}-${i}` }));
        finalTemplates = [...existingTemplates, ...newOnes];
    } else {
        // Replace: overwrite everything with the imported templates
        finalTemplates = importedTemplates.map((t, i) => ({
            name: t.name,
            content: t.content,
            id: t.id || `${Date.now()}-${i}`
        }));
    }

    await saveTemplates(finalTemplates);
    renderTemplates(finalTemplates);
    alert('Templates imported successfully.');
}

document.getElementById('export-button').addEventListener('click', handleExport);
document.getElementById('import-button').addEventListener('click', () => {
    document.getElementById('import-file-input').click();
});
document.getElementById('import-file-input').addEventListener('change', handleImportFile);

// Load templates on page load
window.addEventListener('load', async () => {
    const templates = await getTemplates();
    renderTemplates(templates);
});