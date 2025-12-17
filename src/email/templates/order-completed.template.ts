export function getOrderCompletedTemplate(
  userName: string,
  orderNumber: string,
  rechargeId: string,
  packageName: string,
  amountCredits: number,
  orderPrice: number,
  completedAt: Date,
  storeDomain?: string,
): string {
  const formattedDate = completedAt.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });

  const formattedPrice = orderPrice.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const fullDomain = storeDomain?.startsWith('http')
    ? storeDomain
    : storeDomain
      ? `https://${storeDomain}`
      : null;

  return `
<html style="color-scheme: dark;">
  <head>
    <meta charset="UTF-8" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>Pedido Concluído</title>
  </head>
  <body style="margin: 0; padding: 12px; font-family: Arial, sans-serif; background-color: #ffffff;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 auto;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; max-width: 600px; background-color: #071116; padding: 16px; border-radius: 12px; color: #ffffff;">
            <tr>
              <td align="center" style="color: #00c8ff !important; font-size: 18px; padding-bottom: 20px;">
                <h2 style="margin: 0;">✅ Pedido Concluído!</h2>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 20px 0;">
                <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #ffffff !important;">
                  Olá, <strong>${userName}</strong>! Seu pedido foi processado com sucesso.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 12px; background-color: #0a1a20 !important; border-radius: 8px; margin: 20px 0;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="padding-bottom: 15px;">
                      <div style="font-size: 14px; color: #888888; margin-bottom: 5px;">Número do Pedido:</div>
                      <div style="font-size: 18px; color: #ffffff !important; font-weight: bold;">${orderNumber}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 15px;">
                      <div style="font-size: 14px; color: #888888; margin-bottom: 5px;">ID da recarga:</div>
                      <div style="font-size: 16px; color: #ffffff !important; font-weight: bold;">${rechargeId}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 15px;">
                      <div style="font-size: 14px; color: #888888; margin-bottom: 5px;">Pacote:</div>
                      <div style="font-size: 16px; color: #ffffff !important; font-weight: bold;">${packageName}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 15px;">
                      <div style="font-size: 14px; color: #888888; margin-bottom: 5px;">Créditos Adicionados:</div>
                      <div style="font-size: 18px; color: #00c8ff !important; font-weight: bold;">${amountCredits.toLocaleString('pt-BR')}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 15px;">
                      <div style="font-size: 14px; color: #888888; margin-bottom: 5px;">Valor Pago:</div>
                      <div style="font-size: 18px; color: #ffffff !important; font-weight: bold;">${formattedPrice}</div>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <div style="font-size: 14px; color: #888888; margin-bottom: 5px;">Data de Conclusão:</div>
                      <div style="font-size: 16px; color: #ffffff !important;">${formattedDate}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr style="height: 8px;"></tr>
            <tr>
              <td style="padding: 20px 0; background-color: #0a1a20 !important; border-radius: 8px; text-align: center;">
                <p style="margin: 0; font-size: 16px; color: #00c8ff !important; font-weight: bold;">
                  🎉 Seus créditos já foram adicionados à sua conta!
                </p>
              </td>
            </tr>
            ${fullDomain ? `
            <tr>
              <td align="center" style="padding-top: 30px;">
                <a href="${fullDomain}" style="color: #00c8ff !important; text-decoration: none; font-size: 14px;">
                  ${storeDomain}
                </a>
              </td>
            </tr>
            ` : ''}
            <tr>
              <td align="center" style="padding-top: 20px; font-size: 12px; color: #777;">
                Se você tiver alguma dúvida sobre este pedido, entre em contato com o suporte.
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

