// Sample data for a fictional store. Nothing here is a real customer or order.
// The demo agent reads and writes only this module, through the tools in tools.ts.

export type ShipmentStatus =
  | "processing"
  | "in_transit"
  | "at_local_warehouse"
  | "out_for_delivery"
  | "delivered"
  | "delayed";

export interface Order {
  id: string;
  customerName: string;
  customerNameAr: string;
  phone: string;
  city: string;
  cityAr: string;
  country: "UAE" | "KSA";
  placedOn: string; // ISO date
  items: { name: string; nameAr: string; qty: number; priceAed: number }[];
  paymentMethod: "card" | "cash_on_delivery" | "tabby";
  shipment: {
    carrier: string;
    trackingNumber: string;
    status: ShipmentStatus;
    location: string;
    locationAr: string;
    eta: string; // ISO date-time, local time of the destination
    note?: string;
  };
}

export const STORE = {
  name: "Rimal Home",
  nameAr: "رمال هوم",
  description: "Online furniture and home-goods store delivering across the UAE and Saudi Arabia (fictional, for demonstration).",
  policies: {
    returns:
      "Returns accepted within 14 days of delivery for unused items in original packaging. Large furniture is collected free of charge. Refund goes back to the original payment method within 5-7 working days after inspection.",
    delivery:
      "Standard delivery 2-4 working days in UAE, 3-6 working days in KSA. Working days are Sunday to Thursday. Free delivery on orders over 500 AED / 500 SAR.",
    assembly: "Free assembly for beds, wardrobes and dining tables in Dubai, Abu Dhabi, Riyadh and Jeddah.",
    hours: "Customer service team available Sunday-Thursday 9:00-18:00 Gulf time. The assistant answers 24/7.",
  },
};

// Dates are relative to "today" in Gulf time, so the demo never goes stale.
export function gulfToday(): Date {
  const now = new Date(Date.now() + 4 * 3600_000); // UTC+4 (UAE); KSA is UTC+3, close enough for a demo
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
function day(offset: number, time?: string): string {
  const d = new Date(gulfToday().getTime() + offset * 86400_000);
  const iso = d.toISOString().slice(0, 10);
  return time ? `${iso}T${time}` : iso;
}

export const ORDERS: Order[] = [
  {
    id: "RH-10482",
    customerName: "Faisal Al-Qahtani",
    customerNameAr: "فيصل القحطاني",
    phone: "+966 55 410 2290",
    city: "Dammam",
    cityAr: "الدمام",
    country: "KSA",
    placedOn: day(-4),
    items: [{ name: "Oak dining table, 6 seats", nameAr: "طاولة طعام من خشب البلوط، ٦ مقاعد", qty: 1, priceAed: 3450 }],
    paymentMethod: "tabby",
    shipment: {
      carrier: "SMSA Express",
      trackingNumber: "SMSA778201945",
      status: "at_local_warehouse",
      location: "Dammam warehouse",
      locationAr: "مستودع الدمام",
      eta: day(1, "16:00"),
    },
  },
  {
    id: "RH-10517",
    customerName: "Mariam Al-Suwaidi",
    customerNameAr: "مريم السويدي",
    phone: "+971 50 233 8714",
    city: "Dubai",
    cityAr: "دبي",
    country: "UAE",
    placedOn: day(-2),
    items: [
      { name: "Linen sofa, 3 seats, sand", nameAr: "كنبة كتان ثلاثية، لون رملي", qty: 1, priceAed: 4200 },
      { name: "Cushion set", nameAr: "طقم مخدات", qty: 2, priceAed: 180 },
    ],
    paymentMethod: "card",
    shipment: {
      carrier: "Aramex",
      trackingNumber: "ARX5520193377",
      status: "out_for_delivery",
      location: "With driver, Al Barsha",
      locationAr: "مع المندوب، البرشاء",
      eta: day(0, "19:00"),
    },
  },
  {
    id: "RH-10390",
    customerName: "Abdullah Al-Harbi",
    customerNameAr: "عبدالله الحربي",
    phone: "+966 50 118 4432",
    city: "Riyadh",
    cityAr: "الرياض",
    country: "KSA",
    placedOn: day(-12),
    items: [{ name: "King bed frame, walnut", nameAr: "هيكل سرير كنج، خشب الجوز", qty: 1, priceAed: 5100 }],
    paymentMethod: "cash_on_delivery",
    shipment: {
      carrier: "Naqel",
      trackingNumber: "NQL30019287",
      status: "delayed",
      location: "Riyadh sorting hub",
      locationAr: "مركز الفرز في الرياض",
      eta: day(3, "14:00"),
      note: "Delayed 3 days: item was held for a damaged-packaging check.",
    },
  },
  {
    id: "RH-10301",
    customerName: "Khalid Al-Dosari",
    customerNameAr: "خالد الدوسري",
    phone: "+966 56 771 3058",
    city: "Jeddah",
    cityAr: "جدة",
    country: "KSA",
    placedOn: day(-9),
    items: [{ name: "Four-door wardrobe, white oak", nameAr: "دولاب أربعة أبواب، بلوط أبيض", qty: 1, priceAed: 6200 }],
    paymentMethod: "card",
    shipment: {
      carrier: "SMSA Express",
      trackingNumber: "SMSA778199310",
      status: "delivered",
      location: "Delivered and assembled",
      locationAr: "تم التسليم والتركيب",
      eta: day(-3, "11:00"),
    },
  },
  {
    id: "RH-10233",
    customerName: "Noor Al-Mansouri",
    customerNameAr: "نور المنصوري",
    phone: "+971 55 902 1146",
    city: "Abu Dhabi",
    cityAr: "أبوظبي",
    country: "UAE",
    placedOn: day(-21),
    items: [{ name: "Ceramic table lamp", nameAr: "أباجورة سيراميك", qty: 2, priceAed: 290 }],
    paymentMethod: "card",
    shipment: {
      carrier: "Emirates Post",
      trackingNumber: "EP99102746AE",
      status: "delivered",
      location: "Delivered to customer",
      locationAr: "تم التسليم للعميل",
      eta: day(-9, "12:30"),
    },
  },
];

export function findOrder(query: { orderId?: string; phone?: string }): Order | undefined {
  const digits = (s: string) => s.replace(/\D/g, "");
  if (query.orderId) {
    const id = query.orderId.toUpperCase().replace(/\s/g, "");
    const normalised = id.startsWith("RH-") ? id : `RH-${id.replace(/^RH/, "")}`;
    const hit = ORDERS.find((o) => o.id === normalised);
    if (hit) return hit;
  }
  if (query.phone) {
    const p = digits(query.phone);
    if (p.length >= 7) return ORDERS.find((o) => digits(o.phone).endsWith(p.slice(-9)));
  }
  return undefined;
}
