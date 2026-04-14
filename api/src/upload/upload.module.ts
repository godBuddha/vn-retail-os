import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ServeStaticModule } from '@nestjs/serve-static';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { UploadController } from './upload.controller';

const uploadDir = join(process.cwd(), 'uploads');
const qrDir = join(uploadDir, 'qr');
const productsDir = join(uploadDir, 'products');

[uploadDir, qrDir, productsDir].forEach(dir => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          const type = req.query.type as string;
          const dest = type === 'product' ? productsDir : qrDir;
          cb(null, dest);
        },
        filename: (req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
        if (allowed.includes(extname(file.originalname).toLowerCase())) {
          cb(null, true);
        } else {
          cb(new Error('Chỉ chấp nhận file PNG, JPG, WEBP'), false);
        }
      },
      limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
    }),
  ],
  controllers: [UploadController],
  exports: [MulterModule],
})
export class UploadModule {}
