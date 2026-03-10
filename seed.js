const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

// Models
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');

// Sample categories
const categories = [
  {
    name: 'Past Papers',
    description: 'AKUEB past papers for various subjects and classes',
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80',
    order: 1
  },
  {
    name: 'SLOs',
    description: 'Student Learning Outcomes for AKUEB syllabus',
    image: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80',
    order: 2
  },
  {
    name: 'Notes',
    description: 'Comprehensive notes for AKUEB curriculum',
    image: 'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?w=800&q=80',
    order: 3
  },
  {
    name: 'Bundles',
    description: 'Specially curated bundles of past papers, notes, and SLOs',
    image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&q=80',
    order: 4
  }
];

// Sample products
const products = [
  {
    title: 'Single Subject Past Paper',
    description: 'Detailed past papers for a single subject, including solved solutions and marking schemes for AKUEB.',
    price: 499,
    stock: 500,
    category: 'Past Papers',
    brand: 'Smart Prep Station',
    images: [{ url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80' }],
    isFeatured: true,
    variants: [
      { name: 'Subject', options: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Urdu', 'Islamiat', 'Pakistan Studies'] },
      { name: 'Class', options: ['9', '10', '11', '12'] }
    ]
  },
  {
    title: 'Student Learning Outcomes (SLOs)',
    description: 'Complete SLO-based resource guide for AKUEB students to excel in their exams.',
    price: 299,
    stock: 300,
    category: 'SLOs',
    brand: 'Smart Prep Station',
    images: [{ url: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80' }],
    isFeatured: true,
    variants: [
      { name: 'Subject', options: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Urdu', 'Islamiat', 'Pakistan Studies'] },
      { name: 'Class', options: ['9', '10', '11', '12'] }
    ]
  },
  {
    title: 'Comprehensive Notes',
    description: 'High-quality, easy-to-understand notes covering the entire AKUEB syllabus for each subject.',
    price: 799,
    stock: 200,
    category: 'Notes',
    brand: 'Smart Prep Station',
    images: [{ url: 'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?w=800&q=80' }],
    isFeatured: true,
    variants: [
      { name: 'Subject', options: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Urdu', 'Islamiat', 'Pakistan Studies'] }
    ]
  },
  {
    title: 'All Subjects Past Paper Bundle',
    description: 'A complete bundle of past papers for all compulsory and elective subjects for a specific class.',
    price: 2499,
    originalPrice: 2999,
    stock: 100,
    category: 'Bundles',
    brand: 'Smart Prep Station',
    images: [{ url: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800&q=80' }],
    isFeatured: true,
    variants: [
      { name: 'Class', options: ['9', '10', '11', '12'] }
    ]
  },
  {
    title: 'Past Papers + Notes Bundle',
    description: 'The ultimate study pack containing both past papers and comprehensive notes for all subjects.',
    price: 4999,
    originalPrice: 5999,
    stock: 80,
    category: 'Bundles',
    brand: 'Smart Prep Station',
    images: [{ url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80' }],
    isFeatured: true,
    variants: [
      { name: 'Class', options: ['9', '10', '11', '12'] }
    ]
  },
  {
    title: 'Full Study Pack (Past Papers + Notes + SLOs)',
    description: 'Everything you need to top your AKUEB exams: Past papers, detailed notes, and SLO guides for all subjects.',
    price: 6999,
    originalPrice: 8499,
    stock: 50,
    category: 'Bundles',
    brand: 'Smart Prep Station',
    images: [{ url: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&q=80' }],
    isFeatured: true,
    variants: [
      { name: 'Class', options: ['9', '10', '11', '12'] }
    ]
  }
];

async function seed() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const admin = await User.create({
      name: 'Simroz Asrany',
      email: 'simroz.asrany6@gmail.com',
      password: 'sohail',
      role: 'admin',
      isActive: true
    });
    console.log('Created admin user: simroz.asrany6@gmail.com / sohail');

    // Create seller user (separate account)
    const seller = await User.create({
      name: 'Test Seller',
      email: 'seller@example.com',
      password: 'seller123',
      role: 'seller',
      isActive: true
    });
    console.log('Created seller user: seller@example.com / seller123');

    // Create categories one by one to trigger pre-save hook
    const createdCategories = [];
    for (const cat of categories) {
      const created = await Category.create(cat);
      createdCategories.push(created);
    }
    console.log(`Created ${createdCategories.length} categories`);

    // Create products
    const categoryMap = {};
    createdCategories.forEach(cat => {
      categoryMap[cat.name] = cat._id;
    });

    const productsWithSeller = products.map(product => ({
      ...product,
      category: categoryMap[product.category],
      seller: seller._id
    }));

    await Product.insertMany(productsWithSeller);
    console.log(`Created ${productsWithSeller.length} products`);

    console.log('\n✅ Seed completed successfully!');
    console.log('Admin login: simroz.asrany6@gmail.com / sohail');
    console.log('Seller login: seller@example.com / seller123');
    
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
