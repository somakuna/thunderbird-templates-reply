// Sluša poruke iz popupa
browser.runtime.onMessage.addListener(async msg => {
  if (msg.action !== 'insertTemplate') return;
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

      // 2. Build new body by prepending with two-line break spacer
      //    If there's no old content, just use msg.text
      newBody = msg.text + (old ? '\n' + old : '');

      // 3. Set the updated plain-text body
      await browser.compose.setComposeDetails(tab.id, {
        plainTextBody: newBody,
      });
    } else {
      const old = details.body || '';
      const htmlTpl = msg.text.replace(/\n/g, '<br>');
      const bodyTag = '<body';
      const bodyIdx = old.indexOf(bodyTag);

      if (bodyIdx !== -1) {
        const insertAt = old.indexOf('>', bodyIdx) + 1;
        newBody =
          old.slice(0, insertAt) + '\n' + htmlTpl + '\n' + old.slice(insertAt);
      } else {
        newBody = htmlTpl + '<br>' + old;
      }

      await browser.compose.setComposeDetails(tab.id, { body: newBody });
    }
    // 4. Obavijest korisniku
    await browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/icon.png'),
      title: 'Template inserted',
      message: 'Sucessfully',
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
