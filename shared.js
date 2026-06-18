// shared.js
// Shared helpers used by popup.js, templates_options.js and background.js.
// Loaded as a plain script before each page script, and listed first in
// the background scripts array in manifest.json.

const TEMPLATE_STORAGE_KEY = 'message_templates';

// Allowed stored direction values for a template.
const DIR_AUTO = 'auto';
const DIR_LTR = 'ltr';
const DIR_RTL = 'rtl';

// Strong RTL scripts: Hebrew, Arabic, Syriac, Thaana, Arabic Supplement,
// Arabic Extended-A, plus the Arabic/Hebrew presentation-form blocks.
const RTL_CHARS = /[֐-׿؀-ۿ܀-ݏݐ-ݿࢠ-ࣿיִ-﷿ﹰ-﻿]/;
// Strong LTR: basic Latin letters plus Latin-1/Extended ranges.
const LTR_CHARS = /[A-Za-zÀ-ʯ]/;

/**
 * Detects the base direction of a string from its first strong-directional
 * character (the Unicode first-strong heuristic). Falls back to 'ltr'.
 * @param {string} text
 * @returns {'ltr'|'rtl'}
 */
function detectDir(text) {
    for (const ch of text || '') {
        if (RTL_CHARS.test(ch)) return DIR_RTL;
        if (LTR_CHARS.test(ch)) return DIR_LTR;
    }
    return DIR_LTR;
}

/**
 * Resolves a template's stored direction ('auto'|'ltr'|'rtl') to a concrete
 * 'ltr' or 'rtl'. Missing/unknown values are treated as 'auto'.
 * @param {{content?: string, dir?: string}} template
 * @returns {'ltr'|'rtl'}
 */
function resolveDir(template) {
    const dir = (template && template.dir) || DIR_AUTO;
    if (dir === DIR_LTR || dir === DIR_RTL) return dir;
    return detectDir(template ? template.content : '');
}

/**
 * Retrieves all templates from local storage. Returns [] on error or when
 * nothing is stored. Shared by the popup and the options page.
 * @returns {Promise<Array<{id: string, name: string, content: string, dir?: string}>>}
 */
async function getTemplates() {
    try {
        const result = await browser.storage.local.get(TEMPLATE_STORAGE_KEY);
        return result[TEMPLATE_STORAGE_KEY] || [];
    } catch (error) {
        console.error('Error retrieving templates:', error);
        return [];
    }
}

/**
 * Applies the application UI direction to the current document, based on the
 * predefined @@bidi_dir message (returns 'ltr' or 'rtl' per the active locale).
 * No-op in contexts without a document (e.g. the background script).
 */
function applyUiDirection() {
    if (typeof document === 'undefined' || !document.documentElement) return;
    let dir = DIR_LTR;
    try {
        dir = browser.i18n.getMessage('@@bidi_dir') || DIR_LTR;
    } catch (error) {
        dir = DIR_LTR;
    }
    document.documentElement.setAttribute('dir', dir);
}

/**
 * Heuristic: does the string contain HTML markup (an element tag)?
 * @param {string} s
 * @returns {boolean}
 */
function isHtml(s) {
    return /<([a-z][a-z0-9]*)\b[^>]*>/i.test(s || '');
}

/**
 * Converts HTML to a reasonable plain-text equivalent, preserving line breaks
 * from <br> and block elements and prefixing list items with "- ".
 * Requires a DOM (available in the background page and options page).
 * @param {string} html
 * @returns {string}
 */
function htmlToText(html) {
    if (typeof DOMParser === 'undefined') return html || '';
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    doc.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    doc.querySelectorAll('li').forEach(li => li.prepend('- '));
    doc.querySelectorAll('p, div, li, tr, h1, h2, h3, h4, h5, h6').forEach(el => el.append('\n'));
    return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}
