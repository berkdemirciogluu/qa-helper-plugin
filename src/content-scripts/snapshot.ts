// Boş export — TypeScript'in bu dosyayı script yerine modül olarak tanıması için
export {};

chrome.runtime.onMessage.addListener(
  (
    message: { action: string; payload?: unknown },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: { success: boolean; data?: unknown; error?: string }) => void,
  ) => {
    if (message.action === 'TAKE_SNAPSHOT') {
      collectSnapshot()
        .then((data) => sendResponse({ success: true, data }))
        .catch((err: unknown) => {
          const error = err instanceof Error ? err.message : String(err);
          sendResponse({ success: false, error });
        });
      return true; // async response
    }
  },
);

async function collectSnapshot(): Promise<{
  dom: { html: string; doctype: string; url: string };
  storage: { localStorage: Record<string, string>; sessionStorage: Record<string, string> };
}> {
  const dom = serializeDOM();
  const storage = dumpStorage();
  return { dom, storage };
}

function serializeDOM(): { html: string; doctype: string; url: string } {
  // Clone DOM and inline external styles for offline viewing
  const clone = document.documentElement.cloneNode(true) as HTMLElement;

  // Remove external <link rel="stylesheet"> and <style> with @import
  // Replace with inlined <style> blocks from cssRules
  const inlinedCss = collectInlineCSS();
  const linkTags = clone.querySelectorAll('link[rel="stylesheet"]');
  linkTags.forEach((link) => link.remove());

  // Inject all collected CSS as a single <style> block in <head>
  const headClone = clone.querySelector('head');
  if (headClone && inlinedCss) {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-qa-helper', 'inlined-styles');
    styleEl.textContent = inlinedCss;
    headClone.appendChild(styleEl);
  }

  // Add <base> tag so relative URLs for images etc. still resolve
  if (headClone && !clone.querySelector('base')) {
    const base = document.createElement('base');
    base.href = window.location.href;
    headClone.insertBefore(base, headClone.firstChild);
  }

  return {
    html: clone.outerHTML,
    doctype: '<!DOCTYPE html>',
    url: window.location.href,
  };
}

function collectInlineCSS(): string {
  const cssTexts: string[] = [];
  try {
    for (let i = 0; i < document.styleSheets.length; i++) {
      const sheet = document.styleSheets[i];
      try {
        const rules = sheet.cssRules;
        for (let j = 0; j < rules.length; j++) {
          cssTexts.push(rules[j].cssText);
        }
      } catch {
        // Cross-origin stylesheet — fetch ile dene
        if (sheet.href) {
          cssTexts.push(`/* Cross-origin stylesheet: ${sheet.href} */`);
        }
      }
    }
  } catch {
    // StyleSheets erişim hatası
  }
  return cssTexts.join('\n');
}

function dumpStorage(): {
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
} {
  return {
    localStorage: dumpStorageObject(window.localStorage),
    sessionStorage: dumpStorageObject(window.sessionStorage),
  };
}

function dumpStorageObject(storage: Storage): Record<string, string> {
  try {
    const result: Record<string, string> = {};
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key !== null) {
        result[key] = storage.getItem(key) ?? '';
      }
    }
    return result;
  } catch {
    // Cross-origin iframe'lerde erişim kısıtlı olabilir
    return {};
  }
}


