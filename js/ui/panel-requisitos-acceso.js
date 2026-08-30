import { boton, elemento } from './componentes.js'
import { contextoParaResolver, normalizarRequisitos } from '../acceso/requisitos-acceso.js'

export function crearPanelRequisitosAcceso({
  requisitos = [], titulo = 'Necesitás completar algunos accesos', descripcion = '', seccion = '', regreso = '', sesion = {}, alIrA,
} = {}) {
  const listaRequisitos = normalizarRequisitos(requisitos)
  const panel = elemento('section', ['panel-requisitos-acceso'])
  panel.append(elemento('strong', [], titulo))
  if (descripcion) panel.appendChild(elemento('p', ['ayuda'], descripcion))
  const lista = elemento('div', ['panel-requisitos-lista'])
  const administra = sesion?.rol === 'admin' || sesion?.perfil_acceso === 'administracion'

  listaRequisitos.forEach((requisito) => {
    const fila = elemento('article', ['panel-requisito', requisito.cumplido ? 'cumplido' : 'pendiente'])
    const contenido = elemento('div', ['panel-requisito-contenido'])
    contenido.append(
      elemento('span', ['panel-requisito-estado'], requisito.cumplido ? 'Cumplido' : 'Falta'),
      elemento('strong', [], requisito.titulo),
    )
    if (requisito.descripcion) contenido.appendChild(elemento('p', ['ayuda'], requisito.descripcion))
    fila.appendChild(contenido)
    if (!requisito.cumplido && requisito.resolver) {
      const contexto = contextoParaResolver(requisito, { seccion, regreso })
      const accion = boton(administra ? 'Resolver este requisito' : 'Cómo solicitarlo', () => {
        if (administra) alIrA?.('accesos', contexto)
        else alIrA?.('ayuda', { busqueda: `solicitar ${requisito.titulo}` })
      }, ['boton', administra ? 'boton-principal' : 'boton-secundario'])
      accion.dataset.requisitoAcceso = requisito.id
      fila.appendChild(accion)
    }
    lista.appendChild(fila)
  })
  panel.appendChild(lista)
  return panel
}
