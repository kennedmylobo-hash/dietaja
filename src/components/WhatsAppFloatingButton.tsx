import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { getUTMSummary } from "@/lib/utm";
import { siteConfig, getDefaultWhatsAppMessage } from "@/config/site";

interface WhatsAppFloatingButtonProps {
  phoneNumber?: string;
}

const WhatsAppFloatingButton = ({ phoneNumber }: WhatsAppFloatingButtonProps) => {
  const whatsappNumber = phoneNumber || siteConfig.contact.whatsapp;

  const handleClick = () => {
    // Track Contact event with Meta Pixel
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'Contact', {
        content_name: 'WhatsApp Flutuante'
      });
    }
    
    // Track contact - GA4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'contact', {
        method: 'whatsapp',
        event_category: 'engagement',
        event_label: 'floating_button',
      });
    }

    const message = getDefaultWhatsAppMessage(getUTMSummary());
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, "_blank");
  };

  return (
    <motion.button
      onClick={handleClick}
      className="fixed bottom-[35vh] right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] hover:bg-[#20BA5C] rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: "spring", stiffness: 200 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Fale conosco no WhatsApp"
    >
      {/* Pulse animation ring */}
      <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" />
      
      {/* WhatsApp icon */}
      <MessageCircle className="w-7 h-7 text-white fill-white" />
      
      {/* Tooltip */}
      <span className="absolute right-full mr-3 px-3 py-2 bg-card text-foreground text-sm font-medium rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Fale conosco
      </span>
    </motion.button>
  );
};

export default WhatsAppFloatingButton;
