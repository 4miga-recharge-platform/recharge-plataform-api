import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { validateRequiredFields } from 'src/utils/validation.util';
import { StorageService } from '../storage/storage.service';
import { WebhookService } from '../webhook/webhook.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';

interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class PackageService {
  private readonly logger = new Logger(PackageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly webhookService: WebhookService,
  ) {}

  private packageSelect = {
    id: true,
    name: true,
    amountCredits: true,
    imgCardUrl: true,
    isActive: true,
    isOffer: true,
    basePrice: true,
    productId: true,
    storeId: true,
    paymentMethods: true,
    createdAt: false,
    updatedAt: false,
  };

  // master admin only access
  async findAll(storeId: string): Promise<any[]> {
    try {
      const packages = await this.prisma.package.findMany({
        where: { storeId },
        select: this.packageSelect,
        orderBy: { amountCredits: 'asc' },
      });

      // Convert Decimal to number for consistency
      return packages.map(pkg => ({
        ...pkg,
        basePrice: pkg.basePrice.toNumber(),
        paymentMethods: pkg.paymentMethods?.map(pm => ({
          ...pm,
          price: pm.price.toNumber()
        }))
      }));
    } catch {
      throw new BadRequestException('Failed to fetch packages');
    }
  }

  async findOne(id: string): Promise<any> {
    try {
      const data = await this.prisma.package.findUnique({
        where: { id },
        select: this.packageSelect,
      });
      if (!data) {
        throw new BadRequestException('Package not found');
      }

      // Convert Decimal to number for consistency
      return {
        ...data,
        basePrice: data.basePrice.toNumber(),
        paymentMethods: data.paymentMethods?.map(pm => ({
          ...pm,
          price: pm.price.toNumber()
        }))
      };
    } catch {
      throw new BadRequestException('Failed to fetch package');
    }
  }

  async create(dto: CreatePackageDto, storeId: string): Promise<any> {
    try {
      validateRequiredFields(dto, [
        'name',
        'amountCredits',
        'imgCardUrl',
        'basePrice',
        'productId',
      ]);

      // Separate paymentMethods from the rest of the data
      const { paymentMethods, ...packageData } = dto;

      // Create package with payment methods if provided
      const createData: any = {
        ...packageData,
        storeId,
        ...(paymentMethods &&
          paymentMethods.length > 0 && {
            paymentMethods: {
              create: paymentMethods.map((pm) => ({
                name: pm.name,
                price: pm.price,
              })),
            },
          }),
      };

      const package_ = await this.prisma.package.create({
        data: createData,
        select: this.packageSelect,
      });

      // Convert Decimal to number for consistency
      const convertedPackage = {
        ...package_,
        basePrice: package_.basePrice.toNumber(),
        paymentMethods: package_.paymentMethods?.map(pm => ({
          ...pm,
          price: pm.price.toNumber()
        }))
      };

      // Notify frontend via webhook
      await this.webhookService.notifyPackageUpdate(
        package_.id,
        package_.storeId,
        'created',
      );

      return convertedPackage;
    } catch {
      throw new BadRequestException('Failed to create package');
    }
  }

  async update(id: string, dto: UpdatePackageDto): Promise<any> {
    try {
      await this.findOne(id);
      const fieldsToValidate = Object.keys(dto).filter(
        (key) => dto[key] !== undefined,
      );
      validateRequiredFields(dto, fieldsToValidate);

      if (dto.productId) {
        const product = await this.prisma.product.findUnique({
          where: { id: dto.productId },
        });
        if (!product) {
          throw new BadRequestException('Product not found');
        }
      }

      // Separate paymentMethods from the rest of the data
      const { paymentMethods, ...packageData } = dto;

      // Prepare data for update
      let updateData: any = {
        ...packageData,
      };

      // Handle paymentMethods update
      if (paymentMethods && paymentMethods.length > 0) {
        updateData.paymentMethods = {
          deleteMany: {},
          create: paymentMethods.map((pm) => ({
            name: pm.name,
            price: pm.price,
          })),
        };
      }

      const package_ = await this.prisma.package.update({
        where: { id },
        data: updateData,
        select: this.packageSelect,
      });

      // Convert Decimal to number for consistency
      const convertedPackage = {
        ...package_,
        basePrice: package_.basePrice.toNumber(),
        paymentMethods: package_.paymentMethods?.map(pm => ({
          ...pm,
          price: pm.price.toNumber()
        }))
      };

      // Notify frontend via webhook
      await this.webhookService.notifyPackageUpdate(
        package_.id,
        package_.storeId,
        'updated',
      );

      return convertedPackage;
    } catch {
      throw new BadRequestException('Failed to update package');
    }
  }

  async remove(id: string): Promise<any> {
    try {
      this.logger.log(`[remove] Starting removal for packageId=${id}`);

      // Get current package with minimal fields needed for decisions
      const pkg = await this.prisma.package.findUnique({
        where: { id },
        select: { id: true, imgCardUrl: true, storeId: true, productId: true },
      });

      if (!pkg) {
        this.logger.warn(`[remove] Package not found for id=${id}`);
        throw new BadRequestException('Package not found');
      }

      this.logger.log(
        `[remove] Found package: storeId=${pkg.storeId}, productId=${pkg.productId}, imgCardUrl=${pkg.imgCardUrl}`,
      );

      // Fetch product default and store customization to protect default images
      const [product, storeProductSettings] = await Promise.all([
        this.prisma.product.findUnique({
          where: { id: pkg.productId },
          select: { id: true, imgCardUrl: true },
        }),
        this.prisma.storeProductSettings.findUnique({
          where: { storeId_productId: { storeId: pkg.storeId, productId: pkg.productId } },
          select: { id: true, imgCardUrl: true },
        }),
      ]);

      const defaultProductImg = product?.imgCardUrl || null;
      const storeCustomizationImg = storeProductSettings?.imgCardUrl || null;
      this.logger.log(
        `[remove] Defaults: product.imgCardUrl=${defaultProductImg} | storeSettings.imgCardUrl=${storeCustomizationImg}`,
      );

      const stripQuery = (u?: string | null) => (u ? new URL(u).origin + new URL(u).pathname : u);
      const pkgUrlNoQuery = stripQuery(pkg.imgCardUrl);
      const defaultProductNoQuery = stripQuery(defaultProductImg);
      const storeCustomizationNoQuery = stripQuery(storeCustomizationImg);

      const isDefaultProductImage = !!(pkgUrlNoQuery && defaultProductNoQuery && pkgUrlNoQuery === defaultProductNoQuery);
      const isStoreCustomizationDefault = !!(pkgUrlNoQuery && storeCustomizationNoQuery && pkgUrlNoQuery === storeCustomizationNoQuery);

      this.logger.log(
        `[remove] Image classification: isDefaultProductImage=${isDefaultProductImage}, isStoreCustomizationDefault=${isStoreCustomizationDefault}`,
      );

      // Count other packages referencing the same URL within the store (and same product for safety)
      let otherRefsCount = 0;
      if (pkg.imgCardUrl) {
        otherRefsCount = await this.prisma.package.count({
          where: {
            id: { not: pkg.id },
            storeId: pkg.storeId,
            productId: pkg.productId,
            // count by exact URL as stored (with query). Optionally, we could normalize here as well if needed
            imgCardUrl: pkg.imgCardUrl,
          },
        });
      }
      this.logger.log(`[remove] Other references to this image: count=${otherRefsCount}`);

      // Validate path belongs to allowed customization prefixes
      const allowedByPath = (() => {
        if (!pkg.imgCardUrl) return false;
        try {
          const url = new URL(pkg.imgCardUrl);
          const path = url.pathname; // /bucket/path
          // We only consider deleting files living under store/<storeId>/product/<productId>/(package|shared)/...
          // Accept both /<bucket>/store/... and /store/... depending on URL shape; StorageService uses https://storage.googleapis.com/<bucket>/<filePath>
          const includesStore = path.includes(`/store/${pkg.storeId}/product/${pkg.productId}/`);
          const isPackageScoped = path.includes(`/package/${pkg.id}/`);
          const isSharedScoped = path.includes(`/shared/`);
          return includesStore && (isPackageScoped || isSharedScoped);
        } catch (e) {
          this.logger.warn(`[remove] Could not parse image URL to validate path: ${e instanceof Error ? e.message : e}`);
          return false;
        }
      })();

      this.logger.log(`[remove] Path check: allowedByPath=${allowedByPath}`);

      const canAttemptDelete = !!(
        pkg.imgCardUrl &&
        !isDefaultProductImage &&
        !isStoreCustomizationDefault &&
        otherRefsCount === 0 &&
        allowedByPath
      );

      this.logger.log(`[remove] Decision before DB delete: canAttemptDelete=${canAttemptDelete}`);

      // Proceed to delete the package from DB
      const deletedPackage = await this.prisma.package.delete({
        where: { id },
        select: this.packageSelect,
      });

      this.logger.log(`[remove] Package deleted from DB: id=${deletedPackage.id}`);

      // If eligible, try to delete the file (best-effort)
      if (canAttemptDelete) {
        try {
          this.logger.log(`[remove] Attempting to delete orphan image: url=${pkg.imgCardUrl}`);
          await this.storageService.deleteFile(pkg.imgCardUrl as string);
          this.logger.log(`[remove] Image deleted: url=${pkg.imgCardUrl}`);
        } catch (err: any) {
          this.logger.warn(
            `[remove] Failed to delete image (continuing): url=${pkg.imgCardUrl}, error=${err?.message || err}`,
          );
        }
      } else {
        this.logger.log(
          `[remove] Skipping image deletion. Reasons -> isDefaultProductImage=${isDefaultProductImage}, isStoreCustomizationDefault=${isStoreCustomizationDefault}, otherRefsCount=${otherRefsCount}, allowedByPath=${allowedByPath}`,
        );
      }

      // Convert Decimal to number for consistency
      const convertedPackage = {
        ...deletedPackage,
        basePrice: deletedPackage.basePrice.toNumber(),
        paymentMethods: deletedPackage.paymentMethods?.map(pm => ({
          ...pm,
          price: pm.price.toNumber()
        }))
      };

      // Notify frontend via webhook
      await this.webhookService.notifyPackageUpdate(
        id,
        deletedPackage.storeId,
        'deleted',
      );

      return convertedPackage;
    } catch {
      throw new BadRequestException('Failed to remove package');
    }
  }

  async uploadCardImage(
    packageId: string,
    file: FileUpload,
    storeId: string,
    updateAllPackages: boolean = false,
  ) {
    this.logger.log(
      `Uploading card image for package ${packageId}, storeId: ${storeId}, updateAllPackages: ${updateAllPackages}`,
    );

    try {
      const packageExists = await this.prisma.package.findUnique({
        where: { id: packageId },
        select: { id: true, imgCardUrl: true, storeId: true, productId: true },
      });

      this.logger.log(`Package exists: ${!!packageExists}`);

      if (!packageExists) {
        throw new NotFoundException('Package not found');
      }

      if (packageExists.storeId !== storeId) {
        throw new BadRequestException('Package does not belong to your store');
      }

      const productId = packageExists.productId;

      // Decide deterministic filename: card.<ext>
      const allowedExts = ['png', 'jpg', 'jpeg', 'webp'];
      const originalExt = (
        file.originalname.split('.').pop() || ''
      ).toLowerCase();
      const mimeToExt: Record<string, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
      };
      const mimeExt = mimeToExt[file.mimetype] || '';
      let ext = originalExt || mimeExt || 'png';
      if (!allowedExts.includes(ext)) {
        ext = mimeExt && allowedExts.includes(mimeExt) ? mimeExt : 'png';
      }

      const desiredFileName = `card.${ext}`;

      if (updateAllPackages) {
        return await this.updateAllPackagesCardImage(
          productId,
          file,
          storeId,
          desiredFileName,
        );
      } else {
        return await this.updateSinglePackageCardImage(
          packageId,
          file,
          storeId,
          productId,
          desiredFileName,
        );
      }
    } catch (error) {
      this.logger.error(`Error uploading card image: ${error.message}`);
      throw error;
    }
  }

  private async updateSinglePackageCardImage(
    packageId: string,
    file: FileUpload,
    storeId: string,
    productId: string,
    desiredFileName: string,
  ) {
    const packageExists = await this.prisma.package.findUnique({
      where: { id: packageId },
      select: { id: true, imgCardUrl: true, storeId: true, productId: true },
    });

    const folderPath = `store/${storeId}/product/${productId}/package/${packageId}`;
    this.logger.log(`Uploading to folder: ${folderPath}`);

    // Delete previous image if exists
    if (packageExists?.imgCardUrl) {
      try {
        // Skip deletion if previous is product default or store customization default (compare ignoring query string)
        const [product, storeProductSettings] = await Promise.all([
          this.prisma.product.findUnique({ where: { id: productId }, select: { imgCardUrl: true } }),
          this.prisma.storeProductSettings.findUnique({ where: { storeId_productId: { storeId, productId } }, select: { imgCardUrl: true } }),
        ]);
        const prevUrl = packageExists.imgCardUrl;
        const stripQuery = (u?: string | null) => (u ? new URL(u).origin + new URL(u).pathname : u);
        const prevNoQuery = stripQuery(prevUrl);
        const productDefaultNoQuery = stripQuery(product?.imgCardUrl || null);
        const storeCustomizationNoQuery = stripQuery(storeProductSettings?.imgCardUrl || null);
        const isProductDefault = !!(productDefaultNoQuery && productDefaultNoQuery === prevNoQuery);
        const isStoreCustomizationDefault = !!(storeCustomizationNoQuery && storeCustomizationNoQuery === prevNoQuery);
        this.logger.log(`Skipping default check before delete: isProductDefault=${isProductDefault}, isStoreCustomizationDefault=${isStoreCustomizationDefault}`);
        if (!isProductDefault && !isStoreCustomizationDefault) {
          await this.storageService.deleteFile(prevUrl);
          this.logger.log('Previous card image deleted');
        } else {
          this.logger.log('Previous image matches a default; skipping deletion');
        }
      } catch (err) {
        this.logger.warn(`Could not delete previous image: ${err.message}`);
      }
    }

    const fileUrl = await this.storageService.uploadFile(
      file,
      folderPath,
      desiredFileName,
    );
    this.logger.log(`File uploaded successfully: ${fileUrl}`);

    const updatedPackage = await this.prisma.package.update({
      where: { id: packageId },
      data: { imgCardUrl: fileUrl },
      select: this.packageSelect,
    });

    // Convert Decimal to number for consistency
    const convertedPackage = {
      ...updatedPackage,
      basePrice: updatedPackage.basePrice.toNumber(),
      paymentMethods: updatedPackage.paymentMethods?.map(pm => ({
        ...pm,
        price: pm.price.toNumber()
      }))
    };

    this.logger.log(`Package updated successfully`);

    return {
      success: true,
      package: convertedPackage,
      fileUrl,
      message: 'Package card image uploaded successfully',
    };
  }

  private async updateAllPackagesCardImage(
    productId: string,
    file: FileUpload,
    storeId: string,
    desiredFileName: string,
  ) {
    this.logger.log(`Updating all packages for product ${productId}`);

    // Get all packages for this product
    const packages = await this.prisma.package.findMany({
      where: {
        productId: productId,
        storeId: storeId,
      },
      select: { id: true, imgCardUrl: true },
      orderBy: { amountCredits: 'asc' },
    });

    if (packages.length === 0) {
      throw new BadRequestException('No packages found for this product');
    }

    this.logger.log(`Found ${packages.length} packages to update`);

    // Upload the file once to a shared location
    const sharedFolderPath = `store/${storeId}/product/${productId}/shared`;
    const fileUrl = await this.storageService.uploadFile(
      file,
      sharedFolderPath,
      desiredFileName,
    );
    this.logger.log(
      `File uploaded successfully to shared location: ${fileUrl}`,
    );

    // Resolve defaults to avoid deleting them
    const [product, storeProductSettings] = await Promise.all([
      this.prisma.product.findUnique({ where: { id: productId }, select: { imgCardUrl: true } }),
      this.prisma.storeProductSettings.findUnique({ where: { storeId_productId: { storeId, productId } }, select: { imgCardUrl: true } }),
    ]);
    const productDefaultUrl = product?.imgCardUrl || null;
    const storeCustomizationDefaultUrl = storeProductSettings?.imgCardUrl || null;

    // Delete previous images and update all packages
    const updatePromises = packages.map(async (pkg) => {
      // Delete previous image if exists
      if (pkg.imgCardUrl) {
        try {
          const prevUrl = pkg.imgCardUrl;
          const stripQuery = (u?: string | null) => (u ? new URL(u).origin + new URL(u).pathname : u);
          const prevNoQuery = stripQuery(prevUrl);
          const productDefaultNoQuery = stripQuery(productDefaultUrl);
          const storeCustomizationNoQuery = stripQuery(storeCustomizationDefaultUrl);
          const isProductDefault = !!(productDefaultNoQuery && productDefaultNoQuery === prevNoQuery);
          const isStoreCustomizationDefault = !!(storeCustomizationNoQuery && storeCustomizationNoQuery === prevNoQuery);
          this.logger.log(`Skipping default check before delete (pkg ${pkg.id}): isProductDefault=${isProductDefault}, isStoreCustomizationDefault=${isStoreCustomizationDefault}`);
          if (!isProductDefault && !isStoreCustomizationDefault) {
            await this.storageService.deleteFile(prevUrl);
            this.logger.log(`Previous card image deleted for package ${pkg.id}`);
          } else {
            this.logger.log(`Package ${pkg.id} previous image is default; skipping deletion`);
          }
        } catch (err) {
          this.logger.warn(
            `Could not delete previous image for package ${pkg.id}: ${err.message}`,
          );
        }
      }

      // Update package with new image URL
      const updatedPackage = await this.prisma.package.update({
        where: { id: pkg.id },
        data: { imgCardUrl: fileUrl },
        select: this.packageSelect,
      });

      // Convert Decimal to number for consistency
      return {
        ...updatedPackage,
        basePrice: updatedPackage.basePrice.toNumber(),
        paymentMethods: updatedPackage.paymentMethods?.map(pm => ({
          ...pm,
          price: pm.price.toNumber()
        }))
      };
    });

    const updatedPackages = await Promise.all(updatePromises);

    this.logger.log(
      `All ${updatedPackages.length} packages updated successfully`,
    );

    return {
      success: true,
      packages: updatedPackages,
      fileUrl,
      message: `All ${updatedPackages.length} packages card images updated successfully`,
    };
  }

  async cleanupPackageImages(productId: string | undefined, storeId: string) {
    if (productId) {
      this.logger.log(`[cleanupPackageImages] storeId=${storeId} productId=${productId}`);
      return this.cleanupPackageImagesForProduct(productId, storeId);
    }

    this.logger.log(`[cleanupPackageImages] storeId=${storeId} (all products)`);
    // Get distinct productIds for this store from packages
    const productIds = await this.prisma.package.findMany({
      where: { storeId },
      select: { productId: true },
      distinct: ['productId'],
    });

    const results: Record<string, { deleted: string[]; skipped: { url: string; reason: string }[]; errors: { url: string; message: string }[] }> = {};
    for (const row of productIds) {
      const pid = row.productId;
      try {
        results[pid] = await this.cleanupPackageImagesForProduct(pid, storeId);
      } catch (e: any) {
        results[pid] = { deleted: [], skipped: [], errors: [{ url: '', message: e?.message || String(e) }] };
      }
    }

    return { perProduct: results };
  }

  private async cleanupPackageImagesForProduct(productId: string, storeId: string) {

    // Load defaults for safety checks
    const [product, storeProductSettings, packages] = await Promise.all([
      this.prisma.product.findUnique({ where: { id: productId }, select: { imgCardUrl: true } }),
      this.prisma.storeProductSettings.findUnique({ where: { storeId_productId: { storeId, productId } }, select: { imgCardUrl: true } }),
      this.prisma.package.findMany({ where: { storeId, productId }, select: { id: true, imgCardUrl: true } }),
    ]);

    const stripQuery = (u?: string | null) => (u ? new URL(u).origin + new URL(u).pathname : u);
    const defaultProductNoQuery = stripQuery(product?.imgCardUrl || null);
    const storeCustomizationNoQuery = stripQuery(storeProductSettings?.imgCardUrl || null);

    // Build a set of referenced URLs (normalized without query)
    const referenced = new Set<string>();
    for (const p of packages) {
      if (p.imgCardUrl) {
        const norm = stripQuery(p.imgCardUrl);
        if (norm) referenced.add(norm);
      }
    }

    // List files under package/
    const packagePrefix = `store/${storeId}/product/${productId}/package/`;
    const filesToCheck: string[] = await this.storageService.listFiles(packagePrefix);

    const bucketBaseUrl = this.storageService.getBucketUrl();
    const skipped: Array<{ url: string; reason: string }> = [];
    const deleted: string[] = [];
    const errors: Array<{ url: string; message: string }> = [];

    for (const filePath of filesToCheck) {
      // Compose public URL and normalize
      const publicUrl = `${bucketBaseUrl}/${filePath}`;
      const noQuery = stripQuery(publicUrl);
      if (!noQuery) continue;

      // Never delete defaults
      if (defaultProductNoQuery && noQuery === defaultProductNoQuery) {
        skipped.push({ url: publicUrl, reason: 'product_default' });
        continue;
      }
      if (storeCustomizationNoQuery && noQuery === storeCustomizationNoQuery) {
        skipped.push({ url: publicUrl, reason: 'store_customization_default' });
        continue;
      }

      // If referenced by any package, skip
      if (referenced.has(noQuery)) {
        skipped.push({ url: publicUrl, reason: 'referenced_by_package' });
        continue;
      }

      // Passed checks → delete
      try {
        await this.storageService.deleteFile(publicUrl);
        deleted.push(publicUrl);
      } catch (e: any) {
        errors.push({ url: publicUrl, message: e?.message || String(e) });
      }
    }
    return { deleted, skipped, errors };
  }
}
