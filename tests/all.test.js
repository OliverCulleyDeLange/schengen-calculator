import { summary } from './harness.js';
import './calendarUtils.test.js';
import './dateStorage.test.js';
import './ranges.test.js';
import './importValidation.test.js';

// JSC needs a moment for any pending microtasks.
await Promise.resolve();
summary();
