import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();

async function main() {
  // 0. Clear all existing data
  console.log('🧹 Limpando dados existentes...');
  await prisma.couponUsage.deleteMany();
  await prisma.bigoRecharge.deleteMany();
  await prisma.$executeRaw`DELETE FROM "InfluencerMonthlySales"`;
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
        description:
          'A Bigo Live é uma plataforma de transmissões ao vivo onde usuários compartilham momentos, mostram talentos e interagem em tempo real.',
        instructions:
          'Recarregue diamantes da Bigo Live em instantes! Basta informar o ID da sua conta Bigo Live, escolher a quantidade de diamantes que deseja adquirir, finalizar o pagamento, e seus diamantes serão entregues diretamente na sua conta Bigo Live em alguns minutos.',
        imgBannerUrl:
          'https://storage.googleapis.com/4miga-images/products/bigo/wide-banner.png',
        imgCardUrl:
          'https://storage.googleapis.com/4miga-images/products/bigo/card.png',
      },
    }),
    await prisma.product.create({
      data: {
        name: 'Poppo Live',
        description:
          'A Poppo Live é uma plataforma de transmissões ao vivo onde usuários compartilham momentos, mostram talentos e interagem em tempo real.',
        instructions:
          'Recarregue moedas da Poppo Live em instantes! Basta informar o ID da sua conta Poppo Live, escolher a quantidade de moedas que deseja adquirir, finalizar o pagamento, e suas moedas serão entregues diretamente na sua conta Poppo Live em alguns minutos.',
        imgBannerUrl:
          'https://storage.googleapis.com/4miga-images/products/poppo/wide-banner.png',
        imgCardUrl:
          'https://storage.googleapis.com/4miga-images/products/poppo/card.png',
      },
    }),
  ];

  // Find products by name
  const bigoProduct = products.find(
    (p) => p.name.toLowerCase() === 'bigo live',
  );
  const poppoProduct = products.find(
    (p) => p.name.toLowerCase() === 'poppo live',
  );

  // Packages for Bigo Live
  const bigoPackages = [
    {
      amountCredits: 50,
      name: '50 Diamonds Bigo',
      imgCardUrl:
        'https://storage.googleapis.com/4miga-images/products/bigo/package.png',
      isOffer: false,
      basePrice: 6.18,
    },
    {
      amountCredits: 100,
      name: '100 Diamonds Bigo',
      imgCardUrl:
        'https://storage.googleapis.com/4miga-images/products/bigo/package.png',
      isOffer: false,
      basePrice: 12.59,
    },
    {
      amountCredits: 200,
      name: '200 Diamonds Bigo',
      imgCardUrl:
        'https://storage.googleapis.com/4miga-images/products/bigo/package.png',
      isOffer: true,
      basePrice: 25.35,
    },
    {
      amountCredits: 500,
      name: '500 Diamonds Bigo',
      imgCardUrl:
        'https://storage.googleapis.com/4miga-images/products/bigo/package.png',
      isOffer: true,
      basePrice: 62.81,
    },
    {
      amountCredits: 1000,
      name: '1000 Diamonds Bigo',
      imgCardUrl:
        'https://storage.googleapis.com/4miga-images/products/bigo/package.png',
      isOffer: true,
      basePrice: 123.44,
    },
    {
      amountCredits: 2000,
      name: '2000 Diamonds Bigo',
      imgCardUrl:
        'https://storage.googleapis.com/4miga-images/products/bigo/package.png',
      isOffer: false,
      basePrice: 251.18,
    },
    {
      amountCredits: 5000,
      name: '5000 Diamonds Bigo',
      imgCardUrl:
        'https://storage.googleapis.com/4miga-images/products/bigo/package.png',
      isOffer: true,
      basePrice: 613.86,
    },
    {
      amountCredits: 10000,
      name: '10000 Diamonds Bigo',
      imgCardUrl:
        'https://storage.googleapis.com/4miga-images/products/bigo/package.png',
      isOffer: true,
      basePrice: 1220.13,
    },
  ];

  // Packages for Poppo Live
  const poppoPackages = [
    {
      amountCredits: 35000,
      name: '35.000 Coins Poppo',
      imgCardUrl:
        'https://storage.googleapis.com/4miga-images/products/poppo/package.png',
      isOffer: true,
      basePrice: 22.5,
    },
    {
      amountCredits: 70000,
      name: '70.000 Coins Poppo',
      imgCardUrl:
        'https://storage.googleapis.com/4miga-images/products/poppo/package.png',
      isOffer: true,
      basePrice: 22.5,
    },
    {
      amountCredits: 210000,
      name: '210.000 Coins Poppo',
      imgCardUrl:
        'https://storage.googleapis.com/4miga-images/products/poppo/package.png',
      isOffer: true,
      basePrice: 22.5,
    },
    {
      amountCredits: 350000,
      name: '350.000 Coins Poppo',
      imgCardUrl:
        'https://storage.googleapis.com/4miga-images/products/poppo/package.png',
      isOffer: true,
      basePrice: 22.5,
    },
    {
      amountCredits: 700000,
      name: '700.000 Coins Poppo',
      imgCardUrl:
        'https://storage.googleapis.com/4miga-images/products/poppo/package.png',
      isOffer: true,
      basePrice: 22.5,
    },
    {
      amountCredits: 1400000,
      name: '1.400.000 Coins Poppo',
      imgCardUrl:
        'https://storage.googleapis.com/4miga-images/products/poppo/package.png',
      isOffer: true,
      basePrice: 22.5,
    },
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

  // 3. Create 10 influencers for both stores (5 each)
  console.log('👤 Criando 10 influencers (5 para cada loja)...');

  const store1Influencers = [
    {
      name: 'GamerPro',
      email: 'gamerpro@example.com',
      phone: '11999999999',
      paymentMethod: 'pix',
      paymentData: 'PIX_GAMERPRO',
      isActive: true,
      storeId: store1.id,
    },
    {
      name: 'LiveStreamer',
      email: 'livestreamer@example.com',
      phone: '11988888888',
      paymentMethod: 'pix',
      paymentData: 'PIX_LIVESTREAMER',
      isActive: true,
      storeId: store1.id,
    },
    {
      name: 'NewUser',
      email: 'newuser@example.com',
      phone: '11977777777',
      paymentMethod: 'pix',
      paymentData: 'PIX_NEWUSER',
      isActive: true,
      storeId: store1.id,
    },
    {
      name: 'WeekendGamer',
      email: 'weekendgamer@example.com',
      phone: '11966666666',
      paymentMethod: 'pix',
      paymentData: 'PIX_WEEKENDGAMER',
      isActive: true,
      storeId: store1.id,
    },
    {
      name: 'LoyalCustomer',
      email: 'loyalcustomer@example.com',
      phone: '11955555555',
      paymentMethod: 'pix',
      paymentData: 'PIX_LOYALCUSTOMER',
      isActive: true,
      storeId: store1.id,
    },
  ];

  const store2Influencers = [
    {
      name: 'StoreOpener',
      email: 'storeopener@example.com',
      phone: '11944444444',
      paymentMethod: 'pix',
      paymentData: 'PIX_STOREOPENER',
      isActive: true,
      storeId: store2.id,
    },
    {
      name: 'PoppoFan',
      email: 'poppofan@example.com',
      phone: '11933333333',
      paymentMethod: 'pix',
      paymentData: 'PIX_POPPOFAN',
      isActive: true,
      storeId: store2.id,
    },
    {
      name: 'FlashSale',
      email: 'flashsale@example.com',
      phone: '11922222222',
      paymentMethod: 'pix',
      paymentData: 'PIX_FLASHSALE',
      isActive: true,
      storeId: store2.id,
    },
    {
      name: 'DailyDeal',
      email: 'dailydeal@example.com',
      phone: '11911111111',
      paymentMethod: 'pix',
      paymentData: 'PIX_DAILYDEAL',
      isActive: true,
      storeId: store2.id,
    },
    {
      name: 'VIPMember',
      email: 'vipmember@example.com',
      phone: '11900000000',
      paymentMethod: 'pix',
      paymentData: 'PIX_VIPMEMBER',
      isActive: true,
      storeId: store2.id,
    },
  ];

  // Create influencers for both stores
  const createdStore1Influencers: any[] = [];
  const createdStore2Influencers: any[] = [];

  for (const influencerData of store1Influencers) {
    const influencer = await prisma.influencer.create({ data: influencerData });
    createdStore1Influencers.push(influencer);
  }

  for (const influencerData of store2Influencers) {
    const influencer = await prisma.influencer.create({ data: influencerData });
    createdStore2Influencers.push(influencer);
  }

  console.log('✅ 10 Influencers criados!');

  // 4. Create 3 coupons for each influencer (30 total)
  console.log('🎫 Criando 3 cupons para cada influencer (30 total)...');

  const allInfluencers = [
    ...createdStore1Influencers,
    ...createdStore2Influencers,
  ];
  const allCoupons: any[] = [];

  for (const influencer of allInfluencers) {
    const influencerCoupons = [
      {
        title: `${influencer.name.toUpperCase().replace(/\s+/g, '')}10`,
        influencerId: influencer.id,
        discountPercentage: 10.0,
        discountAmount: null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
        maxUses: 100,
        minOrderAmount: 20.0,
        isActive: true,
        isFirstPurchase: true,
        storeId: influencer.storeId,
      },
      {
        title: `${influencer.name.toUpperCase().replace(/\s+/g, '')}5`,
        influencerId: influencer.id,
        discountPercentage: 5.0,
        discountAmount: null,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 dias
        maxUses: 200,
        minOrderAmount: 15.0,
        isActive: true,
        storeId: influencer.storeId,
      },
      {
        title: `${influencer.name.toUpperCase().replace(/\s+/g, '')}15`,
        influencerId: influencer.id,
        discountPercentage: 15.0,
        discountAmount: null,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 dias
        maxUses: 50,
        minOrderAmount: 50.0,
        isActive: true,
        storeId: influencer.storeId,
      },
    ];

    for (const couponData of influencerCoupons) {
      const coupon = await prisma.coupon.create({ data: couponData });
      allCoupons.push(coupon);
    }
  }

  console.log('✅ 30 Cupons criados!');

  // 5. Create users for both stores
  const password = await bcrypt.hash('Babebi22*', 10);
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

  // 6. Create 10 Orders for each user with BigoRecharge
  console.log('📦 Criando 10 pedidos para cada usuário com BigoRecharge...');

  const users = [user1, user2];
  const storesForOrders = [store1, store2];
  const couponsForStores = [
    allCoupons.filter((c) => c.storeId === store1.id),
    allCoupons.filter((c) => c.storeId === store2.id),
  ];

  for (let userIndex = 0; userIndex < users.length; userIndex++) {
    const currentUser = users[userIndex];
    const currentStore = storesForOrders[userIndex];
    const currentStoreCoupons = couponsForStores[userIndex];

    for (let i = 0; i < 10; i++) {
      const randomProduct =
        products[Math.floor(Math.random() * products.length)];
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

      // BigoRecharge for each order
      const bigoRecharge = await prisma.bigoRecharge.create({
        data: {
          seqid: `SEQ-${userIndex + 1}-${i + 1}-${Date.now()}`,
          buOrderId: `BU-${userIndex + 1}-${i + 1}-${Date.now()}`,
          endpoint: '/api/bigo/recharge',
          status: 'SUCCESS',
          rescode: 200,
          message: 'Recharge successful',
          requestBody: {
            userId: currentUser.id,
            amount: randomPackage.amountCredits,
            packageId: randomPackage.id,
            orderId: order.id,
          },
          responseBody: {
            success: true,
            message: 'Recharge completed successfully',
            transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          },
          attempts: 1,
          nextRetry: null,
          orderId: order.id,
        },
      });

      // 70% chance de aplicar um cupom (7 de 10 pedidos)
      if (Math.random() < 0.7) {
        const randomCoupon =
          currentStoreCoupons[
            Math.floor(Math.random() * currentStoreCoupons.length)
          ];

        // Verificar se o pedido atende aos requisitos mínimos do cupom
        if (
          randomCoupon.minOrderAmount === null ||
          randomPackage.basePrice >= randomCoupon.minOrderAmount
        ) {
          // Aplicar desconto
          let finalPrice = randomPackage.basePrice;
          if (randomCoupon.discountPercentage) {
            finalPrice = randomPackage.basePrice.mul(
              1 - randomCoupon.discountPercentage.toNumber() / 100,
            );
          } else if (randomCoupon.discountAmount) {
            const tempPrice = randomPackage.basePrice.sub(
              randomCoupon.discountAmount,
            );
            finalPrice = tempPrice.greaterThan(0) ? tempPrice : tempPrice;
          }

          // Atualizar o preço do pedido com desconto
          await prisma.order.update({
            where: { id: order.id },
            data: { price: finalPrice },
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
              totalSalesAmount: { increment: finalPrice },
            },
          });

          console.log(
            `🎫 Cupom ${randomCoupon.title} aplicado no pedido ${order.orderNumber} - Desconto: ${randomCoupon.discountPercentage}%`,
          );
        }
      }
    }
  }

  // 7. Create 10 months of sales history for each influencer
  console.log(
    '📊 Criando histórico de vendas dos últimos 10 meses para cada influencer...',
  );

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentYear = currentDate.getFullYear();

  for (const influencer of allInfluencers) {
    for (let monthOffset = 9; monthOffset >= 0; monthOffset--) {
      let month = currentMonth - monthOffset;
      let year = currentYear;

      if (month <= 0) {
        month += 12;
        year -= 1;
      }

      // Generate random sales data for each month
      const randomSales = Math.floor(Math.random() * 5000) + 100; // 100 to 5100
      const totalSales = new Decimal(randomSales);

      await prisma.$executeRaw`
        INSERT INTO "InfluencerMonthlySales" ("id", "influencerId", "month", "year", "totalSales", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${influencer.id}, ${month}, ${year}, ${totalSales}, NOW(), NOW())
      `;
    }
  }

  console.log(
    '✅ Histórico de vendas dos últimos 10 meses criado para todos os influencers!',
  );

  console.log('🎉 Seed completo finalizado!');
  console.log(`📊 Resumo criado:`);
  console.log(`   - ${stores.length} Stores`);
  console.log(`   - ${products.length} Products`);
  console.log(`   - ${allInfluencers.length} Influencers`);
  console.log(`   - ${allCoupons.length} Coupons`);
  console.log(`   - ${users.length} Users`);
  console.log(`   - ${users.length * 10} Orders with BigoRecharge`);
  console.log(`   - ${allInfluencers.length * 10} Monthly sales records`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
