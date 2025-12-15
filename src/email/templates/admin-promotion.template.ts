export function getAdminPromotionTemplate(
  userName: string,
  storeName: string,
  promotionDate: Date,
  storeDomain: string,
): string {
  const formattedDate = promotionDate.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const fullDomain = storeDomain.startsWith('http')
    ? storeDomain
    : `https://${storeDomain}`;

  return `
<html style="color-scheme: dark;">
  <head>
    <meta charset="UTF-8" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>Promoção a Administrador</title>
  </head>
  <body style="margin: 0; padding: 50px; font-family: Arial, sans-serif; background-color: #ffffff;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 auto;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; max-width: 600px; background-color: #071116; padding: 30px; border-radius: 12px; color: #ffffff;">
            <tr>
              <td align="center" style="color: #00c8ff; font-size: 24px; padding-bottom: 20px;">
                <h2 style="margin: 0;">🎉 Parabéns, ${userName}!</h2>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 20px 0;">
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #00c8ff; line-height: 1.5;">
                  Você foi promovido a Administrador
                </p>
                <p style="margin: 10px 0 0 0; font-size: 16px; color: #cccccc;">
                  de <strong>${storeName}</strong>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px 20px; background-color: #0a1a20 !important; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px; color: #ffffff !important; line-height: 1.6; text-align: justify;">
                  Como administrador, você agora possui permissões avançadas para gerenciar a loja e seus usuários.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 20px 0;">
                <div style="font-size: 14px; color: #888888; margin-bottom: 10px;">
                  Data da promoção:
                </div>
                <div style="font-size: 16px; color: #ffffff; font-weight: bold;">
                  ${formattedDate}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 30px; font-size: 14px; color: #ff6b6b !important; background-color: #1a0a0a !important; padding: 15px; border-radius: 8px; border-left: 4px solid #ff6b6b !important; text-align: justify;">
                ⚠️ <strong>Importante:</strong> Se você não esperava essa promoção ou não reconhece esta ação, entre em contato com os administradores da loja imediatamente.
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top: 30px;">
                <a href="${fullDomain}" style="color: #00c8ff; text-decoration: none; font-size: 14px;">
                  ${storeDomain}
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
