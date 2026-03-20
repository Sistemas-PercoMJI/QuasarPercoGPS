// composables/useExcelPreview.js
import { ref } from 'vue'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

export function useExcelPreview() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * Extrae imágenes del xlsx con su sheetIndex
   */
  const extraerImagenes = async (arrayBuffer) => {
    try {
      const zip = await JSZip.loadAsync(arrayBuffer)
      const imagenes = []

      // 1. Extraer todas las imágenes de xl/media/
      const archivosMedia = []
      zip.folder('xl/media')?.forEach((relativePath, file) => {
        archivosMedia.push({ relativePath, file })
      })
      if (!archivosMedia.length) return imagenes

      for (const { relativePath, file } of archivosMedia) {
        const extension = relativePath.split('.').pop().toLowerCase()
        const mimeTypes = {
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          gif: 'image/gif',
          webp: 'image/webp',
        }
        if (!mimeTypes[extension]) continue
        const base64 = await file.async('base64')
        imagenes.push({
          nombre: relativePath,
          base64: `data:${mimeTypes[extension]};base64,${base64}`,
          extension,
          sheetIndex: null,
        })
      }

      // 2. Construir mapa: drawingN → índice de hoja
      //    Cada hoja tiene xl/worksheets/_rels/sheetN.xml.rels
      //    que contiene algo como Target="../drawings/drawing1.xml"
      //    El N de sheet no coincide necesariamente con el índice lógico,
      //    así que primero leemos xl/workbook.xml para obtener el orden real.

      // Leer orden de hojas desde workbook.xml
      const workbookXmlFile = zip.file('xl/workbook.xml')
      const sheetOrderMap = {} // rId → sheetIndex lógico (base 0)

      if (workbookXmlFile) {
        const workbookXml = await workbookXmlFile.async('string')
        const sheetMatches = [...workbookXml.matchAll(/<sheet\b[^>]*\sr:id="([^"]+)"[^>]*>/g)]
        sheetMatches.forEach((m, idx) => {
          sheetOrderMap[m[1]] = idx // rId (rId1, rId2...) → índice lógico
        })
      }

      // Leer workbook.xml.rels para mapear rId → sheetN filename
      const wbRelsFile = zip.file('xl/_rels/workbook.xml.rels')
      const rIdToSheetFile = {} // rId → "worksheets/sheet3.xml"

      if (wbRelsFile) {
        const wbRels = await wbRelsFile.async('string')
        const relMatches = [...wbRels.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)]
        relMatches.forEach((m) => {
          rIdToSheetFile[m[1]] = m[2] // ej: rId5 → "worksheets/sheet3.xml"
        })
      }

      // Construir mapa: "sheet3.xml" → índice lógico
      const sheetFileToIndex = {}
      Object.entries(sheetOrderMap).forEach(([rId, logicalIdx]) => {
        const target = rIdToSheetFile[rId] // "worksheets/sheet3.xml"
        if (target) {
          const filename = target.split('/').pop() // "sheet3.xml"
          sheetFileToIndex[filename] = logicalIdx
        }
      })

      // 3. Para cada sheetN.xml, ver si tiene un drawing y qué imágenes usa
      for (const [sheetFilename, logicalIdx] of Object.entries(sheetFileToIndex)) {
        const relsPath = `xl/worksheets/_rels/${sheetFilename}.rels`
        const relsFile = zip.file(relsPath)
        if (!relsFile) continue

        const relsXml = await relsFile.async('string')

        // Ver si esta hoja referencia algún drawing
        const drawingMatch = relsXml.match(/Target="\.\.\/drawings\/(drawing\d+\.xml)"/)
        if (!drawingMatch) continue

        const drawingFilename = drawingMatch[1] // "drawing1.xml"

        // Leer las rels del drawing para saber qué imágenes usa
        const drawingRelsFile = zip.file(`xl/drawings/_rels/${drawingFilename}.rels`)
        if (!drawingRelsFile) continue

        const drawingRels = await drawingRelsFile.async('string')
        const imgMatches = [...drawingRels.matchAll(/Target="\.\.\/media\/([^"]+)"/g)]

        imgMatches.forEach((m) => {
          const imagen = imagenes.find((img) => img.nombre === m[1])
          if (imagen) {
            imagen.sheetIndex = logicalIdx
          }
        })
      }

      return imagenes
    } catch (err) {
      console.warn('No se pudieron extraer imágenes:', err)
      return []
    }
  }
  /**
   * Extrae el contexto textual de la hoja "Mapas" del workbook XLSX:
   * Para cada imagen, busca el título de entidad más cercano ANTES de su posición,
   * y las filas de leyenda DESPUÉS.
   *
   * La hoja "Mapas" tiene esta estructura repetida por entidad:
   *   Fila A: "UNIDAD: Pick Up de PERCO"   ← título
   *   Filas imagen (20 filas vacías en SheetJS)
   *   Filas leyenda: "■ Trayecto 1", "Inicio: ...", "Fin: ..."
   *   2 filas vacías de separación
   */
  const extraerContextoHojaMapas = (workbook, sheetIndex) => {
    const sheetName = workbook.SheetNames[sheetIndex]
    if (!sheetName) return []

    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet || !worksheet['!ref']) return []

    // Convertir a array de arrays para inspeccionar fila por fila
    const filas = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

    // Identificar bloques: cada bloque empieza con una fila que contiene
    // un texto tipo "UNIDAD: ..." o "CONDUCTOR: ..."
    const bloques = []
    const regexTitulo = /^(UNIDAD|CONDUCTOR|GRUPO|GEOZONA):\s*(.+)/i

    let bloqueActual = null

    filas.forEach((fila, rowIdx) => {
      const celda = String(fila[0] || '').trim()
      const matchTitulo = celda.match(regexTitulo)

      if (matchTitulo) {
        // Guardar bloque anterior si existe
        if (bloqueActual) bloques.push(bloqueActual)
        bloqueActual = {
          etiqueta: matchTitulo[1], // "UNIDAD"
          nombre: matchTitulo[2], // "Pick Up de PERCO"
          tituloCompleto: celda,
          rowInicio: rowIdx,
          leyendas: [],
        }
        return
      }

      // Detectar filas de leyenda: empiezan con "■ Trayecto N"
      if (bloqueActual && celda.includes('Trayecto')) {
        bloqueActual.leyendas.push({
          label: celda.replace(/^\s*■\s*/, '').trim(), // "Trayecto 1"
          inicio: String(fila[1] || '')
            .replace('Inicio: ', '')
            .trim(),
          fin: String(fila[2] || '')
            .replace('Fin: ', '')
            .trim(),
          ubicacionInicio: String(fila[3] || '').trim(),
          ubicacionFin: String(fila[4] || '').trim(),
        })
      }

      // Detectar aviso de "Sin datos de mapa"
      if (bloqueActual && celda.includes('Sin datos de mapa')) {
        bloqueActual.sinDatos = true
      }
    })

    // No olvidar el último bloque
    if (bloqueActual) bloques.push(bloqueActual)

    return bloques
  }

  /**
   * Convierte un archivo Excel a HTML para vista previa
   */
  const obtenerVistaPrevia = async (excelBlob) => {
    loading.value = true
    error.value = null

    try {
      const arrayBuffer = await excelBlob.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const imagenes = await extraerImagenes(arrayBuffer)

      let html = `
        <style>
          .excel-preview { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
          .sheet-title {
            font-size: 20px; font-weight: bold; margin: 30px 0 15px 0; padding: 10px;
            background: linear-gradient(135deg, #bb0000 30%, #bb5e00 70%);
            color: white; border-radius: 8px;
          }
          .excel-table {
            border-collapse: collapse; width: 100%; margin-bottom: 30px;
            background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-radius: 8px; overflow: hidden;
          }
          .excel-table th {
            background: #91C6BC; color: white; font-weight: bold;
            padding: 12px; text-align: left; border: 1px solid #7db3a8;
          }
          .excel-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          .excel-table tr:nth-child(even) { background-color: #f9f9f9; }
          .excel-table tr:hover { background-color: #f0f0f0; }

          /* ── Mapas ── */
          .mapa-bloque {
            background: white; border-radius: 10px; margin-bottom: 32px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;
          }
          .mapa-bloque-header {
            padding: 12px 16px;
            background: linear-gradient(135deg, #2980b9, #1a5f8a);
            color: white;
          }
          .mapa-bloque-header .etiqueta {
            font-size: 11px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px;
          }
          .mapa-bloque-header .nombre {
            font-size: 16px; font-weight: bold; margin-top: 2px;
          }
          .mapa-bloque-img {
            display: block; width: 100%; max-height: 450px;
            object-fit: contain; background: #f0f0f0;
          }
          .mapa-sin-datos {
            padding: 20px; color: #999; font-style: italic; text-align: center;
          }
          .mapa-leyenda {
            padding: 12px 16px; border-top: 1px solid #eee; background: #fafafa;
          }
          .mapa-leyenda-title {
            font-size: 11px; font-weight: bold; color: #666;
            text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;
          }
          .mapa-leyenda-item {
            display: flex; align-items: flex-start; gap: 10px;
            margin-bottom: 6px; font-size: 12px;
          }
          .mapa-leyenda-bullet {
            width: 12px; height: 12px; border-radius: 50%;
            flex-shrink: 0; margin-top: 2px;
          }
          .mapa-leyenda-info { color: #555; }
          .mapa-leyenda-info strong { color: #333; }
          .mapa-leyenda-hora { color: #888; font-size: 11px; }
        </style>
        <div class="excel-preview">
      `

      // Colores de leyenda — mismos que en agregarHojaMapas
      const COLORES_LEYENDA = [
        '#e74c3c',
        '#2980b9',
        '#27ae60',
        '#f39c12',
        '#8e44ad',
        '#16a085',
        '#d35400',
        '#2c3e50',
      ]

      workbook.SheetNames.forEach((sheetName, sheetIdx) => {
        html += `<div class="sheet-title">${sheetName}</div>`

        const imagenesDeHoja = imagenes.filter((img) => img.sheetIndex === sheetIdx)
        const esHojaMapas = sheetName.toLowerCase() === 'mapas'

        if (esHojaMapas && imagenesDeHoja.length > 0) {
          // Extraer bloques con contexto real de la hoja
          const bloques = extraerContextoHojaMapas(workbook, sheetIdx)

          // Cruzar imagen con bloque por índice (1 imagen por bloque)
          imagenesDeHoja.forEach((img, imgIdx) => {
            const bloque = bloques[imgIdx]

            html += `<div class="mapa-bloque">`

            // Header con nombre real
            if (bloque) {
              html += `
                <div class="mapa-bloque-header">
                  <div class="etiqueta">${bloque.etiqueta}</div>
                  <div class="nombre">${bloque.nombre}</div>
                </div>
              `
            } else {
              html += `
                <div class="mapa-bloque-header">
                  <div class="etiqueta">Mapa</div>
                  <div class="nombre">${imgIdx + 1}</div>
                </div>
              `
            }

            // Imagen
            html += `<img class="mapa-bloque-img" src="${img.base64}" alt="Mapa ${imgIdx + 1}" />`

            // Leyenda de trayectos
            if (bloque?.leyendas?.length > 0) {
              html += `
                <div class="mapa-leyenda">
                  <div class="mapa-leyenda-title">Trayectos</div>
              `
              bloque.leyendas.forEach((ley, i) => {
                const color = COLORES_LEYENDA[i % COLORES_LEYENDA.length]
                html += `
                  <div class="mapa-leyenda-item">
                    <div class="mapa-leyenda-bullet" style="background:${color}"></div>
                    <div class="mapa-leyenda-info">
                      <strong>${ley.label}</strong>
                      <div class="mapa-leyenda-hora">
                        ${ley.inicio !== 'N/A' ? `⏱ ${ley.inicio} → ${ley.fin}` : ''}
                        ${ley.ubicacionInicio ? `&nbsp;·&nbsp; ${ley.ubicacionInicio}` : ''}
                      </div>
                    </div>
                  </div>
                `
              })
              html += `</div>`
            }

            html += `</div>` // .mapa-bloque
          })

          // Bloques sin imagen (sin datos de mapa)
          bloques.forEach((bloque) => {
            if (bloque.sinDatos) {
              html += `
                <div class="mapa-bloque">
                  <div class="mapa-bloque-header">
                    <div class="etiqueta">${bloque.etiqueta}</div>
                    <div class="nombre">${bloque.nombre}</div>
                  </div>
                  <div class="mapa-sin-datos">Sin datos de mapa para este período</div>
                </div>
              `
            }
          })
        } else if (!esHojaMapas) {
          // Hojas normales: tabla estándar
          const worksheet = workbook.Sheets[sheetName]
          const tableHtml = XLSX.utils.sheet_to_html(worksheet, { header: '', footer: '' })
          html += tableHtml.replace('<table>', '<table class="excel-table">')
        }
      })

      html += '</div>'
      return html
    } catch (err) {
      console.error('Error al convertir Excel:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const descargarArchivo = async (url) => {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Error al descargar archivo')
    return await response.blob()
  }

  return { loading, error, obtenerVistaPrevia, descargarArchivo }
}
