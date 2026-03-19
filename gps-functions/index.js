const { onRequest } = require('firebase-functions/v2/https')
const { setGlobalOptions } = require('firebase-functions/v2')
const logger = require('firebase-functions/logger')
const nodemailer = require('nodemailer')

const { getAuth } = require('firebase-admin/auth')
const { initializeApp } = require('firebase-admin/app')

// Inicializar Admin SDK (solo si no está ya inicializado)
try {
  initializeApp()
} catch (e) {
  console.log(e)
}

setGlobalOptions({
  region: 'us-central1',
  memory: '256MB',
  timeoutSeconds: 60,
  maxInstances: 10,
})

const NOREPLY_EMAIL = 'noreply@mjindustrial.com'
const SISTEMAS_EMAIL = 'sistemas@mjindustrial.com' // ← cambia al correo real de Sistemas

function createTransporter(password) {
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    return nodemailer.createTransport({
      streamTransport: true,
      logger: true,
      buffer: true,
    })
  }

  return nodemailer.createTransport({
    host: 'smtp.mjindustrial.com',
    port: 465,
    secure: true,
    auth: {
      user: NOREPLY_EMAIL,
      pass: password,
    },
  })
}

exports.enviarSolicitudPassword = onRequest(
  {
    cors: true,
    secrets: ['NOREPLY_EMAIL_PASSWORD'],
  },
  async (req, res) => {
    try {
      logger.log('🔑 Solicitud de recuperación de contraseña recibida')

      if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método no permitido. Use POST.' })
      }

      const { correoCuenta, empresa, nombre, correoContacto } = req.body

      if (!correoCuenta || !empresa || !nombre || !correoContacto) {
        logger.warn('❌ Faltan campos requeridos')
        return res.status(400).json({ success: false, error: 'Faltan campos requeridos' })
      }

      const password = process.env.NOREPLY_EMAIL_PASSWORD

      if (!password && process.env.FUNCTIONS_EMULATOR !== 'true') {
        logger.error('❌ Secret no configurado')
        return res
          .status(500)
          .json({ success: false, error: 'Configuración de correo no disponible' })
      }

      const transporter = createTransporter(password)

      const fechaMostrar = new Date().toLocaleString('es-MX', {
        timeZone: 'America/Tijuana',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

      const mailOptions = {
        from: `"PercoGPS" <${NOREPLY_EMAIL}>`,
        to: SISTEMAS_EMAIL,
        subject: `Solicitud de recuperación de contraseña — ${nombre}`,
        html: `
           <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
            </head>
            <body style="margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding: 32px 0;">
                <tr>
                  <td align="center">
                    <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

                      <!-- Header -->
                      <tr>
                        <td style="background-color:#bb0000; padding: 28px 36px;">
                          <p style="margin:0; font-size:11px; color:#f8c8c8; text-transform:uppercase; letter-spacing:1px;">PercoGPS — Sistema de seguimiento de flotas</p>
                          <h1 style="margin:8px 0 0; font-size:20px; color:#ffffff; font-weight:700;">Solicitud de recuperación de contraseña</h1>
                        </td>
                      </tr>

                      <!-- Fecha -->
                      <tr>
                        <td style="padding: 20px 36px 0; border-bottom: 1px solid #eeeeee;">
                          <p style="margin:0 0 16px; font-size:12px; color:#999999;">${fechaMostrar}</p>
                        </td>
                      </tr>

                      <!-- Datos -->
                      <tr>
                        <td style="padding: 24px 36px;">
                          <p style="margin:0 0 20px; font-size:13px; color:#555555;">Se ha recibido una nueva solicitud de recuperación de contraseña con los siguientes datos:</p>

                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                                <span style="font-size:11px; color:#999999; text-transform:uppercase; letter-spacing:0.5px;">Correo de cuenta a recuperar</span><br>
                                <span style="font-size:14px; color:#1a1a1a; font-weight:600;">${correoCuenta}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                                <span style="font-size:11px; color:#999999; text-transform:uppercase; letter-spacing:0.5px;">Empresa</span><br>
                                <span style="font-size:14px; color:#1a1a1a; font-weight:600;">${empresa}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                                <span style="font-size:11px; color:#999999; text-transform:uppercase; letter-spacing:0.5px;">Nombre del solicitante</span><br>
                                <span style="font-size:14px; color:#1a1a1a; font-weight:600;">${nombre}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 10px 0;">
                                <span style="font-size:11px; color:#999999; text-transform:uppercase; letter-spacing:0.5px;">Correo de contacto</span><br>
                                <span style="font-size:14px; color:#1a1a1a; font-weight:600;">${correoContacto}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Aviso -->
                      <tr>
                        <td style="padding: 0 36px 28px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="background-color:#fff8f0; border-left: 3px solid #cc6600; padding: 12px 16px; border-radius:4px;">
                                <p style="margin:0; font-size:12px; color:#884400;">Verificar la identidad del solicitante antes de proceder al cambio manual de contraseña.</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background-color:#f8f8f8; padding: 16px 36px; border-top: 1px solid #eeeeee;">
                          <p style="margin:0; font-size:11px; color:#aaaaaa; text-align:center;">Este es un correo automatico generado por PercoGPS. No responder a este mensaje.</p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
      }

      await transporter.sendMail(mailOptions)
      logger.log(`✅ Solicitud enviada para: ${correoCuenta}`)

      return res.status(200).json({
        success: true,
        message: 'Solicitud enviada correctamente',
        fecha: fechaMostrar,
      })
    } catch (error) {
      logger.error('Error general:', error)
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message,
      })
    }
  },
)

exports.verificarCorreoExiste = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido' })
  }

  const { correo } = req.body

  if (!correo) {
    return res.status(400).json({ success: false, error: 'Correo requerido' })
  }

  try {
    await getAuth().getUserByEmail(correo)
    return res.json({ success: true, existe: true })
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return res.json({ success: true, existe: false })
    }
    return res.status(500).json({ success: false, error: error.message })
  }
})
