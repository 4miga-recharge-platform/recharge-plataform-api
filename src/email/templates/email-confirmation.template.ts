export function getEmailConfirmationTemplate(
  code: string,
  userName: string,
  domain: string,
  email: string,
  storeId: string,
): string {
  // URL encode the email for the query parameter
  const encodedEmail = encodeURIComponent(email);

  // Create the confirmation link - ensure domain has https://
  const fullDomain = domain.startsWith('http') ? domain : `https://${domain}`;
  const confirmationLink = `${fullDomain}/confirm-email?email=${encodedEmail}&code=${code}&storeId=${storeId}`;

  return `
<html style="color-scheme: dark;">
  <head>
    <meta charset="UTF-8" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>Confirmação de Cadastro</title>
  </head>
  <body style="margin: 0; padding: 12px; font-family: Arial, sans-serif; background-color: #ffffff;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 auto;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; max-width: 600px; background-color: #071116; padding: 30px; border-radius: 12px; color: #ffffff;">
            <tr>
              <td align="center" style="color: #00c8ff; font-size: 18px; padding-bottom: 20px;">
                <h2 style="margin: 0;">Bem-vindo, ${userName}! 🎉</h2>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 20px 0;">
                <p style="margin: 0; font-size: 16px; line-height: 1.5;">Obrigado por se cadastrar! Para confirmar seu <span style="white-space: nowrap;">e-mail</span>, use o código abaixo:</p>
              </td>
            </tr>
            <tr>
              <td align="center">
                <div style="font-size: 36px; font-weight: bold; color: #ffffff !important; letter-spacing: 8px; padding: 20px 0;">
                  ${code}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #cccccc; margin-bottom: 20px;">
                  ou clique no botão abaixo para confirmar automaticamente:
                </p>
                <a href="${confirmationLink}"
                   target="_blank"
                   rel="noopener noreferrer"
                   style="display: inline-block; background-color: #00c8ff !important; color: #000000 !important; text-decoration: none; padding: 12px 25px; border-radius: 8px; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                  Confirmar E-mail
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top: 30px; font-size: 14px; color: #777;">
                Este código expira em 24 horas. Se você não solicitou este código, ignore este <span style="white-space: nowrap;">e-mail</span>.
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top: 20px;">
                <a href="${fullDomain}"
                   target="_blank"
                   rel="noopener noreferrer"
                   style="color: #00c8ff; text-decoration: none; font-size: 14px;">
                  ${domain}
                </a>
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
