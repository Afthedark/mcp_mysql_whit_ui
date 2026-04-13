const UIUtils = {
    getSwalConfig() {
        const theme = localStorage.getItem('app-theme') || 'dark';
        const isDark = theme === 'dark';
        return { background: isDark ? '#171717' : '#ffffff', color: isDark ? '#ececec' : '#1d1d1f', confirmButtonColor: '#007aff', cancelButtonColor: '#ff3b30', confirmButtonText: 'Confirmar', cancelButtonText: 'Cancelar', reverseButtons: true, backdrop: 'rgba(0,0,0,0.4)' };
    },
    showToast(message, icon = 'info') {
        const theme = localStorage.getItem('app-theme') || 'dark';
        const isDark = theme === 'dark';
        Swal.fire({ toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000, icon, title: `<span style="color:${isDark ? '#fff' : '#000'};font-weight:600">${message}</span>`, background: isDark ? '#171717' : '#fff' });
    },
    initTheme() {
        const saved = localStorage.getItem('app-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-bs-theme', saved);
        return saved;
    },
    toggleTheme() {
        const current = document.documentElement.getAttribute('data-bs-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-bs-theme', next);
        localStorage.setItem('app-theme', next);
        return next;
    }
};
window.UIUtils = UIUtils;
