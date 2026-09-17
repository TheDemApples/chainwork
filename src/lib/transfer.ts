/** JSON export / import. Round-trips through the same migrator as disk reads. */

import { AppState } from '../types';
import { migrate } from './storage';

export interface ExportEnvelope {
  app: 'chainwork';
  exportedAt: string;
  state: AppState;
}

export function exportJson(state: AppState): string {
  const envelope: ExportEnvelope = {
    app: 'chainwork',
    exportedAt: new Date().toISOString(),
    state,
  };
  return JSON.stringify(envelope, null, 2);
}

export function suggestedFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `chainwork-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

export function downloadJson(state: AppState): void {
  const blob = new Blob([exportJson(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedFilename();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseImport(text: string): AppState {
  const parsed = JSON.parse(text) as Partial<ExportEnvelope> & Partial<AppState>;
  // Accept both the wrapped envelope and a bare state object.
  const raw = parsed && typeof parsed === 'object' && 'state' in parsed ? parsed.state : parsed;
  const state = migrate(raw);
  if (!Array.isArray(state.chains)) throw new Error('No chains found in file');
  return state;
}
