const mongoose = require('mongoose');

const shopProfileSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      required: true,
      default: 'Smart Khata Kiryana Store',
      trim: true,
    },
    ownerName: {
      type: String,
      required: true,
      default: 'Shop Owner',
      trim: true,
    },
    openingTime: {
      type: String,
      default: '07:00 AM',
    },
    closingTime: {
      type: String,
      default: '11:00 PM',
    },
    shopPhone: {
      type: String,
      default: '',
      trim: true,
    },
    shopAddress: {
      type: String,
      default: '',
      trim: true,
    },
    shopLogo: {
      type: String,
      default: '',
    },
    selectedLanguage: {
      type: String,
      enum: ['en', 'ur', 'roman_ur'],
      default: 'en',
    },
    allowNegativeStock: {
      type: Boolean,
      default: false,
    },
    receiptSettings: {
      paperSize: {
        type: String,
        enum: ['58mm', '80mm', 'A4'],
        default: '80mm',
      },
      footerMessageUrdu: {
        type: String,
        default: 'آپ کی تشریف آوری کا شکریہ! برائے مہربانی اپنا سامان چیک کر کے لیں۔',
      },
      footerMessageEnglish: {
        type: String,
        default: 'Thank you for shopping with us! Please check your items before leaving.',
      },
      footerMessageRoman: {
        type: String,
        default: 'Tashreef laane ka shukriya! Apnay saaman ki tasdeeq kar lein.',
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShopProfile', shopProfileSchema);
