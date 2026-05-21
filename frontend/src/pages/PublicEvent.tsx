import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { eventService } from '@services/event.service';
import type { SearchResult } from '../types';
import { Card } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { FileUploadBox } from '@components/ui/FileUploadBox';
import { FaceHighlightImage } from '@components/ui/FaceHighlightImage';
import { useToast } from '../contexts/ToastContext';
import { Camera } from 'lucide-react';

export const PublicEvent: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  
  // Search State
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  
  const { showToast } = useToast();

  const handleSearch = async () => {
    if (!shareToken || !selfieFile) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const data = await eventService.searchPublicFaces(shareToken, selfieFile);
      setSearchResult(data.result);
      if (data.result.faces.length === 0) {
         showToast('No matches found for this selfie.', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Search failed', 'error');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Simple Public Header */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center">
        <div className="flex-shrink-0 flex items-center">
          <span className="text-2xl font-bold text-black tracking-tight">
            Grab<span className="text-[#FFD600]">Pic</span>
          </span>
        </div>
        <Link to="/login" className="text-sm font-medium text-gray-500 hover:text-black">
          Login
        </Link>
      </div>

      <div className="max-w-xl mx-auto">
        <Card className="p-8 shadow-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#FFD600]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-[#FFD600]" />
            </div>
            <h1 className="text-3xl font-bold text-black mb-2">Find Your Photos</h1>
            <p className="text-gray-500">Upload a selfie to instantly find all your photos from this event.</p>
          </div>
          
          <div className="space-y-6">
            {selfieFile && !searchResult ? (
              <div className="relative rounded-xl overflow-hidden bg-gray-100 h-64 border border-gray-200">
                <img src={URL.createObjectURL(selfieFile)} alt="Selfie" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setSelfieFile(null)}
                  className="absolute top-4 right-4 bg-white text-red-500 px-4 py-2 rounded-full text-sm font-medium shadow hover:bg-red-50"
                >
                  Remove & Reselect
                </button>
              </div>
            ) : !searchResult && (
              <FileUploadBox onFilesSelected={(files) => setSelfieFile(files[0])} accept="image/*" />
            )}
            
            {!searchResult && selfieFile && (
              <Button className="w-full text-lg py-3" onClick={handleSearch} isLoading={searching}>
                Search for my face
              </Button>
            )}

            {searchResult && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center">
                   <h3 className="text-xl font-bold text-green-600 mb-1">Match Found!</h3>
                   <p className="text-gray-500 text-sm">Here is a photo of you from the event.</p>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <FaceHighlightImage imageUrl={searchResult.imageUrl} faces={searchResult.faces} />
                </div>
                <Button variant="secondary" className="w-full py-3" onClick={() => { setSearchResult(null); setSelfieFile(null); }}>
                  Search for another face
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
