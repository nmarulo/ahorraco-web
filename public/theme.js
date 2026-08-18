(() => {
  /** La misma que usa AdminLTE. */
  const CLAVE = 'lte-theme';
  let guardado = null;
  try {
    guardado = localStorage.getItem(CLAVE);
  } catch {}
  const prefiereOscuro = matchMedia('(prefers-color-scheme: dark)').matches;
  const tema = guardado === 'dark' || guardado === 'light' ? guardado : prefiereOscuro ? 'dark' : 'light';
  document.documentElement.setAttribute('data-bs-theme', tema);
  document.documentElement.style.colorScheme = tema;
})();
