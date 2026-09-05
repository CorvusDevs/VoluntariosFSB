const HOST_CMS_CPANEL = 'gestor.aletea.org'

export function esEntornoInstitucional(hostname = globalThis.location?.hostname ?? '') {
  return hostname === HOST_CMS_CPANEL || hostname.endsWith('.pages.dev')
}
