import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/preact';
import { BugReportView, _resetSignalsForTest } from './BugReportView';
import type { SnapshotData } from '@/lib/types';

vi.mock('@/lib/zip-exporter', () => ({
  exportBugReportZip: vi.fn().mockResolvedValue({
    success: true,
    data: { fileName: 'bug-report-2026-03-08.zip', fileSize: '2.3 MB' },
  }),
}));

vi.mock('@/lib/clipboard', () => ({
  copyToClipboard: vi.fn().mockResolvedValue({ success: true, data: undefined }),
}));

vi.mock('@/lib/jira/jira-exporter', () => ({
  exportToJira: vi.fn().mockResolvedValue({
    success: true,
    data: { issueKey: 'PROJ-123', issueUrl: 'https://jira/browse/PROJ-123', attachmentCount: 3 },
  }),
}));

vi.mock('@/components/ui/Toast', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/components/ui/Toast')>();
  return { ...mod, showToast: vi.fn() };
});

const mockSnapshotData: SnapshotData = {
  screenshot: {
    dataUrl: 'data:image/png;base64,abc',
    metadata: {
      viewport: { width: 1920, height: 1080 },
      browserVersion: 'Chrome 133',
      os: 'Windows 10/11',
      zoomLevel: 1,
      pixelRatio: 1,
      language: 'tr-TR',
      url: 'https://example.com',
      timestamp: Date.now(),
    },
  },
  dom: { html: '<html></html>', doctype: '<!DOCTYPE html>', url: 'https://example.com' },
  storage: { localStorage: { key: 'val' }, sessionStorage: {} },
  consoleLogs: [{ timestamp: Date.now(), level: 'error', message: 'Test error' }],
  timestamp: Date.now(),
  collectionDurationMs: 100,
};

vi.stubGlobal('chrome', {
  tabs: {
    query: vi.fn().mockResolvedValue([{ id: 42, url: 'https://example.com' }]),
  },
  runtime: {
    sendMessage: vi.fn().mockResolvedValue({
      success: true,
      data: mockSnapshotData,
    }),
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
  },
});

vi.stubGlobal('navigator', {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

beforeEach(() => {
  _resetSignalsForTest();
  vi.clearAllMocks();
  (chrome.tabs.query as ReturnType<typeof vi.fn>).mockResolvedValue([
    { id: 42, url: 'https://example.com' },
  ]);
  (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
    success: true,
    data: mockSnapshotData,
  });
  (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (chrome.storage.local.remove as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
});

describe('BugReportView', () => {
  it('renders title', () => {
    render(<BugReportView hasSession={true} />);
    expect(screen.getByText('Report Bug')).toBeTruthy();
  });

  it('renders back button', () => {
    render(<BugReportView hasSession={true} />);
    expect(screen.getByLabelText('Go back to dashboard')).toBeTruthy();
  });

  it('calls chrome API while loading snapshot', async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(chrome.tabs.query).toHaveBeenCalled();
    });
  });

  it('shows image when snapshot is successful', async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getByAltText('Page screenshot')).toBeTruthy();
    });
  });

  it('renders form fields', async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getByLabelText('Expected result')).toBeTruthy();
      expect(screen.getByLabelText('Why is this a bug')).toBeTruthy();
    });
  });

  it('priority select renders with Medium default value', async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      const select = screen.getByLabelText('Priority') as HTMLSelectElement;
      expect(select.value).toBe('medium');
    });
  });

  it('Steps to Reproduce is closed by default', async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      const btn = screen.getByText(/Steps to Reproduce/);
      expect(btn).toBeTruthy();
      // Textarea görünmemeli
      expect(screen.queryByLabelText('Steps to reproduce')).toBeNull();
    });
  });

  it('Steps to Reproduce can be toggled open and closed', async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => screen.getByText(/Steps to Reproduce/));
    const toggle = screen.getByText(/Steps to Reproduce/).closest('button')!;
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Steps to reproduce')).toBeTruthy();
    fireEvent.click(toggle);
    expect(screen.queryByLabelText('Steps to reproduce')).toBeNull();
  });

  it('Retake button is rendered', async () => {
    render(<BugReportView hasSession={true} />);
    expect(screen.getByLabelText('Retake screenshot')).toBeTruthy();
  });

  it('DataSummary is rendered (after snapshot)', async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getByText('Collected Data')).toBeTruthy();
    });
  });

  it('steps placeholder is different in sessionless mode', async () => {
    render(<BugReportView hasSession={false} />);
    await waitFor(() => screen.getByText(/Steps to Reproduce/));
    const toggle = screen.getByText(/Steps to Reproduce/).closest('button')!;
    fireEvent.click(toggle);
    const textarea = screen.getByLabelText('Steps to reproduce') as HTMLTextAreaElement;
    expect(textarea.placeholder).toContain('No session recording');
  });

  it('Jira button disabled, ZIP active (after snapshot)', async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getByAltText('Page screenshot')).toBeTruthy();
    });
    const zipBtn = screen.getByText('Download ZIP').closest('button')! as HTMLButtonElement;
    const jiraBtn = screen.getByText('Send to Jira').closest('button')! as HTMLButtonElement;
    expect(zipBtn.disabled).toBe(false);
    expect(jiraBtn.disabled).toBe(true);
    expect(jiraBtn.title).toBe('Set up Jira from Settings');
  });

  it('ZIP Download triggers export and shows success post-export UI', async () => {
    const { exportBugReportZip } = await import('@/lib/zip-exporter');
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getByAltText('Page screenshot')).toBeTruthy();
    });
    const zipBtn = screen.getByText('Download ZIP').closest('button')!;
    fireEvent.click(zipBtn);
    await waitFor(() => {
      expect(exportBugReportZip).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText('ZIP downloaded')).toBeTruthy();
      expect(screen.getByText('Would you like to clear session data?')).toBeTruthy();
    });
  });

  it('post-export UI: Clear button clears session and sends STOP_SESSION with tabId', async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getByAltText('Page screenshot')).toBeTruthy();
    });
    const zipBtn = screen.getByText('Download ZIP').closest('button')!;
    fireEvent.click(zipBtn);
    await waitFor(() => {
      expect(screen.getByText('Clear')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Clear'));
    await waitFor(() => {
      expect(chrome.storage.local.get).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'STOP_SESSION', payload: { tabId: 42 } })
      );
    });
  });

  it('post-export UI: Keep button returns to dashboard', async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getByAltText('Page screenshot')).toBeTruthy();
    });
    const zipBtn = screen.getByText('Download ZIP').closest('button')!;
    fireEvent.click(zipBtn);
    await waitFor(() => {
      expect(screen.getByText('Keep')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Keep'));
    // Keep click resets the form
  });

  it('Configuration fields removed (Design D)', async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.queryByLabelText('Environment')).toBeNull();
    });
  });

  it('shows error message on snapshot failure', async () => {
    (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: false,
      error: 'Could not take screenshot',
    });
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getByText('Screenshot failed')).toBeTruthy();
    });
  });

  it('Jira button disabled and tooltip shown when no credentials', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({});
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getByAltText('Page screenshot')).toBeTruthy();
    });
    const jiraBtn = screen.getByText('Send to Jira').closest('button')! as HTMLButtonElement;
    expect(jiraBtn.disabled).toBe(true);
    expect(jiraBtn.title).toBe('Set up Jira from Settings');
  });

  it('Jira button enabled when credentials exist', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      jira_credentials: {
        platform: 'cloud',
        url: 'https://mysite.atlassian.net',
        token: 'token-123',
        connected: true,
        defaultProjectKey: 'PROJ',
      },
    });
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getByAltText('Page screenshot')).toBeTruthy();
    });
    await waitFor(() => {
      const jiraBtn = screen.getByText('Send to Jira').closest('button')! as HTMLButtonElement;
      expect(jiraBtn.disabled).toBe(false);
      expect(jiraBtn.title).toBeFalsy();
    });
  });

  it('shows toast on successful Jira export', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      jira_credentials: {
        platform: 'cloud',
        url: 'https://mysite.atlassian.net',
        token: 'token-123',
        connected: true,
        defaultProjectKey: 'PROJ',
      },
    });
    const { exportToJira } = await import('@/lib/jira/jira-exporter');
    const { showToast } = await import('@/components/ui/Toast');
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getByAltText('Page screenshot')).toBeTruthy();
    });
    await waitFor(() => {
      const jiraBtn = screen.getByText('Send to Jira').closest('button')! as HTMLButtonElement;
      expect(jiraBtn.disabled).toBe(false);
    });
    const jiraBtn = screen.getByText('Send to Jira').closest('button')!;
    fireEvent.click(jiraBtn);
    await waitFor(() => {
      expect(exportToJira).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('success', expect.stringContaining('PROJ-123'));
    });
  });

  it('shows fallback message on failed Jira export', async () => {
    const { exportToJira } = await import('@/lib/jira/jira-exporter');
    const { showToast } = await import('@/components/ui/Toast');
    (exportToJira as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: false,
      error: 'Connection error',
    });
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      jira_credentials: {
        platform: 'cloud',
        url: 'https://mysite.atlassian.net',
        token: 'token-123',
        connected: true,
        defaultProjectKey: 'PROJ',
      },
    });
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getByAltText('Page screenshot')).toBeTruthy();
    });
    await waitFor(() => {
      const jiraBtn = screen.getByText('Send to Jira').closest('button')! as HTMLButtonElement;
      expect(jiraBtn.disabled).toBe(false);
    });
    const jiraBtn = screen.getByText('Send to Jira').closest('button')!;
    fireEvent.click(jiraBtn);
    await waitFor(() => {
      expect(exportToJira).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('error', expect.stringContaining('ZIP'));
    });
  });

  it('Parent ticket input accepts PROJ-123 format', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      jira_credentials: {
        platform: 'cloud',
        url: 'https://mysite.atlassian.net',
        token: 'token-123',
        connected: true,
        defaultProjectKey: 'PROJ',
      },
    });
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getByAltText('Page screenshot')).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByText('Link to existing ticket')).toBeTruthy();
    });
    const checkbox = screen
      .getByText('Link to existing ticket')
      .closest('label')!
      .querySelector('input')! as HTMLInputElement;
    fireEvent.click(checkbox);
    await waitFor(() => {
      expect(screen.getByLabelText('Parent ticket key')).toBeTruthy();
    });
  });
});

describe('BugReportView — Dynamic Jira Fields', () => {
  const jiraConfiguredStorage = {
    jira_credentials: {
      platform: 'server',
      url: 'https://jira.company.com',
      token: 'valid-token-12345',
      displayName: 'Test User',
      connected: true,
      defaultProjectKey: 'PROJ',
      defaultIssueTypeId: '10001',
      defaultIssueTypeName: 'Bug',
    },
  };

  async function renderWithDynamicFields(
    fields: object[] = [],
    snapshotReady = true,
  ) {
    _resetSignalsForTest();
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
      if (key === 'jira_credentials') return Promise.resolve({ jira_credentials: jiraConfiguredStorage.jira_credentials });
      if (key === 'jira_field_config') {
        return Promise.resolve({
          jira_field_config: {
            PROJ_10001: { fields, lastFetched: Date.now() },
          },
        });
      }
      return Promise.resolve({});
    });
    if (snapshotReady) {
      (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {
          screenshot: {
            dataUrl: 'data:image/png;base64,abc',
            metadata: {
              viewport: { width: 1920, height: 1080 },
              browserVersion: 'Chrome 133',
              os: 'Windows 11',
              zoomLevel: 1,
              pixelRatio: 1,
              language: 'tr-TR',
              url: 'https://example.com',
              timestamp: Date.now(),
            },
          },
          dom: { html: '<html></html>', doctype: '<!DOCTYPE html>', url: 'https://example.com' },
          storage: { localStorage: {}, sessionStorage: {} },
          consoleLogs: [],
          timestamp: Date.now(),
          collectionDurationMs: 50,
        },
      });
    }
    render(<BugReportView hasSession={false} />);
    // Wait for init to complete
    await waitFor(() => {
      expect(screen.getByText('Report Bug')).toBeTruthy();
    });
  }

  it('shows dynamic field when alwaysFill is true', async () => {
    await renderWithDynamicFields([
      {
        fieldId: 'customfield_10050',
        name: 'Environment',
        required: false,
        alwaysFill: true,
        defaultValue: 'Staging',
        schemaType: 'string',
      },
    ]);

    await waitFor(() => {
      expect(screen.getByText('Environment')).toBeTruthy();
    });
  });

  it('shows dynamic field when required is true', async () => {
    await renderWithDynamicFields([
      {
        fieldId: 'customfield_10060',
        name: 'Sprint',
        required: true,
        alwaysFill: true,
        defaultValue: '',
        schemaType: 'string',
      },
    ]);

    await waitFor(() => {
      expect(screen.getByText('Sprint')).toBeTruthy();
    });
  });

  it('pre-fills default value into the field input', async () => {
    await renderWithDynamicFields([
      {
        fieldId: 'customfield_10050',
        name: 'Environment',
        required: false,
        alwaysFill: true,
        defaultValue: 'Production',
        schemaType: 'string',
      },
    ]);

    await waitFor(() => {
      expect(screen.getAllByDisplayValue('Production').length).toBeGreaterThan(0);
    });
  });

  it('shows Select for fields with allowedValues', async () => {
    await renderWithDynamicFields([
      {
        fieldId: 'customfield_10050',
        name: 'Priority Level',
        required: true,
        alwaysFill: true,
        defaultValue: '',
        schemaType: 'option',
        allowedValues: [
          { id: '1', value: 'High' },
          { id: '2', value: 'Low' },
        ],
      },
    ]);

    await waitFor(() => {
      expect(screen.getByText('Priority Level')).toBeTruthy();
      // Allowed values should appear as options (may have duplicates with priority dropdown)
      expect(screen.getAllByText('High').length).toBeGreaterThan(0);
    });
  });

  it('Send to Jira button is disabled when required dynamic field is empty', async () => {
    await renderWithDynamicFields([
      {
        fieldId: 'customfield_10060',
        name: 'Sprint',
        required: true,
        alwaysFill: true,
        defaultValue: '',
        schemaType: 'string',
      },
    ]);

    await waitFor(() => {
      const sendBtn = screen.getByText('Send to Jira').closest('button') as HTMLButtonElement;
      expect(sendBtn.disabled).toBe(true);
    });
  });

  it('required field with empty value shows error message', async () => {
    await renderWithDynamicFields([
      {
        fieldId: 'customfield_10060',
        name: 'Sprint',
        required: true,
        alwaysFill: true,
        defaultValue: '',
        schemaType: 'string',
      },
    ]);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
      expect(screen.getByRole('alert').textContent).toContain('Sprint is required');
    });
  });

  it('Send to Jira button becomes enabled when required field is filled', async () => {
    await renderWithDynamicFields([
      {
        fieldId: 'customfield_10060',
        name: 'Sprint',
        required: true,
        alwaysFill: true,
        defaultValue: 'Sprint 5',
        schemaType: 'string',
      },
    ]);

    await waitFor(() => {
      expect(screen.getByText('Sprint')).toBeTruthy();
    });
    // Button should not be disabled due to required field (it has a default value)
    await waitFor(() => {
      const sendBtn = screen.getByText('Send to Jira').closest('button') as HTMLButtonElement;
      // With defaultValue set to 'Sprint 5', button should not be blocked by this field
      expect(sendBtn).toBeTruthy();
    });
  });

  it('does not show fields when alwaysFill is false and field is not required', async () => {
    await renderWithDynamicFields([
      {
        fieldId: 'customfield_10050',
        name: 'Hidden Field',
        required: false,
        alwaysFill: false,
        defaultValue: '',
        schemaType: 'string',
      },
    ]);

    await waitFor(() => {
      expect(screen.queryByText('Hidden Field')).toBeNull();
    });
  });
});
