
import React, { useEffect } from 'react';
import { APP_LOGO_URL } from '../utils/constants';

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  publishedAt?: string;
  author?: string;
  keywords?: string;
}

const SEO: React.FC<SEOProps> = ({ 
  title, 
  description, 
  image = APP_LOGO_URL, 
  url = window.location.href, 
  type = 'website',
  publishedAt,
  author,
  keywords
}) => {
  useEffect(() => {
    const siteTitle = 'Public Tak';
    const cleanTitle = title.replace(/<[^>]*>?/gm, '').trim();
    const displayTitle = cleanTitle === siteTitle || cleanTitle === 'Home' || !cleanTitle 
      ? siteTitle 
      : `${cleanTitle} | ${siteTitle}`;
    
    document.title = displayTitle;

    const cleanDescription = description.replace(/<[^>]*>?/gm, '').substring(0, 160).trim();
    
    // Ensure absolute image URL
    let absoluteImage = image;
    if (image && !image.startsWith('http')) {
        absoluteImage = `${window.location.origin}${image.startsWith('/') ? '' : '/'}${image}`;
    }

    const setMetaTag = (attrName: string, attrValue: string, contentValue: string) => {
      if (!contentValue) return;
      let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', contentValue);
    };

    setMetaTag('name', 'description', cleanDescription);
    if (keywords) setMetaTag('name', 'keywords', keywords);
    
    setMetaTag('property', 'og:type', type);
    setMetaTag('property', 'og:url', url);
    setMetaTag('property', 'og:title', cleanTitle || siteTitle);
    setMetaTag('property', 'og:description', cleanDescription);
    setMetaTag('property', 'og:image', absoluteImage);
    setMetaTag('property', 'og:image:secure_url', absoluteImage);
    setMetaTag('property', 'og:site_name', siteTitle);
    
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', cleanTitle || siteTitle);
    setMetaTag('name', 'twitter:description', cleanDescription);
    setMetaTag('name', 'twitter:image', absoluteImage);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    // JSON-LD for Search Engines
    let script = document.querySelector('script[type="application/ld+json"]');
    if (!script) {
        script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        document.head.appendChild(script);
    }

    const schemaData = type === 'article' ? {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": cleanTitle,
      "description": cleanDescription,
      "image": [absoluteImage],
      "datePublished": publishedAt || new Date().toISOString(),
      "author": [{
          "@type": "Person",
          "name": author || "Public Tak Team"
      }]
    } : {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Public Tak",
      "url": "https://www.publictak.app/",
      "description": cleanDescription
    };

    script.textContent = JSON.stringify(schemaData);

  }, [title, description, image, url, type, publishedAt, author, keywords]);

  return null;
};

export default SEO;
