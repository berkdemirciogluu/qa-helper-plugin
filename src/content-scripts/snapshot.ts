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
  return {
    html: document.documentElement.outerHTML,
    doctype: '<!DOCTYPE html>',
    url: window.location.href,
  };
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


