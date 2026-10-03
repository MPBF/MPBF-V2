type CategorizedProduct = {
  category_id?: string | null;
  category_name_ar?: string | null;
  category_name?: string | null;
};

const categoryNames = new Intl.Collator("ar", { sensitivity: "base", numeric: true });

/** Display-only sorting; preserve the source order inside each category. */
export function sortCustomerProductsByCategory<T extends CategorizedProduct>(products: readonly T[]): T[] {
  return products.map((product) => {
    const categoryId = product.category_id?.trim() || "";
    const name = product.category_name_ar?.trim() || product.category_name?.trim() || "";
    return { product, categoryId, name, rank: !categoryId ? 2 : !name ? 1 : 0 };
  }).sort((a, b) =>
    a.rank - b.rank ||
    (a.rank === 2 ? 0 : categoryNames.compare(a.name, b.name) || categoryNames.compare(a.categoryId, b.categoryId)),
  ).map(({ product }) => product);
}