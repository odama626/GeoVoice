function selfDestruct() {
  fetch('/admin/self_destruct', { method: 'POST', credentials: 'include' })
  .then( () => ui.createSnack('Boom'))
  .catch( e => ui.createSnack('Did not combust '+e.toString()));
} // selfDestruct
