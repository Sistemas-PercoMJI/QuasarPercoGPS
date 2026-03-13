// composables/useSortTimestamp.js

export function useSortTimestamp() {
  // Ordena cualquier array que tenga campo timestamp
  const sortPorTimestamp = (array) => {
    if (!Array.isArray(array) || array.length === 0) return array
    return [...array].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  }

  // Ordena los registros/trayectos y sus coordenadas internas
  const sortRegistros = (registros) => {
    if (!Array.isArray(registros) || registros.length === 0) return registros
    return sortPorTimestamp(registros).map((r) => ({
      ...r,
      coordenadas: r.coordenadas ? sortPorTimestamp(r.coordenadas) : r.coordenadas,
    }))
  }

  return { sortPorTimestamp, sortRegistros }
}
