import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient()
import * as bcrypt from 'bcrypt';

async function main() {
  // 0. Clear all existing data
  console.log('🧹 Limpando dados existentes...');
  await prisma.couponUsage.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.order.deleteMany();
  await prisma.user.deleteMany();
  await prisma.package.deleteMany();
  await prisma.store.deleteMany();
  await prisma.product.deleteMany();
  console.log('✅ Dados limpos!');

  // 1. Stores
  const store1 = await prisma.store.create({
    data: {
      name: 'Loja Exemplo 1',
      email: 'loja1@exemplo.com',
      domain: 'www.4miga.games',
      wppNumber: '11999999999',
      instagramUrl: 'https://www.instagram.com/lojaexemplo1',
      facebookUrl: 'https://www.facebook.com/lojaexemplo1',
      tiktokUrl: 'https://www.tiktok.com/@lojaexemplo1',
    },
  });

  const store2 = await prisma.store.create({
    data: {
      name: 'Loja Exemplo 2',
      email: 'loja2@exemplo.com',
      domain: 'loja.4miga.games',
      wppNumber: '11888888888',
      instagramUrl: 'https://www.instagram.com/lojaexemplo2',
      facebookUrl: 'https://www.facebook.com/lojaexemplo2',
      tiktokUrl: 'https://www.tiktok.com/@lojaexemplo2',
    },
  });

  // 2. Create 2 specific Products
  const products = [
    await prisma.product.create({
      data: {
        name: 'Bigo Live',
        description: 'A Bigo Live é uma plataforma de transmissões ao vivo onde usuários compartilham momentos, mostram talentos e interagem em tempo real.',
        instructions: 'Recarregue diamantes da Bigo Live em instantes! Basta informar o ID da sua conta Bigo Live, escolher a quantidade de diamantes que deseja adquirir, finalizar o pagamento, e seus diamantes serão entregues diretamente na sua conta Bigo Live em alguns minutos.',
        imgBannerUrl: 'https://storage.googleapis.com/4miga-images/products/bigo/wide-banner.png',
        imgCardUrl: 'https://storage.googleapis.com/4miga-images/products/bigo/card.png',
      },
    }),
    await prisma.product.create({
      data: {
        name: 'Poppo Live',
        description: 'A Poppo Live é uma plataforma de transmissões ao vivo onde usuários compartilham momentos, mostram talentos e interagem em tempo real.',
        instructions: 'Recarregue moedas da Poppo Live em instantes! Basta informar o ID da sua conta Poppo Live, escolher a quantidade de moedas que deseja adquirir, finalizar o pagamento, e suas moedas serão entregues diretamente na sua conta Poppo Live em alguns minutos.',
        imgBannerUrl: 'https://storage.googleapis.com/4miga-images/products/poppo/wide-banner.png',
        imgCardUrl: 'https://storage.googleapis.com/4miga-images/products/poppo/card.png',
      },
    }),
  ];

  // Find products by name
  const bigoProduct = products.find(p => p.name.toLowerCase() === 'bigo live');
  const poppoProduct = products.find(p => p.name.toLowerCase() === 'poppo live');

  // Packages for Bigo Live
  const bigoPackages = [
    { amountCredits: 50, name: "50 Diamonds Bigo", imgCardUrl: "https://storage.googleapis.com/4miga-images/products/bigo/package.png", isOffer: false, basePrice: 6.18 },
    { amountCredits: 100, name: "100 Diamonds Bigo", imgCardUrl: "https://storage.googleapis.com/4miga-images/products/bigo/package.png", isOffer: false, basePrice: 12.59 },
    { amountCredits: 200, name: "200 Diamonds Bigo", imgCardUrl: "https://storage.googleapis.com/4miga-images/products/bigo/package.png", isOffer: true, basePrice: 25.35 },
    { amountCredits: 500, name: "500 Diamonds Bigo", imgCardUrl: "https://storage.googleapis.com/4miga-images/products/bigo/package.png", isOffer: true, basePrice: 62.81 },
    { amountCredits: 1000, name: "1000 Diamonds Bigo", imgCardUrl: "https://storage.googleapis.com/4miga-images/products/bigo/package.png", isOffer: true, basePrice: 123.44 },
    { amountCredits: 2000, name: "2000 Diamonds Bigo", imgCardUrl: "https://storage.googleapis.com/4miga-images/products/bigo/package.png", isOffer: false, basePrice: 251.18 },
    { amountCredits: 5000, name: "5000 Diamonds Bigo", imgCardUrl: "https://storage.googleapis.com/4miga-images/products/bigo/package.png", isOffer: true, basePrice: 613.86 },
    { amountCredits: 10000, name: "10000 Diamonds Bigo", imgCardUrl: "https://storage.googleapis.com/4miga-images/products/bigo/package.png", isOffer: true, basePrice: 1220.13 },
  ];

  // Packages for Poppo Live
  const poppoPackages = [
    { amountCredits: 35000, name: "35.000 Coins Poppo", imgCardUrl: "https://storage.googleapis.com/4miga-images/products/poppo/package.png", isOffer: true, basePrice: 22.5 },
    { amountCredits: 70000, name: "70.000 Coins Poppo", imgCardUrl: "https://storage.googleapis.com/4miga-images/products/poppo/package.png", isOffer: true, basePrice: 22.5 },
    { amountCredits: 210000, name: "210.000 Coins Poppo", imgCardUrl: "https://storage.googleapis.com/4miga-images/products/poppo/package.png", isOffer: true, basePrice: 22.5 },
    { amountCredits: 350000, name: "350.000 Coins Poppo", imgCardUrl: "https://storage.googleapis.com/4miga-images/products/poppo/package.png", isOffer: true, basePrice: 22.5 },
    { amountCredits: 700000, name: "700.000 Coins Poppo", imgCardUrl: "https://storage.googleapis.com/4miga-images/products/poppo/package.png", isOffer: true, basePrice: 22.5 },
    { amountCredits: 1400000, name: "1.400.000 Coins Poppo", imgCardUrl: "https://storage.googleapis.com/4miga-images/products/poppo/package.png", isOffer: true, basePrice: 22.5 },
  ];

  // Create packages for both stores
  const stores = [store1, store2];

  for (const store of stores) {
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
  }

  // 3. Create 5 coupons for each store
  console.log('🎫 Criando cupons para cada loja...');

  const store1Coupons = [
    {
      title: 'WELCOME10',
      influencerName: 'GamerPro',
      paymentMethod: 'pix',
      paymentData: 'PIX_WELCOME10',
      discountPercentage: 10.00,
      discountAmount: null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
      maxUses: 100,
      minOrderAmount: 20.00,
      isActive: true,
      storeId: store1.id,
    },
    {
      title: 'BIGO5',
      influencerName: 'LiveStreamer',
      paymentMethod: 'pix',
      paymentData: 'PIX_BIGO5',
      discountPercentage: 5.00,
      discountAmount: null,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 dias
      maxUses: 200,
      minOrderAmount: 15.00,
      isActive: true,
      storeId: store1.id,
    },
    {
      title: 'FIRSTORDER',
      influencerName: 'NewUser',
      paymentMethod: 'pix',
      paymentData: 'PIX_FIRSTORDER',
      discountPercentage: 10.00,
      discountAmount: null,
      expiresAt: null,
      maxUses: 50,
      minOrderAmount: 10.00,
      isActive: true,
      storeId: store1.id,
    },
          {
        title: 'WEEKEND5',
        influencerName: 'WeekendGamer',
        paymentMethod: 'pix',
        paymentData: 'PIX_WEEKEND5',
        discountPercentage: 5.00,
        discountAmount: null,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 dia atrás
        maxUses: 150,
        minOrderAmount: 25.00,
        isActive: true,
        storeId: store1.id,
      },
    {
      title: 'LOYALTY10',
      influencerName: 'LoyalCustomer',
      paymentMethod: 'pix',
      paymentData: 'PIX_LOYALTY10',
      discountPercentage: 10.00,
      discountAmount: null,
      expiresAt: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 dias
      maxUses: 75,
      minOrderAmount: 30.00,
      isActive: true,
      storeId: store1.id,
    },
  ];

  const store2Coupons = [
    {
      title: 'NEWSTORE10',
      influencerName: 'StoreOpener',
      paymentMethod: 'pix',
      paymentData: 'PIX_NEWSTORE10',
      discountPercentage: 10.00,
      discountAmount: null,
      expiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 dias
      maxUses: 80,
      minOrderAmount: 18.00,
      isActive: true,
      storeId: store2.id,
    },
    {
      title: 'POPPO5',
      influencerName: 'PoppoFan',
      paymentMethod: 'pix',
      paymentData: 'PIX_POPPO5',
      discountPercentage: 5.00,
      discountAmount: null,
      expiresAt: null,
      maxUses: 180,
      minOrderAmount: 20.00,
      isActive: true,
      storeId: store2.id,
    },
    {
      title: 'FLASH10',
      influencerName: 'FlashSale',
      paymentMethod: 'pix',
      paymentData: 'PIX_FLASH10',
      discountPercentage: 10.00,
      discountAmount: null,
      expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 dias
      maxUses: 60,
      minOrderAmount: 15.00,
      isActive: true,
      storeId: store2.id,
    },
    {
      title: 'DAILY5',
      influencerName: 'DailyDeal',
      paymentMethod: 'pix',
      paymentData: 'PIX_DAILY5',
      discountPercentage: 5.00,
      discountAmount: null,
      expiresAt: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000), // 55 dias
      maxUses: 120,
      minOrderAmount: 22.00,
      isActive: true,
      storeId: store2.id,
    },
    {
      title: 'VIP10',
      influencerName: 'VIPMember',
      paymentMethod: 'pix',
      paymentData: 'PIX_VIP10',
      discountPercentage: 10.00,
      discountAmount: null,
      expiresAt: new Date(Date.now() - 1), //expired
      maxUses: 40,
      minOrderAmount: 35.00,
      isActive: true,
      storeId: store2.id,
    },
  ];

  // Create coupons for both stores
  const createdStore1Coupons: any[] = [];
  const createdStore2Coupons: any[] = [];

  for (const couponData of store1Coupons) {
    const coupon = await prisma.coupon.create({ data: couponData });
    createdStore1Coupons.push(coupon);
  }

  for (const couponData of store2Coupons) {
    const coupon = await prisma.coupon.create({ data: couponData });
    createdStore2Coupons.push(coupon);
  }

  console.log('✅ Cupons criados!');

  // 4. Create users for both stores
  const password = await bcrypt.hash('Babebi22*', 10)
  const user1 = await prisma.user.create({
    data: {
      name: 'Cliente Exemplo 1',
      email: 'cliente1@exemplo.com',
      phone: '11999999999',
      password: password,
      documentType: 'cpf',
      documentValue: '123.456.789-00',
      role: 'USER',
      emailVerified: true,
      emailConfirmationCode: null,
      storeId: store1.id,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'Cliente Exemplo 2',
      email: 'cliente2@exemplo.com',
      phone: '11888888888',
      password: password,
      documentType: 'cpf',
      documentValue: '987.654.321-00',
      role: 'USER',
      emailVerified: true,
      emailConfirmationCode: null,
      storeId: store2.id,
    },
  });

  // 5. Create 10 Orders for each user, each with random Product and Package
  const users = [user1, user2];
  const storesForOrders = [store1, store2];
  const couponsForStores = [createdStore1Coupons, createdStore2Coupons];

  for (let userIndex = 0; userIndex < users.length; userIndex++) {
    const currentUser = users[userIndex];
    const currentStore = storesForOrders[userIndex];
    const currentStoreCoupons = couponsForStores[userIndex];

    for (let i = 0; i < 10; i++) {
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      const pkgsForProduct = await prisma.package.findMany({
        where: {
          productId: randomProduct.id,
          storeId: currentStore.id,
        },
      });
      const randomPackage =
        pkgsForProduct[Math.floor(Math.random() * pkgsForProduct.length)];

      // Payment
      const payment = await prisma.payment.create({
        data: {
          name: 'pix',
          status: 'PAYMENT_APPROVED',
          statusUpdatedAt: new Date(),
          qrCode: `qrcode-${userIndex + 1}-${i + 1}`,
          qrCodetextCopyPaste: `qrcode-copypaste-${userIndex + 1}-${i + 1}`,
        },
      });

      // OrderItem, Recharge, PackageInfo
      const recharge = await prisma.recharge.create({
        data: {
          userIdForRecharge: currentUser.id,
          status: 'RECHARGE_APPROVED',
          amountCredits: randomPackage.amountCredits,
          statusUpdatedAt: new Date(),
        },
      });

      const packageInfo = await prisma.packageInfo.create({
        data: {
          packageId: randomPackage.id,
          name: randomPackage.name,
          userIdForRecharge: currentUser.id,
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

      // Order
      const order = await prisma.order.create({
        data: {
          orderNumber: `ORDER-${userIndex + 1}-${i + 1}`,
          price: randomPackage.basePrice,
          orderStatus: 'COMPLETED',
          paymentId: payment.id,
          orderItemId: orderItem.id,
          storeId: currentStore.id,
          userId: currentUser.id,
        },
      });

      // 70% chance de aplicar um cupom (7 de 10 pedidos)
      if (Math.random() < 0.7) {
        const randomCoupon = currentStoreCoupons[Math.floor(Math.random() * currentStoreCoupons.length)];

        // Verificar se o pedido atende aos requisitos mínimos do cupom
        if (randomCoupon.minOrderAmount === null || randomPackage.basePrice >= randomCoupon.minOrderAmount) {
          // Aplicar desconto
          let finalPrice = randomPackage.basePrice;
          if (randomCoupon.discountPercentage) {
            finalPrice = randomPackage.basePrice.mul(1 - randomCoupon.discountPercentage.toNumber() / 100);
          } else if (randomCoupon.discountAmount) {
            const tempPrice = randomPackage.basePrice.sub(randomCoupon.discountAmount);
            finalPrice = tempPrice.greaterThan(0) ? tempPrice : tempPrice;
          }

          // Atualizar o preço do pedido com desconto
          await prisma.order.update({
            where: { id: order.id },
            data: { price: finalPrice }
          });

          // Registrar uso do cupom
          await prisma.couponUsage.create({
            data: {
              couponId: randomCoupon.id,
              orderId: order.id,
            },
          });

          // Atualizar estatísticas do cupom
          await prisma.coupon.update({
            where: { id: randomCoupon.id },
            data: {
              timesUsed: { increment: 1 },
              totalSalesAmount: { increment: finalPrice }
            }
          });

          console.log(`🎫 Cupom ${randomCoupon.title} aplicado no pedido ${order.orderNumber} - Desconto: ${randomCoupon.discountPercentage}%`);
        }
      }
    }
  }

  console.log('Finished!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
