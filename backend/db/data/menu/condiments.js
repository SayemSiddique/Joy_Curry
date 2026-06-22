// ============================================================================
// frontend/js/data/menu/condiments.js
// Condiments Category Data Sheet
// Uses the Shared Modifier Pattern to merge base data with unique entries.
// Source of truth: Roadmap §6.
// Raita 3 · Green Chutney 3 · Imly (Tamarind) Chutney 3 · Mango Chutney 2.50 ·
// Mixed Pickle 2.50 · Onion Relish 3.
// All are side condiments (no rice/bread/raita accompaniment — they ARE the
// accompaniment). spiceLevel is null: condiments carry their own heat, which a
// fixed dish-level label would misrepresent. Raita is dairy; the chutneys/
// relish/pickle are vegan. isGlutenFree defaults true per the SME assumption;
// flagged below where uncertain.
// ============================================================================

const BASE_CONDIMENT = {
  category:       'condiment',
  subcategory:    null,
  isVegan:        true,            // overridden per dish where not vegan (raita)
  isVegetarian:   true,
  isGlutenFree:   true,
  allergens:      [],              // overridden per dish where present (raita: dairy)
  allergenNote:   null,
  servedWith:     null,            // a condiment is served WITH something, not with
  proteinChoice:  null,
  sizeOptions:    null,
  modifiers:      null,
  pieceCount:     null,
  spiceLevel:     null,
  tags:           [],
  inStock:        true,
  isActive:       true,
};

export const condiments = [
  {
    id:             'raita',
    name:           'Raita',
    description:    'Cooling yogurt with crushed cucumbers and roasted spices.',
    basePrice:      3.00,
    isVegan:        false,
    allergens:      ['dairy'],
    imageUrl:       '/images/dishes/raita.jpg',
    searchKeywords: ['yogurt sauce', 'cucumber raita', 'curd', 'dahi', 'cooling sauce', 'yogurt dip', 'mint yogurt', 'indian condiment', 'side sauce', 'mild', 'condiment'],
  },
  {
    id:             'green-chutney',
    name:           'Green Chutney',
    description:    'Vivid blend of green chilies, coriander, fresh ginger and lemon juice.',
    basePrice:      3.00,
    imageUrl:       '/images/dishes/green-chutney.jpg',
    searchKeywords: ['hari chutney', 'dhaniya chutney', 'coriander chutney', 'mint chutney', 'cilantro chutney', 'spicy green sauce', 'chutney', 'dip', 'condiment'],
  },
  {
    id:             'imly-chutney',
    name:           'Imly (Tamarind) Chutney',
    description:    'Sweet and tangy tamarind sauce with toasted spices.',
    basePrice:      3.00,
    imageUrl:       '/images/dishes/imly-chutney.jpg',
    searchKeywords: ['imli chutney', 'tamarind sauce', 'meethi chutney', 'sweet chutney', 'saunth', 'date tamarind chutney', 'tangy', 'sweet', 'dip', 'condiment'],
  },
  {
    id:             'mango-chutney',
    name:           'Mango Chutney',
    description:    'Chunky sweet mango relish with warm spices.',
    basePrice:      2.50,
    imageUrl:       '/images/dishes/mango-chutney.jpg',
    searchKeywords: ['aam chutney', 'sweet mango relish', 'achar mango', 'mango pickle sweet', 'mango dip', 'sweet', 'fruity', 'dip', 'condiment'],
  },
  {
    id:             'mixed-pickle',
    name:           'Mixed Pickle',
    description:    'Tangy oil-cured pickle of mixed vegetables and spices.',
    basePrice:      2.50,
    imageUrl:       '/images/dishes/mixed-pickle.jpg',
    searchKeywords: ['achar', 'achari', 'mixed achar', 'veg pickle', 'spicy pickle', 'oily pickle', 'preserved vegetables', 'tangy', 'spicy', 'condiment'],
  },
  {
    id:             'onion-relish',
    name:           'Onion Relish',
    description:    'Crisp onions tossed in a tangy, lightly spiced dressing.',
    basePrice:      3.00,
    imageUrl:       '/images/dishes/onion-relish.jpg',
    searchKeywords: ['kanda', 'pyaaz', 'onion salad', 'pickled onion', 'pink onion', 'onion chutney', 'tangy onion', 'crunchy', 'condiment'],
  },
].map((dish) => ({ ...BASE_CONDIMENT, ...dish }));
