export function getEmailChangeConfirmationTemplate(code: string): string {
  return `
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Confirmação de alteração de e-mail</title>
  </head>
  <body style="margin: 0; padding: 50px; font-family: Arial, sans-serif; background-color: #ffffff;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 auto;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; max-width: 600px; background-color: #071116; padding: 20px; border-radius: 8px; color: #ffffff;">
            <tr>
              <td align="center" style="color: #00c8ff; font-size: 20px;">
                <h2 style="margin: 0;">Confirmação de alteração de e-mail</h2>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 10px 0;">
                <p style="margin: 0;">Use o código abaixo para confirmar sua alteração de e-mail:</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 20px 0;">
                <div style="font-size: 24px; font-weight: bold; background-color: #ffffff; color: #000000; padding: 10px; border-radius: 8px; letter-spacing: 7px; display: inline-block;">
                  ${code}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top: 20px; font-size: 14px; color: #777;">
                Se você não solicitou esta alteração, ignore este e-mail.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}
