const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");

setGlobalOptions({
  region: "us-central1",
  memory: "256MB",
  timeoutSeconds: 60,
  maxInstances: 10,
});

const NOREPLY_EMAIL = "noreply@mjindustrial.com";
const SISTEMAS_EMAIL = "sistemas@mjindustrial.com"; // ← cambia al correo real de Sistemas

function createTransporter(password) {
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    return nodemailer.createTransport({
      streamTransport: true,
      logger: true,
      buffer: true,
    });
  }

  return nodemailer.createTransport({
    host: "smtp.mjindustrial.com",
    port: 465,
    secure: true,
    auth: {
      user: NOREPLY_EMAIL,
      pass: password,
    },
  });
}

exports.enviarSolicitudPassword = onRequest(
  {
    cors: true,
    secrets: ["NOREPLY_EMAIL_PASSWORD"],
  },
  async (req, res) => {
    try {
      logger.log("🔑 Solicitud de recuperación de contraseña recibida");

      if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Método no permitido. Use POST." });
      }

      const { correoCuenta, empresa, nombre, correoContacto } = req.body;

      if (!correoCuenta || !empresa || !nombre || !correoContacto) {
        logger.warn("❌ Faltan campos requeridos");
        return res.status(400).json({ success: false, error: "Faltan campos requeridos" });
      }

      const password = process.env.NOREPLY_EMAIL_PASSWORD;

      if (!password && process.env.FUNCTIONS_EMULATOR !== "true") {
        logger.error("❌ Secret no configurado");
        return res.status(500).json({ success: false, error: "Configuración de correo no disponible" });
      }

      const transporter = createTransporter(password);

      const fechaMostrar = new Date().toLocaleString("es-MX", {
        timeZone: "America/Tijuana",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const mailOptions = {
        from: `"PercoGPS" <${NOREPLY_EMAIL}>`,
        to: SISTEMAS_EMAIL,
        subject: `🔑 Solicitud de recuperación de contraseña — ${nombre}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .header { background: linear-gradient(135deg, #bb0000 0%, #cc3300 100%); color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; }
              .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #bb0000; border-radius: 4px; }
              .footer { background: #333; color: white; padding: 15px; text-align: center; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🔑 Solicitud de Recuperación de Contraseña</h1>
              <p>${fechaMostrar}</p>
            </div>
            <div class="content">
              <div class="info-box">
                <h3>📋 Datos de la Solicitud</h3>
                <p><strong>Correo de cuenta a recuperar:</strong> ${correoCuenta}</p>
                <p><strong>Empresa:</strong> ${empresa}</p>
                <p><strong>Nombre del solicitante:</strong> ${nombre}</p>
                <p><strong>Correo de contacto:</strong> ${correoContacto}</p>
              </div>
              <div class="info-box">
                <p>⚠️ Verificar la identidad del solicitante antes de proceder al cambio manual de contraseña.</p>
              </div>
            </div>
            <div class="footer">
              <p>PercoGPS — Sistema de seguimiento de flotas</p>
            </div>
          </body>
          </html>
        `,
      };

      await transporter.sendMail(mailOptions);
      logger.log(`✅ Solicitud enviada para: ${correoCuenta}`);

      return res.status(200).json({
        success: true,
        message: "Solicitud enviada correctamente",
        fecha: fechaMostrar,
      });

    } catch (error) {
      logger.error("Error general:", error);
      return res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details: error.message,
      });
    }
  }
);
