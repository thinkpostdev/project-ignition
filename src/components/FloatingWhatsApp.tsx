import { MessageCircle } from 'lucide-react';

const FloatingWhatsApp = () => {
  const whatsappUrl = 'https://wa.me/966550281271';

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 hover:shadow-xl sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
      aria-label="Contact us on WhatsApp"
    >
      <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" fill="white" />
    </a>
  );
};

export default FloatingWhatsApp;
