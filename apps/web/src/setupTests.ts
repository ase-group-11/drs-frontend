// Required by @testing-library/jest-dom matchers
import '@testing-library/jest-dom';

// ─── matchMedia factory ───────────────────────────────────────────────────────
// Returns a fresh mock object for every call — required by antd's Grid system
// (Row / Col use useBreakpoint which calls window.matchMedia per breakpoint).
const mockMatchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),    // legacy — still called by antd internals
  removeListener: jest.fn(), // legacy
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

// ─── Direct assignment (NOT Object.defineProperty) ───────────────────────────
// Object.defineProperty silently fails in some jsdom versions because jsdom
// defines matchMedia internally as non-configurable. Direct assignment works
// reliably regardless of the jsdom version.
(window as any).matchMedia = jest.fn().mockImplementation(mockMatchMedia);

// Re-apply before every test so the mock survives any per-test resets.
beforeEach(() => {
  (window as any).matchMedia = jest.fn().mockImplementation(mockMatchMedia);
  // Clear notification toggle keys so localStorage state never bleeds between tests
  localStorage.removeItem('drs_notif_socket');
  localStorage.removeItem('drs_notif_sound');
});

// ─── ResizeObserver (used by Ant Design tooltips / dropdowns) ────────────────
(global as any).ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// ─── Suppress noisy warnings in test output ───────────────────────────────────
const originalError = console.error.bind(console);
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: An update to') ||
      args[0].includes('Warning: ReactDOM.render') ||
      args[0].includes('act(') ||
      args[0].includes('ReactDOMTestUtils.act'))
  ) {
    return;
  }
  // Suppress expected console.error logs from service catch blocks during tests.
  // These are intentional — services log errors before returning { success: false }.
  // We test the return value, not the log output.
  if (typeof args[0] === 'string') {
    const serviceErrorPrefixes = [
      'Login error:',
      'Signup OTP error:',
      'OTP verification error:',
      'Change password error:',
      'Update report status error:',
      'Escalate severity error:',
      'Dispatch units error:',
      'getUsers API',
      'createUser API',
      'updateUser API',
      'deleteUser API',
      // Catch any remaining service-layer error log pattern
      'error:', 'Error:',
    ];
    if (serviceErrorPrefixes.some(prefix => args[0].includes(prefix))) {
      return;
    }
  }
  originalError(...args);
};

const originalWarn = console.warn.bind(console);
console.warn = (...args: any[]) => {
  if (typeof args[0] === 'string' && (
    args[0].includes('React Router Future Flag Warning') ||
    args[0].includes('API failed, using fallback data') ||
    args[0].includes('fallback data')
  )) {
    return;
  }
  originalWarn(...args);
};