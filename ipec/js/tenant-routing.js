(function () {
    // Tenant path prefixing is intentionally disabled for mobile_exp.
    // Keep this API surface so existing calls do not break.
    function normalizePath(path) {
        const value = String(path || '').trim();
        if (!value) return '/';
        return value.startsWith('/') ? value : `/${value}`;
    }

    function isExternalHref(href) {
        const value = String(href || '').trim();
        return /^([a-z]+:)?\/\//i.test(value) || value.startsWith('mailto:') || value.startsWith('tel:') || value.startsWith('#');
    }

    function isCompanyId(value) {
        return /^cmp_[a-z0-9]+$/i.test(String(value || '').trim());
    }

    function getCompanyIdFromPath() {
        return null;
    }

    function getCompanyIdFromStorage() {
        const keys = ['companyId', 'company_id', 'explyraCompanyId'];
        for (const key of keys) {
            const value = localStorage.getItem(key);
            if (isCompanyId(value)) return value;
        }

        try {
            const sessionRaw = localStorage.getItem('company_session');
            if (sessionRaw) {
                const session = JSON.parse(sessionRaw);
                if (isCompanyId(session?.companyId)) return session.companyId;
            }
        } catch (e) {
            // Ignore malformed cache.
        }

        return null;
    }

    function getCurrentCompanyId() {
        return getCompanyIdFromStorage();
    }

    function shouldEnforceTenantRouting() {
        return false;
    }

    function buildTenantPath(targetPath) {
        return normalizePath(String(targetPath || '').replace(/^\/+/, ''));
    }

    function buildTenantUrl(targetPath) {
        return buildTenantPath(targetPath);
    }

    function toTenantAwareHref(href) {
        const original = String(href || '').trim();
        if (!original || isExternalHref(original)) return original;
        return original;
    }

    function applyTenantLinkTransform() {
        // no-op by design
    }

    function toTenantAwareNavigationUrl(url) {
        return url == null ? url : String(url);
    }

    function enforceTenantNavigation() {
        // no-op by design
    }

    function redirectToTenantPath(targetPath) {
        window.location.href = normalizePath(targetPath);
    }

    function generateWorkspaceUrl(companyId, page = 'admin.html') {
        if (!isCompanyId(companyId)) return normalizePath(page);
        return normalizePath(page);
    }

    window.ExplyraTenant = {
        isCompanyId,
        getCompanyIdFromPath,
        getCompanyIdFromStorage,
        getCurrentCompanyId,
        shouldEnforceTenantRouting,
        buildTenantPath,
        buildTenantUrl,
        toTenantAwareHref,
        applyTenantLinkTransform,
        toTenantAwareNavigationUrl,
        enforceTenantNavigation,
        redirectToTenantPath,
        generateWorkspaceUrl
    };
})();
