import { describe, it, expect } from 'vitest';
import { buildDescription } from './description-builder';
import type { ConfigFields } from './types';

const defaultForm = {
  expectedResult: 'Login butonuna tıklayınca ana sayfaya yönlenmeli',
  reason: 'Login butonuna tıklayınca 500 hatası alınıyor',
  priority: 'high' as const,
};

const defaultConfig: ConfigFields = {
  environment: 'staging',
  project: 'e-commerce',
  agileTeam: 'Team Alpha',
  testCycle: 'Sprint 1',
};

const defaultEnvironment = {
  browser: 'Chrome 133',
  os: 'Windows 11',
  viewport: '1920x1080',
  pixelRatio: 1,
  language: 'tr-TR',
  url: 'https://app.com/login',
};

describe('buildDescription', () => {
  it('tüm bölümleri içeren description üretir', () => {
    const result = buildDescription({
      form: defaultForm,
      stepsText: '1. Sayfaya gidildi\n2. Butona tıklandı',
      environment: defaultEnvironment,
      configFields: defaultConfig,
    });

    expect(result).toContain('## Bug Raporu');
    expect(result).toContain('**Beklenen Sonuç:**');
    expect(result).toContain('Login butonuna tıklayınca ana sayfaya yönlenmeli');
    expect(result).toContain('**Neden Bug:**');
    expect(result).toContain('Login butonuna tıklayınca 500 hatası alınıyor');
    expect(result).toContain('**Öncelik:** High');
    expect(result).toContain('**Steps to Reproduce:**');
    expect(result).toContain('1. Sayfaya gidildi');
    expect(result).toContain('**Ortam:**');
    expect(result).toContain('Chrome 133');
    expect(result).toContain('**Konfigürasyon:**');
    expect(result).toContain('staging');
  });

  it('boş form verileri ile de çalışır', () => {
    const result = buildDescription({
      form: { expectedResult: '', reason: '', priority: 'medium' },
      stepsText: '',
      environment: defaultEnvironment,
      configFields: defaultConfig,
    });

    expect(result).toContain('## Bug Raporu');
    expect(result).toContain('**Öncelik:** Medium');
  });

  it('ortam bilgilerini doğru formatlayarak ekler', () => {
    const result = buildDescription({
      form: defaultForm,
      stepsText: '',
      environment: defaultEnvironment,
      configFields: defaultConfig,
    });

    expect(result).toContain('- Browser: Chrome 133');
    expect(result).toContain('- OS: Windows 11');
    expect(result).toContain('- Viewport: 1920x1080');
    expect(result).toContain('- Pixel Ratio: 1');
    expect(result).toContain('- Dil: tr-TR');
    expect(result).toContain('- URL: https://app.com/login');
  });

  it('konfigürasyon alanlarını doğru formatlayarak ekler', () => {
    const result = buildDescription({
      form: defaultForm,
      stepsText: '',
      environment: defaultEnvironment,
      configFields: defaultConfig,
    });

    expect(result).toContain('- Environment: staging');
    expect(result).toContain('- Proje: e-commerce');
    expect(result).toContain('- Agile Team: Team Alpha');
    expect(result).toContain('- Test Cycle: Sprint 1');
  });

  it('priority değerini capitalize eder', () => {
    const result = buildDescription({
      form: { expectedResult: '', reason: '', priority: 'critical' },
      stepsText: '',
      environment: defaultEnvironment,
      configFields: defaultConfig,
    });

    expect(result).toContain('**Öncelik:** Critical');
  });

  it('footer satırında tarih ve proje adı bulunur', () => {
    const result = buildDescription({
      form: defaultForm,
      stepsText: '',
      environment: defaultEnvironment,
      configFields: defaultConfig,
    });

    expect(result).toContain('Rapor: qa-helper-plugin');
  });
});
