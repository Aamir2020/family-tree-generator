// Apply the saved or system theme before React renders the editor.
try {
  document.documentElement.dataset.theme =
    localStorage.getItem('zermander-theme') ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
} catch {
  document.documentElement.dataset.theme = 'light';
}

export {};
