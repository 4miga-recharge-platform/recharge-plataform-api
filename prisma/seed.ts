// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient()

// async function main() {
//   // 1. Cria a Store
//   const store = await prisma.store.create({
//     data: {
//       name: 'Loja Exemplo',
//       email: 'loja@exemplo.com',
//       password: 'senhaSuperSecreta',
//     },
//   });

//   // 2. Cria 3 Products
//   const products = await Promise.all(
//     Array.from({ length: 3 }).map((_, i) =>
//       prisma.product.create({
//         data: {
//           name: `Produto ${i + 1}`,
//           description: `Descrição do produto ${i + 1}`,
//           instructions: `Instruções do produto ${i + 1}`,
//           imgBannerUrl: `https://placehold.co/600x200?text=Produto+${i + 1}`,
//           imgCardUrl: `https://placehold.co/300x200?text=Produto+${i + 1}`,
//         },
//       }),
//     ),
//   );

//   // 3. Para cada Product, cria 6 Packages
//   const allPackages: any[] = [];
//   for (const product of products) {
//     const pkgs = await Promise.all(
//       Array.from({ length: 6 }).map((_, j) =>
//         prisma.package.create({
//           data: {
//             name: `Pacote ${j + 1} do ${product.name}`,
//             amountCredits: (j + 1) * 10,
//             imgCardUrl: `https://placehold.co/200x100?text=Pacote+${j + 1}`,
//             isOffer: j % 2 === 0,
//             basePrice: (j + 1) * 5.5,
//             productId: product.id,
//             storeId: store.id,
//             paymentMethods: {
//               create: [
//                 { name: 'pix', price: (j + 1) * 5.5 },
//                 { name: 'paypal', price: (j + 1) * 5.5 + 1 },
//               ],
//             },
//           },
//           include: { paymentMethods: true },
//         })
//       )
//     );
//     allPackages.push(...pkgs);
//   }

//   // 4. Cria 1 usuário
//   const user = await prisma.user.create({
//     data: {
//       name: 'Cliente Exemplo',
//       email: 'cliente@exemplo.com',
//       phone: '11999999999',
//       password: 'senhaCliente123',
//       documentType: 'cpf',
//       documentValue: '123.456.789-00',
//       role: 'USER',
//       storeId: store.id,
//     },
//   });

//   // 5. Cria 10 Orders para esse usuário, cada uma com Product e Package aleatórios
//   for (let i = 0; i < 10; i++) {
//     const randomProduct = products[Math.floor(Math.random() * products.length)];
//     const pkgsForProduct = allPackages.filter(
//       (pkg) => pkg.productId === randomProduct.id
//     );
//     const randomPackage =
//       pkgsForProduct[Math.floor(Math.random() * pkgsForProduct.length)];

//     // Cria Payment
//     const payment = await prisma.payment.create({
//       data: {
//         name: 'pix',
//         status: 'PAYMENT_APPROVED',
//         statusUpdatedAt: new Date(),
//         qrCode: `qrcode${i}`,
//         qrCodetextCopyPaste: `qrcode-copypaste${i}`,
//       },
//     });

//     // Cria OrderItem, Recharge, PackageInfo
//     const recharge = await prisma.recharge.create({
//       data: {
//         userIdForRecharge: user.id,
//         status: 'RECHARGE_APPROVED',
//         amountCredits: randomPackage.amountCredits,
//         statusUpdatedAt: new Date(),
//       },
//     });

//     const packageInfo = await prisma.packageInfo.create({
//       data: {
//         packageId: randomPackage.id,
//         name: randomPackage.name,
//         userIdForRecharge: user.id,
//         imgCardUrl: randomPackage.imgCardUrl,
//       },
//     });

//     const orderItem = await prisma.orderItem.create({
//       data: {
//         productId: randomProduct.id,
//         productName: randomProduct.name,
//         rechargeId: recharge.id,
//         packageId: packageInfo.id,
//       },
//     });

//     // Cria Order
//     await prisma.order.create({
//       data: {
//         orderNumber: `ORDER-${i + 1}`,
//         price: randomPackage.basePrice,
//         orderStatus: 'COMPLETED',
//         paymentId: payment.id,
//         orderItemId: orderItem.id,
//         storeId: store.id,
//       },
//     });
//   }

//   console.log('Seed finalizado!');
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
