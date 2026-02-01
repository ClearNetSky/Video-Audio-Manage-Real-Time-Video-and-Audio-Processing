// Localization utility
const i18n = {
    getMessage: (key, substitutions) => {
        let message = chrome.i18n.getMessage(key, substitutions);
        return message || key;
    },
    
    localizeElement: (element) => {
        // Localize text content
        const messageKey = element.getAttribute('data-i18n');
        if (messageKey) {
            element.textContent = i18n.getMessage(messageKey);
        }
        
        // Localize placeholder
        const placeholderKey = element.getAttribute('data-i18n-placeholder');
        if (placeholderKey) {
            element.placeholder = i18n.getMessage(placeholderKey);
        }
        
        // Localize title
        const titleKey = element.getAttribute('data-i18n-title');
        if (titleKey) {
            element.title = i18n.getMessage(titleKey);
        }
    },
    
    localizePage: () => {
        // Localize all elements with data-i18n attributes
        document.querySelectorAll('[data-i18n]').forEach(i18n.localizeElement);
        document.querySelectorAll('[data-i18n-placeholder]').forEach(i18n.localizeElement);
        document.querySelectorAll('[data-i18n-title]').forEach(i18n.localizeElement);
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = i18n;
}
