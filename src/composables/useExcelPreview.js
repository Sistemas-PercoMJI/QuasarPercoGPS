// composables/useExcelPreview.js
import { ref } from 'vue'
import * as XLSX from 'xlsx'

export function useExcelPreview() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * Convierte un archivo Excel a HTML para vista previa
   */
  const obtenerVistaPrevia = async (excelBlob) => {
    loading.value = true
    error.value = null

    try {
      // Leer el Excel
      const arrayBuffer = await excelBlob.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })

      // Convertir todas las hojas a HTML
      let html = `
        <style>
          .excel-preview {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #f5f5f5;
          }
          .sheet-title {
            font-size: 20px;
            font-weight: bold;
            margin: 30px 0 15px 0;
            padding: 10px;
            background: linear-gradient(135deg, #bb0000 30%, #bb5e00 70%);
            color: white;
            border-radius: 8px;
          }
          .excel-table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 30px;
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
          }
          .excel-table th {
            background: #91C6BC;
            color: white;
            font-weight: bold;
            padding: 12px;
            text-align: left;
            border: 1px solid #7db3a8;
          }
          .excel-table td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }
          .excel-table tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .excel-table tr:hover {
            background-color: #f0f0f0;
          }
        </style>
        <div class="excel-preview">
      `

      workbook.SheetNames.forEach((sheetName, index) => {
        if (index > 0) html += '<br>'
        html += `<div class="sheet-title">${sheetName}</div>`
        const worksheet = workbook.Sheets[sheetName]
        const tableHtml = XLSX.utils.sheet_to_html(worksheet, { header: '', footer: '' })
        // Reemplazar la tabla genérica con nuestra clase
        html += tableHtml.replace('<table>', '<table class="excel-table">')
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

  /**
   * Descarga un archivo desde una URL
   */
  const descargarArchivo = async (url) => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Error al descargar archivo')
    }
    return await response.blob()
  }

  return {
    loading,
    error,
    obtenerVistaPrevia,
    descargarArchivo,
  }
}
