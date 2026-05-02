// Tiny in-app confirm/alert that replaces the blocking native dialogs.
// Renders as an overlay over the calendar so the UI stays consistent
// across browsers and (later) inside an installed PWA.

let dialog = null;
let titleEl = null;
let messageEl = null;
let okBtn = null;
let cancelBtn = null;
let lastFocus = null;
let resolveCurrent = null;
let escHandler = null;

function ensureMounted() {
    if (dialog) return;
    dialog = document.getElementById('appModal');
    if (!dialog) {
        dialog = document.createElement('div');
        dialog.id = 'appModal';
        dialog.className = 'app-modal';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'appModalTitle');
        dialog.setAttribute('aria-describedby', 'appModalMessage');
        dialog.hidden = true;
        dialog.innerHTML = `
            <div class="app-modal-backdrop"></div>
            <div class="app-modal-card">
                <h3 id="appModalTitle" class="app-modal-title"></h3>
                <p id="appModalMessage" class="app-modal-message"></p>
                <div class="app-modal-actions">
                    <button type="button" class="app-modal-cancel">Cancel</button>
                    <button type="button" class="app-modal-ok">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
    }
    titleEl = dialog.querySelector('.app-modal-title');
    messageEl = dialog.querySelector('.app-modal-message');
    okBtn = dialog.querySelector('.app-modal-ok');
    cancelBtn = dialog.querySelector('.app-modal-cancel');
    okBtn.addEventListener('click', () => close(true));
    cancelBtn.addEventListener('click', () => close(false));
    dialog.querySelector('.app-modal-backdrop').addEventListener('click', () => close(false));
}

function close(value) {
    if (!resolveCurrent) return;
    dialog.hidden = true;
    document.removeEventListener('keydown', escHandler);
    const r = resolveCurrent;
    resolveCurrent = null;
    if (lastFocus && typeof lastFocus.focus === 'function') {
        lastFocus.focus();
    }
    r(value);
}

function open({ title, message, mode }) {
    return new Promise((resolve) => {
        ensureMounted();
        // Queue subsequent calls behind the in-flight one.
        if (resolveCurrent) {
            const prev = resolveCurrent;
            resolveCurrent = null;
            prev(false);
        }
        resolveCurrent = resolve;
        titleEl.textContent = title;
        messageEl.textContent = message;
        cancelBtn.hidden = mode === 'alert';
        dialog.hidden = false;
        lastFocus = document.activeElement;
        okBtn.focus();
        escHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                close(false);
            } else if (e.key === 'Enter' && document.activeElement === okBtn) {
                e.preventDefault();
                close(true);
            }
        };
        document.addEventListener('keydown', escHandler);
    });
}

export function appConfirm(message, title = 'Confirm') {
    return open({ title, message, mode: 'confirm' });
}

export function appAlert(message, title = 'Notice') {
    return open({ title, message, mode: 'alert' });
}
