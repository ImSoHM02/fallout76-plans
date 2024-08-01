import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import weaponData from '../weaponData.json';
import Tooltip from './Tooltip';
import './Storage.css';

const Storage = ({ session }) => {
  const [weapons, setWeapons] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [editingWeapon, setEditingWeapon] = useState(null);
  const [lastUsedCharacterId, setLastUsedCharacterId] = useState('');
  const [newWeapon, setNewWeapon] = useState({
    weapon_name: '',
    prefix_1: '',
    prefix_2: '',
    prefix_3: '',
    quantity: '1',
    character_id: '',
    comments: ''
  });
  const [newCharacter, setNewCharacter] = useState('');
  const [isAddingCharacter, setIsAddingCharacter] = useState(false);

  const fetchWeapons = useCallback(async () => {
    if (session && session.user) {
      const { data, error } = await supabase
        .from('weapon_storage')
        .select(`
          *,
          user_characters:character_id (
            id,
            character_name
          )
        `)
        .eq('user_id', session.user.id);
      if (error) console.error('Error fetching weapons:', error);
      else setWeapons(data);
    } else {
      console.log('User is not authenticated');
      setWeapons([]);
    }
  }, [session]);

  const fetchCharacters = useCallback(async () => {
    if (session && session.user) {
      const { data, error } = await supabase
        .from('user_characters')
        .select('*')
        .eq('user_id', session.user.id);
      if (error) console.error('Error fetching characters:', error);
      else setCharacters(data);
    }
  }, [session]);

  useEffect(() => {
    fetchWeapons();
    fetchCharacters();
  }, [fetchWeapons, fetchCharacters]);

  const handleDelete = async (id) => {
    if (!session || !session.user) {
      console.error('User is not authenticated');
      return;
    }
    const { error } = await supabase
      .from('weapon_storage')
      .delete()
      .match({ id });
    if (error) {
      console.error('Error deleting weapon:', error);
    } else {
      fetchWeapons();
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'quantity') {
      const numValue = parseInt(value, 10);
      if (numValue >= 1 && numValue <= 99) {
        setNewWeapon({ ...newWeapon, [name]: numValue.toString() });
      }
    } else if (name === 'comments' && value.length <= 100) {
      setNewWeapon({ ...newWeapon, [name]: value });
    } else if (name === 'character_id') {
      if (value === 'add_new') {
        setIsAddingCharacter(true);
      } else {
        setNewWeapon({ ...newWeapon, [name]: value });
        setLastUsedCharacterId(value);  // Store the last used character ID
      }
    } else {
      setNewWeapon({ ...newWeapon, [name]: value });
    }
  };

  const handleEdit = (weapon) => {
    setEditingWeapon(weapon);
    setNewWeapon({
      ...weapon,
      quantity: weapon.quantity.toString(),
      character_id: weapon.character_id
    });
    setLastUsedCharacterId(weapon.character_id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session || !session.user) {
      console.error('User is not authenticated');
      return;
    }
  
    if (!newWeapon.character_id) {
      alert('Please select a character before adding or updating the weapon.');
      return;
    }
  
    // Create a new object with only the properties that match your weapon_storage table columns
    const weaponData = {
      user_id: session.user.id,
      weapon_name: newWeapon.weapon_name,
      prefix_1: newWeapon.prefix_1,
      prefix_2: newWeapon.prefix_2,
      prefix_3: newWeapon.prefix_3,
      quantity: newWeapon.quantity,
      comments: newWeapon.comments,
      character_id: newWeapon.character_id
    };
  
    if (editingWeapon) {
      const { error } = await supabase
        .from('weapon_storage')
        .update(weaponData)
        .eq('id', editingWeapon.id);
  
      if (error) console.error('Error updating weapon:', error);
      else {
        fetchWeapons();
        setEditingWeapon(null);
      }
    } else {
      const { error } = await supabase
        .from('weapon_storage')
        .insert(weaponData);
  
      if (error) console.error('Error adding weapon:', error);
      else {
        fetchWeapons();
      }
    }
  
    setLastUsedCharacterId(newWeapon.character_id);
  
    setNewWeapon({
      weapon_name: '',
      prefix_1: '',
      prefix_2: '',
      prefix_3: '',
      quantity: '1',
      character_id: lastUsedCharacterId,
      comments: ''
    });
  };

  const handleAddCharacter = async () => {
    if (!newCharacter.trim() || characters.length >= 5) return;

    const { data, error } = await supabase
      .from('user_characters')
      .insert({ user_id: session.user.id, character_name: newCharacter.trim() })
      .select();

    if (error) console.error('Error adding character:', error);
    else {
      await fetchCharacters();
      setNewWeapon({ ...newWeapon, character_id: data[0].id });
      setLastUsedCharacterId(data[0].id);  // Set last used character to newly added character
      setNewCharacter('');
      setIsAddingCharacter(false);
    }
  };

  if (!session || !session.user) {
    return <div className="storage">Please log in to access weapon storage.</div>;
  }

  return (
    <div className="storage">
      <div className="storage-content">
        <div className="weapon-form-container">
          <h2>{editingWeapon ? 'Edit Weapon' : 'Add New Weapon'}</h2>
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
                max="99"
                required 
              />
            </div>

            <div className="form-group">
              <label htmlFor="character_id">Character</label>
              {isAddingCharacter ? (
                <div className="add-character-form">
                  <input
                    type="text"
                    value={newCharacter}
                    onChange={(e) => setNewCharacter(e.target.value)}
                    placeholder="New character name"
                    maxLength={25}
                  />
                  <button type="button" onClick={handleAddCharacter}>Add</button>
                  <button type="button" onClick={() => setIsAddingCharacter(false)}>Cancel</button>
                </div>
              ) : (
                <select 
                  id="character_id" 
                  name="character_id" 
                  value={newWeapon.character_id || lastUsedCharacterId}  // Use last used character if no character is selected
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Character</option>
                  {characters.map(char => (
                    <option key={char.id} value={char.id}>{char.character_name}</option>
                  ))}
                  {characters.length < 5 && <option value="add_new">Add New Character</option>}
                </select>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="comments">Comments</label>
              <textarea 
                id="comments" 
                name="comments" 
                value={newWeapon.comments} 
                onChange={handleInputChange} 
                placeholder="Any additional notes" 
                maxLength={100}
              />
              <div className="character-count">
                {newWeapon.comments.length}/100 characters
              </div>
            </div>

            <button type="submit" className="submit-btn">
              {editingWeapon ? 'Update Weapon' : 'Add Weapon'}
            </button>
            {editingWeapon && (
              <button 
                type="button" 
                className="cancel-btn" 
                onClick={() => {
                  setEditingWeapon(null);
                  setNewWeapon({
                    weapon_name: '',
                    prefix_1: '',
                    prefix_2: '',
                    prefix_3: '',
                    quantity: '1',
                    character_id: '',
                    comments: ''
                  });
                }}
              >
                Cancel Edit
              </button>
            )}
          </form>
        </div>
        
        <div className="weapon-list-container">
          <h2>Stored Weapons</h2>
          <div className="weapon-list">
            {weapons.map(weapon => (
              <div key={weapon.id} className="weapon-item">
                <div className="weapon-item-content">
                  <div className="weapon-name">{weapon.weapon_name}</div>
                  <div className="weapon-prefixes">
                    {weapon.prefix_1 && (
                      <Tooltip text={weaponData.legendaryEffects[weapon.prefix_1]}>
                        <span className="prefix">{weapon.prefix_1}</span>
                      </Tooltip>
                    )}
                    {weapon.prefix_2 && (
                      <Tooltip text={weaponData.legendaryEffects[weapon.prefix_2]}>
                        <span className="prefix">{weapon.prefix_2}</span>
                      </Tooltip>
                    )}
                    {weapon.prefix_3 && (
                      <Tooltip text={weaponData.legendaryEffects[weapon.prefix_3]}>
                        <span className="prefix">{weapon.prefix_3}</span>
                      </Tooltip>
                    )}
                  </div>
                  <div className="weapon-details">
                    Quantity: {weapon.quantity}
                    {weapon.user_characters && <span> | Character: {weapon.user_characters.character_name}</span>}
                  </div>
                  {weapon.comments && <div className="weapon-comments">Notes: {weapon.comments}</div>}
                </div>
                <div className="weapon-item-footer">
                  <button onClick={() => handleEdit(weapon)} className="edit-btn">Edit</button>
                  <button onClick={() => handleDelete(weapon.id)} className="delete-btn">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Storage;