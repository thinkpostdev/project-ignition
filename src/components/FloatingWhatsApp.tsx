import { MessageCircle } from 'lucide-react';

const FloatingWhatsApp = () => {
  const whatsappUrl = 'https://wa.me/966550281271';

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 hover:shadow-xl"
      aria-label="Contact us on WhatsApp"
    >
      <MessageCircle className="h-7 w-7" fill="white" />
    </a>
  );
};

export default FloatingWhatsApp;
