 import jsPDF from "jspdf";
 
 interface OrderItem {
   name: string;
   quantity: number;
   type?: string;
   flavors?: { name: string; quantity: number }[];
 }
 
 interface OrderForLabel {
   order_number: string | null;
   customer_name: string;
   delivery_option: string;
   delivery_address?: string | null;
   items: OrderItem[];
 }
 
 // A7 dimensions: 74mm x 105mm
 const A7_WIDTH = 74;
 const A7_HEIGHT = 105;
 const MARGIN = 5;
 
 export const generateLabelsA7 = (orders: OrderForLabel[], brandName: string = "MEU RESTAURANTE") => {
   const doc = new jsPDF({
     format: [A7_WIDTH, A7_HEIGHT],
     orientation: "portrait",
     unit: "mm",
   });
 
   orders.forEach((order, index) => {
     if (index > 0) doc.addPage();
 
     let y = MARGIN;
 
     // Header
     doc.setFillColor(34, 197, 94); // green-500
     doc.rect(0, 0, A7_WIDTH, 12, "F");
     doc.setTextColor(255, 255, 255);
     doc.setFontSize(14);
     doc.setFont("helvetica", "bold");
     doc.text(brandName, A7_WIDTH / 2, 8, { align: "center" });
 
     y = 18;
 
     // Customer info
     doc.setTextColor(0, 0, 0);
     doc.setFontSize(11);
     doc.setFont("helvetica", "bold");
     doc.text(order.customer_name.toUpperCase().slice(0, 20), MARGIN, y);
     y += 5;
 
     doc.setFontSize(9);
     doc.setFont("helvetica", "normal");
     doc.text(`#${order.order_number || "---"}`, MARGIN, y);
     y += 7;
 
     // Divider
     doc.setDrawColor(200, 200, 200);
     doc.line(MARGIN, y, A7_WIDTH - MARGIN, y);
     y += 5;
 
     // Items
     doc.setFontSize(9);
     const items = flattenItems(order.items);
 
     items.forEach((item) => {
       if (y > A7_HEIGHT - 20) return; // Prevent overflow
 
       const text = `✓ ${item.quantity}x ${item.name}`.slice(0, 35);
       doc.text(text, MARGIN, y);
       y += 4.5;
     });
 
     // Footer - Delivery option
     y = A7_HEIGHT - 12;
     doc.setDrawColor(200, 200, 200);
     doc.line(MARGIN, y, A7_WIDTH - MARGIN, y);
     y += 4;
 
     const deliveryText =
       order.delivery_option === "delivery"
         ? `📍 Delivery ${order.delivery_address ? `- ${order.delivery_address.slice(0, 25)}` : ""}`
         : "🏠 Retirada";
 
     doc.setFontSize(8);
     doc.text(deliveryText, MARGIN, y);
   });
 
   doc.save(`etiquetas-${new Date().toISOString().split("T")[0]}.pdf`);
 };
 
 // 80mm thermal printer (80mm width, continuous roll)
 const THERMAL_WIDTH = 80;
 const THERMAL_HEIGHT = 60;
 
 export const generateLabelsThermal = (orders: OrderForLabel[], brandName: string = "MEU RESTAURANTE") => {
   const doc = new jsPDF({
     format: [THERMAL_WIDTH, THERMAL_HEIGHT],
     orientation: "portrait",
     unit: "mm",
   });
 
   orders.forEach((order, index) => {
     if (index > 0) doc.addPage();
 
     let y = 3;
 
     // Header
     doc.setFontSize(12);
     doc.setFont("helvetica", "bold");
     doc.text(brandName, THERMAL_WIDTH / 2, y, { align: "center" });
     y += 5;
 
     // Divider
     doc.setDrawColor(0);
     doc.line(2, y, THERMAL_WIDTH - 2, y);
     y += 4;
 
     // Customer
     doc.setFontSize(10);
     doc.text(order.customer_name.toUpperCase().slice(0, 25), 2, y);
     y += 4;
 
     doc.setFont("helvetica", "normal");
     doc.setFontSize(9);
     doc.text(`Pedido: #${order.order_number || "---"}`, 2, y);
     y += 5;
 
     // Items
     doc.setFontSize(8);
     const items = flattenItems(order.items);
 
     items.slice(0, 8).forEach((item) => {
       const text = `✓ ${item.quantity}x ${item.name}`.slice(0, 40);
       doc.text(text, 2, y);
       y += 3.5;
     });
 
     // Delivery
     y = THERMAL_HEIGHT - 5;
     const deliveryText =
       order.delivery_option === "delivery" ? "📍 Delivery" : "🏠 Retirada";
     doc.setFontSize(8);
     doc.text(deliveryText, 2, y);
   });
 
   doc.save(`etiquetas-termica-${new Date().toISOString().split("T")[0]}.pdf`);
 };
 
 // Helper to flatten items with flavors
 const flattenItems = (items: OrderItem[]): { name: string; quantity: number }[] => {
   const result: { name: string; quantity: number }[] = [];
 
   items.forEach((item) => {
     if (item.flavors && item.flavors.length > 0) {
       item.flavors.forEach((flavor) => {
         result.push({ name: flavor.name, quantity: flavor.quantity });
       });
     } else {
       result.push({ name: item.name, quantity: item.quantity });
     }
   });
 
   return result;
 };