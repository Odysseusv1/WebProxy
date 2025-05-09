import React, { useState, useEffect } from 'react';

interface ProxyFrameProps {
  url: string;
  originalUrl: string;
}

const ProxyFrame: React.FC<ProxyFrameProps> = ({ url, originalUrl }) => {
  const [content, setContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
        }
        
        const text = await response.text();
        
        // Process the HTML to make it work in our proxy
        const processedContent = processHtml(text, originalUrl);
        setContent(processedContent);
      } catch (err) {
        console.error('Error fetching content:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch content');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchContent();
  }, [url, originalUrl]);
  
  // Process HTML to fix relative URLs and other issues
  const processHtml = (html: string, baseUrl: string): string => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const base = new URL(baseUrl);
      
      // Fix relative URLs in various elements
      const fixRelativeUrl = (element: Element, attribute: string) => {
        const value = element.getAttribute(attribute);
        if (value && !value.startsWith('http') && !value.startsWith('data:')) {
          try {
            const absoluteUrl = new URL(value, base).href;
            element.setAttribute(attribute, absoluteUrl);
          } catch (e) {
            console.warn('Failed to process URL:', value, e);
          }
        }
      };
      
      // Fix links
      doc.querySelectorAll('a').forEach(a => {
        fixRelativeUrl(a, 'href');
        
        // Modify link behavior to use our proxy
        a.onclick = (e) => {
          e.preventDefault();
          const href = a.getAttribute('href');
          if (href) {
            window.location.href = `?url=${encodeURIComponent(href)}`;
          }
        };
      });
      
      // Fix images
      doc.querySelectorAll('img').forEach(img => {
        fixRelativeUrl(img, 'src');
        if (img.hasAttribute('srcset')) {
          img.removeAttribute('srcset');
        }
      });
      
      // Fix scripts, stylesheets, etc.
      doc.querySelectorAll('script').forEach(script => {
        fixRelativeUrl(script, 'src');
      });
      
      doc.querySelectorAll('link').forEach(link => {
        fixRelativeUrl(link, 'href');
      });
      
      return doc.documentElement.outerHTML;
    } catch (err) {
      console.error('Error processing HTML:', err);
      return html; // Return original if processing fails
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-900"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 m-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
        <h3 className="font-bold">Error loading content</h3>
        <p>{error}</p>
        <p className="mt-2 text-sm">
          Note: Some websites might block proxy access or have Content Security Policies that prevent them from loading in a proxy.
        </p>
      </div>
    );
  }
  
  // Use iframe sandbox to display the content
  return (
    <div className="h-full w-full">
      <iframe
        srcDoc={content}
        className="w-full h-full border-0"
        title="Proxied content"
        sandbox="allow-same-origin allow-scripts"
      />
    </div>
  );
};

export default ProxyFrame;