const { google } = require('googleapis')
const SERVICE_ACCOUNT = require('./service-account.json')

async function checkDrive() {
  const auth = new google.auth.GoogleAuth({
    credentials: SERVICE_ACCOUNT,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })

  const drive = google.drive({ version: 'v3', auth })

  console.log('🔍 Obteniendo información del Drive...\n')

  // 1. Obtener información de almacenamiento
  try {
    const aboutResponse = await drive.about.get({
      fields: 'storageQuota, user',
    })

    const quota = aboutResponse.data.storageQuota
    const user = aboutResponse.data.user

    console.log('👤 Usuario:', user.emailAddress)
    console.log('\n📊 ALMACENAMIENTO:')
    console.log('  Límite:', formatBytes(quota.limit))
    console.log('  Usado:', formatBytes(quota.usage))
    console.log('  Usado en Drive:', formatBytes(quota.usageInDrive))
    console.log('  Usado en Trash:', formatBytes(quota.usageInDriveTrash))
    console.log('  Disponible:', formatBytes(quota.limit - quota.usage))
    console.log('  Porcentaje usado:', ((quota.usage / quota.limit) * 100).toFixed(2) + '%')
  } catch (error) {
    console.log('ℹ️ No se puede obtener info de almacenamiento (normal para Service Accounts)')
  }

  // 2. Listar todos los archivos
  console.log('\n📁 ARCHIVOS EN EL DRIVE:')
  console.log('─'.repeat(80))

  let pageToken = null
  let totalFiles = 0
  let totalSize = 0
  const filesByType = {}

  do {
    const response = await drive.files.list({
      pageSize: 100,
      fields:
        'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, trashed, parents)',
      pageToken: pageToken,
      orderBy: 'createdTime desc',
    })

    const files = response.data.files

    if (files.length === 0 && totalFiles === 0) {
      console.log('✅ No hay archivos en el Drive')
      return
    }

    for (const file of files) {
      totalFiles++
      const size = parseInt(file.size || 0)
      totalSize += size

      // Agrupar por tipo
      const type = file.mimeType || 'unknown'
      if (!filesByType[type]) {
        filesByType[type] = { count: 0, size: 0 }
      }
      filesByType[type].count++
      filesByType[type].size += size

      // Mostrar info del archivo
      const status = file.trashed ? '🗑️ ' : '📄 '
      const date = new Date(file.createdTime).toLocaleString('es-MX')

      console.log(
        `${status}${file.name.substring(0, 50).padEnd(50)} | ${formatBytes(size).padEnd(10)} | ${date}`,
      )
    }

    pageToken = response.data.nextPageToken
  } while (pageToken)

  // 3. Resumen por tipo de archivo
  console.log('\n📊 RESUMEN POR TIPO DE ARCHIVO:')
  console.log('─'.repeat(80))

  Object.entries(filesByType)
    .sort((a, b) => b[1].size - a[1].size)
    .forEach(([type, data]) => {
      const typeName = getTypeName(type)
      console.log(
        `${typeName.padEnd(40)} | ${data.count.toString().padStart(5)} archivos | ${formatBytes(data.size)}`,
      )
    })

  console.log('\n📈 TOTALES:')
  console.log('  Total de archivos:', totalFiles)
  console.log('  Tamaño total:', formatBytes(totalSize))

  // 4. Archivos en la papelera
  const trashResponse = await drive.files.list({
    q: 'trashed=true',
    fields: 'files(id, name, size)',
  })

  const trashedFiles = trashResponse.data.files || []
  if (trashedFiles.length > 0) {
    const trashSize = trashedFiles.reduce((sum, f) => sum + parseInt(f.size || 0), 0)
    console.log('\n🗑️ PAPELERA:')
    console.log('  Archivos en papelera:', trashedFiles.length)
    console.log('  Espacio ocupado:', formatBytes(trashSize))
    console.log('  💡 Puedes vaciar la papelera para liberar espacio')
  }
}

// Helpers
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function getTypeName(mimeType) {
  const types = {
    'application/vnd.google-apps.spreadsheet': 'Google Sheets',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel (xlsx)',
    'application/pdf': 'PDF',
    'image/png': 'Imagen PNG',
    'image/jpeg': 'Imagen JPEG',
    'application/vnd.google-apps.folder': 'Carpeta',
    'text/plain': 'Texto plano',
  }
  return types[mimeType] || mimeType
}

checkDrive().catch(console.error)
