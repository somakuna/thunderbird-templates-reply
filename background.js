// Sluša poruke iz popupa
browser.runtime.onMessage.addListener(async msg => {
  if (msg.action !== 'insertTemplate') return;
  // Whitelist the direction to a safe attribute value.
  const dir = msg.dir === 'rtl' ? 'rtl' : 'ltr';
  try {
    // 1. Nađi aktivni Compose tab
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
      windowType: 'messageCompose',
    });
    if (!tab) throw new Error('Nije pronađen Compose tab');
    // 2. Dohvati postojeći sadržaj
    const details = await browser.compose.getComposeDetails(tab.id);
    // 3. Spoji stari i novi tekst
    let newBody;
    if (details.isPlainText) {
      // 1. Grab existing text
      const old = details.plainTextBody || '';

      // 2. Template content may be rich HTML; flatten it to plain text.
      const text = isHtml(msg.text) ? htmlToText(msg.text) : msg.text;

      // 3. Plain text has no markup for direction; prepend a RIGHT-TO-LEFT
      //    MARK (U+200F) so conforming clients render the block right-to-left.
      const mark = dir === 'rtl' ? '\u200F' : '';

      // 4. Build new body by prepending with a one-line spacer
      //    If there's no old content, just use the template text
      newBody = mark + text + (old ? '\n' + old : '');

      // 5. Set the updated plain-text body
      await browser.compose.setComposeDetails(tab.id, {
        plainTextBody: newBody,
      });
    } else {
      const old = details.body || '';
      // Rich HTML is used as-is; legacy plain text gets its newlines converted.
      const tpl = isHtml(msg.text) ? msg.text : msg.text.replace(/\n/g, '<br>');
      // Wrap the template in a directional block so it renders correctly.
      const htmlTpl = '<div dir="' + dir + '">' + tpl + '</div>';
      const bodyTag = '<body';
      const bodyIdx = old.indexOf(bodyTag);

      if (bodyIdx !== -1) {
        const insertAt = old.indexOf('>', bodyIdx) + 1;
        newBody =
          old.slice(0, insertAt) + '\n' + htmlTpl + '\n' + old.slice(insertAt);
      } else {
        newBody = htmlTpl + old;
      }

      await browser.compose.setComposeDetails(tab.id, { body: newBody });
    }
    // 4. Obavijest korisniku
    await browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/icon.png'),
      title: 'Template inserted',
      message: 'Successfully',
    });
  } catch (e) {
    console.error('background.js error:', e);
    browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/icon.png'),
      title: 'Error on inserting!',
      message: e.message,
    });
  }
});
