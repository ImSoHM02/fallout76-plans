import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import weaponData from '../weaponData.json';
import Tooltip from './Tooltip';
import './TradeBoard.css';

const TradeBoard = ({ session }) => {
  const [tradeListings, setTradeListings] = useState([]);
  const [userStorage, setUserStorage] = useState([]);
  const [newListing, setNewListing] = useState({
    storage_item: null,
    quantity: '1',
    trade_for: '',
    trade_details: '',
    contact_info: '',
    is_public: true
  });
  const [editingListing, setEditingListing] = useState(null);

  const fetchTradeListings = useCallback(async () => {
    if (session && session.user) {
      const { data, error } = await supabase
        .from('trade_listings')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) console.error('Error fetching trade listings:', error);
      else {
        console.log('Fetched trade listings:', data);
        setTradeListings(data);
      }
    }
  }, [session]);

  const fetchUserStorage = useCallback(async () => {
    if (session && session.user) {
      const { data, error } = await supabase
        .from('weapon_storage')
        .select('*')
        .eq('user_id', session.user.id);
      if (error) console.error('Error fetching user storage:', error);
      else {
        console.log('Fetched user storage:', data);
        setUserStorage(data);
      }
    }
  }, [session]);

  useEffect(() => {
    fetchTradeListings();
    fetchUserStorage();
  }, [fetchTradeListings, fetchUserStorage]);

  useEffect(() => {
    console.log('newListing updated:', newListing);
  }, [newListing]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let updatedValue = value;

    if (name === 'quantity') {
      updatedValue = Math.min(Math.max(1, parseInt(value) || 1), 99).toString();
    } else if (name === 'trade_for' || name === 'trade_details') {
      updatedValue = value.slice(0, 100);
    } else if (name === 'contact_info') {
      updatedValue = value.slice(0, 40);
    }

    setNewListing({ ...newListing, [name]: name === 'is_public' ? value === 'true' : updatedValue });
  };

  const handleStorageItemSelect = (e) => {
    const selectedItemId = e.target.value;
    const selectedItem = userStorage.find(item => item.id.toString() === selectedItemId);
    if (selectedItem) {
      setNewListing(prevState => ({
        ...prevState,
        storage_item: selectedItem,
        quantity: '1'
      }));
    } else {
      console.error('Selected item not found in user storage');
      setNewListing(prevState => ({
        ...prevState,
        storage_item: null,
        quantity: '1'
      }));
    }
  };

  const handleEdit = (listing) => {
    setEditingListing(listing);
    const storageItem = userStorage.find(item => item.weapon_name === listing.item_name);
    setNewListing({
      storage_item: storageItem || {
        id: '',
        weapon_name: listing.item_name,
        prefix_1: listing.prefix_1,
        prefix_2: listing.prefix_2,
        prefix_3: listing.prefix_3,
      },
      quantity: listing.quantity.toString(),
      trade_for: listing.trade_for,
      trade_details: listing.trade_details,
      contact_info: listing.contact_info,
      is_public: listing.is_public
    });
  };

  const handleDelete = async (id) => {
    if (!session || !session.user) {
      console.error('User is not authenticated');
      return;
    }
    const { error } = await supabase
      .from('trade_listings')
      .delete()
      .match({ id });
    if (error) {
      console.error('Error deleting trade listing:', error);
    } else {
      fetchTradeListings();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session || !session.user) {
      console.error('User is not authenticated');
      return;
    }
  
    console.log('Submitting listing:', newListing);
  
    if (!newListing.storage_item) {
      alert('Please select an item from storage');
      return;
    }
  
    const listingData = {
      user_id: session.user.id,
      item_name: newListing.storage_item.weapon_name,
      prefix_1: newListing.storage_item.prefix_1 || '',
      prefix_2: newListing.storage_item.prefix_2 || '',
      prefix_3: newListing.storage_item.prefix_3 || '',
      quantity: newListing.quantity,
      trade_for: newListing.trade_for,
      trade_details: newListing.trade_details,
      contact_info: newListing.contact_info,
      is_public: newListing.is_public
    };
  
    let error;
    if (editingListing) {
      const { error: updateError } = await supabase
        .from('trade_listings')
        .update(listingData)
        .eq('id', editingListing.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('trade_listings')
        .insert(listingData);
      error = insertError;
    }
  
    if (error) {
      console.error('Error adding/updating trade listing:', error);
    } else {
      fetchTradeListings();
      setNewListing({
        storage_item: null,
        quantity: '1',
        trade_for: '',
        trade_details: '',
        contact_info: '',
        is_public: true
      });
      setEditingListing(null);
    }
  };

  if (!session || !session.user) {
    return <div className="trade-board">Please log in to access the Trade Board.</div>;
  }

  return (
    <div className="trade-board">
      <div className="trade-board-content">
      <h2>{editingListing ? 'Edit Trade Listing' : 'Add New Trade Listing'}</h2>
      <div className="share-profile">
          <Link to={`/trader/${session.user.id}`}>
            {window.location.origin}/trader/{session.user.id}
          </Link>
        </div>
        <div className="new-listing-form">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="storage_item">Item from Storage</label>
                <select
                  id="storage_item"
                  name="storage_item"
                  onChange={handleStorageItemSelect}
                  value={newListing.storage_item ? newListing.storage_item.id : ''}
                  required
                >
                  <option value="">Select Item from Storage</option>
                  {userStorage.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.weapon_name} ({item.prefix_1} {item.prefix_2} {item.prefix_3})
                    </option>
                  ))}
                </select>
            </div>

            <div className="form-group">
              <label htmlFor="quantity">Quantity (1-99)</label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={newListing.quantity}
                onChange={handleInputChange}
                min="1"
                max="99"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="trade_for">Trading For</label>
              <input
                type="text"
                id="trade_for"
                name="trade_for"
                value={newListing.trade_for}
                onChange={handleInputChange}
                placeholder="e.g., Caps, Scrip, B/25/25 Fixer"
                maxLength="40"
                required
              />
              <small>{newListing.trade_for.length}/40</small>
            </div>

            <div className="form-group">
              <label htmlFor="trade_details">Additional Details</label>
              <textarea
                id="trade_details"
                name="trade_details"
                value={newListing.trade_details}
                onChange={handleInputChange}
                placeholder="Any additional information about the trade"
                maxLength="40"
              />
              <small>{newListing.trade_details.length}/40</small>
            </div>

            <div className="form-group">
              <label htmlFor="contact_info">Contact Information</label>
              <input
                type="text"
                id="contact_info"
                name="contact_info"
                value={newListing.contact_info}
                onChange={handleInputChange}
                placeholder="How others can contact you for this trade"
                maxLength="40"
                required
              />
              <small>{newListing.contact_info.length}/40</small>
            </div>

            <div className="form-group">
              <label htmlFor="is_public">Listing Visibility</label>
              <select
                id="is_public"
                name="is_public"
                value={newListing.is_public}
                onChange={handleInputChange}
              >
                <option value={true}>Public</option>
                <option value={false}>Private</option>
              </select>
            </div>

            <button type="submit" className="submit-btn">
              {editingListing ? 'Update Listing' : 'Add Listing'}
            </button>
            {editingListing && (
              <button 
                type="button" 
                className="cancel-btn" 
                onClick={() => {
                  setEditingListing(null);
                  setNewListing({
                    storage_item: null,
                    quantity: '1',
                    trade_for: '',
                    trade_details: '',
                    contact_info: '',
                    is_public: true
                  });
                }}
              >
                Cancel Edit
              </button>
            )}
          </form>
        </div>

        <div className="trade-listings">
          <h2>Current Trade Listings</h2>
          <div className="listings-grid">
            {tradeListings.map(listing => (
              <div key={listing.id} className="listing-item">
                <h3>{listing.item_name}</h3>
                <div className="listing-prefixes">
                  {listing.prefix_1 && (
                    <Tooltip text={weaponData.legendaryEffects[listing.prefix_1]}>
                      <span className="prefix">{listing.prefix_1}</span>
                    </Tooltip>
                  )}
                  {listing.prefix_2 && (
                    <Tooltip text={weaponData.legendaryEffects[listing.prefix_2]}>
                      <span className="prefix">{listing.prefix_2}</span>
                    </Tooltip>
                  )}
                  {listing.prefix_3 && (
                    <Tooltip text={weaponData.legendaryEffects[listing.prefix_3]}>
                      <span className="prefix">{listing.prefix_3}</span>
                    </Tooltip>
                  )}
                </div>
                <p>Quantity: {listing.quantity}</p>
                <p>Trading For: {listing.trade_for}</p>
                {listing.trade_details && <p>Details: {listing.trade_details}</p>}
                <p>Contact: {listing.contact_info}</p>
                <p>Visibility: {listing.is_public ? 'Public' : 'Private'}</p>
                <div className="listing-item-footer">
                  <button onClick={() => handleEdit(listing)} className="edit-btn">Edit</button>
                  <button onClick={() => handleDelete(listing.id)} className="delete-btn">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeBoard;