#!/usr/bin/env bash
# Run all regression tests via JavaScriptCore.
# JSC ships with macOS at /System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
set -e
cd "$(dirname "$0")/.."
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
"$JSC" -m tests/all.test.js
