export const NOREPLY_LOGO_CID = 'vuela-events-logo';

// Envoltorio HTML para todo lo que sale por noReplyEmail.ts
export const wrapNoReplyEmailHtml = (
    bodyHtml: string,
): string => `<!doctype html>
<html>
  <body style="margin:0;padding:0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background-color:#f4d64e;padding:18px 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                  <tr>
                    <td style="vertical-align:middle;padding-right:10px;">
                      <img src="cid:${NOREPLY_LOGO_CID}" width="28" height="28" alt="" style="display:block;border-radius:6px;" />
                    </td>
                    <td style="vertical-align:middle;">
                      <span style="font-size:19px;font-weight:700;color:#242529;letter-spacing:-0.01em;">Vuela Events</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 4px 28px;color:#242529;font-size:15px;line-height:1.5;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:4px 28px 24px 28px;color:#242529;font-size:15px;line-height:1.5;">
                <p style="margin:0;">El equipo de Vuela Events</p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#fef7db;padding:16px 28px;text-align:center;border-top:1px solid #e9dfc7;">
                <p style="margin:0;font-size:12px;color:#6b6b6b;">
                  Este es un mensaje automático de Vuela Events. Por favor, no respondas a este correo.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
