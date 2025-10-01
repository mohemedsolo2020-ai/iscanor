export function initializePopupBlocker() {
  if (typeof window === 'undefined') return;

  const originalWindowOpen = window.open;
  const blockedUrls: string[] = [];

  window.open = function (url?: string | URL, target?: string, features?: string) {
    const urlString = url?.toString() || '';
    
    const isVideoPlayerPopup = urlString.includes('ad') ||
      urlString.includes('popup') ||
      urlString.includes('banner') ||
      urlString.includes('promo') ||
      urlString.includes('doubleclick') ||
      urlString.includes('googlesyndication') ||
      urlString.includes('adserver') ||
      urlString.includes('advertisement') ||
      urlString.includes('sponsor');

    if (isVideoPlayerPopup) {
      console.warn('Blocked popup attempt:', urlString);
      blockedUrls.push(urlString);
      return null;
    }

    if (target === '_blank' && !urlString.startsWith(window.location.origin)) {
      const allowedDomains = [
        'mega.nz',
        'videa.hu',
        'dailymotion',
        '4shared.com',
        'ok.ru'
      ];
      
      const isAllowedDomain = allowedDomains.some(domain => urlString.includes(domain));
      
      if (!isAllowedDomain && urlString.length > 0) {
        console.warn('Blocked external popup:', urlString);
        blockedUrls.push(urlString);
        return null;
      }
    }

    return originalWindowOpen.call(window, url, target, features);
  };

  const originalCreateElement = document.createElement.bind(document);
  document.createElement = function (tagName: string, options?: ElementCreationOptions): any {
    const element = originalCreateElement(tagName, options);
    
    if (tagName.toLowerCase() === 'iframe') {
      const iframe = element as HTMLIFrameElement;
      
      const originalSetAttribute = iframe.setAttribute.bind(iframe);
      iframe.setAttribute = function (name: string, value: string) {
        if (name === 'src') {
          const isAdUrl = value.includes('doubleclick') ||
            value.includes('googlesyndication') ||
            value.includes('/ads/') ||
            value.includes('adserver') ||
            value.includes('advertisement');
          
          if (isAdUrl) {
            console.warn('Blocked ad iframe:', value);
            return;
          }
        }
        return originalSetAttribute(name, value);
      };
    }
    
    return element;
  };

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    if (target.tagName === 'A') {
      const href = (target as HTMLAnchorElement).href;
      const isAdLink = href.includes('ad') || 
        href.includes('popup') || 
        href.includes('banner') ||
        href.includes('promo');
      
      if (isAdLink && target.getAttribute('target') === '_blank') {
        e.preventDefault();
        e.stopPropagation();
        console.warn('Blocked ad link click:', href);
      }
    }
  }, true);

  window.addEventListener('beforeunload', (e) => {
    const videoPlayer = document.querySelector('.video-player-container iframe');
    if (videoPlayer && blockedUrls.length > 0) {
      console.log(`Blocked ${blockedUrls.length} popup attempts during this session`);
    }
  });

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          
          if (element.tagName === 'IFRAME') {
            const iframe = element as HTMLIFrameElement;
            const src = iframe.src || '';
            
            const isAdIframe = src.includes('doubleclick') ||
              src.includes('googlesyndication') ||
              src.includes('/ads/') ||
              src.includes('adserver') ||
              src.includes('advertisement');
            
            if (isAdIframe) {
              console.warn('Removed injected ad iframe:', src);
              iframe.remove();
            }
          }
          
          if (element.classList.contains('popup') || 
              element.classList.contains('ad-overlay') ||
              element.id.includes('ad') ||
              element.id.includes('popup')) {
            const videoContainer = element.closest('.video-player-container');
            if (videoContainer) {
              console.warn('Removed ad overlay from video player');
              element.remove();
            }
          }
        }
      });
    });
  });

  const videoContainer = document.querySelector('.video-player-container');
  if (videoContainer) {
    observer.observe(videoContainer, {
      childList: true,
      subtree: true
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const containers = document.querySelectorAll('.video-player-container');
    containers.forEach(container => {
      observer.observe(container, {
        childList: true,
        subtree: true
      });
    });
  });

  console.log('Popup blocker initialized successfully');
}
