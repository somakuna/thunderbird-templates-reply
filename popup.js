// popup.js (Updated with "Manage templates" link)
// TEMPLATE_STORAGE_KEY, getTemplates, resolveDir and applyUiDirection live in shared.js.

/**
 * Sends a message to background.js with the template content and resolved
 * direction ('ltr'|'rtl') for insertion.
 * @param {{content: string, dir?: string}} template The template to insert.
 */
function insertTemplateAndClose(template) {
    // Sends a message to background.js (Action is "insertTemplate")
    browser.runtime.sendMessage({
        action: 'insertTemplate',
        text: template.content,
        dir: resolveDir(template)
    }).catch(e => console.error("Error sending message to background:", e));

    // Closes the popup window after sending
    window.close();
}


/**
 * Creates buttons for each template, and adds the divider/manage link if templates exist.
 */
async function renderPopupButtons() {
    applyUiDirection();
    const templates = await getTemplates();
    const templateList = document.getElementById('template-list');

    // Clear old content
    templateList.innerHTML = '';

    if (templates.length === 0) {
        // --- LOGIC FOR NO SAVED TEMPLATES (Remains unchanged) ---
        templateList.innerHTML = `
            <p style="font-size: 0.9em; color: #555;">
                No templates saved.
                <a href="#" id="open-options" style="color: blue;">Add them here.</a>
            </p>`;

        document.getElementById('open-options').addEventListener('click', (e) => {
            e.preventDefault();
            browser.runtime.openOptionsPage();
            window.close();
        });
        return;
    }

    // --- RENDER TEMPLATE BUTTONS ---
    templates.forEach(template => {
        const button = document.createElement('button');
        button.textContent = template.name;
        // Let the template name render in its own base direction (Hebrew/Arabic names).
        button.dir = 'auto';

        // Sets listener for sending the message
        button.addEventListener('click', () => {
            insertTemplateAndClose(template);
        });

        templateList.appendChild(button);
    });

    // --- ADD DIVIDER AND 'MANAGE TEMPLATES' LINK (New Section) ---

    // 1. Create a horizontal divider (<hr>)
    const divider = document.createElement('hr');
    divider.style.marginTop = '8px';
    divider.style.marginBottom = '8px';
    templateList.appendChild(divider);

    // 2. Create the link element (<a>)
    const manageLink = document.createElement('a');
    manageLink.href = "#";
    manageLink.id = 'manage-templates';
    manageLink.textContent = 'Manage templates';

    // Style the link to match the 'Add them here' style for consistency
    manageLink.style.display = 'block';
    manageLink.style.textAlign = 'center';
    manageLink.style.fontSize = '0.8em';
    manageLink.style.textDecoration = 'none';
    manageLink.style.color = 'blue'; // Use blue color like the 'Add them here' link

    // 3. Add the click listener to open options
    manageLink.addEventListener('click', (e) => {
        e.preventDefault();
        browser.runtime.openOptionsPage(); // Opens the options page
        window.close(); // Closes the current popup
    });

    // 4. Append the link below the divider
    templateList.appendChild(manageLink);
}

// Initialize the interface after the DOM loads
document.addEventListener('DOMContentLoaded', renderPopupButtons);
