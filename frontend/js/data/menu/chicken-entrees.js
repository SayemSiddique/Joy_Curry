// ============================================================================
// frontend/js/data/menu/chicken-entrees.js
// Chicken Entrees Category Data Sheet
// Uses the Shared Modifier Pattern to merge base data with unique entries.
// ============================================================================

const BASE_CHICKEN = {
  category:      "chicken-entree",
  subcategory:   null,
  basePrice:     15.50,
  isVegan:       false,
  isVegetarian:  false,
  isGlutenFree:  false,
  allergens:     ["cashew", "dairy"],
  allergenNote:  null,
  servedWith:    "rice",
  proteinChoice: null,
  sizeOptions:   null,
  modifiers:     [{ id: "mod-white-meat", label: "White meat", priceDelta: 1.00 }],
  pieceCount:    null,
  tags:          [],
  searchKeywords: [], // Default safe-fallback for search queries
  inStock:       true,
  isActive:      true,
};

export const chickenEntrees = [
  {
    id:          "chk-tikka-masala",
    name:        "Chicken Tikka Masala",
    description: "Barbecued chicken in a creamy tomato base.",
    spiceLevel:  "Mild",
    tags:        ["popular"],
    imageUrl:    "/images/dishes/chicken-tikka-masala.jpg",
    searchKeywords: ["ctm", "tikka", "tikamasa", "tika masala", "teeka masala", "tika masla", "creamy", "mildly spiced", "rich gravy", "savory", "orange sauce", "tomato base", "grilled chicken", "barbecue chicken", "boneless tandoori chicken", "bestseller", "most popular", "classic", "crowd favorite", "poultry", "meat", "non-veg"]
  },
  {
    id:          "chk-makhni",
    name:        "Chicken Makhni",
    description: "Chicken cooked in a creamy, slightly sweet & spiced tomato and butter sauce.",
    spiceLevel:  "Mild",
    imageUrl:    "/images/dishes/chicken-makhni.jpg",
    searchKeywords: ["butter chicken", "murgh makhani", "makhani chicken", "machni", "mahni", "makni", "butterchiken", "creamy tomato", "sweet gravy", "buttery", "velvety", "mild", "not spicy", "kid friendly", "butter sauce", "cream", "poultry", "meat", "non-veg"]
  },
  {
    id:          "chk-curry",
    name:        "Chicken Curry",
    description: "Chicken cooked in a traditional curry sauce.",
    spiceLevel:  "Medium",
    imageUrl:    "/images/dishes/chicken-curry.jpg",
    searchKeywords: ["murgh curry", "traditional curry", "house curry", "chiken cury", "kari", "khari", "classic style", "homestyle", "savory gravy", "authentic spice", "onion gravy", "ginger garlic base", "standard curry sauce", "poultry", "meat", "non-veg"]
  },
  {
    id:          "chk-vindaloo",
    name:        "Chicken Vindaloo",
    description: "Chicken cooked in a spicy, tangy sauce with potatoes.",
    spiceLevel:  "Hot",
    imageUrl:    "/images/dishes/chicken-vindaloo.jpg",
    searchKeywords: ["vindalu", "bindaloo", "vindelo", "wandaloo", "very spicy", "tangy", "acidic", "hot", "fiery", "sharp", "sour", "extra hot", "potato", "potatoes", "vinegar", "red chili paste", "goan sauce", "poultry", "meat", "non-veg"]
  },
  {
    id:          "chk-korma",
    name:        "Chicken Korma",
    description: "Chicken cooked in a light creamy sauce.",
    spiceLevel:  "Mild",
    imageUrl:    "/images/dishes/chicken-korma.jpg",
    searchKeywords: ["qorma", "kurma", "khorma", "mughlai chicken", "kormah", "colma", "mild", "sweet cream", "nutty", "rich white gravy", "delicate", "aromatic", "cashew nut", "almond paste", "yogurt base", "cardamom", "poultry", "meat", "non-veg"]
  },
  {
    id:          "chk-karahi",
    name:        "Chicken Karahi",
    description: "Chicken cooked with tomatoes, green pepper & fresh ginger.",
    spiceLevel:  "Medium",
    imageUrl:    "/images/dishes/chicken-karahi.jpg",
    searchKeywords: ["kadai chicken", "kadahi", "korahi", "karai", "robust", "thick gravy", "peppery", "semi-dry", "herby", "fresh ginger", "green peppers", "bell pepper", "chunky tomato", "wok cooked", "poultry", "meat", "non-veg"]
  },
  {
    id:          "chk-saag",
    name:        "Chicken Saag",
    description: "Chicken cooked with spinach.",
    spiceLevel:  "Medium",
    imageUrl:    "/images/dishes/chicken-saag.jpg",
    searchKeywords: ["spinach chicken", "saagwala", "palak chicken", "murgh palak", "sag chicken", "shag", "sagg", "earthy", "savory", "healthy option", "thick green sauce", "spinach", "greens", "pureed spinach", "iron rich", "poultry", "meat", "non-veg"]
  },
  {
    id:          "chk-jhalfrezi",
    name:        "Chicken Jhalfrezi",
    description: "Chicken cooked with onions, green peppers & tomatoes.",
    spiceLevel:  "Medium",
    imageUrl:    "/images/dishes/chicken-jhalfrezi.jpg",
    searchKeywords: ["jalfrezi", "jhal frezi", "zalfrezi", "tangy spicy", "stir fry style", "crunchy vegetables", "zesty", "medium hot", "sliced onions", "bell peppers", "capsicum", "fresh tomatoes", "poultry", "meat", "non-veg"]
  },
  {
    id:          "chk-chili",
    name:        "Chicken Chili",
    description: "Chicken tikka cooked with fresh ginger, onions & tomatoes.",
    spiceLevel:  "Hot",
    imageUrl:    "/images/dishes/chicken-chili.jpg",
    searchKeywords: ["chilli chicken", "indo-chinese chicken", "chili tikka", "sweet and spicy", "fiery stir fry", "hot glaze", "tangy heat", "green chilies", "soy sauce mix", "ginger strips", "scallions", "poultry", "meat", "non-veg"]
  },
  {
    id:          "chk-keema-aloo",
    name:        "Chicken Keema Aloo",
    description: "Ground chicken cooked with potatoes.",
    spiceLevel:  "Medium",
    imageUrl:    "/images/dishes/chicken-keema-aloo.jpg",
    searchKeywords: ["kheema aloo", "kima alu", "ground chicken curry", "minced", "comfort food", "savory mince", "hearty", "ground chicken", "mincemeat", "potato cubes", "peas", "chopped masala", "poultry", "meat", "non-veg"]
  },
].map(dish => ({ ...BASE_CHICKEN, ...dish }));