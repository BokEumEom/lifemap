import React from 'react';
import { X, Download } from 'lucide-react';

interface PhotoLightboxProps {
  url: string | null;
  caption?: string;
  onClose: () => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  url,
  caption,
  onClose,
}) => {
  if (!url) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        <a
          href={url}
          download="lifemap-photo.jpg"
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          title="Download photo"
        >
          <Download className="w-5 h-5" />
        </a>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={url}
          alt={caption || 'Photo'}
          referrerPolicy="no-referrer"
          className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
        />
        {caption && (
          <p className="text-sm font-medium text-stone-300 mt-3 text-center px-4">
            {caption}
          </p>
        )}
      </div>
    </div>
  );
};
