// ============================================================================
// frontend/js/data/menu/beverages.js
// Beverages Category Data Sheet
// Uses the Shared Modifier Pattern to merge base data with unique entries.
// Source of truth: Roadmap §6.
// Tea/Chai 2 · Juices 3 · Vitamin Water 3 · Gatorade 3 · Lassi Sweet/Salt 3 ·
// Lassi Mango 4 · Soda 1.75 · Water 1.75.
//
// Design decision (VP Eng / PM): §6 lists "Juices" as one line with six
// flavors at a uniform $3. Modelled as ONE SKU ('juices') — uniform pricing,
// one POS button, flavors surface in description + searchKeywords. Splitting
// into six ids would inflate the catalogue without adding ordering capability.
// The other seven menu lines are seven distinct SKUs. Total: 8 items.
// ============================================================================

const BASE_BEVERAGE = {
  category:       'beverage',
  subcategory:    null,
  isVegan:        true,            // overridden for lassi (dairy)
  isVegetarian:   true,
  isGlutenFree:   true,
  allergens:      [],              // overridden for lassi (dairy)
  allergenNote:   null,
  servedWith:     null,
  proteinChoice:  null,
  sizeOptions:    null,
  modifiers:      null,
  pieceCount:     null,
  spiceLevel:     null,
  tags:           [],
  inStock:        true,
  isActive:       true,
};

export const beverages = [
  {
    id:             'tea-chai',
    name:           'Tea / Chai',
    description:    'Spiced Indian milk tea simmered with cardamom and ginger.',
    basePrice:      2.00,
    isVegan:        false,            // traditional chai uses milk
    allergens:      ['dairy'],
    imageUrl:       '/images/dishes/tea-chai.jpg',
    searchKeywords: ['masala chai', 'chai tea', 'kadak chai', 'hot tea', 'indian tea', 'milk tea', 'cardamom tea', 'ginger tea', 'adrak chai', 'hot drink', 'beverage'],
  },
  {
    id:             'juices',
    name:           'Juices',
    description:    'Chilled bottled juice — choose Orange, Apple, Cranberry, Mango, Lychee or Coconut.',
    basePrice:      3.00,
    imageUrl:       '/images/dishes/juices.jpg',
    searchKeywords: ['orange juice', 'apple juice', 'cranberry juice', 'mango juice', 'lychee juice', 'coconut water', 'fruit juice', 'cold juice', 'fresh juice', 'beverage', 'orange', 'apple', 'cranberry', 'mango', 'lychee', 'coconut'],
  },
  {
    id:             'vitamin-water',
    name:           'Vitamin Water',
    description:    'Enhanced vitamin water, lightly flavored.',
    basePrice:      3.00,
    imageUrl:       '/images/dishes/vitamin-water.jpg',
    searchKeywords: ['vitaminwater', 'vitamin drink', 'enhanced water', 'flavored water', 'electrolyte water', 'cold drink', 'beverage'],
  },
  {
    id:             'gatorade',
    name:           'Gatorade',
    description:    'Sports drink with electrolytes.',
    basePrice:      3.00,
    imageUrl:       '/images/dishes/gatorade.jpg',
    searchKeywords: ['sports drink', 'electrolyte drink', 'energy drink', 'thirst quencher', 'cold drink', 'beverage'],
  },
  {
    id:             'lassi-sweet-salt',
    name:           'Lassi Sweet / Salt',
    description:    'Traditional whipped-yogurt drink, sweetened or salted.',
    basePrice:      3.00,
    isVegan:        false,
    allergens:      ['dairy'],
    imageUrl:       '/images/dishes/lassi-sweet-salt.jpg',
    searchKeywords: ['sweet lassi', 'salty lassi', 'namkeen lassi', 'yogurt drink', 'curd shake', 'buttermilk', 'chaas', 'cold drink', 'creamy', 'beverage'],
  },
  {
    id:             'lassi-mango',
    name:           'Lassi Mango',
    description:    'Creamy mango-yogurt smoothie-style drink.',
    basePrice:      4.00,
    isVegan:        false,
    allergens:      ['dairy'],
    imageUrl:       '/images/dishes/lassi-mango.jpg',
    searchKeywords: ['aam lassi', 'mango yogurt drink', 'mango smoothie', 'mango milkshake', 'mango chaas', 'sweet lassi', 'cold drink', 'creamy', 'fruity', 'beverage'],
  },
  {
    id:             'soda',
    name:           'Soda',
    description:    'Chilled canned soda.',
    basePrice:      1.75,
    imageUrl:       '/images/dishes/soda.jpg',
    searchKeywords: ['soft drink', 'coke', 'cola', 'sprite', 'fanta', 'carbonated drink', 'pop', 'cold drink', 'beverage'],
  },
  {
    id:             'water',
    name:           'Water',
    description:    'Bottled still water.',
    basePrice:      1.75,
    imageUrl:       '/images/dishes/water.jpg',
    searchKeywords: ['bottled water', 'mineral water', 'still water', 'drinking water', 'cold water', 'beverage'],
  },
].map((dish) => ({ ...BASE_BEVERAGE, ...dish }));
