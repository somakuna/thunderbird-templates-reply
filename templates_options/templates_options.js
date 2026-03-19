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
            <span class="template-name">${template.name}</span>
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

// Load templates on page load
window.addEventListener('load', async () => {
    const templates = await getTemplates();
    renderTemplates(templates);
});