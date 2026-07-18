// Localization utility with runtime language switching.
// Chrome's i18n API is locked to the browser UI language, so when the user
// picks a language explicitly, messages are loaded directly from
// _locales/<lang>/messages.json instead.
const i18n = {
    SUPPORTED: ['en', 'ru'],
    _messages: null,
    _language: null,   // resolved language actually in use ('en' | 'ru')
    _setting: 'auto',  // stored preference ('auto' | 'en' | 'ru')

    _normalize(lang) {
        return String(lang || '').toLowerCase().split('-')[0];
    },

    // Resolves the language from storage and loads its message catalog.
    // Must be awaited before getMessage()/localizePage() are used.
    init() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['language'], (data) => {
                this._setting = data.language || 'auto';
                let lang = this._setting === 'auto'
                    ? this._normalize(chrome.i18n.getUILanguage())
                    : this._normalize(this._setting);
                if (!this.SUPPORTED.includes(lang)) lang = 'en';

                fetch(chrome.runtime.getURL(`_locales/${lang}/messages.json`))
                    .then((res) => res.json())
                    .then((messages) => {
                        this._messages = messages;
                        this._language = lang;
                        resolve(lang);
                    })
                    .catch(() => {
                        // Fall back to the chrome.i18n API (browser language)
                        this._messages = null;
                        this._language = this.SUPPORTED.includes(this._normalize(chrome.i18n.getUILanguage()))
                            ? this._normalize(chrome.i18n.getUILanguage())
                            : 'en';
                        resolve(this._language);
                    });
            });
        });
    },

    setLanguage(lang) {
        return new Promise((resolve) => {
            chrome.storage.sync.set({ language: lang }, () => {
                this.init().then(resolve);
            });
        });
    },

    getLanguage() {
        return this._language || 'en';
    },

    getSetting() {
        return this._setting;
    },

    getMessage(key, substitutions) {
        let message;
        if (this._messages && this._messages[key]) {
            message = this._messages[key].message;
            if (substitutions !== undefined && substitutions !== null) {
                const subs = Array.isArray(substitutions) ? substitutions : [substitutions];
                subs.forEach((sub, index) => {
                    message = message.split('$' + (index + 1)).join(String(sub));
                });
            }
        } else {
            message = chrome.i18n.getMessage(key, substitutions);
        }
        return message || key;
    },

    localizeElement(element) {
        const messageKey = element.getAttribute('data-i18n');
        if (messageKey) {
            element.textContent = i18n.getMessage(messageKey);
        }

        const placeholderKey = element.getAttribute('data-i18n-placeholder');
        if (placeholderKey) {
            element.placeholder = i18n.getMessage(placeholderKey);
        }

        const titleKey = element.getAttribute('data-i18n-title');
        if (titleKey) {
            element.title = i18n.getMessage(titleKey);
        }
    },

    localizePage() {
        document.querySelectorAll('[data-i18n], [data-i18n-placeholder], [data-i18n-title]')
            .forEach(i18n.localizeElement);
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = i18n;
}
