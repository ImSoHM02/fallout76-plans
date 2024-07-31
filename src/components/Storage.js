import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import weaponData from '../weaponData.json';
import './Storage.css';  // Make sure to create this CSS file

const Storage = ({ session }) => {
  const [weapons, setWeapons] = useState([]);
  const [newWeapon, setNewWeapon] = useState({
    weapon_name: '',
    prefix_1: '',
    prefix_2: '',
    prefix_3: '',
    quantity: 1,
    character_name: '',
    comments: ''
  });

  const fetchWeapons = useCallback(async () => {
    if (session) {
      const { data, error } = await supabase
        .from('weapon_storage')
        .select('*')
        .eq('user_id', session.user.id);
      if (error) console.error('Error fetching weapons:', error);
      else setWeapons(data);
    }
  }, [session]);

  useEffect(() => {
    fetchWeapons();
  }, [fetchWeapons]);

  const handleInputChange = (e) => {
    setNewWeapon({ ...newWeapon, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('weapon_storage')
      .insert({ ...newWeapon, user_id: session.user.id });
    if (error) console.error('Error adding weapon:', error);
    else {
      fetchWeapons();
      setNewWeapon({
        weapon_name: '',
        prefix_1: '',
        prefix_2: '',
        prefix_3: '',
        quantity: 1,
        character_name: '',
        comments: ''
      });
    }
  };

  return (
    <div className="storage">
      <div className="storage-content">
        <div className="weapon-form-container">
          <h2>Add New Weapon</h2>
          <form onSubmit={handleSubmit} className="weapon-form">
            <div className="form-group">
              <label htmlFor="weapon_name">Weapon</label>
              <select 
                id="weapon_name" 
                name="weapon_name" 
                value={newWeapon.weapon_name} 
                onChange={handleInputChange} 
                required
              >
                <option value="">Select Weapon</option>
                {weaponData.weaponTypes.map(type => (
                  <optgroup key={type} label={type}>
                    {weaponData.weaponNames[type].map(weapon => (
                      <option key={weapon} value={weapon}>{weapon}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="form-group prefixes">
              <label>Legendary Effects</label>
              <div className="prefix-selects">
                <select name="prefix_1" value={newWeapon.prefix_1} onChange={handleInputChange}>
                  <option value="">1★ Effect</option>
                  {weaponData.prefixes['1star'].map(prefix => (
                    <option key={prefix} value={prefix}>{prefix}</option>
                  ))}
                </select>
                <select name="prefix_2" value={newWeapon.prefix_2} onChange={handleInputChange}>
                  <option value="">2★ Effect</option>
                  {weaponData.prefixes['2star'].map(prefix => (
                    <option key={prefix} value={prefix}>{prefix}</option>
                  ))}
                </select>
                <select name="prefix_3" value={newWeapon.prefix_3} onChange={handleInputChange}>
                  <option value="">3★ Effect</option>
                  {weaponData.prefixes['3star'].map(prefix => (
                    <option key={prefix} value={prefix}>{prefix}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="quantity">Quantity</label>
              <input 
                type="number" 
                id="quantity" 
                name="quantity" 
                value={newWeapon.quantity} 
                onChange={handleInputChange} 
                min="1" 
                required 
              />
            </div>

            <div className="form-group">
              <label htmlFor="character_name">Character Name</label>
              <input 
                type="text" 
                id="character_name" 
                name="character_name" 
                value={newWeapon.character_name} 
                onChange={handleInputChange} 
                placeholder="Character Name" 
              />
            </div>

            <div className="form-group">
              <label htmlFor="comments">Comments</label>
              <textarea 
                id="comments" 
                name="comments" 
                value={newWeapon.comments} 
                onChange={handleInputChange} 
                placeholder="Any additional notes" 
              />
            </div>

            <button type="submit" className="submit-btn">Add Weapon</button>
          </form>
        </div>
        
        <div className="weapon-list-container">
          <h2>Stored Weapons</h2>
          <div className="weapon-list">
            {weapons.map(weapon => (
              <div key={weapon.id} className="weapon-item">
                <div className="weapon-name">{weapon.weapon_name}</div>
                <div className="weapon-prefixes">
                  {weapon.prefix_1 && <span className="prefix">{weapon.prefix_1}</span>}
                  {weapon.prefix_2 && <span className="prefix">{weapon.prefix_2}</span>}
                  {weapon.prefix_3 && <span className="prefix">{weapon.prefix_3}</span>}
                </div>
                <div className="weapon-details">
                  Quantity: {weapon.quantity}
                  {weapon.character_name && <span> | Character: {weapon.character_name}</span>}
                </div>
                {weapon.comments && <div className="weapon-comments">Notes: {weapon.comments}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Storage;