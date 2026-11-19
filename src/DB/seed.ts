import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from './connection';
import { UserModel, UserRole, Gender, BusinessStatus } from './models/User.model';
import { CategoryModel } from './models/Category.model';
import { SubCategoryModel } from './models/SubCategory.model';
import { OfferModel } from './models/Offer.model';
import { WalletModel } from './models/Wallet.model';
import { BannerModel } from './models/Banner.model';
import { AppSettingsModel } from './models/AppSettings.model';

const seedCategories = [
  {
    name: 'Food & Beverages',
    subCategories: ['Fast Food', 'Restaurants', 'Cafes', '100% Organic'],
  },
  {
    name: 'Fashion & Style',
    subCategories: ['Men Clothing', 'Women Clothing', 'Footwear', 'Accessories'],
  },
  {
    name: 'Electronics & Tech',
    subCategories: ['Mobile Phones', 'Laptops & Tablets', 'Monitors & Displays'],
  },
  {
    name: 'Home Appliances',
    subCategories: ['Kitchen Appliances', 'Washing Machines', 'Refrigerators'],
  },
  {
    name: 'Furniture & Decor',
    subCategories: ['Living Room', 'Bedrooms', 'Lighting'],
  },
  {
    name: 'Beauty & Cosmetics',
    subCategories: ['Makeup', 'Skincare', 'Haircare'],
  },
  {
    name: 'Education & Courses',
    subCategories: ['Languages', 'Programming', 'Tutoring'],
  },
  {
    name: 'Home Services',
    subCategories: ['Maintenance', 'Plumbing & Electrical', 'Cleaning'],
  },
  {
    name: 'Transportation',
    subCategories: ['Taxi & Rides', 'Car Rental', 'Delivery'],
  },
  {
    name: 'Handmade & Crafts',
    subCategories: ['Artisanal Gifts', 'Home Crafts', 'Custom Jewelry'],
  },
  {
    name: 'Real Estate',
    subCategories: ['Commercial Spaces', 'Apartments', 'Offices'],
  },
  {
    name: 'Jobs & Services',
    subCategories: ['Corporate Services', 'Recruitment', 'Consulting'],
  },
];

const runSeeder = async (): Promise<void> => {
  try {
    await connectDB();
    console.log('Starting Moujood Database Seeder...');

    const defaultPassword = await bcrypt.hash('Password123!', 12);

    // 1. Seed Super Admin (Moni Roy from Figma Admin Dashboard)
    const admin = await UserModel.findOneAndUpdate(
      { email: 'admin@moujood.net' },
      {
        name: 'Moni Roy',
        email: 'admin@moujood.net',
        password: defaultPassword,
        role: UserRole.SUPER_ADMIN,
        city: 'Cairo',
        isEmailVerified: true,
        acceptedTerms: true,
      },
      { upsert: true, new: true }
    );
    await WalletModel.findOneAndUpdate(
      { userId: admin._id },
      { userId: admin._id, balance: 0, currency: 'EGP' },
      { upsert: true }
    );
    console.log(`✓ Super Admin seeded: ${admin.email}`);

    // 2. Seed Categories & Sub-Categories
    let fashionCategoryId: mongoose.Types.ObjectId | null = null;
    let tshirtSubCategoryId: mongoose.Types.ObjectId | null = null;

    for (const item of seedCategories) {
      const category = await CategoryModel.findOneAndUpdate(
        { name: item.name },
        {
          name: item.name,
          icon: {
            secure_url: 'https://placehold.co/200x200/008a3e/ffffff?text=Icon',
            public_id: `seed_${item.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          },
          isActive: true,
        },
        { upsert: true, new: true }
      );

      if (item.name === 'Fashion & Style') {
        fashionCategoryId = category._id as mongoose.Types.ObjectId;
      }

      for (const subName of item.subCategories) {
        const subCat = await SubCategoryModel.findOneAndUpdate(
          { name: subName, categoryId: category._id },
          {
            name: subName,
            categoryId: category._id,
            isActive: true,
          },
          { upsert: true, new: true }
        );

        if (subName === 'Women Clothing') {
          tshirtSubCategoryId = subCat._id as mongoose.Types.ObjectId;
        }
      }
    }
    console.log('✓ Categories and Sub-Categories seeded.');

    // 3. Seed Sample Customer (Laiba Ahmar from Figma Profile Screen)
    const customer = await UserModel.findOneAndUpdate(
      { email: 'laiba@domain.com' },
      {
        name: 'Laiba Ahmar',
        email: 'laiba@domain.com',
        password: defaultPassword,
        phone: '+01 234 567 89',
        role: UserRole.CUSTOMER,
        gender: Gender.FEMALE,
        city: 'Cairo',
        address: '45 New Avenue, Cairo',
        language: 'English (US)',
        topics: ['Food', 'Technology', 'Fashion & Style', 'Fitness'],
        points: 100,
        scansCount: 200,
        isEmailVerified: true,
        acceptedTerms: true,
      },
      { upsert: true, new: true }
    );
    await WalletModel.findOneAndUpdate(
      { userId: customer._id },
      { userId: customer._id, balance: 50, currency: 'EGP' },
      { upsert: true }
    );
    console.log(`✓ Sample Customer seeded: ${customer.email}`);

    // 4. Seed Sample Approved Business
    const business = await UserModel.findOneAndUpdate(
      { email: 'brand@moujood.net' },
      {
        name: 'Snaply Fashion Brand',
        email: 'brand@moujood.net',
        password: defaultPassword,
        phone: '+201001234567',
        role: UserRole.BUSINESS,
        businessCategory: fashionCategoryId!,
        businessSubCategory: tshirtSubCategoryId || undefined,
        businessLogo: {
          secure_url: 'https://placehold.co/300x300/008a3e/ffffff?text=Brand+Logo',
          public_id: 'seed_brand_logo',
        },
        businessCover: {
          secure_url: 'https://placehold.co/1200x500/008a3e/ffffff?text=Brand+Cover',
          public_id: 'seed_brand_cover',
        },
        businessDescription:
          'Modern 100% cotton apparel designed for comfort and everyday style.',
        businessAddresses: ['45 New Avenue, Cairo', 'Mall of Egypt, Giza'],
        businessLocations: [
          { label: 'Cairo Branch', coordinates: [31.2357, 30.0444] },
        ],
        businessStatus: BusinessStatus.APPROVED,
        isEmailVerified: true,
        acceptedTerms: true,
      },
      { upsert: true, new: true }
    );
    await WalletModel.findOneAndUpdate(
      { userId: business._id },
      { userId: business._id, balance: 1200, currency: 'EGP' },
      { upsert: true }
    );
    console.log(`✓ Sample Business seeded: ${business.email}`);

    // 5. Seed Sample Offers from Figma Screens
    let firstOfferId: mongoose.Types.ObjectId | null = null;
    if (fashionCategoryId) {
      const offer1 = await OfferModel.findOneAndUpdate(
        { title: 'Amazing T-Shirt', businessId: business._id },
        {
          title: 'Amazing T-Shirt',
          description:
            'The perfect T-shirt for when you want to feel comfortable but still stylish. Amazing for all occasions. Made of 100% cotton fabric in four colours.',
          image: {
            secure_url: 'https://placehold.co/600x400/008a3e/ffffff?text=Amazing+T-Shirt',
            public_id: 'seed_offer_tshirt',
          },
          mediaType: 'IMAGE',
          priceBefore: 280.0,
          priceAfter: 195.0,
          currency: 'EGP',
          businessId: business._id,
          categoryId: fashionCategoryId,
          subCategoryId: tshirtSubCategoryId || undefined,
          tags: ['Fashion', 'T-Shirt', 'Casual'],
          pointsReward: 15,
          viewsCount: 4000,
          claimsCount: 223,
          commentsCount: 14,
          address: '45 New Avenue, Cairo',
          location: 'Cairo',
          isHidden: false,
        },
        { upsert: true, new: true }
      );
      firstOfferId = offer1._id as mongoose.Types.ObjectId;

      await OfferModel.findOneAndUpdate(
        { title: 'Fabulous Pants', businessId: business._id },
        {
          title: 'Fabulous Pants',
          description:
            'Lightweight modern fit pants crafted from breathable fabric for everyday wear.',
          image: {
            secure_url: 'https://placehold.co/600x400/008a3e/ffffff?text=Fabulous+Pants',
            public_id: 'seed_offer_pants',
          },
          mediaType: 'IMAGE',
          priceBefore: 350.0,
          priceAfter: 245.0,
          currency: 'EGP',
          businessId: business._id,
          categoryId: fashionCategoryId,
          subCategoryId: tshirtSubCategoryId || undefined,
          tags: ['Fashion', 'Pants', 'Jeans'],
          pointsReward: 20,
          viewsCount: 1850,
          claimsCount: 112,
          commentsCount: 8,
          address: '45 New Avenue, Cairo',
          location: 'Cairo',
          isHidden: false,
        },
        { upsert: true, new: true }
      );
      console.log('✓ Sample Offers seeded.');
    }

    // 6. Seed Hero Banners for Carousel
    await BannerModel.findOneAndUpdate(
      { title: 'Weekend Mega Savings' },
      {
        title: 'Weekend Mega Savings',
        image: {
          secure_url: 'https://placehold.co/1200x500/008a3e/ffffff?text=Weekend+Mega+Savings',
          public_id: 'seed_banner_weekend',
        },
        linkOfferId: firstOfferId || undefined,
        linkBusinessId: business._id,
        placement: 'BOTH',
        sortOrder: 1,
        isActive: true,
      },
      { upsert: true }
    );
    console.log('✓ Hero Banners seeded.');

    // 7. Seed Legal Documents
    await AppSettingsModel.findOneAndUpdate(
      { key: 'PRIVACY_POLICY' },
      {
        key: 'PRIVACY_POLICY',
        contentEn: 'Privacy Policy: Moujood values your privacy and secures all your personal data.',
        contentAr: 'سياسة الخصوصية: تطبيق موجود يحترم خصوصيتك ويحمي بياناتك الشخصية.',
      },
      { upsert: true }
    );
    await AppSettingsModel.findOneAndUpdate(
      { key: 'TERMS_AND_CONDITIONS' },
      {
        key: 'TERMS_AND_CONDITIONS',
        contentEn: 'Terms and Conditions: By using Moujood, you agree to our platform terms.',
        contentAr: 'الشروط والأحكام: باستخدامك لتطبيق موجود، أنت توافق على شروط المنصة.',
      },
      { upsert: true }
    );
    console.log('✓ Legal Settings seeded.');

    console.log('\n🎉 Seeding completed! Default credentials (Password: Password123!):');
    console.log(' - Super Admin: admin@moujood.net');
    console.log(' - Business:    brand@moujood.net');
    console.log(' - Customer:    laiba@domain.com\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
  }
};

runSeeder();
