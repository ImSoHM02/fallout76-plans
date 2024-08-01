import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './PublicTradeProfile.css';

const PublicTradeProfile = () => {
  const { userId } = useParams();
  const [listings, setListings] = useState([]);
  const [username, setUsername] = useState('');

  const fetchUserListings = useCallback(async () => {
    const { data, error } = await supabase
      .from('trade_listings')
      .select('*')
      .eq('user_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user listings:', error);
    } else {
      setListings(data);
    }
  }, [userId]);

  const fetchUsername = useCallback(async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching username:', error);
    } else {
      setUsername(data.username);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserListings();
    fetchUsername();
  }, [userId, fetchUserListings, fetchUsername]);

  return (
    <div className="public-trade-profile">
      <h1>{username}'s Trade Listings</h1>
      <div className="listings-grid">
        {listings.map(listing => (
          <div key={listing.id} className="listing-item">
            <h3>{listing.item_name}</h3>
            <div className="listing-prefixes">
              {listing.prefix_1 && <span className="prefix">{listing.prefix_1}</span>}
              {listing.prefix_2 && <span className="prefix">{listing.prefix_2}</span>}
              {listing.prefix_3 && <span className="prefix">{listing.prefix_3}</span>}
            </div>
            <p>Quantity: {listing.quantity}</p>
            <p>Trading For: {listing.trade_for}</p>
            {listing.trade_details && <p>Details: {listing.trade_details}</p>}
            <p>Contact: {listing.contact_info}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PublicTradeProfile;