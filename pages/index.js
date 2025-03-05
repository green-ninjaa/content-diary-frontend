import React, { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = typeof window !== 'undefined' 
  ? window.ENV_BACKEND_URL || 'https://your-backend-url.com'
  : 'https://your-backend-url.com';

const RAPIDAPI_KEY = typeof window !== 'undefined'
  ? window.ENV_RAPIDAPI_KEY || ''
  : '';

const ContentDiary = () => {
  const [search, setSearch] = useState("");
  const [content, setContent] = useState([]);
  const [contentType, setContentType] = useState("movie");
  const [loading, setLoading] = useState(false);
  const [watchedContent, setWatchedContent] = useState([]);
  const [stashItems, setStashItems] = useState([]);
  const [activeSection, setActiveSection] = useState("search");
  const [stashForm, setStashForm] = useState({
    title: "",
    description: "",
    type: "link",
    url: "",
    file: null
  });
  const [error, setError] = useState("");

  useEffect(() => {
    fetchWatchedContent();
    fetchStashItems();
  }, [contentType]);

  const fetchWatchedContent = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/content?type=${contentType}`);
      if (!response.ok) throw new Error('Failed to fetch watched content');
      const data = await response.json();
      setWatchedContent(data);
    } catch (error) {
      setError(`Failed to fetch ${contentType} watchlist`);
      console.error(`Error fetching ${contentType} watchlist:`, error);
    }
  };

  const fetchStashItems = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/stash`);
      if (!response.ok) throw new Error('Failed to fetch stash items');
      const data = await response.json();
      setStashItems(data);
    } catch (error) {
      setError("Failed to fetch stash items");
      console.error("Error fetching stash items:", error);
    }
  };

  const fetchContent = async () => {
    if (!search.trim()) return;
    setLoading(true);
    setError("");

    try {
      let apiUrl = "";
      let headers = {};

      // Different API endpoints based on content type
      switch (contentType) {
        case "movie":
          apiUrl = `https://imdb-com.p.rapidapi.com/search?searchTerm=${encodeURIComponent(search)}`;
          headers = {
            'x-rapidapi-host': 'imdb-com.p.rapidapi.com',
            'x-rapidapi-key': RAPIDAPI_KEY,
          };
          break;
        case "tv":
          apiUrl = `https://imdb-com.p.rapidapi.com/search?searchTerm=${encodeURIComponent(search)}`;
          headers = {
            'x-rapidapi-host': 'imdb-com.p.rapidapi.com',
            'x-rapidapi-key': RAPIDAPI_KEY,
          };
          break;
        case "anime":
          apiUrl = `https://myanimelist.p.rapidapi.com/anime/search/${encodeURIComponent(search)}`;
          headers = {
            'x-rapidapi-host': 'myanimelist.p.rapidapi.com',
            'x-rapidapi-key': RAPIDAPI_KEY,
          };
          break;
      }

      const response = await fetch(apiUrl, { method: 'GET', headers });
      
      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();
      let formattedContent = [];

      switch (contentType) {
        case "movie":
        case "tv":
          formattedContent = (data.data?.mainSearch?.edges || [])
            .map((item) => {
              const entity = item.node?.entity;
              return {
                id: entity?.id || "N/A",
                title: entity?.titleText?.originalTitleText?.text || entity?.titleText?.text || "Unknown Title",
                image: entity?.primaryImage?.url || "",
                year: entity?.releaseYear?.year || "N/A",
                type: contentType
              };
            })
            .filter((item) => item.image !== "");
          break;
        case "anime":
          formattedContent = (data || [])
            .map((anime) => ({
              id: anime.mal_id.toString(),
              title: anime.title,
              image: anime.images?.jpg?.image_url || "",
              year: anime.aired?.from ? new Date(anime.aired.from).getFullYear() : "N/A",
              type: "anime"
            }));
          break;
      }

      setContent(formattedContent);
    } catch (error) {
      setError(`Failed to fetch ${contentType}. Please try again later.`);
      console.error(`Error fetching ${contentType}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWatched = async (item) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...item,
          dateAdded: new Date().toISOString()
        }),
      });

      if (!response.ok) throw new Error('Failed to add content');
      
      const savedItem = await response.json();
      setWatchedContent([...watchedContent, savedItem]);
    } catch (error) {
      setError(`Failed to add ${contentType} to watchlist`);
      console.error(`Error adding ${contentType}:`, error);
    }
  };

  const handleRemoveFromWatched = async (item) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/content/${item.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove content');
      
      setWatchedContent(watchedContent.filter((m) => m.id !== item.id));
    } catch (error) {
      setError(`Failed to remove ${contentType} from watchlist`);
      console.error(`Error removing ${contentType}:`, error);
    }
  };

  const handleStashFormSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    
    formData.append('title', stashForm.title);
    formData.append('description', stashForm.description);
    
    if (stashForm.file) {
      formData.append('file', stashForm.file);
      formData.append('type', 'file');
    } else {
      formData.append('type', stashForm.type);
      formData.append('url', stashForm.url);
    }

    try {
      const response = await axios.post(`${BACKEND_URL}/api/stash`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setStashItems([response.data, ...stashItems]);
      // Reset form
      setStashForm({
        title: "",
        description: "",
        type: "link",
        url: "",
        file: null
      });
    } catch (error) {
      setError("Failed to add stash item");
      console.error("Error adding stash item:", error);
    }
  };

  const handleRemoveStashItem = async (id) => {
    try {
      await fetch(`${BACKEND_URL}/api/stash/${id}`, {
        method: 'DELETE',
      });
      
      setStashItems(stashItems.filter((item) => item._id !== id));
    } catch (error) {
      setError("Failed to remove stash item");
      console.error("Error removing stash item:", error);
    }
  };

  const renderStashItems = () => {
    return stashItems.map((item) => (
      <div 
        key={item._id} 
        className="bg-gray-800 p-4 rounded-lg flex justify-between items-center"
      >
        <div>
          <h3 className="font-bold">{item.title}</h3>
          <p className="text-sm text-gray-400">{item.type}</p>
          {item.type === 'file' ? (
            <a 
              href={`${BACKEND_URL}${item.url}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-400 hover:underline"
            >
              View File
            </a>
          ) : (
            <a 
              href={item.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-400 hover:underline truncate block max-w-xs"
            >
              {item.url}
            </a>
          )}
        </div>
        <button 
          onClick={() => handleRemoveStashItem(item._id)}
          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
        >
          Remove
        </button>
      </div>
    ));
  };

  const ContentCard = ({ content, isWatched, onAction }) => (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col items-center transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
      <div className="relative w-40 h-56 overflow-hidden rounded-lg border border-gray-700">
        {content.image ? (
          <img
            src={content.image}
            alt={content.title}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <span className="text-gray-400 text-4xl">🎬</span>
          </div>
        )}
      </div>
      <h2 className="text-lg mt-3 text-center font-semibold line-clamp-2">{content.title}</h2>
      <p className="text-sm text-gray-400 mt-1">{content.year}</p>
      <button
        onClick={() => onAction(content)}
        className={`mt-3 px-4 py-2 text-sm rounded-lg font-medium transition-all duration-300 ${
          isWatched
            ? "bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
            : "bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
        }`}
      >
        {isWatched ? "Remove" : "Add to Watched"}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col items-center p-6">
      <div className="w-full max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            Content Diary
          </h1>
          <p className="text-gray-400">Track your movies, TV shows, and anime</p>
        </div>

        <div className="flex space-x-4 mb-6 justify-center">
          {["movie", "tv", "anime"].map((type) => (
            <button
              key={type}
              onClick={() => {
                setContentType(type);
                setActiveSection("search");
              }}
              className={`px-4 py-2 rounded-lg capitalize ${
                contentType === type 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {type}
            </button>
          ))}
          <button
            onClick={() => setActiveSection("stash")}
            className={`px-4 py-2 rounded-lg ${
              activeSection === "stash"
                ? "bg-purple-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Stash
          </button>
        </div>

        {activeSection === "search" ? (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="flex-1 flex space-x-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && fetchContent()}
                    placeholder={`Search ${contentType}s...`}
                    className="w-full p-3 pl-10 rounded-lg bg-gray-800 border border-gray-600 text-white transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
                </div>
                <button
                  onClick={fetchContent}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? "Loading..." : "Search"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {loading ? (
                <div className="col-span-full text-center py-12">
                  <div className="text-gray-400">Searching...</div>
                </div>
              ) : content.length === 0 ? (
                <div className="col-span-full text-center text-gray-400 py-12">
                  {search.trim() ? `No ${contentType}s found.` : `Start searching for ${contentType}s!`}
                </div>
              ) : (
                content.map((item) => (
                  <ContentCard
                    key={item.id}
                    content={item}
                    isWatched={watchedContent.some((m) => m.id === item.id)}
                    onAction={handleAddToWatched}
                  />
                ))
              )}
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <form 
              onSubmit={handleStashFormSubmit} 
              className="bg-gray-800 p-6 rounded-lg space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Stash Type
                </label>
                <select
                  value={stashForm.type}
                  onChange={(e) => setStashForm({...stashForm, type: e.target.value})}
                  className="
