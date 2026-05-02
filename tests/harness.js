let passed = 0;
let failed = 0;
const failures = [];

export function test(name, fn) {
    try {
        const result = fn();
        if (result && typeof result.then === 'function') {
            return result.then(
                () => { passed++; print('  ok  ' + name); },
                (err) => { failed++; failures.push([name, err]); print('  FAIL ' + name + ' — ' + (err && err.message || err)); }
            );
        }
        passed++;
        print('  ok  ' + name);
    } catch (err) {
        failed++;
        failures.push([name, err]);
        print('  FAIL ' + name + ' — ' + (err && err.message || err));
    }
}

export function suite(name, fn) {
    print('• ' + name);
    return fn();
}

export function assertEqual(actual, expected, msg) {
    if (actual !== expected) {
        throw new Error((msg ? msg + ': ' : '') + 'expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
    }
}

export function assertDeepEqual(actual, expected, msg) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) {
        throw new Error((msg ? msg + ': ' : '') + 'expected ' + e + ', got ' + a);
    }
}

export function assertTrue(value, msg) {
    if (!value) throw new Error((msg ? msg + ': ' : '') + 'expected truthy, got ' + JSON.stringify(value));
}

export function assertThrows(fn, msg) {
    let threw = false;
    try { fn(); } catch (e) { threw = true; }
    if (!threw) throw new Error((msg ? msg + ': ' : '') + 'expected to throw');
}

export function summary() {
    print('');
    print(passed + ' passed, ' + failed + ' failed');
    if (failed > 0) {
        // JSC doesn't have process.exit; throw to signal failure.
        throw new Error('test failures: ' + failed);
    }
}
