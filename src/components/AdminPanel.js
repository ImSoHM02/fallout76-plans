import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';

const AdminPanel = ({ session }) => {
  const [apparel, setApparel] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [csvFile, setCsvFile] = useState(null);
  const [csvChanges, setCsvChanges] = useState([]);
  const fileInputRef = useRef(null);

  const fetchApparel = useCallback(async () => {
    setIsLoading(true);
    setLoadingMessage('Loading Apparel Data');
    setLoadingProgress(0);

    let allApparel = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error, count } = await supabase
        .from('apparel')
        .select('*', { count: 'exact' })
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('a_id', { ascending: true });

      if (error) {
        console.error('Error fetching apparel:', error);
        setIsLoading(false);
        return;
      }

      allApparel = [...allApparel, ...data];
      hasMore = count > (page + 1) * pageSize;
      page++;

      setLoadingProgress(Math.round((allApparel.length / count) * 100));
    }

    setApparel(allApparel);
    setLoadingProgress(100);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchApparel();
  }, [fetchApparel]);

  const handleCsvButtonClick = (event) => {
    event.preventDefault();
    fileInputRef.current.click();
  };

  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target.result;
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map(header => header.trim());
      const changes = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length === headers.length) {
          const change = {};
          headers.forEach((header, index) => {
            const value = values[index].trim();
            change[header] = value === '' ? null : value;
          });
          changes.push(change);
        }
      }

      const filteredChanges = changes.filter(change => {
        const currentApparel = apparel.find(item => item.a_id === parseInt(change.a_id));
        if (!currentApparel) return false;
        return Object.keys(change).some(key => 
          key !== 'a_id' && String(change[key]) !== String(currentApparel[key])
        );
      });

      setCsvChanges(filteredChanges);
    };

    reader.readAsText(file);
  };

  const applyCsvChanges = async () => {
    setIsLoading(true);
    setLoadingMessage('Applying CSV Changes');
    setLoadingProgress(0);

    const totalChanges = csvChanges.length;
    let completedChanges = 0;

    for (const change of csvChanges) {
      const { error } = await supabase
        .from('apparel')
        .upsert([change]);

      if (error) {
        console.error('Error updating apparel:', error);
      } else {
        completedChanges++;
        setLoadingProgress(Math.round((completedChanges / totalChanges) * 100));
      }
    }

    // Update name mappings
    const nameChanges = csvChanges.filter(change => 
      change.outfit_name && change.outfit_name !== apparel.find(item => item.a_id === change.a_id)?.outfit_name
    );

    if (nameChanges.length > 0) {
      setLoadingMessage('Updating Name Mappings');
      await updateNameMappings(nameChanges);
    }

    setCsvChanges([]);
    setCsvFile(null);
    await fetchApparel();

    setIsLoading(false);
  };

  const updateNameMappings = async (changes) => {
    const mappingsToUpdate = changes
      .filter(change => change.outfit_name && change.a_id)
      .map(change => {
        const currentApparel = apparel.find(item => item.a_id === change.a_id);
        return {
          old_name: currentApparel?.outfit_name,
          new_name: change.outfit_name
        };
      })
      .filter(mapping => mapping.old_name && mapping.new_name && mapping.old_name !== mapping.new_name);

    if (mappingsToUpdate.length === 0) {
      console.log('No valid name mappings to update');
      return;
    }

    const { data, error } = await supabase
      .from('name_mappings')
      .upsert(mappingsToUpdate, { onConflict: ['old_name'] });

    if (error) {
      console.error('Error updating name mappings:', error);
    } else {
      console.log('Name mappings updated successfully:', data);
    }
  };

  const fieldsToDisplay = ['a_id', 'outfit_name', 'craftable', 'plan_name', 'rarity', 'type'];

  return (
    <div className="admin-panel">
      <h2>Apparel Database CSV Update</h2>
      <div className={`content-wrapper ${isLoading ? "blurred" : ""}`}>
        <div className="csv-upload">
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept=".csv" 
            onChange={handleCsvUpload} 
          />
          <button onClick={handleCsvButtonClick}>Upload CSV</button>
          {csvFile && (
            <p>Uploaded file: {csvFile.name}</p>
          )}
        </div>
        {csvChanges.length > 0 && (
          <div className="csv-changes-preview">
            <h3>CSV Changes Preview</h3>
            <table>
              <thead>
                <tr>
                  {fieldsToDisplay.map(field => (
                    <th key={field}>{field}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvChanges.map(change => {
                  const currentApparel = apparel.find(item => item.a_id === parseInt(change.a_id));
                  return (
                    <tr key={change.a_id}>
                      {fieldsToDisplay.map(field => (
                        <td key={field}>
                          <div className="field-comparison">
                            <span className="current-value">
                              {currentApparel[field] !== null
                                ? String(currentApparel[field])
                                : 'NULL'}
                            </span>
                            {String(change[field]) !== String(currentApparel[field]) && (
                              <span className="new-value">
                                {change[field] !== null && change[field] !== undefined
                                  ? String(change[field])
                                  : 'NULL'}
                              </span>
                            )}
                            {field === 'outfit_name' && String(change[field]) !== String(currentApparel[field]) && (
                              <span className="mapping-update">
                                (Mapping will be updated)
                              </span>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button onClick={applyCsvChanges}>Apply CSV Changes</button>
          </div>
        )}
      </div>
      {isLoading && (
        <div className="upload-overlay">
          <div className="upload-message">
            <h3>{loadingMessage}</h3>
            <p>Please wait while we process your request. This may take a few moments.</p>
            <progress value={loadingProgress} max="100"></progress>
            <p>{loadingProgress}% Complete</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;