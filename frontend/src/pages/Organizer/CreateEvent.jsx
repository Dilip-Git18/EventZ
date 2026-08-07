import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, MapPin, FileText, Image as ImageIcon, Plus, Ticket, ArrowLeft, CheckCircle } from 'lucide-react';

const CreateEvent = () => {
  const { apiFetch, showToast } = useAuth();
  const navigate = useNavigate();

  const categoryOptions = [
    'General Admission',
    'VIP',
    'Premium',
    'Balcony',
    'Student',
    'Early Bird',
    'Backstage',
    'Custom'
  ];

  // Step state
  const [step, setStep] = useState(1); // 1 = Details, 2 = Ticket Categories
  const [createdEvent, setCreatedEvent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states - Step 1: Details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Form states - Step 2: Add Category
  const [categoryPreset, setCategoryPreset] = useState('General Admission');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [categoryPrice, setCategoryPrice] = useState('');
  const [categoryCapacity, setCategoryCapacity] = useState('');
  const [categoriesList, setCategoriesList] = useState([]);
  const [addingCategory, setAddingCategory] = useState(false);

  // Handle file upload
  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingBanner(true);
    const formData = new FormData();
    formData.append('banner', file);

    try {
      const response = await fetch('http://localhost:5001/api/events/upload-banner', {
        method: 'POST',
        body: formData,
        credentials: 'include' // include session cookies for auth
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'File upload failed');
      
      setBannerUrl(data.bannerUrl);
      showToast('Banner uploaded successfully!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!bannerUrl) {
      showToast('Please upload a banner image first', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiFetch('/events', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          bannerUrl,
          venueName,
          venueAddress,
          startDate,
          endDate
        })
      });

      if (data.success) {
        setCreatedEvent(data.event);
        showToast('Event created successfully! Now configure categories.', 'success');
        setStep(2);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const resolvedCategoryName = categoryPreset === 'Custom' ? customCategoryName.trim() : categoryPreset;
    if (!resolvedCategoryName || !categoryPrice || !categoryCapacity) return;

    setAddingCategory(true);
    try {
      const data = await apiFetch(`/events/${createdEvent._id}/categories`, {
        method: 'POST',
        body: JSON.stringify({
          name: resolvedCategoryName,
          price: parseFloat(categoryPrice),
          capacity: parseInt(categoryCapacity)
        })
      });

      if (data.success) {
        setCategoriesList((prev) => [...prev, data.category]);
        showToast(`Category '${resolvedCategoryName}' added!`, 'success');
        // Reset category form
        setCategoryPreset('General Admission');
        setCustomCategoryName('');
        setCategoryPrice('');
        setCategoryCapacity('');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAddingCategory(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      
      {/* Back link */}
      <Link to="/organizer/dashboard" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        color: 'var(--text-secondary)',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: 500,
        marginBottom: '1.5rem',
        transition: 'var(--transition-smooth)'
      }} className="back-link">
        <ArrowLeft size={16} />
        <span>Back to Dashboard</span>
      </Link>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem' }}>
        Create New Event Listing
      </h1>

      {/* Step 1: Details form */}
      {step === 1 && (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <form onSubmit={handleCreateEvent}>
            
            <div className="form-group">
              <label className="form-label">Event Title</label>
              <div style={{ position: 'relative' }}>
                <FileText size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Neon Horizon Tour 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description / Details</label>
              <textarea
                className="form-control"
                placeholder="Describe your event line-up, guidelines, and amenities..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="4"
                required
              />
            </div>

            {/* Banner upload */}
            <div className="form-group" style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px dashed var(--glass-border)',
              borderRadius: '8px',
              padding: '1.25rem',
              textAlign: 'center'
            }}>
              <label className="form-label" style={{ marginBottom: '10px' }}>Upload Event Banner Image</label>
              
              {bannerUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={`http://localhost:5001${bannerUrl}`}
                    alt="Banner preview"
                    style={{ maxHeight: '120px', borderRadius: '4px', border: '1px solid var(--glass-border)' }}
                  />
                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setBannerUrl('')}>
                    Replace Banner
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <ImageIcon size={32} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="file"
                    accept="image/*"
                    id="banner-file"
                    onChange={handleBannerUpload}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="banner-file" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '12px', cursor: 'pointer' }}>
                    {uploadingBanner ? 'Uploading file...' : 'Choose image file'}
                  </label>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Supported: JPG, JPEG, PNG, WEBP. Max 5MB.</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Venue Name</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Madison Square Arena"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Venue Location Address</label>
              <input
                type="text"
                className="form-control"
                placeholder="Full address where venue is situated..."
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Start Date & Time</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">End Date & Time</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    required
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem', marginTop: '1rem' }} disabled={submitting}>
              {submitting ? 'Creating Event...' : 'Create Event details'}
            </button>
          </form>
        </div>
      )}

      {/* Step 2: Add Category form */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* List of categories configured so far */}
          <div className="glass-card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: '#fff', marginBottom: '1rem' }}>
              Configured Ticket Categories for {createdEvent?.title}
            </h3>

            {categoriesList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {categoriesList.map((cat, idx) => (
                  <div
                    key={cat._id || idx}
                    style={{
                      padding: '10px 14px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>{cat.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '10px' }}>
                        Capacity: {cat.capacity} tickets
                      </span>
                    </div>
                    <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>
                      ${cat.price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '1rem' }}>
                No categories added yet. You must add at least one ticket category (e.g. General Admission) to allow reservations.
              </p>
            )}
          </div>

          {/* Form to add next category */}
          <div className="glass-card">
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.2rem',
              color: '#fff',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Ticket size={18} style={{ color: 'var(--accent-purple)' }} />
              <span>Configure Ticket Category</span>
            </h3>

            <form onSubmit={handleAddCategory}>
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <select
                  className="form-control"
                  value={categoryPreset}
                  onChange={(e) => setCategoryPreset(e.target.value)}
                  required
                >
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {categoryPreset === 'Custom' && (
                <div className="form-group">
                  <label className="form-label">Custom Category Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. VIP access, General Admission"
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Ticket Price ($)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="99.99"
                    value={categoryPrice}
                    onChange={(e) => setCategoryPrice(e.target.value)}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Inventory Capacity</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="250"
                    value={categoryCapacity}
                    onChange={(e) => setCategoryCapacity(e.target.value)}
                    min="1"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={addingCategory}>
                <Plus size={16} />
                <span>{addingCategory ? 'Adding Category...' : 'Add Ticket Category'}</span>
              </button>
            </form>
          </div>

          {/* Finish CTA */}
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem' }}
            disabled={categoriesList.length === 0}
            onClick={() => {
              showToast('Event fully published!', 'success');
              navigate('/organizer/dashboard');
            }}
          >
            <CheckCircle size={16} />
            <span>Finalize & Publish Event Listing</span>
          </button>
        </div>
      )}

      <style>{`
        .back-link:hover {
          color: #fff !important;
          transform: translateX(-2px);
        }
      `}</style>
    </div>
  );
};

export default CreateEvent;
