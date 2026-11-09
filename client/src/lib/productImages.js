/**
 * Smart Kiryana Grocery Product Image Helper
 * Provides high-quality, web-optimized images for Pakistani/South Asian kiryana products.
 */

const CURATED_IMAGES = {
  rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80', // Basmati rice
  sugar: 'https://images.unsplash.com/photo-1622484212850-eb596d769edc?auto=format&fit=crop&w=400&q=80', // Sugar
  flour: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80', // Wheat flour / Atta
  oil: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80', // Cooking oil / Ghee
  ghee: 'https://images.unsplash.com/photo-1589927986089-35812388d1f4?auto=format&fit=crop&w=400&q=80', // Ghee / Butter
  tea: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80', // Tea leaves / Chai
  milk: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80', // Milk
  daal: 'https://images.unsplash.com/photo-1585994192701-f1a505c817ea?auto=format&fit=crop&w=400&q=80', // Lentils / Daalen
  pulses: 'https://images.unsplash.com/photo-1585994192701-f1a505c817ea?auto=format&fit=crop&w=400&q=80', // Pulses
  spices: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=400&q=80', // Spices / Masalay
  chili: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=400&q=80', // Red chili
  turmeric: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=400&q=80', // Turmeric / Haldi
  soap: 'https://images.unsplash.com/photo-1607006314647-810a95f9d2d7?auto=format&fit=crop&w=400&q=80', // Soap bar
  detergent: 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=400&q=80', // Detergent
  eggs: 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?auto=format&fit=crop&w=400&q=80', // Farm eggs
  biscuit: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80', // Biscuits / Cookies
  drink: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80', // Soft drink / Beverage
  salt: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?auto=format&fit=crop&w=400&q=80', // Salt / Namak
  bread: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80', // Bread / Bakery
  onion: 'https://images.unsplash.com/photo-1580201092675-a0a6a6cafbb1?auto=format&fit=crop&w=400&q=80', // Onion / Pyaz
  potato: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=400&q=80', // Potato / Aloo
  general: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80', // Grocery Store Basket
};

/**
 * Returns a high-res relevant grocery product image URL based on product name or category
 * @param {string} name - Product name (English or Urdu)
 * @param {string} [category] - Optional category
 * @param {string} [existingImage] - If product already has an image, returns it
 * @returns {string} Image URL
 */
export function getProductImage(name = '', category = '', existingImage = '') {
  if (existingImage && typeof existingImage === 'string' && existingImage.startsWith('http')) {
    return existingImage;
  }

  const str = `${name} ${category}`.toLowerCase();

  if (str.includes('rice') || str.includes('chawal') || str.includes('چاول') || str.includes('basmati')) {
    return CURATED_IMAGES.rice;
  }
  if (str.includes('sugar') || str.includes('cheeni') || str.includes('chini') || str.includes('چینی')) {
    return CURATED_IMAGES.sugar;
  }
  if (str.includes('atta') || str.includes('flour') || str.includes('gandum') || str.includes('آٹا') || str.includes('میدہ') || str.includes('maida')) {
    return CURATED_IMAGES.flour;
  }
  if (str.includes('ghee') || str.includes('گھی') || str.includes('banaspati') || str.includes('dalda')) {
    return CURATED_IMAGES.ghee;
  }
  if (str.includes('oil') || str.includes('tail') || str.includes('تیل') || str.includes('cooking oil')) {
    return CURATED_IMAGES.oil;
  }
  if (str.includes('tea') || str.includes('chai') || str.includes('chaye') || str.includes('چائے') || str.includes('tapal') || str.includes('lipton') || str.includes('patti')) {
    return CURATED_IMAGES.tea;
  }
  if (str.includes('milk') || str.includes('doodh') || str.includes('دودھ') || str.includes('olpers') || str.includes('dairy') || str.includes('nestle')) {
    return CURATED_IMAGES.milk;
  }
  if (str.includes('daal') || str.includes('dal') || str.includes('pulse') || str.includes('دال') || str.includes('chana') || str.includes('moong') || str.includes('masoor') || str.includes('mash')) {
    return CURATED_IMAGES.daal;
  }
  if (str.includes('chili') || str.includes('mirch') || str.includes('مرچ')) {
    return CURATED_IMAGES.chili;
  }
  if (str.includes('haldi') || str.includes('turmeric') || str.includes('ہلدی')) {
    return CURATED_IMAGES.turmeric;
  }
  if (str.includes('spice') || str.includes('masala') || str.includes('masalay') || str.includes('مصالحہ') || str.includes('shan') || str.includes('national')) {
    return CURATED_IMAGES.spices;
  }
  if (str.includes('soap') || str.includes('saban') || str.includes('صابن') || str.includes('lux') || str.includes('dettol') || str.includes('lifebuoy')) {
    return CURATED_IMAGES.soap;
  }
  if (str.includes('surf') || str.includes('detergent') || str.includes('سرف') || str.includes('ariel') || str.includes('bonus')) {
    return CURATED_IMAGES.detergent;
  }
  if (str.includes('egg') || str.includes('anda') || str.includes('anday') || str.includes('انڈے') || str.includes('انڈا')) {
    return CURATED_IMAGES.eggs;
  }
  if (str.includes('biscuit') || str.includes('cookie') || str.includes('بسکٹ') || str.includes('sooper') || str.includes('rusk') || str.includes('bakery')) {
    return CURATED_IMAGES.biscuit;
  }
  if (str.includes('drink') || str.includes('coke') || str.includes('pepsi') || str.includes('sprite') || str.includes('juice') || str.includes('مشروب')) {
    return CURATED_IMAGES.drink;
  }
  if (str.includes('salt') || str.includes('namak') || str.includes('نمک')) {
    return CURATED_IMAGES.salt;
  }
  if (str.includes('bread') || str.includes('double roti') || str.includes('ڈبل روٹی')) {
    return CURATED_IMAGES.bread;
  }
  if (str.includes('onion') || str.includes('pyaz') || str.includes('پیاز')) {
    return CURATED_IMAGES.onion;
  }
  if (str.includes('potato') || str.includes('aloo') || str.includes('آلو')) {
    return CURATED_IMAGES.potato;
  }

  return CURATED_IMAGES.general;
}

export default getProductImage;
