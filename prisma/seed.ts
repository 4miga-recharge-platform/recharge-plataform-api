import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient()
import * as bcrypt from 'bcrypt';

async function main() {
  // 1. Cria a Store
  const store = await prisma.store.create({
    data: {
      name: 'Loja Exemplo',
      email: 'loja@exemplo.com',
      password: 'senhaSuperSecreta',
    },
  });

  // 2. Cria 2 Products específicos
  const products = [
    await prisma.product.create({
      data: {
        name: 'Bigo Live',
        description: 'A Bigo Live é uma plataforma de transmissões ao vivo onde usuários compartilham momentos, mostram talentos e interagem em tempo real.',
        instructions: 'Recarregue diamantes da Bigo Live em instantes! Basta informar o ID da sua conta Bigo Live, escolher a quantidade de diamantes que deseja adquirir, finalizar o pagamento, e seus diamantes serão entregues diretamente na sua conta Bigo Live em alguns minutos.',
        imgBannerUrl: 'https://i.imgur.com/OqYwlo2.png',
        imgCardUrl: 'https://i.imgur.com/cXxheGY.png',
      },
    }),
    await prisma.product.create({
      data: {
        name: 'Poppo Live',
        description: 'A Poppo Live é uma plataforma de transmissões ao vivo onde usuários compartilham momentos, mostram talentos e interagem em tempo real.',
        instructions: 'Recarregue moedas da Poppo Live em instantes! Basta informar o ID da sua conta Poppo Live, escolher a quantidade de moedas que deseja adquirir, finalizar o pagamento, e suas moedas serão entregues diretamente na sua conta Poppo Live em alguns minutos.',
        imgBannerUrl: 'https://i.imgur.com/WEcY23E.png',
        imgCardUrl: 'https://i.imgur.com/slLVbbu.png',
      },
    }),
  ];

  // Find products by name
  const bigoProduct = products.find(p => p.name.toLowerCase() === 'bigo live');
  const poppoProduct = products.find(p => p.name.toLowerCase() === 'poppo live');

  // Packages for Bigo Live
  const bigoPackages = [
    { amountCredits: 50, name: "50 Diamonds Bigo", imgCardUrl: "https://i.imgur.com/0CEHULk.png", isOffer: false, basePrice: 6.18 },
    { amountCredits: 100, name: "100 Diamonds Bigo", imgCardUrl: "https://i.imgur.com/0CEHULk.png", isOffer: false, basePrice: 12.59 },
    { amountCredits: 200, name: "200 Diamonds Bigo", imgCardUrl: "https://i.imgur.com/0CEHULk.png", isOffer: true, basePrice: 25.35 },
    { amountCredits: 500, name: "500 Diamonds Bigo", imgCardUrl: "https://i.imgur.com/0CEHULk.png", isOffer: true, basePrice: 62.81 },
    { amountCredits: 1000, name: "1000 Diamonds Bigo", imgCardUrl: "https://i.imgur.com/0CEHULk.png", isOffer: true, basePrice: 123.44 },
    { amountCredits: 2000, name: "2000 Diamonds Bigo", imgCardUrl: "https://i.imgur.com/0CEHULk.png", isOffer: false, basePrice: 251.18 },
    { amountCredits: 5000, name: "5000 Diamonds Bigo", imgCardUrl: "https://i.imgur.com/0CEHULk.png", isOffer: true, basePrice: 613.86 },
    { amountCredits: 10000, name: "10000 Diamonds Bigo", imgCardUrl: "https://i.imgur.com/0CEHULk.png", isOffer: true, basePrice: 1220.13 },
  ];

  // Packages for Poppo Live
  const poppoPackages = [
    { amountCredits: 35000, name: "35.000 Coins Poppo", imgCardUrl: "https://i.imgur.com/NPIiDId.png", isOffer: true, basePrice: 22.5 },
    { amountCredits: 70000, name: "70.000 Coins Poppo", imgCardUrl: "https://i.imgur.com/NPIiDId.png", isOffer: true, basePrice: 22.5 },
    { amountCredits: 210000, name: "210.000 Coins Poppo", imgCardUrl: "https://i.imgur.com/NPIiDId.png", isOffer: true, basePrice: 22.5 },
    { amountCredits: 350000, name: "350.000 Coins Poppo", imgCardUrl: "https://i.imgur.com/NPIiDId.png", isOffer: true, basePrice: 22.5 },
    { amountCredits: 700000, name: "700.000 Coins Poppo", imgCardUrl: "https://i.imgur.com/NPIiDId.png", isOffer: true, basePrice: 22.5 },
    { amountCredits: 1400000, name: "1.400.000 Coins Poppo", imgCardUrl: "https://i.imgur.com/NPIiDId.png", isOffer: true, basePrice: 22.5 },
  ];

  // Create packages for Bigo Live
  if (bigoProduct) {
    for (const pkg of bigoPackages) {
      await prisma.package.create({
        data: {
          ...pkg,
          productId: bigoProduct.id,
          storeId: store.id,
          paymentMethods: {
            create: [{ name: 'pix', price: pkg.basePrice }],
          },
        },
      });
    }
  }

  // Create packages for Poppo Live
  if (poppoProduct) {
    for (const pkg of poppoPackages) {
      await prisma.package.create({
        data: {
          ...pkg,
          productId: poppoProduct.id,
          storeId: store.id,
          paymentMethods: {
            create: [{ name: 'pix', price: pkg.basePrice }],
          },
        },
      });
    }
  }

  // 4. Cria 1 usuário
  const password = await bcrypt.hash('Babebi22*', 10)
  const user = await prisma.user.create({
    data: {
      name: 'Cliente Exemplo',
      email: 'cliente@exemplo.com',
      phone: '11999999999',
      password: password,
      documentType: 'cpf',
      documentValue: '123.456.789-00',
      role: 'USER',
      storeId: store.id,
    },
  });

  // 5. Cria 10 Orders para esse usuário, cada uma com Product e Package aleatórios
  for (let i = 0; i < 10; i++) {
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    const pkgsForProduct = await prisma.package.findMany({
      where: {
        productId: randomProduct.id,
      },
    });
    const randomPackage =
      pkgsForProduct[Math.floor(Math.random() * pkgsForProduct.length)];

    // Cria Payment
    const payment = await prisma.payment.create({
      data: {
        name: 'pix',
        status: 'PAYMENT_APPROVED',
        statusUpdatedAt: new Date(),
        qrCode: `qrcode${i}`,
        qrCodetextCopyPaste: `qrcode-copypaste${i}`,
      },
    });

    // Cria OrderItem, Recharge, PackageInfo
    const recharge = await prisma.recharge.create({
      data: {
        userIdForRecharge: user.id,
        status: 'RECHARGE_APPROVED',
        amountCredits: randomPackage.amountCredits,
        statusUpdatedAt: new Date(),
      },
    });

    const packageInfo = await prisma.packageInfo.create({
      data: {
        packageId: randomPackage.id,
        name: randomPackage.name,
        userIdForRecharge: user.id,
        imgCardUrl: randomPackage.imgCardUrl,
      },
    });

    const orderItem = await prisma.orderItem.create({
      data: {
        productId: randomProduct.id,
        productName: randomProduct.name,
        rechargeId: recharge.id,
        packageId: packageInfo.id,
      },
    });

    // Cria Order
    await prisma.order.create({
      data: {
        orderNumber: `ORDER-${i + 1}`,
        price: randomPackage.basePrice,
        orderStatus: 'COMPLETED',
        paymentId: payment.id,
        orderItemId: orderItem.id,
        storeId: store.id,
        userId: user.id,
      },
    });
  }

  console.log('Seed finalizado!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
