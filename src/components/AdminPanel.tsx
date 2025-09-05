import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Plus,
  Settings,
  User,
  LogOut,
  Save,
  Eye,
  Copy,
  Trash2,
  Star,
  Edit3,
  Globe,
  Smartphone,
  Briefcase,
  Palette,
  Users,
  BarChart3,
  Menu,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { CardPreview } from './CardPreview';
import { ImageUpload } from './ImageUpload';
import { MediaUpload } from './MediaUpload';
import { ReviewsManager } from './ReviewsManager';
import type { Database } from '../lib/supabase';

type BusinessCard = Database['public']['Tables']['business_cards']['Row'];
type SocialLink = Database['public']['Tables']['social_links']['Row'];

interface FormData {
  // Basic Information
  title: string;
  username: string;
  globalUsername: string;
  company: string;
  tagline: string;
  profession: string;
  avatar_url: string;
  card_name: string;
  card_type: 'personal' | 'business' | 'creative' | 'professional' | 'other';

  // Contact Information
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  address: string;
  map_link: string;

  // Theme and Layout
  theme: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    name: string;
  };
  shape: string;
  layout: {
    style: string;
    alignment: string;
    font: string;
  };
  is_published: boolean;
  is_primary: boolean;
}

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'document';
  url: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
}

interface Review {
  id: string;
  review_url: string;
  title: string;
  created_at: string;
}

const THEMES = [
  { name: 'Ocean Blue', primary: '#3B82F6', secondary: '#1E40AF', background: '#FFFFFF', text: '#1F2937' },
  { name: 'Forest Green', primary: '#10B981', secondary: '#047857', background: '#FFFFFF', text: '#1F2937' },
  { name: 'Sunset Orange', primary: '#F59E0B', secondary: '#D97706', background: '#FFFFFF', text: '#1F2937' },
  { name: 'Royal Purple', primary: '#8B5CF6', secondary: '#7C3AED', background: '#FFFFFF', text: '#1F2937' },
  { name: 'Rose Pink', primary: '#EC4899', secondary: '#DB2777', background: '#FFFFFF', text: '#1F2937' },
  { name: 'Dark Mode', primary: '#60A5FA', secondary: '#3B82F6', background: '#1F2937', text: '#F9FAFB' },
];

const CARD_TYPES = [
  { value: 'personal', label: 'Personal', icon: User, description: 'For personal networking and social connections' },
  { value: 'business', label: 'Business', icon: Briefcase, description: 'For professional business networking' },
  { value: 'creative', label: 'Creative', icon: Palette, description: 'For artists, designers, and creative professionals' },
  { value: 'professional', label: 'Professional', icon: Users, description: 'For consultants and service providers' },
  { value: 'other', label: 'Other', icon: Globe, description: 'For specialized or custom purposes' },
];

export const AdminPanel: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'cards' | 'create' | 'analytics'>('cards');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Multiple cards state
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<BusinessCard | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    title: '',
    username: '',
    globalUsername: '',
    company: '',
    tagline: '',
    profession: '',
    avatar_url: '',
    card_name: '',
    card_type: 'personal',
    phone: '',
    whatsapp: '',
    email: user?.email || '',
    website: '',
    address: '',
    map_link: '',
    theme: THEMES[0],
    shape: 'rectangle',
    layout: {
      style: 'modern',
      alignment: 'center',
      font: 'Inter',
    },
    is_published: false,
    is_primary: false,
  });

  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile error:', profileError);
      } else if (profileData) {
        setProfile(profileData);
        setFormData(prev => ({
          ...prev,
          globalUsername: profileData.global_username || '',
          email: profileData.email || user.email || '',
        }));
      }

      // Load all cards for this user
      const { data: cardsData, error: cardsError } = await supabase
        .from('business_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (cardsError) {
        console.error('Cards error:', cardsError);
      } else if (cardsData && cardsData.length > 0) {
        setCards(cardsData);
        // Set the primary card as active, or the first card if no primary
        const primaryCard = cardsData.find(card => card.is_primary) || cardsData[0];
        setActiveCardId(primaryCard.id);
        loadCardData(primaryCard);
      }

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCardData = async (card: BusinessCard) => {
    if (!card) return;

    try {
      // Load card data into form
      const theme = (card.theme as any) || THEMES[0];
      const layout = (card.layout as any) || { style: 'modern', alignment: 'center', font: 'Inter' };

      setFormData({
        title: card.title || '',
        username: card.slug || '',
        globalUsername: profile?.global_username || '',
        company: card.company || '',
        tagline: card.bio || '',
        profession: card.position || '',
        avatar_url: card.avatar_url || '',
        card_name: (card as any).card_name || '',
        card_type: (card as any).card_type || 'personal',
        phone: card.phone || '',
        whatsapp: card.whatsapp || '',
        email: card.email || user?.email || '',
        website: card.website || '',
        address: card.address || '',
        map_link: card.map_link || '',
        theme,
        shape: card.shape || 'rectangle',
        layout,
        is_published: card.is_published,
        is_primary: (card as any).is_primary || false,
      });

      // Load social links
      const { data: socialData, error: socialError } = await supabase
        .from('social_links')
        .select('*')
        .eq('card_id', card.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (socialError) {
        console.error('Social links error:', socialError);
      } else {
        setSocialLinks(socialData || []);
      }

      // Load media items
      const { data: mediaData, error: mediaError } = await supabase
        .from('media_items')
        .select('*')
        .eq('card_id', card.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (mediaError) {
        console.error('Media error:', mediaError);
      } else {
        const formattedMedia: MediaItem[] = (mediaData || []).map(item => ({
          id: item.id,
          type: item.type as 'image' | 'video' | 'document',
          url: item.url,
          title: item.title,
          description: item.description || undefined,
          thumbnail_url: item.thumbnail_url || undefined,
        }));
        setMediaItems(formattedMedia);
      }

      // Load reviews
      const { data: reviewData, error: reviewError } = await supabase
        .from('review_links')
        .select('*')
        .eq('card_id', card.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (reviewError) {
        console.error('Review error:', reviewError);
      } else {
        const formattedReviews: Review[] = (reviewData || []).map(item => ({
          id: item.id,
          review_url: item.review_url,
          title: item.title,
          created_at: item.created_at,
        }));
        setReviews(formattedReviews);
      }

    } catch (error) {
      console.error('Error loading card data:', error);
    }
  };

  const handleCardSelect = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      setActiveCardId(cardId);
      loadCardData(card);
      setEditingCard(null);
    }
  };

  const handleCreateNewCard = () => {
    setEditingCard(null);
    setActiveCardId(null);
    setFormData({
      title: '',
      username: '',
      globalUsername: profile?.global_username || '',
      company: '',
      tagline: '',
      profession: '',
      avatar_url: '',
      card_name: '',
      card_type: 'personal',
      phone: '',
      whatsapp: '',
      email: user?.email || '',
      website: '',
      address: '',
      map_link: '',
      theme: THEMES[0],
      shape: 'rectangle',
      layout: {
        style: 'modern',
        alignment: 'center',
        font: 'Inter',
      },
      is_published: false,
      is_primary: cards.length === 0, // First card is primary
    });
    setSocialLinks([]);
    setMediaItems([]);
    setReviews([]);
    setActiveTab('create');
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this card? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('business_cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;

      // Remove from local state
      const updatedCards = cards.filter(card => card.id !== cardId);
      setCards(updatedCards);

      // If we deleted the active card, switch to another one
      if (activeCardId === cardId) {
        if (updatedCards.length > 0) {
          const nextCard = updatedCards[0];
          setActiveCardId(nextCard.id);
          loadCardData(nextCard);
        } else {
          setActiveCardId(null);
          handleCreateNewCard();
        }
      }

      alert('Card deleted successfully!');
    } catch (error) {
      console.error('Error deleting card:', error);
      alert('Failed to delete card. Please try again.');
    }
  };

  const handleDuplicateCard = async (cardId: string) => {
    const cardToDuplicate = cards.find(c => c.id === cardId);
    if (!cardToDuplicate) return;

    try {
      setSaving(true);

      // Create new card data
      const newCardData = {
        user_id: user!.id,
        title: cardToDuplicate.title ? `${cardToDuplicate.title} (Copy)` : null,
        company: cardToDuplicate.company,
        position: cardToDuplicate.position,
        phone: cardToDuplicate.phone,
        email: cardToDuplicate.email,
        website: cardToDuplicate.website,
        avatar_url: cardToDuplicate.avatar_url,
        bio: cardToDuplicate.bio,
        whatsapp: cardToDuplicate.whatsapp,
        address: cardToDuplicate.address,
        map_link: cardToDuplicate.map_link,
        theme: cardToDuplicate.theme,
        shape: cardToDuplicate.shape,
        layout: cardToDuplicate.layout,
        is_published: false, // New cards start as drafts
        card_type: (cardToDuplicate as any).card_type || 'personal',
        card_name: `${(cardToDuplicate as any).card_name || 'Card'} (Copy)`,
        is_primary: false, // Duplicates are never primary
      };

      const { data: newCard, error: cardError } = await supabase
        .from('business_cards')
        .insert(newCardData)
        .select()
        .single();

      if (cardError) throw cardError;

      // Duplicate social links
      const { data: originalSocialLinks } = await supabase
        .from('social_links')
        .select('*')
        .eq('card_id', cardId);

      if (originalSocialLinks && originalSocialLinks.length > 0) {
        const newSocialLinks = originalSocialLinks.map(link => ({
          card_id: newCard.id,
          platform: link.platform,
          username: link.username,
          url: link.url,
          display_order: link.display_order,
          is_active: link.is_active,
          is_auto_synced: link.is_auto_synced,
        }));

        await supabase.from('social_links').insert(newSocialLinks);
      }

      // Reload cards
      await loadUserData();
      
      // Switch to the new card
      setActiveCardId(newCard.id);
      loadCardData(newCard);

      alert('Card duplicated successfully!');
    } catch (error) {
      console.error('Error duplicating card:', error);
      alert('Failed to duplicate card. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Validate required fields
      if (!formData.title.trim()) {
        alert('Please enter your name');
        return;
      }

      const cardData = {
        user_id: user.id,
        title: formData.title,
        company: formData.company || null,
        position: formData.profession || null,
        phone: formData.phone || null,
        email: formData.email || null,
        website: formData.website || null,
        avatar_url: formData.avatar_url || null,
        bio: formData.tagline || null,
        whatsapp: formData.whatsapp || null,
        address: formData.address || null,
        map_link: formData.map_link || null,
        theme: formData.theme,
        shape: formData.shape,
        layout: formData.layout,
        is_published: formData.is_published,
        card_type: formData.card_type,
        card_name: formData.card_name || null,
        is_primary: formData.is_primary,
      };

      let savedCard: BusinessCard;

      if (activeCardId) {
        // Update existing card
        const { data, error } = await supabase
          .from('business_cards')
          .update(cardData)
          .eq('id', activeCardId)
          .select()
          .single();

        if (error) throw error;
        savedCard = data;
      } else {
        // Create new card
        const { data, error } = await supabase
          .from('business_cards')
          .insert(cardData)
          .select()
          .single();

        if (error) throw error;
        savedCard = data;
        setActiveCardId(savedCard.id);
      }

      // Reload cards list
      await loadUserData();

      alert('Card saved successfully!');
      setActiveTab('cards');
    } catch (error) {
      console.error('Error saving card:', error);
      alert('Failed to save card. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleThemeChange = (theme: typeof THEMES[0]) => {
    setFormData(prev => ({
      ...prev,
      theme
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">Cards</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <button
            onClick={() => setActiveTab('cards')}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors mb-1 ${
              activeTab === 'cards'
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            My Cards ({cards.length})
          </button>
          
          <button
            onClick={() => setActiveTab('create')}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors mb-1 ${
              activeTab === 'create'
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Plus className="w-5 h-5" />
            Create Card
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors mb-1 ${
              activeTab === 'analytics'
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Analytics
          </button>
        </nav>

        {/* Cards List */}
        {cards.length > 0 && (
          <div className="mt-6 px-3">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Your Cards</h3>
            <div className="space-y-2">
              {cards.map((card) => {
                const cardType = CARD_TYPES.find(type => type.value === (card as any).card_type) || CARD_TYPES[0];
                const CardIcon = cardType.icon;
                
                return (
                  <div
                    key={card.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      activeCardId === card.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleCardSelect(card.id)}
                  >
                    <div className="flex items-center gap-3">
                      <CardIcon className="w-4 h-4 text-gray-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {(card as any).card_name || card.title || 'Untitled Card'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {cardType.label}
                          {(card as any).is_primary && (
                            <span className="ml-1 inline-flex items-center">
                              <Star className="w-3 h-3 text-yellow-500 fill-current" />
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {card.is_published && (
                          <div className="w-2 h-2 bg-green-500 rounded-full" title="Published" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateCard(card.id);
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Duplicate"
                        >
                          <Copy className="w-3 h-3 text-gray-400" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCard(card.id);
                          }}
                          className="p-1 hover:bg-red-100 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.name || user?.email}
              </p>
              <p className="text-xs text-gray-500">
                {cards.length} card{cards.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {activeTab === 'cards' ? 'My Cards' : 
                 activeTab === 'create' ? 'Create Card' : 'Analytics'}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {activeTab === 'create' && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? 'Saving...' : 'Save Card'}
                </button>
              )}
              
              <button
                onClick={handleCreateNewCard}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Card
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'cards' && (
            <div className="space-y-6">
              {cards.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Cards Yet</h3>
                  <p className="text-gray-600 mb-6">
                    Create your first digital business card to get started.
                  </p>
                  <button
                    onClick={handleCreateNewCard}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Create Your First Card
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cards.map((card) => {
                    const cardType = CARD_TYPES.find(type => type.value === (card as any).card_type) || CARD_TYPES[0];
                    const CardIcon = cardType.icon;
                    
                    return (
                      <div key={card.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <CardIcon className="w-5 h-5 text-gray-600" />
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  {(card as any).card_name || card.title || 'Untitled Card'}
                                </h3>
                                <p className="text-sm text-gray-500">{cardType.label}</p>
                              </div>
                            </div>
                            {(card as any).is_primary && (
                              <Star className="w-5 h-5 text-yellow-500 fill-current" />
                            )}
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Status:</span>
                              <span className={`font-medium ${card.is_published ? 'text-green-600' : 'text-gray-600'}`}>
                                {card.is_published ? 'Published' : 'Draft'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Views:</span>
                              <span className="font-medium text-gray-900">{card.view_count || 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Created:</span>
                              <span className="font-medium text-gray-900">
                                {new Date(card.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setActiveCardId(card.id);
                                loadCardData(card);
                                setActiveTab('create');
                              }}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              <Edit3 className="w-4 h-4" />
                              Edit
                            </button>
                            
                            {card.is_published && card.slug && (
                              <a
                                href={`/c/${card.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                title="View Card"
                              >
                                <Eye className="w-4 h-4" />
                              </a>
                            )}
                            
                            <button
                              onClick={() => handleDuplicateCard(card.id)}
                              className="flex items-center justify-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                              title="Duplicate"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Form Section */}
              <div className="space-y-8">
                {/* Card Type Selection */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Card Type</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {CARD_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          onClick={() => handleInputChange('card_type', type.value)}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            formData.card_type === type.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <Icon className={`w-5 h-5 ${
                              formData.card_type === type.value ? 'text-blue-600' : 'text-gray-600'
                            }`} />
                            <span className={`font-medium ${
                              formData.card_type === type.value ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {type.label}
                            </span>
                          </div>
                          <p className={`text-sm ${
                            formData.card_type === type.value ? 'text-blue-700' : 'text-gray-600'
                          }`}>
                            {type.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Basic Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Card Name *
                      </label>
                      <input
                        type="text"
                        value={formData.card_name}
                        onChange={(e) => handleInputChange('card_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Main Card, Business Card, Creative Portfolio"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company
                      </label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => handleInputChange('company', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Company name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={formData.profession}
                        onChange={(e) => handleInputChange('profession', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Your job title"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bio/Tagline
                      </label>
                      <textarea
                        value={formData.tagline}
                        onChange={(e) => handleInputChange('tagline', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Brief description about yourself"
                      />
                    </div>
                  </div>
                </div>

                {/* Profile Image */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Image</h2>
                  <ImageUpload
                    currentImageUrl={formData.avatar_url}
                    onImageChange={(url) => handleInputChange('avatar_url', url)}
                    userId={user!.id}
                  />
                </div>

                {/* Contact Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="your@email.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={formData.whatsapp}
                        onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website
                      </label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://yourwebsite.com"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Your business address"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Map Link
                      </label>
                      <input
                        type="url"
                        value={formData.map_link}
                        onChange={(e) => handleInputChange('map_link', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Google Maps link"
                      />
                    </div>
                  </div>
                </div>

                {/* Theme Selection */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Theme</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {THEMES.map((theme) => (
                      <button
                        key={theme.name}
                        onClick={() => handleThemeChange(theme)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          formData.theme.name === theme.name
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: theme.primary }}
                          />
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: theme.secondary }}
                          />
                        </div>
                        <p className="text-sm font-medium text-gray-900">{theme.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Card Settings</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Published</label>
                        <p className="text-sm text-gray-500">Make this card visible to the public</p>
                      </div>
                      <button
                        onClick={() => handleInputChange('is_published', !formData.is_published)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          formData.is_published ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.is_published ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Primary Card</label>
                        <p className="text-sm text-gray-500">Set as your main business card</p>
                      </div>
                      <button
                        onClick={() => handleInputChange('is_primary', !formData.is_primary)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          formData.is_primary ? 'bg-yellow-500' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.is_primary ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Media Gallery */}
                {activeCardId && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Media Gallery</h2>
                    <MediaUpload
                      cardId={activeCardId}
                      mediaItems={mediaItems}
                      onMediaChange={setMediaItems}
                      userId={user!.id}
                    />
                  </div>
                )}

                {/* Reviews */}
                {activeCardId && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <ReviewsManager
                      cardId={activeCardId}
                      reviews={reviews}
                      onReviewsChange={setReviews}
                    />
                  </div>
                )}
              </div>

              {/* Preview Section */}
              <div className="lg:sticky lg:top-6">
                <CardPreview
                  formData={formData}
                  socialLinks={socialLinks}
                  mediaItems={mediaItems}
                  reviews={reviews}
                />
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Analytics Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {cards.reduce((sum, card) => sum + (card.view_count || 0), 0)}
                    </div>
                    <div className="text-sm text-gray-500">Total Views</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {cards.filter(card => card.is_published).length}
                    </div>
                    <div className="text-sm text-gray-500">Published Cards</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">{cards.length}</div>
                    <div className="text-sm text-gray-500">Total Cards</div>
                  </div>
                </div>
              </div>

              {/* Individual Card Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => {
                  const cardType = CARD_TYPES.find(type => type.value === (card as any).card_type) || CARD_TYPES[0];
                  const CardIcon = cardType.icon;
                  
                  return (
                    <div key={card.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <CardIcon className="w-5 h-5 text-gray-600" />
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {(card as any).card_name || card.title || 'Untitled Card'}
                          </h3>
                          <p className="text-sm text-gray-500">{cardType.label}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Views:</span>
                          <span className="font-medium text-gray-900">{card.view_count || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Status:</span>
                          <span className={`text-sm font-medium ${card.is_published ? 'text-green-600' : 'text-gray-600'}`}>
                            {card.is_published ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Created:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {new Date(card.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};