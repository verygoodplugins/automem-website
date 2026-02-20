/**
 * AutoMem Mermaid Diagram Enhancer
 * - Adds a "Click to Zoom" lightbox for detailed inspection
 */

const initMermaidFix = () => {
  const diagrams = document.querySelectorAll('.mermaid');
  
  diagrams.forEach(container => {
    const svg = container.querySelector('svg');
    if (!svg) return;

    // LIGHTBOX ZOOM
    // Remove existing listeners to prevent duplicates
    const newSvg = svg.cloneNode(true);
    container.replaceChild(newSvg, svg);
    
    // Add a visual hint that it's zoomable
    container.style.cursor = 'zoom-in';
    container.setAttribute('title', 'Click to zoom');
    
    container.addEventListener('click', () => {
      openLightbox(newSvg.outerHTML);
    });
  });
};

const openLightbox = (svgContent) => {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'mermaid-lightbox';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    zIndex: '9999',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'zoom-out',
    backdropFilter: 'blur(5px)',
    opacity: '0',
    transition: 'opacity 0.2s ease'
  });

  // Create content container
  const content = document.createElement('div');
  content.innerHTML = svgContent;
  Object.assign(content.style, {
    maxWidth: '95vw',
    maxHeight: '95vh',
    overflow: 'auto',
    padding: '20px',
    borderRadius: '8px',
    background: 'transparent' // Let the SVG background handle it or be transparent
  });

  // Style the SVG inside the lightbox
  const lightboxSvg = content.querySelector('svg');
  if (lightboxSvg) {
    lightboxSvg.style.width = 'auto';
    lightboxSvg.style.height = 'auto';
    lightboxSvg.style.maxWidth = 'none';
    lightboxSvg.style.minWidth = 'min(1000px, 90vw)'; // Ensure it's at least somewhat large
    
    // Ensure text is readable in lightbox (force colors if needed)
    // The existing CSS classes should handle dark/light mode, but lightbox is always dark-ish backdrop
    // So we might want to force specific colors if the transparent SVG looks bad on dark backdrop.
    // However, our CSS handles theme colors on the SVG classes.
  }

  overlay.appendChild(content);
  document.body.appendChild(overlay);

  // Fade in
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
  });

  // Close on click
  overlay.addEventListener('click', () => {
    overlay.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(overlay);
    }, 200);
  });
  
  // Close on Escape
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      overlay.click();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
};

// Run on load
window.addEventListener('load', () => {
  // Poll briefly for mermaid rendering
  const checkInterval = setInterval(() => {
    if (document.querySelector('.mermaid svg')) {
      initMermaidFix();
      clearInterval(checkInterval);
    }
  }, 200);
  
  // Stop polling after 5s
  setTimeout(() => clearInterval(checkInterval), 5000);
});

// Support View Transitions (Astro)
document.addEventListener('astro:page-load', () => {
  setTimeout(initMermaidFix, 500);
});