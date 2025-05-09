import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, ArrowRight, History, Share2, X, ExternalLink } from 'lucide-react';
import ProxyFrame from './ProxyFrame';
import HistoryDrawer from './HistoryDrawer';
import { HistoryItem } from '../types';

const ProxyApp: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [proxyUrl, setProxyUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [navigationStack, setNavigationStack] = useState<string[]>([]);
  const [currentPosition, setCurrentPosition] = useState<number>(-1);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Parse URL from query parameters on initial load
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlParam = params.get('url');
    
    if (urlParam) {
      setUrl(urlParam);
      loadUrl(urlParam);
    }
  }, [location.search]);

  const loadUrl = (inputUrl: string) => {
    setError(null);
    setIsLoading(true);
    
    // Basic URL validation
    let processedUrl = inputUrl.trim();
    if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
      processedUrl = 'https://' + processedUrl;
    }
    
    try {
      // Validate URL format
      new URL(processedUrl);
      
      // Create proxy URL using AllOrigins API
      const encodedUrl = encodeURIComponent(processedUrl);
      const newProxyUrl = `https://api.allorigins.win/raw?url=${encodedUrl}`;
      
      // Update navigation stack
      if (currentPosition < navigationStack.length - 1) {
        // If we've gone back and are now navigating to a new URL, trim the stack
        setNavigationStack(prev => [...prev.slice(0, currentPosition + 1), processedUrl]);
      } else {
        setNavigationStack(prev => [...prev, processedUrl]);
      }
      setCurrentPosition(prev => prev + 1);
      
      // Add to history
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        url: processedUrl,
        timestamp: new Date().toISOString(),
        title: new URL(processedUrl).hostname
      };
      
      setHistory(prev => [newHistoryItem, ...prev]);
      setProxyUrl(newProxyUrl);
      
      // Update URL in browser for sharing
      const searchParams = new URLSearchParams(location.search);
      searchParams.set('url', processedUrl);
      navigate({ search: searchParams.toString() }, { replace: true });
      
      setUrl(processedUrl);
    } catch (err) {
      setError('Invalid URL format. Please enter a valid web address.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url) {
      loadUrl(url);
    }
  };
  
  const handleGoBack = () => {
    if (currentPosition > 0) {
      setCurrentPosition(prev => prev - 1);
      const prevUrl = navigationStack[currentPosition - 1];
      setUrl(prevUrl);
      loadUrl(prevUrl);
    }
  };
  
  const handleGoForward = () => {
    if (currentPosition < navigationStack.length - 1) {
      setCurrentPosition(prev => prev + 1);
      const nextUrl = navigationStack[currentPosition + 1];
      setUrl(nextUrl);
      loadUrl(nextUrl);
    }
  };
  
  const handleClearUrl = () => {
    setUrl('');
    setProxyUrl('');
    setError(null);
  };
  
  const handleHistoryItemClick = (historyUrl: string) => {
    setUrl(historyUrl);
    loadUrl(historyUrl);
    setShowHistory(false);
  };
  
  const handleShareUrl = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shared from Web Proxy',
          url: window.location.href
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('URL copied to clipboard!');
    }
  };
  
  const handleOpenExternal = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header with controls */}
      <header className="bg-indigo-900 text-white p-4 shadow-md">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Web Proxy</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-2 rounded-full hover:bg-indigo-800 transition-colors duration-200"
                aria-label="Toggle history"
              >
                <History size={20} />
              </button>
              {url && (
                <>
                  <button
                    onClick={handleShareUrl}
                    className="p-2 rounded-full hover:bg-indigo-800 transition-colors duration-200"
                    aria-label="Share URL"
                  >
                    <Share2 size={20} />
                  </button>
                  <button
                    onClick={handleOpenExternal}
                    className="p-2 rounded-full hover:bg-indigo-800 transition-colors duration-200"
                    aria-label="Open in new tab"
                  >
                    <ExternalLink size={20} />
                  </button>
                </>
              )}
            </div>
          </div>
          
          <div className="mt-4 flex items-center">
            <button
              onClick={handleGoBack}
              disabled={currentPosition <= 0}
              className={`p-2 rounded-l-md ${
                currentPosition <= 0 ? 'bg-gray-600 cursor-not-allowed' : 'bg-indigo-800 hover:bg-indigo-700'
              } transition-colors duration-200`}
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
            <button
              onClick={handleGoForward}
              disabled={currentPosition >= navigationStack.length - 1}
              className={`p-2 rounded-r-md mr-2 ${
                currentPosition >= navigationStack.length - 1 ? 'bg-gray-600 cursor-not-allowed' : 'bg-indigo-800 hover:bg-indigo-700'
              } transition-colors duration-200`}
              aria-label="Go forward"
            >
              <ArrowRight size={20} />
            </button>
            
            <form onSubmit={handleSubmit} className="flex-1 flex">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter URL to proxy..."
                  className="block w-full pl-10 pr-10 py-2 border border-indigo-700 rounded-md bg-indigo-800 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {url && (
                  <button
                    type="button"
                    onClick={handleClearUrl}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <X size={16} className="text-gray-300 hover:text-white" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="ml-2 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-500 transition-colors duration-200"
              >
                Proxy
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1 overflow-hidden bg-white">
        {error && (
          <div className="p-4 m-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-900"></div>
          </div>
        )}
        
        {!isLoading && proxyUrl && !error && (
          <ProxyFrame url={proxyUrl} originalUrl={url} />
        )}
        
        {!isLoading && !proxyUrl && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="max-w-lg">
              <h2 className="text-2xl font-bold text-indigo-900 mb-4">Welcome to Web Proxy</h2>
              <p className="text-gray-600 mb-8">
                Enter a URL in the search bar above to browse websites through our proxy. 
                This can help bypass certain restrictions or browse anonymously.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-indigo-800 mb-2">Bypass Restrictions</h3>
                  <p className="text-sm text-gray-600">Access websites that might be blocked on your network.</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-indigo-800 mb-2">Privacy</h3>
                  <p className="text-sm text-gray-600">Browse websites with an additional layer of privacy.</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-indigo-800 mb-2">Simple to Use</h3>
                  <p className="text-sm text-gray-600">Just enter any URL and click the Proxy button to get started.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* History drawer */}
      <HistoryDrawer
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={history}
        onItemClick={handleHistoryItemClick}
      />
    </div>
  );
};

export default ProxyApp;