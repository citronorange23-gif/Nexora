import { db } from "../../lib/db.js";

function getStartOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getEndOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export async function getDashboardOverview(
  organizationId: string,
) {
  const now = new Date();

  const todayStart = getStartOfDay(now);
  const todayEnd = getEndOfDay(now);

  // ─────────────────────────────
  // Périodes
  // ─────────────────────────────

  const last7Start = new Date(todayStart);
  last7Start.setDate(last7Start.getDate() - 6);

  const previous7Start = new Date(last7Start);
  previous7Start.setDate(
    previous7Start.getDate() - 7,
  );

  const previous7End = new Date(last7Start);
  previous7End.setMilliseconds(
    previous7End.getMilliseconds() - 1,
  );

  const last30Start = new Date(todayStart);
  last30Start.setDate(last30Start.getDate() - 29);

  // ─────────────────────────────
  // Ventes
  // ─────────────────────────────

  const sales = await db.sale.findMany({
    where: {
      organizationId,
      status: "COMPLETED",
      createdAt: {
        gte: previous7Start,
        lte: todayEnd,
      },
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      payment: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // ─────────────────────────────
  // Statistiques aujourd'hui
  // ─────────────────────────────

  const todaySales = sales.filter(
    (sale) =>
      sale.createdAt >= todayStart &&
      sale.createdAt <= todayEnd,
  );

  let todayRevenue = 0;
  let todayItemsSold = 0;

  for (const sale of todaySales) {
    todayRevenue += Number(sale.total);

    for (const item of sale.items) {
      todayItemsSold += item.quantity;
    }
  }

  // ─────────────────────────────
  // 7 derniers jours
  // ─────────────────────────────

  const last7Sales = sales.filter(
    (sale) => sale.createdAt >= last7Start,
  );

  let last7Revenue = 0;
  let last7ItemsSold = 0;

  for (const sale of last7Sales) {
    last7Revenue += Number(sale.total);

    for (const item of sale.items) {
      last7ItemsSold += item.quantity;
    }
  }

  // ─────────────────────────────
  // 7 jours précédents
  // ─────────────────────────────

  const previous7Sales = sales.filter(
    (sale) =>
      sale.createdAt >= previous7Start &&
      sale.createdAt <= previous7End,
  );

  let previous7Revenue = 0;

  for (const sale of previous7Sales) {
    previous7Revenue += Number(sale.total);
  }

  const revenueChange =
    previous7Revenue === 0
      ? null
      : ((last7Revenue - previous7Revenue) /
          previous7Revenue) *
        100;

  // ─────────────────────────────
  // 30 derniers jours
  // ─────────────────────────────

  const all30Sales = await db.sale.findMany({
    where: {
      organizationId,
      status: "COMPLETED",
      createdAt: {
        gte: last30Start,
        lte: todayEnd,
      },
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  let last30Revenue = 0;
  let last30Profit = 0;

  for (const sale of all30Sales) {
    last30Revenue += Number(sale.total);

    for (const item of sale.items) {
      const revenue =
        Number(item.unitPrice) * item.quantity;

      const cost =
        Number(item.product.costPrice ?? 0) *
        item.quantity;

      last30Profit += revenue - cost;
    }
  }

  // ─────────────────────────────
  // Évolution quotidienne
  // ─────────────────────────────

  const dailyStats = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(last7Start);

    date.setDate(date.getDate() + i);

    const start = getStartOfDay(date);
    const end = getEndOfDay(date);

    const daySales = last7Sales.filter(
      (sale) =>
        sale.createdAt >= start &&
        sale.createdAt <= end,
    );

    let revenue = 0;

    for (const sale of daySales) {
      revenue += Number(sale.total);
    }

    dailyStats.push({
      date: start.toISOString().slice(0, 10),
      revenue,
      sales: daySales.length,
    });
  }

  // ─────────────────────────────
  // Meilleurs produits
  // ─────────────────────────────

  const productStats = new Map<
    string,
    {
      productId: string;
      name: string;
      quantitySold: number;
      revenue: number;
      profit: number;
    }
  >();

  for (const sale of all30Sales) {
    for (const item of sale.items) {
      const product = item.product;

      const revenue =
        Number(item.unitPrice) *
        item.quantity;

      const cost =
        Number(product.costPrice ?? 0) *
        item.quantity;

      const profit = revenue - cost;

      const existing =
        productStats.get(product.id);

      if (existing) {
        existing.quantitySold += item.quantity;
        existing.revenue += revenue;
        existing.profit += profit;
      } else {
        productStats.set(product.id, {
          productId: product.id,
          name: product.name,
          quantitySold: item.quantity,
          revenue,
          profit,
        });
      }
    }
  }

  const topProducts = Array.from(
    productStats.values(),
  )
    .sort(
      (a, b) =>
        b.quantitySold -
        a.quantitySold,
    )
    .slice(0, 5);

  const mostProfitableProducts =
    Array.from(productStats.values())
      .sort(
        (a, b) =>
          b.profit - a.profit,
      )
      .slice(0, 5);

  // ─────────────────────────────
  // Inventaire
  // ─────────────────────────────

  const products = await db.product.findMany({
    where: {
      organizationId,
      active: true,
    },
    include: {
      inventory: true,
    },
  });

  let lowStock = 0;
  let outOfStock = 0;

  const lowStockProducts = [];

  for (const product of products) {
    if (product.type !== "PRODUCT") {
      continue;
    }

    const inventory = product.inventory;

    if (!inventory) {
      continue;
    }

    if (inventory.quantity <= 0) {
      outOfStock++;

      lowStockProducts.push({
        productId: product.id,
        name: product.name,
        quantity: inventory.quantity,
        minStock: inventory.minStock,
      });

      continue;
    }

    if (
      inventory.quantity <=
      inventory.minStock
    ) {
      lowStock++;

      lowStockProducts.push({
        productId: product.id,
        name: product.name,
        quantity: inventory.quantity,
        minStock: inventory.minStock,
      });
    }
  }

  // ─────────────────────────────
  // Panier moyen
  // ─────────────────────────────

  const averageOrderValue =
    last7Sales.length === 0
      ? 0
      : last7Revenue /
        last7Sales.length;

  return {
    today: {
      revenue: todayRevenue,
      sales: todaySales.length,
      itemsSold: todayItemsSold,
    },

    last7Days: {
      revenue: last7Revenue,
      sales: last7Sales.length,
      itemsSold: last7ItemsSold,
      averageOrderValue,
      revenueChangePercent:
        revenueChange,
    },

    last30Days: {
      revenue: last30Revenue,
      profit: last30Profit,
      sales: all30Sales.length,
    },

    dailyStats,

    topProducts,

    mostProfitableProducts,

    inventory: {
      totalProducts: products.length,
      lowStock,
      outOfStock,
      lowStockProducts,
    },
  };
}