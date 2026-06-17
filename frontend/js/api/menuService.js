// Phase 1: Import from local data
// Phase 6: Will switch to fetch(API_BASE_URL)

import { menu } from '../data/menu/index.js';

export const getMenu = () => menu;
export const getMenuItem = (id) => menu.find(item => item.id === id);
