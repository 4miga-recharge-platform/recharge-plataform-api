export function getAdminDemotionTemplate(
  userName: string,
  storeName: string,
  demotionDate: Date,
  storeDomain: string,
): string {
  const formattedDate = demotionDate.toLocaleString('pt-BR', {
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
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Permissão Removida</title>
  </head>
  <body style="margin: 0; padding: 50px; font-family: Arial, sans-serif; background-color: #ffffff;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 auto;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; max-width: 600px; background-color: #071116; padding: 30px; border-radius: 12px; color: #ffffff;">
            <tr>
              <td align="center" style="color: #00c8ff; font-size: 24px; padding-bottom: 20px;">
                <h2 style="margin: 0;">Alteração de Permissões</h2>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 20px 0;">
                <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #ffffff;">
                  Olá, <strong>${userName}</strong>
                </p>
                <p style="margin: 15px 0; font-size: 16px; color: #cccccc; line-height: 1.5;">
                  Sua permissão de administrador foi removida de <strong>${storeName}</strong>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px 20px; background-color: #0a1a20; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px; color: #ffffff; line-height: 1.6; text-align: center;">
                  Suas permissões administrativas foram removidas. Você continua sendo um usuário da loja, mas não terá mais acesso às funcionalidades de administrador.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 20px 0;">
                <div style="font-size: 14px; color: #888888; margin-bottom: 10px;">
                  Data da alteração:
                </div>
                <div style="font-size: 16px; color: #ffffff; font-weight: bold;">
                  ${formattedDate}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top: 30px; font-size: 14px; color: #ff6b6b; background-color: #1a0a0a; padding: 15px; border-radius: 8px; border-left: 4px solid #ff6b6b;">
                ⚠️ <strong>Importante:</strong> Se você não esperava essa alteração ou não reconhece esta ação, entre em contato com os administradores da loja imediatamente.
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
